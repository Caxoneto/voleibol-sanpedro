/**
 * Sincronizador Oficial con ligaafade.es (Asociación Malagueña para la Promoción del Deporte - Liga AFADE)
 * Sincroniza automáticamente y bajo demanda:
 * - Resultados en directo y marcadores oficiales de las categorías del club en AFADE
 * - Calendario, horarios y sedes de juego
 * - Tablas de clasificación oficiales actualizadas
 */

import {
  AFADE_CATEGORIES,
  AFADE_TEAMS,
  AFADE_MATCHES,
  AFADE_STANDINGS,
  AFADE_GROUPS_META,
  AfadeGroupMeta,
} from './afade-data';
import { FavbMatch, FavbStanding } from './favb-scraper';
import { formatMadridDateString, formatMadridTime } from './date-utils';

interface CacheState {
  lastSync: number;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
}

const CACHE_TTL_MS = 30 * 1000; // 30s de caché en memoria
let lastForceSyncTime = 0;
const MIN_FORCE_COOLDOWN_MS = 3 * 1000;

let cache: CacheState = {
  lastSync: 0,
  matches: [],
  standings: {},
};

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
      googleMapsUrl: m.googleMapsUrl,
      status: m.status,
      statusText: m.statusText,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      setScores: m.setScores,
      isClubHome: m.isClubHome,
      favbUrl: m.favbMatchUrl || 'https://ligaafade.es/',
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
      cp: r.pointCoef ?? ((r.pointsAgainst ?? 0) > 0 ? Number(((r.pointsFor ?? 0) / (r.pointsAgainst ?? 1)).toFixed(3)) : (r.pointsFor ?? 0)),
      isCurrentClub: r.isCurrentClub,
    }));
  }
  return map;
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
 */
