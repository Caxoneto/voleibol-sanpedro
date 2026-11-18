import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticateAdminSession,
  createDirectConsentToken,
  getAdminConsentDetail,
  updatePlayerCensusParentInfo,
  resolvePlayerIdSafe,
  DirectConsentPrefill,
} from '@/lib/consent-store';
import { sendConsentInvitationEmail } from '@/lib/email-otp';
import { getClientIp } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';
import { getSafeSiteBaseUrl, isStrictEmail } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...(extraHeaders || {}) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('cdv_admin_session')?.value;
    const auth = await authenticateAdminSession({
      token,
      ipAddress: getClientIp(req),
      scope: 'direct-link',
      maxAttempts: 120,
    });
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    let body: {
      playerId?: string;
      daysValid?: number;
      customPrefill?: DirectConsentPrefill;
      sendEmail?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const canonicalId = resolvePlayerIdSafe(body.playerId);
    if (!canonicalId) {
      return jsonResponse(
        { success: false, error: 'Se requiere un identificador de deportista válido.' },
        400
      );
    }

    const customPrefill = body.customPrefill;
    if (customPrefill && typeof customPrefill === 'object') {
      const emailCheck = customPrefill.signerEmail?.trim().toLowerCase() || '';
      if (emailCheck && !isStrictEmail(emailCheck)) {
        return jsonResponse(
          { success: false, error: 'La dirección de correo electrónico no es válida.' },
          400
        );
      }
      const updateRes = await updatePlayerCensusParentInfo(canonicalId, customPrefill);
      if (!updateRes.success) {
        return jsonResponse(
          { success: false, error: updateRes.error || 'Datos de ficha no válidos.' },
          400
        );
      }
    }

    const detail = await getAdminConsentDetail(canonicalId);
    if (!detail) {
      return jsonResponse(
        { success: false, error: 'Deportista no encontrado en el censo.' },
        404
      );
    }

    const baseRel = (detail.censusParentRelationship || detail.signerRelationship || (detail.isMinor ? 'MADRE' : 'PROPIO_JUGADOR')) as
      | 'PADRE'
      | 'MADRE'
      | 'TUTOR_LEGAL'
      | 'PROPIO_JUGADOR';
    const basePrefill: DirectConsentPrefill = detail.isMinor
      ? {
          signerName: detail.censusParentName || detail.signerName || '',
          signerDni: detail.censusParentDni || detail.signerDni || '',
          signerRelationship: ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'].includes(baseRel)
            ? baseRel
            : 'MADRE',
          signerPhone: detail.censusPhone || detail.signerPhone || '',
          signerEmail: detail.censusEmail || detail.signerEmail || '',
        }
      : {
          signerName: detail.playerName,
          signerDni: detail.censusDni || detail.signerDni || '',
          signerRelationship: 'PROPIO_JUGADOR',
          signerPhone: detail.censusPhone || detail.signerPhone || '',
          signerEmail: detail.censusEmail || detail.signerEmail || '',
        };

    const effectivePrefill: DirectConsentPrefill = {
      signerName:
        customPrefill?.signerName !== undefined
          ? customPrefill.signerName.trim()
          : basePrefill.signerName,
      signerDni:
        customPrefill?.signerDni !== undefined
          ? customPrefill.signerDni.trim().toUpperCase()
          : basePrefill.signerDni,
      signerRelationship: customPrefill?.signerRelationship || basePrefill.signerRelationship,
      signerPhone:
        customPrefill?.signerPhone !== undefined
          ? customPrefill.signerPhone.trim()
          : basePrefill.signerPhone,
      signerEmail:
        customPrefill?.signerEmail !== undefined
          ? customPrefill.signerEmail.trim().toLowerCase()
          : basePrefill.signerEmail,
    };

    const expiresInDays = Math.min(14, Math.max(1, Math.floor(Number(body.daysValid) || 14)));
    const directToken = createDirectConsentToken(canonicalId, effectivePrefill, expiresInDays);
    const baseUrl = getSafeSiteBaseUrl();
    const directUrl = `${baseUrl}/autorizaciones?directToken=${encodeURIComponent(directToken)}`;

    let emailSent = false;
    if (body.sendEmail === true) {
      const targetEmail = (effectivePrefill.signerEmail || '').trim().toLowerCase();
      if (!targetEmail || !isStrictEmail(targetEmail)) {
        return jsonResponse(
          {
            success: false,
            error: 'Introduce un correo electrónico válido para enviar la invitación oficial.',
          },
          400
        );
      }

      const sendRes = await sendConsentInvitationEmail({
        toEmail: targetEmail,
        playerName: detail.playerName,
        teamName: detail.teamName,
        isMinor: detail.isMinor,
        signerName: effectivePrefill.signerName,
        directUrl,
      });

      if (!sendRes.sent) {
        return jsonResponse(
          {
            success: false,
            error: sendRes.error || 'No se pudo enviar el correo desde info@voleibolsanpedro.es.',
          },
          502
        );
      }
      emailSent = true;
    }

    return jsonResponse({
      success: true,
      player: {
        id: detail.playerId,
        name: detail.playerName,
        teamId: detail.teamId,
        teamName: detail.teamName,
        birthYear: detail.birthYear,
        isMinor: detail.isMinor,
        isMinor14To17: detail.isMinor14To17,
      },
      prefilledData: effectivePrefill,
      directToken,
      directUrl,
      emailSent,
      expiresInDays,
    });
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return jsonResponse(
        {
          success: false,
          error: 'Servicio de base de datos temporalmente no disponible. Inténtalo de nuevo en unos instantes.',
        },
        503
      );
    }
    console.error('[Admin Direct Link POST] Error:', err);
    return jsonResponse({ success: false, error: 'Error al generar el enlace directo.' }, 500);
  }
}
