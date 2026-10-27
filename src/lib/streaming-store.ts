/**
 * Almacén y persistencia de estado para retransmisiones en directo (streaming)
 * y grabaciones en diferido de partidos de YouTube en Neon (o fallback en memoria).
 */

export interface StreamingPayload {
  active: boolean;
  url: string | null;
  matchId?: string | null;
  matchTitle?: string | null;
  startedAt?: string;
}

export type MatchRecordingsMap = Record<string, string>;

const MATCH_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Valida de forma estricta identificadores de partidos para evitar inyecciones o claves anómalas.
 */
export function isValidMatchId(matchId: unknown): matchId is string {
  return typeof matchId === 'string' && MATCH_ID_REGEX.test(matchId);
}

/**
 * Valida de forma estricta que una URL corresponda a una emisión o vídeo de YouTube válido.
 */
export function isValidYouTubeUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }
  const trimmed = urlStr.trim();
  if (!trimmed) {
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

// Fallback en memoria en caso de desconexión o entorno local sin DATABASE_URL
let memoryStreamingState: StreamingPayload = {
  active: false,
  url: null,
  matchId: null,
  matchTitle: null,
};

let memoryRecordingsState: MatchRecordingsMap = {};

export async function queryNeon<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const hostMatch = connectionString.match(/@([^/:]+)/);
    if (!hostMatch || !hostMatch[1]) {
      console.warn('[StreamingStore] Host no válido en DATABASE_URL');
      return [];
    }
    const host = hostMatch[1];

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

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('[StreamingStore] Fallo al consultar Neon HTTP:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.rows as T[]) || [];
  } catch (err) {
    console.warn('[StreamingStore] Aviso conectando con Neon (usando memoria):', err);
    return [];
  }
}

/**
 * Obtiene el estado actual de la retransmisión en directo.
 */
export async function getStreamingStatus(): Promise<StreamingPayload> {
  try {
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
        const safeState: StreamingPayload = {
          active: !!parsed.active && !!safeUrl,
          url: safeUrl,
          matchId: parsed.matchId || null,
          matchTitle: parsed.matchTitle || null,
          startedAt: parsed.startedAt,
        };
        memoryStreamingState = safeState;
        return safeState;
      }
    }
  } catch (err) {
    console.warn('[StreamingStore] Error leyendo streaming:', err);
  }

  const fallbackUrl = isValidYouTubeUrl(memoryStreamingState.url) ? memoryStreamingState.url : null;
  return {
    ...memoryStreamingState,
    active: !!memoryStreamingState.active && !!fallbackUrl,
    url: fallbackUrl,
  };
}

/**
 * Guarda el estado actual de la retransmisión en directo.
 */
export async function setStreamingStatus(status: StreamingPayload): Promise<void> {
  memoryStreamingState = { ...status };
  try {
    await queryNeon(
      `INSERT INTO club_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
      ['streaming', JSON.stringify(status)]
    );
  } catch (err) {
    console.warn('[StreamingStore] Error guardando streaming en Neon:', err);
  }
}

/**
 * Obtiene el mapa de enlaces de YouTube para partidos grabados en diferido.
 * Devuelve un Record<matchId, youtubeUrl>.
 */
export async function getMatchRecordings(): Promise<MatchRecordingsMap> {
  try {
    const rows = await queryNeon<{ key: string; value: unknown }>(
      'SELECT value FROM club_settings WHERE key = $1 LIMIT 1;',
      ['match_recordings']
    );

    if (rows.length > 0 && rows[0].value) {
      const val = rows[0].value;
      const parsed =
        typeof val === 'string'
          ? (JSON.parse(val) as MatchRecordingsMap)
          : (val as MatchRecordingsMap);

      if (parsed && typeof parsed === 'object') {
        const cleaned: MatchRecordingsMap = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (isValidMatchId(k) && typeof v === 'string' && isValidYouTubeUrl(v)) {
            cleaned[k] = v;
          }
        }
        memoryRecordingsState = cleaned;
        return { ...cleaned };
      }
    }
  } catch (err) {
    console.warn('[StreamingStore] Error leyendo match_recordings:', err);
  }

  const cleanedFallback: MatchRecordingsMap = {};
  for (const [k, v] of Object.entries(memoryRecordingsState)) {
    if (isValidMatchId(k) && typeof v === 'string' && isValidYouTubeUrl(v)) {
      cleanedFallback[k] = v;
    }
  }
  return cleanedFallback;
}

/**
 * Asocia y persiste de forma permanente una grabación de YouTube a un partido.
 * Utiliza actualización atómica JSONB para evitar condiciones de carrera.
 */
export async function saveMatchRecording(matchId: string, url: string): Promise<MatchRecordingsMap> {
  if (!isValidMatchId(matchId)) {
    console.warn('[StreamingStore] matchId inválido para grabación:', matchId);
    return getMatchRecordings();
  }

  if (!isValidYouTubeUrl(url)) {
    console.warn('[StreamingStore] URL inválida de YouTube para grabación:', url);
    return getMatchRecordings();
  }

  const cleanUrl = url.trim();

  try {
    await queryNeon(
      `INSERT INTO club_settings (key, value, updated_at)
       VALUES ($1, jsonb_build_object($2::text, $3::text)::text, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = (COALESCE(club_settings.value::jsonb, '{}'::jsonb) || jsonb_build_object($2::text, $3::text))::text,
           updated_at = NOW();`,
      ['match_recordings', matchId, cleanUrl]
    );
  } catch (err) {
    console.warn('[StreamingStore] Error persistiendo grabación en Neon:', err);
  }

  memoryRecordingsState[matchId] = cleanUrl;
  return { ...memoryRecordingsState };
}
