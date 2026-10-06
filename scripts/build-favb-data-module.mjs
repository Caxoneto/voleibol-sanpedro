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

// 12 Categorías Oficiales
export const CATEGORIES = [
  {
    id: 'cat-senior-masc-a',
    name: 'Senior Masculino A',
    slug: 'senior-masculino-a',
    order: 1,
    description: '1ª División Andaluza Senior Masculina',
  },
  {
    id: 'cat-senior-fem',
    name: 'Senior Femenino (1ª Andaluza)',
    slug: 'senior-femenino',
    order: 2,
    description: '1ª División Andaluza Femenina (FAVB)',
  },
  {
    id: 'cat-juvenil-masc',
    name: 'Juvenil Masculino',
    slug: 'juvenil-masculino',
    order: 3,
    description: 'Liga Provincial Málaga - Juvenil Masc (FAVB)',
  },
  {
    id: 'cat-juvenil-fem-rojo',
    name: 'Juvenil Femenino Rojo',
    slug: 'juvenil-femenino-rojo',
    order: 4,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-juvenil-fem-negro',
    name: 'Juvenil Femenino Negro',
    slug: 'juvenil-femenino-negro',
    order: 5,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-cadete-masc',
    name: 'Cadete Masculino',
    slug: 'cadete-masculino',
    order: 6,
    description: 'Liga Provincial Málaga - Cadete Masc (FAVB)',
  },
  {
    id: 'cat-cadete-fem-rojo',
    name: 'Cadete Femenino Rojo',
    slug: 'cadete-femenino-rojo',
    order: 7,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-cadete-fem-negro',
    name: 'Cadete Femenino Negro',
    slug: 'cadete-femenino-negro',
    order: 8,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-infantil-masc',
    name: 'Infantil Masculino',
    slug: 'infantil-masculino',
    order: 9,
    description: 'Liga Provincial Málaga - Infantil Masc (FAVB)',
  },
  {
    id: 'cat-infantil-fem-rojo',
    name: 'Infantil Femenino Rojo',
    slug: 'infantil-femenino-rojo',
    order: 10,
    description: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
  },
  {
    id: 'cat-infantil-fem-negro',
    name: 'Infantil Femenino Negro',
    slug: 'infantil-femenino-negro',
    order: 11,
    description: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
  },
  {
    id: 'cat-infantil-fem-blanco',
    name: 'Infantil Femenino Blanco',
    slug: 'infantil-femenino-blanco',
    order: 12,
    description: 'Liga Provincial Málaga - Grupo Promoción (FAVB)',
  },
];

// 12 Equipos Oficiales
export const TEAMS = [
  { id: 'team-sma', categoryId: 'cat-senior-masc-a', name: 'Senior Masculino A', division: '1ª División Andaluza', season: '2026/2027' },
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

// Senior Masc A partidos
const seniorMascMatches = [
  {
    id: 'm-sma-past-1',
    teamId: 'team-sma',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Marbella Costa',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: parseDateToUtc('03-10-2026', '18:30'),
    status: 'FINISHED',
    setScores: [
      { home: 25, away: 20 },
      { home: 25, away: 23 },
      { home: 25, away: 19 },
    ],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
    mvpPlayerId: 'p-sma-2',
  },
  {
    id: 'm-sma-next-1',
    teamId: 'team-sma',
    round: 2,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Costa del Sol',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: parseDateToUtc('10-10-2026', '18:30'),
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
    isFeatured: true,
  },
  {
    id: 'm-sma-fut-2',
    teamId: 'team-sma',
    round: 3,
    homeTeamName: 'CV Fuengirola B',
    awayTeamName: 'C.D. Voleibol San Pedro',
    isClubHome: false,
    venueName: 'Pabellón Juan Gómez Juanito (Fuengirola)',
    matchDate: parseDateToUtc('17-10-2026', '17:00'),
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
  },
  {
    id: 'm-sma-fut-3',
    teamId: 'team-sma',
    round: 4,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'Universidad de Málaga Voley',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: parseDateToUtc('24-10-2026', '18:30'),
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
  },
];

// Mapear partidos oficiales de favoley.net
const mappedMatches = rawData.matches.map(m => {
  // Extraer fecha y hora si existen
  const dateMatch = m.matchDate ? m.matchDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/) : null;
  let utcIso;
  if (dateMatch) {
    const [_, y, mo, d, h, mi] = dateMatch;
    utcIso = madridLocalToUtcIso(parseInt(y, 10), parseInt(mo, 10), parseInt(d, 10), parseInt(h, 10), parseInt(mi, 10));
  } else {
    utcIso = parseDateToUtc('10-10-2026', '12:00');
  }

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
  };
});

const ALL_MATCHES = [...seniorMascMatches, ...mappedMatches];

// Clasificaciones
const seniorMascStandings = [
  { id: 'std-sma-1', categoryId: 'cat-senior-masc-a', teamName: 'C.D. Voleibol San Pedro', isCurrentClub: true, played: 1, won: 1, lost: 0, setsFor: 3, setsAgainst: 0, points: 3 },
  { id: 'std-sma-2', categoryId: 'cat-senior-masc-a', teamName: 'CV Costa del Sol', isCurrentClub: false, played: 1, won: 1, lost: 0, setsFor: 3, setsAgainst: 1, points: 3 },
  { id: 'std-sma-3', categoryId: 'cat-senior-masc-a', teamName: 'Universidad de Málaga Voley', isCurrentClub: false, played: 1, won: 1, lost: 0, setsFor: 3, setsAgainst: 2, points: 2 },
  { id: 'std-sma-4', categoryId: 'cat-senior-masc-a', teamName: 'CV Fuengirola B', isCurrentClub: false, played: 1, won: 0, lost: 1, setsFor: 2, setsAgainst: 3, points: 1 },
  { id: 'std-sma-5', categoryId: 'cat-senior-masc-a', teamName: 'CV Marbella Costa', isCurrentClub: false, played: 1, won: 0, lost: 1, setsFor: 0, setsAgainst: 3, points: 0 },
];

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

const ALL_STANDINGS = [...seniorMascStandings, ...mappedStandings];

// Jugadores (10 por equipo = 120 jugadores)
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
  let birthYearBase = 2000;
  let heightBase = 185;

  if (team.id === 'team-sma') {
    birthYearBase = 2000;
    heightBase = 192;
  } else if (team.id === 'team-sf') {
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

// Cuerpos Técnicos para los 12 equipos
const ALL_STAFF = [
  { id: 'st-sma-1', teamId: 'team-sma', name: 'Manuel "Manolo" Rivas Cortés', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-sma-2', teamId: 'team-sma', name: 'Carlos Alarcón Vega', role: 'ASSISTANT', photoUrl: STAFF_SILHOUETTE },
  { id: 'st-sma-3', teamId: 'team-sma', name: 'Marta Lozano Pino', role: 'PHYSIO', photoUrl: STAFF_SILHOUETTE },
  
  { id: 'st-sf-1', teamId: 'team-sf', name: 'Irene Morales Delgado', role: 'HEAD_COACH', photoUrl: STAFF_SILHOUETTE },
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
