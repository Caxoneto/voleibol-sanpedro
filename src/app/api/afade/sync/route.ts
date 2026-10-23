import { NextResponse } from 'next/server';
import { syncAfadeData } from '@/lib/afade-scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  if (force) {
    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado a peticiones entre sitios para forzar sincronización' },
        { status: 403, headers: { 'X-Content-Type-Options': 'nosniff' } }
      );
    }
  }

  try {
    const data = await syncAfadeData(force);
    return NextResponse.json(
      {
        success: true,
        lastSync: data.lastSync,
        matchesCount: data.matches.length,
        matches: data.matches,
        standings: data.standings,
        source: 'Liga AFADE (ligaafade.es)',
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
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
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
