const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateMedian(numbers) {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

async function calculateCustomerRecurrenceTest(customerId, barbershopId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      appointments: {
        where: { status: 'CONCLUIDO', barbershopId },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  const visits = customer.appointments;
  const totalVisits = visits.length;
  const totalSpent = visits.reduce((acc, a) => acc + (a.price || 0), 0);
  const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

  const now = new Date();
  let lastVisitDate = null;
  let estimatedNextVisit = null;
  let avgDaysBetweenVisits = 0;
  let medianDaysBetween = 0;
  let daysSinceLastVisit = 0;

  if (totalVisits > 0) {
    const lastAppointment = visits[visits.length - 1];
    lastVisitDate = lastAppointment.scheduledAt;
    const diffTime = Math.abs(now.getTime() - lastVisitDate.getTime());
    daysSinceLastVisit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  if (totalVisits >= 2) {
    const intervals = [];
    for (let i = 1; i < visits.length; i++) {
      const prevDate = visits[i - 1].scheduledAt.getTime();
      const currDate = visits[i].scheduledAt.getTime();
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) intervals.push(diffDays);
    }

    if (intervals.length > 0) {
      avgDaysBetweenVisits = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      medianDaysBetween = Math.round(calculateMedian(intervals));
    }
  } else if (totalVisits === 1) {
    avgDaysBetweenVisits = 30;
    medianDaysBetween = 30;
  }

  const cycleDays = medianDaysBetween || avgDaysBetweenVisits || 30;
  if (lastVisitDate) {
    estimatedNextVisit = new Date(lastVisitDate);
    estimatedNextVisit.setDate(estimatedNextVisit.getDate() + cycleDays);
  }

  let status = 'NOVO';
  let recurrenceRate = 'MEDIA';

  if (totalVisits === 0) {
    status = 'NOVO';
    recurrenceRate = 'BAIXA';
  } else if (totalVisits === 1) {
    if (daysSinceLastVisit > 60) status = 'INATIVO';
    else if (daysSinceLastVisit > 35) status = 'EM_RISCO';
    else status = 'NOVO';
  } else {
    const toleranceRisk = cycleDays * 1.25;
    const toleranceInactive = cycleDays * 2.0;

    if (daysSinceLastVisit > toleranceInactive) status = 'INATIVO';
    else if (daysSinceLastVisit > toleranceRisk) status = 'EM_RISCO';
    else if (totalVisits >= 5 && avgTicket >= 45) status = 'VIP';
    else status = 'ATIVO';

    if (cycleDays <= 21) recurrenceRate = 'ALTA';
    else if (cycleDays <= 35) recurrenceRate = 'MEDIA';
    else recurrenceRate = 'BAIXA';
  }

  const revenueOpportunity =
    status === 'EM_RISCO' || status === 'INATIVO' ? (avgTicket > 0 ? avgTicket : 45) : 0;

  const daysOverdue = Math.max(0, daysSinceLastVisit - cycleDays);

  await prisma.customerVisitStats.upsert({
    where: { customerId },
    update: {
      totalVisits,
      totalSpent,
      avgTicket,
      avgDaysBetweenVisits,
      medianDaysBetween,
      lastVisitDate,
      estimatedNextVisit,
      daysSinceLastVisit,
    },
    create: {
      customerId,
      totalVisits,
      totalSpent,
      avgTicket,
      avgDaysBetweenVisits,
      medianDaysBetween,
      lastVisitDate,
      estimatedNextVisit,
      daysSinceLastVisit,
    },
  });

  await prisma.customer.update({
    where: { id: customerId },
    data: { status, recurrenceRate },
  });

  return {
    customerId,
    totalVisits,
    totalSpent,
    avgTicket,
    avgDaysBetweenVisits,
    medianDaysBetween,
    lastVisitDate,
    estimatedNextVisit,
    daysSinceLastVisit,
    daysOverdue,
    status,
    recurrenceRate,
    revenueOpportunity,
  };
}

async function getRecurrenceDashboardMetricsTest(barbershopId) {
  const customers = await prisma.customer.findMany({
    where: { barbershopId, deletedAt: null },
    include: { stats: true },
  });

  let totalOpportunity = 0;
  let countAtRisk = 0;
  let countInactive = 0;
  let countDueForReturn = 0;
  let countActive = 0;
  let countVip = 0;
  let countNovo = 0;

  for (const c of customers) {
    const stats = c.stats;
    const avgTicket = stats?.avgTicket || 45;
    const daysSince = stats?.daysSinceLastVisit || 0;
    const cycle = stats?.medianDaysBetween || stats?.avgDaysBetweenVisits || 30;

    if (c.status === 'EM_RISCO') {
      countAtRisk++;
      totalOpportunity += avgTicket;
    } else if (c.status === 'INATIVO') {
      countInactive++;
      totalOpportunity += avgTicket;
    } else if (c.status === 'VIP') {
      countVip++;
    } else if (c.status === 'ATIVO') {
      countActive++;
    } else if (c.status === 'NOVO') {
      countNovo++;
    }

    if (daysSince >= cycle - 4 && daysSince <= cycle + 4 && stats && stats.totalVisits >= 1) {
      countDueForReturn++;
    }
  }

  const retentionRate =
    customers.length > 0
      ? Math.round(((countActive + countVip) / customers.length) * 100)
      : 0;

  return {
    totalOpportunity,
    countAtRisk,
    countInactive,
    countDueForReturn,
    countActive,
    countVip,
    countNovo,
    totalCustomers: customers.length,
    retentionRate,
  };
}

describe('BarberFlow FASE 3 — Testes Automatizados do Motor de Recorrência', () => {
  let shopA, shopB;
  let barberA;
  let serviceA;
  let customerNovo, customerAtivo, customerRisco, customerInativo, customerVip;

  before(async () => {
    // 1. Create Test Tenants
    shopA = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Recorrência A',
        slug: `barbearia-rec-a-${Date.now()}`,
      },
    });

    shopB = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Recorrência B',
        slug: `barbearia-rec-b-${Date.now()}`,
      },
    });

    // 2. Barber & Service
    barberA = await prisma.barber.create({
      data: {
        barbershopId: shopA.id,
        name: 'Barbeiro Teste',
        isActive: true,
      },
    });

    serviceA = await prisma.service.create({
      data: {
        barbershopId: shopA.id,
        name: 'Corte',
        price: 50.0,
        durationMin: 30,
      },
    });

    const now = new Date();
    const subDays = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 3. Customer 1: NOVO (1 visit 5 days ago)
    customerNovo = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Novo Teste',
        phone: '11999991111',
      },
    });
    await prisma.appointment.create({
      data: {
        barbershopId: shopA.id,
        customerId: customerNovo.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: subDays(5),
        endAt: subDays(5),
        status: 'CONCLUIDO',
        price: 50.0,
      },
    });

    // 4. Customer 2: ATIVO (Visits: 60 days ago, 35 days ago, 10 days ago -> cycle 25 days, last visit 10 days ago)
    customerAtivo = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Ativo Teste',
        phone: '11999992222',
      },
    });
    for (const d of [60, 35, 10]) {
      await prisma.appointment.create({
        data: {
          barbershopId: shopA.id,
          customerId: customerAtivo.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: subDays(d),
          endAt: subDays(d),
          status: 'CONCLUIDO',
          price: 50.0,
        },
      });
    }

    // 5. Customer 3: EM_RISCO (Visits: 85, 60, 35 days ago -> cycle 25 days, last visit 35 days ago > 25*1.25)
    customerRisco = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Risco Teste',
        phone: '11999993333',
      },
    });
    for (const d of [85, 60, 35]) {
      await prisma.appointment.create({
        data: {
          barbershopId: shopA.id,
          customerId: customerRisco.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: subDays(d),
          endAt: subDays(d),
          status: 'CONCLUIDO',
          price: 60.0,
        },
      });
    }

    // 6. Customer 4: INATIVO (Visits: 140, 110, 80 days ago -> cycle 30 days, last visit 80 days ago > 30*2.0)
    customerInativo = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Inativo Teste',
        phone: '11999994444',
      },
    });
    for (const d of [140, 110, 80]) {
      await prisma.appointment.create({
        data: {
          barbershopId: shopA.id,
          customerId: customerInativo.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: subDays(d),
          endAt: subDays(d),
          status: 'CONCLUIDO',
          price: 70.0,
        },
      });
    }

    // 7. Customer 5: VIP (6 visits every 20 days, last visit 5 days ago)
    customerVip = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente VIP Teste',
        phone: '11999995555',
      },
    });
    for (const d of [105, 85, 65, 45, 25, 5]) {
      await prisma.appointment.create({
        data: {
          barbershopId: shopA.id,
          customerId: customerVip.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: subDays(d),
          endAt: subDays(d),
          status: 'CONCLUIDO',
          price: 80.0,
        },
      });
    }
  });

  after(async () => {
    if (shopA) {
      await prisma.customerVisitStats.deleteMany({
        where: { customer: { barbershopId: shopA.id } },
      });
      await prisma.appointment.deleteMany({ where: { barbershopId: shopA.id } });
      await prisma.customer.deleteMany({ where: { barbershopId: shopA.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: shopA.id } });
      await prisma.service.deleteMany({ where: { barbershopId: shopA.id } });
      await prisma.barbershop.delete({ where: { id: shopA.id } });
    }
    if (shopB) {
      await prisma.barbershop.delete({ where: { id: shopB.id } });
    }
    await prisma.$disconnect();
  });

  test('Matemática: Cálculo correto da mediana de intervalos', () => {
    assert.strictEqual(calculateMedian([28]), 28);
    assert.strictEqual(calculateMedian([20, 28, 30]), 28);
    assert.strictEqual(calculateMedian([10, 20, 30, 40]), 25);
    assert.strictEqual(calculateMedian([]), 0);
  });

  test('Recorrência: Cliente recente com 1 atendimento deve ser NOVO', async () => {
    const res = await calculateCustomerRecurrenceTest(customerNovo.id, shopA.id);
    assert.strictEqual(res.status, 'NOVO');
    assert.strictEqual(res.totalVisits, 1);
    assert.strictEqual(res.revenueOpportunity, 0);
  });

  test('Recorrência: Cliente dentro do ciclo normal deve ser classificado como ATIVO', async () => {
    const res = await calculateCustomerRecurrenceTest(customerAtivo.id, shopA.id);
    assert.strictEqual(res.status, 'ATIVO');
    assert.strictEqual(res.totalVisits, 3);
    assert.strictEqual(res.medianDaysBetween, 25);
    assert.strictEqual(res.daysSinceLastVisit, 10);
    assert.strictEqual(res.revenueOpportunity, 0);
  });

  test('Recorrência: Cliente que ultrapassou tolerância deve ser EM_RISCO com Revenue Opportunity calculado', async () => {
    const res = await calculateCustomerRecurrenceTest(customerRisco.id, shopA.id);
    assert.strictEqual(res.status, 'EM_RISCO');
    assert.strictEqual(res.daysSinceLastVisit, 35);
    assert.strictEqual(res.medianDaysBetween, 25);
    assert.ok(res.daysOverdue > 0);
    assert.strictEqual(res.revenueOpportunity, 60.0);
  });

  test('Recorrência: Cliente com ausência superior a 2x o ciclo deve ser INATIVO', async () => {
    const res = await calculateCustomerRecurrenceTest(customerInativo.id, shopA.id);
    assert.strictEqual(res.status, 'INATIVO');
    assert.strictEqual(res.daysSinceLastVisit, 80);
    assert.strictEqual(res.revenueOpportunity, 70.0);
  });

  test('Recorrência: Cliente com alta frequência (5+ visitas) e ticket alto deve ser VIP', async () => {
    const res = await calculateCustomerRecurrenceTest(customerVip.id, shopA.id);
    assert.strictEqual(res.status, 'VIP');
    assert.strictEqual(res.totalVisits, 6);
    assert.strictEqual(res.recurrenceRate, 'ALTA');
  });

  test('Dashboard de Recorrência: Agregação correta de oportunidades e contagens', async () => {
    const metrics = await getRecurrenceDashboardMetricsTest(shopA.id);

    assert.strictEqual(metrics.countAtRisk, 1);
    assert.strictEqual(metrics.countInactive, 1);
    assert.strictEqual(metrics.countActive, 1);
    assert.strictEqual(metrics.countVip, 1);
    assert.strictEqual(metrics.countNovo, 1);
    assert.strictEqual(metrics.totalOpportunity, 130.0);
  });

  test('Multitenancy: Métricas do Tenant B devem ser zero e isoladas do Tenant A', async () => {
    const metricsB = await getRecurrenceDashboardMetricsTest(shopB.id);
    assert.strictEqual(metricsB.totalCustomers, 0);
    assert.strictEqual(metricsB.totalOpportunity, 0);
  });
});
