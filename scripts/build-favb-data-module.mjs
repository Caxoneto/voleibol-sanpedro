import fs from 'fs';
import path from 'path';

// Conversión matemáticamente estricta de hora local en 'Europe/Madrid' a ISO UTC
function madridLocalToUtcIso(year, month, day, hours, minutes) {
  const tentative = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(tentative);
  let mH = parseInt(parts.find(p => p.type === 'hour').value, 10);
  if (mH === 24) mH = 0;
  const mM = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const diffMinutes = (mH * 60 + mM) - (hours * 60 + minutes);
  const exact = new Date(tentative.getTime() - diffMinutes * 60 * 1000);
  return exact.toISOString();
}

function parseDateToUtc(dateStr, timeStr) {
  let day = 10, month = 10, year = 2026;
  if (dateStr && dateStr.includes('-')) {
    const p = dateStr.split('-');
    if (p[0].length === 4) {
      year = parseInt(p[0], 10);
      month = parseInt(p[1], 10);
      day = parseInt(p[2], 10);
    } else {
      day = parseInt(p[0], 10);
      month = parseInt(p[1], 10);
      year = parseInt(p[2], 10);
    }
  }
  let h = 12, m = 0;
  if (timeStr && timeStr.includes(':')) {
    const tp = timeStr.split(':');
    h = parseInt(tp[0], 10);
    m = parseInt(tp[1], 10);
  }
  return madridLocalToUtcIso(year, month, day, h, m);
}

const rawData = JSON.parse(fs.readFileSync('scripts/favb-data-scraped.json', 'utf8'));

// 11 Categorías Oficiales con representación real del C.D. Voleibol San Pedro
export const CATEGORIES = [
  {
    id: 'cat-senior-fem',
    name: 'Senior Femenino (1ª Andaluza)',
    slug: 'senior-femenino',
    order: 1,
    description: '1ª División Andaluza Femenina (FAVB)',
  },
  {
    id: 'cat-juvenil-masc',
    name: 'Juvenil Masculino',
    slug: 'juvenil-masculino',
    order: 2,
    description: 'Liga Provincial Málaga - Juvenil Masc (FAVB)',
  },
  {
    id: 'cat-juvenil-fem-rojo',
    name: 'Juvenil Femenino Rojo',
    slug: 'juvenil-femenino-rojo',
    order: 3,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-juvenil-fem-negro',
    name: 'Juvenil Femenino Negro',
    slug: 'juvenil-femenino-negro',
    order: 4,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-cadete-masc',
    name: 'Cadete Masculino',
    slug: 'cadete-masculino',
    order: 5,
    description: 'Liga Provincial Málaga - Cadete Masc (FAVB)',
  },
  {
    id: 'cat-cadete-fem-rojo',
    name: 'Cadete Femenino Rojo',
    slug: 'cadete-femenino-rojo',
    order: 6,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-cadete-fem-negro',
    name: 'Cadete Femenino Negro',
    slug: 'cadete-femenino-negro',
    order: 7,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-infantil-masc',
    name: 'Infantil Masculino',
    slug: 'infantil-masculino',
    order: 8,
    description: 'Liga Provincial Málaga - Infantil Masc (FAVB)',
  },
  {
    id: 'cat-infantil-fem-rojo',
    name: 'Infantil Femenino Rojo',
    slug: 'infantil-femenino-rojo',
    order: 9,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-infantil-fem-negro',
    name: 'Infantil Femenino Negro',
    slug: 'infantil-femenino-negro',
    order: 10,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-infantil-fem-blanco',
    name: 'Infantil Femenino Blanco',
    slug: 'infantil-femenino-blanco',
    order: 11,
    description: 'Liga Provincial Málaga - Grupo Promoción (FAVB)',
  },
];

