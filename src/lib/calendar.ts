/**
 * Universal Calendar Utilities (RFC 5545 .ics generator and Google Calendar web link)
 */

export interface CalendarAppointment {
  id: string;
  publicToken: string;
  scheduledAt: Date | string;
  endAt: Date | string;
  price: number;
  serviceName: string;
  barberName: string;
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  shopCity?: string | null;
  publicUrl?: string;
}

/**
 * Format Date to UTC iCalendar format: YYYYMMDDTHHMMSSZ
 */
export function formatICSDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Generates RFC 5545 iCalendar string (.ics)
 */
export function generateICSContent(app: CalendarAppointment): string {
  const dtStart = formatICSDate(app.scheduledAt);
  const dtEnd = formatICSDate(app.endAt);
  const dtStamp = formatICSDate(new Date());

  const location = [app.shopAddress, app.shopCity].filter(Boolean).join(', ') || app.shopName;
  const description = [
    `✂️ Serviço: ${app.serviceName}`,
    `👤 Profissional: ${app.barberName}`,
    `💰 Valor: R$ ${app.price.toFixed(2).replace('.', ',')}`,
    `📍 Local: ${app.shopName}${location ? ` - ${location}` : ''}`,
    app.publicUrl ? `🔗 Ver detalhes / Cancelar: ${app.publicUrl}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BarberFlow//Universal Booking Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${app.publicToken}@barberflow.projetosunion.cloud`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${app.serviceName} - ${app.shopName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Horário na Barbearia',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generates direct Google Calendar Web Intent Link
 */
export function generateGoogleCalendarUrl(app: CalendarAppointment): string {
  const dtStart = formatICSDate(app.scheduledAt);
  const dtEnd = formatICSDate(app.endAt);

  const title = encodeURIComponent(`${app.serviceName} - ${app.shopName}`);
  const location = encodeURIComponent([app.shopAddress, app.shopCity].filter(Boolean).join(', ') || app.shopName);
  const details = encodeURIComponent(
    `✂️ Serviço: ${app.serviceName}\n👤 Barbeiro: ${app.barberName}\n💰 Valor: R$ ${app.price.toFixed(2).replace('.', ',')}\n📍 ${app.shopName}\n${app.publicUrl ? `🔗 Gerenciar: ${app.publicUrl}` : ''}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}
