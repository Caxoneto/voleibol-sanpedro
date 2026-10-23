import { NextResponse } from 'next/server';
import { updateMatchLiveScore } from '@/lib/favb-scraper';
import { updateAfadeMatchLiveScore } from '@/lib/afade-scraper';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const matchId = params.id;

  if (!matchId || !/^[a-zA-Z0-9_-]{1,64}$/.test(matchId)) {
    return NextResponse.json(
      { success: false, error: 'Identificador de partido inválido' },
      {
        status: 400,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const simulate = searchParams.get('simulate') === 'true';

  try {
    if (matchId.startsWith('afade-')) {
      const afadeResult = await updateAfadeMatchLiveScore(matchId);
      if (!afadeResult.success) {
        return NextResponse.json(
          { success: false, error: afadeResult.error || 'Partido no encontrado en ligaafade.es' },
          {
            status: 404,
            headers: {
              'X-Content-Type-Options': 'nosniff',
            },
          }
        );
      }
      return NextResponse.json(
        {
          success: true,
          match: afadeResult.match,
          timestamp: new Date().toISOString(),
          source: 'Liga AFADE (ligaafade.es)',
        },
        {
          headers: {
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const result = await updateMatchLiveScore(matchId, simulate);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Partido no encontrado' },
        {
          status: 404,
          headers: {
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        match: result.match,
        timestamp: new Date().toISOString(),
        source: 'Federación Andaluza de Voleibol (favoley.net)',
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    console.error(`[API /api/favb/match/${matchId}] Error:`, error);
    return NextResponse.json(
      { success: false, error: 'Error interno al consultar el marcador en favoley.net' },
      {
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
