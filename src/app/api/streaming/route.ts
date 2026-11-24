import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getStreamingStatus,
  getMatchRecordings,
  setStreamingStatus,
  saveMatchRecording,
  removeMatchRecording,
  isValidYouTubeUrl,
  isValidMatchId,
  NeonUnavailableError,
  StreamingPayload,
} from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { stripCrlf } from '@/lib/validators';
import { getConsolidatedOfficialMatches } from '@/lib/favb-scraper';
import { isRestMatch } from '@/lib/match-utils';
import { formatMadridDateString, formatMadridTime } from '@/lib/date-utils';
import { getIntranetSession } from '@/lib/intranet/auth';
import { can, type IntranetAccessContext } from '@/lib/intranet/rbac';
import { recordAuditLog } from '@/lib/intranet/audit';
import { authenticateAdminSession } from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

function mapMatchOption(m: ReturnType<typeof getConsolidatedOfficialMatches>[number]) {
  return {
    id: m.id,
    round: m.round,
    categoryName: m.categoryName,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    timeStr: m.timeStr || formatMadridTime(m.matchDate),
    dateStr: m.dateStr,
    venue: m.venue,
  };
}

// GET: Obtener estado actual del streaming, grabaciones diferidas y partidos elegibles
export async function GET() {
  try {
    const streaming = await getStreamingStatus();
    const recordings = await getMatchRecordings();

    const todayStr = formatMadridDateString(new Date());
    const allMatches = getConsolidatedOfficialMatches().filter((m) => !isRestMatch(m));

    const todayMatches = allMatches.filter((m) => m.dateStr === todayStr).map(mapMatchOption);

    const upcomingMatches = allMatches
      .filter((m) => m.dateStr >= todayStr && m.status === 'SCHEDULED' && m.dateStr !== todayStr)
      .slice(0, 15)
      .map(mapMatchOption);

    const recentMatches = allMatches
      .filter((m) => m.dateStr <= todayStr)
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
      .slice(0, 25)
      .map(mapMatchOption);

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
        recentMatches,
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
          recentMatches: [],
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
        recentMatches: [],
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

async function authorizeStreamingMutation(
  ipAddress: string
): Promise<
  | { ok: true; intranetSession: IntranetAccessContext | null }
  | { ok: false; status: 401 | 403 | 429; error: string; retryAfterSec?: number }
> {
  const intranetSession = await getIntranetSession();
  if (intranetSession) {
    const allowed =
      intranetSession.isStaff &&
      (intranetSession.isPresident || can(intranetSession, 'web.streaming'));
    if (!allowed) {
      return {
        ok: false,
        status: 403,
        error: 'No tienes permiso de staff habilitado para gestionar el streaming del club.',
      };
    }
    return { ok: true, intranetSession };
  }

  const adminToken = cookies().get('cdv_admin_session')?.value;
  if (adminToken) {
    const adminAuth = await authenticateAdminSession({
      token: adminToken,
      ipAddress,
      scope: 'streaming-post',
      maxAttempts: 60,
    });
    if (adminAuth.ok) {
      return { ok: true, intranetSession: null };
    }
    if (adminAuth.status === 429) {
      return {
        ok: false,
        status: 429,
        error: adminAuth.error,
        retryAfterSec: adminAuth.retryAfterSec,
      };
    }
  }

  return {
    ok: false,
    status: 401,
    error: 'Debes iniciar sesión como miembro de staff autorizado en la intranet.',
  };
}

// POST: Iniciar, finalizar retransmisión o gestionar grabaciones (autenticado por sesión de staff/admin)
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const authRes = await authorizeStreamingMutation(clientIp);
    if (!authRes.ok) {
      return NextResponse.json(
        { success: false, error: authRes.error },
        {
          status: authRes.status,
          headers: authRes.retryAfterSec
            ? { ...NO_STORE_HEADERS, 'Retry-After': String(authRes.retryAfterSec) }
            : NO_STORE_HEADERS,
        }
      );
    }

    let body: {
      action?: string;
      url?: string;
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
    const actor = authRes.intranetSession?.user || null;

    // 1. INICIAR RETRANSMISIÓN
    if (action === 'start') {
      const { url, matchId, matchTitle } = body;

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

      if (actor) {
        await recordAuditLog({
          actorUserId: actor.id,
          actorEmail: actor.email,
          action: 'STREAMING_START',
          module: 'Comunicación',
          targetType: 'STREAMING',
          targetId: newState.matchId || 'general',
          details: { url: trimmedUrl, matchTitle: newState.matchTitle },
          ipAddress: clientIp,
        });
      }

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

      if (actor) {
        await recordAuditLog({
          actorUserId: actor.id,
          actorEmail: actor.email,
          action: 'STREAMING_STOP',
          module: 'Comunicación',
          targetType: 'STREAMING',
          targetId: recordedMatchId || current.matchId || 'general',
          details: { recordedMatchId },
          ipAddress: clientIp,
        });
      }

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
      const { matchId, url } = body;

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

      if (actor) {
        await recordAuditLog({
          actorUserId: actor.id,
          actorEmail: actor.email,
          action: 'STREAMING_SAVE_RECORDING',
          module: 'Comunicación',
          targetType: 'MATCH_RECORDING',
          targetId: matchId,
          details: { url: (url as string).trim() },
          ipAddress: clientIp,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Grabación de partido guardada correctamente.',
          recordings: updatedRecordings,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // 4. ELIMINAR GRABACIÓN ASOCIADA A UN PARTIDO
    if (action === 'remove_recording') {
      const { matchId } = body;
      if (!matchId || !isValidMatchId(matchId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de partido inválido.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const updatedRecordings = await removeMatchRecording(matchId);

      if (actor) {
        await recordAuditLog({
          actorUserId: actor.id,
          actorEmail: actor.email,
          action: 'STREAMING_REMOVE_RECORDING',
          module: 'Comunicación',
          targetType: 'MATCH_RECORDING',
          targetId: matchId,
          ipAddress: clientIp,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Grabación eliminada correctamente.',
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
