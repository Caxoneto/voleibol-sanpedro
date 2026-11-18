import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticateAdminSession,
  updatePlayerCensusDni,
  upsertCensusBatch,
  resolvePlayerIdSafe,
  isValidSpanishDniOrNie,
  CensusBatchItemInput,
} from '@/lib/consent-store';
import { getClientIp } from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const MAX_CENSUS_BATCH_SIZE = 200;

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...(extraHeaders || {}) },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const token = cookies().get('cdv_admin_session')?.value;
    const auth = await authenticateAdminSession({
      token,
      ipAddress: getClientIp(req),
      scope: 'census-patch',
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
      dni?: string;
      dniLast5?: string;
      birthDate?: string;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const canonicalId = resolvePlayerIdSafe(body.playerId);
    if (!canonicalId) {
      return jsonResponse({ success: false, error: 'ID de deportista no válido.' }, 400);
    }

    const rawDoc = typeof body.dni === 'string'
      ? body.dni
      : typeof body.dniLast5 === 'string'
      ? body.dniLast5
      : '';
    const cleanDoc = rawDoc.trim().toUpperCase().replace(/[\s-]/g, '');
    if (cleanDoc.length >= 6 && !isValidSpanishDniOrNie(cleanDoc)) {
      return jsonResponse(
        { success: false, error: 'El documento completo (DNI, NIE o Pasaporte) no es válido.' },
        400
      );
    }

    const res = await updatePlayerCensusDni(
      canonicalId,
      rawDoc,
      typeof body.birthDate === 'string' ? body.birthDate : undefined
    );

    if (!res.success) {
      return jsonResponse(res, 400);
    }

    return jsonResponse({
      success: true,
      message: 'Ficha federativa actualizada correctamente.',
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
    console.error('[Admin Census PATCH] Error:', err);
    return jsonResponse({ success: false, error: 'Error al actualizar el censo.' }, 500);
  }
}

/**
 * Carga masiva y actualización atómica del censo federativo mediante UNNEST parametrizado en Neon.
 */
export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('cdv_admin_session')?.value;
    const auth = await authenticateAdminSession({
      token,
      ipAddress: getClientIp(req),
      scope: 'census-post',
      maxAttempts: 60,
    });
    if (!auth.ok) {
      return jsonResponse(
        { success: false, error: auth.error },
        auth.status,
        auth.retryAfterSec ? { 'Retry-After': String(auth.retryAfterSec) } : undefined
      );
    }

    let body: { items?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Cuerpo JSON no válido.' }, 400);
    }

    const rawItems = body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return jsonResponse(
        { success: false, error: 'Se requiere una lista de registros a actualizar.' },
        400
      );
    }

    if (rawItems.length > MAX_CENSUS_BATCH_SIZE) {
      return jsonResponse(
        {
          success: false,
          error: `El lote máximo permitido por petición es de ${MAX_CENSUS_BATCH_SIZE} registros.`,
        },
        400
      );
    }

    // Deduplicar manteniendo la última aparición por deportista válido y conservando inválidos para reporte
    const dedupMap = new Map<string, CensusBatchItemInput>();
    const nonResolvable: CensusBatchItemInput[] = [];

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') {
        nonResolvable.push({ playerId: '' });
        continue;
      }
      const item = raw as CensusBatchItemInput;
      const rawId = typeof item.playerId === 'string' ? item.playerId : '';
      const canonicalId = resolvePlayerIdSafe(rawId);
      if (!canonicalId) {
        nonResolvable.push({ ...item, playerId: rawId });
        continue;
      }

      const rawDoc = typeof item.dni === 'string' ? item.dni.trim() : '';
      if (rawDoc) {
        const cleanDoc = rawDoc.toUpperCase().replace(/[\s-]/g, '');
        if (cleanDoc.length >= 6 && !isValidSpanishDniOrNie(cleanDoc)) {
          nonResolvable.push({ ...item, playerId: canonicalId });
          continue;
        }
      }

      dedupMap.set(canonicalId, { ...item, playerId: canonicalId });
    }

    const sanitizedItems: CensusBatchItemInput[] = [
      ...Array.from(dedupMap.values()),
      ...nonResolvable,
    ];

    const result = await upsertCensusBatch(sanitizedItems);
    if (!result.success) {
      return jsonResponse(
        {
          ...result,
          error: result.errors[0] || 'No se pudo actualizar ningún registro válido en el censo.',
        },
        400
      );
    }

    return jsonResponse(result);
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
    console.error('[Admin Census POST bulk] Error:', err);
    return jsonResponse(
      { success: false, error: 'Error al procesar la actualización masiva.' },
      500
    );
  }
}
