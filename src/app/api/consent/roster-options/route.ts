import { NextRequest, NextResponse } from 'next/server';
import { getRosterOptionsByTeam } from '@/lib/consent-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const TEAM_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`consent-roster-options:${clientIp}`, 60, 60, 120);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiadas consultas en poco tiempo. Espera unos segundos e inténtalo de nuevo.',
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rl.retryAfterSec),
          },
        }
      );
    }

    const teamId = req.nextUrl.searchParams.get('teamId')?.trim() || '';
    if (!teamId || !TEAM_ID_REGEX.test(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un identificador de equipo válido.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const players = await getRosterOptionsByTeam(teamId);

    return NextResponse.json(
      {
        success: true,
        players,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo conectar con el censo oficial del club. Inténtalo de nuevo en unos instantes.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Consent Roster Options] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al consultar los deportistas del equipo.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
