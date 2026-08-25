import { prisma } from './prisma';
import { publishEvent } from './events';

export interface DispatchNotificationParams {
  barbershopId: string;
  customerId?: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  type:
    | 'APPOINTMENT_CREATED'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_REMINDER'
    | 'CUSTOMER_AT_RISK'
    | 'CUSTOMER_INACTIVE'
    | 'CUSTOMER_DUE_FOR_RETURN';
  recipient: string; // Phone or Email
  message: string;
  provider?: string;
  metadata?: Record<string, any>;
}

/**
 * Dispatches a notification and logs its execution in the Notification history table
 */
export async function sendNotification(params: DispatchNotificationParams) {
  const {
    barbershopId,
    customerId,
    channel,
    type,
    recipient,
    message,
    provider = 'N8N_WEBHOOK',
    metadata,
  } = params;

  let status = 'SENT';
  let errorMsg: string | null = null;
  let externalId: string | null = null;

  try {
    // If WhatsApp or n8n webhook provider, publish event to webhook bus
    await publishEvent(
      type as any,
      barbershopId,
      {
        recipient,
        message,
        channel,
        ...metadata,
      },
      { customerId }
    );

    status = 'SENT';
  } catch (err: any) {
    status = 'FAILED';
    errorMsg = err.message || 'Falha ao despachar notificação';
  }

  // Record in Notification history table
  const record = await prisma.notification.create({
    data: {
      barbershopId,
      customerId,
      channel,
      type,
      status,
      provider,
      externalId,
      error: errorMsg,
      metadata: metadata ? JSON.stringify(metadata) : null,
      sentAt: status === 'SENT' ? new Date() : null,
    },
  });

  return record;
}
