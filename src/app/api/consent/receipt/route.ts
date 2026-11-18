import { NextRequest, NextResponse } from 'next/server';
import {
  resolvePlayerIdSafe,
  createConsentActionToken,
  verifyConsentActionToken,
  getAuthoritativeOtpTarget,
  getAdminConsentDetail,
  getSignatureMethodLabel,
} from '@/lib/consent-store';
import {
  isEmailOtpEnabled,
  isDevConsoleOtpBypassAllowed,
  verifyEmailOtpChallenge,
  sendConsentReceiptEmail,
} from '@/lib/email-otp';
import { maskDni } from '@/lib/encryption';
import { formatMadridTime } from '@/lib/date-utils';
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
    const rl = await checkNeonRateLimit(`consent-receipt:${clientIp}`, 10, 900, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos en poco tiempo. Espera unos minutos antes de reintentar.',
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
      otpChallengeId?: unknown;
      otpCode?: unknown;
      resendEmail?: unknown;
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
    const actionCheck = await verifyConsentActionToken(actionToken, canonicalId);
    if (!actionCheck.valid || !actionCheck.jti || !actionCheck.expIso) {
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
          error: 'Se requiere validar el código OTP de 6 dígitos para acceder al resguardo oficial.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const target = await getAuthoritativeOtpTarget(canonicalId);
    if (!target.found || !target.playerId || !target.contactEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'No consta un correo electrónico censado asociado a esta ficha. Contacta con info@voleibolsanpedro.es.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const otpCheck = await verifyEmailOtpChallenge({
      challengeId: otpChallengeId,
      playerId: target.playerId,
      email: target.contactEmail,
      code: otpCode,
      purpose: 'RECEIPT',
    });
    if (!otpCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: otpCheck.error || 'El código OTP de verificación no es válido.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const detail = await getAdminConsentDetail(target.playerId);
    if (!detail || !detail.isSigned || detail.isShredded) {
      return NextResponse.json(
        {
          success: false,
          error: 'No existe ninguna autorización activa para este deportista.',
        },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    await consumeTokenOnce(actionCheck.jti, 'consent-action', actionCheck.expIso);
    const nextActionToken = createConsentActionToken(target.playerId);

    const resolvedIsMinor = detail.signedIsMinor ?? detail.isMinor;
    const resolvedIsMinor14To17 = detail.signedIsMinor14To17 ?? false;

    const safeDetail = {
      consentId: detail.consentId,
      playerId: detail.playerId,
      playerName: detail.playerName,
      teamId: detail.teamId,
      teamName: detail.teamName,
      birthYear: detail.birthYear,
      birthDate: detail.birthDate,
      isMinor: resolvedIsMinor,
      isMinor14To17: resolvedIsMinor14To17,
      signerName: detail.signerName,
      signerDni: detail.signerDni,
      signerRelationship: detail.signerRelationship,
      signerPhone: detail.signerPhone,
      signerEmail: detail.signerEmail,
      minorSignerName: detail.minorSignerName,
      minorSignerDni: detail.minorSignerDni,
      minorSignatureData: detail.minorSignatureData,
      consentSocialMedia: detail.consentSocialMedia === true,
      consentStreaming: detail.consentStreaming === true,
      consentPress: detail.consentPress === true,
      consentTravel: detail.consentTravel === true,
      signatureMethod: detail.signatureMethod,
      signatureData: detail.signatureData,
      documentHash: detail.documentHash,
      signedAt: detail.signedAt,
      integrityVerified: detail.integrityVerified,
    };

    let receiptEmailSent = false;
    let receiptEmailError: string | undefined;

    if (body.resendEmail === true) {
      const signedAtIso = detail.signedAt || new Date().toISOString();
      const signedAtFormatted = `${new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(signedAtIso))} ${formatMadridTime(signedAtIso)}`;

      const mailRes = await sendConsentReceiptEmail({
        toEmail: target.contactEmail,
        playerName: detail.playerName,
        teamName: detail.teamName,
        birthYear: detail.birthYear,
        birthDate: detail.birthDate,
        isMinor: resolvedIsMinor,
        isMinor14To17: resolvedIsMinor14To17,
        signerName: detail.signerName || '',
        signerDni: detail.signerDni || '',
        signerDniMasked: maskDni(detail.signerDni || ''),
        signerRelationship: detail.signerRelationship || 'PROPIO_JUGADOR',
        signerPhone: detail.signerPhone,
        minorSignerName: detail.minorSignerName,
        minorSignerDni: detail.minorSignerDni,
        minorSignatureData: detail.minorSignatureData,
        consentId: detail.consentId || '',
        documentHash: detail.documentHash || '',
        signedAtIso,
        signedAtFormatted,
        signatureMethod: detail.signatureMethod || 'OTP_EMAIL',
        signatureMethodLabel: getSignatureMethodLabel(detail.signatureMethod),
        signatureData: detail.signatureData,
        consentSocialMedia: detail.consentSocialMedia === true,
        consentStreaming: detail.consentStreaming === true,
        consentPress: detail.consentPress === true,
        consentTravel: detail.consentTravel === true,
      });

      receiptEmailSent = mailRes.sent;
      receiptEmailError = mailRes.error;
    }

    return NextResponse.json(
      {
        success: true,
        detail: safeDetail,
        receiptEmailSent,
        receiptEmailError,
        actionToken: nextActionToken,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos no disponible temporalmente para recuperar el resguardo.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Consent Receipt] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al generar o reenviar el resguardo oficial.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
