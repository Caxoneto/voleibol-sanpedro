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
    const host = hostMatch ? hostMatch[1] : 'ep-dark-term-b40s456o-pooler.c-6.us-east-2.aws.neon.tech';

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
        memoryStreamingState = parsed;
        return {
          active: !!parsed.active,
          url: parsed.url || null,
          matchId: parsed.matchId || null,
          matchTitle: parsed.matchTitle || null,
          startedAt: parsed.startedAt,
        };
      }
    }
  } catch (err) {
    console.warn('[StreamingStore] Error leyendo streaming:', err);
  }

  return { ...memoryStreamingState };
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
        memoryRecordingsState = parsed;
        return { ...parsed };
      }
    }
  } catch (err) {
    console.warn('[StreamingStore] Error leyendo match_recordings:', err);
  }

  return { ...memoryRecordingsState };
}

/**
 * Asocia y persiste de forma permanente una grabación de YouTube a un partido.
 */
export async function saveMatchRecording(matchId: string, url: string): Promise<MatchRecordingsMap> {
  const current = await getMatchRecordings();
  const updated = {
    ...current,
    [matchId]: url,
  };

  memoryRecordingsState = updated;

  try {
    await queryNeon(
      `INSERT INTO club_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
      ['match_recordings', JSON.stringify(updated)]
    );
  } catch (err) {
    console.warn('[StreamingStore] Error persistiendo grabación en Neon:', err);
  }

  return updated;
}
