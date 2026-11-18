/**
 * Sincronizador Oficial con ligaafade.es (Asociación Malagueña para la Promoción del Deporte - Liga AFADE)
 * Sincroniza con concurrencia paralela acotada, singleflight y snapshot compartido en Neon (`sports_cache`):
 * - Resultados y marcadores oficiales de las categorías del club en AFADE
 * - Calendario, horarios (interpretados en Europe/Madrid bajo TZ=UTC) y sedes de juego
 * - Tablas de clasificación oficiales actualizadas
 */

import {
  AFADE_CATEGORIES,
  AFADE_TEAMS,
  AFADE_MATCHES,
  AFADE_STANDINGS,
  AFADE_GROUPS_META,
} from './afade-data';
import type { FavbMatch, FavbStanding } from './favb-scraper';
import {
  formatMadridDateString,
  formatMadridTime,
  parseMadridDateTimeSafe,
} from './date-utils';
import { queryNeon } from './streaming-store';
import { sanitizeHttpsUrl } from './validators';

export interface AfadeSyncResult {
  success: boolean;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
  lastSync: number;
  fromCache?: boolean;
}

interface CacheState {
  lastSync: number;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
}

const CACHE_TTL_MS = 30 * 1000; // 30s de caché compartida
const MIN_FORCE_COOLDOWN_MS = 3 * 1000;
const SPORTS_CACHE_KEY = 'afade_sync_v1';

let cache: CacheState = {
  lastSync: 0,
  matches: [],
  standings: {},
};

let lastForceSyncTime = 0;
let inFlightAfadeSync: Promise<AfadeSyncResult> | null = null;

function resolveAfadeMatchDateIso(
  rawDate: string | null | undefined,
  status: string,
  baseFallback?: string
): string {
  if (rawDate && String(rawDate).trim()) {
    const parsed = parseMadridDateTimeSafe(String(rawDate).trim());
    if (parsed.getTime() > 0) {
      return parsed.toISOString();
    }
  }
  if (baseFallback) {
    return baseFallback;
  }
  return status === 'FINISHED' ? '2026-10-18T15:30:00.000Z' : '2026-11-01T12:00:00.000Z';
}

