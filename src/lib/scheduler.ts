import { processDueReminders } from './whatsapp/reminders';
import { logger } from './logger';

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let lastRunAt: Date | null = null;
let totalProcessed = 0;
let lastError: string | null = null;

export interface SchedulerStatus {
  active: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  totalProcessed: number;
  lastError: string | null;
}

const DEFAULT_INTERVAL_MS = 60 * 1000; // 60 seconds

/**
 * Executes a single cycle of the internal reminders & automations worker.
 * Idempotent, concurrency-locked, and resilient against failures.
 */
export async function runSchedulerCycle(): Promise<{ processed: number; error?: string }> {
  if (isProcessing) {
    logger.info('[INTERNAL_SCHEDULER] Ciclo anterior ainda em execução. Ignorando tick concorrente.');
    return { processed: 0 };
  }

  isProcessing = true;
  lastRunAt = new Date();

  try {
    const res = await processDueReminders(50);
    lastError = null;
    totalProcessed += res.processed;

    if (res.processed > 0) {
      logger.info(`[INTERNAL_SCHEDULER] ${res.processed} lembretes pendentes processados e enviados com sucesso via WhatsApp nativo.`, {
        module: 'INTERNAL_SCHEDULER',
        action: 'REMINDERS_SENT',
        metadata: { processed: res.processed },
      });
    }

    return { processed: res.processed };
  } catch (err: any) {
    lastError = err.message || 'Erro desconhecido no scheduler';
    logger.error('[INTERNAL_SCHEDULER] Erro durante ciclo de lembretes:', err, {
      module: 'INTERNAL_SCHEDULER',
      action: 'CYCLE_ERROR',
    });
    return { processed: 0, error: lastError || undefined };
  } finally {
    isProcessing = false;
  }
}

/**
 * Initializes the autonomous internal scheduler in Node.js runtime.
 * Guarantees zero dependence on external cron or n8n.
 */
export function startInternalScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  if (schedulerInterval) {
    return; // Already initialized
  }

  logger.info(`[INTERNAL_SCHEDULER] Iniciando motor autônomo de agendamentos internos (intervalo: ${intervalMs / 1000}s)...`);

  // Run initial cycle with a small startup delay (5s) to allow database connections to stabilize
  setTimeout(() => {
    runSchedulerCycle().catch(() => {});
  }, 5000);

  schedulerInterval = setInterval(() => {
    runSchedulerCycle().catch(() => {});
  }, intervalMs);

  // Unref timer so it does not block graceful process exit
  if (schedulerInterval && typeof schedulerInterval.unref === 'function') {
    schedulerInterval.unref();
  }
}

/**
 * Stops the internal scheduler
 */
export function stopInternalScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[INTERNAL_SCHEDULER] Scheduler interno finalizado.');
  }
}

/**
 * Returns current status and telemetry of internal scheduler
 */
export function getSchedulerStatus(): SchedulerStatus {
  return {
    active: schedulerInterval !== null,
    intervalMs: DEFAULT_INTERVAL_MS,
    lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
    totalProcessed,
    lastError,
  };
}
