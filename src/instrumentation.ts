/**
 * Next.js Instrumentation Hook
 * Executed once when Next.js server boots up.
 * Starts the internal autonomous scheduler for WhatsApp reminders and automations.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startInternalScheduler } = await import('@/lib/scheduler');
    startInternalScheduler();
  }
}
