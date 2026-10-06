import fs from 'fs';

const COMPETITIONS = [
  {
    compId: 1,
    grupo: 13,
    fase: 14,
    categoryId: 'cat-senior-fem',
    categoryName: 'Senior Femenino (1ª Andaluza)',
    teamId: 'team-sf',
    teamName: 'Senior Femenino',
    division: '1ª División Andaluza Femenina (FAVB)',
    gender: 'FEMALE',
    level: 'SENIOR',
    spTeamPattern: /VOLEIBOL SAN PEDRO/i,
  },
  {
    compId: 1321,
    grupo: 35,
    fase: 36,
    categoryId: 'cat-juvenil-masc',
    categoryName: 'Juvenil Masculino (Málaga)',
    teamId: 'team-jm',
    teamName: 'Juvenil Masculino',
    division: 'Liga Provincial Málaga - Juvenil Masc (FAVB)',
    gender: 'MALE',
    level: 'YOUTH',
    spTeamPattern: /VOLEIBOL SAN PEDRO/i,
  },
  {
    compId: 1330,
    grupo: 43,
    fase: 44,
    categoryId: 'cat-juvenil-fem-rojo',
    categoryName: 'Juvenil Femenino Rojo (Málaga)',
    teamId: 'team-jf-rojo',
    teamName: 'Juvenil Femenino Rojo',
    division: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
    gender: 'FEMALE',
    level: 'YOUTH',
    spTeamPattern: /VOLEIBOL SAN PEDRO ROJO/i,
  },
  {
    compId: 1330,
    grupo: 99,
    fase: 128,
    categoryId: 'cat-juvenil-fem-negro',
    categoryName: 'Juvenil Femenino Negro (Málaga)',
    teamId: 'team-jf-negro',
    teamName: 'Juvenil Femenino Negro',
    division: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
    gender: 'FEMALE',
    level: 'YOUTH',
    spTeamPattern: /VOLEIBOL SAN PEDRO NEGRO/i,
  },
  {
    compId: 1313,
    grupo: 72,
    fase: 94,
    categoryId: 'cat-cadete-masc',
    categoryName: 'Cadete Masculino (Málaga)',
    teamId: 'team-cm',
    teamName: 'Cadete Masculino',
    division: 'Liga Provincial Málaga - Cadete Masc (FAVB)',
    gender: 'MALE',
    level: 'CADET',
    spTeamPattern: /VOLEIBOL SAN PEDRO/i,
  },
  {
    compId: 1304,
    grupo: 76,
    fase: 100,
    categoryId: 'cat-cadete-fem-rojo',
    categoryName: 'Cadete Femenino Rojo (Málaga)',
    teamId: 'team-cf-rojo',
    teamName: 'Cadete Femenino Rojo',
    division: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
    gender: 'FEMALE',
    level: 'CADET',
    spTeamPattern: /VOLEIBOL SAN PEDRO ROJO/i,
  },
  {
    compId: 1304,
    grupo: 100,
    fase: 132,
    categoryId: 'cat-cadete-fem-negro',
    categoryName: 'Cadete Femenino Negro (Málaga)',
    teamId: 'team-cf-negro',
    teamName: 'Cadete Femenino Negro',
    division: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
    gender: 'FEMALE',
    level: 'CADET',
    spTeamPattern: /VOLEIBOL SAN PEDRO NEGRO/i,
  },
  {
    compId: 1288,
    grupo: 71,
    fase: 92,
    categoryId: 'cat-infantil-masc',
    categoryName: 'Infantil Masculino (Málaga)',
    teamId: 'team-im',
    teamName: 'Infantil Masculino',
    division: 'Liga Provincial Málaga - Infantil Masc (FAVB)',
    gender: 'MALE',
    level: 'INFANTIL',
    spTeamPattern: /VOLEIBOL SAN PEDRO/i,
  },
  {
    compId: 1299,
    grupo: 75,
    fase: 97,
    categoryId: 'cat-infantil-fem-rojo',
    categoryName: 'Infantil Femenino Rojo (Málaga)',
    teamId: 'team-if-rojo',
    teamName: 'Infantil Femenino Rojo',
    division: 'Liga Provincial Málaga - Grupo Oro (FAVB)',
    gender: 'FEMALE',
    level: 'INFANTIL',
    spTeamPattern: /VOLEIBOL SAN PEDRO ROJO/i,
  },
  {
    compId: 1299,
    grupo: 75,
    fase: 98,
    categoryId: 'cat-infantil-fem-negro',
    categoryName: 'Infantil Femenino Negro (Málaga)',
    teamId: 'team-if-negro',
    teamName: 'Infantil Femenino Negro',
    division: 'Liga Provincial Málaga - Grupo Plata (FAVB)',
    gender: 'FEMALE',
    level: 'INFANTIL',
    spTeamPattern: /VOLEIBOL SAN PEDRO NEGRO/i,
  },
  {
    compId: 1299,
    grupo: 101,
    fase: 134,
    categoryId: 'cat-infantil-fem-blanco',
    categoryName: 'Infantil Femenino Blanco (Málaga)',
    teamId: 'team-if-blanco',
    teamName: 'Infantil Femenino Blanco',
    division: 'Liga Provincial Málaga - Grupo Promoción (FAVB)',
    gender: 'FEMALE',
    level: 'INFANTIL',
    spTeamPattern: /VOLEIBOL SAN PEDRO BLANCO/i,
  },
];

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseDateMadrid(dateStr, timeStr) {
  if (!dateStr) return new Date().toISOString();
  let day, month, year;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  }
  const time = timeStr && timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : '12:00';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00.000Z`;
}

async function scrapeAll() {
  console.log('--- Scraping FAVB Federation matches & standings ---');
  const allMatches = [];
  const allStandings = [];

  for (const comp of COMPETITIONS) {
    console.log(`\nComp: ${comp.categoryName} (ID ${comp.compId})`);

    // 1. Fetch Calendar View
    const calUrl = `https://favoley.net/publico/seccion.php?seccion=competicion&id=${comp.compId}&vista=calendario&grupo=${comp.grupo}&fase=${comp.fase}`;
    const calHtml = await fetchHtml(calUrl);

    // Map of jornadas and their weekend date range
    const jDateMap = new Map();
    const optRegex = /<option value="[^"]*jornada=(\d+)"[^>]*>Jornada\s*\d+\s*·\s*(\d{2}-\d{2}-\d{4})\s*-\s*(\d{2}-\d{2}-\d{4})/g;
    let om;
    while ((om = optRegex.exec(calHtml)) !== null) {
      jDateMap.set(parseInt(om[1]), { start: om[2], end: om[3] });
    }

    const jRegex = /option value="[^"]*jornada=(\d+)"/g;
    const jornadas = new Set();
    let jm;
    while ((jm = jRegex.exec(calHtml)) !== null) {
      jornadas.add(parseInt(jm[1]));
    }
    const maxJ = jornadas.size > 0 ? Math.max(...jornadas) : 1;

    for (let j = 1; j <= maxJ; j++) {
      const jUrl = `https://favoley.net/publico/seccion.php?seccion=competicion&id=${comp.compId}&vista=calendario&grupo=${comp.grupo}&fase=${comp.fase}&jornada=${j}`;
      const jHtml = await fetchHtml(jUrl);

      const matchBtnRegex = /<button[^>]*class="[^"]*portal-comp-partido[^"]*"[^>]*data-id-partido="(\d+)"[^>]*>([\s\S]*?)<\/button>/g;
      let btnMatch;
      while ((btnMatch = matchBtnRegex.exec(jHtml)) !== null) {
        const matchId = btnMatch[1];
        const btnInner = btnMatch[2];

        const teamsRegex = /<span class="portal-comp-partido-equipo">[\s\S]*?<b>([^<]*)<\/b>[\s\S]*?<strong>([^<]*)<\/strong>/g;
        const teams = [];
        let tMatch;
        while ((tMatch = teamsRegex.exec(btnInner)) !== null) {
          teams.push({
            name: tMatch[1].trim(),
            score: tMatch[2].trim(),
          });
        }

        if (teams.length < 2) continue;

        const homeTeam = teams[0].name;
        const awayTeam = teams[1].name;

        const isSpHome = comp.spTeamPattern.test(homeTeam);
        const isSpAway = comp.spTeamPattern.test(awayTeam);

        if (!isSpHome && !isSpAway) continue;

        // Schedule
        let dateStr = '';
        let timeStr = '12:00';
        const progMatch = btnInner.match(/<span>(\d{2}-\d{2}-\d{4})\s*·\s*(\d{2}:\d{2})<\/span>/);
        if (progMatch) {
          dateStr = progMatch[1];
          timeStr = progMatch[2];
        } else {
          const dateOnly = btnInner.match(/<span>(\d{2}-\d{2}-\d{4})<\/span>/);
          if (dateOnly) {
            dateStr = dateOnly[1];
          } else if (jDateMap.has(j)) {
            // Default to the weekend Saturday/Sunday
            dateStr = jDateMap.get(j).start;
            timeStr = isSpHome ? '18:30' : '12:00';
          }
        }

        // Venue
        let venue = isSpHome ? 'Pabellón Polideportivo Sergio Scariolo' : 'Pabellón Municipal Visitante';
        const venueMatch = btnInner.match(/<small>([^<]*)<\/small>/);
        if (venueMatch && venueMatch[1].trim()) {
          venue = venueMatch[1].trim();
        }

        // State
        let status = 'SCHEDULED';
        if (/estado-finalizado|Finalizado/i.test(btnInner)) {
          status = 'FINISHED';
        } else if (/En juego|En directo/i.test(btnInner)) {
          status = 'LIVE';
        }

        let setScores = [];
        if (status === 'FINISHED') {
          try {
            const mUrl = `https://favoley.net/publico/seccion.php?seccion=marcador&id=${matchId}`;
            const mHtml = await fetchHtml(mUrl);
            const partialRegex = /<div class="portal-marcador-parcial"[^>]*>[\s\S]*?<b>Set\s*(\d+)<\/b>[\s\S]*?<span>(\d+)<\/span>[\s\S]*?<span>(\d+)<\/span>/g;
            let pMatch;
            while ((pMatch = partialRegex.exec(mHtml)) !== null) {
              setScores.push({
                home: parseInt(pMatch[2], 10),
                away: parseInt(pMatch[3], 10),
              });
            }
          } catch (e) {
            console.warn(`Could not fetch marcador ${matchId}: ${e.message}`);
          }
        }

        allMatches.push({
          id: `favb-${matchId}`,
          favbMatchId: matchId,
          teamId: comp.teamId,
          categoryId: comp.categoryId,
          categoryName: comp.categoryName,
          round: j,
          homeTeamName: homeTeam,
          awayTeamName: awayTeam,
          isClubHome: isSpHome,
          venueName: venue,
          matchDate: parseDateMadrid(dateStr, timeStr),
          status,
          homeScore: teams[0].score !== '-' && teams[0].score !== '' ? parseInt(teams[0].score, 10) : undefined,
          awayScore: teams[1].score !== '-' && teams[1].score !== '' ? parseInt(teams[1].score, 10) : undefined,
          setScores,
          favbMatchUrl: `https://favoley.net/publico/seccion.php?seccion=marcador&id=${matchId}`,
        });
      }
    }

    // 2. Fetch Standings
    try {
      const standUrl = `https://favoley.net/publico/seccion.php?seccion=competicion&id=${comp.compId}&vista=clasificacion&grupo=${comp.grupo}&fase=${comp.fase}`;
      const standHtml = await fetchHtml(standUrl);

      // Matches <tr><td>1</td><td>NAME</td><td><strong>3</strong></td><td>1</td><td>1</td><td>0</td>...<td>SF</td><td>SC</td>
      const rowRegex = /<tr>\s*<td>(\d+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>(?:<strong>)?(\d+)(?:<\/strong>)?<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>[\s\S]*?<td>(\d+)<\/td>\s*<td>(\d+)<\/td>/g;
      let rMatch;
      while ((rMatch = rowRegex.exec(standHtml)) !== null) {
        const teamName = rMatch[2].trim();
        const isCurrentClub = comp.spTeamPattern.test(teamName);
        allStandings.push({
          id: `std-${comp.categoryId}-${rMatch[1]}`,
          categoryId: comp.categoryId,
          categoryName: comp.categoryName,
          pos: parseInt(rMatch[1], 10),
          teamName,
          isCurrentClub,
          points: parseInt(rMatch[3], 10),
          played: parseInt(rMatch[4], 10),
          won: parseInt(rMatch[5], 10),
          lost: parseInt(rMatch[6], 10),
          setsFor: parseInt(rMatch[7], 10),
          setsAgainst: parseInt(rMatch[8], 10),
        });
      }
      console.log(`Standings rows for ${comp.categoryName}: ${allStandings.filter(s => s.categoryId === comp.categoryId).length}`);
    } catch (e) {
      console.warn(`Could not fetch standings for ${comp.categoryName}: ${e.message}`);
    }
  }

  console.log(`\nDONE: ${allMatches.length} matches, ${allStandings.length} standings rows.`);
  fs.writeFileSync('scripts/favb-data-scraped.json', JSON.stringify({ matches: allMatches, standings: allStandings, competitions: COMPETITIONS }, null, 2), 'utf-8');
}

scrapeAll().catch(console.error);
