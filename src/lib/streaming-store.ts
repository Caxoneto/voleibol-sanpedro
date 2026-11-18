/**
 * Cliente HTTP fail-closed para Neon PostgreSQL y almacén de estado
 * para retransmisiones en directo y grabaciones en diferido.
 */

export class NeonUnavailableError extends Error {
  public readonly statusCode: number;

  constructor(message = 'Base de datos no disponible temporalmente.', statusCode = 503) {
    super(message);
    this.name = 'NeonUnavailableError';
    this.statusCode = statusCode;
  }
}

export interface StreamingPayload {
  active: boolean;
  url: string | null;
  matchId?: string | null;
  matchTitle?: string | null;
  startedAt?: string;
}

export type MatchRecordingsMap = Record<string, string>;

const MATCH_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const NEON_TIMEOUT_MS = 6500;

/**
 * Valida de forma estricta identificadores de partidos para evitar inyecciones o claves anómalas.
 */
export function isValidMatchId(matchId: unknown): matchId is string {
  return typeof matchId === 'string' && MATCH_ID_REGEX.test(matchId);
}

/**
 * Valida de forma estricta que una URL corresponda a una emisión o vídeo de YouTube sobre HTTPS.
 */
export function isValidYouTubeUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }
  const trimmed = urlStr.trim();
  if (!trimmed || /[\r\n\0\t]/.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    const validHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
    if (!validHosts.includes(host)) {
      return false;
    }
    if (host === 'youtu.be') {
      return parsed.pathname.length > 1;
    }
    return (
      parsed.pathname.startsWith('/watch') ||
      parsed.pathname.startsWith('/live') ||
      parsed.pathname.startsWith('/embed') ||
      parsed.pathname.startsWith('/shorts')
    );
  } catch {
    return false;
  }
}

/**
 * Ejecuta una consulta parametrizada contra Neon HTTP /sql con comportamiento estrictamente fail-closed.
 * Nunca silencia fallos de conexión, timeouts ni errores HTTP >= 400.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryNeon<T = any>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new NeonUnavailableError('DATABASE_URL no está configurada en el servidor.');
  }

  const hostMatch = connectionString.match(/@([^/:?#]+)/);
  if (!hostMatch || !hostMatch[1]) {
    throw new NeonUnavailableError('Host no válido en DATABASE_URL.');
  }
  const host = hostMatch[1];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEON_TIMEOUT_MS);

  try {
    const res = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connectionString,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, params }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorPreview = await res.text().catch(() => '');
      console.error('[Neon] Error HTTP en consulta SQL:', res.status, errorPreview.slice(0, 200));
      throw new NeonUnavailableError(`Error en base de datos (${res.status}).`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.rows)) {
      throw new NeonUnavailableError('Respuesta inesperada del motor de base de datos.');
    }
    return data.rows as T[];
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[Neon] Timeout (${NEON_TIMEOUT_MS}ms) ejecutando consulta.`);
      throw new NeonUnavailableError('Tiempo de espera agotado conectando con la base de datos.');
    }
    console.error('[Neon] Error de red o parseo conectando con Neon:', err);
    throw new NeonUnavailableError('No se pudo conectar con la base de datos.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Obtiene el estado actual de la retransmisión en directo desde Neon (fail-closed si la BBDD falla).
 */
export async function getStreamingStatus(): Promise<StreamingPayload> {
  const rows = await queryNeon<{ key: string; value: unknown }>(
    'SELECT value FROM club_settings WHERE key = $1 LIMIT 1;',
    ['streaming']
  );

  if (rows.length > 0 && rows[0].value) {
    const val = rows[0].value;
    const parsed =
      typeof val === 'string'
        ? (JSON.parse(val) as StreamingPayload)
        : (val as StreamingPayload);

    if (parsed && typeof parsed === 'object') {
      const safeUrl = isValidYouTubeUrl(parsed.url) ? parsed.url : null;
      return {
        active: !!parsed.active && !!safeUrl,
        url: safeUrl,
        matchId: parsed.matchId && isValidMatchId(parsed.matchId) ? parsed.matchId : null,
        matchTitle: typeof parsed.matchTitle === 'string' ? parsed.matchTitle : null,
        startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : undefined,
      };
    }
  }

  return {
    active: false,
    url: null,
    matchId: null,
    matchTitle: null,
  };
}

/**
 * Alias de compatibilidad para lectura de configuración de streaming.
 */
export const getStreamingConfig = getStreamingStatus;

/**
 * Guarda de forma persistente el estado actual de la retransmisión en Neon (sin fallback silencioso).
 */
export async function setStreamingStatus(status: StreamingPayload): Promise<void> {
  if (status.matchId && !isValidMatchId(status.matchId)) {
    throw new Error('Identificador de partido inválido para retransmisión.');
  }
  if (status.active && !isValidYouTubeUrl(status.url)) {
    throw new Error('Se requiere una URL HTTPS válida de YouTube para activar el streaming.');
  }
  if (status.url && !isValidYouTubeUrl(status.url)) {
    throw new Error('URL de YouTube no válida.');
  }

  const sanitizedStatus: StreamingPayload = {
    active: !!status.active && isValidYouTubeUrl(status.url),
    url: status.url ? status.url.trim() : null,
    matchId: status.matchId || null,
    matchTitle: status.matchTitle ? status.matchTitle.replace(/[\r\n\0]+/g, ' ').trim().slice(0, 160) : null,
    startedAt: status.startedAt,
  };

  await queryNeon(
    `INSERT INTO club_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
    ['streaming', JSON.stringify(sanitizedStatus)]
  );
}

function sanitizeRecordingsObject(raw: unknown): MatchRecordingsMap {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned: MatchRecordingsMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isValidMatchId(k) && typeof v === 'string' && isValidYouTubeUrl(v)) {
      cleaned[k] = v.trim();
    }
  }
  return cleaned;
}

/**
 * Obtiene el mapa de enlaces de YouTube para partidos grabados en diferido desde Neon.
 */
export async function getMatchRecordings(): Promise<MatchRecordingsMap> {
  const rows = await queryNeon<{ key: string; value: unknown }>(
    'SELECT value FROM club_settings WHERE key = $1 LIMIT 1;',
    ['match_recordings']
  );

  if (rows.length > 0 && rows[0].value) {
    const val = rows[0].value;
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return sanitizeRecordingsObject(parsed);
  }

  return {};
}

/**
 * Asocia y persiste de forma permanente y atómica una grabación de YouTube a un partido en Neon.
 */
export async function saveMatchRecording(matchId: string, url: string): Promise<MatchRecordingsMap> {
  if (!isValidMatchId(matchId)) {
    throw new Error('Identificador de partido inválido para grabación.');
  }

  if (!isValidYouTubeUrl(url)) {
    throw new Error('La URL de grabación debe ser una URL HTTPS válida de YouTube.');
  }

  const cleanUrl = url.trim();

  const rows = await queryNeon<{ value: unknown }>(
    `INSERT INTO club_settings (key, value, updated_at)
     VALUES ($1, jsonb_build_object($2::text, $3::text)::text, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = (COALESCE(club_settings.value::jsonb, '{}'::jsonb) || jsonb_build_object($2::text, $3::text))::text,
         updated_at = NOW()
     RETURNING value;`,
    ['match_recordings', matchId, cleanUrl]
  );

  if (rows.length > 0 && rows[0].value) {
    const parsed = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    return sanitizeRecordingsObject(parsed);
  }

  return getMatchRecordings();
}
