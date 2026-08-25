import { prisma } from './prisma';
import { publishEvent } from './events';

export interface RecurrenceResult {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  totalVisits: number;
  totalSpent: number;
  avgTicket: number;
  avgDaysBetweenVisits: number;
  medianDaysBetween: number;
  lastVisitDate: Date | null;
  estimatedNextVisit: Date | null;
  daysSinceLastVisit: number;
  daysOverdue: number;
  status: 'NOVO' | 'ATIVO' | 'EM_RISCO' | 'INATIVO' | 'VIP';
  recurrenceRate: 'ALTA' | 'MEDIA' | 'BAIXA';
  revenueOpportunity: number; // Potential recovery revenue
  suggestedMessage?: string;
}

/**
 * Calculates mathematical median of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

/**
 * Recalculates recurrence metrics for a specific customer based on their completed appointments
 */
export async function calculateCustomerRecurrence(
  customerId: string,
  barbershopId: string
): Promise<RecurrenceResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      appointments: {
        where: {
          status: 'CONCLUIDO',
          barbershopId,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      },
    },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  const visits = customer.appointments;
  const totalVisits = visits.length;
  const totalSpent = visits.reduce((acc, a) => acc + (a.price || 0), 0);
  const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

  const now = new Date();
  let lastVisitDate: Date | null = null;
  let estimatedNextVisit: Date | null = null;
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
    const intervals: number[] = [];
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

  // Estimate next visit based on individual median cycle
  const cycleDays = medianDaysBetween || avgDaysBetweenVisits || 30;
  if (lastVisitDate) {
    estimatedNextVisit = new Date(lastVisitDate);
    estimatedNextVisit.setDate(estimatedNextVisit.getDate() + cycleDays);
  }

  // Determine Customer Status: NOVO, ATIVO, EM_RISCO, INATIVO, VIP
  let status: 'NOVO' | 'ATIVO' | 'EM_RISCO' | 'INATIVO' | 'VIP' = 'NOVO';
  let recurrenceRate: 'ALTA' | 'MEDIA' | 'BAIXA' = 'MEDIA';

  if (totalVisits === 0) {
    status = 'NOVO';
    recurrenceRate = 'BAIXA';
  } else if (totalVisits === 1) {
    if (daysSinceLastVisit > 60) {
      status = 'INATIVO';
    } else if (daysSinceLastVisit > 35) {
      status = 'EM_RISCO';
    } else {
      status = 'NOVO';
    }
  } else {
    // Customer with 2+ visits
    const toleranceRisk = cycleDays * 1.25; // 25% beyond normal cycle
    const toleranceInactive = cycleDays * 2.0; // 2x normal cycle

    if (daysSinceLastVisit > toleranceInactive) {
      status = 'INATIVO';
    } else if (daysSinceLastVisit > toleranceRisk) {
      status = 'EM_RISCO';
    } else if (totalVisits >= 5 && avgTicket >= 45) {
      status = 'VIP';
    } else {
      status = 'ATIVO';
    }

    if (cycleDays <= 21) {
      recurrenceRate = 'ALTA';
    } else if (cycleDays <= 35) {
      recurrenceRate = 'MEDIA';
    } else {
      recurrenceRate = 'BAIXA';
    }
  }

  const previousStatus = customer.status;

  // Persist updated stats in database
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
    data: {
      status,
      recurrenceRate,
    },
  });

  // Trigger automated events when status changes
  if (previousStatus !== status) {
    if (status === 'EM_RISCO') {
      await publishEvent(
        'CUSTOMER_AT_RISK',
        barbershopId,
        {
          customerName: customer.name,
          customerPhone: customer.phone,
          daysSinceLastVisit,
          cycleDays,
          avgTicket,
        },
        { customerId }
      );
    } else if (status === 'INATIVO') {
      await publishEvent(
        'CUSTOMER_INACTIVE',
        barbershopId,
        {
          customerName: customer.name,
          customerPhone: customer.phone,
          daysSinceLastVisit,
          cycleDays,
          avgTicket,
        },
        { customerId }
      );
    }
  }

  // Days overdue beyond standard expected cycle
  const daysOverdue = Math.max(0, daysSinceLastVisit - cycleDays);

  // Revenue opportunity calculation: estimated loss if at risk or inactive
  const revenueOpportunity =
    status === 'EM_RISCO' || status === 'INATIVO' ? (avgTicket > 0 ? avgTicket : 45) : 0;

  // Suggested personalized WhatsApp message
  let suggestedMessage = '';
  if (status === 'EM_RISCO') {
    suggestedMessage = `Fala, ${customer.name.split(' ')[0]}! Tudo certo? Notamos que já faz ${daysSinceLastVisit} dias desde o seu último corte aqui na barbearia. Que tal dar aquele trato no visual essa semana? Temos horários disponíveis!`;
  } else if (status === 'INATIVO') {
    suggestedMessage = `Olá, ${customer.name.split(' ')[0]}! Faz um tempinho que você não passa por aqui na barbearia. Preparamos uma condição especial para o seu retorno. Quer agendar seu horário?`;
  } else {
    suggestedMessage = `Olá, ${customer.name.split(' ')[0]}! Seu horário habitual de corte está chegando. Já quer garantir seu horário para não ficar sem vaga?`;
  }

  return {
    customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
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
    suggestedMessage,
  };
}

/**
 * Runs recurrence engine for all customers in a barbershop
 */
export async function recalculateAllShopRecurrence(barbershopId: string) {
  const customers = await prisma.customer.findMany({
    where: { barbershopId, deletedAt: null },
    select: { id: true },
  });

  const results: RecurrenceResult[] = [];
  for (const c of customers) {
    const res = await calculateCustomerRecurrence(c.id, barbershopId);
    results.push(res);
  }
  return results;
}

/**
 * Aggregate summary metrics of recurrence for the barbershop
 */
export async function getRecurrenceDashboardMetrics(barbershopId: string) {
  // Ensure stats are fresh
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
  let totalTicketSum = 0;
  let totalClientsWithVisits = 0;

  const now = new Date();

  for (const c of customers) {
    const stats = c.stats;
    const avgTicket = stats?.avgTicket || 45;
    const daysSince = stats?.daysSinceLastVisit || 0;
    const cycle = stats?.medianDaysBetween || stats?.avgDaysBetweenVisits || 30;

    if (stats && stats.totalVisits > 0) {
      totalTicketSum += avgTicket;
      totalClientsWithVisits++;
    }

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

    // Due for return in window: [cycle - 4, cycle + 4]
    if (daysSince >= cycle - 4 && daysSince <= cycle + 4 && stats && stats.totalVisits >= 1) {
      countDueForReturn++;
    }
  }

  const avgTicketShop = totalClientsWithVisits > 0 ? totalTicketSum / totalClientsWithVisits : 45;
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
    avgTicketShop,
    retentionRate,
  };
}
