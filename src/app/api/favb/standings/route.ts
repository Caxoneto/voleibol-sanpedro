import { NextRequest, NextResponse } from 'next/server';
import { syncFavbStandings } from '@/lib/favb-scraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';

  try {
    const result = await syncFavbStandings(force);
    return NextResponse.json({
      success: result.success,
      standings: result.standings,
      lastSync: result.lastSync.toISOString(),
      fromCache: result.fromCache,
    });
  } catch (error) {
    console.error('[API /api/favb/standings] Error al sincronizar clasificaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al sincronizar clasificaciones con favoley.net' },
      { status: 500 }
    );
  }
}
