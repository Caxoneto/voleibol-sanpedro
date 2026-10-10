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
  categoryId?: string;
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
  currentSetScore?: { set: string; home: number; away: number };
  isClubHome: boolean;
  favbUrl: string;
  statusText?: string;
  lastChecked?: string;
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

export interface ScrapedMatchScore {
  favbId: string;
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE';
  statusText: string;
  homeScore?: number;
  awayScore?: number;
  setScores: { home: number; away: number }[];
  currentSetScore?: { set: string; home: number; away: number };
  lastChecked: string;
}

interface CacheState {
  lastSync: number;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
}

const CACHE_TTL_MS = 20 * 1000; // 20 segundos de caché para reflejar cambios en vivo rápidamente

let cache: CacheState = {
  lastSync: 0,
  matches: [],
  standings: {},
};

/**
 * Consulta y extrae el marcador en vivo oficial de un partido desde favoley.net
 */
export async function fetchLiveMatchScore(favbId: string): Promise<ScrapedMatchScore | null> {
  const url = `https://favoley.net/publico/seccion.php?seccion=marcador&id=${favbId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      cache: 'no-store',
      // Timeout de 7 segundos para que no bloquee la interfaz
      signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
    });

    if (!res.ok) {
      console.warn(`[FAVB Scraper] Error HTTP ${res.status} al consultar ${url}`);
      return null;
    }

    const html = await res.text();

    // 1. Extraer estado (permitiendo etiquetas internas como <i aria-hidden="true"></i>)
    const statusMatch = html.match(/class=\"portal-marcador-estado[^\"]*\">([\s\S]*?)<\/span>/i);
    const rawStatus = statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    let status: 'SCHEDULED' | 'FINISHED' | 'LIVE' = 'SCHEDULED';
    const statusLower = rawStatus.toLowerCase();

    if (statusLower.includes('finaliz') || html.includes('estado-finalizado')) {
      status = 'FINISHED';
    } else if (
      statusLower.includes('juego') ||
      statusLower.includes('directo') ||
      statusLower.includes('vivo') ||
      statusLower.includes('curso') ||
      html.includes('estado-en_juego') ||
      html.includes('estado-en-juego')
    ) {
      status = 'LIVE';
    }

    // 2. Extraer tanteo del set actual en juego si existe
    let currentSetScore: { set: string; home: number; away: number } | undefined;
    const currentSetMatch = html.match(
      /portal-marcador-set-actual[\s\S]*?<header>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?portal-marcador-set-actual-score[\s\S]*?<strong>(\d+)<\/strong>[\s\S]*?<strong>(\d+)<\/strong>/i
    );
    if (currentSetMatch) {
      currentSetScore = {
        set: currentSetMatch[1].replace(/<[^>]+>/g, '').trim(),
        home: parseInt(currentSetMatch[2], 10),
        away: parseInt(currentSetMatch[3], 10),
      };
      if (status !== 'FINISHED') {
        status = 'LIVE';
      }
    }

    // 3. Extraer parciales set a set
    const setScores: { home: number; away: number }[] = [];
    const setRegex = /<b>Set\s*(\d+)<\/b>[\s\S]*?<strong[^>]*>(\d+)<\/strong>[\s\S]*?<strong[^>]*>(\d+)<\/strong>/gi;
    let sm;
    while ((sm = setRegex.exec(html)) !== null) {
      setScores.push({
        home: parseInt(sm[2], 10),
        away: parseInt(sm[3], 10),
      });
    }

    // Si hay parciales anotados o tanteo en curso y aún no está marcado como Finalizado, el partido está En Vivo
    if (status === 'SCHEDULED' && (setScores.length > 0 || currentSetScore)) {
      status = 'LIVE';
    }

    // 4. Extraer sets globales SOLO si el partido ha comenzado o finalizado
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (status !== 'SCHEDULED') {
      const setsMatch = html.match(
        /portal-marcador-resultado-sets[\s\S]*?<strong>(\d+)<\/strong>[\s\S]*?<strong>(\d+)<\/strong>/i
      );
      if (setsMatch) {
        homeScore = parseInt(setsMatch[1], 10);
        awayScore = parseInt(setsMatch[2], 10);
      }
    }

    return {
      favbId,
      status,
      statusText: rawStatus || (status === 'FINISHED' ? 'Finalizado' : status === 'LIVE' ? 'En juego' : 'Próximo'),
      homeScore,
      awayScore,
      currentSetScore,
      setScores,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[FAVB Scraper] Fallo al raspar marcador en vivo de ${url}:`, error);
    return null;
  }
}

