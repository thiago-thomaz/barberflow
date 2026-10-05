/**
 * Standalone Internal Scheduler Worker
 * Runs autonomously without requiring any external cron or n8n service.
 * Usage: node scripts/internal-scheduler.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WAHA_URL = (process.env.WAHA_URL || 'https://evo.projetosunion.cloud').replace(/\/$/, '');
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182';
const WAHA_SESSION = process.env.WAHA_DEFAULT_SESSION || 'default';

function formatBrazilDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function formatBrazilTime(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatChatId(phone) {
  const trimmed = phone.trim();
  if (trimmed.includes('@c.us') || trimmed.includes('@g.us') || trimmed.includes('@lid')) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.toLowerCase().includes('lid') || (digits.length >= 14 && !digits.startsWith('55')) || digits.length >= 15) {
    return `${digits}@lid`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}@c.us`;
  }
  return `${digits}@c.us`;
}

async function sendWhatsAppText(to, text) {
  const chatId = formatChatId(to);
  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
        Authorization: `Bearer ${WAHA_API_KEY}`,
      },
      body: JSON.stringify({
        session: WAHA_SESSION,
        chatId,
        text,
      }),
    });
    const data = await res.json();
    return { success: res.ok, messageId: data.id || data.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function processReminders() {
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
    take: 50,
  });

  if (dueReminders.length === 0) return 0;

  console.log(`[WORKER] Encontrados ${dueReminders.length} lembretes pendentes.`);

  for (const rem of dueReminders) {
    const app = rem.appointment;
    const phone = app.customer.whatsappPhone || app.customer.phone;
    const dateFormatted = formatBrazilDate(app.scheduledAt);
    const timeFormatted = formatBrazilTime(app.scheduledAt);

    let reminderText = '';
    if (rem.reminderType === 'T_24H') {
      reminderText = `🔔 *Lembrete de Horário Amanhã!*\n\nOlá, ${app.customer.name}! 👋\nVocê tem horário marcado na *${app.barbershop.name}* amanhã (${dateFormatted}) às *${timeFormatted}* com *${app.barber.name}*.\n\n✂️ Serviço: ${app.service.name}\n📍 Local: ${app.barbershop.address || app.barbershop.name}\n\nPara cancelar ou remarcar: https://barber.projetosunion.cloud/agendamento/${app.publicToken}`;
    } else if (rem.reminderType === 'T_6H') {
      reminderText = `⏰ *Lembrete de Horário Hoje!*\n\nOlá, ${app.customer.name}! Seu horário na *${app.barbershop.name}* é hoje às *${timeFormatted}* com *${app.barber.name}*.\n\nNos vemos em breve! 💈`;
    } else if (rem.reminderType === 'T_2H') {
      reminderText = `✂️ *Faltam 2 horas para seu horário!*\n\nSeu atendimento com *${app.barber.name}* na *${app.barbershop.name}* começa às *${timeFormatted}*.\n\nAté logo!`;
    } else if (rem.reminderType === 'T_1H') {
      reminderText = `⏰ *Seu horário começa em 1 hora!*\n\nEstamos preparando tudo para te receber na *${app.barbershop.name}* às *${timeFormatted}*.`;
    }

    const sendRes = await sendWhatsAppText(phone, reminderText);

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
      console.log(`[WORKER] Lembrete ${rem.reminderType} enviado com sucesso para ${phone}`);
    } else {
      await prisma.appointmentReminder.update({
        where: { id: rem.id },
        data: {
          status: rem.attempts >= 2 ? 'FAILED' : 'PENDING',
          attempts: rem.attempts + 1,
          error: sendRes.error,
        },
      });
      console.warn(`[WORKER] Falha ao enviar lembrete ${rem.reminderType} para ${phone}: ${sendRes.error}`);
    }
  }

  return dueReminders.length;
}

async function loop() {
  console.log('[INTERNAL_SCHEDULER] Iniciando loop autônomo (tick a cada 60s)...');
  while (true) {
    try {
      await processReminders();
    } catch (err) {
      console.error('[INTERNAL_SCHEDULER_ERROR]', err);
    }
    await new Promise((r) => setTimeout(r, 60000));
  }
}

if (require.main === module) {
  loop();
}

module.exports = { processReminders };
