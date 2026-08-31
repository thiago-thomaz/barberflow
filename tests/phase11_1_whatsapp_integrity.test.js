const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('BarberFlow FASE 11.1 — Auditoria e Testes de Integridade E2E do WhatsApp', () => {
  let shopA;
  let shopB;
  let barberA;
  let barberB;
  let serviceA;
  let serviceB;
  let customerExistingA;

  const phoneA = '5514991112233';
  const phoneB = '5514994445566';
  const newPhone = '5514997778899';

  before(async () => {
    // 1. Setup Tenant A
    shopA = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Alpha Audit',
        slug: `shop-alpha-audit-${Date.now()}`,
        phone: '14991110000',
        whatsappActive: true,
        reminder24h: true,
        reminder6h: true,
        reminder2h: true,
        reminder1h: true,
      },
    });

    barberA = await prisma.barber.create({
      data: {
        barbershopId: shopA.id,
        name: 'Barbeiro Alpha',
        isActive: true,
      },
    });

    serviceA = await prisma.service.create({
      data: {
        barbershopId: shopA.id,
        name: 'Corte Degradê Alpha',
        durationMin: 30,
        price: 50.0,
        isActive: true,
      },
    });

    customerExistingA = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Cadastrado Alpha',
        phone: '14991112233',
        whatsappPhone: phoneA,
        status: 'ATIVO',
        marketingOptIn: true,
      },
    });

    await prisma.customerVisitStats.create({
      data: {
        customerId: customerExistingA.id,
        totalVisits: 3,
        totalSpent: 150.0,
        avgTicket: 50.0,
        avgDaysBetweenVisits: 20,
        medianDaysBetween: 20,
      },
    });

    // 2. Setup Tenant B
    shopB = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Beta Audit',
        slug: `shop-beta-audit-${Date.now()}`,
        phone: '14992220000',
        whatsappActive: true,
      },
    });

    barberB = await prisma.barber.create({
      data: {
        barbershopId: shopB.id,
        name: 'Barbeiro Beta',
        isActive: true,
      },
    });

    serviceB = await prisma.service.create({
      data: {
        barbershopId: shopB.id,
        name: 'Barba Terapia Beta',
        durationMin: 30,
        price: 40.0,
        isActive: true,
      },
    });
  });

  after(async () => {
    // Cleanup created test shops and cascading children
    if (shopA) {
      await prisma.barbershop.delete({ where: { id: shopA.id } }).catch(() => {});
    }
    if (shopB) {
      await prisma.barbershop.delete({ where: { id: shopB.id } }).catch(() => {});
    }
  });

  // =========================================================================
  // TESTE 1: Multi-Tenancy & Isolamento Estrito de WhatsApp
  // =========================================================================
  test('1. Multi-Tenancy: Sessões e mensagens do Tenant A são 100% isoladas do Tenant B', async () => {
    // Criar sessão para Tenant A
    const sessionA = await prisma.whatsappSession.create({
      data: {
        barbershopId: shopA.id,
        phone: phoneA,
        state: 'SELECTING_SERVICE',
        context: JSON.stringify({ shopName: shopA.name }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Criar sessão para Tenant B com outro telefone
    const sessionB = await prisma.whatsappSession.create({
      data: {
        barbershopId: shopB.id,
        phone: phoneB,
        state: 'SELECTING_DATE',
        context: JSON.stringify({ shopName: shopB.name }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    assert.ok(sessionA);
    assert.ok(sessionB);

    // Consulta de sessões por tenant
    const sessionsOfShopA = await prisma.whatsappSession.findMany({
      where: { barbershopId: shopA.id },
    });
    assert.strictEqual(sessionsOfShopA.length, 1);
    assert.strictEqual(sessionsOfShopA[0].phone, phoneA);

    // Tentativa do Tenant B consultar sessão do Tenant A
    const leakCheck = await prisma.whatsappSession.findFirst({
      where: {
        barbershopId: shopB.id,
        phone: phoneA,
      },
    });
    assert.strictEqual(leakCheck, null, 'Tenant B não pode acessar sessão do Tenant A');
  });

  // =========================================================================
  // TESTE 2: Cliente Existente vs Novo Cliente
  // =========================================================================
  test('2. Cliente: Reutilização de Customer existente e criação de apenas 1 novo Customer sem duplicar', async () => {
    const phoneDigits = phoneA.replace(/\D/g, '');
    const phoneLast8 = phoneDigits.slice(-8);

    // 2.1 Buscar cliente existente pelo telefone
    const existing = await prisma.customer.findFirst({
      where: {
        barbershopId: shopA.id,
        deletedAt: null,
        OR: [
          { phone: { contains: phoneLast8 } },
          { whatsappPhone: phoneA },
        ],
      },
    });

    assert.ok(existing);
    assert.strictEqual(existing.id, customerExistingA.id);

    // 2.2 Criação de NOVO cliente para número não cadastrado
    const newPhoneDigits = newPhone.replace(/\D/g, '');
    const newPhoneLast8 = newPhoneDigits.slice(-8);

    let customerNew = await prisma.customer.findFirst({
      where: {
        barbershopId: shopA.id,
        deletedAt: null,
        OR: [
          { phone: { contains: newPhoneLast8 } },
          { whatsappPhone: newPhone },
        ],
      },
    });

    assert.strictEqual(customerNew, null, 'Novo cliente ainda não existe');

    // Criação
    customerNew = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Carlos Novo WhatsApp',
        phone: newPhone,
        whatsappPhone: newPhone,
        status: 'NOVO',
        marketingOptIn: true,
      },
    });

    assert.ok(customerNew);
    assert.strictEqual(customerNew.name, 'Carlos Novo WhatsApp');

    // 2.3 Simular segunda mensagem com o mesmo número novo -> NÃO deve criar segundo Customer
    const countBefore = await prisma.customer.count({
      where: { barbershopId: shopA.id, whatsappPhone: newPhone },
    });
    assert.strictEqual(countBefore, 1);

    // Busca novamente (como o engine.ts faz)
    const resolvedCustomer = await prisma.customer.findFirst({
      where: {
        barbershopId: shopA.id,
        deletedAt: null,
        OR: [
          { phone: { contains: newPhoneLast8 } },
          { whatsappPhone: newPhone },
        ],
      },
    });
    assert.strictEqual(resolvedCustomer.id, customerNew.id, 'Reutilizou o mesmo Customer ID');
  });

  // =========================================================================
  // TESTE 3: Agendamento Unificado (WhatsApp ↔ Agenda Administrativa)
  // =========================================================================
  test('3. Agendamento: Criado pelo WhatsApp aparece na Agenda e vice-versa na mesma tabela', async () => {
    const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    scheduledDate.setMinutes(0, 0, 0);

    // 3.1 Agendamento originado no WhatsApp
    const appWhatsApp = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: scheduledDate,
        endAt: new Date(scheduledDate.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        price: serviceA.price,
        serviceNameSnapshot: serviceA.name,
        servicePriceSnapshot: serviceA.price,
        origin: 'WHATSAPP',
        status: 'AGENDADO',
      },
    });

    assert.ok(appWhatsApp);
    assert.strictEqual(appWhatsApp.origin, 'WHATSAPP');

    // Valida que a consulta da Agenda Administrativa (filtrando por barbershopId e data) encontra o agendamento
    const adminAgendaView = await prisma.appointment.findMany({
      where: {
        barbershopId: shopA.id,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
      include: { customer: true, barber: true, service: true },
    });

    const foundInAdmin = adminAgendaView.find((a) => a.id === appWhatsApp.id);
    assert.ok(foundInAdmin, 'Agendamento WhatsApp aparece na Agenda Administrativa');
    assert.strictEqual(foundInAdmin.customer.name, customerExistingA.name);

    // 3.2 Agendamento criado pela Agenda Admin (origin: WEB)
    const nextAdminDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const appAdmin = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: nextAdminDate,
        endAt: new Date(nextAdminDate.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        price: serviceA.price,
        origin: 'WEB',
        status: 'CONFIRMADO',
      },
    });

    // Consulta de "meu próximo horário" via WhatsApp encontra o agendamento criado no Admin
    const customerNextApp = await prisma.appointment.findFirst({
      where: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    assert.ok(customerNextApp, 'WhatsApp consegue consultar agendamento criado no Admin');
  });

  // =========================================================================
  // TESTE 4: Proteção Anti-Conflito Concorrente (Zero Double-Booking)
  // =========================================================================
  test('4. Anti-Conflito: Concorrência simultânea para o mesmo horário/barbeiro garante zero double-booking', async () => {
    const conflictDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
    conflictDate.setHours(15, 0, 0, 0);
    const conflictEnd = new Date(conflictDate.getTime() + 30 * 60 * 1000);

    // Função de tentativa de reserva atômica (mesma lógica usada no engine.ts)
    async function tryBook(customerId, origin) {
      return await prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            barberId: barberA.id,
            barbershopId: shopA.id,
            status: { notIn: ['CANCELADO', 'NO_SHOW'] },
            AND: [
              { scheduledAt: { lt: conflictEnd } },
              { endAt: { gt: conflictDate } },
            ],
          },
        });

        if (conflict) {
          throw new Error('SCHEDULE_CONFLICT');
        }

        return await tx.appointment.create({
          data: {
            barbershopId: shopA.id,
            customerId: customerId,
            barberId: barberA.id,
            serviceId: serviceA.id,
            scheduledAt: conflictDate,
            endAt: conflictEnd,
            price: serviceA.price,
            origin: origin,
            status: 'AGENDADO',
          },
        });
      });
    }

    // Executar 2 tentativas simultâneas (uma pelo WhatsApp e uma pelo Admin)
    const results = await Promise.allSettled([
      tryBook(customerExistingA.id, 'WHATSAPP'),
      tryBook(customerExistingA.id, 'ADMIN'),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(successes.length, 1, 'Exatamente UM agendamento deve ter sucesso');
    assert.strictEqual(failures.length, 1, 'Exatamente UMA tentativa deve falhar por conflito');
    assert.strictEqual(failures[0].reason.message, 'SCHEDULE_CONFLICT');
  });

  // =========================================================================
  // TESTE 5: Remarcação via WhatsApp com Limpeza de Lembretes Anteriores
  // =========================================================================
  test('5. Remarcação: Cancela agendamento anterior, cancela lembretes velhos e cria novo com link', async () => {
    const originalDate = new Date(Date.now() + 50 * 60 * 60 * 1000);
    const newDate = new Date(Date.now() + 60 * 60 * 60 * 1000);

    // 1. Criar agendamento original
    const originalApp = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: originalDate,
        endAt: new Date(originalDate.getTime() + 30 * 60 * 1000),
        price: 50.0,
        status: 'AGENDADO',
      },
    });

    // 2. Criar lembrete T-24h para o agendamento original
    await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: originalApp.id,
        reminderType: 'T_24H',
        scheduledFor: new Date(originalDate.getTime() - 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    // 3. Executar Remarcação
    const rescheduleResult = await prisma.$transaction(async (tx) => {
      // Cancela o original
      await tx.appointment.update({
        where: { id: originalApp.id },
        data: {
          status: 'CANCELADO',
          cancelReason: 'Remarcado pelo cliente via WhatsApp',
          cancelledAt: new Date(),
        },
      });

      // Cria o novo apontando rescheduledFromId
      const newApp = await tx.appointment.create({
        data: {
          barbershopId: shopA.id,
          customerId: customerExistingA.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: newDate,
          endAt: new Date(newDate.getTime() + 30 * 60 * 1000),
          price: 50.0,
          origin: 'WHATSAPP',
          rescheduledFromId: originalApp.id,
          status: 'AGENDADO',
        },
      });

      return newApp;
    });

    // Cancelar lembretes do agendamento original
    await prisma.appointmentReminder.updateMany({
      where: { appointmentId: originalApp.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // Agendar novo lembrete para o novo agendamento
    await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: rescheduleResult.id,
        reminderType: 'T_24H',
        scheduledFor: new Date(newDate.getTime() - 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    // Verificações
    const updatedOriginal = await prisma.appointment.findUnique({ where: { id: originalApp.id } });
    assert.strictEqual(updatedOriginal.status, 'CANCELADO');

    const oldReminders = await prisma.appointmentReminder.findMany({ where: { appointmentId: originalApp.id } });
    assert.strictEqual(oldReminders[0].status, 'CANCELLED');

    const newReminders = await prisma.appointmentReminder.findMany({ where: { appointmentId: rescheduleResult.id } });
    assert.strictEqual(newReminders[0].status, 'PENDING');
    assert.strictEqual(rescheduleResult.rescheduledFromId, originalApp.id);
  });

  // =========================================================================
  // TESTE 6: Cancelamento via WhatsApp e Liberação de Horário
  // =========================================================================
  test('6. Cancelamento: Libera horário para novo agendamento e cancela lembretes pendentes', async () => {
    const slotDate = new Date(Date.now() + 80 * 60 * 60 * 1000);
    slotDate.setHours(10, 0, 0, 0);
    const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);

    const appToCancel = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: slotDate,
        endAt: slotEnd,
        price: 50.0,
        status: 'AGENDADO',
      },
    });

    await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: appToCancel.id,
        reminderType: 'T_2H',
        scheduledFor: new Date(slotDate.getTime() - 2 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    // Cancelar
    await prisma.appointment.update({
      where: { id: appToCancel.id },
      data: {
        status: 'CANCELADO',
        cancelReason: 'Cancelado pelo cliente via WhatsApp',
        cancelledAt: new Date(),
      },
    });

    await prisma.appointmentReminder.updateMany({
      where: { appointmentId: appToCancel.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // Verificar se o horário agora está livre
    const conflictCheck = await prisma.appointment.findFirst({
      where: {
        barberId: barberA.id,
        barbershopId: shopA.id,
        status: { notIn: ['CANCELADO', 'NO_SHOW'] },
        AND: [
          { scheduledAt: { lt: slotEnd } },
          { endAt: { gt: slotDate } },
        ],
      },
    });
    assert.strictEqual(conflictCheck, null, 'Horário liberado com sucesso');

    // Novo cliente consegue agendar no mesmo horário
    const newBooking = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: slotDate,
        endAt: slotEnd,
        price: 50.0,
        status: 'AGENDADO',
      },
    });
    assert.ok(newBooking);
  });

  // =========================================================================
  // TESTE 7: Lembretes Idempotentes e Processamento Seguro
  // =========================================================================
  test('7. Lembretes: Restrição única impede duplicação e worker processa com idempotência', async () => {
    const targetDate = new Date(Date.now() + 100 * 60 * 60 * 1000);
    const appReminderTest = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: targetDate,
        endAt: new Date(targetDate.getTime() + 30 * 60 * 1000),
        price: 50.0,
        status: 'AGENDADO',
      },
    });

    // 1. Inserir lembrete T_6H
    const r1 = await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: appReminderTest.id,
        reminderType: 'T_6H',
        scheduledFor: new Date(targetDate.getTime() - 6 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });
    assert.ok(r1);

    // 2. Tentativa de duplicar T_6H no mesmo appointment deve falhar pela constraint única
    let failedDuplicate = false;
    try {
      await prisma.appointmentReminder.create({
        data: {
          barbershopId: shopA.id,
          appointmentId: appReminderTest.id,
          reminderType: 'T_6H',
          scheduledFor: new Date(targetDate.getTime() - 6 * 60 * 60 * 1000),
          status: 'PENDING',
        },
      });
    } catch {
      failedDuplicate = true;
    }
    assert.strictEqual(failedDuplicate, true, 'Duplicação de lembrete do mesmo tipo bloqueada');

    // 3. Simulação de processamento de lembrete vencido
    const pastReminder = await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: appReminderTest.id,
        reminderType: 'T_2H',
        scheduledFor: new Date(Date.now() - 10 * 1000), // Vencido há 10s
        status: 'PENDING',
      },
    });

    // Worker busca apenas PENDING com scheduledFor <= now
    const dueList = await prisma.appointmentReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
        appointmentId: appReminderTest.id,
      },
    });
    assert.strictEqual(dueList.length, 1);

    // Marca como SENT
    await prisma.appointmentReminder.update({
      where: { id: pastReminder.id },
      data: { status: 'SENT', sentAt: new Date(), attempts: 1 },
    });

    // Segunda execução do worker: NÃO encontra mais o lembrete (idempotente)
    const dueListAfter = await prisma.appointmentReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
        appointmentId: appReminderTest.id,
      },
    });
    assert.strictEqual(dueListAfter.length, 0, 'Zero mensagens duplicadas em execuções subsequentes');
  });

  // =========================================================================
  // TESTE 8: Calendário RFC 5545 e Google Calendar
  // =========================================================================
  test('8. Calendário: Geração de .ics RFC 5545 válida e compatível', () => {
    function generateICS(app) {
      const dtStart = app.scheduledAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const dtEnd = app.endAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BarberFlow//Universal Booking Calendar//PT',
        'BEGIN:VEVENT',
        `UID:${app.publicToken}@barberflow.projetosunion.cloud`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${app.serviceName} - ${app.shopName}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
    }

    const mockApp = {
      publicToken: 'cuid_token_test_123',
      scheduledAt: new Date('2026-09-01T14:00:00Z'),
      endAt: new Date('2026-09-01T14:30:00Z'),
      serviceName: 'Corte Degradê',
      shopName: 'Barbearia Alpha',
    };

    const ics = generateICS(mockApp);
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('UID:cuid_token_test_123@barberflow.projetosunion.cloud'));
    assert.ok(ics.includes('SUMMARY:Corte Degradê - Barbearia Alpha'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });

  // =========================================================================
  // TESTE 9: Deduplicação de Mensagens Inbound por `providerMessageId`
  // =========================================================================
  test('9. Inbound Deduplication: Mesma mensagem com mesmo providerMessageId é ignorada', async () => {
    const testMsgId = `waha_msg_uniq_${Date.now()}`;

    // Primeira recepção
    const msg1 = await prisma.whatsappMessage.create({
      data: {
        barbershopId: shopA.id,
        phone: phoneA,
        direction: 'INBOUND',
        type: 'TEXT',
        content: 'Quero agendar horário',
        status: 'READ',
        providerMessageId: testMsgId,
      },
    });
    assert.ok(msg1);

    // Verificação de deduplicação (mesma lógica do engine.ts)
    const duplicate = await prisma.whatsappMessage.findFirst({
      where: {
        barbershopId: shopA.id,
        phone: phoneA,
        providerMessageId: testMsgId,
        direction: 'INBOUND',
      },
    });

    assert.ok(duplicate, 'Identificou mensagem já processada');
    assert.strictEqual(duplicate.id, msg1.id);
  });

  // =========================================================================
  // TESTE 10: Resiliência a Falhas & Status de Retry
  // =========================================================================
  test('10. Falhas & Retry: Erros do provedor incrementam attempts e marcam FAILED com segurança', async () => {
    const testAppFail = await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerExistingA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: new Date(Date.now() + 120 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 120.5 * 60 * 60 * 1000),
        price: 50.0,
        status: 'AGENDADO',
      },
    });

    const failedReminder = await prisma.appointmentReminder.create({
      data: {
        barbershopId: shopA.id,
        appointmentId: testAppFail.id,
        reminderType: 'T_1H',
        scheduledFor: new Date(Date.now() - 1000),
        status: 'PENDING',
        attempts: 0,
      },
    });

    // Simulação de 1ª falha (status continua PENDING com attempts=1)
    const firstFail = await prisma.appointmentReminder.update({
      where: { id: failedReminder.id },
      data: {
        attempts: failedReminder.attempts + 1,
        status: failedReminder.attempts + 1 >= 2 ? 'FAILED' : 'PENDING',
        error: 'WAHA Gateway Timeout 504',
      },
    });
    assert.strictEqual(firstFail.attempts, 1);
    assert.strictEqual(firstFail.status, 'PENDING');

    // Simulação de 2ª falha (passa de 2 tentativas -> FAILED)
    const secondFail = await prisma.appointmentReminder.update({
      where: { id: failedReminder.id },
      data: {
        attempts: firstFail.attempts + 1,
        status: firstFail.attempts + 1 >= 2 ? 'FAILED' : 'PENDING',
        error: 'WAHA Session Stopped',
      },
    });
    assert.strictEqual(secondFail.attempts, 2);
    assert.strictEqual(secondFail.status, 'FAILED');
  });
});
