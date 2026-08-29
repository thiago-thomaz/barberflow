import { prisma } from '@/lib/prisma';
import { getWhatsAppProvider } from './provider';
import { scheduleAppointmentReminders, cancelAppointmentReminders } from './reminders';
import { generateGoogleCalendarUrl } from '@/lib/calendar';
import { BRAZIL_TIMEZONE, formatBrazilDate, formatBrazilTime } from '@/lib/timezone';
import { publishEvent } from '@/lib/events';

export const SESSION_TTL_MINUTES = 30;

/**
 * Normalizes phone numbers or WhatsApp JIDs (e.g. 5514998016163, @c.us, @lid)
 */
export function normalizeWhatsAppPhone(phone: string): string {
  if (phone.includes('@lid') || phone.includes('@c.us') || phone.includes('@g.us')) {
    return phone;
  }
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
}

export interface WhatsAppIncomingMessage {
  from: string; // phone
  text: string;
  tenantSlugOrId: string;
  messageId?: string;
  senderName?: string;
}

export interface EngineResult {
  reply: string;
  state: string;
  actionTaken?: string;
  appointmentId?: string;
}

/**
 * Parses user input for dates in America/Sao_Paulo
 */
export function parseDateInput(input: string): string | null {
  const clean = input.trim().toLowerCase();
  const now = new Date();

  // Helper to format YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (clean === 'hoje' || clean === '1') {
    return formatYMD(now);
  }

  if (clean === 'amanha' || clean === 'amanhã' || clean === '2') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatYMD(tomorrow);
  }

  // Weekdays mapping
  const daysMap: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    'segunda-feira': 1,
    terca: 2,
    terça: 2,
    'terça-feira': 2,
    quarta: 3,
    'quarta-feira': 3,
    quinta: 4,
    'quinta-feira': 4,
    sexta: 5,
    'sexta-feira': 5,
    sabado: 6,
    sábado: 6,
  };

  if (daysMap[clean] !== undefined) {
    const targetDay = daysMap[clean];
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + diff);
    return formatYMD(targetDate);
  }

  // DD/MM or DD-MM format
  const dateMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dateMatch) {
    const d = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const y = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const fullYear = y < 100 ? 2000 + y : y;
    const dateObj = new Date(fullYear, m - 1, d);
    if (!isNaN(dateObj.getTime())) {
      return formatYMD(dateObj);
    }
  }

  return null;
}

/**
 * Core WhatsApp Conversational Engine
 */
