import { NextRequest, NextResponse } from 'next/server';
import { syncFavbRosters } from '@/lib/favb-scraper';
import { FAVB_PLAYERS, FAVB_STAFF } from '@/lib/favb-data';

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
    const result = await syncFavbRosters(force);
    return NextResponse.json(
      {
        success: result.success,
        players: result.players,
        staff: result.staff,
        lastSync: result.lastSync.toISOString(),
        fromCache: result.fromCache,
        source: 'Federación Andaluza de Voleibol (favoley.net)',
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error('[API /api/favb/rosters] Error al sincronizar plantillas:', error);
    return NextResponse.json(
      {
        success: true,
        players: FAVB_PLAYERS,
        staff: FAVB_STAFF,
        lastSync: new Date().toISOString(),
        fromCache: true,
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