/**
 * Actualiza el estado y marcador de un partido en la memoria consolidada
 */
export async function updateMatchLiveScore(
  matchId: string,
  simulateLive = false
): Promise<{ success: boolean; match?: FavbMatch; error?: string; rawScraped?: ScrapedMatchScore }> {
  // Asegurar que el caché esté inicializado
  if (cache.matches.length === 0) {
    cache.matches = getConsolidatedOfficialMatches();
    cache.lastSync = Date.now();
  }

  // Buscar el partido en el catálogo consolidado
  const cleanId = matchId.startsWith('favb-') ? matchId : `favb-${matchId}`;
  const numId = matchId.replace(/^favb-/, '');

  const match = cache.matches.find((m) => m.id === cleanId || m.id === matchId || m.favbId === numId);
  if (!match) {
    return { success: false, error: `Partido ${matchId} no encontrado en el calendario oficial.` };
  }

  // Si se solicita simulación (modo test/demo)
  if (simulateLive) {
    match.status = 'LIVE';
    match.statusText = 'En juego';
    match.homeScore = 1;
    match.awayScore = 1;
    match.currentSetScore = { set: 'Set 3', home: 16, away: 14 };
    match.setScores = [
      { home: 25, away: 21 },
      { home: 22, away: 25 },
    ];
    match.lastChecked = new Date().toISOString();
    return { success: true, match };
  }

  const favbId = match.favbId || numId;
  const scraped = await fetchLiveMatchScore(favbId);

  if (scraped) {
    match.status = scraped.status;
    match.statusText = scraped.statusText;
    match.homeScore = scraped.homeScore;
    match.awayScore = scraped.awayScore;
    match.currentSetScore = scraped.currentSetScore;
    if (scraped.setScores.length > 0) {
      match.setScores = scraped.setScores;
    }
    match.lastChecked = scraped.lastChecked;
    return { success: true, match, rawScraped: scraped };
  }

  // Si falló el scrapeo en vivo de favoley.net, devolvemos el estado que ya teníamos con advertencia
  return {
    success: true,
    match,
    error: 'No se pudo conectar en tiempo real con favoley.net; mostrando última versión en caché.',
  };
}

/**
 * Obtiene y sincroniza datos de la FAVB desde favoley.net,
 * actualizando en tiempo real todos los partidos de la jornada de hoy o activos.
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

  // Inicializar catálogo si está vacío
  if (cache.matches.length === 0) {
    cache.matches = getConsolidatedOfficialMatches();
  }

  // Consultar en vivo en favoley.net todos los partidos de hoy o que sigan en curso/pendientes de días previos
  const todayStr = formatMadridDateString(new Date());
  const activeOrTodayMatches = cache.matches.filter(
    (m) => m.dateStr <= todayStr && (m.status !== 'FINISHED' || !m.setScores || m.setScores.length === 0)
  );

  if (activeOrTodayMatches.length > 0) {
    await Promise.allSettled(
      activeOrTodayMatches.map(async (m) => {
        const favbId = m.favbId || m.id.replace(/^favb-/, '');
        const scraped = await fetchLiveMatchScore(favbId);
        if (scraped) {
          m.status = scraped.status;
          m.statusText = scraped.statusText;
          m.homeScore = scraped.homeScore;
          m.awayScore = scraped.awayScore;
          m.currentSetScore = scraped.currentSetScore;
          if (scraped.setScores.length > 0) {
            m.setScores = scraped.setScores;
          }
          m.lastChecked = scraped.lastChecked;
        }
      })
    );
  }

  cache.lastSync = Date.now();

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
      categoryId: category?.id,
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
