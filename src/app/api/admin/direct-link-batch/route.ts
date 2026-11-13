import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminSessionToken,
  getBatchDirectConsentData,
} from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Inicia sesión en el panel de administración.',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { playerIds, daysValid = 30 } = body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere una lista de identificadores de deportistas.',
        },
        { status: 400 }
      );
    }

    // Límite de seguridad para evitar sobrecarga en una sola petición
    if (playerIds.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pueden generar más de 200 enlaces por lote.',
        },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'voleibolsanpedro.es';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const items = await getBatchDirectConsentData(playerIds, baseUrl, daysValid);

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
      expiresInDays: daysValid,
    });
  } catch (err) {
    console.error('[Admin Direct Link Batch] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar el lote de enlaces directos.',
      },
      { status: 500 }
    );
  }
}
