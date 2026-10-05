import { prisma } from './prisma';
import { publishEvent } from './events';
import { getWhatsAppProvider } from './whatsapp/provider';
import { logger } from './logger';

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
 * Dispatches a notification and logs its execution in the Notification history table.
 * 100% Native: Dispatches directly via internal WhatsApp engine with zero external n8n dependency.
 */
export async function sendNotification(params: DispatchNotificationParams) {
  const {
    barbershopId,
    customerId,
    channel,
    type,
    recipient,
    message,
    provider = 'INTERNAL_WHATSAPP',
    metadata,
  } = params;

  let status = 'SENT';
  let errorMsg: string | null = null;
  let externalId: string | null = null;

  try {
    if (channel === 'WHATSAPP') {
      const whatsappProvider = getWhatsAppProvider();
      const sendRes = await whatsappProvider.sendText({
        to: recipient,
        text: message,
        tenantId: barbershopId,
        customerId,
        type: 'TEXT',
      });

      if (sendRes.success) {
        status = 'SENT';
        externalId = sendRes.messageId || null;
      } else {
        status = 'FAILED';
        errorMsg = sendRes.error || 'Falha ao despachar via WhatsApp nativo';
        logger.warn('[NOTIFICATION] Falha ao enviar WhatsApp direto:', {
          module: 'NOTIFICATION',
          tenantId: barbershopId,
          metadata: { recipient, error: errorMsg },
        });
      }
    }

    // Publish event internally to database & webhooks
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
    ).catch((err) => {
      logger.warn('[NOTIFICATION] Erro ao gravar evento interno:', err);
    });
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
