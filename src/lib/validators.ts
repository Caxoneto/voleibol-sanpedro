/**
 * Validadores y sanitizadores puros (seguros para cliente y servidor, sin dependencias de Node crypto).
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/**
 * Normaliza los últimos 4 dígitos y letra del DNI/NIE (ej: "1234-A" -> "1234A").
 */
export function normalizeDniLast5(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Valida si el fragmento identificativo (últimos 4 dígitos + letra o fragmento de pasaporte) tiene formato válido.
 */
export function isValidDniLast5Format(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const norm = normalizeDniLast5(input);
  if (!norm || norm === '0000X' || norm === '0000T' || /^0+$/.test(norm)) return false;

  if (/^[0-9]{4}[A-Z]$/.test(norm)) {
    return true;
  }

  return /^[A-Z0-9]{5,6}$/.test(norm) && /[1-9]/.test(norm);
}

/**
 * Extrae el año a partir de un año (ej. 2008) o una fecha (ej. 15/04/2008 o 2008-04-15).
 */
export function extractYear(input: string | number): number | null {
  if (typeof input === 'number') {
    return Number.isInteger(input) && input >= 1900 && input <= 2099 ? input : null;
  }
  if (!input || typeof input !== 'string') return null;
  const match = input.trim().match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Valida un documento de identidad oficial sin excepciones demo:
 * 1. DNI español (8 dígitos + letra módulo 23, sin secuencias triviales).
 * 2. NIE español (X/Y/Z + 7 dígitos + letra módulo 23).
 * 3. Pasaporte internacional (6–12 caracteres alfanuméricos, >=2 letras, >=2 dígitos, sin repeticiones triviales).
 */
export function isValidSpanishDniOrNie(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const str = input.replace(/[\s-]/g, '').toUpperCase();

  const dniRegex = /^[0-9]{8}[A-Z]$/;
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;

  if (dniRegex.test(str)) {
    if (
      str.startsWith('12345678') ||
      /^(\d)\1{7}[A-Z]$/.test(str)
    ) {
      return false;
    }
    const num = parseInt(str.substring(0, 8), 10);
    return DNI_LETTERS.charAt(num % 23) === str.charAt(8);
  }

  if (nieRegex.test(str)) {
    const niePrefix = str.startsWith('Y') ? '1' : str.startsWith('Z') ? '2' : '0';
    const numPart = str.substring(1, 8);
    if (/^(\d)\1{6}$/.test(numPart)) {
      return false;
    }
    const num = parseInt(niePrefix + numPart, 10);
    return DNI_LETTERS.charAt(num % 23) === str.charAt(8);
  }

  if (/^[XYZ]\d{6,9}[A-Z]{0,2}$/.test(str) || /^\d{7,9}[A-Z]{1,2}$/.test(str)) {
    return false;
  }

  // Pasaporte endurecido: 6-12 alfanuméricos, >=2 letras, >=2 dígitos, al menos un dígito 1-9 y sin repeticiones triviales
  if (/^[A-Z0-9]{6,12}$/.test(str)) {
    const letters = str.match(/[A-Z]/g) || [];
    const digits = str.match(/[0-9]/g) || [];
    if (letters.length < 2 || digits.length < 2) return false;
    if (!/[1-9]/.test(str)) return false;
    if (/(.)\1{3,}/.test(str)) return false;
    if (digits.length >= 4 && new Set(digits).size <= 1) return false;
    const digitsJoined = digits.join('');
    if (/^(012345|123456|234567|345678|456789|987654|876543)$/.test(digitsJoined)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Valida estrictamente direcciones de correo electrónico y rechaza caracteres de inyección SMTP/CRLF.
 */
export function isStrictEmail(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length < 5 || trimmed.length > 150) return false;
  if (/[\r\n\0\s<>(),;:"'\\]/.test(trimmed)) return false;

  const atParts = trimmed.split('@');
  if (atParts.length !== 2) return false;
  const [local, domain] = atParts;

  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (!domain || domain.length > 253 || !domain.includes('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.some((label) => !/^[a-zA-Z0-9-]{1,63}$/.test(label) || label.startsWith('-') || label.endsWith('-'))) {
    return false;
  }
  const tld = labels[labels.length - 1];
  return tld.length >= 2 && /[a-zA-Z]/.test(tld);
}

/**
 * Elimina saltos de línea CR/LF y bytes nulos para evitar inyección de cabeceras en correos y logs.
 */
export function stripCrlf(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\r\n\0]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Valida que una URL externa use exclusivamente esquema https: antes de renderizarse en enlaces.
 */
export function sanitizeHttpsUrl(raw: unknown, fallback = '#'): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || /[\r\n\0\t]/.test(trimmed)) return fallback;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

/**
 * Escapa y neutraliza celdas CSV contra CSV Formula Injection y ruptura de comillas (RFC 4180).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/\0/g, '');
  const trimmedLeading = str.replace(/^[ ]+/, '');
  if (/^[=+\-@\t\r\n]/.test(str) || /^[=+\-@\t\r\n]/.test(trimmedLeading)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function decodeBase64Prefix(b64: string, maxChars = 24): Uint8Array | null {
  try {
    const sliceLen = Math.min(b64.length, Math.ceil(maxChars / 4) * 4);
    const chunk = b64.slice(0, sliceLen);
    if (typeof atob === 'function') {
      const bin = atob(chunk);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return bytes;
    }
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(chunk, 'base64'));
    }
    return null;
  } catch {
    return null;
  }
}

function isValidFullBase64(b64: string): boolean {
  if (!b64 || b64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    return false;
  }
  try {
    if (typeof atob === 'function') {
      atob(b64);
      return true;
    }
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(b64, 'base64');
      return buf.length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Valida estrictamente firmas manuscritas en Data URL (solo PNG o JPEG, máx. 512 KB, magic bytes verificados).
 */
export function validateSignatureDataUrl(dataUrl: unknown): {
  valid: boolean;
  mimeType?: 'image/png' | 'image/jpeg';
  error?: string;
} {
  if (typeof dataUrl !== 'string') {
    return { valid: false, error: 'Firma gráfica no válida.' };
  }

  const trimmed = dataUrl.trim();
  const MAX_BYTES = 512 * 1024;
  if (trimmed.length === 0 || trimmed.length > MAX_BYTES * 1.4) {
    return { valid: false, error: 'La firma gráfica supera el límite máximo permitido (512 KB).' };
  }

  const match = trimmed.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return { valid: false, error: 'Solo se admiten firmas en formato binario PNG o JPEG.' };
  }

  const mimeType = match[1] as 'image/png' | 'image/jpeg';
  const b64 = match[2];

  if (!isValidFullBase64(b64)) {
    return { valid: false, error: 'La codificación base64 de la firma está corrupta.' };
  }

  const estimatedBytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  if (estimatedBytes < 32 || estimatedBytes > MAX_BYTES) {
    return { valid: false, error: 'El tamaño binario de la firma no es válido (máx. 512 KB).' };
  }

  const headerBytes = decodeBase64Prefix(b64, 16);
  if (!headerBytes || headerBytes.length < 4) {
    return { valid: false, error: 'No se pudo inspeccionar la cabecera binaria de la firma.' };
  }

  if (mimeType === 'image/png') {
    const isPng =
      headerBytes.length >= 8 &&
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47 &&
      headerBytes[4] === 0x0d &&
      headerBytes[5] === 0x0a &&
      headerBytes[6] === 0x1a &&
      headerBytes[7] === 0x0a;
    if (!isPng) {
      return { valid: false, error: 'La firma PNG no coincide con la cabecera binaria válida.' };
    }
  } else {
    const isJpeg =
      headerBytes[0] === 0xff &&
      headerBytes[1] === 0xd8 &&
      headerBytes[2] === 0xff;
    if (!isJpeg) {
      return { valid: false, error: 'La firma JPEG no coincide con la cabecera binaria válida.' };
    }
  }

  return { valid: true, mimeType };
}

/**
 * Resuelve la URL base canónica del sitio a partir de configuración allowlisted (nunca desde la cabecera Host).
 */
export function getSafeSiteBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ];
  const isDev = process.env.NODE_ENV === 'development';

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    try {
      const parsed = new URL(raw.trim());
      const host = parsed.hostname.toLowerCase();
      const isOfficialHost = host === 'voleibolsanpedro.es' || host === 'www.voleibolsanpedro.es';
      const isNetlifyHost = host.endsWith('.netlify.app');
      const isLocalDev = isDev && (host === 'localhost' || host === '127.0.0.1');

      if (parsed.protocol === 'https:' && (isOfficialHost || isNetlifyHost)) {
        return parsed.origin;
      }
      if (isLocalDev && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
        return parsed.origin;
      }
    } catch {
      // Ignorar URLs de entorno malformadas y evaluar siguiente candidato
    }
  }

  return 'https://voleibolsanpedro.es';
}