function buildSafeMapsUrl(rawOrQuery: string): string {
  const trimmed = rawOrQuery.trim();
  const safeUrl = sanitizeHttpsUrl(trimmed, '');
  if (safeUrl) {
    return safeUrl;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

async function readAfadeCacheFromNeon(): Promise<CacheState | null> {
  try {
    const rows = await queryNeon<{ payload_json: unknown; updated_at: string }>(
      'SELECT payload_json, updated_at FROM sports_cache WHERE cache_key = $1 LIMIT 1;',
      [SPORTS_CACHE_KEY]
    );
    if (!rows || rows.length === 0 || !rows[0].payload_json) {
      return null;
    }
    const rawPayload = rows[0].payload_json;
    const parsed =
      typeof rawPayload === 'string'
        ? (JSON.parse(rawPayload) as Partial<CacheState>)
        : (rawPayload as Partial<CacheState>);

    if (!parsed || !Array.isArray(parsed.matches) || !parsed.standings) {
      return null;
    }

    const updatedAtMs = rows[0].updated_at ? new Date(rows[0].updated_at).getTime() : 0;
    const lastSync =
      typeof parsed.lastSync === 'number' && parsed.lastSync > 0 ? parsed.lastSync : updatedAtMs;

    return {
      lastSync,
      matches: parsed.matches,
      standings: parsed.standings,
    };
  } catch {
    return null;
  }
}

async function writeAfadeCacheToNeon(state: CacheState): Promise<void> {
  try {
    await queryNeon(
      `INSERT INTO sports_cache (cache_key, payload_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (cache_key) DO UPDATE
       SET payload_json = EXCLUDED.payload_json, updated_at = NOW();`,
      [SPORTS_CACHE_KEY, JSON.stringify(state)]
    );
  } catch {
    // Lectura deportiva pública: si Neon falla puntualmente, mantenemos estado en memoria sin bloquear
  }
}

export function getConsolidatedAfadeMatches(): FavbMatch[] {
  const teamMap = new Map(AFADE_TEAMS.map((t) => [t.id, t]));
  const catMap = new Map(AFADE_CATEGORIES.map((c) => [c.id, c]));

  return AFADE_MATCHES.map((m) => {
    const team = teamMap.get(m.teamId);
    const category = team ? catMap.get(team.categoryId) : undefined;

    return {
      id: m.id,
      favbId: m.id,
      afadeId: m.id.replace(/^afade-/, ''),
      teamId: m.teamId,
      competitionCode: team?.division || 'AFADE',
      competitionName: 'Liga AFADE Málaga',
      categoryId: category?.id,
      categoryName: category?.name || 'Categoría AFADE',
      round: m.round,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      matchDate: m.matchDate,
      dateStr: formatMadridDateString(m.matchDate),
      timeStr: formatMadridTime(m.matchDate),
      venue: m.venueName,
      locality: m.locality,
      googleMapsUrl: m.googleMapsUrl ? sanitizeHttpsUrl(m.googleMapsUrl, '') || undefined : undefined,
      status: m.status,
      statusText: m.statusText,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      setScores: m.setScores,
      isClubHome: m.isClubHome,
      favbUrl: sanitizeHttpsUrl(m.favbMatchUrl, 'https://ligaafade.es/'),
      association: 'AFADE' as const,
    };
  });
}

export function getConsolidatedAfadeStandings(): Record<string, FavbStanding[]> {
  const map: Record<string, FavbStanding[]> = {};
  for (const cat of AFADE_CATEGORIES) {
    const rows = AFADE_STANDINGS.filter((s) => s.categoryId === cat.id);
    map[cat.id] = rows.map((r, idx) => ({
      pos: idx + 1,
      team: r.teamName,
      pts: r.points,
      pj: r.played,
      pg: r.won,
      pp: r.lost,
      pg3: r.pg3 ?? 0,
      pg2: r.pg2 ?? 0,
      pp1: r.pp1 ?? 0,
      pp0: r.pp0 ?? 0,
      sf: r.setsFor,
      sc: r.setsAgainst,
      cs: r.setCoef ?? (r.setsAgainst > 0 ? Number((r.setsFor / r.setsAgainst).toFixed(3)) : r.setsFor),
      pf: r.pointsFor ?? 0,
      pc: r.pointsAgainst ?? 0,
      cp:
        r.pointCoef ??
        ((r.pointsAgainst ?? 0) > 0
          ? Number(((r.pointsFor ?? 0) / (r.pointsAgainst ?? 1)).toFixed(3))
          : (r.pointsFor ?? 0)),
      isCurrentClub: r.isCurrentClub,
    }));
  }
  return map;
}

/**
 * Lee el snapshot más rápido disponible (memoria -> Neon sports_cache -> baseline)
 * sin disparar peticiones HTTP externas hacia ligaafade.es.
 */
export async function getFastAfadeSnapshot(): Promise<CacheState> {
  if (cache.matches.length > 0) {
    return cache;
  }
  const neonSnapshot = await readAfadeCacheFromNeon();
  if (neonSnapshot && neonSnapshot.matches.length > 0) {
    cache = neonSnapshot;
    return cache;
  }
  return {
    lastSync: 0,
    matches: getConsolidatedAfadeMatches(),
    standings: getConsolidatedAfadeStandings(),
  };
}

/**
 * Consulta la API pública de AFADE para un grupo dado
 */
async function fetchAfadeJson<T>(path: string): Promise<T | null> {
  const url = `https://ligaafade.es${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(6500) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[AFADE Client] Error consultando ${url}:`, error);
    return null;
  }
}

interface RawAfadeMatch {
  g_id: number;
  j_numero: number;
  equipo_local_nombre_publico?: string | null;
  equipo_visitante_nombre_publico?: string | null;
  fecha_celebracion?: string | null;
  sede_nombre?: string | null;
  sede_direccion?: string | null;
  estado?: number | null;
  marcador_local?: number | null;
  marcador_visitante?: number | null;
}

interface RawAfadeStanding {
  posicion: number;
  equipo_nombre: string;
  j: number;
  g: number;
  p: number;
  favor: number;
  contra: number;
  pf?: number;
  pc?: number;
  puntos: number;
}

/**
 * Sincroniza clasificaciones y partidos de todas las categorías del club en Liga AFADE
 * ejecutando los 3 grupos en paralelo con singleflight y snapshot compartido en Neon.
 */
