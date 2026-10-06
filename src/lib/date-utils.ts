/**
 * Helpers estrictos de fechas para Netlify (Runtime UTC) con zona horaria 'Europe/Madrid'.
 */

export const TIMEZONE_MADRID = 'Europe/Madrid';

/**
 * Devuelve la fecha formateada en lenguaje natural español en la zona horaria de Madrid.
 * Ej: "Sábado, 12 de Octubre"
 */
export function formatMadridDate(
  dateInput: string | Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: TIMEZONE_MADRID,
    ...options,
  }).format(date);
}

/**
 * Devuelve la hora formateada "HH:mm" en la zona horaria de Madrid.
 * NUNCA usar getHours() en el servidor debido al runtime UTC de Netlify.
 */
export function formatMadridTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('es-ES', {
    timeZone: TIMEZONE_MADRID,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Devuelve la cadena "YYYY-MM-DD" estricta según la hora local de Madrid.
 */
export function formatMadridDateString(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_MADRID,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA produce formato YYYY-MM-DD
}

/**
 * Comprueba si dos fechas corresponden al mismo día en 'Europe/Madrid'.
 */
export function isMadridSameDay(d1: string | Date, d2: string | Date): boolean {
  return formatMadridDateString(d1) === formatMadridDateString(d2);
}

/**
 * Genera el enlace de Google Calendar directo para añadir el partido.
 */
export function generateGoogleCalendarUrl(
  title: string,
  venue: string,
  startDateUtc: string | Date,
  durationMinutes = 120
): string {
  const start = typeof startDateUtc === 'string' ? new Date(startDateUtc) : startDateUtc;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatUtcIsoBasic = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const datesParam = `${formatUtcIsoBasic(start)}/${formatUtcIsoBasic(end)}`;
  const details = `Partido oficial del C.D. Voleibol San Pedro. ¡Ven a apoyar al equipo de nuestro pueblo en el Pabellón Sergio Scariolo!`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('dates', datesParam);
  url.searchParams.set('details', details);
  url.searchParams.set('location', venue);

  return url.toString();
}

/**
 * Genera el contenido del archivo .ics estándar para Apple Calendar / Outlook / iCal.
 */
export function generateIcsContent(
  title: string,
  venue: string,
  startDateUtc: string | Date,
  matchId: string,
  durationMinutes = 120
): string {
  const start = typeof startDateUtc === 'string' ? new Date(startDateUtc) : startDateUtc;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatUtcIsoBasic = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const now = new Date();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CD Voleibol San Pedro//Calendario Oficial//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:match-${matchId}@cdvoleibolsanpedro.es`,
    `DTSTAMP:${formatUtcIsoBasic(now)}`,
    `DTSTART:${formatUtcIsoBasic(start)}`,
    `DTEND:${formatUtcIsoBasic(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Partido oficial del C.D. Voleibol San Pedro. Pabellón Polideportivo Sergio Scariolo.`,
    `LOCATION:${venue}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
