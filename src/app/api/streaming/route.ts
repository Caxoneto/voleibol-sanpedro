import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  getStreamingStatus,
  getMatchRecordings,
  setStreamingStatus,
  saveMatchRecording,
  isValidYouTubeUrl,
  isValidMatchId,
  NeonUnavailableError,
  StreamingPayload,
} from '@/lib/streaming-store';
import {
  getClientIp,
  isNeonRateLimited,
  recordNeonFailedAttempt,
  clearNeonRateLimit,
} from '@/lib/rate-limiter';
import { stripCrlf } from '@/lib/validators';
import { getConsolidatedOfficialMatches } from '@/lib/favb-scraper';
import { isRestMatch } from '@/lib/match-utils';
import { formatMadridDateString, formatMadridTime } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const FIXED_PASSWORD = process.env.STREAMING_ADMIN_PASSWORD;
const RATE_LIMIT_WINDOW_SEC = 10 * 60;
const RATE_LIMIT_BLOCK_SEC = 10 * 60;
const MAX_FAILED_ATTEMPTS = 5;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Verificación de contraseña en tiempo constante para mitigar timing attacks.
 */
function verifyAdminPassword(input: unknown, expected: string): boolean {
  if (typeof input !== 'string' || !expected) {
    return false;
  }
  const hashInput = crypto.createHash('sha256').update(input).digest();
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashInput, hashExpected);
}

