import fs from 'fs';
import path from 'path';

const rawData = JSON.parse(fs.readFileSync('scripts/favb-data-scraped.json', 'utf8'));

const CATEGORIES = [
  { id: 'cat-senior-masc-a', name: 'Senior Masculino A', slug: 'senior-masculino-a', order: 1, description: '1ª División Andaluza Senior Masculina' },
  { id: 'cat-senior-fem', name: 'Senior Femenino (1ª Andaluza)', slug: 'senior-femenino', order: 2, description: '1ª División Andaluza Femenina (FAVB)' },
  { id: 'cat-juvenil-masc', name: 'Juvenil Masculino', slug: 'juvenil-masculino', order: 3, description: 'Liga Provincial Málaga - Juvenil Masc (FAVB)' },
  { id: 'cat-juvenil-fem-rojo', name: 'Juvenil Femenino Rojo', slug: 'juvenil-femenino-rojo', order: 4, description: 'Liga Provincial Málaga - Grupo Oro (FAVB)' },
  { id: 'cat-juvenil-fem-negro', name: 'Juvenil Femenino Negro', slug: 'juvenil-femenino-negro', order: 5, description: 'Liga Provincial Málaga - Grupo Plata (FAVB)' },
  { id: 'cat-cadete-masc', name: 'Cadete Masculino', slug: 'cadete-masculino', order: 6, description: 'Liga Provincial Málaga - Cadete Masc (FAVB)' },
  { id: 'cat-cadete-fem-rojo', name: 'Cadete Femenino Rojo', slug: 'cadete-femenino-rojo', order: 7, description: 'Liga Provincial Málaga - Grupo Oro (FAVB)' },
  { id: 'cat-cadete-fem-negro', name: 'Cadete Femenino Negro', slug: 'cadete-femenino-negro', order: 8, description: 'Liga Provincial Málaga - Grupo Plata (FAVB)' },
  { id: 'cat-infantil-masc', name: 'Infantil Masculino', slug: 'infantil-masculino', order: 9, description: 'Liga Provincial Málaga - Infantil Masc (FAVB)' },
  { id: 'cat-infantil-fem-rojo', name: 'Infantil Femenino Rojo', slug: 'infantil-femenino-rojo', order: 10, description: 'Liga Provincial Málaga - Grupo Oro (FAVB)' },
  { id: 'cat-infantil-fem-negro', name: 'Infantil Femenino Negro', slug: 'infantil-femenino-negro', order: 11, description: 'Liga Provincial Málaga - Grupo Plata (FAVB)' },
  { id: 'cat-infantil-fem-blanco', name: 'Infantil Femenino Blanco', slug: 'infantil-femenino-blanco', order: 12, description: 'Liga Provincial Málaga - Grupo Promoción (FAVB)' },
];

const TEAMS = [
  { id: 'team-sma', categoryId: 'cat-senior-masc-a', name: 'Senior Masculino A', division: '1ª División Andaluza', season: '2026/2027' },
  { id: 'team-sf', categoryId: 'cat-senior-fem', name: 'Senior Femenino (1ª Andaluza)', division: '1ª División Andaluza Femenina (FAVB)', season: '2026/2027' },
  { id: 'team-jm', categoryId: 'cat-juvenil-masc', name: 'Juvenil Masculino (MAJM26-1321)', division: 'Liga Provincial Málaga', season: '2026/2027' },
  { id: 'team-jf-rojo', categoryId: 'cat-juvenil-fem-rojo', name: 'Juvenil Femenino Rojo (MAJF26-1330)', division: 'Liga Provincial Málaga - Oro', season: '2026/2027' },
  { id: 'team-jf-negro', categoryId: 'cat-juvenil-fem-negro', name: 'Juvenil Femenino Negro (MAJF26-1330)', division: 'Liga Provincial Málaga - Plata', season: '2026/2027' },
  { id: 'team-cm', categoryId: 'cat-cadete-masc', name: 'Cadete Masculino (MACM26-1313)', division: 'Liga Provincial Málaga', season: '2026/2027' },
  { id: 'team-cf-rojo', categoryId: 'cat-cadete-fem-rojo', name: 'Cadete Femenino Rojo (MACF26-1304)', division: 'Liga Provincial Málaga - Oro', season: '2026/2027' },
  { id: 'team-cf-negro', categoryId: 'cat-cadete-fem-negro', name: 'Cadete Femenino Negro (MACF26-1304)', division: 'Liga Provincial Málaga - Plata', season: '2026/2027' },
  { id: 'team-im', categoryId: 'cat-infantil-masc', name: 'Infantil Masculino (MAIM26-1288)', division: 'Liga Provincial Málaga', season: '2026/2027' },
  { id: 'team-if-rojo', categoryId: 'cat-infantil-fem-rojo', name: 'Infantil Femenino Rojo (MAIF26-1299)', division: 'Liga Provincial Málaga - Oro', season: '2026/2027' },
  { id: 'team-if-negro', categoryId: 'cat-infantil-fem-negro', name: 'Infantil Femenino Negro (MAIF26-1299)', division: 'Liga Provincial Málaga - Plata', season: '2026/2027' },
  { id: 'team-if-blanco', categoryId: 'cat-infantil-fem-blanco', name: 'Infantil Femenino Blanco (MAIF26-1299)', division: 'Liga Provincial Málaga - Promoción', season: '2026/2027' },
];

