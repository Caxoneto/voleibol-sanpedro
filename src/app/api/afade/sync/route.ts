import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncAfadeData } from '@/lib/afade-scraper';
import { checkNeonRateLimit, getClientIp, verifyAdminSessionToken } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  try {
    const rl = await checkNeonRateLimit(`afade-sync:${clientIp}`, 90, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas peticiones de sincronización. Espera unos segundos.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Retry-After': String(rl.retryAfterSec),
          },
        }
      );
    }
  } catch {
    // Non-blocking fallback si no hay conexión Neon momentánea para marcadores públicos
  }

  const { searchParams } = new URL(request.url);
  const requestedForce = searchParams.get('force') === 'true';

  let isAdmin = false;
  if (requestedForce) {
    const token = cookies().get('cdv_admin_session')?.value;
    if (token) {
      try {
        isAdmin = await verifyAdminSessionToken(token);
      } catch {
        isAdmin = false;
      }
    }
  }

  const force = requestedForce && isAdmin;

  try {
    const data = await syncAfadeData(force);
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
    };

    if (force) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      headers['Netlify-CDN-Cache-Control'] = 'public, s-maxage=30, stale-while-revalidate=120';
    }

    const sanitizedMatches = data.matches.map(({ homeRoster, awayRoster, ...rest }) => ({
      ...rest,
      homeRosterCount: Array.isArray(homeRoster)
        ? homeRoster.filter((p) => !p.isStaff).length
        : rest.homeRosterCount,
      awayRosterCount: Array.isArray(awayRoster)
        ? awayRoster.filter((p) => !p.isStaff).length
        : rest.awayRosterCount,
    }));

    return NextResponse.json(
      {
        success: true,
        lastSync: data.lastSync,
        matchesCount: sanitizedMatches.length,
        fromCache: data.fromCache ?? false,
        matches: sanitizedMatches,
        standings: data.standings,
        source: 'Liga AFADE (ligaafade.es)',
      },
      { headers }
    );
  } catch (error) {
    console.error('[API /api/afade/sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo sincronizar la competición oficial con ligaafade.es',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
