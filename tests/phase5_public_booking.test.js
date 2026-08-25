const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

describe('BarberFlow FASE 5 — Testes do Agendamento Público e Autoatendimento', () => {
  let shop;
  let barber;
  let service;

  before(async () => {
    shop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Imperial Pública',
        slug: `barbearia-publica-${Date.now()}`,
      },
    });

    barber = await prisma.barber.create({
      data: {
        barbershopId: shop.id,
        name: 'Barbeiro Público',
        isActive: true,
      },
    });

    service = await prisma.service.create({
      data: {
        barbershopId: shop.id,
        name: 'Corte Tradicional',
        price: 45.0,
        durationMin: 30,
        isActive: true,
      },
    });

    // Business Hours Monday - Saturday
    for (let day = 1; day <= 6; day++) {
      await prisma.businessHours.create({
        data: {
          barbershopId: shop.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '19:00',
          isOpen: true,
        },
      });
    }
  });

  after(async () => {
    if (shop) {
      await prisma.appointment.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.customerVisitStats.deleteMany({
        where: { customer: { barbershopId: shop.id } },
      });
      await prisma.customer.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.businessHours.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.service.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.barbershop.delete({ where: { id: shop.id } });
    }
    await prisma.$disconnect();
  });

  test('Agendamento Público: Cliente criado automaticamente pelo telefone sem login', async () => {
    const customerPhone = '11988889999';
    const customerName = 'Cliente Autoatendimento';

    const customer = await prisma.customer.create({
      data: {
        barbershopId: shop.id,
        name: customerName,
        phone: customerPhone,
        status: 'NOVO',
      },
    });

    assert.ok(customer.id);
    assert.strictEqual(customer.name, customerName);
    assert.strictEqual(customer.barbershopId, shop.id);
  });

  test('Agendamento Público: Criação com token público único e snapshot de preços', async () => {
    const customer = await prisma.customer.findFirst({ where: { barbershopId: shop.id } });
    const scheduledAt = new Date('2026-09-01T10:00:00.000Z');
    const endAt = new Date('2026-09-01T10:30:00.000Z');

    const appointment = await prisma.appointment.create({
      data: {
        barbershopId: shop.id,
        customerId: customer.id,
        barberId: barber.id,
        serviceId: service.id,
        scheduledAt,
        endAt,
        durationMinutes: 30,
        price: service.price,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.price,
        status: 'AGENDADO',
      },
    });

    assert.ok(appointment.id);
    assert.ok(appointment.publicToken, 'Deve gerar publicToken único para acesso do cliente');
    assert.strictEqual(appointment.servicePriceSnapshot, 45.0);
  });

  test('Autoatendimento: Cancelamento seguro pelo cliente via publicToken', async () => {
    const app = await prisma.appointment.findFirst({ where: { barbershopId: shop.id } });
    assert.ok(app);

    const updated = await prisma.appointment.update({
      where: { publicToken: app.publicToken },
      data: {
        status: 'CANCELADO',
        cancelReason: 'Imprevisto pessoal informado pelo cliente',
        cancelledAt: new Date(),
      },
    });

    assert.strictEqual(updated.status, 'CANCELADO');
    assert.ok(updated.cancelledAt);
  });
});
