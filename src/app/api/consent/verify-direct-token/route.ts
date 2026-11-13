import { NextRequest, NextResponse } from 'next/server';
import {
  verifyDirectConsentToken,
  getPlayerDataForDirectConsent,
} from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { directToken } = body;

    if (!directToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se ha proporcionado el token de enlace directo.',
        },
        { status: 400 }
      );
    }

    const verification = verifyDirectConsentToken(directToken);
    if (!verification.valid || !verification.playerId) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || 'El enlace directo ha caducado o no es válido.',
        },
        { status: 400 }
      );
    }

    const data = await getPlayerDataForDirectConsent(verification.playerId, verification.prefill);
    if (!data.valid || !data.player) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'No se han encontrado los datos del deportista asociado.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player: data.player,
      alreadySigned: data.alreadySigned,
      verificationToken: data.verificationToken,
      prefilledData: data.prefilledData,
      existingConsent: data.existingConsent,
    });
  } catch (err) {
    console.error('[API Verify Direct Token] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al verificar el enlace directo.',
      },
      { status: 500 }
    );
  }
}
