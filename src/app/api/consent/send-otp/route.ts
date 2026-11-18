import { NextRequest, NextResponse } from 'next/server';
import {
  isEmailOtpEnabled,
  isDevConsoleOtpBypassAllowed,
  createEmailOtpChallenge,
  sendConsentOtpEmail,
} from '@/lib/email-otp';
import {
  resolvePlayerIdSafe,
  verifyAndExtractConsentToken,
  verifyConsentActionToken,
  verifyDirectConsentToken,
  getAuthoritativeOtpTarget,
} from '@/lib/consent-store';
import { getClientIp, checkNeonRateLimit } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const OTP_WINDOW_SEC = 15 * 60;
const OTP_BLOCK_SEC = 15 * 60;
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET() {
  return NextResponse.json(
    {
      enabled: isEmailOtpEnabled(),
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const ipLimit = await checkNeonRateLimit(`send-otp-ip:${clientIp}`, 8, OTP_WINDOW_SEC, OTP_BLOCK_SEC);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiadas solicitudes de códigos OTP. Espera unos minutos antes de solicitar otro.',
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(ipLimit.retryAfterSec),
          },
        }
      );
    }

    let body: {
      playerId?: unknown;
      verificationToken?: unknown;
      actionToken?: unknown;
      directToken?: unknown;
      purpose?: unknown;
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
        {
          success: false,
          error: 'Identificador de deportista no válido.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Validar autorización de sesión antes de aplicar cuota por jugador o consultar censo
    const verificationToken =
      typeof body.verificationToken === 'string' ? body.verificationToken.trim() : '';
    const actionToken =
      typeof body.actionToken === 'string' ? body.actionToken.trim() : '';
    const directToken =
      typeof body.directToken === 'string' ? body.directToken.trim() : '';

    let isAuthorized = false;
    if (verificationToken) {
      const vRes = await verifyAndExtractConsentToken(verificationToken, canonicalId);
      if (vRes.valid) isAuthorized = true;
    }
    if (!isAuthorized && actionToken) {
      const aRes = await verifyConsentActionToken(actionToken, canonicalId);
      if (aRes.valid) isAuthorized = true;
    }
    if (!isAuthorized && directToken) {
      const dRes = await verifyDirectConsentToken(directToken);
      if (dRes.valid && dRes.playerId === canonicalId) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sesión de verificación no válida o expirada. Vuelve al Paso 1.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const playerLimit = await checkNeonRateLimit(
      `send-otp-player:${canonicalId}`,
      5,
      OTP_WINDOW_SEC,
      OTP_BLOCK_SEC
    );
    if (!playerLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se ha alcanzado el máximo de códigos OTP enviados para este deportista. Espera unos minutos.',
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(playerLimit.retryAfterSec),
          },
        }
      );
    }

    if (!isEmailOtpEnabled() && !isDevConsoleOtpBypassAllowed()) {
      return NextResponse.json(
        {
          success: false,
          smtpConfigured: false,
          error: 'El envío SMTP de códigos OTP no está disponible temporalmente en el servidor.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    // Ignorar email/playerName del body cliente: resolver exclusivamente desde Neon
    const target = await getAuthoritativeOtpTarget(canonicalId);
    if (!target.found || !target.playerId || !target.contactEmail) {
      return NextResponse.json(
        {
          success: false,
          hasCensusEmail: false,
          error:
            'No consta un correo electrónico de contacto validado en el censo para esta ficha. Contacta con secretaría (info@voleibolsanpedro.es) o utiliza el impreso presencial.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const purpose: 'SIGN' | 'REVOKE' | 'RECEIPT' =
      body.purpose === 'REVOKE'
        ? 'REVOKE'
        : body.purpose === 'RECEIPT'
        ? 'RECEIPT'
        : 'SIGN';

    const challenge = await createEmailOtpChallenge({
      playerId: target.playerId,
      email: target.contactEmail,
      purpose,
    });

    const sendRes = await sendConsentOtpEmail({
      toEmail: target.contactEmail,
      playerName: target.playerName || 'Deportista',
      otpCode: challenge.code,
      purpose,
    });

    if (!sendRes.sent) {
      return NextResponse.json(
        {
          success: false,
          error: sendRes.error || 'No se pudo enviar el correo de verificación.',
        },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        sent: true,
        challengeId: challenge.challengeId,
        maskedEmail: target.maskedEmail,
        expiresAtIso: challenge.expiresAtIso,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos no disponible temporalmente para emitir el código OTP.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Send OTP] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al enviar el código de verificación por correo.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
