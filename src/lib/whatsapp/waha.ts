/**
 * WAHA (WhatsApp HTTP API) Client & Transport Layer
 * Docs: https://waha.devlike.pro/
 */

export interface WahaConfig {
  baseUrl: string; // e.g. https://evo.projetosunion.cloud
  apiKey?: string;
  defaultSession?: string;
}

export interface WahaSessionInfo {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  config?: any;
  me?: {
    id: string;
    pushName?: string;
  };
}

export interface WahaSendTextParams {
  to: string; // E.164 phone number e.g. 5514998016163 or 5514998016163@c.us
  text: string;
  session?: string;
  tenantId?: string;
  appointmentId?: string;
  customerId?: string;
}

export class WahaClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultSession: string;

  constructor(config?: Partial<WahaConfig>) {
    this.baseUrl = (config?.baseUrl || process.env.WAHA_URL || 'https://evo.projetosunion.cloud').replace(/\/$/, '');
    this.apiKey = config?.apiKey || process.env.WAHA_API_KEY || '';
    this.defaultSession = config?.defaultSession || process.env.WAHA_DEFAULT_SESSION || 'default';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Normalize recipient phone to WAHA chat ID format (e.g. 5514998016163@c.us or 90464929759328@lid)
   */
  private formatChatId(phone: string): string {
    if (phone.includes('@c.us') || phone.includes('@g.us') || phone.includes('@lid')) {
      return phone;
    }
    const digits = phone.replace(/\D/g, '');
    if (phone.includes('lid') || (digits.length >= 14 && digits.startsWith('904'))) {
      return `${digits}@lid`;
    }
    return `${digits}@c.us`;
  }

  /**
   * Get all active WAHA sessions
   */
  async getSessions(): Promise<WahaSessionInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions?all=true`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`WAHA getSessions error: ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
      console.warn(`[WAHA] Failed to fetch sessions from ${this.baseUrl}:`, err.message);
      return [];
    }
  }

  /**
   * Get status of a specific session
   */
  async getSessionStatus(sessionName?: string): Promise<WahaSessionInfo | null> {
    const session = sessionName || this.defaultSession;
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${session}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`WAHA getSessionStatus error: ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
      console.warn(`[WAHA] Failed to fetch session status for ${session}:`, err.message);
      return null;
    }
  }

  /**
   * Start or restart a WAHA session
   */
  async startSession(sessionName?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = sessionName || this.defaultSession;
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${session}/start`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name: session }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Stop a WAHA session
   */
  async stopSession(sessionName?: string): Promise<{ success: boolean; error?: string }> {
    const session = sessionName || this.defaultSession;
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${session}/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(res.statusText);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get QR Code representation (raw image or base64)
   */
  async getQRCode(sessionName?: string): Promise<{ qr?: string; error?: string }> {
    const session = sessionName || this.defaultSession;
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${session}/auth/qr?format=raw`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (res.status === 404 || res.status === 204) {
        return { error: 'SESSION_CONNECTED_OR_NOT_FOUND' };
      }
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      return { qr: data.qr || data.raw || data };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * Send Text Message via WAHA
   */
  async sendText(params: WahaSendTextParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const session = params.session || this.defaultSession;
    const chatId = this.formatChatId(params.to);

    try {
      const res = await fetch(`${this.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          session,
          chatId,
          text: params.text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      return {
        success: true,
        messageId: data.id || data.messageId || `waha_${Date.now()}`,
      };
    } catch (err: any) {
      console.error(`[WAHA] Error sending text to ${chatId}:`, err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

export const wahaClient = new WahaClient();