export async function processWhatsAppMessage(incoming: WhatsAppIncomingMessage): Promise<EngineResult> {
  const phone = normalizeWhatsAppPhone(incoming.from);
  const text = incoming.text.trim();
  const lower = text.toLowerCase();

  // 1. Resolve Barbershop Tenant
  let shop = await prisma.barbershop.findFirst({
    where: {
      OR: [
        { id: incoming.tenantSlugOrId },
        { slug: incoming.tenantSlugOrId },
        { phone: { contains: incoming.tenantSlugOrId?.replace(/\D/g, '') || 'xyz' } },
      ],
      isActive: true,
    },
    include: {
      services: { where: { isActive: true, deletedAt: null } },
      barbers: { where: { isActive: true, deletedAt: null } },
    },
  });

  // Fallback: If not found, try slug 'barber-shop' or first active shop
  if (!shop) {
    shop = await prisma.barbershop.findFirst({
      where: { slug: 'barber-shop', isActive: true },
      include: {
        services: { where: { isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    }) || await prisma.barbershop.findFirst({
      where: { isActive: true },
      include: {
        services: { where: { isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    });
  }

  if (!shop) {
    return {
      reply: 'Desculpe, barbearia não encontrada.',
      state: 'ERROR',
    };
  }

  // Log Inbound Message
  await prisma.whatsappMessage.create({
    data: {
      barbershopId: shop.id,
      phone,
      direction: 'INBOUND',
      type: 'TEXT',
      content: text,
      status: 'READ',
      providerMessageId: incoming.messageId || null,
    },
  }).catch(() => {});

  // 2. Find or Create Session
  let session = await prisma.whatsappSession.findUnique({
    where: { barbershopId_phone: { barbershopId: shop.id, phone } },
  });

  const now = new Date();
  let isExpired = false;

  if (!session || session.expiresAt < now) {
    isExpired = !session;
    session = await prisma.whatsappSession.upsert({
      where: { barbershopId_phone: { barbershopId: shop.id, phone } },
      create: {
        barbershopId: shop.id,
        phone,
        state: 'IDLE',
        context: JSON.stringify({}),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
      },
      update: {
        state: 'IDLE',
        context: JSON.stringify({}),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
      },
    });
  } else {
    // Refresh TTL
    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000) },
    });
  }

  // 3. Handle LGPD Opt-out vs Session Exit
  const isLgpdOptOut = ['descadastrar', 'cancelar mensagens', 'optout', 'parar notificacoes', 'bloquear mensagens'].includes(lower);
  const isSessionExit = [
    'sair', '#sair', 'encerrar', '#encerrar', 'cancelar', '#cancelar',
    'fim', 'fechar', 'tchau', 'obrigado', 'obrigada', 'valeu', 'para', 'pare'
  ].includes(lower) || (lower === '0' && session.state === 'IDLE');

  if (isLgpdOptOut) {
    await prisma.customer.updateMany({
      where: {
        barbershopId: shop.id,
        phone: { contains: phone.slice(-8) },
      },
      data: { marketingOptIn: false },
    });

    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: {
        state: 'OPTED_OUT',
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
      },
    });

    const reply = `Você cancelou o recebimento de mensagens automáticas da *${shop.name}*.\n\nSeus agendamentos continuarão ativos normalmente. Para reativar o atendimento a qualquer momento, basta enviar *MENU* ou *OI*.`;
    await getWhatsAppProvider().sendText({ to: phone, text: reply, tenantId: shop.id });
    return { reply, state: 'OPTED_OUT' };
  }

  if (isSessionExit) {
    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: {
        state: 'IDLE',
        context: JSON.stringify({}),
        expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
      },
    });

    const reply = `Atendimento encerrado com sucesso! 😊\n\nQuando quiser agendar ou consultar horários na *${shop.name}*, basta enviar um *Oi* ou *MENU* a qualquer momento.\n\n💈 Agradecemos seu contato e até breve!`;
    await getWhatsAppProvider().sendText({ to: phone, text: reply, tenantId: shop.id });
    return { reply, state: 'IDLE' };
  }

  let context = JSON.parse(session.context || '{}');

  // Reset to Menu if user types "menu", "oi", "ola", "iniciar", "começar"
  if (['menu', 'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'começar', 'inicio', 'iniciar', 'ajuda'].includes(lower)) {
    session = await prisma.whatsappSession.update({
      where: { id: session.id },
      data: { state: 'IDLE', context: JSON.stringify({}) },
    });

    const expiredNotice = isExpired ? '_(Seu atendimento anterior expirou)_\n\n' : '';
    const welcome = `${expiredNotice}Olá! 👋 Sou o assistente virtual da *${shop.name}*.\n\nComo posso te ajudar hoje?\n\n1️⃣ *Agendar horário*\n2️⃣ *Ver meu próximo horário*\n3️⃣ *Cancelar agendamento*\n4️⃣ *Remarcar horário*\n5️⃣ *Falar com a barbearia*\n0️⃣ *Encerrar atendimento*\n\n_Envie o número da opção ou digite o que deseja (ex: "Quero cortar cabelo amanhã")._`;

    await getWhatsAppProvider().sendText({ to: phone, text: welcome, tenantId: shop.id });
    return { reply: welcome, state: 'IDLE' };
  }

  // 4. State Machine Processor
  let reply = '';
  let nextState = session.state;

  // -------------------------------------------------------------
  // STATE: IDLE
  // -------------------------------------------------------------
  if (session.state === 'IDLE') {
    if (lower === '0' || lower.includes('encerrar') || lower.includes('sair')) {
      reply = `Atendimento encerrado com sucesso! 😊\n\nQuando quiser agendar ou consultar horários na *${shop.name}*, basta enviar um *Oi* ou *MENU* a qualquer momento.\n\n💈 Agradecemos seu contato e até breve!`;
      nextState = 'IDLE';
      context = {};
    } else if (lower === '1' || lower.includes('agendar') || lower.includes('marcar') || lower.includes('corte') || lower.includes('barba')) {
      nextState = 'SELECTING_SERVICE';
      context = {};

      const serviceList = shop.services
        .map((s, idx) => `${idx + 1}️⃣ *${s.name}* — R$ ${s.price.toFixed(2).replace('.', ',')} (${s.durationMin} min)`)
        .join('\n');

      reply = `Perfeito! 😊 Qual serviço você deseja agendar?\n\n${serviceList}\n0️⃣ *Voltar ao menu principal*\n\n_Digite o número do serviço ou envie 0 para voltar (ou digite ENCERRAR):_`;
    } else if (lower === '2' || lower.includes('proximo') || lower.includes('próximo') || lower.includes('quando')) {
      // Check next appointment
      const nextApp = await prisma.appointment.findFirst({
        where: {
          barbershopId: shop.id,
          customer: { phone: { contains: phone.slice(-8) } },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          scheduledAt: { gte: now },
        },
        include: { service: true, barber: true },
        orderBy: { scheduledAt: 'asc' },
      });

      if (!nextApp) {
        reply = `Não encontrei nenhum agendamento futuro para você na *${shop.name}*. 😊\n\nDeseja agendar um horário?\n1️⃣ Sim, quero agendar\n2️⃣ Voltar ao menu\n0️⃣ Encerrar atendimento`;
      } else {
        const calUrl = `https://barber.projetosunion.cloud/agendamento/${nextApp.publicToken}`;
        reply = `Encontrei seu próximo horário: 💈\n\n📅 *Data:* ${formatBrazilDate(nextApp.scheduledAt)}\n🕐 *Horário:* ${formatBrazilTime(nextApp.scheduledAt)}\n✂️ *Serviço:* ${nextApp.service?.name || nextApp.serviceNameSnapshot}\n👤 *Barbeiro:* ${nextApp.barber?.name}\n💰 *Valor:* R$ ${nextApp.price.toFixed(2).replace('.', ',')}\n\n🔗 *Detalhes e Calendário:* ${calUrl}\n\nOpções:\n1️⃣ Manter agendamento\n2️⃣ Cancelar este horário\n3️⃣ Remarcar para outra data\n0️⃣ Voltar ao menu`;
      }
    } else if (lower === '3' || lower.includes('cancelar')) {
      const activeApps = await prisma.appointment.findMany({
        where: {
          barbershopId: shop.id,
          customer: { phone: { contains: phone.slice(-8) } },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          scheduledAt: { gte: now },
        },
        include: { service: true, barber: true },
        orderBy: { scheduledAt: 'asc' },
      });

      if (activeApps.length === 0) {
        reply = `Você não possui horários agendados para cancelar no momento. 😊\n\nEnvie *MENU* para ver as opções.`;
      } else if (activeApps.length === 1) {
        const app = activeApps[0];
        context.cancellingAppointmentId = app.id;
        nextState = 'CANCELLING';
        reply = `Encontrei seu agendamento:\n\n✂️ *${app.service?.name}*\n📅 *${formatBrazilDate(app.scheduledAt)} às ${formatBrazilTime(app.scheduledAt)}*\n👤 *${app.barber?.name}*\n\nTem certeza que deseja cancelar?\n\n1️⃣ *Sim, confirmar cancelamento*\n2️⃣ *Não, manter horário*\n0️⃣ *Voltar ao menu*`;
      } else {
        context.availableCancelApps = activeApps.map((a) => a.id);
        nextState = 'CANCELLING';
        const list = activeApps
          .map((a, i) => `${i + 1}️⃣ ${a.service?.name} - ${formatBrazilDate(a.scheduledAt)} às ${formatBrazilTime(a.scheduledAt)} (${a.barber?.name})`)
          .join('\n');
        reply = `Qual dos seus agendamentos você deseja cancelar?\n\n${list}\n0️⃣ *Voltar ao menu*\n\n_Envie o número do agendamento:_`;
      }
    } else if (lower === '4' || lower.includes('remarcar')) {
      const activeApps = await prisma.appointment.findMany({
        where: {
          barbershopId: shop.id,
          customer: { phone: { contains: phone.slice(-8) } },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          scheduledAt: { gte: now },
        },
        include: { service: true, barber: true },
        orderBy: { scheduledAt: 'asc' },
      });

      if (activeApps.length === 0) {
        reply = `Você não possui agendamentos futuros para remarcar. Deseja criar um novo agendamento?\n\n1️⃣ *Sim, agendar novo horário*\n2️⃣ *Voltar ao menu*\n0️⃣ *Encerrar*`;
      } else {
        const app = activeApps[0];
        context.reschedulingAppointmentId = app.id;
        context.serviceId = app.serviceId;
        context.barberId = app.barberId;
        nextState = 'SELECTING_DATE';
        reply = `Vamos remarcar seu horário de *${app.service?.name}* com *${app.barber?.name}*.\n\nPara qual data você prefere?\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia (ex: Sábado ou 29/08)*\n0️⃣ *Voltar ao menu*`;
      }
    } else if (lower === '5' || lower.includes('falar') || lower.includes('atendente') || lower.includes('humano')) {
      reply = `📞 Você pode falar diretamente com nossa equipe:\n\n💈 *${shop.name}*\n📱 Telefone / WhatsApp: ${shop.phone || 'Em breve'}\n📍 Endereço: ${shop.address || 'Consulte nosso balcão'}\n\nEnvie *MENU* para voltar ao atendimento automático ou *0* para encerrar.`;
    } else {
      reply = `Não compreendi exatamente. 😊\n\nComo posso ajudar você na *${shop.name}*?\n\n1️⃣ *Agendar horário*\n2️⃣ *Ver meu próximo horário*\n3️⃣ *Cancelar agendamento*\n4️⃣ *Remarcar horário*\n5️⃣ *Falar com a barbearia*\n0️⃣ *Encerrar atendimento*`;
    }
  }

  // -------------------------------------------------------------
  // STATE: SELECTING_SERVICE
  // -------------------------------------------------------------
  else if (session.state === 'SELECTING_SERVICE') {
    if (lower === '0' || lower === 'voltar' || lower === 'menu') {
      nextState = 'IDLE';
      context = {};
      reply = `Menu Principal:\n\n1️⃣ *Agendar horário*\n2️⃣ *Ver meu próximo horário*\n3️⃣ *Cancelar agendamento*\n4️⃣ *Remarcar horário*\n5️⃣ *Falar com a barbearia*\n0️⃣ *Encerrar atendimento*`;
    } else {
      const serviceIndex = parseInt(text, 10) - 1;
      let selectedService = null;

      if (!isNaN(serviceIndex) && shop.services[serviceIndex]) {
        selectedService = shop.services[serviceIndex];
      } else {
        // Find by name
        selectedService = shop.services.find((s) => s.name.toLowerCase().includes(lower));
      }

      if (!selectedService) {
        const serviceList = shop.services
          .map((s, idx) => `${idx + 1}️⃣ *${s.name}* — R$ ${s.price.toFixed(2).replace('.', ',')} (${s.durationMin} min)`)
          .join('\n');
        reply = `Por favor, escolha uma das opções válidas:\n\n${serviceList}\n0️⃣ *Voltar ao menu principal*\n\n_Digite o número do serviço ou 0 para voltar:_`;
      } else {
        context.serviceId = selectedService.id;
        context.serviceName = selectedService.name;
        context.price = selectedService.price;
        context.durationMin = selectedService.durationMin;

        // Ask for Barber preference if more than 1 barber
        if (shop.barbers.length > 1) {
          nextState = 'SELECTING_BARBER';
          const barberList = shop.barbers.map((b, i) => `${i + 1}️⃣ *${b.name}*`).join('\n');
          reply = `Ótimo! Você escolheu *${selectedService.name}* (R$ ${selectedService.price.toFixed(2).replace('.', ',')}).\n\nVocê tem preferência de barbeiro?\n\n${barberList}\n${shop.barbers.length + 1}️⃣ *Qualquer profissional disponível*\n0️⃣ *Voltar aos serviços*\n\n_Digite o número do profissional:_`;
        } else {
          context.barberId = shop.barbers[0]?.id || 'ANY';
          context.barberName = shop.barbers[0]?.name || 'Barbeiro da Casa';
          nextState = 'SELECTING_DATE';
          reply = `Ótimo! Você escolheu *${selectedService.name}*.\n\nPara qual data deseja agendar?\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia (ex: Sábado ou 29/08)*\n0️⃣ *Voltar aos serviços*`;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STATE: SELECTING_BARBER
  // -------------------------------------------------------------
  else if (session.state === 'SELECTING_BARBER') {
    if (lower === '0' || lower === 'voltar') {
      nextState = 'SELECTING_SERVICE';
      const serviceList = shop.services
        .map((s, idx) => `${idx + 1}️⃣ *${s.name}* — R$ ${s.price.toFixed(2).replace('.', ',')} (${s.durationMin} min)`)
        .join('\n');
      reply = `Qual serviço você deseja agendar?\n\n${serviceList}\n0️⃣ *Voltar ao menu principal*\n\n_Digite o número do serviço:_`;
    } else {
      const barberIndex = parseInt(text, 10) - 1;
      let selectedBarber = null;

      if (barberIndex === shop.barbers.length || lower.includes('qualquer') || lower.includes('tanto faz')) {
        context.barberId = 'ANY';
        context.barberName = 'Qualquer profissional disponível';
        nextState = 'SELECTING_DATE';
        reply = `Perfeito! Vamos buscar os melhores horários com qualquer barbeiro disponível.\n\nPara qual data você deseja agendar?\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia (ex: Sábado ou 29/08)*\n0️⃣ *Voltar*`;
      } else if (!isNaN(barberIndex) && shop.barbers[barberIndex]) {
        selectedBarber = shop.barbers[barberIndex];
        context.barberId = selectedBarber.id;
        context.barberName = selectedBarber.name;
        nextState = 'SELECTING_DATE';
        reply = `Perfeito! Barbeiro escolhido: *${selectedBarber.name}*.\n\nPara qual data você prefere?\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia (ex: Sábado ou 29/08)*\n0️⃣ *Voltar*`;
      } else {
        const barberList = shop.barbers.map((b, i) => `${i + 1}️⃣ *${b.name}*`).join('\n');
        reply = `Por favor, escolha uma opção válida de profissional:\n\n${barberList}\n${shop.barbers.length + 1}️⃣ *Qualquer profissional disponível*\n0️⃣ *Voltar*`;
      }
    }
  }

  // -------------------------------------------------------------
  // STATE: SELECTING_DATE
  // -------------------------------------------------------------
  else if (session.state === 'SELECTING_DATE') {
    if (lower === '0' || lower === 'voltar') {
      if (shop.barbers.length > 1) {
        nextState = 'SELECTING_BARBER';
        const barberList = shop.barbers.map((b, i) => `${i + 1}️⃣ *${b.name}*`).join('\n');
        reply = `Você tem preferência de barbeiro?\n\n${barberList}\n${shop.barbers.length + 1}️⃣ *Qualquer profissional disponível*\n0️⃣ *Voltar aos serviços*\n\n_Digite o número do profissional:_`;
      } else {
        nextState = 'SELECTING_SERVICE';
        const serviceList = shop.services
          .map((s, idx) => `${idx + 1}️⃣ *${s.name}* — R$ ${s.price.toFixed(2).replace('.', ',')} (${s.durationMin} min)`)
          .join('\n');
        reply = `Qual serviço você deseja agendar?\n\n${serviceList}\n0️⃣ *Voltar ao menu principal*\n\n_Digite o número do serviço:_`;
      }
    } else {
      const parsedDate = parseDateInput(text);

      if (!parsedDate) {
        reply = `Não consegui entender a data. 😕\n\nPor favor, informe como:\n- *Hoje*\n- *Amanhã*\n- *Sábado*\n- Ou a data no formato *29/08*\n0️⃣ *Voltar*`;
      } else {
        context.date = parsedDate;

        // Fetch available slots from database
        const [year, month, day] = parsedDate.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayOfWeek = targetDate.getDay();

        const businessHours = await prisma.businessHours.findUnique({
          where: { barbershopId_dayOfWeek: { barbershopId: shop.id, dayOfWeek } },
        });

        if (!businessHours || !businessHours.isOpen) {
          reply = `A barbearia não abre nesta data (${parsedDate}). Por favor, escolha outro dia:\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia*\n0️⃣ *Voltar*`;
        } else {
          const [openH, openM] = businessHours.openTime.split(':').map(Number);
          const [closeH, closeM] = businessHours.closeTime.split(':').map(Number);
          const duration = context.durationMin || 30;

          // Fetch existing appointments on that day
          const startOfDay = new Date(`${parsedDate}T00:00:00-03:00`);
          const endOfDay = new Date(`${parsedDate}T23:59:59.999-03:00`);

          const existingApps = await prisma.appointment.findMany({
            where: {
              barbershopId: shop.id,
              status: { notIn: ['CANCELADO', 'NO_SHOW'] },
              scheduledAt: { gte: startOfDay, lte: endOfDay },
            },
          });

          // Compute open slots
          const availableSlots: string[] = [];
          let currentMinutes = openH * 60 + openM;
          const closeMinutes = closeH * 60 + closeM;

          while (currentMinutes + duration <= closeMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            const slotTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const slotStart = new Date(`${parsedDate}T${slotTime}:00-03:00`);
            const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

            if (slotStart > now) {
              // Check barber conflict
              let hasFreeBarber = false;
              if (context.barberId && context.barberId !== 'ANY') {
                const conflict = existingApps.some(
                  (a) => a.barberId === context.barberId && a.scheduledAt < slotEnd && a.endAt > slotStart
                );
                if (!conflict) hasFreeBarber = true;
              } else {
                // Any barber
                for (const b of shop.barbers) {
                  const conflict = existingApps.some(
                    (a) => a.barberId === b.id && a.scheduledAt < slotEnd && a.endAt > slotStart
                  );
                  if (!conflict) {
                    hasFreeBarber = true;
                    break;
                  }
                }
              }

              if (hasFreeBarber) availableSlots.push(slotTime);
            }

            currentMinutes += 30;
          }

          if (availableSlots.length === 0) {
            reply = `Não encontramos horários disponíveis para o dia *${parsedDate}*. 😕\n\nDeseja escolher outra data?\n1️⃣ *Ver outro dia*\n2️⃣ *Voltar ao menu*`;
          } else {
            context.availableSlots = availableSlots.slice(0, 10); // Show top 10
            nextState = 'SELECTING_TIME';

            const slotList = context.availableSlots
              .map((t: string, i: number) => `${i + 1}️⃣ *${t}*`)
              .join('\n');

            reply = `Horários disponíveis para *${parsedDate}*:\n\n${slotList}\n0️⃣ *Escolher outra data*\n\n_Digite o número do horário desejado ou 0 para voltar:_`;
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STATE: SELECTING_TIME
  // -------------------------------------------------------------
  else if (session.state === 'SELECTING_TIME') {
    if (lower === '0' || lower === 'voltar') {
      nextState = 'SELECTING_DATE';
      reply = `Para qual data você prefere agendar?\n\n1️⃣ *Hoje*\n2️⃣ *Amanhã*\n3️⃣ *Outro dia (ex: Sábado ou 29/08)*\n0️⃣ *Voltar*`;
    } else {
      const slotIdx = parseInt(text, 10) - 1;
      let chosenTime: string | null = null;

      if (!isNaN(slotIdx) && context.availableSlots && context.availableSlots[slotIdx]) {
        chosenTime = context.availableSlots[slotIdx];
      } else {
        // Direct HH:MM match
        const directMatch = text.match(/^(\d{1,2}):(\d{2})$/);
        if (directMatch && context.availableSlots?.includes(text)) {
          chosenTime = text;
        }
      }

      if (!chosenTime) {
        reply = `Por favor, selecione um número da lista de horários disponíveis ou digite 0 para voltar.`;
      } else {
        context.time = chosenTime;

        // Check if customer is registered
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            barbershopId: shop.id,
            phone: { contains: phone.slice(-8) },
            deletedAt: null,
          },
        });

        if (!existingCustomer && !context.customerName) {
          nextState = 'ASKING_NEW_CUSTOMER_NAME';
          reply = `É seu primeiro agendamento na *${shop.name}*! 😊\n\nPor favor, informe seu *Nome Completo* para confirmarmos:\n0️⃣ *Cancelar*`;
        } else {
          context.customerName = existingCustomer?.name || context.customerName || incoming.senderName || 'Cliente';
          nextState = 'WAITING_CONFIRMATION';

          reply = `✂️ *Confirme seu Horário:*\n\n💈 *Barbearia:* ${shop.name}\n✂️ *Serviço:* ${context.serviceName}\n👤 *Barbeiro:* ${context.barberName}\n📅 *Data:* ${context.date}\n🕐 *Horário:* ${context.time}\n💰 *Valor:* R$ ${Number(context.price).toFixed(2).replace('.', ',')}\n\nConfirmar agendamento?\n1️⃣ *Sim, confirmar agora*\n2️⃣ *Não, cancelar agendamento*\n0️⃣ *Voltar ao menu principal*`;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STATE: ASKING_NEW_CUSTOMER_NAME
  // -------------------------------------------------------------
  else if (session.state === 'ASKING_NEW_CUSTOMER_NAME') {
    if (lower === '0' || lower === 'cancelar' || lower === 'voltar') {
      nextState = 'IDLE';
      context = {};
      reply = `Agendamento cancelado. 😊\n\nEnvie *MENU* quando quiser começar novamente.`;
    } else {
      const name = text.trim();
      if (name.length < 2) {
        reply = `Por favor, informe um nome válido ou digite 0 para cancelar.`;
      } else {
        context.customerName = name;
        nextState = 'WAITING_CONFIRMATION';

        reply = `✂️ *Confirme seu Horário:*\n\n💈 *Barbearia:* ${shop.name}\n👤 *Cliente:* ${context.customerName}\n✂️ *Serviço:* ${context.serviceName}\n👤 *Barbeiro:* ${context.barberName}\n📅 *Data:* ${context.date}\n🕐 *Horário:* ${context.time}\n💰 *Valor:* R$ ${Number(context.price).toFixed(2).replace('.', ',')}\n\nConfirmar agendamento?\n1️⃣ *Sim, confirmar agora*\n2️⃣ *Não, cancelar agendamento*\n0️⃣ *Voltar ao menu principal*`;
      }
    }
  }

  // -------------------------------------------------------------
  // STATE: WAITING_CONFIRMATION (Create or Reschedule Appointment)
  // -------------------------------------------------------------
  else if (session.state === 'WAITING_CONFIRMATION') {
    if (lower === '1' || lower.includes('sim') || lower.includes('confirmar') || lower.includes('ok')) {
      const { serviceId, barberId, date, time, customerName, durationMin, price } = context;
      const startDateTime = new Date(`${date}T${time}:00-03:00`);
      const endDateTime = new Date(startDateTime.getTime() + (durationMin || 30) * 60 * 1000);

      try {
        const bookingResult = await prisma.$transaction(async (tx) => {
          // 1. Find or create Customer
          let customer = await tx.customer.findFirst({
            where: {
              barbershopId: shop.id,
              phone: { contains: phone.slice(-8) },
              deletedAt: null,
            },
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                barbershopId: shop.id,
                name: customerName || 'Cliente WhatsApp',
                phone: phone,
                whatsappPhone: phone,
                status: 'NOVO',
                marketingOptIn: true,
              },
            });

            await tx.customerVisitStats.create({
              data: {
                customerId: customer.id,
                totalVisits: 0,
                totalSpent: 0,
                avgTicket: 0,
                avgDaysBetweenVisits: 30,
                medianDaysBetween: 30,
              },
            });
          }

          // 2. Select barber with anti-conflict
          let chosenBarber = null;
          if (barberId && barberId !== 'ANY') {
            chosenBarber = shop.barbers.find((b) => b.id === barberId);
            if (!chosenBarber) throw new Error('BARBER_NOT_FOUND');

            const conflict = await tx.appointment.findFirst({
              where: {
                barberId: chosenBarber.id,
                barbershopId: shop.id,
                status: { notIn: ['CANCELADO', 'NO_SHOW'] },
                AND: [{ scheduledAt: { lt: endDateTime } }, { endAt: { gt: startDateTime } }],
              },
            });
            if (conflict) throw new Error('SCHEDULE_CONFLICT');
          } else {
            for (const candidate of shop.barbers) {
              const conflict = await tx.appointment.findFirst({
                where: {
                  barberId: candidate.id,
                  barbershopId: shop.id,
                  status: { notIn: ['CANCELADO', 'NO_SHOW'] },
                  AND: [{ scheduledAt: { lt: endDateTime } }, { endAt: { gt: startDateTime } }],
                },
              });
              if (!conflict) {
                chosenBarber = candidate;
                break;
              }
            }
            if (!chosenBarber) throw new Error('NO_BARBER_AVAILABLE');
          }

          // 3. If rescheduling, cancel previous appointment
          if (context.reschedulingAppointmentId) {
            await tx.appointment.update({
              where: { id: context.reschedulingAppointmentId },
              data: {
                status: 'CANCELADO',
                cancelReason: 'Remarcado via WhatsApp',
                cancelledAt: new Date(),
              },
            });
          }

          // 4. Create new appointment
          const appointment = await tx.appointment.create({
            data: {
              barbershopId: shop.id,
              customerId: customer.id,
              barberId: chosenBarber.id,
              serviceId: serviceId,
              scheduledAt: startDateTime,
              endAt: endDateTime,
              durationMinutes: durationMin || 30,
              price: price,
              serviceNameSnapshot: context.serviceName,
              servicePriceSnapshot: price,
              origin: 'WHATSAPP',
              rescheduledFromId: context.reschedulingAppointmentId || null,
              status: 'AGENDADO',
            },
            include: { customer: true, barber: true, service: true, barbershop: true },
          });

          return { appointment, customer, barber: chosenBarber };
        });

        // Cancel previous reminders if rescheduling
        if (context.reschedulingAppointmentId) {
          await cancelAppointmentReminders(context.reschedulingAppointmentId).catch(() => {});
        }

        // Schedule anti-duplication reminders for new appointment
        await scheduleAppointmentReminders({
          appointmentId: bookingResult.appointment.id,
          barbershopId: shop.id,
          scheduledAt: bookingResult.appointment.scheduledAt,
        });

        // Trigger Event for Webhooks & n8n
        await publishEvent(
          'APPOINTMENT_CREATED',
          shop.id,
          {
            appointmentId: bookingResult.appointment.id,
            publicToken: bookingResult.appointment.publicToken,
            customerName: bookingResult.customer.name,
            customerPhone: bookingResult.customer.phone,
            barberName: bookingResult.barber.name,
            serviceName: context.serviceName,
            price: bookingResult.appointment.price,
            scheduledAt: bookingResult.appointment.scheduledAt.toISOString(),
            origin: 'WHATSAPP',
          },
          {
            customerId: bookingResult.customer.id,
            appointmentId: bookingResult.appointment.id,
            barberId: bookingResult.barber.id,
            serviceId: serviceId,
          }
        ).catch(() => {});

        // Build Confirmation Message with Links
        const publicUrl = `https://barber.projetosunion.cloud/agendamento/${bookingResult.appointment.publicToken}`;
        const gcalUrl = generateGoogleCalendarUrl({
          id: bookingResult.appointment.id,
          publicToken: bookingResult.appointment.publicToken,
          scheduledAt: bookingResult.appointment.scheduledAt,
          endAt: bookingResult.appointment.endAt,
          price: bookingResult.appointment.price,
          serviceName: context.serviceName,
          barberName: bookingResult.barber.name,
          shopName: shop.name,
          shopAddress: shop.address,
          publicUrl,
        });

        reply = `✅ *Agendamento Confirmado!* 🎉\n\n✂️ *Serviço:* ${context.serviceName}\n👤 *Barbeiro:* ${bookingResult.barber.name}\n📅 *Data:* ${date}\n🕐 *Horário:* ${time}\n📍 *Local:* ${shop.name}\n💰 *Valor:* R$ ${Number(price).toFixed(2).replace('.', ',')}\n\nVocê receberá lembretes automáticos antes do seu horário.\n\n📅 *Adicionar ao Google Calendar:*\n${gcalUrl}\n\n📥 *Ver detalhes ou cancelar:*\n${publicUrl}\n\n_Envie *MENU* a qualquer momento para novas opções._`;
        nextState = 'IDLE';
        context = {};
      } catch (err: any) {
        if (err.message === 'SCHEDULE_CONFLICT' || err.message === 'NO_BARBER_AVAILABLE') {
          reply = `Esse horário acabou de ser reservado por outra pessoa 😕.\n\nPor favor, envie *MENU* para escolher outro horário disponível.`;
        } else {
          reply = `Ocorreu um erro ao registrar seu agendamento. Por favor, tente novamente enviando *MENU*.`;
        }
        nextState = 'IDLE';
      }
    } else {
      reply = `Agendamento cancelado. 😊\n\nEnvie *MENU* quando quiser começar novamente.`;
      nextState = 'IDLE';
      context = {};
    }
  }

  // -------------------------------------------------------------
  // STATE: CANCELLING
  // -------------------------------------------------------------
  else if (session.state === 'CANCELLING') {
    if (lower === '1' || lower.includes('sim') || lower.includes('cancelar')) {
      const appId = context.cancellingAppointmentId;
      if (appId) {
        await prisma.appointment.update({
          where: { id: appId },
          data: {
            status: 'CANCELADO',
            cancelReason: 'Cancelado pelo cliente via WhatsApp',
            cancelledAt: new Date(),
          },
        });

        await cancelAppointmentReminders(appId);

        await publishEvent(
          'APPOINTMENT_CANCELLED',
          shop.id,
          { appointmentId: appId, phone, reason: 'Cancelado via WhatsApp' },
          { appointmentId: appId }
        ).catch(() => {});

        reply = `✅ Seu agendamento foi cancelado com sucesso.\n\nEsperamos ver você em breve! Envie *MENU* quando desejar agendar um novo horário.`;
      } else {
        reply = `Não foi possível identificar o agendamento para cancelar. Envie *MENU* para tentar novamente.`;
      }
    } else {
      reply = `Seu agendamento foi mantido normalmente! 👍\n\nEnvie *MENU* se precisar de mais alguma coisa.`;
    }
    nextState = 'IDLE';
    context = {};
  }

  // Save Session updates
  await prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      state: nextState,
      context: JSON.stringify(context),
      expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
    },
  });

  // Send reply through provider
  if (reply) {
    await getWhatsAppProvider().sendText({
      to: phone,
      text: reply,
      tenantId: shop.id,
    });
  }

  return {
    reply,
    state: nextState,
    appointmentId: context.createdAppointmentId,
  };
}
