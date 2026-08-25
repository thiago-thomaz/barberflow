import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'senha',
  'secret',
  'token',
  'authorization',
  'jwt_secret',
  'apikey',
  'privatekey',
  'creditcard',
  'cardnumber',
  'cvv',
]);

/**
 * Sanitizes objects recursively to prevent leaking passwords, tokens or secrets in logs
 */
export function sanitizeLogData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

export function log(
  level: LogLevel,
  message: string,
  context?: {
    requestId?: string;
    tenantId?: string;
    userId?: string;
    action?: string;
    metadata?: Record<string, any>;
  }
) {
  const payload: LogPayload = {
    level,
    message,
    requestId: context?.requestId,
    tenantId: context?.tenantId,
    userId: context?.userId,
    action: context?.action,
    metadata: context?.metadata ? sanitizeLogData(context.metadata) : undefined,
    timestamp: new Date().toISOString(),
  };

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}
