import { NextResponse } from 'next/server';
import { FAVB_PLAYERS, FAVB_STAFF, FAVB_MATCHES } from '@/lib/favb-data';
import { Player, Staff, Position } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CachedRosters {
  lastSync: number;
  players: Player[];
  staff: Staff[];
}

let rosterCache: CachedRosters = {
  lastSync: 0,
  players: [],
  staff: [],
};

const ROSTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function titleCase(str: string): string {
  return str
    .replace(/\s*\/\s*$/, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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

export async function GET() {
  const now = Date.now();
  if (rosterCache.players.length > 0 && now - rosterCache.lastSync < ROSTER_CACHE_TTL) {
    return NextResponse.json({
      success: true,
      players: rosterCache.players,
      staff: rosterCache.staff,
    });
  }

  try {
    // Seleccionar los primeros 2 partidos de cada teamId para comprobar si tienen convocatoria en favoley.net
    const matchesByTeam = new Map<string, typeof FAVB_MATCHES>();
    for (const m of FAVB_MATCHES) {
      const list = matchesByTeam.get(m.teamId) || [];
      if (list.length < 2) {
        list.push(m);
        matchesByTeam.set(m.teamId, list);
      }
    }

    const scrapedTeamPersonas = new Map<
      string,
      Map<string, { nombre: string; tipo: string; dorsal: string; capitan: number; libero: number }>
    >();

    const toCheck = Array.from(matchesByTeam.values()).flat();
    await Promise.all(
      toCheck.map(async (m) => {
        const fid = m.id.replace('favb-', '');
        try {
          const res = await fetch(`https://favoley.net/publico/seccion.php?seccion=marcador&id=${fid}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
          });
          if (!res.ok) return;
          const html = await res.text();
          const convMatch = html.match(/const\s+convocatorias\s*=\s*(\{[\s\S]*?\});\s*const\s+modal/);
          if (!convMatch) return;
          const conv = JSON.parse(
            convMatch[1]
              .replace(/^\s*local\s*:/m, '"local":')
              .replace(/^\s*visitante\s*:/m, '"visitante":')
              .replace(/(\{|,)\s*nombre\s*:/g, '$1"nombre":')
              .replace(/(\{|,)\s*personas\s*:/g, '$1"personas":')
          );
          const isHomeSp = m.homeTeamName.toUpperCase().includes('SAN PEDRO');
          const ourSide = isHomeSp ? conv.local : conv.visitante;
          if (ourSide && Array.isArray(ourSide.personas) && ourSide.personas.length > 0) {
            if (!scrapedTeamPersonas.has(m.teamId)) {
              scrapedTeamPersonas.set(m.teamId, new Map());
            }
            const tMap = scrapedTeamPersonas.get(m.teamId)!;
            for (const p of ourSide.personas) {
              const key = (p.nombre || '').trim().toUpperCase();
              if (key && !tMap.has(key)) {
                tMap.set(key, p);
              }
            }
          }
        } catch {
          // Ignorar errores de red individuales y mantener fallback de FAVB_PLAYERS
        }
      })
    );

    const updatedPlayers: Player[] = [];
    const teamIds = Array.from(new Set(FAVB_PLAYERS.map((p) => p.teamId)));

    for (const teamId of teamIds) {
      const scrapedMap = scrapedTeamPersonas.get(teamId);
      const fallbackPlayers = FAVB_PLAYERS.filter((p) => p.teamId === teamId);

      if (scrapedMap && scrapedMap.size > 0) {
        const rawList = Array.from(scrapedMap.values()).filter((p) => {
          const t = (p.tipo || '').toUpperCase().trim();
          return t !== 'C' && t !== 'AC1' && t !== 'AC2' && t !== 'D';
        });

        if (rawList.length > 0) {
          rawList.sort(
            (a, b) => (parseInt(a.dorsal || '99', 10) || 99) - (parseInt(b.dorsal || '99', 10) || 99)
          );
          const baseYear = fallbackPlayers[0]?.birthYear || 2008;
          const baseHeight = fallbackPlayers[0]?.heightCm || 172;

          rawList.forEach((p, idx) => {
            const { firstName, lastName } = splitFullName(p.nombre);
            const isLibero = Number(p.libero) === 1 || (p.tipo || '').toLowerCase().includes('líbero');
            const isCaptain = Number(p.capitan) === 1 || (p.tipo || '').toLowerCase().includes('capitán');
            updatedPlayers.push({
              id: `p-${teamId}-${idx + 1}`,
              teamId,
              number: parseInt(p.dorsal, 10) || idx + 1,
              firstName,
              lastName,
              position: isLibero ? 'LIBERO' : POS_CYCLE[idx % POS_CYCLE.length],
              birthYear: baseYear + (idx % 2),
              heightCm: isLibero ? baseHeight - 4 : baseHeight + ((idx * 2) % 6) - 2,
              photoUrl: '/images/player-placeholder.svg',
              isCaptain,
              isHomegrown: true,
            });
          });
          continue;
        }
      }

      updatedPlayers.push(...fallbackPlayers);
    }

    rosterCache = {
      lastSync: now,
      players: updatedPlayers,
      staff: FAVB_STAFF,
    };

    return NextResponse.json({
      success: true,
      players: updatedPlayers,
      staff: FAVB_STAFF,
    });
  } catch {
    return NextResponse.json({
      success: true,
      players: FAVB_PLAYERS,
      staff: FAVB_STAFF,
    });
  }
}