// Combine matches
const seniorMascMatches = [
  {
    id: 'm-past-1',
    teamId: 'team-sma',
    round: 1,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Marbella Costa',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-03T18:30:00.000Z',
    status: 'FINISHED',
    setScores: [{ home: 25, away: 20 }, { home: 25, away: 23 }, { home: 25, away: 19 }],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
    mvpPlayerId: 'p-sma-2',
  },
  {
    id: 'm-next-1',
    teamId: 'team-sma',
    round: 2,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'CV Costa del Sol',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-10T18:30:00.000Z',
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
    isFeatured: true,
  },
  {
    id: 'm-fut-2',
    teamId: 'team-sma',
    round: 3,
    homeTeamName: 'CV Fuengirola B',
    awayTeamName: 'C.D. Voleibol San Pedro',
    isClubHome: false,
    venueName: 'Pabellón Juan Gómez Juanito (Fuengirola)',
    matchDate: '2026-10-17T17:00:00.000Z',
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
  },
  {
    id: 'm-fut-3',
    teamId: 'team-sma',
    round: 4,
    homeTeamName: 'C.D. Voleibol San Pedro',
    awayTeamName: 'Universidad de Málaga Voley',
    isClubHome: true,
    venueName: 'Pabellón Polideportivo Sergio Scariolo',
    matchDate: '2026-10-24T18:30:00.000Z',
    status: 'SCHEDULED',
    setScores: [],
    favbMatchUrl: 'https://favoley.net/publico/index.php',
  },
];

const mappedMatches = rawData.matches.map(m => ({
  id: m.id,
  teamId: m.teamId,
  round: m.round,
  homeTeamName: m.homeTeamName,
  awayTeamName: m.awayTeamName,
  isClubHome: m.isClubHome,
  venueName: m.venueName,
  matchDate: m.matchDate,
  status: m.status,
  setScores: m.setScores || [],
  favbMatchUrl: m.favbMatchUrl,
}));

const allMatches = [...seniorMascMatches, ...mappedMatches];

// Senior Masc Standings
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

const allStandings = [...seniorMascStandings, ...mappedStandings];

// Generate rosters for all 12 teams (at least 10 players each)
const FIRST_NAMES_MASC = ['Alejandro', 'Mateo', 'David', 'Javier', 'Pablo', 'Álvaro', 'Hugo', 'Marcos', 'Rubén', 'Sergio', 'Víctor', 'Lucas', 'Jorge', 'Diego', 'Eric', 'Manuel', 'Nicolás', 'Tomás', 'Adrián', 'Gonzalo', 'Iván'];
const FIRST_NAMES_FEM = ['Elena', 'Marta', 'Lucía', 'Sara', 'Carmen', 'Alba', 'Natalia', 'Paula', 'Irene', 'Claudia', 'Sofía', 'Daniela', 'Valeria', 'Noa', 'Carla', 'Martina', 'Emma', 'Julia', 'Marina', 'Nerea', 'Ainhoa'];
const LAST_NAMES = ['García', 'Fernández', 'López', 'Sánchez', 'Romero', 'Navarro', 'Castillo', 'Benítez', 'Ortiz', 'Carrasco', 'Mellado', 'Prieto', 'Díaz', 'Morales', 'Gil', 'Vega', 'Mendoza', 'Salgado', 'Peña', 'Vidal', 'Ríos'];
const POSITIONS = ['SETTER', 'OPPOSITE', 'OUTSIDE_HITTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'MIDDLE_BLOCKER', 'LIBERO', 'SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'LIBERO'];

const allPlayers = [];

TEAMS.forEach(team => {
  const isFemale = team.id.includes('f');
  const firstNames = isFemale ? FIRST_NAMES_FEM : FIRST_NAMES_MASC;
  let birthYearBase = 2000;
  let heightBase = 185;
  if (team.id.includes('sf') || team.id.includes('sma')) {
    birthYearBase = isFemale ? 2002 : 2000;
    heightBase = isFemale ? 176 : 192;
  } else if (team.id.includes('j')) {
    birthYearBase = 2007;
    heightBase = isFemale ? 174 : 188;
  } else if (team.id.includes('c')) {
    birthYearBase = 2009;
    heightBase = isFemale ? 171 : 182;
  } else if (team.id.includes('i')) {
    birthYearBase = 2011;
    heightBase = isFemale ? 165 : 175;
  }

  for (let idx = 0; idx < 10; idx++) {
    const fn = firstNames[(idx * 3 + team.id.length) % firstNames.length];
    const ln1 = LAST_NAMES[(idx * 2 + team.id.length * 2) % LAST_NAMES.length];
    const ln2 = LAST_NAMES[(idx * 5 + 3) % LAST_NAMES.length];
    const pos = POSITIONS[idx % POSITIONS.length];
    const num = (idx * 2 + 1) % 25 + 1;
    const height = heightBase + (idx % 7) * 2 - 4;
    const birthYear = birthYearBase + (idx % 3);

    allPlayers.push({
      id: `p-${team.id}-${idx + 1}`,
      teamId: team.id,
      number: num,
      firstName: fn,
      lastName: `${ln1} ${ln2}`,
      position: pos,
      birthYear,
      heightCm: height,
      photoUrl: '/images/player-placeholder.svg',
      isCaptain: idx === 0,
      isHomegrown: idx !== 3,
    });
  }
});

console.log(`Generated ${allPlayers.length} players across ${TEAMS.length} teams.`);
console.log(`Total Matches: ${allMatches.length}`);
console.log(`Total Standings: ${allStandings.length}`);

fs.writeFileSync('scripts/integrated-data.json', JSON.stringify({
  categories: CATEGORIES,
  teams: TEAMS,
  matches: allMatches,
  standings: allStandings,
  players: allPlayers
}, null, 2), 'utf8');

console.log('Saved to scripts/integrated-data.json');
