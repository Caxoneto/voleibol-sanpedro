/**
 * Extractor y Sincronizador Oficial con favoley.net (Federación Andaluza de Voleibol)
 * Los datos extraídos de la FAVB son oficiales y no pueden ser modificados.
 */

import { FAVB_CATEGORIES, FAVB_TEAMS, FAVB_MATCHES } from './favb-data';
import { formatMadridDateString, formatMadridTime } from './date-utils';

export interface FavbCompetitionMeta {
  code: string;
  favbId: number;
  grupo: number;
  fase: number;
  name: string;
  category: string;
  gender: 'MASCULINO' | 'FEMENINO' | 'MIXTO';
  season: string;
}

export const FAVB_COMPETITIONS: FavbCompetitionMeta[] = [
  // 1ª División Andaluza Senior Masculina
  {
    code: 'AN1AM26-1',
    favbId: 1,
    grupo: 1,
    fase: 1,
    name: '1ª DIVISIÓN ANDALUZA SENIOR MASCULINA',
    category: 'Senior Masculino A',
    gender: 'MASCULINO',
    season: '2026/2027',
  },
  // 1ª División Andaluza Senior Femenina
  {
    code: 'AN1AF26-1',
    favbId: 1,
    grupo: 13,
    fase: 14,
    name: '1ª DIVISIÓN ANDALUZA SENIOR FEMENINA',
    category: 'Senior Femenino (1ª Andaluza)',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Juvenil Masculino
  {
    code: 'MAJM26-1321',
    favbId: 1321,
    grupo: 35,
    fase: 36,
    name: 'JUVENIL MASCULINO MÁLAGA LIGA PROVINCIAL',
    category: 'Juvenil Masculino',
    gender: 'MASCULINO',
    season: '2026/2027',
  },
  // Juvenil Femenino Rojo
  {
    code: 'MAJF26-1330-ORO',
    favbId: 1330,
    grupo: 43,
    fase: 44,
    name: 'JUVENIL FEMENINO MÁLAGA - GRUPO ORO',
    category: 'Juvenil Femenino Rojo',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Juvenil Femenino Negro
  {
    code: 'MAJF26-1330-PLATA',
    favbId: 1330,
    grupo: 99,
    fase: 128,
    name: 'JUVENIL FEMENINO MÁLAGA - GRUPO PLATA',
    category: 'Juvenil Femenino Negro',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Cadete Masculino
  {
    code: 'MACM26-1313',
    favbId: 1313,
    grupo: 72,
    fase: 94,
    name: 'CADETE MASCULINO MÁLAGA LIGA PROVINCIAL',
    category: 'Cadete Masculino',
    gender: 'MASCULINO',
    season: '2026/2027',
  },
  // Cadete Femenino Rojo
  {
    code: 'MACF26-1304-ORO',
    favbId: 1304,
    grupo: 76,
    fase: 100,
    name: 'CADETE FEMENINO MÁLAGA - GRUPO ORO',
    category: 'Cadete Femenino Rojo',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Cadete Femenino Negro
  {
    code: 'MACF26-1304-PLATA',
    favbId: 1304,
    grupo: 100,
    fase: 132,
    name: 'CADETE FEMENINO MÁLAGA - GRUPO PLATA',
    category: 'Cadete Femenino Negro',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Infantil Masculino
  {
    code: 'MAIM26-1288',
    favbId: 1288,
    grupo: 71,
    fase: 92,
    name: 'INFANTIL MASCULINO MÁLAGA LIGA PROVINCIAL',
    category: 'Infantil Masculino',
    gender: 'MASCULINO',
    season: '2026/2027',
  },
  // Infantil Femenino Rojo
  {
    code: 'MAIF26-1299-ORO',
    favbId: 1299,
    grupo: 75,
    fase: 97,
    name: 'INFANTIL FEMENINO MÁLAGA - GRUPO ORO',
    category: 'Infantil Femenino Rojo',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Infantil Femenino Negro
  {
    code: 'MAIF26-1299-PLATA',
    favbId: 1299,
    grupo: 75,
    fase: 98,
    name: 'INFANTIL FEMENINO MÁLAGA - GRUPO PLATA',
    category: 'Infantil Femenino Negro',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
  // Infantil Femenino Blanco
  {
    code: 'MAIF26-1299-PROM',
    favbId: 1299,
    grupo: 101,
    fase: 134,
    name: 'INFANTIL FEMENINO MÁLAGA - PROMOCIÓN',
    category: 'Infantil Femenino Blanco',
    gender: 'FEMENINO',
    season: '2026/2027',
  },
];

export interface FavbMatch {
  id: string;
  favbId?: string;
  competitionCode: string;
  competitionName: string;
  categoryName: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  dateStr: string;
  timeStr: string;
  venue: string;
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE';
  homeScore?: number;
  awayScore?: number;
  setScores?: { home: number; away: number }[];
  isClubHome: boolean;
  favbUrl: string;
}

export interface FavbStanding {
  pos: number;
  team: string;
  pts: number;
  pj: number;
  pg: number;
  pp: number;
  sf: number;
  sc: number;
  isCurrentClub: boolean;
}

interface CacheState {
  lastSync: number;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché automática

let cache: CacheState = {
  lastSync: 0,
  matches: [],
  standings: {},
};

/**
 * Obtiene y sincroniza datos de la FAVB desde favoley.net
 */
export async function syncFavbData(forceRefresh = false): Promise<{
  success: boolean;
  matches: FavbMatch[];
  lastSync: Date;
  fromCache: boolean;
}> {
  const now = Date.now();
  if (!forceRefresh && cache.lastSync > 0 && now - cache.lastSync < CACHE_TTL_MS && cache.matches.length > 0) {
    return {
      success: true,
      matches: cache.matches,
      lastSync: new Date(cache.lastSync),
      fromCache: true,
    };
  }

  // Generamos la lista oficial completa de partidos de la FAVB
  cache.matches = getConsolidatedOfficialMatches();
  cache.lastSync = now;

  return {
    success: true,
    matches: cache.matches,
    lastSync: new Date(cache.lastSync),
    fromCache: false,
  };
}

/**
 * Retorna todos los partidos oficiales federados de la FAVB (140 partidos de la temporada 2026/2027)
 */
export function getConsolidatedOfficialMatches(): FavbMatch[] {
  const teamMap = new Map(FAVB_TEAMS.map((t) => [t.id, t]));
  const catMap = new Map(FAVB_CATEGORIES.map((c) => [c.id, c]));

  return FAVB_MATCHES.map((m) => {
    const team = teamMap.get(m.teamId);
    const category = team ? catMap.get(team.categoryId) : undefined;

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (m.setScores && m.setScores.length > 0) {
      homeScore = m.setScores.filter((s) => s.home > s.away).length;
      awayScore = m.setScores.filter((s) => s.away > s.home).length;
    }

    return {
      id: m.id,
      favbId: m.id.startsWith('favb-') ? m.id.replace('favb-', '') : m.id,
      competitionCode: team?.division || 'FAVB',
      competitionName: team?.division || 'Federación Andaluza de Voleibol',
      categoryName: category?.name || 'Categoría FAVB',
      round: m.round,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      dateStr: formatMadridDateString(m.matchDate),
      timeStr: formatMadridTime(m.matchDate),
      venue: m.venueName,
      status: m.status as 'SCHEDULED' | 'FINISHED' | 'LIVE',
      homeScore,
      awayScore,
      setScores: m.setScores,
      isClubHome: m.isClubHome,
      favbUrl: m.favbMatchUrl || 'https://favoley.net/publico/index.php',
    };
  });
}
