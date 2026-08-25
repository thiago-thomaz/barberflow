const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('BarberFlow FASE 4 — Testes do Dashboard e Módulo Financeiro', () => {
  let shop;
  let barber;
  let service;
  let customer;

  before(async () => {
    shop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Dashboard Test',
        slug: `barbearia-dash-${Date.now()}`,
      },
    });

    barber = await prisma.barber.create({
      data: {
        barbershopId: shop.id,
        name: 'Barbeiro Master',
        commission: 60, // 60%
        isActive: true,
      },
    });

    service = await prisma.service.create({
      data: {
        barbershopId: shop.id,
        name: 'Corte + Barba Premium',
        price: 80.0,
        durationMin: 45,
      },
    });

    customer = await prisma.customer.create({
      data: {
        barbershopId: shop.id,
        name: 'Cliente Financeiro',
        phone: '11999887766',
      },
    });

    // Create 3 completed appointments with payments
    for (let i = 0; i < 3; i++) {
      const app = await prisma.appointment.create({
        data: {
          barbershopId: shop.id,
          customerId: customer.id,
          barberId: barber.id,
          serviceId: service.id,
          scheduledAt: new Date(),
          endAt: new Date(),
          status: 'CONCLUIDO',
          price: 80.0,
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: 80.0,
        },
      });

      await prisma.payment.create({
        data: {
          barbershopId: shop.id,
          appointmentId: app.id,
          customerId: customer.id,
          barberId: barber.id,
          amount: 80.0,
          method: i === 0 ? 'PIX' : i === 1 ? 'CARTAO_CREDITO' : 'DINHEIRO',
          status: 'PAGO',
        },
      });
    }
  });

  after(async () => {
    if (shop) {
      await prisma.payment.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.appointment.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.customer.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.service.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.barbershop.delete({ where: { id: shop.id } });
    }
    await prisma.$disconnect();
  });

  test('Financeiro: Faturamento total e ticket médio calculados com precisão', async () => {
    const payments = await prisma.payment.findMany({
      where: { barbershopId: shop.id, status: 'PAGO' },
    });

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const avgTicket = totalRevenue / payments.length;

    assert.strictEqual(payments.length, 3);
    assert.strictEqual(totalRevenue, 240.0);
    assert.strictEqual(avgTicket, 80.0);
  });

  test('Financeiro: Divisão de comissão entre Barbeiro e Líquido da Barbearia', async () => {
    const payments = await prisma.payment.findMany({
      where: { barbershopId: shop.id, status: 'PAGO' },
    });

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const barberPayout = (totalRevenue * barber.commission) / 100;
    const shopNet = totalRevenue - barberPayout;

    assert.strictEqual(barberPayout, 144.0, '60% de 240 deve ser 144.0');
    assert.strictEqual(shopNet, 96.0, '40% líquido da barbearia deve ser 96.0');
  });

  test('Financeiro: Distribuição por métodos de pagamento', async () => {
    const pixPayments = await prisma.payment.count({
      where: { barbershopId: shop.id, method: 'PIX' },
    });
    const cardPayments = await prisma.payment.count({
      where: { barbershopId: shop.id, method: 'CARTAO_CREDITO' },
    });

    assert.strictEqual(pixPayments, 1);
    assert.strictEqual(cardPayments, 1);
  });
});
