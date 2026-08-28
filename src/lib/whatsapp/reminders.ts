import { prisma } from '@/lib/prisma';
import { getWhatsAppProvider } from './provider';
import { formatBrazilDate, formatBrazilTime } from '@/lib/timezone';

export interface ScheduleRemindersInput {
  appointmentId: string;
  barbershopId: string;
  scheduledAt: Date;
}

/**
 * Schedule T-24h, T-6h, T-2h, T-1h reminders for an appointment with zero-duplication guarantee
 */
export async function scheduleAppointmentReminders(input: ScheduleRemindersInput) {
  const shop = await prisma.barbershop.findUnique({
    where: { id: input.barbershopId },
    select: {
      reminder24h: true,
      reminder6h: true,
      reminder2h: true,
      reminder1h: true,
      whatsappActive: true,
    },
  });

  if (!shop || !shop.whatsappActive) return;

  const now = new Date();
  const appTime = new Date(input.scheduledAt).getTime();

  const reminderDefinitions = [
    { type: 'T_24H', enabled: shop.reminder24h, offsetHours: 24 },
    { type: 'T_6H', enabled: shop.reminder6h, offsetHours: 6 },
    { type: 'T_2H', enabled: shop.reminder2h, offsetHours: 2 },
    { type: 'T_1H', enabled: shop.reminder1h, offsetHours: 1 },
  ];

  for (const r of reminderDefinitions) {
    if (!r.enabled) continue;

    const scheduledFor = new Date(appTime - r.offsetHours * 60 * 60 * 1000);

    // Only schedule if in the future
    if (scheduledFor > now) {
      await prisma.appointmentReminder.upsert({
        where: {
          appointmentId_reminderType: {
            appointmentId: input.appointmentId,
            reminderType: r.type,
          },
        },
        create: {
          barbershopId: input.barbershopId,
          appointmentId: input.appointmentId,
          reminderType: r.type,
          scheduledFor,
          status: 'PENDING',
        },
        update: {
          scheduledFor,
          status: 'PENDING',
        },
      }).catch((err) => console.warn('Reminder upsert error:', err));
    }
  }
}

/**
 * Cancels pending reminders when appointment is cancelled or rescheduled
 */
export async function cancelAppointmentReminders(appointmentId: string) {
  await prisma.appointmentReminder.updateMany({
    where: {
      appointmentId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Processes and delivers all due reminders idempotently
 */
export async function processDueReminders(limit = 50) {
  const now = new Date();

  const dueReminders = await prisma.appointmentReminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
      appointment: {
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
    },
    include: {
      appointment: {
        include: {
          customer: true,
          barber: true,
          service: true,
          barbershop: true,
        },
      },
    },
    take: limit,
  });

  const results = [];
  const provider = getWhatsAppProvider();

  for (const rem of dueReminders) {
    const app = rem.appointment;
    const phone = app.customer.whatsappPhone || app.customer.phone;

    let reminderText = '';
    const dateFormatted = formatBrazilDate(app.scheduledAt);
    const timeFormatted = formatBrazilTime(app.scheduledAt);

    if (rem.reminderType === 'T_24H') {
      reminderText = `🔔 *Lembrete de Horário Amanhã!*\n\nOlá, ${app.customer.name}! 👋\nVocê tem horário marcado na *${app.barbershop.name}* amanhã (${dateFormatted}) às *${timeFormatted}* com *${app.barber.name}*.\n\n✂️ Serviço: ${app.service.name}\n📍 Local: ${app.barbershop.address || app.barbershop.name}\n\nPara cancelar ou remarcar, acesse: https://barber.projetosunion.cloud/agendamento/${app.publicToken}`;
    } else if (rem.reminderType === 'T_6H') {
      reminderText = `⏰ *Lembrete de Horário Hoje!*\n\nOlá, ${app.customer.name}! Seu horário na *${app.barbershop.name}* é hoje às *${timeFormatted}* com *${app.barber.name}*.\n\nNos vemos em breve! 💈`;
    } else if (rem.reminderType === 'T_2H') {
      reminderText = `✂️ *Faltam 2 horas para seu horário!*\n\nSeu atendimento com *${app.barber.name}* na *${app.barbershop.name}* começa às *${timeFormatted}*.\n\nAté logo!`;
    } else if (rem.reminderType === 'T_1H') {
      reminderText = `⏰ *Seu horário começa em 1 hora!*\n\nEstamos preparando tudo para te receber na *${app.barbershop.name}* às *${timeFormatted}*.`;
    }

    const sendRes = await provider.sendText({
      to: phone,
      text: reminderText,
      tenantId: app.barbershopId,
      appointmentId: app.id,
      customerId: app.customerId,
      type: 'TEMPLATE',
    });

    if (sendRes.success) {
      await prisma.appointmentReminder.update({
        where: { id: rem.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: sendRes.messageId,
          attempts: rem.attempts + 1,
        },
      });
      results.push({ id: rem.id, status: 'SENT', type: rem.reminderType });
    } else {
      await prisma.appointmentReminder.update({
        where: { id: rem.id },
        data: {
          status: rem.attempts >= 2 ? 'FAILED' : 'PENDING',
          attempts: rem.attempts + 1,
          error: sendRes.error,
        },
      });
      results.push({ id: rem.id, status: 'FAILED', error: sendRes.error });
    }
  }

  return { processed: results.length, details: results };
}
