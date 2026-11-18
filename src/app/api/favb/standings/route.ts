import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncFavbStandings } from '@/lib/favb-scraper';
import { checkNeonRateLimit, getClientIp, verifyAdminSessionToken } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  try {
    const rl = await checkNeonRateLimit(`favb-standings:${clientIp}`, 90, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas peticiones de clasificación. Espera unos segundos.' },
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
    // Non-blocking fallback si Neon no está disponible para clasificaciones públicas
  }

  const { searchParams } = new URL(req.url);
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
    const result = await syncFavbStandings(force);
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
    };

    if (force) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      headers['Netlify-CDN-Cache-Control'] = 'public, s-maxage=30, stale-while-revalidate=120';
    }

    return NextResponse.json(
      {
        success: result.success,
        standings: result.standings,
        lastSync: result.lastSync.toISOString(),
        fromCache: result.fromCache,
      },
      { headers }
    );
  } catch (error) {
    console.error('[API /api/favb/standings] Error al sincronizar clasificaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al sincronizar clasificaciones oficiales con favoley.net' },
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
