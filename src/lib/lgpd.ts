import { prisma } from './prisma';
import { logAuditEvent } from './tenant';

/**
 * Exports all customer personal and transactional data in compliance with LGPD
 */
export async function exportCustomerLGPD(customerId: string, barbershopId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, barbershopId },
    include: {
      stats: true,
      appointments: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          price: true,
          serviceNameSnapshot: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  return {
    exportedAt: new Date().toISOString(),
    personalData: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate,
      marketingOptIn: customer.marketingOptIn,
      privacyConsentAt: customer.privacyConsentAt,
    },
    activityData: {
      totalVisits: customer.stats?.totalVisits || 0,
      totalSpent: customer.stats?.totalSpent || 0,
      avgTicket: customer.stats?.avgTicket || 0,
      appointments: customer.appointments,
      payments: customer.payments,
    },
  };
}

/**
 * Anonymizes customer data (Right to be Forgotten) preserving financial metrics integrity
 */
export async function anonymizeCustomerLGPD(
  customerId: string,
  barbershopId: string,
  operatorUserId?: string
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, barbershopId },
  });

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  const anonymized = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: `Cliente Anonimizado #${customerId.slice(-4)}`,
      phone: `00000000000`,
      email: null,
      notes: null,
      birthDate: null,
      marketingOptIn: false,
      deletedAt: new Date(),
    },
  });

  await logAuditEvent({
    tenantId: barbershopId,
    userId: operatorUserId,
    action: 'LGPD_ANONYMIZE',
    entity: 'Customer',
    entityId: customerId,
  });

  return anonymized;
}
