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

function cleanHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

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
    // Seleccionar los primeros 2 partidos de cada teamId para comprobar si tienen nueva convocatoria en favoley.net
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
      Map<string, { nombre: string; rol: string; dorsal: string }>
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
          if (html.includes('Sin jugadores convocados') || !html.includes('portal-convocatoria-card')) {
            return;
          }

          const cardRegex = /<article class="portal-convocatoria-card">([\s\S]*?)<\/article>/gi;
          let cm;
          while ((cm = cardRegex.exec(html)) !== null) {
            const cardHtml = cm[1];
            const h3Match = cardHtml.match(/<h3>([\s\S]*?)<\/h3>/i);
            const teamTitle = h3Match ? cleanHtml(h3Match[1]).toUpperCase() : '';
            if (!teamTitle.includes('SAN PEDRO')) continue;

            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let trm;
            while ((trm = trRegex.exec(cardHtml)) !== null) {
              const tds = Array.from(trm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((t) =>
                cleanHtml(t[1])
              );
              if (tds.length >= 3) {
                const dorsal = tds[0];
                const nombre = tds[1];
                const rol = tds[2];
                const rolUpper = rol.toUpperCase();
                if (
                  rolUpper.includes('ENTRENADOR') ||
                  rolUpper.includes('DELEGAD') ||
                  rolUpper === 'E1' ||
                  rolUpper === 'E2'
                ) {
                  continue;
                }
                if (!scrapedTeamPersonas.has(m.teamId)) {
                  scrapedTeamPersonas.set(m.teamId, new Map());
                }
                const tMap = scrapedTeamPersonas.get(m.teamId)!;
                const key = nombre.toUpperCase();
                if (key && !tMap.has(key)) {
                  tMap.set(key, { nombre, rol, dorsal });
                }
              }
            }
          }
        } catch {
          // Ignorar errores puntuales de red y mantener base consolidada
        }
      })
    );

    const updatedPlayers: Player[] = [];
    const teamIds = Array.from(new Set(FAVB_PLAYERS.map((p) => p.teamId)));

    for (const teamId of teamIds) {
      const scrapedMap = scrapedTeamPersonas.get(teamId);
      const fallbackPlayers = FAVB_PLAYERS.filter((p) => p.teamId === teamId);

      // Si el acta en vivo de favoley.net tiene más jugadores reales que los ya consolidados, usar los raspados
      const existingRealCount = fallbackPlayers.filter(
        (fp) => fp.firstName !== 'Jugador' && fp.firstName !== 'Jugadora'
      ).length;

      if (scrapedMap && scrapedMap.size > existingRealCount) {
        const rawList = Array.from(scrapedMap.values());
        rawList.sort(
          (a, b) => (parseInt(a.dorsal || '99', 10) || 99) - (parseInt(b.dorsal || '99', 10) || 99)
        );
        const baseYear = fallbackPlayers[0]?.birthYear || 2008;
        const baseHeight = fallbackPlayers[0]?.heightCm || 172;

        rawList.forEach((p, idx) => {
          const { firstName, lastName } = splitFullName(p.nombre);
          const isLibero = p.rol.toLowerCase().includes('líbero') || p.rol.toLowerCase().includes('libero');
          const isCaptain = p.rol.toLowerCase().includes('capit');
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
