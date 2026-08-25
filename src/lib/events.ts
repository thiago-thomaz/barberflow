import crypto from 'crypto';
import { prisma } from './prisma';

export type EventType =
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_NO_SHOW'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_DUE_FOR_RETURN'
  | 'CUSTOMER_AT_RISK'
  | 'CUSTOMER_INACTIVE'
  | 'CUSTOMER_BIRTHDAY';

export interface EventPayload {
  event: EventType;
  timestamp: string;
  tenant_id: string;
  customer_id?: string;
  appointment_id?: string;
  barber_id?: string;
  service_id?: string;
  data: Record<string, any>;
}

/**
 * Calculates HMAC-SHA256 signature for webhook payload
 */
export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Publishes an event to the internal queue and triggers registered webhooks (e.g. for n8n)
 */
export async function publishEvent(
  eventType: EventType,
  tenantId: string,
  data: Record<string, any>,
  references?: {
    customerId?: string;
    appointmentId?: string;
    barberId?: string;
    serviceId?: string;
  }
) {
  const payload: EventPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    customer_id: references?.customerId,
    appointment_id: references?.appointmentId,
    barber_id: references?.barberId,
    service_id: references?.serviceId,
    data,
  };

  const payloadString = JSON.stringify(payload);

  // 1. Save event in database
  const eventRecord = await prisma.automationEvent.create({
    data: {
      barbershopId: tenantId,
      event: eventType,
      payload: payloadString,
      delivered: false,
      attempts: 0,
    },
  });

  // 2. Dispatch to active webhooks for this barbershop asynchronously
  dispatchWebhooks(tenantId, eventType, payload, eventRecord.id).catch((err) => {
    console.error(`Error dispatching webhook for event ${eventType}:`, err);
  });

  return eventRecord;
}

async function dispatchWebhooks(
  tenantId: string,
  eventType: EventType,
  payload: EventPayload,
  eventId: string
) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      barbershopId: tenantId,
      isActive: true,
    },
  });

  const payloadString = JSON.stringify(payload);

  for (const webhook of webhooks) {
    let shouldSend = false;
    try {
      const allowedEvents = JSON.parse(webhook.events);
      if (Array.isArray(allowedEvents)) {
        shouldSend = allowedEvents.includes('*') || allowedEvents.includes(eventType);
      }
    } catch {
      shouldSend = webhook.events === '*' || webhook.events.includes(eventType);
    }

    if (!shouldSend) continue;

    const signature = signWebhookPayload(payloadString, webhook.secret);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BarberFlow-Event': eventType,
          'X-BarberFlow-Signature': signature,
          'X-BarberFlow-Timestamp': payload.timestamp,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggerAt: new Date(),
          lastStatus: response.status,
        },
      });

      await prisma.automationEvent.update({
        where: { id: eventId },
        data: {
          delivered: response.ok,
          attempts: { increment: 1 },
        },
      });
    } catch (err: any) {
      console.warn(`Webhook call to ${webhook.url} failed:`, err.message);
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggerAt: new Date(),
          lastStatus: 500,
        },
      });
      await prisma.automationEvent.update({
        where: { id: eventId },
        data: {
          delivered: false,
          attempts: { increment: 1 },
        },
      });
    }
  }
}