// GET: Obtener estado actual del streaming, grabaciones diferidas y partidos elegibles
export async function GET() {
  try {
    const streaming = await getStreamingStatus();
    const recordings = await getMatchRecordings();

    const todayStr = formatMadridDateString(new Date());
    const allMatches = getConsolidatedOfficialMatches().filter((m) => !isRestMatch(m));

    const todayMatches = allMatches
      .filter((m) => m.dateStr === todayStr)
      .map((m) => ({
        id: m.id,
        round: m.round,
        categoryName: m.categoryName,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        timeStr: m.timeStr || formatMadridTime(m.matchDate),
        dateStr: m.dateStr,
        venue: m.venue,
      }));

    const upcomingMatches = allMatches
      .filter((m) => m.dateStr >= todayStr && m.status === 'SCHEDULED' && m.dateStr !== todayStr)
      .slice(0, 15)
      .map((m) => ({
        id: m.id,
        round: m.round,
        categoryName: m.categoryName,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        timeStr: m.timeStr || formatMadridTime(m.matchDate),
        dateStr: m.dateStr,
        venue: m.venue,
      }));

    return NextResponse.json(
      {
        success: true,
        active: streaming.active,
        url: streaming.url,
        matchId: streaming.matchId || null,
        matchTitle: streaming.matchTitle || null,
        startedAt: streaming.startedAt,
        recordings,
        todayMatches,
        upcomingMatches,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos no disponible temporalmente.',
          active: false,
          url: null,
          recordings: {},
          todayMatches: [],
          upcomingMatches: [],
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.warn('[Streaming API] Error en GET:', error);
    return NextResponse.json(
      {
        success: false,
        active: false,
        url: null,
        recordings: {},
        todayMatches: [],
        upcomingMatches: [],
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// POST: Iniciar, finalizar retransmisión o gestionar grabaciones
export async function POST(request: Request) {
  try {
    if (!FIXED_PASSWORD) {
      console.error('STREAMING_ADMIN_PASSWORD no está configurada en las variables de entorno del servidor.');
      return NextResponse.json(
        {
          success: false,
          error: 'Servicio de streaming no configurado en las variables de entorno del servidor.',
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const clientIp = getClientIp(request);
    const bucketKey = `streaming-auth:${clientIp}`;

    const rateStatus = await isNeonRateLimited(bucketKey);
    if (rateStatus.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos. Espera ${Math.ceil(rateStatus.retryAfterSec / 60)} minutos.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rateStatus.retryAfterSec),
          },
        }
      );
    }

    let body: {
      action?: string;
      url?: string;
      password?: unknown;
      matchId?: string;
      matchTitle?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo JSON no válido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const action = body.action || (body.url ? 'start' : 'stop');

    const authenticate = async (passwordInput: unknown): Promise<{ ok: boolean; blocked: boolean; retryAfterSec: number }> => {
      const isValid = verifyAdminPassword(passwordInput, FIXED_PASSWORD);
      if (!isValid) {
        const res = await recordNeonFailedAttempt(
          bucketKey,
          MAX_FAILED_ATTEMPTS,
          RATE_LIMIT_WINDOW_SEC,
          RATE_LIMIT_BLOCK_SEC
        );
        return { ok: false, blocked: res.blocked, retryAfterSec: res.retryAfterSec };
      }
      await clearNeonRateLimit(bucketKey);
      return { ok: true, blocked: false, retryAfterSec: 0 };
    };

    // 1. INICIAR RETRANSMISIÓN
    if (action === 'start') {
      const { url, password, matchId, matchTitle } = body;

      const authRes = await authenticate(password);
      if (!authRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: authRes.blocked
              ? `Demasiados intentos fallidos. Espera ${Math.ceil(authRes.retryAfterSec / 60)} minutos.`
              : 'Contraseña de autorización incorrecta.',
          },
          {
            status: authRes.blocked ? 429 : 401,
            headers: authRes.blocked
              ? { ...NO_STORE_HEADERS, 'Retry-After': String(authRes.retryAfterSec) }
              : NO_STORE_HEADERS,
          }
        );
      }

      if (!isValidYouTubeUrl(url)) {
        return NextResponse.json(
          {
            success: false,
            error: 'El enlace debe pertenecer a una emisión o vídeo HTTPS de YouTube válido.',
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const trimmedUrl = (url as string).trim();

      if (matchId && matchId !== 'general' && !isValidMatchId(matchId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Identificador de partido inválido.',
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      let resolvedTitle: string | null = null;
      if (matchId && matchId !== 'general') {
        const found = getConsolidatedOfficialMatches().find((m) => m.id === matchId);
        if (found) {
          resolvedTitle = `${found.categoryName}: ${found.homeTeam} vs ${found.awayTeam}`;
        }
      }
      if (!resolvedTitle && typeof matchTitle === 'string' && matchTitle.trim()) {
        resolvedTitle = stripCrlf(matchTitle).slice(0, 160);
      }

      const newState: StreamingPayload = {
        active: true,
        url: trimmedUrl,
        matchId: matchId && matchId !== 'general' ? matchId : null,
        matchTitle: resolvedTitle,
        startedAt: new Date().toISOString(),
      };

      await setStreamingStatus(newState);

      return NextResponse.json(
        {
          success: true,
          message: 'Retransmisión iniciada correctamente.',
          active: true,
          url: trimmedUrl,
          matchId: newState.matchId,
          matchTitle: newState.matchTitle,
          startedAt: newState.startedAt,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // 2. FINALIZAR RETRANSMISIÓN (Y GUARDAR ENLACE EN EL PARTIDO SELECCIONADO)
    if (action === 'stop') {
      const { password } = body;

      const authRes = await authenticate(password);
      if (!authRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: authRes.blocked
              ? `Demasiados intentos fallidos. Espera ${Math.ceil(authRes.retryAfterSec / 60)} minutos.`
              : 'Contraseña de autorización incorrecta.',
          },
          {
            status: authRes.blocked ? 429 : 401,
            headers: authRes.blocked
              ? { ...NO_STORE_HEADERS, 'Retry-After': String(authRes.retryAfterSec) }
              : NO_STORE_HEADERS,
          }
        );
      }

      const current = await getStreamingStatus();
      let updatedRecordings = await getMatchRecordings();
      let recordedMatchId: string | null = null;

      if (
        current.matchId &&
        current.matchId !== 'general' &&
        current.url &&
        isValidMatchId(current.matchId) &&
        isValidYouTubeUrl(current.url)
      ) {
        recordedMatchId = current.matchId;
        updatedRecordings = await saveMatchRecording(current.matchId, current.url);
      }

      const finishedState: StreamingPayload = {
        active: false,
        url: null,
        matchId: null,
        matchTitle: null,
      };

      await setStreamingStatus(finishedState);

      return NextResponse.json(
        {
          success: true,
          message: recordedMatchId
            ? 'Retransmisión finalizada y enlace guardado para ver en diferido.'
            : 'Retransmisión finalizada correctamente.',
          active: false,
          url: null,
          recordedMatchId,
          recordings: updatedRecordings,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // 3. GUARDAR O ACTUALIZAR GRABACIÓN DIRECTAMENTE
    if (action === 'save_recording') {
      const { password, matchId, url } = body;

      const authRes = await authenticate(password);
      if (!authRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: authRes.blocked
              ? `Demasiados intentos fallidos. Espera ${Math.ceil(authRes.retryAfterSec / 60)} minutos.`
              : 'Contraseña de autorización incorrecta.',
          },
          {
            status: authRes.blocked ? 429 : 401,
            headers: authRes.blocked
              ? { ...NO_STORE_HEADERS, 'Retry-After': String(authRes.retryAfterSec) }
              : NO_STORE_HEADERS,
          }
        );
      }

      if (!matchId || !isValidMatchId(matchId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de partido inválido.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      if (!isValidYouTubeUrl(url)) {
        return NextResponse.json(
          { success: false, error: 'Debes proporcionar una URL HTTPS válida de YouTube.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const updatedRecordings = await saveMatchRecording(matchId, (url as string).trim());
      return NextResponse.json(
        {
          success: true,
          message: 'Grabación de partido guardada correctamente.',
          recordings: updatedRecordings,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos no disponible temporalmente.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[Streaming API] Error en POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor procesando la solicitud.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
