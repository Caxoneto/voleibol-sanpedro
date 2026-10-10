import { NextResponse } from 'next/server';
import { updateMatchLiveScore } from '@/lib/favb-scraper';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const matchId = params.id;
  const { searchParams } = new URL(request.url);
  const simulate = searchParams.get('simulate') === 'true';

  try {
    const result = await updateMatchLiveScore(matchId, simulate);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Partido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      match: result.match,
      rawScraped: result.rawScraped,
      warning: result.error,
      timestamp: new Date().toISOString(),
      source: 'Federación Andaluza de Voleibol (favoley.net)',
    });
  } catch (error) {
    console.error(`[API /api/favb/match/${matchId}] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error interno al consultar el marcador en favoley.net' },
      { status: 500 }
    );
  }
}
