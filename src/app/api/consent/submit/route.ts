import { NextRequest, NextResponse } from 'next/server';
import { submitPlayerConsent, ConsentSubmissionPayload } from '@/lib/consent-store';
import { isEmailOtpEnabled, isDevConsoleOtpBypassAllowed } from '@/lib/email-otp';
import { getClientIp, checkNeonRateLimit } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';
import { stripCrlf } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`consent-submit:${clientIp}`, 15, 600, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos de envío. Espera unos minutos antes de reintentar.',
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

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (typeof body.verificationToken !== 'string' || !body.verificationToken.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un token de verificación válido. Por favor, completa la verificación en el Paso 1.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const userAgent = stripCrlf(req.headers.get('user-agent') || 'Desconocido').slice(0, 250);
    const relRaw = typeof body.signerRelationship === 'string' ? body.signerRelationship : 'MADRE';
    const signerRelationship: ConsentSubmissionPayload['signerRelationship'] =
      relRaw === 'PADRE' || relRaw === 'MADRE' || relRaw === 'TUTOR_LEGAL' || relRaw === 'PROPIO_JUGADOR'
        ? relRaw
        : 'MADRE';

    const hasExplicitImage =
      typeof body.consentImage === 'boolean' || typeof body.consentSocialMedia === 'boolean';
    const hasExplicitTravel = typeof body.consentTravel === 'boolean';
    if (!hasExplicitImage || !hasExplicitTravel) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Debes seleccionar de forma expresa "Autorizo" o "No autorizo" tanto en Imágenes como en Desplazamientos.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // La ruta pública web siempre exige firma electrónica OTP_EMAIL (nunca acepta PRESENCIAL desde el cliente)
    const payload: ConsentSubmissionPayload = {
      verificationToken: body.verificationToken.trim(),
      playerId: typeof body.playerId === 'string' ? body.playerId.trim() : '',
      playerName: typeof body.playerName === 'string' ? body.playerName : undefined,
      teamId: typeof body.teamId === 'string' ? body.teamId : undefined,
      isMinor: body.isMinor === true,
      signerType: body.signerType === 'SELF_ADULT' ? 'SELF_ADULT' : 'PARENT',
      signerName: typeof body.signerName === 'string' ? body.signerName : '',
      signerDni: typeof body.signerDni === 'string' ? body.signerDni : '',
      signerRelationship,
      signerEmail: typeof body.signerEmail === 'string' ? body.signerEmail : undefined,
      signerPhone: typeof body.signerPhone === 'string' ? body.signerPhone : undefined,
      consentImage: typeof body.consentImage === 'boolean' ? body.consentImage : undefined,
      consentSocialMedia: body.consentSocialMedia === true,
      consentStreaming: body.consentStreaming === true,
      consentPress: body.consentPress === true,
      consentTravel: body.consentTravel === true,
      patriaPotestadAccepted: body.patriaPotestadAccepted === true,
      policySummaryAccepted: body.policySummaryAccepted === true,
      minorConsentAccepted: body.minorConsentAccepted === true,
      minorSignerName: typeof body.minorSignerName === 'string' ? body.minorSignerName : undefined,
      minorSignerDni: typeof body.minorSignerDni === 'string' ? body.minorSignerDni : undefined,
      minorSignatureData: typeof body.minorSignatureData === 'string' ? body.minorSignatureData : undefined,
      signatureData: typeof body.signatureData === 'string' ? body.signatureData : '',
      signatureMethod: 'OTP_EMAIL',
      otpChallengeId: typeof body.otpChallengeId === 'string' ? body.otpChallengeId.trim() : undefined,
      otpCode: typeof body.otpCode === 'string' ? body.otpCode.trim() : undefined,
      legalVersion: 'v5_2026_junta_anexo05_06',
      ipAddress: clientIp,
      userAgent,
    };

    const result = await submitPlayerConsent(payload);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al guardar la autorización.',
        },
        { status: result.statusCode || 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        consentId: result.consentId,
        documentHash: result.documentHash,
        timestamp: result.signedAtIso || new Date().toISOString(),
        signatureMethod: result.signatureMethod || 'OTP_EMAIL',
        signerEmail: result.signerEmail,
        birthDate: result.birthDate,
        receiptEmailSent: result.receiptEmailSent ?? false,
        receiptEmailError: result.receiptEmailError,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo registrar la autorización porque la base de datos no está disponible temporalmente.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Consent Submit] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor al registrar la autorización.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
