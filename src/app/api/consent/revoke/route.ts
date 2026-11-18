import { NextRequest, NextResponse } from 'next/server';
import {
  resolvePlayerIdSafe,
  createConsentVerificationToken,
  verifyConsentActionToken,
  verifyDirectConsentToken,
  revokePlayerConsentByOtp,
} from '@/lib/consent-store';
import { isEmailOtpEnabled, isDevConsoleOtpBypassAllowed } from '@/lib/email-otp';
import { getClientIp, checkNeonRateLimit, consumeTokenOnce } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`consent-revoke:${clientIp}`, 10, 900, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos de revocación. Espera unos minutos antes de reintentar.',
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rl.retryAfterSec),
          },
        }
      );
    }

    if (!isEmailOtpEnabled() && !isDevConsoleOtpBypassAllowed()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El servicio de verificación OTP por correo no está disponible temporalmente.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    let body: {
      playerId?: unknown;
      actionToken?: unknown;
      directToken?: unknown;
      otpChallengeId?: unknown;
      otpCode?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const canonicalId = resolvePlayerIdSafe(
      typeof body.playerId === 'string' ? body.playerId : null
    );
    if (!canonicalId) {
      return NextResponse.json(
        { success: false, error: 'Identificador de deportista no válido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const actionToken = typeof body.actionToken === 'string' ? body.actionToken.trim() : '';
    const directToken = typeof body.directToken === 'string' ? body.directToken.trim() : '';

    let actionCheck: { valid: boolean; jti?: string; expIso?: string } = { valid: false };
    let directTokenMeta: { jti: string; expIso: string } | undefined;

    if (actionToken) {
      actionCheck = await verifyConsentActionToken(actionToken, canonicalId);
    } else if (directToken) {
      const directRes = await verifyDirectConsentToken(directToken);
      if (directRes.valid && directRes.playerId === canonicalId && directRes.jti && directRes.expIso) {
        directTokenMeta = { jti: directRes.jti, expIso: directRes.expIso };
      }
    }

    const authorizedByAction = Boolean(actionCheck.valid && actionCheck.jti && actionCheck.expIso);
    const authorizedByDirect = Boolean(directTokenMeta);

    if (!authorizedByAction && !authorizedByDirect) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sesión de acción no válida o expirada. Vuelve a verificar la identidad en el Paso 1.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const otpChallengeId =
      typeof body.otpChallengeId === 'string' ? body.otpChallengeId.trim() : '';
    const otpCode = typeof body.otpCode === 'string' ? body.otpCode.trim() : '';

    if (!otpChallengeId || !otpCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere validar el código OTP de 6 dígitos para revocar la autorización.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const revokeRes = await revokePlayerConsentByOtp({
      playerId: canonicalId,
      otpChallengeId,
      otpCode,
    });

    if (!revokeRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: revokeRes.error || 'No se pudo revocar la autorización.',
        },
        { status: revokeRes.statusCode || 400, headers: NO_STORE_HEADERS }
      );
    }

    if (authorizedByAction && actionCheck.jti && actionCheck.expIso) {
      await consumeTokenOnce(actionCheck.jti, 'consent-action', actionCheck.expIso);
    }
    // Con directToken no lo consumimos al revocar: propagamos sus metadatos al verificationToken para consumirlo al firmar.
    const verificationToken = createConsentVerificationToken(canonicalId, {
      directTokenJti: directTokenMeta?.jti,
      directTokenExpIso: directTokenMeta?.expIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Autorización revocada correctamente conforme al Art. 7.3 del RGPD.',
        verificationToken,
        prefilledData: revokeRes.prefilledData,
        hasCensusEmail: revokeRes.hasCensusEmail,
        maskedContactEmail: revokeRes.maskedContactEmail,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos no disponible temporalmente para procesar la revocación.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Consent Revoke] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al revocar la autorización.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
