import { NextRequest, NextResponse } from 'next/server';
import { verifyPlayerIdentity } from '@/lib/consent-store';
import { getClientIp, consentVerifyRateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    if (consentVerifyRateLimiter.isRateLimited(clientIp)) {
      const remainingSec = consentVerifyRateLimiter.getRemainingSeconds(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos de verificación. Por favor, espera ${Math.ceil(remainingSec / 60)} minutos antes de reintentar.`,
        },
        { status: 429 }
      );
    }

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
      consentVerifyRateLimiter.recordFailedAttempt(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    consentVerifyRateLimiter.clearAttempts(clientIp);

    return NextResponse.json({
      success: true,
      player: result.player,
      alreadySigned: result.alreadySigned,
      verificationToken: result.verificationToken,
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
