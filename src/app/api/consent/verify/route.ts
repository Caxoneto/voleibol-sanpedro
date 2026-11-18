import { NextRequest, NextResponse } from 'next/server';
import { verifyPlayerIdentity, resolvePlayerIdSafe } from '@/lib/consent-store';
import {
  getClientIp,
  isNeonRateLimited,
  recordNeonFailedAttempt,
  clearNeonRateLimit,
  checkNeonRateLimit,
} from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const MAX_VERIFY_FAILURES_IP = 10;
const MAX_VERIFY_FAILURES_PLAYER = 20;
const WINDOW_SEC = 10 * 60;
const BLOCK_SEC = 10 * 60;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const ipBucket = `consent-verify-ip:${clientIp}`;

    const ipReqLimit = await checkNeonRateLimit(`consent-verify-req:${clientIp}`, 30, WINDOW_SEC, BLOCK_SEC);
    if (!ipReqLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas solicitudes de verificación. Espera ${Math.ceil(ipReqLimit.retryAfterSec / 60)} minutos antes de reintentar.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(ipReqLimit.retryAfterSec),
          },
        }
      );
    }

    const ipFailedStatus = await isNeonRateLimited(ipBucket);
    if (ipFailedStatus.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos de verificación. Espera ${Math.ceil(ipFailedStatus.retryAfterSec / 60)} minutos antes de reintentar.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(ipFailedStatus.retryAfterSec),
          },
        }
      );
    }

    let body: { playerId?: unknown; birthYearOrDate?: unknown; dniLast5?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { playerId, birthYearOrDate, dniLast5 } = body;

    if (!playerId || !birthYearOrDate || !dniLast5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Por favor, completa todos los campos requeridos para la verificación.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const canonicalId = resolvePlayerIdSafe(String(playerId));
    const playerBucket = canonicalId ? `consent-verify-player:${canonicalId}` : null;
    if (playerBucket) {
      const playerFailedStatus = await isNeonRateLimited(playerBucket);
      if (playerFailedStatus.limited) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiados intentos fallidos para esta ficha. Espera ${Math.ceil(playerFailedStatus.retryAfterSec / 60)} minutos antes de reintentar.`,
          },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              'Retry-After': String(playerFailedStatus.retryAfterSec),
            },
          }
        );
      }
    }

    const result = await verifyPlayerIdentity(
      String(playerId),
      typeof birthYearOrDate === 'number' ? birthYearOrDate : String(birthYearOrDate),
      String(dniLast5)
    );

    if (!result.valid) {
      await recordNeonFailedAttempt(ipBucket, MAX_VERIFY_FAILURES_IP, WINDOW_SEC, BLOCK_SEC);
      if (playerBucket) {
        await recordNeonFailedAttempt(playerBucket, MAX_VERIFY_FAILURES_PLAYER, WINDOW_SEC, BLOCK_SEC);
      }
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo verificar la identidad del deportista.',
        },
        { status: result.statusCode || 400, headers: NO_STORE_HEADERS }
      );
    }

    await clearNeonRateLimit(ipBucket);
    if (playerBucket) {
      await clearNeonRateLimit(playerBucket);
    }

    return NextResponse.json(
      {
        success: true,
        player: result.player,
        alreadySigned: result.alreadySigned,
        hasCensusEmail: result.hasCensusEmail,
        maskedContactEmail: result.maskedContactEmail,
        challengeSupported: result.challengeSupported,
        verificationToken: result.verificationToken,
        actionToken: result.actionToken,
        existingConsent: result.existingConsent,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo conectar con la base de datos oficial. Por favor, reintenta en unos instantes.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Consent Verify] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor al procesar la verificación.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
