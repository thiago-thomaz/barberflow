import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogPayload {
  level: LogLevel;
  message: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  action?: string;
  module?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
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
  'api_key',
  'replicate_api_token',
  'gemini_api_key',
  'waha_api_key',
  'webhook_secret',
  'privatekey',
  'creditcard',
  'cardnumber',
  'cvv',
]);

/**
 * Sanitizes objects recursively to prevent leaking passwords, tokens, API keys or massive binary buffers
 */
export function sanitizeLogData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Buffer.isBuffer(obj)) {
    return `[BUFFER: ${obj.length} bytes]`;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (typeof value === 'string' && value.length > 8) {
        sanitized[key] = `${value.slice(0, 4)}***${value.slice(-3)} [REDACTED]`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'string' && (value.startsWith('data:image/') || value.length > 500)) {
      // Avoid filling logs with raw base64 or huge strings
      if (value.startsWith('data:image/')) {
        sanitized[key] = `[BASE64_IMAGE: ${value.slice(0, 30)}... total ${value.length} chars]`;
      } else {
        sanitized[key] = `${value.slice(0, 200)}... [TRUNCATED ${value.length} chars]`;
      }
    } else if (Buffer.isBuffer(value)) {
      sanitized[key] = `[BUFFER: ${value.length} bytes]`;
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

export function maskToken(token?: string | null): string {
  if (!token) return '[NOT_SET]';
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export type ReplicateStep =
  | 'TOKEN_CHECK'
  | 'INPUT_VALIDATION'
  | 'MASK_GENERATION'
  | 'PROMPT_COMPILATION'
  | 'PREDICTION_DISPATCH'
  | 'RATE_LIMIT_BACKOFF'
  | 'ENDPOINT_FALLBACK'
  | 'POLLING_STATUS'
  | 'IMAGE_DOWNLOADED'
  | 'IDENTITY_GATE_EVALUATED'
  | 'COMPOSITE_COMPLETED'
  | 'PREDICTION_SUCCESS'
  | 'PREDICTION_FAILED'
  | 'PREDICTION_CANCELED'
  | 'PREDICTION_ERROR';

export interface ReplicateLogDetails {
  step: ReplicateStep;
  model?: string;
  modelVersion?: string;
  predictionId?: string;
  prompt?: string;
  promptHash?: string;
  negativePrompt?: string;
  maskMode?: string;
  inputBytes?: number;
  maskBytes?: number;
  imageDimensions?: { width: number; height: number };
  status?: string;
  attempt?: number;
  retryDelayMs?: number;
  latencyMs?: number;
  identityScore?: number;
  faceSSIM?: number;
  outsideDiffRatio?: number;
  boxShiftRatio?: number;
  featureDistance?: number;
  outputUrl?: string;
  error?: any;
  endpoint?: string;
  httpStatus?: number;
  [key: string]: any;
}

export interface VisagismLogDetails {
  step: string;
  sessionId?: string;
  barbershopId?: string;
  haircutName?: string;
  haircutId?: string;
  maskMode?: string;
  score?: number;
  passed?: boolean;
  reason?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface LoggerContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  action?: string;
  module?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: Error | any;
}

/**
 * Central structured logging helper
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LoggerContext
) {
  const errObj = context?.error
    ? {
        name: context.error.name || 'Error',
        message: context.error.message || String(context.error),
        stack: context.error.stack,
        code: context.error.code,
      }
    : undefined;

  const payload: LogPayload = {
    level,
    message,
    requestId: context?.requestId,
    tenantId: context?.tenantId,
    userId: context?.userId,
    action: context?.action,
    module: context?.module,
    durationMs: context?.durationMs,
    metadata: context?.metadata ? sanitizeLogData(context.metadata) : undefined,
    error: errObj,
    timestamp: new Date().toISOString(),
  };

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else if (level === 'debug') {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.debug(output);
    }
  } else {
    console.log(output);
  }
}

/**
 * Universal Structured Logger with specialized domain helpers
 */
export const logger = {
  info: (message: string, context?: LoggerContext) => log('info', message, context),
  warn: (message: string, context?: LoggerContext) => log('warn', message, context),
  debug: (message: string, context?: LoggerContext) => log('debug', message, context),
  error: (message: string, errorOrContext?: Error | LoggerContext, context?: LoggerContext) => {
    if (errorOrContext instanceof Error) {
      log('error', message, { ...context, error: errorOrContext });
    } else if (errorOrContext) {
      log('error', message, errorOrContext);
    } else {
      log('error', message, context);
    }
  },

  /**
   * Specialized Replicate AI lifecycle logger
   */
  replicate: (step: ReplicateStep, details: Omit<ReplicateLogDetails, 'step'>) => {
    const isError = step === 'PREDICTION_ERROR' || step === 'PREDICTION_FAILED';
    const isWarn = step === 'RATE_LIMIT_BACKOFF' || step === 'ENDPOINT_FALLBACK';
    const level: LogLevel = isError ? 'error' : isWarn ? 'warn' : 'info';

    const message = `[REPLICATE_AI] [${step}] ${details.predictionId ? `(ID: ${details.predictionId}) ` : ''}${
      details.status ? `Status: ${details.status} ` : ''
    }${details.latencyMs ? `(${details.latencyMs}ms)` : ''}`.trim();

    log(level, message, {
      module: 'REPLICATE_INPAINTING',
      action: step,
      durationMs: details.latencyMs,
      metadata: details,
      error: details.error,
    });
  },

  /**
   * Specialized Visagism engine logger
   */
  visagism: (step: string, details: VisagismLogDetails) => {
    const isError = details.passed === false && details.reason;
    const level: LogLevel = isError ? 'warn' : 'info';

    log(level, `[VISAGISMO] [${step}] ${details.sessionId ? `Session: ${details.sessionId}` : ''}`, {
      module: 'VISAGISM_ENGINE',
      tenantId: details.barbershopId,
      action: step,
      durationMs: details.durationMs,
      metadata: details,
    });
  },

  /**
   * HTTP API Route logger
   */
  http: (method: string, path: string, status: number, durationMs: number, meta?: Record<string, any>) => {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    log(level, `[HTTP] ${method} ${path} -> ${status} (${durationMs}ms)`, {
      module: 'HTTP_API',
      action: `${method} ${path}`,
      durationMs,
      metadata: { status, ...meta },
    });
  },

  /**
   * Auth lifecycle logger
   */
  auth: (action: string, details: { userId?: string; tenantId?: string; email?: string; success: boolean; reason?: string }) => {
    const level: LogLevel = details.success ? 'info' : 'warn';
    log(level, `[AUTH] ${action} - ${details.success ? 'SUCCESS' : `FAILED: ${details.reason}`}`, {
      module: 'AUTH',
      action,
      userId: details.userId,
      tenantId: details.tenantId,
      metadata: details,
    });
  },

  /**
   * WhatsApp Engine logger
   */
  whatsapp: (event: string, details: { from?: string; phone?: string; text?: string; barbershopId?: string; actionTaken?: string }) => {
    log('info', `[WHATSAPP] ${event} - Action: ${details.actionTaken || 'processed'}`, {
      module: 'WHATSAPP_ENGINE',
      tenantId: details.barbershopId,
      action: event,
      metadata: details,
    });
  },

  /**
   * Scoped sub-logger factory
   */
  createScope: (moduleName: string) => {
    return {
      info: (msg: string, ctx?: LoggerContext) => log('info', msg, { ...ctx, module: moduleName }),
      warn: (msg: string, ctx?: LoggerContext) => log('warn', msg, { ...ctx, module: moduleName }),
      debug: (msg: string, ctx?: LoggerContext) => log('debug', msg, { ...ctx, module: moduleName }),
      error: (msg: string, errOrCtx?: Error | LoggerContext, ctx?: LoggerContext) => {
        if (errOrCtx instanceof Error) {
          log('error', msg, { ...ctx, module: moduleName, error: errOrCtx });
        } else {
          log('error', msg, { ...errOrCtx, module: moduleName });
        }
      },
    };
  },
};

export default logger;
