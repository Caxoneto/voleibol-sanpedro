import { NextRequest, NextResponse } from 'next/server';
import { syncFavbStandings } from '@/lib/favb-scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';

  if (force) {
    const secFetchSite = req.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado a peticiones entre sitios para forzar sincronización' },
        { status: 403, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }
  }

  try {
    const result = await syncFavbStandings(force);
    return NextResponse.json(
      {
        success: result.success,
        standings: result.standings,
        lastSync: result.lastSync.toISOString(),
        fromCache: result.fromCache,
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error('[API /api/favb/standings] Error al sincronizar clasificaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al sincronizar clasificaciones oficiales con favoley.net' },
      {
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