export async function syncAfadeData(force = false): Promise<AfadeSyncResult> {
  const now = Date.now();

  if (force) {
    if (now - lastForceSyncTime < MIN_FORCE_COOLDOWN_MS && cache.matches.length > 0) {
      return {
        success: true,
        matches: cache.matches,
        standings: cache.standings,
        lastSync: cache.lastSync,
        fromCache: true,
      };
    }
  } else if (now - cache.lastSync < CACHE_TTL_MS && cache.matches.length > 0) {
    return {
      success: true,
      matches: cache.matches,
      standings: cache.standings,
      lastSync: cache.lastSync,
      fromCache: true,
    };
  }

  // Consultar snapshot compartido en Neon antes de lanzar scraping externo
  const neonCached = await readAfadeCacheFromNeon();
  if (neonCached && neonCached.matches.length > 0) {
    const ageMs = now - neonCached.lastSync;
    if ((force && ageMs < MIN_FORCE_COOLDOWN_MS) || (!force && ageMs < CACHE_TTL_MS)) {
      cache = neonCached;
      return {
        success: true,
        matches: cache.matches,
        standings: cache.standings,
        lastSync: cache.lastSync,
        fromCache: true,
      };
    }
  }

  if (inFlightAfadeSync) {
    return inFlightAfadeSync;
  }

  if (force) {
    lastForceSyncTime = now;
  }

  inFlightAfadeSync = (async (): Promise<AfadeSyncResult> => {
    try {
      const baselineMatches = getConsolidatedAfadeMatches();
      const baselineStandings = getConsolidatedAfadeStandings();

      const syncedMatchesByCat = new Map<string, FavbMatch[]>();
      const syncedStandings: Record<string, FavbStanding[]> = {};

      // Consultar los 3 grupos de Liga AFADE en paralelo (elimina esperas secuenciales de ~19.5s)
      await Promise.allSettled(
        AFADE_GROUPS_META.map(async (group) => {
          const [rawClasif, rawMatches] = await Promise.all([
            fetchAfadeJson<RawAfadeStanding[]>(`/open/api/clasificaciones/grupo/${group.gid}`),
            fetchAfadeJson<RawAfadeMatch[]>(`/open/api/partidos/resultados/${group.gid}`),
          ]);

          const splitByTeam = new Map<string, { pg3: number; pg2: number; pp1: number; pp0: number }>();
          if (Array.isArray(rawMatches)) {
            for (const m of rawMatches) {
              const ml = m.marcador_local;
              const mv = m.marcador_visitante;
              const loc = (m.equipo_local_nombre_publico || '').trim().toLowerCase();
              const vis = (m.equipo_visitante_nombre_publico || '').trim().toLowerCase();
              if (
                loc &&
                vis &&
                ml !== null &&
                ml !== undefined &&
                mv !== null &&
                mv !== undefined &&
                (ml > 0 || mv > 0)
              ) {
                if (!splitByTeam.has(loc)) splitByTeam.set(loc, { pg3: 0, pg2: 0, pp1: 0, pp0: 0 });
                if (!splitByTeam.has(vis)) splitByTeam.set(vis, { pg3: 0, pg2: 0, pp1: 0, pp0: 0 });
                const sLoc = splitByTeam.get(loc)!;
                const sVis = splitByTeam.get(vis)!;
                if (ml > mv) {
                  if (mv <= 1) {
                    sLoc.pg3++;
                    sVis.pp0++;
                  } else {
                    sLoc.pg2++;
                    sVis.pp1++;
                  }
                } else if (mv > ml) {
                  if (ml <= 1) {
                    sVis.pg3++;
                    sLoc.pp0++;
                  } else {
                    sVis.pg2++;
                    sLoc.pp1++;
                  }
                }
              }
            }
          }

          if (Array.isArray(rawClasif) && rawClasif.length > 0) {
            syncedStandings[group.categoryId] = rawClasif.map((r, idx) => {
              const cleanTeam = (r.equipo_nombre || '').trim();
              const split = splitByTeam.get(cleanTeam.toLowerCase()) || {
                pg3: 0,
                pg2: 0,
                pp1: 0,
                pp0: 0,
              };
              const sf = r.favor ?? 0;
              const sc = r.contra ?? 0;
              const pf = r.pf ?? 0;
              const pc = r.pc ?? 0;
              return {
                pos: r.posicion || idx + 1,
                team: cleanTeam,
                pts: r.puntos ?? 0,
                pj: r.j ?? 0,
                pg: r.g ?? 0,
                pp: r.p ?? 0,
                pg3: split.pg3,
                pg2: split.pg2,
                pp1: split.pp1,
                pp0: split.pp0,
                sf,
                sc,
                cs: sc > 0 ? Number((sf / sc).toFixed(3)) : sf,
                pf,
                pc,
                cp: pc > 0 ? Number((pf / pc).toFixed(3)) : pf,
                isCurrentClub: cleanTeam.toLowerCase().includes('san pedro'),
              };
            });
          } else {
            syncedStandings[group.categoryId] = baselineStandings[group.categoryId] || [];
          }

          const groupMatches: FavbMatch[] = [];
          if (Array.isArray(rawMatches) && rawMatches.length > 0) {
            const spMatches = rawMatches.filter((p) => {
              const text = `${p.equipo_local_nombre_publico || ''} ${p.equipo_visitante_nombre_publico || ''}`.toLowerCase();
              return text.includes('san pedro');
            });

            for (const p of spMatches) {
              const jNum = p.j_numero || 1;
              const matchId = `afade-${group.gid}-j${jNum}`;
              const locRaw = (p.equipo_local_nombre_publico || '').trim();
              const visRaw = (p.equipo_visitante_nombre_publico || '').trim();
              const isClubHome = locRaw.toLowerCase().includes('san pedro');

              const homeTeam = locRaw || 'CD Voleibol San Pedro';
              const awayTeam = visRaw || (isClubHome ? '(Descansa)' : 'CD Voleibol San Pedro');

              let status: 'SCHEDULED' | 'FINISHED' | 'LIVE' | 'POSTPONED' | 'CANCELLED' = 'SCHEDULED';
              let statusText = 'Programado';

              const ml = p.marcador_local;
              const mv = p.marcador_visitante;

              if (
                p.estado === 1 ||
                (ml !== null && ml !== undefined && mv !== null && mv !== undefined && (ml > 0 || mv > 0))
              ) {
                status = 'FINISHED';
                statusText = 'Finalizado';
              }

              const baseMatch = baselineMatches.find((bm) => bm.id === matchId);
              const matchDateIso = resolveAfadeMatchDateIso(
                p.fecha_celebracion,
                status,
                baseMatch?.matchDate
              );

              let venue =
                p.sede_nombre ||
                (isClubHome ? 'Pabellón de Deportes Sergio Scariolo' : 'Sede por confirmar');
              if (p.sede_direccion) {
                venue = `${venue} (${p.sede_direccion})`;
              }
              const locality = baseMatch?.locality || (isClubHome ? 'Marbella' : 'Málaga');
              const googleMapsUrl = buildSafeMapsUrl(
                baseMatch?.googleMapsUrl || `${venue}, ${locality}`
              );

              // No sintetizamos parciales ficticios cuando la API oficial AFADE no los publica
              groupMatches.push({
                id: matchId,
                favbId: matchId,
                afadeId: matchId.replace(/^afade-/, ''),
                teamId: group.teamId,
                competitionCode: 'AFADE',
                competitionName: 'Liga AFADE Málaga',
                categoryId: group.categoryId,
                categoryName: group.name,
                round: jNum,
                homeTeam,
                awayTeam,
                matchDate: matchDateIso,
                dateStr: formatMadridDateString(matchDateIso),
                timeStr: formatMadridTime(matchDateIso),
                venue,
                locality,
                googleMapsUrl,
                status,
                statusText,
                homeScore: ml ?? undefined,
                awayScore: mv ?? undefined,
                setScores: undefined,
                isClubHome,
                favbUrl: `https://ligaafade.es/resultados?deporte=8&fase=${group.fid}&grupo=${group.gid}`,
                association: 'AFADE',
                lastChecked: new Date().toISOString(),
              });
            }
          }

          if (groupMatches.length > 0) {
            syncedMatchesByCat.set(group.categoryId, groupMatches);
          } else {
            syncedMatchesByCat.set(
              group.categoryId,
              baselineMatches.filter((m) => m.categoryId === group.categoryId)
            );
          }
        })
      );

      const syncedMatches = AFADE_GROUPS_META.flatMap(
        (g) => syncedMatchesByCat.get(g.categoryId) || []
      );

      const completedAt = Date.now();
      cache = {
        lastSync: completedAt,
        matches: syncedMatches.length > 0 ? syncedMatches : baselineMatches,
        standings: Object.keys(syncedStandings).length > 0 ? syncedStandings : baselineStandings,
      };

      if (force) {
        lastForceSyncTime = completedAt;
      }

      await writeAfadeCacheToNeon(cache);

      return {
        success: true,
        matches: cache.matches,
        standings: cache.standings,
        lastSync: cache.lastSync,
        fromCache: false,
      };
    } finally {
      inFlightAfadeSync = null;
    }
  })();

  return inFlightAfadeSync;
}