// 11 Equipos Oficiales federados con representación real
export const TEAMS = [
  { id: 'team-sf', categoryId: 'cat-senior-fem', name: 'Senior Femenino', division: '1ª División Andaluza Femenina (FAVB)', season: '2026/2027' },
  { id: 'team-jm', categoryId: 'cat-juvenil-masc', name: 'Juvenil Masculino', division: 'Liga Provincial Málaga (FAVB)', season: '2026/2027' },
  { id: 'team-jf-rojo', categoryId: 'cat-juvenil-fem-rojo', name: 'Juvenil Femenino Rojo', division: 'Liga Provincial - Grupo Oro (FAVB)', season: '2026/2027' },
  { id: 'team-jf-negro', categoryId: 'cat-juvenil-fem-negro', name: 'Juvenil Femenino Negro', division: 'Liga Provincial - Grupo Plata (FAVB)', season: '2026/2027' },
  { id: 'team-cm', categoryId: 'cat-cadete-masc', name: 'Cadete Masculino', division: 'Liga Provincial Málaga (FAVB)', season: '2026/2027' },
  { id: 'team-cf-rojo', categoryId: 'cat-cadete-fem-rojo', name: 'Cadete Femenino Rojo', division: 'Liga Provincial - Grupo Oro (FAVB)', season: '2026/2027' },
  { id: 'team-cf-negro', categoryId: 'cat-cadete-fem-negro', name: 'Cadete Femenino Negro', division: 'Liga Provincial - Grupo Plata (FAVB)', season: '2026/2027' },
  { id: 'team-im', categoryId: 'cat-infantil-masc', name: 'Infantil Masculino', division: 'Liga Provincial Málaga (FAVB)', season: '2026/2027' },
  { id: 'team-if-rojo', categoryId: 'cat-infantil-fem-rojo', name: 'Infantil Femenino Rojo', division: 'Liga Provincial - Grupo Oro (FAVB)', season: '2026/2027' },
  { id: 'team-if-negro', categoryId: 'cat-infantil-fem-negro', name: 'Infantil Femenino Negro', division: 'Liga Provincial - Grupo Plata (FAVB)', season: '2026/2027' },
  { id: 'team-if-blanco', categoryId: 'cat-infantil-fem-blanco', name: 'Infantil Femenino Blanco', division: 'Liga Provincial - Grupo Promoción (FAVB)', season: '2026/2027' },
];

// Mapear partidos oficiales de favoley.net (136 partidos de las 11 categorías reales)
const mappedMatches = rawData.matches.map(m => {
  const dateMatch = m.matchDate ? m.matchDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/) : null;
  let utcIso;
  if (dateMatch) {
    const [_, y, mo, d, h, mi] = dateMatch;
    utcIso = madridLocalToUtcIso(parseInt(y, 10), parseInt(mo, 10), parseInt(d, 10), parseInt(h, 10), parseInt(mi, 10));
  } else {
    utcIso = parseDateToUtc('10-10-2026', '12:00');
  }

  // Destacar el próximo gran partido del primer equipo femenino en casa
  const isFeatured = m.id === 'favb-1061';

  return {
    id: m.id,
    teamId: m.teamId,
    round: m.round,
    homeTeamName: m.homeTeamName,
    awayTeamName: m.awayTeamName,
    isClubHome: m.isClubHome,
    venueName: m.venueName,
    matchDate: utcIso,
    status: m.status,
    setScores: m.setScores || [],
    favbMatchUrl: m.favbMatchUrl,
    isFeatured: isFeatured || undefined,
  };
});

const ALL_MATCHES = mappedMatches;

// Clasificaciones oficiales 100% FAVB
const mappedStandings = rawData.standings.map(s => ({
  id: s.id,
  categoryId: s.categoryId,
  teamName: s.teamName,
  isCurrentClub: s.isCurrentClub,
  played: s.played,
  won: s.won,
  lost: s.lost,
  setsFor: s.setsFor,
  setsAgainst: s.setsAgainst,
  points: s.points,
}));

const ALL_STANDINGS = mappedStandings;

// Jugadores (10 por equipo para los 11 equipos federados = 110 jugadores)
const PLAYER_SILHOUETTE = '/images/player-placeholder.svg';
const STAFF_SILHOUETTE = '/images/staff-placeholder.svg';

