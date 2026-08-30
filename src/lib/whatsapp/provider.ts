import { prisma } from '../prisma';
import { wahaClient, WahaClient } from './waha';

export interface SendTextParams {
  to: string;
  text: string;
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
  session?: string;
  type?: 'TEXT' | 'INTERACTIVE' | 'TEMPLATE';
}

export interface SendButtonsParams {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
  session?: string;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  language?: string;
  components?: any[];
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
  session?: string;
}

export interface ProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

export interface IWhatsAppProvider {
  sendText(params: SendTextParams): Promise<ProviderResponse>;
  sendButtons(params: SendButtonsParams): Promise<ProviderResponse>;
  sendTemplate(params: SendTemplateParams): Promise<ProviderResponse>;
}

/**
 * WAHA (WhatsApp HTTP API) Provider (Official Production Transport)
 */
export class WahaWhatsAppProvider implements IWhatsAppProvider {
  private client: WahaClient;

  constructor(client?: WahaClient) {
    this.client = client || wahaClient;
  }

  async sendText(params: SendTextParams): Promise<ProviderResponse> {
    const res = await this.client.sendText({
      to: params.to,
      text: params.text,
      session: params.session || 'default',
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
    });

    if (res.success) {
      const rawMsgId = res.messageId as any;
      const sanitizedMsgId = rawMsgId
        ? (typeof rawMsgId === 'object'
            ? (rawMsgId._serialized || rawMsgId.id || JSON.stringify(rawMsgId))
            : String(rawMsgId))
        : null;

      await prisma.whatsappMessage.create({
        data: {
          barbershopId: params.tenantId,
          customerId: params.customerId || null,
          phone: params.to,
          direction: 'OUTBOUND',
          type: params.type || 'TEXT',
          content: params.text,
          status: 'SENT',
          providerMessageId: sanitizedMsgId,
          appointmentId: params.appointmentId || null,
        },
      }).catch((err) => console.warn('[WAHA] DB log error:', err));

      return { success: true, messageId: sanitizedMsgId, status: 'SENT' };
    }

    return { success: false, error: res.error };
  }

  async sendButtons(params: SendButtonsParams): Promise<ProviderResponse> {
    const formatted = `${params.bodyText}\n\nOpções:\n` + params.buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join('\n');
    return this.sendText({
      to: params.to,
      text: formatted,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
      session: params.session,
      type: 'INTERACTIVE',
    });
  }

  async sendTemplate(params: SendTemplateParams): Promise<ProviderResponse> {
    const text = `[TEMPLATE: ${params.templateName}]`;
    return this.sendText({
      to: params.to,
      text,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
      session: params.session,
      type: 'TEMPLATE',
    });
  }
}

/**
 * Mock WhatsApp Provider for local development, test automation and sandbox validation
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  public outboundHistory: Array<{ to: string; content: string; type: string; timestamp: Date }> = [];

  async sendText(params: SendTextParams): Promise<ProviderResponse> {
    const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    this.outboundHistory.push({
      to: params.to,
      content: params.text,
      type: params.type || 'TEXT',
      timestamp: new Date(),
    });

    await prisma.whatsappMessage.create({
      data: {
        barbershopId: params.tenantId,
        customerId: params.customerId || null,
        phone: params.to,
        direction: 'OUTBOUND',
        type: params.type || 'TEXT',
        content: params.text,
        status: 'SENT',
        providerMessageId: messageId,
        appointmentId: params.appointmentId || null,
      },
    }).catch((err) => console.warn('Mock WhatsApp DB log error:', err));

    return {
      success: true,
      messageId,
      status: 'SENT',
    };
  }

  async sendButtons(params: SendButtonsParams): Promise<ProviderResponse> {
    const formatted = `${params.bodyText}\n\nOpções:\n` + params.buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    return this.sendText({
      to: params.to,
      text: formatted,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
      type: 'INTERACTIVE',
    });
  }

  async sendTemplate(params: SendTemplateParams): Promise<ProviderResponse> {
    const text = `[TEMPLATE: ${params.templateName}]`;
    return this.sendText({
      to: params.to,
      text,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
      type: 'TEMPLATE',
    });
  }
}

/**
 * Meta Cloud WhatsApp API Provider
 */
export class MetaCloudWhatsAppProvider implements IWhatsAppProvider {
  private apiKey: string;
  private phoneId: string;

  constructor(apiKey?: string, phoneId?: string) {
    this.apiKey = apiKey || process.env.WHATSAPP_API_KEY || '';
    this.phoneId = phoneId || process.env.WHATSAPP_PHONE_ID || '';
  }

  async sendText(params: SendTextParams): Promise<ProviderResponse> {
    if (!this.apiKey || !this.phoneId) {
      return new MockWhatsAppProvider().sendText(params);
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: params.to.replace(/\D/g, ''),
          type: 'text',
          text: { body: params.text },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Meta WhatsApp API Error');

      const messageId = data.messages?.[0]?.id || `meta_${Date.now()}`;

      await prisma.whatsappMessage.create({
        data: {
          barbershopId: params.tenantId,
          customerId: params.customerId || null,
          phone: params.to,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: params.text,
          status: 'SENT',
          providerMessageId: messageId,
          appointmentId: params.appointmentId || null,
        },
      }).catch((err) => console.warn('Meta WhatsApp DB log error:', err));

      return { success: true, messageId, status: 'SENT' };
    } catch (err: any) {
      console.error('Failed to send Meta WhatsApp message:', err);
      return { success: false, error: err.message };
    }
  }

  async sendButtons(params: SendButtonsParams): Promise<ProviderResponse> {
    const formatted = `${params.bodyText}\n\n` + params.buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join('\n');
    return this.sendText({
      to: params.to,
      text: formatted,
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      customerId: params.customerId,
      type: 'INTERACTIVE',
    });
  }

  async sendTemplate(params: SendTemplateParams): Promise<ProviderResponse> {
    if (!this.apiKey || !this.phoneId) {
      return new MockWhatsAppProvider().sendTemplate(params);
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.language || 'pt_BR' },
            components: params.components || [],
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Meta Template Error');

      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

// Global Singletons
export const mockWhatsApp = new MockWhatsAppProvider();
export const wahaWhatsApp = new WahaWhatsAppProvider();

export function getWhatsAppProvider(customApiKey?: string, customPhoneId?: string): IWhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === 'META' || (customApiKey && customPhoneId)) {
    return new MetaCloudWhatsAppProvider(customApiKey, customPhoneId);
  }
  if (process.env.WHATSAPP_PROVIDER === 'WAHA' || process.env.WAHA_URL) {
    return wahaWhatsApp;
  }
  return mockWhatsApp;
}
