/**
 * Helpers estrictos de fechas y cálculo de edad para Netlify (Runtime UTC)
 * con zona horaria oficial 'Europe/Madrid' y calendario RFC 5545.
 */

export const TIMEZONE_MADRID = 'Europe/Madrid';

export interface MadridAgeEvaluation {
  age: number | null;
  isMinor: boolean;
  isMinor14To17: boolean;
  isBoundaryUnverified: boolean;
}

const MADRID_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE_MADRID,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Convierte componentes locales de 'Europe/Madrid' a Date UTC real,
 * respetando CET (+01:00) y CEST (+02:00) incluso bajo TZ=UTC.
 */
export function madridLocalToUtcDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0
): Date {
  for (const offsetHours of [2, 1]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute, second));
    const parts = MADRID_PARTS_FORMATTER.formatToParts(candidate);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? -1);
    if (
      get('year') === year &&
      get('month') === month &&
      get('day') === day &&
      get('hour') === hour &&
      get('minute') === minute
    ) {
      return candidate;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute, second));
}

/**
 * Convierte una fecha (YYYY-MM-DD) y hora (HH:MM) en 'Europe/Madrid' a ISO UTC.
 */
export function madridLocalToUtcIso(fechaStr: string, horaStr = '12:00'): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const [hh, mm, ss] = (horaStr || '12:00').split(':').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date().toISOString();
  }
  return madridLocalToUtcDate(
    y,
    m,
    d,
    Number.isFinite(hh) ? hh : 12,
    Number.isFinite(mm) ? mm : 0,
    Number.isFinite(ss) ? ss : 0
  ).toISOString();
}

/**
 * Parsea de forma segura un Date o string de fecha/hora:
 * - Si el string incluye zona explícita ('Z' o '+/-HH:MM'), respeta ese instante UTC.
 * - Si el string viene sin offset horario (ej. '2026-11-14 15:00:00' o '14/11/2026 15:00'),
 *   lo interpreta explícitamente en 'Europe/Madrid' evitando desfases +1h/+2h en runtime UTC.
 */
export function parseMadridDateTimeSafe(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? new Date(0) : dateInput;
  }

  const raw = String(dateInput || '').trim();
  if (!raw) return new Date(0);

  // Si ya trae indicador explícito de zona horaria (Z o offset ±HH:MM / ±HHMM / ±HH)
  if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }

  // Formato YYYY-MM-DD[T ]HH:MM(:SS)?(.sss)?
  const isoLocalMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/
  );
  if (isoLocalMatch) {
    const y = Number(isoLocalMatch[1]);
    const m = Number(isoLocalMatch[2]);
    const d = Number(isoLocalMatch[3]);
    const hh = isoLocalMatch[4] !== undefined ? Number(isoLocalMatch[4]) : 12;
    const mm = isoLocalMatch[5] !== undefined ? Number(isoLocalMatch[5]) : 0;
    const ss = isoLocalMatch[6] !== undefined ? Number(isoLocalMatch[6]) : 0;
    return madridLocalToUtcDate(y, m, d, hh, mm, ss);
  }

  // Formato DD/MM/YYYY( HH:MM(:SS)?)?
  const esLocalMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (esLocalMatch) {
    const d = Number(esLocalMatch[1]);
    const m = Number(esLocalMatch[2]);
    const y = Number(esLocalMatch[3]);
    const hh = esLocalMatch[4] !== undefined ? Number(esLocalMatch[4]) : 12;
    const mm = esLocalMatch[5] !== undefined ? Number(esLocalMatch[5]) : 0;
    const ss = esLocalMatch[6] !== undefined ? Number(esLocalMatch[6]) : 0;
    return madridLocalToUtcDate(y, m, d, hh, mm, ss);
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

/**
 * Formatea una fecha estrictamente como "dd/MM/yyyy" en la zona horaria de Madrid.
 * Soporta Date, ISO strings, "YYYY-MM-DD", "dd/MM/yyyy" o textos mixtos con "YYYY-MM-DD".
 */
export function formatDisplayDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';

  if (typeof dateInput === 'string') {
    const raw = dateInput.trim();
    if (!raw) return '—';

    const exactYmd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exactYmd) {
      return `${exactYmd[3]}/${exactYmd[2]}/${exactYmd[1]}`;
    }

    const exactDmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (exactDmy) {
      return `${exactDmy[1].padStart(2, '0')}/${exactDmy[2].padStart(2, '0')}/${exactDmy[3]}`;
    }

    // Cadena mixta no ISO estándar (ej. "2026-11-28 · 19:45")
    if (!/^\d{4}-\d{2}-\d{2}[T\s]/.test(raw) && /\b\d{4}-\d{2}-\d{2}\b/.test(raw)) {
      return raw.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1');
    }
  }

  const date = parseMadridDateTimeSafe(dateInput);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return typeof dateInput === 'string' && dateInput.trim() ? dateInput.trim() : '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_MADRID,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Devuelve la fecha formateada como "dd/MM/yyyy" en la zona horaria de Madrid
 * (o "HH:mm" si las opciones solicitan únicamente hora).
 */