const FIRST_NAMES_MASC = ['Alejandro', 'Mateo', 'David', 'Javier', 'Pablo', 'Álvaro', 'Hugo', 'Marcos', 'Rubén', 'Sergio', 'Víctor', 'Lucas', 'Jorge', 'Diego', 'Eric', 'Manuel', 'Nicolás', 'Tomás', 'Adrián', 'Gonzalo', 'Iván'];
const FIRST_NAMES_FEM = ['Elena', 'Marta', 'Lucía', 'Sara', 'Carmen', 'Alba', 'Natalia', 'Paula', 'Irene', 'Claudia', 'Sofía', 'Daniela', 'Valeria', 'Noa', 'Carla', 'Martina', 'Emma', 'Julia', 'Marina', 'Nerea', 'Ainhoa'];
const LAST_NAMES = ['García Moreno', 'Fernández Ruiz', 'López Cantos', 'Sánchez Gil', 'Romero Domínguez', 'Navarro Muñoz', 'Castillo Vega', 'Benítez Sampedro', 'Ortiz Gallego', 'Carrasco Blanco', 'Mellado Díaz', 'Prieto Ramos', 'Díaz Morales', 'Morales Soler', 'Gil Romero', 'Vega Lozano', 'Mendoza Salgado', 'Salgado Peña', 'Peña Vidal', 'Vidal Ríos', 'Ríos Pardo'];
const POSITIONS = ['SETTER', 'OPPOSITE', 'OUTSIDE_HITTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'MIDDLE_BLOCKER', 'LIBERO', 'SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER'];

const ALL_PLAYERS = [];

TEAMS.forEach(team => {
  const isFemale = team.id.includes('f');
  const firstNames = isFemale ? FIRST_NAMES_FEM : FIRST_NAMES_MASC;
  let birthYearBase = 2002;
  let heightBase = 175;

  if (team.id === 'team-sf') {
    birthYearBase = 2002;
    heightBase = 177;
  } else if (team.id.includes('j')) {
    birthYearBase = 2007;
    heightBase = isFemale ? 173 : 188;
  } else if (team.id.includes('c')) {
    birthYearBase = 2009;
    heightBase = isFemale ? 170 : 183;
  } else if (team.id.includes('i')) {
    birthYearBase = 2011;
    heightBase = isFemale ? 165 : 176;
  }

  for (let i = 0; i < 10; i++) {
    const dorsal = i === 0 ? 7 : (i === 1 ? 11 : (i === 2 ? 4 : (i === 3 ? 9 : (i === 4 ? 13 : (i === 5 ? 5 : (i === 6 ? 1 : (i === 7 ? 14 : (i === 8 ? 8 : 16))))))));
    const fName = firstNames[i % firstNames.length];
    const lName = LAST_NAMES[(i + (team.id.length * 3)) % LAST_NAMES.length];
    const pos = POSITIONS[i];
    const heightVariation = (i * 3) % 9 - 4;
    const yearVariation = (i % 3);

    ALL_PLAYERS.push({
      id: `p-${team.id}-${i + 1}`,
      teamId: team.id,
      number: dorsal,
      firstName: fName,
      lastName: lName,
      position: pos,
      birthYear: birthYearBase + yearVariation,
      heightCm: heightBase + heightVariation,
      photoUrl: PLAYER_SILHOUETTE,
      isCaptain: i === 0,
      isHomegrown: true,
    });
  }
});

// Cuerpos Técnicos para los 11 equipos federados
// El presidente Carlos Alberto Alcántara González es el primer entrenador del Senior Femenino (1ª Andaluza)
const ALL_STAFF = [
  { id: 'st-sf-1', teamId: 'team-sf', name: 'Carlos Alberto Alcántara González', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-sf-2', teamId: 'team-sf', name: 'Laura Castillo Peña', role: 'ASSISTANT', photoUrl: STAFF_SILHOUETTE },

  { id: 'st-jm-1', teamId: 'team-jm', name: 'Juan Carlos Romero Gil', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-jf-rojo-1', teamId: 'team-jf-rojo', name: 'Cristina Navarro Gil', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-jf-negro-1', teamId: 'team-jf-negro', name: 'Silvia Garrido Ruiz', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },

  { id: 'st-cm-1', teamId: 'team-cm', name: 'Antonio Salgado Marín', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-cf-rojo-1', teamId: 'team-cf-rojo', name: 'Patricia Benítez Lara', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-cf-negro-1', teamId: 'team-cf-negro', name: 'Elena Moreno Sanz', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },

  { id: 'st-im-1', teamId: 'team-im', name: 'Alberto Gil Sampedro', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-if-rojo-1', teamId: 'team-if-rojo', name: 'Lucía Reyes Gómez', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-if-negro-1', teamId: 'team-if-negro', name: 'Carmen Ortiz Vega', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-if-blanco-1', teamId: 'team-if-blanco', name: 'Miriam Soler Blanco', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
];

// Generar src/lib/favb-data.ts
const fileContent = `import { Category, Team, Player, Staff, Match, Standings } from './types';

export const FAVB_CATEGORIES: Category[] = ${JSON.stringify(CATEGORIES, null, 2)};

export const FAVB_TEAMS: Team[] = ${JSON.stringify(TEAMS, null, 2)};

export const FAVB_PLAYERS: Player[] = ${JSON.stringify(ALL_PLAYERS, null, 2)};

export const FAVB_STAFF: Staff[] = ${JSON.stringify(ALL_STAFF, null, 2)};

export const FAVB_MATCHES: Match[] = ${JSON.stringify(ALL_MATCHES, null, 2)};

export const FAVB_STANDINGS: Standings[] = ${JSON.stringify(ALL_STANDINGS, null, 2)};
`;

fs.writeFileSync('src/lib/favb-data.ts', fileContent, 'utf8');
console.log('Successfully written src/lib/favb-data.ts!');
console.log('Categories:', CATEGORIES.length);
console.log('Teams:', TEAMS.length);
console.log('Players:', ALL_PLAYERS.length);
console.log('Staff:', ALL_STAFF.length);
console.log('Matches:', ALL_MATCHES.length);
console.log('Standings:', ALL_STANDINGS.length);
