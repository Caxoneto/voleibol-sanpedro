/**
 * Extractor y Sincronizador Oficial con favoley.net (Federación Andaluza de Voleibol)
 * Sincroniza automáticamente y bajo demanda:
 * - Resultados en vivo y parciales set a set
 * - Cambios federativos de fecha, hora, pabellón y nombres de equipos
 * - Plantillas oficiales de jugadores/as y cuerpo técnico desde las actas de partido
 * - Tablas de clasificación de las 11 competiciones
 */

import {
  FAVB_CATEGORIES,
  FAVB_TEAMS,
  FAVB_MATCHES,
  FAVB_STANDINGS,
  FAVB_PLAYERS,
  FAVB_STAFF,
} from './favb-data';
import { Standings, Player, Staff, Position, StaffRole } from './types';
import { formatMadridDateString, formatMadridTime } from './date-utils';

export interface FavbCompetitionMeta {
  code: string;
  categoryId: string;
  teamId: string;
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
    categoryId: 'cat-senior-fem',
    teamId: 'team-sf',
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
    categoryId: 'cat-juvenil-masc',
    teamId: 'team-jm',
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
    categoryId: 'cat-juvenil-fem-rojo',
    teamId: 'team-jf-rojo',
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
    categoryId: 'cat-juvenil-fem-negro',
    teamId: 'team-jf-negro',
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
    categoryId: 'cat-cadete-masc',
    teamId: 'team-cm',
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
    categoryId: 'cat-cadete-fem-rojo',
    teamId: 'team-cf-rojo',
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
    categoryId: 'cat-cadete-fem-negro',
    teamId: 'team-cf-negro',
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
    categoryId: 'cat-infantil-masc',
    teamId: 'team-im',
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
    categoryId: 'cat-infantil-fem-rojo',
    teamId: 'team-if-rojo',
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
    categoryId: 'cat-infantil-fem-negro',
    teamId: 'team-if-negro',
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
    categoryId: 'cat-infantil-fem-blanco',
    teamId: 'team-if-blanco',
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
  teamId?: string;
  competitionCode: string;
  competitionName: string;
  categoryId?: string;
  categoryName: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
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

export interface FavbRawPersona {
  nombre: string;
  tipo: string;
  dorsal: string;
  capitan: number;
  libero: number;
}

interface FavbJsonMatchDetails {
  favbId: string;
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE';
  statusText: string;
  homeTeam?: string;
  awayTeam?: string;
  isClubHome?: boolean;
  matchDateIso?: string;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  setScores: { home: number; away: number }[];
  clubPersonas: FavbRawPersona[];
}

interface CacheState {
  lastSync: number;
  matches: FavbMatch[];
  standings: Record<string, FavbStanding[]>;
}

const CACHE_TTL_MS = 20 * 1000; // 20 segundos de caché para reflejar cambios en vivo rápidamente
const ROSTER_CACHE_TTL_MS = 60 * 1000; // 60 segundos para plantillas salvo force=true

let cache: CacheState = {
  lastSync: 0,
  matches: [],
  standings: {},
};

// Memoria acumulativa en servidor de convocatorias extraídas por equipo y partidos finalizados ya procesados
const scrapedPersonasByTeam = new Map<string, Map<string, FavbRawPersona>>();
const processedFinishedRosterMatchIds = new Set<string>();

/**
 * Convierte una fecha (YYYY-MM-DD) y hora (HH:MM) en zona horaria Europe/Madrid a ISO UTC
 * respetando el horario de verano/invierno sin depender de la zona horaria del servidor (UTC en Netlify).
 */
export function madridDateTimeToUtcIso(fechaStr: string, horaStr = '12:00'): string {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const [hh, mm] = (horaStr || '12:00').split(':').map(Number);

  for (const offsetHours of [2, 1]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hh - offsetHours, mm || 0, 0));
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(candidate);
    const hPart = Number(parts.find((p) => p.type === 'hour')?.value ?? -1);
    if (hPart === hh) {
      return candidate.toISOString();
    }
  }
  return new Date(Date.UTC(y, m - 1, d, hh - 2, mm || 0, 0)).toISOString();
}

/**
 * Consulta el endpoint JSON ligero de favoley.net (`competicion_partido_datos.php?id=XXXX`)
 * que devuelve estado, programación (fecha, hora, instalación), parciales y plantillas oficiales.
 */
