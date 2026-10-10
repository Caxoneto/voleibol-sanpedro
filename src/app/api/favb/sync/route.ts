import { NextResponse } from 'next/server';
import { syncFavbData } from '@/lib/favb-scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    const data = await syncFavbData(force);
    return NextResponse.json({
      success: true,
      lastSync: data.lastSync,
      matchesCount: data.matches.length,
      fromCache: data.fromCache,
      matches: data.matches,
      source: 'Federación Andaluza de Voleibol (favoley.net)',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo sincronizar con favoley.net',
      },
      { status: 500 }
    );
  }
}
