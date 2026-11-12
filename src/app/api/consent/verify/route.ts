import { NextRequest, NextResponse } from 'next/server';
import { verifyPlayerIdentity } from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, birthYearOrDate, dniLast5 } = body;

    if (!playerId || !birthYearOrDate || !dniLast5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Por favor, completa todos los campos requeridos para la verificación.',
        },
        { status: 400 }
      );
    }

    const result = await verifyPlayerIdentity(playerId, birthYearOrDate, dniLast5);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      player: result.player,
      alreadySigned: result.alreadySigned,
      existingConsent: result.existingConsent,
    });
  } catch (err) {
    console.error('[API Consent Verify] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor al procesar la verificación.',
      },
      { status: 500 }
    );
  }
}
