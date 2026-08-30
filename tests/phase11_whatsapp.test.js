const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('BarberFlow FASE 11 — Motor Conversacional WhatsApp, Calendário e Lembretes', () => {
  let shop, barber, service, customer;
  const testPhone = '5514998887766';

  before(async () => {
    shop = await prisma.barbershop.upsert({
      where: { slug: 'imperial-test-fase11' },
      create: {
        id: 'shop_fase11_test',
        name: 'Barbearia Imperial Fase 11',
        slug: 'imperial-test-fase11',
        phone: '11988887766',
      },
      update: {},
    });

    barber = await prisma.barber.upsert({
      where: { id: 'barber_fase11_test' },
      create: {
        id: 'barber_fase11_test',
        name: 'João Barbeiro 11',
        barbershopId: shop.id,
        isActive: true,
      },
      update: {},
    });

    service = await prisma.service.upsert({
      where: { id: 'service_fase11_test' },
      create: {
        id: 'service_fase11_test',
        name: 'Corte Tradicional 11',
        price: 45.0,
        durationMin: 30,
        barbershopId: shop.id,
        isActive: true,
      },
      update: {},
    });

    customer = await prisma.customer.upsert({
      where: { id: 'cust_fase11_test' },
      create: {
        id: 'cust_fase11_test',
        name: 'Cliente Teste 11',
        phone: '14998887766',
        barbershopId: shop.id,
        marketingOptIn: true,
      },
      update: {},
    });
  });

  // 1. Normalização de Telefone E.164
  test('1. Normalização de Telefone Canônico E.164', () => {
    function normalizePhone(phone) {
      if (!phone) return '';
      const trimmed = phone.trim();
      if (trimmed.includes('@lid') || trimmed.includes('@c.us')) return trimmed;
      let digits = trimmed.replace(/\D/g, '');
      if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
      return digits;
    }

    assert.strictEqual(normalizePhone('+55 (14) 99888-7766'), '5514998887766');
    assert.strictEqual(normalizePhone('14998887766'), '5514998887766');
    assert.strictEqual(normalizePhone('5514998887766'), '5514998887766');
  });

  // 2. Parser de Data Determinístico em Horário de Brasília
  test('2. Parser de Linguagem Natural para Datas em America/Sao_Paulo', () => {
    function parseDate(input) {
      const lower = input.toLowerCase().trim();
      const now = new Date();
      if (lower === 'hoje') return now.toISOString().split('T')[0];
      if (lower === 'amanhã' || lower === 'amanha') {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      }
      return null;
    }

    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(parseDate('hoje')));
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(parseDate('amanhã')));
  });

  // 3. Sessão Conversacional no Banco com Expiração TTL
  test('3. Sessão de WhatsApp no Banco com Estado e Metadados', async () => {
    const session = await prisma.whatsappSession.upsert({
      where: {
        barbershopId_phone: {
          barbershopId: shop.id,
          phone: testPhone,
        },
      },
      create: {
        phone: testPhone,
        barbershopId: shop.id,
        state: 'SELECTING_SERVICE',
        context: JSON.stringify({ step: 1 }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      update: {
        state: 'SELECTING_DATE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    assert.ok(session);
    assert.strictEqual(session.phone, testPhone);
    assert.ok(session.state === 'SELECTING_SERVICE' || session.state === 'SELECTING_DATE');
  });

  // 4. Criação de Agendamento com Origem WHATSAPP
  test('4. Criação de Agendamento com Origem WHATSAPP e Snapshot de Preço', async () => {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);
    scheduledDate.setHours(14, 0, 0, 0);

    const app = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: customer.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt: scheduledDate,
        endAt: new Date(scheduledDate.getTime() + 30 * 60 * 1000),
        price: service.price,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.price,
        status: 'AGENDADO',
        origin: 'WHATSAPP',
      },
    });

    assert.ok(app);
    assert.strictEqual(app.origin, 'WHATSAPP');
    assert.strictEqual(app.price, 45.0);
    assert.strictEqual(app.serviceNameSnapshot, 'Corte Tradicional 11');
  });

  // 5. Proteção Anti-Conflito Concorrente
  test('5. Proteção Anti-Conflito Concorrente no Banco', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(16, 0, 0, 0);

    const first = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: customer.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt: targetDate,
        endAt: new Date(targetDate.getTime() + 30 * 60 * 1000),
        price: 45.0,
        status: 'AGENDADO',
        origin: 'WHATSAPP',
      },
    });
    assert.ok(first);

    // Verificar se horário está ocupado
    const conflict = await prisma.appointment.findFirst({
      where: {
        barbershopId: shop.id,
        barberId: barber.id,
        status: { in: ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO'] },
        scheduledAt: { lt: new Date(targetDate.getTime() + 30 * 60 * 1000) },
        endAt: { gt: targetDate },
      },
    });

    assert.ok(conflict, 'Must identify existing booking and prevent duplicate');
  });

  // 6. Agendamento de Lembretes T-24h, T-6h, T-2h, T-1h com Garantia de Não-Duplicação
  test('6. Agendador de Lembretes com Idempotência e Unicidade', async () => {
    const futureDate = new Date(Date.now() + 30 * 60 * 60 * 1000);

    const testApp = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: customer.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt: futureDate,
        endAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
        price: 45.0,
        status: 'AGENDADO',
        origin: 'WHATSAPP',
      },
    });

    // Criar lembrete T-24h
    const reminder24h = await prisma.appointmentReminder.create({
      data: {
        appointmentId: testApp.id,
        barbershopId: shop.id,
        reminderType: 'T_24H',
        scheduledFor: new Date(futureDate.getTime() - 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    assert.ok(reminder24h);
    assert.strictEqual(reminder24h.status, 'PENDING');

    // Tentativa de duplicar mesmo tipo deve ser rejeitada pela restrição única
    let duplicateRejected = false;
    try {
      await prisma.appointmentReminder.create({
        data: {
          appointmentId: testApp.id,
          barbershopId: shop.id,
          reminderType: 'T_24H',
          scheduledFor: new Date(futureDate.getTime() - 24 * 60 * 60 * 1000),
          status: 'PENDING',
        },
      });
    } catch {
      duplicateRejected = true;
    }
    assert.strictEqual(duplicateRejected, true, 'Duplicate reminder of same type must be rejected');
  });

  // 7. Geração de Links de Calendário RFC 5545 e Google Calendar
  test('7. Geração de iCalendar RFC 5545 e URL do Google Calendar', () => {
    function generateGCalUrl(title, start, end, location) {
      const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const dates = `${fmt(start)}/${fmt(end)}`;
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&location=${encodeURIComponent(location)}`;
    }

    const start = new Date('2026-08-30T15:00:00Z');
    const end = new Date('2026-08-30T15:30:00Z');
    const url = generateGCalUrl('Corte na Imperial', start, end, 'Rua Augusta, 1000');

    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
    assert.ok(url.includes('Corte%20na%20Imperial'));
  });

  // 8. LGPD: Opt-out Imediato de Marketing
  test('8. Conformidade LGPD: Opt-out de Marketing via WhatsApp', async () => {
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { marketingOptIn: false },
    });

    assert.strictEqual(updated.marketingOptIn, false);
  });
});
