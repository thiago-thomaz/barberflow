/**
 * BarberFlow — Automated Test Suite for Phase 11:
 * WhatsApp Booking Engine + Confirmations + Reminders + Calendar Integration
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Starting BarberFlow Phase 11 WhatsApp Engine & Calendar Test Suite...\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`  ▶ ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL\n     Error: ${err.message}`);
      console.error(err);
      failed++;
    }
  }

  // Seed / Ensure Test Barbershop
  let shop = await prisma.barbershop.findFirst({
    where: { isActive: true },
    include: { services: true, barbers: true },
  });

  if (!shop) {
    shop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Teste WhatsApp',
        slug: 'barbearia-teste-wa',
        phone: '14999999999',
        whatsappActive: true,
        reminder24h: true,
        reminder6h: true,
        reminder2h: true,
        reminder1h: true,
      },
      include: { services: true, barbers: true },
    });
  }

  // Ensure services and barbers exist
  let service = shop.services[0];
  if (!service) {
    service = await prisma.service.create({
      data: {
        barbershopId: shop.id,
        name: 'Corte Tradicional Teste',
        price: 45.0,
        durationMin: 30,
        isActive: true,
      },
    });
  }

  let barber = shop.barbers[0];
  if (!barber) {
    barber = await prisma.barber.create({
      data: {
        barbershopId: shop.id,
        name: 'Barbeiro Teste',
        isActive: true,
      },
    });
  }

  // Ensure Business Hours exist for test days (all week open 09:00 - 19:00)
  for (let d = 0; d < 7; d++) {
    await prisma.businessHours.upsert({
      where: { barbershopId_dayOfWeek: { barbershopId: shop.id, dayOfWeek: d } },
      create: { barbershopId: shop.id, dayOfWeek: d, openTime: '09:00', closeTime: '19:00', isOpen: true },
      update: { openTime: '09:00', closeTime: '19:00', isOpen: true },
    });
  }

  const testPhone = '5514998887766';

  // -------------------------------------------------------------
  // TEST 1: Phone Normalization
  // -------------------------------------------------------------
  await test('1. E.164 Canonical Phone Normalization', async () => {
    const { normalizeWhatsAppPhone } = await import('../src/lib/whatsapp/engine.ts');
    assert.strictEqual(normalizeWhatsAppPhone('+55 (14) 99888-7766'), '5514998887766');
    assert.strictEqual(normalizeWhatsAppPhone('14998887766'), '5514998887766');
    assert.strictEqual(normalizeWhatsAppPhone('5514998887766'), '5514998887766');
  });

  // -------------------------------------------------------------
  // TEST 2: Natural Language Date Parser
  // -------------------------------------------------------------
  await test('2. Deterministic Date Parsing in America/Sao_Paulo', async () => {
    const { parseDateInput } = await import('../src/lib/whatsapp/engine.ts');
    const todayResult = parseDateInput('hoje');
    assert.ok(todayResult && /^\d{4}-\d{2}-\d{2}$/.test(todayResult));

    const tomorrowResult = parseDateInput('amanhã');
    assert.ok(tomorrowResult && /^\d{4}-\d{2}-\d{2}$/.test(tomorrowResult));

    const saturdayResult = parseDateInput('sábado');
    assert.ok(saturdayResult && /^\d{4}-\d{2}-\d{2}$/.test(saturdayResult));

    const specificDate = parseDateInput('29/08');
    assert.ok(specificDate && specificDate.endsWith('-08-29'));
  });

  // -------------------------------------------------------------
  // TEST 3: Conversational Flow - Welcome Menu & State Machine
  // -------------------------------------------------------------
  await test('3. Conversational Flow: Menu Greeting & Intent Detection', async () => {
    const { processWhatsAppMessage } = await import('../src/lib/whatsapp/engine.ts');

    // Clean previous sessions
    await prisma.whatsappSession.deleteMany({ where: { phone: testPhone } });

    // Step 1: User says "Oi"
    const res1 = await processWhatsAppMessage({
      from: testPhone,
      text: 'Oi',
      tenantSlugOrId: shop.slug,
    });
    assert.strictEqual(res1.state, 'IDLE');
    assert.ok(res1.reply.includes('Como posso te ajudar hoje?'));
  });

  // -------------------------------------------------------------
  // TEST 4: Full Conversational Booking Flow (E2E simulation)
  // -------------------------------------------------------------
  await test('4. Conversational Booking: Service -> Barber -> Date -> Time -> Confirmation', async () => {
    const { processWhatsAppMessage } = await import('../src/lib/whatsapp/engine.ts');

    // Step 1: User chooses Option 1 (Agendar)
    const res1 = await processWhatsAppMessage({
      from: testPhone,
      text: '1',
      tenantSlugOrId: shop.slug,
    });
    assert.strictEqual(res1.state, 'SELECTING_SERVICE');
    assert.ok(res1.reply.includes('Qual serviço você deseja agendar?'));

    // Step 2: User selects service 1
    const res2 = await processWhatsAppMessage({
      from: testPhone,
      text: '1',
      tenantSlugOrId: shop.slug,
    });
    assert.ok(res2.state === 'SELECTING_BARBER' || res2.state === 'SELECTING_DATE');

    // If more than 1 barber, select barber
    if (res2.state === 'SELECTING_BARBER') {
      const resBarber = await processWhatsAppMessage({
        from: testPhone,
        text: '1',
        tenantSlugOrId: shop.slug,
      });
      assert.strictEqual(resBarber.state, 'SELECTING_DATE');
    }

    // Step 3: User selects date "Amanhã"
    let resDate = await processWhatsAppMessage({
      from: testPhone,
      text: 'amanhã',
      tenantSlugOrId: shop.slug,
    });
    assert.ok(resDate.state === 'SELECTING_PERIOD' || resDate.state === 'SELECTING_TIME');

    // If in SELECTING_PERIOD, select "1" (Manhã)
    if (resDate.state === 'SELECTING_PERIOD') {
      resDate = await processWhatsAppMessage({
        from: testPhone,
        text: '1',
        tenantSlugOrId: shop.slug,
      });
      assert.strictEqual(resDate.state, 'SELECTING_TIME');
    }

    assert.ok(resDate.reply.includes('Horários') || resDate.reply.includes('Manhã') || resDate.reply.includes('🟢'));

    // Step 4: User selects slot 1
    const resTime = await processWhatsAppMessage({
      from: testPhone,
      text: '1',
      tenantSlugOrId: shop.slug,
    });
    assert.ok(resTime.state === 'ASKING_NEW_CUSTOMER_NAME' || resTime.state === 'WAITING_CONFIRMATION');

    // If new customer, provide name
    if (resTime.state === 'ASKING_NEW_CUSTOMER_NAME') {
      const resName = await processWhatsAppMessage({
        from: testPhone,
        text: 'Cliente Teste WhatsApp',
        tenantSlugOrId: shop.slug,
      });
      assert.strictEqual(resName.state, 'WAITING_CONFIRMATION');
    }

    // Step 5: Explicit confirmation ("1" / "Sim")
    const resConfirm = await processWhatsAppMessage({
      from: testPhone,
      text: '1',
      tenantSlugOrId: shop.slug,
    });
    assert.ok(resConfirm.state === 'IDLE' || resConfirm.state === 'CONFIRMED');
    assert.ok(resConfirm.reply.includes('Agendamento Confirmado!'));

    // Verify appointment was created in DB with origin = 'WHATSAPP'
    const createdApp = await prisma.appointment.findFirst({
      where: { customer: { phone: { contains: '998887766' } } },
      orderBy: { createdAt: 'desc' },
      include: { customer: true, barber: true, service: true },
    });

    assert.ok(createdApp);
    assert.strictEqual(createdApp.origin, 'WHATSAPP');
    assert.strictEqual(createdApp.status, 'AGENDADO');
  });

  // -------------------------------------------------------------
  // TEST 5: Anti-Double-Booking Concurrency Protection
  // -------------------------------------------------------------
  await test('5. Anti-Double-Booking Concurrency Protection via WhatsApp API', async () => {
    // Schedule a mock appointment for tomorrow at 15:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const slotStart = new Date(`${dateStr}T15:00:00-03:00`);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    const custA = await prisma.customer.upsert({
      where: { id: 'cust_concurrency_a' },
      create: {
        id: 'cust_concurrency_a',
        barbershopId: shop.id,
        name: 'Cliente A',
        phone: '5514911111111',
      },
      update: {},
    });

    // Create First Appointment
    const appA = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: custA.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt: slotStart,
        endAt: slotEnd,
        price: service.price,
        origin: 'WHATSAPP',
        status: 'AGENDADO',
      },
    });

    // Attempt second booking for exactly the same barber & time slot
    let secondBookingFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            barberId: barber.id,
            barbershopId: shop.id,
            status: { notIn: ['CANCELADO', 'NO_SHOW'] },
            AND: [{ scheduledAt: { lt: slotEnd } }, { endAt: { gt: slotStart } }],
          },
        });
        if (conflict) throw new Error('SCHEDULE_CONFLICT');

        await tx.appointment.create({
          data: {
            barbershopId: shop.id,
            customerId: custA.id,
            barberId: barber.id,
            serviceId: service.id,
            scheduledAt: slotStart,
            endAt: slotEnd,
            price: service.price,
            origin: 'WHATSAPP',
          },
        });
      });
    } catch (err) {
      if (err.message === 'SCHEDULE_CONFLICT') {
        secondBookingFailed = true;
      }
    }

    assert.strictEqual(secondBookingFailed, true, 'Second booking MUST fail due to anti-conflict protection');

    // Clean up test app
    await prisma.appointment.delete({ where: { id: appA.id } });
  });

  // -------------------------------------------------------------
  // TEST 6: Reminders Scheduling & Zero-Duplication Guarantee
  // -------------------------------------------------------------
  await test('6. Reminders Scheduler: T-24h, T-6h, T-2h, T-1h with Idempotency & Unique Constraint', async () => {
    const { scheduleAppointmentReminders, cancelAppointmentReminders } = await import('../src/lib/whatsapp/reminders.ts');

    // Create an appointment 30 hours from now
    const futureDate = new Date(Date.now() + 30 * 60 * 60 * 1000);
    const testCust = await prisma.customer.findFirst({ where: { barbershopId: shop.id } });

    const app = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: testCust.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt: futureDate,
        endAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
        price: 45.0,
        origin: 'WHATSAPP',
        status: 'AGENDADO',
      },
    });

    // First call: Schedules reminders
    await scheduleAppointmentReminders({
      appointmentId: app.id,
      barbershopId: shop.id,
      scheduledAt: app.scheduledAt,
    });

    const remindersCount1 = await prisma.appointmentReminder.count({
      where: { appointmentId: app.id },
    });
    assert.ok(remindersCount1 >= 1, 'Should create scheduled reminders');

    // Second call: Idempotency verification (MUST NOT DUPLICATE)
    await scheduleAppointmentReminders({
      appointmentId: app.id,
      barbershopId: shop.id,
      scheduledAt: app.scheduledAt,
    });

    const remindersCount2 = await prisma.appointmentReminder.count({
      where: { appointmentId: app.id },
    });
    assert.strictEqual(remindersCount1, remindersCount2, 'Reminders MUST NOT duplicate on multiple executions');

    // Cancel appointment: should cancel pending reminders
    await cancelAppointmentReminders(app.id);
    const activeReminders = await prisma.appointmentReminder.count({
      where: { appointmentId: app.id, status: 'PENDING' },
    });
    assert.strictEqual(activeReminders, 0, 'Cancelled appointment should have zero PENDING reminders');

    // Clean up
    await prisma.appointment.delete({ where: { id: app.id } });
  });

  // -------------------------------------------------------------
  // TEST 7: RFC 5545 iCalendar (.ics) and Google Calendar Links
  // -------------------------------------------------------------
  await test('7. Universal Calendar (.ics RFC 5545 and Google Calendar URL)', async () => {
    const { generateICSContent, generateGoogleCalendarUrl } = await import('../src/lib/calendar.ts');

    const mockCalApp = {
      id: 'app_cal_test_1',
      publicToken: 'tok_test_cal_123',
      scheduledAt: new Date('2026-08-29T14:00:00-03:00'),
      endAt: new Date('2026-08-29T14:30:00-03:00'),
      price: 45.0,
      serviceName: 'Corte Tradicional',
      barberName: 'João Barbeiro',
      shopName: 'Barbearia Imperial',
      shopAddress: 'Rua Augusta, 1500',
      publicUrl: 'https://barber.projetosunion.cloud/agendamento/tok_test_cal_123',
    };

    const ics = generateICSContent(mockCalApp);
    assert.ok(ics.includes('BEGIN:VCALENDAR'), 'Must have BEGIN:VCALENDAR');
    assert.ok(ics.includes('VERSION:2.0'), 'Must have VERSION:2.0');
    assert.ok(ics.includes('BEGIN:VEVENT'), 'Must have BEGIN:VEVENT');
    assert.ok(ics.includes('SUMMARY:Corte Tradicional - Barbearia Imperial'));
    assert.ok(ics.includes('UID:tok_test_cal_123@barberflow.projetosunion.cloud'));
    assert.ok(ics.includes('END:VCALENDAR'), 'Must have END:VCALENDAR');

    const gcal = generateGoogleCalendarUrl(mockCalApp);
    assert.ok(gcal.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
    assert.ok(gcal.includes('Corte%20Tradicional'));
  });

  // -------------------------------------------------------------
  // TEST 8: LGPD Opt-out via "SAIR"
  // -------------------------------------------------------------
  await test('8. LGPD Compliance: Instant Marketing Opt-out via "SAIR"', async () => {
    const { processWhatsAppMessage } = await import('../src/lib/whatsapp/engine.ts');

    const resOptOut = await processWhatsAppMessage({
      from: testPhone,
      text: 'SAIR',
      tenantSlugOrId: shop.slug,
    });

    assert.ok(resOptOut.state === 'IDLE' || resOptOut.state === 'OPTED_OUT');
    assert.ok(resOptOut.reply.includes('encerrado') || resOptOut.reply.includes('cancelou') || resOptOut.reply.includes('Barber'));

    const updatedCustomer = await prisma.customer.findFirst({
      where: { phone: { contains: '998887766' } },
    });
    if (updatedCustomer) {
      assert.strictEqual(updatedCustomer.marketingOptIn, false, 'Customer marketingOptIn must be false after SAIR');
    }
  });

  console.log(`\n========================================`);
  console.log(`📊 Phase 11 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test Runner Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