export async function fetchMatchDetailsJson(favbId: string): Promise<FavbJsonMatchDetails | null> {
  const cleanNumId = favbId.replace(/^favb-/, '');
  const url = `https://favoley.net/publico/competicion_partido_datos.php?id=${encodeURIComponent(cleanNumId)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(6500) : undefined,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.datos?.partido) return null;

    const p = json.datos.partido;
    const estadoRaw = String(p.estado || '').toLowerCase();
    let status: 'SCHEDULED' | 'FINISHED' | 'LIVE' = 'SCHEDULED';
    if (estadoRaw === 'finalizado') status = 'FINISHED';
    else if (estadoRaw === 'en_juego') status = 'LIVE';

    const parcialesRaw = Array.isArray(json.datos.parciales) ? json.datos.parciales : [];
    const setScores = parcialesRaw.map(
      (s: { puntos_local?: number | string; puntos_visitante?: number | string }) => ({
        home: Number(s.puntos_local) || 0,
        away: Number(s.puntos_visitante) || 0,
      })
    );

    if (status === 'SCHEDULED' && setScores.length > 0) {
      status = 'LIVE';
    }

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    if (status !== 'SCHEDULED') {
      if (p.sets_local !== null && p.sets_local !== undefined) {
        homeScore = Number(p.sets_local);
      } else if (setScores.length > 0) {
        homeScore = setScores.filter((s: { home: number; away: number }) => s.home > s.away).length;
      }
      if (p.sets_visitante !== null && p.sets_visitante !== undefined) {
        awayScore = Number(p.sets_visitante);
      } else if (setScores.length > 0) {
        awayScore = setScores.filter((s: { home: number; away: number }) => s.away > s.home).length;
      }
    }

    const homeTeam = p.local?.nombre ? String(p.local.nombre).trim() : undefined;
    const awayTeam = p.visitante?.nombre ? String(p.visitante.nombre).trim() : undefined;
    const isClubHome = homeTeam ? homeTeam.toUpperCase().includes('SAN PEDRO') : undefined;

    let matchDateIso: string | undefined;
    if (p.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha)) && p.fecha !== '0000-00-00') {
      const hora =
        p.hora && /^\d{2}:\d{2}/.test(String(p.hora)) && p.hora !== '00:00'
          ? String(p.hora).slice(0, 5)
          : '12:00';
      matchDateIso = madridDateTimeToUtcIso(String(p.fecha), hora);
    }

    let venue: string | undefined;
    if (p.instalacion && String(p.instalacion).trim() !== '') {
      const inst = String(p.instalacion).trim();
      const esp = p.espacio ? String(p.espacio).trim() : '';
      const loc = p.localidad ? String(p.localidad).trim() : '';
      venue = `${inst}${esp ? ` – ${esp}` : ''}${loc ? ` (${loc})` : ''}`;
    }

    // Extraer convocatoria de nuestro club si está publicada
    const clubPersonas: FavbRawPersona[] = [];
    const sides = [
      { name: homeTeam || '', list: Array.isArray(json.datos.plantilla_local) ? json.datos.plantilla_local : [] },
      { name: awayTeam || '', list: Array.isArray(json.datos.plantilla_visitante) ? json.datos.plantilla_visitante : [] },
    ];
    for (const side of sides) {
      if (!side.name.toUpperCase().includes('SAN PEDRO')) continue;
      for (const rawP of side.list) {
        const nombre = String(rawP.nombre || '').trim();
        if (!nombre) continue;
        clubPersonas.push({
          nombre,
          tipo: String(rawP.tipo || '').trim(),
          dorsal: String(rawP.dorsal ?? '').trim(),
          capitan: Number(rawP.capitan) === 1 ? 1 : 0,
          libero: Number(rawP.libero) === 1 ? 1 : 0,
        });
      }
    }

    return {
      favbId: cleanNumId,
      status,
      statusText: status === 'FINISHED' ? 'Finalizado' : status === 'LIVE' ? 'En juego' : 'Próximo',
      homeTeam,
      awayTeam,
      isClubHome,
      matchDateIso,
      venue,
      homeScore,
      awayScore,
      setScores,
      clubPersonas,
    };
  } catch {
    return null;
  }
}

/**
 * Registra personas extraídas de un acta oficial en la memoria acumulativa del equipo
 */
function recordTeamPersonas(teamId: string | undefined, personas: FavbRawPersona[]) {
  if (!teamId || personas.length === 0) return;
  if (!scrapedPersonasByTeam.has(teamId)) {
    scrapedPersonasByTeam.set(teamId, new Map());
  }
  const teamMap = scrapedPersonasByTeam.get(teamId)!;
  for (const p of personas) {
    const key = normalizeNameKey(p.nombre);
    if (!key) continue;
    const existing = teamMap.get(key);
    if (!existing) {
      teamMap.set(key, { ...p });
    } else {
      if (p.capitan === 1) existing.capitan = 1;
      if (p.libero === 1) existing.libero = 1;
      if (p.dorsal && !existing.dorsal) existing.dorsal = p.dorsal;
      if (p.tipo && !existing.tipo) existing.tipo = p.tipo;
    }
  }
}

/**
 * Consulta y extrae el marcador en vivo oficial de un partido desde favoley.net (`seccion=marcador`)
 * Incluye el tanteo punto a punto del set actual en juego (`currentSetScore`).
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
 * Actualiza el estado, programación y marcador de un partido en la memoria consolidada
 */
export async function updateMatchLiveScore(
  matchId: string,
  simulateLive = false
): Promise<{ success: boolean; match?: FavbMatch; error?: string; rawScraped?: ScrapedMatchScore }> {
  if (cache.matches.length === 0) {
    cache.matches = getConsolidatedOfficialMatches();
    cache.lastSync = Date.now();
  }

  const cleanId = matchId.startsWith('favb-') ? matchId : `favb-${matchId}`;
  const numId = matchId.replace(/^favb-/, '');

  const match = cache.matches.find((m) => m.id === cleanId || m.id === matchId || m.favbId === numId);
  if (!match) {
    return { success: false, error: `Partido ${matchId} no encontrado en el calendario oficial.` };
  }

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
  // Consultar en paralelo el marcador en vivo (para tanteo del set actual) y el JSON de detalles (para fecha, hora, sede y acta)
  const [scraped, jsonDetails] = await Promise.all([
    fetchLiveMatchScore(favbId),
    fetchMatchDetailsJson(favbId),
  ]);

  if (jsonDetails) {
    if (jsonDetails.homeTeam) match.homeTeam = jsonDetails.homeTeam;
    if (jsonDetails.awayTeam) match.awayTeam = jsonDetails.awayTeam;
    if (jsonDetails.isClubHome !== undefined) match.isClubHome = jsonDetails.isClubHome;
    if (jsonDetails.matchDateIso) {
      match.matchDate = jsonDetails.matchDateIso;
      match.dateStr = formatMadridDateString(jsonDetails.matchDateIso);
      match.timeStr = formatMadridTime(jsonDetails.matchDateIso);
    }
    if (jsonDetails.venue) match.venue = jsonDetails.venue;
    if (jsonDetails.clubPersonas.length > 0) {
      recordTeamPersonas(match.teamId, jsonDetails.clubPersonas);
    }
  }

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

  if (jsonDetails) {
    match.status = jsonDetails.status;
    match.statusText = jsonDetails.statusText;
    match.homeScore = jsonDetails.homeScore;
    match.awayScore = jsonDetails.awayScore;
    if (jsonDetails.setScores.length > 0) {
      match.setScores = jsonDetails.setScores;
    }
    match.lastChecked = new Date().toISOString();
    return { success: true, match };
  }

  return {
    success: true,
    match,
    error: 'No se pudo conectar en tiempo real con favoley.net; mostrando última versión en caché.',
  };
}

/**
 * Obtiene y sincroniza datos de partidos de la FAVB desde favoley.net,
 * actualizando automáticamente resultados pasados, marcadores de hoy y cambios de horario/pabellón de los próximos 14 días.
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

  if (cache.matches.length === 0) {
    cache.matches = getConsolidatedOfficialMatches();
  }

  const todayStr = formatMadridDateString(new Date());
  const horizonDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const horizonStr = formatMadridDateString(horizonDate);

  // 1. Partidos pasados o de los próximos 14 días para sincronizar resultados, horarios, sedes y actas vía JSON rápido
  const targetMatches = cache.matches.filter(
    (m) =>
      (m.dateStr <= todayStr && (m.status !== 'FINISHED' || !m.setScores || m.setScores.length === 0)) ||
      (m.dateStr >= todayStr && m.dateStr <= horizonStr)
  );

  if (targetMatches.length > 0) {
    await Promise.allSettled(
      targetMatches.map(async (m) => {
        const favbId = m.favbId || m.id.replace(/^favb-/, '');
        const details = await fetchMatchDetailsJson(favbId);
        if (details) {
          m.status = details.status;
          m.statusText = details.statusText;
          if (details.homeScore !== undefined) m.homeScore = details.homeScore;
          if (details.awayScore !== undefined) m.awayScore = details.awayScore;
          if (details.setScores.length > 0) m.setScores = details.setScores;
          if (details.homeTeam) m.homeTeam = details.homeTeam;
          if (details.awayTeam) m.awayTeam = details.awayTeam;
          if (details.isClubHome !== undefined) m.isClubHome = details.isClubHome;
          if (details.matchDateIso) {
            m.matchDate = details.matchDateIso;
            m.dateStr = formatMadridDateString(details.matchDateIso);
            m.timeStr = formatMadridTime(details.matchDateIso);
          }
          if (details.venue) m.venue = details.venue;
          m.lastChecked = new Date().toISOString();

          if (details.clubPersonas.length > 0) {
            recordTeamPersonas(m.teamId, details.clubPersonas);
            if (details.status === 'FINISHED') {
              processedFinishedRosterMatchIds.add(m.id);
            }
          }
        }

        // Si el partido es de HOY o está EN JUEGO (LIVE), consultar también seccion=marcador para obtener currentSetScore punto a punto
        if (m.status === 'LIVE' || (m.dateStr === todayStr && m.status !== 'FINISHED')) {
          const live = await fetchLiveMatchScore(favbId);
          if (live) {
            m.status = live.status;
            m.statusText = live.statusText;
            if (live.homeScore !== undefined) m.homeScore = live.homeScore;
            if (live.awayScore !== undefined) m.awayScore = live.awayScore;
            m.currentSetScore = live.currentSetScore;
            if (live.setScores.length > 0) m.setScores = live.setScores;
            m.lastChecked = live.lastChecked;
          }
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
 * Retorna todos los partidos oficiales federados de la FAVB de la temporada 2026/2027
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
      teamId: m.teamId,
      competitionCode: team?.division || 'FAVB',
      competitionName: team?.division || 'Federación Andaluza de Voleibol',
      categoryId: category?.id,
      categoryName: category?.name || 'Categoría FAVB',
      round: m.round,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      matchDate: m.matchDate,
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

// ============================================================================
// SINCRONIZACIÓN DE PLANTILLAS Y CUERPO TÉCNICO (FAVB_PLAYERS & FAVB_STAFF)
// ============================================================================

let rosterCache: {
  lastSync: number;
  players: Player[];
  staff: Staff[];
} = {
  lastSync: 0,
  players: [],
  staff: [],
};

function titleCase(str: string): string {
  return str
    .replace(/\s*\/\s*$/, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeNameKey(str: string): string {
  return str
    .replace(/\s*\/\s*$/, '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function splitFullName(raw: string): { firstName: string; lastName: string } {
  const clean = titleCase(raw);
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  if (parts.length >= 4) {
    return {
      firstName: parts.slice(0, parts.length - 2).join(' '),
      lastName: parts.slice(parts.length - 2).join(' '),
    };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

const POS_CYCLE: Position[] = [
  'SETTER',
  'OUTSIDE_HITTER',
  'OPPOSITE',
  'MIDDLE_BLOCKER',
  'OUTSIDE_HITTER',
  'MIDDLE_BLOCKER',
  'SETTER',
  'OPPOSITE',
];

function isStaffPersona(p: FavbRawPersona): boolean {
  const t = p.tipo.toUpperCase().trim();
  const d = p.dorsal.trim();
  return (
    !d ||
    t === 'C' ||
    t === 'AC1' ||
    t === 'AC2' ||
    t.includes('ENTRENADOR') ||
    t.includes('ASISTENTE') ||
    t.includes('DELEGAD')
  );
}

/**
 * Sincroniza en tiempo real las plantillas de jugadores/as y cuerpo técnico de los 11 equipos
 * consultando las actas publicadas en favoley.net (`competicion_partido_datos.php`).
 */
export async function syncFavbRosters(forceRefresh = false): Promise<{
  success: boolean;
  players: Player[];
  staff: Staff[];
  lastSync: Date;
  fromCache: boolean;
}> {
  const now = Date.now();
  if (
    !forceRefresh &&
    rosterCache.lastSync > 0 &&
    now - rosterCache.lastSync < ROSTER_CACHE_TTL_MS &&
    rosterCache.players.length > 0
  ) {
    return {
      success: true,
      players: rosterCache.players,
      staff: rosterCache.staff,
      lastSync: new Date(rosterCache.lastSync),
      fromCache: true,
    };
  }

  try {
    if (forceRefresh) {
      processedFinishedRosterMatchIds.clear();
    }
    const tomorrowStr = formatMadridDateString(new Date(Date.now() + 36 * 60 * 60 * 1000));
    const matchesByTeam = new Map<string, typeof FAVB_MATCHES>();

    for (const m of FAVB_MATCHES) {
      const list = matchesByTeam.get(m.teamId) || [];
      list.push(m);
      matchesByTeam.set(m.teamId, list);
    }

    const matchesToInspect: typeof FAVB_MATCHES = [];
    for (const [, teamMatches] of Array.from(matchesByTeam.entries())) {
      const sorted = [...teamMatches].sort(
        (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      );
      // Inspeccionar todos los partidos hasta mañana + al menos los 2 primeros partidos del equipo
      sorted.forEach((m, idx) => {
        const dStr = formatMadridDateString(m.matchDate);
        if (dStr <= tomorrowStr || idx < 2) {
          if (!processedFinishedRosterMatchIds.has(m.id)) {
            matchesToInspect.push(m);
          }
        }
      });
    }

    if (matchesToInspect.length > 0) {
      await Promise.allSettled(
        matchesToInspect.map(async (m) => {
          const numId = m.id.replace(/^favb-/, '');
          const details = await fetchMatchDetailsJson(numId);
          if (details && details.clubPersonas.length > 0) {
            recordTeamPersonas(m.teamId, details.clubPersonas);
            if (details.status === 'FINISHED') {
              processedFinishedRosterMatchIds.add(m.id);
            }
          }
        })
      );
    }

    // Propagar licencias cruzadas de cantera (ej. jugadores CADETE convocados en Juvenil Masculino -> Cadete Masculino)
    const jmPersonas = scrapedPersonasByTeam.get('team-jm');
    if (jmPersonas) {
      const cadeteList: FavbRawPersona[] = [];
      for (const p of Array.from(jmPersonas.values())) {
        if (!isStaffPersona(p) && p.tipo.toUpperCase().includes('CADETE')) {
          cadeteList.push(p);
        }
      }
      if (cadeteList.length > 0) {
        recordTeamPersonas('team-cm', cadeteList);
      }
    }

    // Construir lista consolidada de jugadores y cuerpo técnico por cada equipo
    const updatedPlayers: Player[] = [];
    const updatedStaff: Staff[] = [];
    const teamIds = FAVB_TEAMS.map((t) => t.id);

    for (const teamId of teamIds) {
      const compMeta = FAVB_COMPETITIONS.find((c) => c.teamId === teamId);
      const isFemale = compMeta?.gender === 'FEMENINO';
      const placeholderPrefix = isFemale ? 'Jugadora' : 'Jugador';

      const fallbackPlayers = FAVB_PLAYERS.filter((p) => p.teamId === teamId);
      const existingRealPlayers = fallbackPlayers.filter(
        (fp) => fp.firstName !== 'Jugador' && fp.firstName !== 'Jugadora'
      );

      const baseYear = fallbackPlayers[0]?.birthYear || 2009;
      const baseHeight = fallbackPlayers[0]?.heightCm || (isFemale ? 168 : 176);

      // Mapa de jugadores reales por clave de nombre normalizado
      const realByKey = new Map<string, Player>();
      for (const rp of existingRealPlayers) {
        const key = normalizeNameKey(`${rp.firstName} ${rp.lastName}`);
        realByKey.set(key, { ...rp });
      }

      const scrapedMap = scrapedPersonasByTeam.get(teamId);
      if (scrapedMap) {
        let addIdx = realByKey.size;
        for (const sp of Array.from(scrapedMap.values())) {
          if (isStaffPersona(sp)) continue;
          const key = normalizeNameKey(sp.nombre);
          if (!key) continue;

          const dorsalNum = parseInt(sp.dorsal, 10);
          const isLibero =
            sp.libero === 1 ||
            sp.tipo.toLowerCase().includes('líbero') ||
            sp.tipo.toLowerCase().includes('libero');
          const isCaptain = sp.capitan === 1 || sp.tipo.toLowerCase().includes('capit');

          const existing = realByKey.get(key);
          if (existing) {
            if (!Number.isNaN(dorsalNum) && dorsalNum > 0) existing.number = dorsalNum;
            if (isCaptain) existing.isCaptain = true;
            if (isLibero) existing.position = 'LIBERO';
          } else {
            const { firstName, lastName } = splitFullName(sp.nombre);
            realByKey.set(key, {
              id: `p-${teamId}-${addIdx + 1}`,
              teamId,
              number: !Number.isNaN(dorsalNum) && dorsalNum > 0 ? dorsalNum : addIdx + 1,
              firstName,
              lastName,
              position: isLibero ? 'LIBERO' : POS_CYCLE[addIdx % POS_CYCLE.length],
              birthYear: baseYear + (addIdx % 2),
              heightCm: isLibero ? baseHeight - 4 : baseHeight + ((addIdx * 2) % 6) - 2,
              photoUrl: '/images/player-placeholder.svg',
              isCaptain,
              isHomegrown: true,
            });
            addIdx++;
          }
        }
      }

      const mergedReal = Array.from(realByKey.values()).sort((a, b) => a.number - b.number);
      // Re-indexar IDs estables para el equipo
      mergedReal.forEach((p, idx) => {
        p.id = `p-${teamId}-${idx + 1}`;
      });
      updatedPlayers.push(...mergedReal);

      // Si el equipo aún no ha debutado (< 6 jugadores reales para un sexteto), completar hasta 10 con Jugador/a N
      if (mergedReal.length < 6) {
        const usedNumbers = new Set(mergedReal.map((p) => p.number));
        for (let slot = mergedReal.length + 1; slot <= 10; slot++) {
          let num = slot;
          while (usedNumbers.has(num)) num++;
          usedNumbers.add(num);
          updatedPlayers.push({
            id: `p-${teamId}-${slot}`,
            teamId,
            number: num,
            firstName: placeholderPrefix,
            lastName: String(slot),
            position: POS_CYCLE[(slot - 1) % POS_CYCLE.length],
            birthYear: baseYear,
            heightCm: baseHeight,
            photoUrl: '/images/player-placeholder.svg',
            isCaptain: slot === 1 && mergedReal.length === 0,
            isHomegrown: true,
          });
        }
      }

      // Fusionar Cuerpo Técnico (Staff) del equipo
      const fallbackStaff = FAVB_STAFF.filter((s) => s.teamId === teamId);
      const scrapedStaffList = scrapedMap
        ? Array.from(scrapedMap.values()).filter((sp) => isStaffPersona(sp))
        : [];
      const hasRealScrapedStaff = scrapedStaffList.length > 0;

      const staffByKey = new Map<string, Staff>();
      for (const st of fallbackStaff) {
        // Si ya hay entrenadores reales en el acta de favoley.net, descartar el comodín "Entrenador/a Oficial"
        if (hasRealScrapedStaff && st.name.toLowerCase().includes('entrenador/a oficial')) {
          continue;
        }
        staffByKey.set(normalizeNameKey(st.name), { ...st });
      }

      if (hasRealScrapedStaff) {
        let stIdx = staffByKey.size;
        for (const sp of scrapedStaffList) {
          const cleanName = titleCase(sp.nombre);
          const key = normalizeNameKey(cleanName);
          if (!key || staffByKey.has(key)) continue;

          const tUpper = sp.tipo.toUpperCase().trim();
          const role: StaffRole =
            tUpper === 'C' || (tUpper.includes('ENTRENADOR') && !tUpper.includes('2'))
              ? 'HEAD_COACH'
              : 'ASSISTANT';

          staffByKey.set(key, {
            id: `stf-${teamId}-${stIdx + 1}`,
            teamId,
            name: cleanName,
            role,
            photoUrl: '/images/staff-placeholder.svg',
          });
          stIdx++;
        }
      }

      updatedStaff.push(...Array.from(staffByKey.values()));
    }

    rosterCache = {
      lastSync: Date.now(),
      players: updatedPlayers,
      staff: updatedStaff,
    };

    return {
      success: true,
      players: updatedPlayers,
      staff: updatedStaff,
      lastSync: new Date(rosterCache.lastSync),
      fromCache: false,
    };
  } catch (error) {
    console.error('[FAVB Scraper] Error al sincronizar plantillas:', error);
    return {
      success: true,
      players: rosterCache.players.length > 0 ? rosterCache.players : FAVB_PLAYERS,
      staff: rosterCache.staff.length > 0 ? rosterCache.staff : FAVB_STAFF,
      lastSync: new Date(rosterCache.lastSync || Date.now()),
      fromCache: true,
    };
  }
}

// ============================================================================
// SINCRONIZACIÓN DE CLASIFICACIONES (FAVB_STANDINGS)
// ============================================================================

let standingsCache: {
  lastSync: number;
  standings: Standings[];
} = {
  lastSync: 0,
  standings: [],
};

function cleanHtmlText(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFavbStandingsHtml(html: string, catId: string): Standings[] {
  const tbodyMatch = html.match(
    /<table class="portal-clasificacion-tabla">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i
  );
  if (!tbodyMatch) return [];
  const tbody = tbodyMatch[1];
  const rows: Standings[] = [];
  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let idx = 1;
  while ((trMatch = trRegex.exec(tbody)) !== null) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(cleanHtmlText(tdMatch[1]));
    }
    if (cells.length >= 12) {
      const teamName = cells[1];
      const isCurrentClub = teamName.toUpperCase().includes('SAN PEDRO');
      rows.push({
        id: `st-${catId}-${idx}`,
        categoryId: catId,
        teamName,
        points: parseInt(cells[2], 10) || 0,
        played: parseInt(cells[3], 10) || 0,
        won: parseInt(cells[4], 10) || 0,
        lost: parseInt(cells[5], 10) || 0,
        setsFor: parseInt(cells[10], 10) || 0,
        setsAgainst: parseInt(cells[11], 10) || 0,
        isCurrentClub,
      });
      idx++;
    }
  }
  return rows;
}

/**
 * Sincroniza en tiempo real las tablas de clasificación de las 11 competiciones desde favoley.net
 */
export async function syncFavbStandings(forceRefresh = false): Promise<{
  success: boolean;
  standings: Standings[];
  lastSync: Date;
  fromCache: boolean;
}> {
  const now = Date.now();
  if (
    !forceRefresh &&
    standingsCache.lastSync > 0 &&
    now - standingsCache.lastSync < CACHE_TTL_MS &&
    standingsCache.standings.length > 0
  ) {
    return {
      success: true,
      standings: standingsCache.standings,
      lastSync: new Date(standingsCache.lastSync),
      fromCache: true,
    };
  }

  const byCategory = new Map<string, Standings[]>();
  for (const comp of FAVB_COMPETITIONS) {
    const previous =
      standingsCache.standings.length > 0
        ? standingsCache.standings.filter((s) => s.categoryId === comp.categoryId)
        : FAVB_STANDINGS.filter((s) => s.categoryId === comp.categoryId);
    byCategory.set(comp.categoryId, previous);
  }

  await Promise.allSettled(
    FAVB_COMPETITIONS.map(async (comp) => {
      const url = `https://favoley.net/publico/seccion.php?seccion=competicion&id=${comp.favbId}&vista=clasificacion&grupo=${comp.grupo}&fase=${comp.fase}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout ? AbortSignal.timeout(6500) : undefined,
      });
      if (!res.ok) return;
      const html = await res.text();
      const parsed = parseFavbStandingsHtml(html, comp.categoryId);
      if (parsed.length > 0) {
        byCategory.set(comp.categoryId, parsed);
      }
    })
  );

  const consolidated = Array.from(byCategory.values()).flat();
  standingsCache = {
    lastSync: Date.now(),
    standings: consolidated.length > 0 ? consolidated : FAVB_STANDINGS,
  };

  return {
    success: true,
    standings: standingsCache.standings,
    lastSync: new Date(standingsCache.lastSync),
    fromCache: false,
  };
}