export function formatMadridDate(
  dateInput: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  if (
    options &&
    options.hour !== undefined &&
    options.day === undefined &&
    options.month === undefined &&
    options.year === undefined
  ) {
    return formatMadridTime(dateInput);
  }
  return formatDisplayDate(dateInput);
}

/**
 * Devuelve la hora formateada "HH:mm" (00-23) en la zona horaria de Madrid.
 * NUNCA usar getHours() en el servidor debido al runtime UTC de Netlify.
 */
export function formatMadridTime(dateInput: string | Date): string {
  const date = parseMadridDateTimeSafe(dateInput);
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: TIMEZONE_MADRID,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Devuelve la cadena "YYYY-MM-DD" estricta según la hora local de Madrid.
 */
export function formatMadridDateString(dateInput: string | Date): string {
  const date = parseMadridDateTimeSafe(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_MADRID,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA produce formato YYYY-MM-DD
}

/**
 * Devuelve el año civil actual en 'Europe/Madrid'.
 */
export function getCurrentMadridYear(now: Date = new Date()): number {
  const ymd = formatMadridDateString(now);
  return Number(ymd.slice(0, 4));
}

/**
 * Parsea una fecha de nacimiento en formato 'YYYY-MM-DD' o 'DD/MM/YYYY' validando días reales.
 */
export function parseBirthDateParts(
  birthDateInput?: string | null
): { year: number; month: number; day: number } | null {
  if (!birthDateInput) return null;
  const clean = String(birthDateInput).trim();
  if (!clean) return null;

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const esMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (esMatch) {
    day = Number(esMatch[1]);
    month = Number(esMatch[2]);
    year = Number(esMatch[3]);
  } else {
    return null;
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const todayIso = formatMadridDateString(new Date());
  const candidateIso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (candidateIso > todayIso) {
    return null;
  }

  return { year, month, day };
}

/**
 * Calcula edad exacta y tramo legal (Art. 7.1 LOPDGDD / Art. 3 LO 1/1982 / Anexo 05)
 * respecto a la fecha actual en 'Europe/Madrid'.
 * Si falta fecha exacta de nacimiento, aplica regla conservadora pro-menor en fronteras 14 y 18 años.
 */
export function computeAgeInMadrid(
  birthDateIso?: string | null,
  birthYear?: number | null,
  referenceDate: Date = new Date()
): MadridAgeEvaluation {
  const todayStr = formatMadridDateString(referenceDate);
  const [todayY, todayM, todayD] = todayStr.split('-').map(Number);

  const parsedDate = parseBirthDateParts(birthDateIso);
  if (parsedDate) {
    let age = todayY - parsedDate.year;
    if (
      todayM < parsedDate.month ||
      (todayM === parsedDate.month && todayD < parsedDate.day)
    ) {
      age -= 1;
    }
    const clampedAge = Math.max(0, age);
    return {
      age: clampedAge,
      isMinor: clampedAge < 18,
      isMinor14To17: clampedAge >= 14 && clampedAge < 18,
      isBoundaryUnverified: false,
    };
  }

  if (typeof birthYear === 'number' && Number.isFinite(birthYear) && birthYear >= 1900 && birthYear <= todayY) {
    const yearDiff = todayY - birthYear;
    if (yearDiff > 18) {
      return {
        age: yearDiff,
        isMinor: false,
        isMinor14To17: false,
        isBoundaryUnverified: false,
      };
    }
    if (yearDiff === 18) {
      // Frontera 18 años sin día exacto: tratar como menor (<18) por seguridad jurídica
      return {
        age: 17,
        isMinor: true,
        isMinor14To17: true,
        isBoundaryUnverified: true,
      };
    }
    if (yearDiff >= 15) {
      return {
        age: yearDiff - 1,
        isMinor: true,
        isMinor14To17: true,
        isBoundaryUnverified: false,
      };
    }
    if (yearDiff === 14) {
      // Frontera 14 años sin día exacto: tratar como <14 (solo tutores) hasta registrar birth_date
      return {
        age: 13,
        isMinor: true,
        isMinor14To17: false,
        isBoundaryUnverified: true,
      };
    }
    return {
      age: Math.max(0, yearDiff),
      isMinor: true,
      isMinor14To17: false,
      isBoundaryUnverified: false,
    };
  }

  return {
    age: null,
    isMinor: true,
    isMinor14To17: false,
    isBoundaryUnverified: true,
  };
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
  const start = parseMadridDateTimeSafe(startDateUtc);
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
 * Escapa texto plano para valores RFC 5545 en iCalendar, eliminando inyecciones CRLF
 * y escapando barras invertidas, punto y coma y comas.
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim();
}

export interface IcsEventInput {
  title: string;
  venue: string;
  startDateUtc: string | Date;
  matchId: string;
  durationMinutes?: number;
  description?: string;
}

/**
 * Genera un bloque individual VEVENT cumpliendo la especificación RFC 5545 y saneando campos.
 */
export function generateVEventBlock(event: IcsEventInput): string {
  const start = parseMadridDateTimeSafe(event.startDateUtc);
  const duration = event.durationMinutes ?? 120;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const formatUtcIsoBasic = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const now = new Date();
  const safeUid = escapeIcsText(event.matchId);
  const safeTitle = escapeIcsText(event.title);
  const defaultDesc = 'Partido oficial del C.D. Voleibol San Pedro. Pabellón Polideportivo Sergio Scariolo.';
  const safeDesc = escapeIcsText(event.description ?? defaultDesc);
  const safeVenue = escapeIcsText(event.venue);

  return [
    'BEGIN:VEVENT',
    `UID:match-${safeUid}@voleibolsanpedro.es`,
    `DTSTAMP:${formatUtcIsoBasic(now)}`,
    `DTSTART:${formatUtcIsoBasic(start)}`,
    `DTEND:${formatUtcIsoBasic(end)}`,
    `SUMMARY:${safeTitle}`,
    `DESCRIPTION:${safeDesc}`,
    `LOCATION:${safeVenue}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Genera el contenido del archivo .ics estándar para Apple Calendar / Outlook / iCal.
 * Mantiene compatibilidad hacia atrás con la firma original o acepta IcsEventInput.
 */
export function generateIcsContent(
  titleOrEvent: string | IcsEventInput,
  venue?: string,
  startDateUtc?: string | Date,
  matchId?: string,
  durationMinutes = 120
): string {
  const event: IcsEventInput =
    typeof titleOrEvent === 'object' && titleOrEvent !== null
      ? titleOrEvent
      : {
          title: titleOrEvent,
          venue: venue || '',
          startDateUtc: startDateUtc || new Date(),
          matchId: matchId || 'unknown',
          durationMinutes,
        };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CD Voleibol San Pedro//Calendario Oficial//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    generateVEventBlock(event),
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Genera el contenido de un archivo .ics estándar RFC 5545 con múltiples eventos
 * englobados en un único bloque VCALENDAR.
 */
export function generateMultipleIcsContent(events: IcsEventInput[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CD Voleibol San Pedro//Calendario Oficial//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  if (events.length > 0) {
    lines.push(events.map((e) => generateVEventBlock(e)).join('\r\n'));
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
