import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncFavbData } from '@/lib/favb-scraper';
import { checkNeonRateLimit, getClientIp, verifyAdminSessionToken } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  try {
    const rl = await checkNeonRateLimit(`favb-sync:${clientIp}`, 90, 60, 60);
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
    // Si falla Neon temporalmente, el endpoint de calendario/partidos públicos no bloquea marcadores
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
    const data = await syncFavbData(force);
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
    };

    if (force) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      headers['Netlify-CDN-Cache-Control'] = 'public, s-maxage=30, stale-while-revalidate=120';
    }

    // Seguridad RGPD / Default-Deny: omitir siempre nombres de actas (homeRoster/awayRoster) en respuestas cacheadas;
    // proyectar solo conteos no identificativos (excluyendo staff) y delegar el acta completa a /api/favb/match/[id].
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
        fromCache: data.fromCache,
        matches: sanitizedMatches,
        source: 'Federación Andaluza de Voleibol (favoley.net)',
      },
      { headers }
    );
  } catch (error) {
    console.error('[API /api/favb/sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo sincronizar el calendario oficial con favoley.net',
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
