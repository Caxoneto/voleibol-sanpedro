import { NextResponse } from 'next/server';
import { updateMatchLiveScore } from '@/lib/favb-scraper';
import { updateAfadeMatchLiveScore } from '@/lib/afade-scraper';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import { formatPlayerNameWithInitials } from '@/lib/club-info';
import type { MatchRosterPerson } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MATCH_CACHE_TTL_MS = 15_000;
const matchCache = new Map<
  string,
  {
    expiresAt: number;
    match: Record<string, unknown>;
    source: string;
    timestamp: string;
  }
>();

function sanitizeRoster(roster?: MatchRosterPerson[]): MatchRosterPerson[] | undefined {
  if (!Array.isArray(roster)) return undefined;
  return roster.map((p) => {
    const formatted = formatPlayerNameWithInitials(p?.name);
    const sanitized: MatchRosterPerson = {
      name: formatted.displayName || String(p?.name || ''),
    };
    if (p.dorsal !== undefined) sanitized.dorsal = p.dorsal;
    if (p.isCaptain !== undefined) sanitized.isCaptain = p.isCaptain;
    if (p.isLibero !== undefined) sanitized.isLibero = p.isLibero;
    if (p.isStaff !== undefined) sanitized.isStaff = p.isStaff;
    if (p.staffRole !== undefined) sanitized.staffRole = p.staffRole;
    if (p.originCategory !== undefined) sanitized.originCategory = p.originCategory;
    return sanitized;
  });
}

function sanitizeMatchPayload<
  T extends { homeRoster?: MatchRosterPerson[]; awayRoster?: MatchRosterPerson[] },
>(match: T): T {
  const cloned = { ...match } as Record<string, unknown>;
  if (Array.isArray(match.homeRoster)) {
    cloned.homeRoster = sanitizeRoster(match.homeRoster);
  }
  if (Array.isArray(match.awayRoster)) {
    cloned.awayRoster = sanitizeRoster(match.awayRoster);
  }
  return cloned as T;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const matchId = params.id;

  if (!matchId || !/^[a-zA-Z0-9_-]{1,64}$/.test(matchId)) {
    return NextResponse.json(
      { success: false, error: 'Identificador de partido inválido' },
      {
        status: 400,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const simulate = process.env.NODE_ENV !== 'production' && searchParams.get('simulate') === 'true';

  try {
    const clientIp = getClientIp(request);
    const rl = await checkNeonRateLimit(`public-favb-match:${clientIp}`, 60, 60, 120);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiadas consultas al marcador. Espera unos segundos antes de reintentar.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSec),
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    if (!simulate) {
      const cached = matchCache.get(matchId);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(
          {
            success: true,
            match: cached.match,
            timestamp: cached.timestamp,
            source: cached.source,
            cached: true,
          },
          {
            headers: {
              'X-Content-Type-Options': 'nosniff',
            },
          }
        );
      }
    }

    if (matchId.startsWith('afade-')) {
      const afadeResult = await updateAfadeMatchLiveScore(matchId);
      if (!afadeResult.success || !afadeResult.match) {
        return NextResponse.json(
          { success: false, error: afadeResult.error || 'Partido no encontrado en ligaafade.es' },
          {
            status: 404,
            headers: {
              'X-Content-Type-Options': 'nosniff',
            },
          }
        );
      }
      const sanitizedMatch = sanitizeMatchPayload(afadeResult.match);
      const timestamp = new Date().toISOString();
      const source = 'Liga AFADE (ligaafade.es)';
      if (!simulate) {
        if (matchCache.size > 300) matchCache.clear();
        matchCache.set(matchId, {
          expiresAt: Date.now() + MATCH_CACHE_TTL_MS,
          match: sanitizedMatch as unknown as Record<string, unknown>,
          source,
          timestamp,
        });
      }
      return NextResponse.json(
        {
          success: true,
          match: sanitizedMatch,
          timestamp,
          source,
        },
        {
          headers: {
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const result = await updateMatchLiveScore(matchId, simulate);

    if (!result.success || !result.match) {
      return NextResponse.json(
        { success: false, error: result.error || 'Partido no encontrado' },
        {
          status: 404,
          headers: {
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const sanitizedMatch = sanitizeMatchPayload(result.match);
    const timestamp = new Date().toISOString();
    const source = 'Federación Andaluza de Voleibol (favoley.net)';
    if (!simulate) {
      if (matchCache.size > 300) matchCache.clear();
      matchCache.set(matchId, {
        expiresAt: Date.now() + MATCH_CACHE_TTL_MS,
        match: sanitizedMatch as unknown as Record<string, unknown>,
        source,
        timestamp,
      });
    }

    return NextResponse.json(
      {
        success: true,
        match: sanitizedMatch,
        timestamp,
        source,
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error(`[API /api/favb/match/${matchId}] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error interno al consultar el marcador en favoley.net' },
      {
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
