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

          const sides: { nombre: string; personasJson: string }[] = [];
          const localMatch = html.match(/local:\s*\{\s*nombre:\s*"([^"]*)",\s*personas:\s*(\[[\s\S]*?\])\s*\}/);
          if (localMatch) {
            sides.push({ nombre: localMatch[1], personasJson: localMatch[2] });
          }
          const visitMatch = html.match(/visitante:\s*\{\s*nombre:\s*"([^"]*)",\s*personas:\s*(\[[\s\S]*?\])\s*\}/);
          if (visitMatch) {
            sides.push({ nombre: visitMatch[1], personasJson: visitMatch[2] });
          }

          for (const side of sides) {
            if (!side.nombre.toUpperCase().includes('SAN PEDRO')) continue;
            const personas = JSON.parse(side.personasJson) as Array<{
              nombre?: string;
              tipo?: string;
              dorsal?: string | number;
              capitan?: number;
              libero?: number;
            }>;

            for (const p of personas) {
              const nombre = String(p.nombre || '').trim();
              const dorsal = String(p.dorsal ?? '').trim();
              const tipo = String(p.tipo || '').trim();
              const tipoUpper = tipo.toUpperCase();

              // Descartar entrenadores/asistentes (C, AC1, AC2 o sin dorsal)
              if (
                !nombre ||
                !dorsal ||
                tipoUpper === 'C' ||
                tipoUpper === 'AC1' ||
                tipoUpper === 'AC2' ||
                tipoUpper.includes('ENTRENADOR') ||
                tipoUpper.includes('DELEGAD')
              ) {
                continue;
              }

              if (!scrapedTeamPersonas.has(m.teamId)) {
                scrapedTeamPersonas.set(m.teamId, new Map());
              }
              const tMap = scrapedTeamPersonas.get(m.teamId)!;
              const key = nombre.toUpperCase();
              const rolParts = [tipo];
              if (Number(p.capitan) === 1) rolParts.push('Capitán');
              if (Number(p.libero) === 1) rolParts.push('Líbero');
              const rol = rolParts.filter(Boolean).join(' · ');

              if (!tMap.has(key)) {
                tMap.set(key, { nombre, rol, dorsal });
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
