import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticateAdminSession,
  getAdminConsentDashboard,
  getAdminConsentDetail,
  registerInPersonConsent,
  updatePlayerCensusDni,
  revokePlayerConsent,
  shredPlayerCryptoKey,
  resolvePlayerIdSafe,
  isValidSpanishDniOrNie,
} from '@/lib/consent-store';
import { getClientIp } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';
import { isStrictEmail, validateSignatureDataUrl } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...(extraHeaders || {}) },
  });
}

function handleError(tag: string, err: unknown, fallbackMsg: string) {
  if (err instanceof NeonUnavailableError) {
    return jsonResponse(
      {
        success: false,
        error: 'Servicio de base de datos temporalmente no disponible. Inténtalo de nuevo en unos instantes.',
      },
      503
    );
  }
  console.error(`[${tag}] Error:`, err);
  return jsonResponse({ success: false, error: fallbackMsg }, 500);
}

async function authorize(req: NextRequest, scope: string, maxAttempts = 120) {
  const token = cookies().get('cdv_admin_session')?.value;
  const ipAddress = getClientIp(req);
  const auth = await authenticateAdminSession({ token, ipAddress, scope, maxAttempts });
  return { auth, ipAddress };
}

export async function GET(req: NextRequest) {
  try {
    const { auth } = await authorize(req, 'consent-get', 120);
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    const rawPlayerId = req.nextUrl.searchParams.get('playerId')?.trim();
    if (rawPlayerId) {
      const detail = await getAdminConsentDetail(rawPlayerId);
      if (!detail) {
        return jsonResponse(
          { success: false, error: 'Deportista no encontrado en el censo.' },
          404
        );
      }
      return jsonResponse({ success: true, detail });
    }

    const dashboard = await getAdminConsentDashboard();
    return jsonResponse({
      success: true,
      data: dashboard,
      stats: dashboard.stats,
      teams: dashboard.teams,
      players: dashboard.players,
    });
  } catch (err) {
    return handleError(
      'Admin Consent GET',
      err,
      'Error al recuperar los datos del panel de consentimientos.'
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, ipAddress } = await authorize(req, 'consent-post', 90);
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const action = typeof body.action === 'string' && body.action.trim() ? body.action.trim() : 'in_person';
    const rawPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
    const canonicalId = resolvePlayerIdSafe(rawPlayerId);

    if (!canonicalId) {
      return jsonResponse({ success: false, error: 'ID de deportista no válido.' }, 400);
    }

    if (action === 'update_dni') {
      const rawDoc =
        typeof body.dni === 'string'
          ? body.dni
          : typeof body.dniLast5 === 'string'
          ? body.dniLast5
          : '';
      const rawBirthDate = typeof body.birthDate === 'string' ? body.birthDate : undefined;
      const res = await updatePlayerCensusDni(canonicalId, rawDoc, rawBirthDate);
      if (!res.success) {
        return jsonResponse(res, 400);
      }
      return jsonResponse({ success: true, message: 'Ficha federativa actualizada correctamente.' });
    }

    if (action === 'revoke') {
      const res = await revokePlayerConsent(canonicalId);
      if (!res.success) {
        return jsonResponse(res, 400);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'shred') {
      if (body.confirmShred !== true) {
        return jsonResponse(
          {
            success: false,
            error: 'Se requiere confirmación explícita (confirmShred: true) para ejecutar la supresión RGPD.',
          },
          400
        );
      }
      const res = await shredPlayerCryptoKey(canonicalId);
      if (!res.success) {
        return jsonResponse(res, 400);
      }
      return jsonResponse({ success: true });
    }

    if (action !== 'in_person') {
      return jsonResponse({ success: false, error: 'Acción administrativa no reconocida.' }, 400);
    }

    const signerName = typeof body.signerName === 'string' ? body.signerName.trim() : '';
    const signerDni = typeof body.signerDni === 'string' ? body.signerDni.trim() : '';
    const signerEmail = typeof body.signerEmail === 'string' ? body.signerEmail.trim() : '';
    const signerPhone = typeof body.signerPhone === 'string' ? body.signerPhone.trim() : '';
    const relRaw = typeof body.signerRelationship === 'string' ? body.signerRelationship.trim() : 'MADRE';
    const signerRelationship = ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'].includes(relRaw)
      ? (relRaw as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR')
      : 'MADRE';

    if (signerName.length < 2) {
      return jsonResponse({ success: false, error: 'Nombre del firmante no válido.' }, 400);
    }
    if (!isValidSpanishDniOrNie(signerDni)) {
      return jsonResponse({ success: false, error: 'DNI/NIE o pasaporte del firmante no válido.' }, 400);
    }
    if (signerEmail && !isStrictEmail(signerEmail)) {
      return jsonResponse({ success: false, error: 'Correo electrónico del firmante no válido.' }, 400);
    }

    const signatureData = typeof body.signatureData === 'string' && body.signatureData.trim()
      ? body.signatureData.trim()
      : undefined;
    if (signatureData) {
      const sigCheck = validateSignatureDataUrl(signatureData);
      if (!sigCheck.valid) {
        return jsonResponse(
          { success: false, error: sigCheck.error || 'Formato de firma PNG/JPEG no válido.' },
          400
        );
      }
    }

    const minorSignatureData = typeof body.minorSignatureData === 'string' && body.minorSignatureData.trim()
      ? body.minorSignatureData.trim()
      : undefined;
    if (minorSignatureData) {
      const minorSigCheck = validateSignatureDataUrl(minorSignatureData);
      if (!minorSigCheck.valid) {
        return jsonResponse(
          { success: false, error: minorSigCheck.error || 'Formato de firma del menor PNG/JPEG no válido.' },
          400
        );
      }
    }

    const minorSignerDni = typeof body.minorSignerDni === 'string' && body.minorSignerDni.trim()
      ? body.minorSignerDni.trim()
      : undefined;
    if (minorSignerDni && !isValidSpanishDniOrNie(minorSignerDni)) {
      return jsonResponse({ success: false, error: 'DNI/NIE del menor no válido.' }, 400);
    }

    const hasExplicitGranular =
      body.consentSocialMedia !== undefined ||
      body.consentStreaming !== undefined ||
      body.consentPress !== undefined;
    const hasExplicitImage =
      typeof body.consentImage === 'boolean' ||
      typeof body.consentSocialMedia === 'boolean' ||
      typeof body.consentStreaming === 'boolean' ||
      typeof body.consentPress === 'boolean';
    const hasExplicitTravel = typeof body.consentTravel === 'boolean';
    if (!hasExplicitImage || !hasExplicitTravel) {
      return jsonResponse(
        {
          success: false,
          error:
            'Debes seleccionar de forma expresa Autorizo o No autorizo tanto en Imágenes como en Desplazamientos.',
        },
        400
      );
    }
    const consentImage = body.consentImage === true;
    const consentSocialMedia = hasExplicitGranular ? body.consentSocialMedia === true : consentImage;
    const consentStreaming = hasExplicitGranular ? body.consentStreaming === true : consentImage;
    const consentPress = hasExplicitGranular ? body.consentPress === true : consentImage;
    const consentTravel = body.consentTravel === true;

    const userAgent = req.headers.get('user-agent') || 'Admin Panel';
    const res = await registerInPersonConsent({
      playerId: canonicalId,
      signerName,
      signerDni,
      signerRelationship,
      signerPhone,
      signerEmail,
      consentSocialMedia,
      consentStreaming,
      consentPress,
      consentImage: consentSocialMedia || consentStreaming || consentPress,
      consentTravel,
      minorConsentAccepted: body.minorConsentAccepted !== undefined ? body.minorConsentAccepted === true : undefined,
      minorSignerName: typeof body.minorSignerName === 'string' ? body.minorSignerName.trim() : undefined,
      minorSignerDni,
      minorSignatureData,
      signatureData,
      ipAddress,
      userAgent,
    });

    if (!res.success) {
      return jsonResponse(res, res.statusCode || 400);
    }

    return jsonResponse(res);
  } catch (err) {
    return handleError('Admin Consent POST', err, 'Error al procesar la acción administrativa.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { auth } = await authorize(req, 'consent-delete', 60);
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const canonicalId = resolvePlayerIdSafe(typeof body.playerId === 'string' ? body.playerId : '');
    if (!canonicalId) {
      return jsonResponse({ success: false, error: 'ID de deportista no válido.' }, 400);
    }

    const res = await revokePlayerConsent(canonicalId);
    if (!res.success) {
      return jsonResponse(res, 400);
    }

    return jsonResponse(res);
  } catch (err) {
    return handleError('Admin Consent DELETE', err, 'Error al revocar la autorización.');
  }
}
