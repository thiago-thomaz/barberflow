/**
 * Timezone utilities for standardizing Brazil / Sao Paulo (UTC-3)
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns Start of Day (00:00:00.000) for a given date in YYYY-MM-DD string
 */
export function getStartOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Returns End of Day (23:59:59.999) for a given date in YYYY-MM-DD string
 */
export function getEndOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/**
 * Formats a Date object into Brazil formatted date string (DD/MM/YYYY)
 */
export function formatBrazilDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a Date object into Brazil time string (HH:MM)
 */
export function formatBrazilTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Get current date ISO string in YYYY-MM-DD for America/Sao_Paulo
 */
export function getTodayDateStringSP(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}