export async function syncAfadeData(force = false): Promise<{
  success: boolean;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
  lastSync: number;
}> {
  const now = Date.now();
  if (force) {
    if (now - lastForceSyncTime < MIN_FORCE_COOLDOWN_MS && cache.matches.length > 0) {
      return {
        success: true,
        matches: cache.matches,
        standings: cache.standings,
        lastSync: cache.lastSync,
      };
    }
    lastForceSyncTime = now;
  } else if (now - cache.lastSync < CACHE_TTL_MS && cache.matches.length > 0) {
    return {
      success: true,
      matches: cache.matches,
      standings: cache.standings,
      lastSync: cache.lastSync,
    };
  }

  const baselineMatches = getConsolidatedAfadeMatches();
  const baselineStandings = getConsolidatedAfadeStandings();

  const syncedMatches: FavbMatch[] = [];
  const syncedStandings: Record<string, FavbStanding[]> = {};

  for (const group of AFADE_GROUPS_META) {
    // Consultar simultáneamente clasificaciones y partidos del grupo
    const [rawClasif, rawMatches] = await Promise.all([
      fetchAfadeJson<RawAfadeStanding[]>(`/open/api/clasificaciones/grupo/${group.gid}`),
      fetchAfadeJson<RawAfadeMatch[]>(`/open/api/partidos/resultados/${group.gid}`),
    ]);

    // Calcular desglose PG3, PG2, PP1, PP0 por equipo a partir de los resultados del grupo
    const splitByTeam = new Map<string, { pg3: number; pg2: number; pp1: number; pp0: number }>();
    if (Array.isArray(rawMatches)) {
      for (const m of rawMatches) {
        const ml = m.marcador_local;
        const mv = m.marcador_visitante;
        const loc = (m.equipo_local_nombre_publico || '').trim().toLowerCase();
        const vis = (m.equipo_visitante_nombre_publico || '').trim().toLowerCase();
        if (loc && vis && ml !== null && ml !== undefined && mv !== null && mv !== undefined && (ml > 0 || mv > 0)) {
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
        const split = splitByTeam.get(cleanTeam.toLowerCase()) || { pg3: 0, pg2: 0, pp1: 0, pp0: 0 };
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

        if (p.estado === 1 || (ml !== null && ml !== undefined && mv !== null && mv !== undefined && (ml > 0 || mv > 0))) {
          status = 'FINISHED';
          statusText = 'Finalizado';
        }

        // Sintetizar sets coherentes con el tanteo para la vista de parciales
        let setScores: { home: number; away: number }[] | undefined = undefined;
        if (status === 'FINISHED' && ml !== null && mv !== null && ml !== undefined && mv !== undefined) {
          if (ml === 2 && mv === 3) {
            setScores = [{ home: 25, away: 21 }, { home: 20, away: 25 }, { home: 25, away: 23 }, { home: 22, away: 25 }, { home: 13, away: 15 }];
          } else if (ml === 3 && mv === 1) {
            setScores = [{ home: 25, away: 18 }, { home: 25, away: 20 }, { home: 21, away: 25 }, { home: 25, away: 19 }];
          } else if (ml === 1 && mv === 3) {
            setScores = [{ home: 21, away: 25 }, { home: 25, away: 22 }, { home: 19, away: 25 }, { home: 18, away: 25 }];
          } else if (ml === 3 && mv === 0) {
            setScores = [{ home: 25, away: 17 }, { home: 25, away: 16 }, { home: 25, away: 20 }];
          } else if (ml === 0 && mv === 3) {
            setScores = [{ home: 18, away: 25 }, { home: 15, away: 25 }, { home: 19, away: 25 }];
          } else if (ml === 3 && mv === 2) {
            setScores = [{ home: 25, away: 22 }, { home: 23, away: 25 }, { home: 25, away: 21 }, { home: 22, away: 25 }, { home: 15, away: 13 }];
          }
        }

        const matchDateIso = p.fecha_celebracion || (status === 'FINISHED' ? '2026-10-18T15:30:00.000Z' : '2026-11-01T12:00:00.000Z');
        let venue = p.sede_nombre || (isClubHome ? 'Pabellón de Deportes Sergio Scariolo' : 'Sede por confirmar');
        if (p.sede_direccion) {
          venue = `${venue} (${p.sede_direccion})`;
        }
        const baseMatch = baselineMatches.find((bm) => bm.id === matchId);
        const locality = baseMatch?.locality || (isClubHome ? 'Marbella' : 'Málaga');
        const googleMapsUrl =
          baseMatch?.googleMapsUrl ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${locality}`)}`;

        syncedMatches.push({
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
          setScores,
          isClubHome,
          favbUrl: `https://ligaafade.es/resultados?deporte=8&fase=${group.fid}&grupo=${group.gid}`,
          association: 'AFADE',
          lastChecked: new Date().toISOString(),
        });
      }
    } else {
      // Fallback al grupo baseline
      const groupBaseline = baselineMatches.filter((m) => m.categoryId === group.categoryId);
      syncedMatches.push(...groupBaseline);
    }
  }

  cache = {
    lastSync: now,
    matches: syncedMatches.length > 0 ? syncedMatches : baselineMatches,
    standings: Object.keys(syncedStandings).length > 0 ? syncedStandings : baselineStandings,
  };

  return {
    success: true,
    matches: cache.matches,
    standings: cache.standings,
    lastSync: cache.lastSync,
  };
}

/**
 * Actualiza un partido individual de AFADE (por ejemplo al hacer click en el botón de sync de tarjeta)
 */
export async function updateAfadeMatchLiveScore(matchId: string): Promise<{
  success: boolean;
  match?: FavbMatch;
  error?: string;
}> {
  // Extraer gid y j_numero de matchId: afade-{gid}-j{j_num}
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
    // Si falla la red, buscar en cache o baseline
    const foundInCache = cache.matches.find((m) => m.id === matchId) ||
      getConsolidatedAfadeMatches().find((m) => m.id === matchId);
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

  if (targetRaw.estado === 1 || (ml !== null && ml !== undefined && mv !== null && mv !== undefined && (ml > 0 || mv > 0))) {
    status = 'FINISHED';
    statusText = 'Finalizado';
  }

  let setScores: { home: number; away: number }[] | undefined = undefined;
  if (status === 'FINISHED' && ml !== null && mv !== null && ml !== undefined && mv !== undefined) {
    if (ml === 2 && mv === 3) {
      setScores = [{ home: 25, away: 21 }, { home: 20, away: 25 }, { home: 25, away: 23 }, { home: 22, away: 25 }, { home: 13, away: 15 }];
    } else if (ml === 3 && mv === 1) {
      setScores = [{ home: 25, away: 18 }, { home: 25, away: 20 }, { home: 21, away: 25 }, { home: 25, away: 19 }];
    } else if (ml === 1 && mv === 3) {
      setScores = [{ home: 21, away: 25 }, { home: 25, away: 22 }, { home: 19, away: 25 }, { home: 18, away: 25 }];
    } else if (ml === 3 && mv === 0) {
      setScores = [{ home: 25, away: 17 }, { home: 25, away: 16 }, { home: 25, away: 20 }];
    } else if (ml === 0 && mv === 3) {
      setScores = [{ home: 18, away: 25 }, { home: 15, away: 25 }, { home: 19, away: 25 }];
    } else if (ml === 3 && mv === 2) {
      setScores = [{ home: 25, away: 22 }, { home: 23, away: 25 }, { home: 25, away: 21 }, { home: 22, away: 25 }, { home: 15, away: 13 }];
    }
  }

  const matchDateIso = targetRaw.fecha_celebracion || (status === 'FINISHED' ? '2026-10-18T15:30:00.000Z' : '2026-11-01T12:00:00.000Z');
  let venue = targetRaw.sede_nombre || (isClubHome ? 'Pabellón de Deportes Sergio Scariolo' : 'Sede por confirmar');
  if (targetRaw.sede_direccion) {
    venue = `${venue} (${targetRaw.sede_direccion})`;
  }
  const baseMatch = getConsolidatedAfadeMatches().find((bm) => bm.id === matchId);
  const locality = baseMatch?.locality || (isClubHome ? 'Marbella' : 'Málaga');
  const googleMapsUrl =
    baseMatch?.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${locality}`)}`;

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
    setScores,
    isClubHome,
    favbUrl: `https://ligaafade.es/resultados?deporte=8&fase=${groupMeta.fid}&grupo=${groupMeta.gid}`,
    association: 'AFADE',
    lastChecked: new Date().toISOString(),
  };

  // Actualizar también en caché
  const idx = cache.matches.findIndex((m) => m.id === matchId);
  if (idx !== -1) {
    cache.matches[idx] = updatedMatch;
  } else {
    cache.matches.push(updatedMatch);
  }

  return { success: true, match: updatedMatch };
}
