import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticateAdminSession,
  getBatchDirectConsentData,
  resolvePlayerIdSafe,
  BatchDirectConsentItem,
} from '@/lib/consent-store';
import {
  buildConsentInvitationEmailMessage,
  sendBatchEmailsWithTlsPool,
  BatchEmailMessage,
} from '@/lib/email-otp';
import { getClientIp } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';
import { getSafeSiteBaseUrl, isStrictEmail } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const MAX_EMAIL_BATCH_SIZE = 15;
const MAX_LINK_BATCH_SIZE = 200;

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
      scope: 'direct-link-batch',
      maxAttempts: 90,
    });
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    let body: { playerIds?: unknown; daysValid?: number; sendEmails?: boolean };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const sendEmails = body.sendEmails === true;
    const rawIds = body.playerIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return jsonResponse(
        { success: false, error: 'Se requiere una lista de identificadores de deportistas.' },
        400
      );
    }

    if (sendEmails && rawIds.length > MAX_EMAIL_BATCH_SIZE) {
      return jsonResponse(
        {
          success: false,
          error: `Para evitar timeouts, el envío por correo electrónico está limitado a un máximo de ${MAX_EMAIL_BATCH_SIZE} deportistas por lote.`,
        },
        400
      );
    }

    if (rawIds.length > MAX_LINK_BATCH_SIZE) {
      return jsonResponse(
        {
          success: false,
          error: `No se pueden generar más de ${MAX_LINK_BATCH_SIZE} enlaces por lote.`,
        },
        400
      );
    }

    const canonicalIds = Array.from(
      new Set(
        rawIds
          .map((id) => (typeof id === 'string' ? resolvePlayerIdSafe(id) : null))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (canonicalIds.length === 0) {
      return jsonResponse(
        { success: false, error: 'Ninguno de los identificadores de deportista es válido.' },
        400
      );
    }

    const expiresInDays = Math.min(14, Math.max(1, Math.floor(Number(body.daysValid) || 14)));
    const baseUrl = getSafeSiteBaseUrl();
    const items = await getBatchDirectConsentData(canonicalIds, baseUrl, expiresInDays);

    let emailSummary:
      | {
          total: number;
          sent: number;
          skippedNoEmail: number;
          failed: number;
          sentPlayerIds: string[];
          skippedPlayers: Array<{ playerId: string; playerName: string }>;
          failedPlayers: Array<{ playerId: string; playerName: string; error: string }>;
        }
      | undefined;

    if (sendEmails) {
      const skippedPlayers: Array<{ playerId: string; playerName: string }> = [];
      const queue: Array<{ item: BatchDirectConsentItem; msg: BatchEmailMessage }> = [];

      for (const item of items) {
        if (item.isSigned || item.isShredded) {
          skippedPlayers.push({ playerId: item.playerId, playerName: item.playerName });
          continue;
        }
        const cleanEmail = item.signerEmail?.trim().toLowerCase() || '';
        if (!cleanEmail || !isStrictEmail(cleanEmail)) {
          skippedPlayers.push({ playerId: item.playerId, playerName: item.playerName });
          continue;
        }
        queue.push({
          item,
          msg: buildConsentInvitationEmailMessage({
            toEmail: cleanEmail,
            playerName: item.playerName,
            teamName: item.teamName,
            isMinor: item.isMinor,
            signerName: item.signerName || undefined,
            directUrl: item.directUrl,
          }),
        });
      }

      const poolResults =
        queue.length > 0
          ? await sendBatchEmailsWithTlsPool(queue.map((entry) => entry.msg))
          : [];

      const sentPlayerIds: string[] = [];
      const failedPlayers: Array<{ playerId: string; playerName: string; error: string }> = [];

      for (let i = 0; i < queue.length; i++) {
        const { item } = queue[i];
        const r = poolResults[i];
        if (r?.sent) {
          sentPlayerIds.push(item.playerId);
        } else {
          failedPlayers.push({
            playerId: item.playerId,
            playerName: item.playerName,
            error: r?.error || 'Error enviando correo.',
          });
        }
      }

      emailSummary = {
        total: items.length,
        sent: sentPlayerIds.length,
        skippedNoEmail: skippedPlayers.length,
        failed: failedPlayers.length,
        sentPlayerIds,
        skippedPlayers,
        failedPlayers,
      };
    }

    return jsonResponse({
      success: true,
      count: items.length,
      items,
      expiresInDays,
      ...(emailSummary ? { emailSummary } : {}),
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
    console.error('[Admin Direct Link Batch] Error:', err);
    return jsonResponse(
      { success: false, error: 'Error al generar el lote de enlaces directos.' },
      500
    );
  }
}
