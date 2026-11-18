import { NextRequest, NextResponse } from 'next/server';
import {
  verifyDirectConsentToken,
  getPlayerDataForDirectConsent,
  unlockDirectConsentWithFactor,
  DirectConsentUnlockFactor,
} from '@/lib/consent-store';
import {
  getClientIp,
  checkNeonRateLimit,
  isNeonRateLimited,
  recordNeonFailedAttempt,
  clearNeonRateLimit,
} from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const MAX_FAILED_UNLOCKS = 10;
const WINDOW_SEC = 10 * 60;
const BLOCK_SEC = 10 * 60;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

function parseUnlockFactor(raw: unknown): DirectConsentUnlockFactor | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const otpChallengeId = typeof obj.otpChallengeId === 'string' ? obj.otpChallengeId.trim() : '';
  const otpCode = typeof obj.otpCode === 'string' ? obj.otpCode.trim() : '';
  const purpose = obj.purpose === 'RECEIPT' ? 'RECEIPT' : 'SIGN';

  if (!(otpChallengeId && otpCode)) {
    return null;
  }

  return { otpChallengeId, otpCode, purpose };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    let body: { directToken?: unknown; mode?: unknown; factor?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const mode = body.mode === 'inspect' ? 'inspect' : 'unlock';
    const reqBucket = `direct-token-req:${mode}:${clientIp}`;
    const maxRequests = mode === 'inspect' ? 60 : 30;
    const reqLimit = await checkNeonRateLimit(reqBucket, maxRequests, WINDOW_SEC, BLOCK_SEC);
    if (!reqLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas solicitudes. Espera ${Math.ceil(reqLimit.retryAfterSec / 60)} minutos.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(reqLimit.retryAfterSec),
          },
        }
      );
    }

    const directToken = typeof body.directToken === 'string' ? body.directToken.trim() : '';
    if (!directToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se ha proporcionado el token de enlace directo.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const hasExplicitFactor = mode !== 'inspect' && body.factor !== undefined;
    const factor = mode === 'inspect' ? null : parseUnlockFactor(body.factor);

    if (hasExplicitFactor && !factor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Introduce el código OTP de 6 dígitos enviado a tu correo electrónico para continuar.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // 1. Modo inspección inicial: nunca penaliza ni consulta failBucket del desbloqueo OTP
    if (!factor) {
      const verification = await verifyDirectConsentToken(directToken);
      if (!verification.valid || !verification.playerId) {
        return NextResponse.json(
          {
            success: false,
            error: verification.error || 'El enlace directo ha caducado o no es válido.',
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const data = await getPlayerDataForDirectConsent(verification.playerId, verification.prefill);
      if (!data.valid || !data.player) {
        return NextResponse.json(
          {
            success: false,
            error: data.error || 'No se han encontrado los datos del deportista asociado.',
          },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          success: true,
          requiresFactorUnlock: true,
          player: data.player,
          alreadySigned: data.alreadySigned,
          hasCensusEmail: data.hasCensusEmail,
          maskedContactEmail: data.maskedContactEmail,
          challengeSupported: data.challengeSupported,
          maskedPrefill: data.maskedPrefill,
          existingConsent: data.existingConsent,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // 2. Modo desbloqueo OTP: validamos HMAC del enlace antes para aislar el failBucket por token jti
    const tokenPre = await verifyDirectConsentToken(directToken);
    if (!tokenPre.valid || !tokenPre.jti) {
      const badTokBucket = `direct-token-badtok:${clientIp}`;
      const badLimit = await isNeonRateLimited(badTokBucket);
      if (badLimit.limited) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiados intentos con enlaces no válidos. Espera ${Math.ceil(badLimit.retryAfterSec / 60)} minutos.`,
          },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              'Retry-After': String(badLimit.retryAfterSec),
            },
          }
        );
      }
      await recordNeonFailedAttempt(badTokBucket, 15, WINDOW_SEC, BLOCK_SEC);
      return NextResponse.json(
        {
          success: false,
          error: tokenPre.error || 'El enlace directo ha caducado o no es válido.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const failBucket = `direct-token-fail:${clientIp}:${tokenPre.jti}`;
    const failLimit = await isNeonRateLimited(failBucket);
    if (failLimit.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos OTP fallidos para este enlace. Espera ${Math.ceil(failLimit.retryAfterSec / 60)} minutos o solicita un nuevo código.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(failLimit.retryAfterSec),
          },
        }
      );
    }

    const unlockRes = await unlockDirectConsentWithFactor(directToken, factor);
    if (!unlockRes.valid) {
      await recordNeonFailedAttempt(failBucket, MAX_FAILED_UNLOCKS, WINDOW_SEC, BLOCK_SEC);
      return NextResponse.json(
        {
          success: false,
          error: unlockRes.error || 'Los datos de verificación no coinciden.',
        },
        { status: unlockRes.statusCode || 403, headers: NO_STORE_HEADERS }
      );
    }

    await clearNeonRateLimit(failBucket);

    return NextResponse.json(
      {
        success: true,
        requiresFactorUnlock: false,
        emailOtpVerified: Boolean(unlockRes.emailOtpVerified),
        player: unlockRes.player,
        alreadySigned: unlockRes.alreadySigned,
        hasCensusEmail: unlockRes.hasCensusEmail,
        maskedContactEmail: unlockRes.maskedContactEmail,
        verificationToken: unlockRes.verificationToken,
        actionToken: unlockRes.actionToken,
        prefilledData: unlockRes.prefilledData,
        existingConsent: unlockRes.existingConsent,
        receiptDetail: unlockRes.receiptDetail,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo conectar con la base de datos oficial. Inténtalo de nuevo en unos instantes.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Verify Direct Token] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al verificar el enlace directo.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
