import { prisma } from './prisma';

/**
 * Creates an AuditLog entry for a tenant action.
 */
export async function logAuditEvent({
  tenantId,
  userId,
  action,
  entity,
  entityId,
  metadata,
}: {
  tenantId: string;
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW' | 'LGPD_ANONYMIZE' | string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error('AuditLog error:', err);
  }
}

/**
 * Validates that an entity belongs to the tenant.
 */
export async function validateTenantOwnership(
  entity: 'customer' | 'barber' | 'service' | 'appointment',
  id: string,
  tenantId: string
): Promise<boolean> {
  let record = null;
  switch (entity) {
    case 'customer':
      record = await prisma.customer.findFirst({ where: { id, barbershopId: tenantId } });
      break;
    case 'barber':
      record = await prisma.barber.findFirst({ where: { id, barbershopId: tenantId } });
      break;
    case 'service':
      record = await prisma.service.findFirst({ where: { id, barbershopId: tenantId } });
      break;
    case 'appointment':
      record = await prisma.appointment.findFirst({ where: { id, barbershopId: tenantId } });
      break;
  }
  return !!record;
}
