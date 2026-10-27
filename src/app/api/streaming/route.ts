import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  getStreamingStatus,
  getMatchRecordings,
  setStreamingStatus,
  saveMatchRecording,
  isValidYouTubeUrl,
  isValidMatchId,
  StreamingPayload,
} from '@/lib/streaming-store';
import { getConsolidatedOfficialMatches } from '@/lib/favb-scraper';
import { isRestMatch } from '@/lib/match-utils';
import { formatMadridDateString, formatMadridTime } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const FIXED_PASSWORD = process.env.STREAMING_ADMIN_PASSWORD;

/**
 * Verificación de contraseña en tiempo constante para mitigar ataques de temporización (timing attacks).
 */
function verifyAdminPassword(input: unknown, expected: string): boolean {
  if (typeof input !== 'string' || !expected) {
    return false;
  }
  const hashInput = crypto.createHash('sha256').update(input).digest();
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashInput, hashExpected);
}

interface FailedAttemptInfo {
  count: number;
  firstAttemptAt: number;
}

const failedAttemptsByIp = new Map<string, FailedAttemptInfo>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FAILED_ATTEMPTS = 5;

function getClientIp(request: Request): string {
  const nfIp = request.headers.get('x-nf-client-connection-ip');
  if (nfIp) return nfIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return 'unknown';
}

function isIpRateLimited(ip: string): boolean {
  const info = failedAttemptsByIp.get(ip);
  if (!info) return false;

  const now = Date.now();
  if (now - info.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsByIp.delete(ip);
    return false;
  }

  return info.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const info = failedAttemptsByIp.get(ip);
  if (!info || now - info.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsByIp.set(ip, { count: 1, firstAttemptAt: now });
  } else {
    info.count += 1;
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttemptsByIp.delete(ip);
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
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
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
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      }
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
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request);

    if (isIpRateLimited(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos fallidos. Espera 10 minutos.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const action = body.action || (body.url ? 'start' : 'stop');

    const authenticate = (passwordInput: unknown): boolean => {
      const isValid = verifyAdminPassword(passwordInput, FIXED_PASSWORD);
      if (!isValid) {
        recordFailedAttempt(clientIp);
      } else {
        clearFailedAttempts(clientIp);
      }
      return isValid;
    };

    // 1. INICIAR RETRANSMISIÓN
    if (action === 'start') {
      const { url, password, matchId, matchTitle } = body;

      // Validación de contraseña fija con tiempo constante y rate limiting
      if (!authenticate(password)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contraseña de autorización incorrecta.',
          },
          { status: 401 }
        );
      }

      // Validación estricta de URL de YouTube
      if (!isValidYouTubeUrl(url)) {
        return NextResponse.json(
          {
            success: false,
            error: 'El enlace debe pertenecer a una emisión o vídeo de YouTube válido.',
          },
          { status: 400 }
        );
      }

      const trimmedUrl = (url as string).trim();

      // Validación estricta de matchId
      if (matchId && matchId !== 'general' && !isValidMatchId(matchId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Identificador de partido inválido.',
          },
          { status: 400 }
        );
      }

      let resolvedTitle = matchTitle || null;
      if (matchId && matchId !== 'general' && !resolvedTitle) {
        const found = getConsolidatedOfficialMatches().find((m) => m.id === matchId);
        if (found) {
          resolvedTitle = `${found.categoryName}: ${found.homeTeam} vs ${found.awayTeam}`;
        }
      }

      const newState: StreamingPayload = {
        active: true,
        url: trimmedUrl,
        matchId: matchId && matchId !== 'general' ? matchId : null,
        matchTitle: resolvedTitle,
        startedAt: new Date().toISOString(),
      };

      await setStreamingStatus(newState);

      return NextResponse.json({
        success: true,
        message: 'Retransmisión iniciada correctamente.',
        active: true,
        url: trimmedUrl,
        matchId: newState.matchId,
        matchTitle: newState.matchTitle,
        startedAt: newState.startedAt,
      });
    }

    // 2. FINALIZAR RETRANSMISIÓN (Y GUARDAR ENLACE EN EL PARTIDO SELECCIONADO)
    if (action === 'stop') {
      const { password } = body;

      // Validación de contraseña para finalizar
      if (!authenticate(password)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contraseña de autorización incorrecta.',
          },
          { status: 401 }
        );
      }

      const current = await getStreamingStatus();
      let updatedRecordings = await getMatchRecordings();
      let recordedMatchId: string | null = null;

      // Si había un partido asociado y una URL de emisión válida, guardar en diferido
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

      return NextResponse.json({
        success: true,
        message: recordedMatchId
          ? 'Retransmisión finalizada y enlace guardado para ver en diferido.'
          : 'Retransmisión finalizada correctamente.',
        active: false,
        url: null,
        recordedMatchId,
        recordings: updatedRecordings,
      });
    }

    // 3. GUARDAR O ACTUALIZAR GRABACIÓN DIRECTAMENTE
    if (action === 'save_recording') {
      const { password, matchId, url } = body;

      if (!authenticate(password)) {
        return NextResponse.json(
          { success: false, error: 'Contraseña de autorización incorrecta.' },
          { status: 401 }
        );
      }

      if (!matchId || !isValidMatchId(matchId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de partido inválido.' },
          { status: 400 }
        );
      }

      if (!isValidYouTubeUrl(url)) {
        return NextResponse.json(
          { success: false, error: 'Debes proporcionar una URL válida de YouTube.' },
          { status: 400 }
        );
      }

      const updatedRecordings = await saveMatchRecording(matchId, (url as string).trim());
      return NextResponse.json({
        success: true,
        message: 'Grabación de partido guardada correctamente.',
        recordings: updatedRecordings,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Streaming API] Error en POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor procesando la solicitud.' },
      { status: 500 }
    );
  }
}