/**
 * Actualiza un partido individual de AFADE (por ejemplo al hacer click en el botón de sync de tarjeta)
 */
export async function updateAfadeMatchLiveScore(matchId: string): Promise<{
  success: boolean;
  match?: FavbMatch;
  error?: string;
}> {
  const matchParts = matchId.match(/^afade-(\d+)-j(\d+)$/);
  if (!matchParts) {
    return { success: false, error: 'Identificador de partido AFADE inválido' };
  }

  const gid = parseInt(matchParts[1], 10);
  const jNum = parseInt(matchParts[2], 10);

  const groupMeta = AFADE_GROUPS_META.find((g) => g.gid === gid);
  if (!groupMeta) {
    return { success: false, error: 'Grupo de competición AFADE no encontrado' };
  }

  const rawMatches = await fetchAfadeJson<RawAfadeMatch[]>(
    `/open/api/partidos/resultados/${gid}`
  );

  if (!Array.isArray(rawMatches)) {
    const fastSnap = await getFastAfadeSnapshot();
    const foundInCache = fastSnap.matches.find((m) => m.id === matchId);
    if (foundInCache) return { success: true, match: foundInCache };
    return { success: false, error: 'Error al consultar el marcador en ligaafade.es' };
  }

  const targetRaw = rawMatches.find(
    (p) =>
      p.j_numero === jNum &&
      `${p.equipo_local_nombre_publico || ''} ${p.equipo_visitante_nombre_publico || ''}`
        .toLowerCase()
        .includes('san pedro')
  );

  if (!targetRaw) {
    return { success: false, error: 'Partido no encontrado en la jornada oficial de AFADE' };
  }

  const locRaw = (targetRaw.equipo_local_nombre_publico || '').trim();
  const visRaw = (targetRaw.equipo_visitante_nombre_publico || '').trim();
  const isClubHome = locRaw.toLowerCase().includes('san pedro');
  const homeTeam = locRaw || 'CD Voleibol San Pedro';
  const awayTeam = visRaw || (isClubHome ? '(Descansa)' : 'CD Voleibol San Pedro');

  let status: 'SCHEDULED' | 'FINISHED' | 'LIVE' | 'POSTPONED' | 'CANCELLED' = 'SCHEDULED';
  let statusText = 'Programado';
  const ml = targetRaw.marcador_local;
  const mv = targetRaw.marcador_visitante;

  if (
    targetRaw.estado === 1 ||
    (ml !== null && ml !== undefined && mv !== null && mv !== undefined && (ml > 0 || mv > 0))
  ) {
    status = 'FINISHED';
    statusText = 'Finalizado';
  }

  const baseMatch = getConsolidatedAfadeMatches().find((bm) => bm.id === matchId);
  const matchDateIso = resolveAfadeMatchDateIso(
    targetRaw.fecha_celebracion,
    status,
    baseMatch?.matchDate
  );

  let venue =
    targetRaw.sede_nombre ||
    (isClubHome ? 'Pabellón de Deportes Sergio Scariolo' : 'Sede por confirmar');
  if (targetRaw.sede_direccion) {
    venue = `${venue} (${targetRaw.sede_direccion})`;
  }
  const locality = baseMatch?.locality || (isClubHome ? 'Marbella' : 'Málaga');
  const googleMapsUrl = buildSafeMapsUrl(
    baseMatch?.googleMapsUrl || `${venue}, ${locality}`
  );

  const updatedMatch: FavbMatch = {
    id: matchId,
    favbId: matchId,
    afadeId: matchId.replace(/^afade-/, ''),
    teamId: groupMeta.teamId,
    competitionCode: 'AFADE',
    competitionName: 'Liga AFADE Málaga',
    categoryId: groupMeta.categoryId,
    categoryName: groupMeta.name,
    round: jNum,
    homeTeam,
    awayTeam,
    matchDate: matchDateIso,
    dateStr: formatMadridDateString(matchDateIso),
    timeStr: formatMadridTime(matchDateIso),
    venue,
    locality,
    googleMapsUrl,
    status,
    statusText,
    homeScore: ml ?? undefined,
    awayScore: mv ?? undefined,
    setScores: undefined,
    isClubHome,
    favbUrl: `https://ligaafade.es/resultados?deporte=8&fase=${groupMeta.fid}&grupo=${groupMeta.gid}`,
    association: 'AFADE',
    lastChecked: new Date().toISOString(),
  };

  const idx = cache.matches.findIndex((m) => m.id === matchId);
  if (idx !== -1) {
    cache.matches[idx] = updatedMatch;
  } else {
    cache.matches.push(updatedMatch);
  }

  return { success: true, match: updatedMatch };
}
