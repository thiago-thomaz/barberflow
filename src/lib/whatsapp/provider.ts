import { prisma } from '@/lib/prisma';

export interface SendTextParams {
  to: string;
  text: string;
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
  type?: 'TEXT' | 'INTERACTIVE' | 'TEMPLATE';
}

export interface SendButtonsParams {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  language?: string;
  components?: any[];
  tenantId: string;
  appointmentId?: string;
  customerId?: string;
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
 * Mock WhatsApp Provider for local development, test automation and sandbox validation
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  public outboundHistory: Array<{ to: string; content: string; type: string; timestamp: Date }> = [];

  async sendText(params: SendTextParams): Promise<ProviderResponse> {
    const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    this.outboundHistory.push({
      to: params.to,
      content: params.text,
      type: 'TEXT',
      timestamp: new Date(),
    });

    // Persist in database
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
 * Meta Cloud WhatsApp API Provider (Production)
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
      console.warn('Meta WhatsApp credentials missing, falling back to Mock Provider');
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
      if (!res.ok) {
        throw new Error(data.error?.message || 'Meta WhatsApp API Error');
      }

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

// Global Singleton Provider Instance
export const mockWhatsApp = new MockWhatsAppProvider();

export function getWhatsAppProvider(customApiKey?: string, customPhoneId?: string): IWhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === 'META' || (customApiKey && customPhoneId)) {
    return new MetaCloudWhatsAppProvider(customApiKey, customPhoneId);
  }
  return mockWhatsApp;
}
