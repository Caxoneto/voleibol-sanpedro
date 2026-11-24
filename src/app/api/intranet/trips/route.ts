import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { requireIntranetSession } from '@/lib/intranet/auth';
import {
  assertCan,
  can,
  getAuthorizedTeamScope,
  IntranetForbiddenError,
} from '@/lib/intranet/rbac';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { recordAuditLog } from '@/lib/intranet/audit';
import { ROLES_CATALOG } from '@/lib/intranet/catalog';
import { getClubTeamNameById, doesMatchBelongToTeam } from '@/lib/club-info';
import { FAVB_MATCHES } from '@/lib/favb-data';
import { AFADE_MATCHES } from '@/lib/afade-data';
import { getFastFavbMatchesSnapshot } from '@/lib/favb-scraper';
import { getFastAfadeSnapshot } from '@/lib/afade-scraper';
import { isRestMatch } from '@/lib/match-utils';
import { resolveMatchVenue } from '@/lib/club-venues-map';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
  madridLocalToUtcIso,
  parseMadridDateTimeSafe,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_REGEX = /^\d{2}:\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ASSIGNMENT_ROLES = new Set(['HEAD_COACH', 'ASSISTANT']);
const VALID_SCHEDULE_STATUSES = new Set(['PENDIENTE', 'CONFIRMADO']);
const STAFF_ROLES = ROLES_CATALOG.filter((r) => r.isStaff).map((r) => r.code);
const CONFLICT_THRESHOLD_MS = 150 * 60 * 1000; // 150 minutos (2.5h)

type AssignmentRoleCode = 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE';
type ScheduleStatusCode = 'PENDIENTE' | 'CONFIRMADO' | 'OFICIAL';

interface CanonicalClubMatch {
  id: string;
  teamId: string;
  association: 'FAVB' | 'AFADE';
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  isClubHome: boolean;
  venueName: string;
  court: string | null;
  locality: string;
  googleMapsUrl: string | null;
  matchDate: string;
  status: string;
}

interface MatchScheduleRow {
  match_id: string;
  team_season_id: string;
  proposed_date: string;
  proposed_time: string;
  court_code: string | null;
  venue_override: string | null;
  locality_override: string | null;
  departure_time_madrid: string | null;
  schedule_status: string;
  notes: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

function getIsoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

function shiftMadridDateString(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return formatMadridDateString(dt);
}

function mergeAuthorizedScopes(
  a: { isGlobal: boolean; teamIds: string[] },
  b: { isGlobal: boolean; teamIds: string[] }
): { isGlobal: boolean; teamIds: string[] } {
  if (a.isGlobal || b.isGlobal) {
    return { isGlobal: true, teamIds: [] };
  }
  return {
    isGlobal: false,
    teamIds: Array.from(new Set([...a.teamIds, ...b.teamIds])),
  };
}

/**
 * Carga todos los partidos del club combinando snapshots rápidos (FAVB + AFADE)
 * con fallback garantizado a los datasets estáticos, excluyendo descansos.
 */
async function loadAllClubMatches(): Promise<CanonicalClubMatch[]> {
  const byId = new Map<string, CanonicalClubMatch>();

  for (const m of FAVB_MATCHES) {
    byId.set(m.id, {
      id: m.id,
      teamId: m.teamId,
      association: 'FAVB',
      round: m.round,
      homeTeamName: m.homeTeamName,
      awayTeamName: m.awayTeamName,
      isClubHome: m.isClubHome,
      venueName: m.venueName,
      court: m.court || null,
      locality: m.locality || '',
      googleMapsUrl: m.googleMapsUrl || null,
      matchDate: m.matchDate,
      status: m.status,
    });
  }

  for (const m of AFADE_MATCHES) {
    byId.set(m.id, {
      id: m.id,
      teamId: m.teamId,
      association: 'AFADE',
      round: m.round,
      homeTeamName: m.homeTeamName,
      awayTeamName: m.awayTeamName,
      isClubHome: m.isClubHome,
      venueName: m.venueName,
      court: m.court || null,
      locality: m.locality || '',
      googleMapsUrl: m.googleMapsUrl || null,
      matchDate: m.matchDate,
      status: m.status,
    });
  }

  const [favbRes, afadeRes] = await Promise.allSettled([
    getFastFavbMatchesSnapshot(),
    getFastAfadeSnapshot(),
  ]);

  if (favbRes.status === 'fulfilled' && Array.isArray(favbRes.value.matches)) {
    for (const m of favbRes.value.matches) {
      const existing = byId.get(m.id);
      const teamId = m.teamId || existing?.teamId || '';
      if (!teamId) continue;
      byId.set(m.id, {
        id: m.id,
        teamId,
        association: m.association || existing?.association || 'FAVB',
        round: Number.isFinite(m.round) ? m.round : existing?.round || 1,
        homeTeamName: m.homeTeam || existing?.homeTeamName || '',
        awayTeamName: m.awayTeam || existing?.awayTeamName || '',
        isClubHome: typeof m.isClubHome === 'boolean' ? m.isClubHome : Boolean(existing?.isClubHome),
        venueName: m.venue || existing?.venueName || '',
        court: m.court || existing?.court || null,
        locality: m.locality || existing?.locality || '',
        googleMapsUrl: m.googleMapsUrl || existing?.googleMapsUrl || null,
        matchDate: m.matchDate || existing?.matchDate || '',
        status: m.status || existing?.status || 'SCHEDULED',
      });
    }
  }

  if (afadeRes.status === 'fulfilled' && Array.isArray(afadeRes.value.matches)) {
    for (const m of afadeRes.value.matches) {
      const existing = byId.get(m.id);
      const teamId = m.teamId || existing?.teamId || '';
      if (!teamId) continue;
      byId.set(m.id, {
        id: m.id,
        teamId,
        association: 'AFADE',
        round: Number.isFinite(m.round) ? m.round : existing?.round || 1,
        homeTeamName: m.homeTeam || existing?.homeTeamName || '',
        awayTeamName: m.awayTeam || existing?.awayTeamName || '',
        isClubHome: typeof m.isClubHome === 'boolean' ? m.isClubHome : Boolean(existing?.isClubHome),
        venueName: m.venue || existing?.venueName || '',
        court: m.court || existing?.court || null,
        locality: m.locality || existing?.locality || '',
        googleMapsUrl: m.googleMapsUrl || existing?.googleMapsUrl || null,
        matchDate: m.matchDate || existing?.matchDate || '',
        status: m.status || existing?.status || 'SCHEDULED',
      });
    }
  }

  return Array.from(byId.values()).filter(
    (m) => Boolean(m.teamId) && !isRestMatch({ homeTeamName: m.homeTeamName, awayTeamName: m.awayTeamName })
  );
}

/**
 * Resuelve fecha/hora efectivas (cruzando `intranet_match_schedules`) y sede real (`resolveMatchVenue`).
 */
function resolveEffectiveMatch(
  match: CanonicalClubMatch,
  allMatches: CanonicalClubMatch[],
  scheduleRow?: MatchScheduleRow
) {
  const origDateObj = parseMadridDateTimeSafe(match.matchDate);
  const officialMadridDate = formatMadridDateString(origDateObj);
  const officialMadridTime = formatMadridTime(origDateObj);

  const hasValidProposedDate = Boolean(scheduleRow && YMD_REGEX.test(scheduleRow.proposed_date));
  const hasValidProposedTime = Boolean(scheduleRow && HHMM_REGEX.test(scheduleRow.proposed_time));

  const madridDate = hasValidProposedDate
    ? (scheduleRow as MatchScheduleRow).proposed_date
    : officialMadridDate;
  const madridTime = hasValidProposedTime
    ? (scheduleRow as MatchScheduleRow).proposed_time
    : officialMadridTime;

  const matchDateUtc =
    hasValidProposedDate || hasValidProposedTime
      ? madridLocalToUtcIso(madridDate, madridTime)
      : origDateObj.toISOString();

  const venueInfo = resolveMatchVenue(match, allMatches, {
    venueOverride: scheduleRow?.venue_override || null,
    localityOverride: scheduleRow?.locality_override || null,
  });

  let scheduleStatus: ScheduleStatusCode = 'OFICIAL';
  if (scheduleRow) {
    if (scheduleRow.schedule_status === 'CONFIRMADO') {
      scheduleStatus = 'CONFIRMADO';
    } else if (scheduleRow.schedule_status === 'OFICIAL') {
      scheduleStatus = 'OFICIAL';
    } else {
      scheduleStatus = 'PENDIENTE';
    }
  }

  return {
    madridDate,
    madridTime,
    matchDateUtc,
    madridDateFormatted: formatMadridDate(matchDateUtc),
    officialMadridDate,
    officialMadridTime,
    proposedDate: scheduleRow?.proposed_date || madridDate,
    proposedTime: scheduleRow?.proposed_time || madridTime,
    scheduleStatus,
    departureTimeMadrid: scheduleRow?.departure_time_madrid || null,
    venueOverride: scheduleRow?.venue_override || null,
    localityOverride: scheduleRow?.locality_override || null,
    scheduleNotes: scheduleRow?.notes || null,
    isScheduledManually: Boolean(scheduleRow),
    venueName: venueInfo.venueName,
    locality: venueInfo.locality,
    court: scheduleRow?.court_code || venueInfo.court || null,
    venueEstimated: venueInfo.isEstimated,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    const canView = can(ctx, 'trip.view');
    const canManage = can(ctx, 'trip.manage');

    if (!canView && !canManage) {
      throw new IntranetForbiddenError(
        'No tienes permiso para acceder al módulo de desplazamientos.'
      );
    }

    const combinedScope = mergeAuthorizedScopes(
      getAuthorizedTeamScope(ctx, 'trip.view'),
      getAuthorizedTeamScope(ctx, 'trip.manage')
    );

    const { searchParams } = req.nextUrl;
    const range = (searchParams.get('range') || 'weekend').trim();
    const teamIdFilter = (searchParams.get('teamId') || 'ALL').trim();
    const roundParam = (searchParams.get('round') || 'ALL').trim();
    const roundFilter =
      roundParam !== 'ALL' && /^\d+$/.test(roundParam) && Number(roundParam) > 0
        ? Number(roundParam)
        : null;
    const fromParam = (searchParams.get('from') || '').trim();
    const toParam = (searchParams.get('to') || '').trim();

    const todayMadrid = formatMadridDateString(new Date());
    const dow = getIsoWeekdayFromYmd(todayMadrid); // 1=Lun .. 7=Dom
    const weekendFrom =
      dow <= 5
        ? shiftMadridDateString(todayMadrid, 5 - dow)
        : dow === 6
        ? shiftMadridDateString(todayMadrid, -1)
        : shiftMadridDateString(todayMadrid, -2);
    const weekendTo = shiftMadridDateString(weekendFrom, 2);

    const [
      allMatches,
      scheduleRows,
      assignmentRows,
      tripRows,
      staffUsersRows,
      staffTeamsRows,
      teamsRows,
    ] = await Promise.all([
      loadAllClubMatches(),
      queryNeon<MatchScheduleRow>(
        `SELECT
           match_id,
           team_season_id,
           proposed_date,
           proposed_time,
           court_code,
           venue_override,
           locality_override,
           departure_time_madrid,
           schedule_status,
           notes,
           updated_by::text AS updated_by,
           updated_at::text AS updated_at
         FROM intranet_match_schedules;`
      ),
      queryNeon<{
        id: string;
        match_id: string;
        team_season_id: string;
        madrid_date: string;
        starts_at_utc: string;
        user_id: string;
        user_name: string;
        user_email: string;
        user_phone: string | null;
        assignment_role: AssignmentRoleCode;
        trip_id: string | null;
        notes: string | null;
      }>(
        `SELECT
           ma.id::text AS id,
           ma.match_id,
           ma.team_season_id,
           ma.madrid_date,
           ma.starts_at_utc::text AS starts_at_utc,
           ma.user_id::text AS user_id,
           u.name AS user_name,
           u.email AS user_email,
           u.phone AS user_phone,
           ma.assignment_role,
           ma.trip_id::text AS trip_id,
           ma.notes
         FROM intranet_match_assignments ma
         INNER JOIN intranet_users u ON u.id = ma.user_id
         ORDER BY ma.starts_at_utc ASC;`
      ),
      queryNeon<{
        id: string;
        madrid_date: string;
        destination_locality: string;
        venue_name: string | null;
        departure_time_madrid: string;
        meeting_point: string | null;
        transport_notes: string | null;
        created_by_name: string | null;
        created_at: string;
      }>(
        `SELECT
           t.id::text AS id,
           t.madrid_date,
           t.destination_locality,
           t.venue_name,
           t.departure_time_madrid,
           t.meeting_point,
           t.transport_notes,
           u.name AS created_by_name,
           t.created_at::text AS created_at
         FROM intranet_staff_trips t
         LEFT JOIN intranet_users u ON u.id = t.created_by
         ORDER BY t.madrid_date ASC, t.departure_time_madrid ASC;`
      ),
      queryNeon<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role_codes: string[];
      }>(
        `SELECT
           u.id::text AS id,
           u.name,
           u.email,
           u.phone,
           ARRAY_REMOVE(ARRAY_AGG(DISTINCT ur.role_code), NULL) AS role_codes
         FROM intranet_users u
         INNER JOIN intranet_user_roles ur ON ur.user_id = u.id
         WHERE u.status = 'ACTIVE'
           AND ur.valid_from <= NOW()
           AND (ur.valid_to IS NULL OR ur.valid_to > NOW())
           AND ur.role_code = ANY($1::text[])
         GROUP BY u.id, u.name, u.email, u.phone
         ORDER BY u.name ASC;`,
        [STAFF_ROLES]
      ),
      queryNeon<{ user_id: string; team_season_id: string; staff_function: string }>(
        `SELECT user_id::text AS user_id, team_season_id, staff_function
         FROM intranet_team_staff
         WHERE valid_from <= NOW()
           AND (valid_to IS NULL OR valid_to > NOW());`
      ),
      queryNeon<{ id: string; name: string; association: string }>(
        `SELECT id, name, association
         FROM intranet_team_seasons
         WHERE is_active = true
         ORDER BY sort_order ASC, name ASC;`
      ),
    ]);

    const scheduleMap = new Map(scheduleRows.map((r) => [r.match_id, r]));
    const teamNameMap = new Map(teamsRows.map((t) => [t.id, t.name]));

    const resolvedByMatchId = new Map(
      allMatches.map((m) => [
        m.id,
        {
          match: m,
          effective: resolveEffectiveMatch(m, allMatches, scheduleMap.get(m.id)),
        },
      ])
    );

    // Normalizar asignaciones con fecha/hora efectiva (si hubo override en intranet_match_schedules)
    const normalizedAssignments = assignmentRows.map((a) => {
      const resolved = resolvedByMatchId.get(a.match_id);
      return {
        ...a,
        effectiveMadridDate: resolved?.effective.madridDate || a.madrid_date,
        effectiveStartsAtUtc: resolved?.effective.matchDateUtc || a.starts_at_utc,
      };
    });

    // Calcular conflictos de jornada (< 150 min entre 2+ partidos del mismo técnico el mismo día Madrid)
    const byUserDate = new Map<string, typeof normalizedAssignments>();
    for (const a of normalizedAssignments) {
      const key = `${a.user_id}::${a.effectiveMadridDate}`;
      const list = byUserDate.get(key) || [];
      list.push(a);
      byUserDate.set(key, list);
    }

    const conflictedAssignmentIds = new Set<string>();
    const conflictedMatchIds = new Set<string>();
    const conflicts: Array<{
      id: string;
      userId: string;
      userName: string;
      madridDate: string;
      madridDateFormatted: string;
      diffMinutes: number;
      matches: Array<{
        assignmentId: string;
        matchId: string;
        teamSeasonId: string;
        teamName: string;
        madridTime: string;
        opponent: string;
        venueName: string;
        locality: string;
        assignmentRole: AssignmentRoleCode;
      }>;
    }> = [];

    for (const list of Array.from(byUserDate.values())) {
      if (list.length < 2) continue;
      const sorted = [...list].sort(
        (a, b) =>
          new Date(a.effectiveStartsAtUtc).getTime() -
          new Date(b.effectiveStartsAtUtc).getTime()
      );
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          const diffMs = Math.abs(
            new Date(b.effectiveStartsAtUtc).getTime() -
              new Date(a.effectiveStartsAtUtc).getTime()
          );
          if (diffMs < CONFLICT_THRESHOLD_MS) {
            conflictedAssignmentIds.add(a.id);
            conflictedAssignmentIds.add(b.id);
            conflictedMatchIds.add(a.match_id);
            conflictedMatchIds.add(b.match_id);

            conflicts.push({
              id: `${a.id}-${b.id}`,
              userId: a.user_id,
              userName: a.user_name,
              madridDate: a.effectiveMadridDate,
              madridDateFormatted: formatMadridDate(a.effectiveStartsAtUtc),
              diffMinutes: Math.round(diffMs / 60000),
              matches: [a, b].map((item) => {
                const resolved = resolvedByMatchId.get(item.match_id);
                const rawM = resolved?.match;
                const opponent = rawM
                  ? rawM.isClubHome
                    ? rawM.awayTeamName
                    : rawM.homeTeamName
                  : item.match_id;
                return {
                  assignmentId: item.id,
                  matchId: item.match_id,
                  teamSeasonId: item.team_season_id,
                  teamName:
                    teamNameMap.get(item.team_season_id) ||
                    getClubTeamNameById(item.team_season_id),
                  madridTime: formatMadridTime(item.effectiveStartsAtUtc),
                  opponent,
                  venueName: resolved?.effective.venueName || 'Sede por confirmar',
                  locality: resolved?.effective.locality || '',
                  assignmentRole: item.assignment_role,
                };
              }),
            });
          }
        }
      }
    }

    const tripMap = new Map(tripRows.map((t) => [t.id, t]));
    const assignmentsByMatch = new Map<
      string,
      Array<{
        id: string;
        userId: string;
        userName: string;
        userEmail: string;
        userPhone: string | null;
        assignmentRole: AssignmentRoleCode;
        tripId: string | null;
        notes: string | null;
        hasConflict: boolean;
      }>
    >();

    const linkedMatchIdsByTrip = new Map<string, Set<string>>();

    for (const a of normalizedAssignments) {
      const list = assignmentsByMatch.get(a.match_id) || [];
      list.push({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        userEmail: a.user_email,
        userPhone: a.user_phone,
        assignmentRole: a.assignment_role,
        tripId: a.trip_id,
        notes: a.notes,
        hasConflict: conflictedAssignmentIds.has(a.id),
      });
      assignmentsByMatch.set(a.match_id, list);

      if (a.trip_id) {
        const set = linkedMatchIdsByTrip.get(a.trip_id) || new Set<string>();
        set.add(a.match_id);
        linkedMatchIdsByTrip.set(a.trip_id, set);
      }
    }

    // Construir catálogo enriquecido de partidos únicamente fuera de casa dentro del ámbito autorizado
    const scopedBaseMatches = allMatches
      .filter((m) => {
        if (m.isClubHome) return false;
        if (
          !combinedScope.isGlobal &&
          !combinedScope.teamIds.some((tid) => doesMatchBelongToTeam(m, tid))
        ) {
          return false;
        }
        if (teamIdFilter !== 'ALL' && !doesMatchBelongToTeam(m, teamIdFilter)) {
          return false;
        }
        return true;
      })
      .map((m) => {
        const resolved = resolvedByMatchId.get(m.id);
        const eff = resolved?.effective || resolveEffectiveMatch(m, allMatches, scheduleMap.get(m.id));
        const assignments = assignmentsByMatch.get(m.id) || [];
        const tripId = assignments.find((a) => a.tripId)?.tripId || null;
        const trip = tripId ? tripMap.get(tripId) || null : null;

        return {
          id: m.id,
          teamSeasonId: m.teamId,
          teamName: teamNameMap.get(m.teamId) || getClubTeamNameById(m.teamId),
          association: m.association,
          round: m.round,
          homeTeamName: m.homeTeamName,
          awayTeamName: m.awayTeamName,
          isClubHome: m.isClubHome,
          venueName: eff.venueName,
          locality: eff.locality,
          court: eff.court,
          venueEstimated: eff.venueEstimated,
          venueOverride: eff.venueOverride,
          localityOverride: eff.localityOverride,
          proposedDate: eff.proposedDate,
          proposedTime: eff.proposedTime,
          scheduleStatus: eff.scheduleStatus,
          departureTimeMadrid: eff.departureTimeMadrid,
          scheduleNotes: eff.scheduleNotes,
          isScheduledManually: eff.isScheduledManually,
          officialMadridDate: eff.officialMadridDate,
          officialMadridTime: eff.officialMadridTime,
          googleMapsUrl: m.googleMapsUrl || null,
          matchDateUtc: eff.matchDateUtc,
          madridDate: eff.madridDate,
          madridTime: eff.madridTime,
          madridDateFormatted: eff.madridDateFormatted,
          status: m.status,
          assignments,
          hasConflict: conflictedMatchIds.has(m.id),
          canManageMatch: can(ctx, 'trip.manage', { teamSeasonId: m.teamId }),
          trip: trip
            ? {
                id: trip.id,
                madridDate: trip.madrid_date,
                destinationLocality: trip.destination_locality,
                venueName: trip.venue_name,
                departureTimeMadrid: trip.departure_time_madrid,
                meetingPoint: trip.meeting_point,
                transportNotes: trip.transport_notes,
              }
            : null,
        };
      });

    // Jornadas disponibles ordenadas [1, 2, ...] y resumen fuera/casa para el selector de cuadros
    const roundSummaryMap = new Map<number, { round: number; totalCount: number; awayCount: number }>();
    for (const m of scopedBaseMatches) {
      const curr = roundSummaryMap.get(m.round) || { round: m.round, totalCount: 0, awayCount: 0 };
      curr.totalCount += 1;
      if (!m.isClubHome) curr.awayCount += 1;
      roundSummaryMap.set(m.round, curr);
    }
    const rounds = Array.from(roundSummaryMap.keys()).sort((a, b) => a - b);
    const awayRounds = rounds.filter((r) => (roundSummaryMap.get(r)?.awayCount || 0) > 0);
    const roundSummaries = rounds.map((r) => roundSummaryMap.get(r)!);

    const enrichedMatches = scopedBaseMatches
      .filter((m) => {
        if (YMD_REGEX.test(fromParam) && m.madridDate < fromParam) return false;
        if (YMD_REGEX.test(toParam) && m.madridDate > toParam) return false;
        if (roundFilter !== null) {
          return m.round === roundFilter;
        }
        if (range === 'weekend') {
          return m.madridDate >= weekendFrom && m.madridDate <= weekendTo;
        }
        if (range === 'upcoming') {
          return m.madridDate >= todayMadrid;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.matchDateUtc).getTime() - new Date(b.matchDateUtc).getTime()
      );

    const staffTeamMap = new Map<string, string[]>();
    for (const st of staffTeamsRows) {
      const list = staffTeamMap.get(st.user_id) || [];
      list.push(st.team_season_id);
      staffTeamMap.set(st.user_id, list);
    }

    const staffList = staffUsersRows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roles: u.role_codes,
      teamSeasonIds: staffTeamMap.get(u.id) || [],
    }));

    const trips = tripRows.map((t) => {
      const matchIds = Array.from(linkedMatchIdsByTrip.get(t.id) || []);
      return {
        id: t.id,
        madridDate: t.madrid_date,
        destinationLocality: t.destination_locality,
        venueName: t.venue_name,
        departureTimeMadrid: t.departure_time_madrid,
        meetingPoint: t.meeting_point,
        transportNotes: t.transport_notes,
        createdByName: t.created_by_name,
        createdAt: t.created_at,
        linkedMatchIds: matchIds,
        linkedMatches: matchIds.map((mid) => {
          const resolved = resolvedByMatchId.get(mid);
          const raw = resolved?.match;
          return {
            matchId: mid,
            teamSeasonId: raw?.teamId || '',
            teamName: raw ? (teamNameMap.get(raw.teamId) || getClubTeamNameById(raw.teamId)) : mid,
            madridTime: resolved?.effective.madridTime || '',
            opponent: raw
              ? raw.isClubHome
                ? raw.awayTeamName
                : raw.homeTeamName
              : '',
          };
        }),
      };
    });

    const authorizedTeams = combinedScope.isGlobal
      ? teamsRows
      : teamsRows.filter((t) => combinedScope.teamIds.includes(t.id));

    // Índice rápido userId+madridDate para advertencias informativas no bloqueantes al asignar
    const userScheduleIndex: Record<
      string,
      Array<{
        matchId: string;
        madridTime: string;
        startsAtUtc: string;
        teamName: string;
        venueName: string;
        locality: string;
        isClubHome: boolean;
      }>
    > = {};
    for (const a of normalizedAssignments) {
      const key = `${a.user_id}::${a.effectiveMadridDate}`;
      if (!userScheduleIndex[key]) userScheduleIndex[key] = [];
      const resolved = resolvedByMatchId.get(a.match_id);
      userScheduleIndex[key].push({
        matchId: a.match_id,
        madridTime: formatMadridTime(a.effectiveStartsAtUtc),
        startsAtUtc: a.effectiveStartsAtUtc,
        teamName: teamNameMap.get(a.team_season_id) || getClubTeamNameById(a.team_season_id),
        venueName: resolved?.effective.venueName || 'Sede por confirmar',
        locality: resolved?.effective.locality || '',
        isClubHome: Boolean(resolved?.match.isClubHome),
      });
    }

    return NextResponse.json({
      success: true,
      todayMadrid,
      weekendWindow: { from: weekendFrom, to: weekendTo },
      teams: authorizedTeams,
      rounds,
      awayRounds,
      roundSummaries,
      matches: enrichedMatches,
      trips,
      conflicts,
      staff: staffList,
      userScheduleIndex,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Trips GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Cuerpo JSON no válido.' },
        { status: 400 }
      );
    }

    const action = String(body.action || '').trim();
    const ipAddress = getClientIp(req);
    const allMatches = await loadAllClubMatches();
    const matchById = new Map(allMatches.map((m) => [m.id, m]));

    if (action === 'upsert_match_schedule') {
      const matchId = String(body.matchId || '').trim();
      const match = matchById.get(matchId);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Partido no encontrado en el calendario oficial.' },
          { status: 404 }
        );
      }

      const teamSeasonId = match.teamId;
      assertCan(ctx, 'trip.manage', { teamSeasonId });

      const proposedDate = String(body.proposedDate || '').trim();
      const proposedTime = String(body.proposedTime || '').trim();
      const scheduleStatusRaw = String(body.scheduleStatus || 'PENDIENTE').trim().toUpperCase();
      const departureTimeRaw = body.departureTimeMadrid
        ? String(body.departureTimeMadrid).trim()
        : '';
      const venueOverride = body.venueOverride
        ? String(body.venueOverride).trim().slice(0, 200)
        : null;
      const localityOverride = body.localityOverride
        ? String(body.localityOverride).trim().slice(0, 120)
        : null;
      const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;

      if (!YMD_REGEX.test(proposedDate)) {
        return NextResponse.json(
          { success: false, error: 'Fecha propuesta no válida (YYYY-MM-DD).' },
          { status: 400 }
        );
      }
      if (!HHMM_REGEX.test(proposedTime)) {
        return NextResponse.json(
          { success: false, error: 'Hora propuesta no válida (HH:MM).' },
          { status: 400 }
        );
      }
      if (!VALID_SCHEDULE_STATUSES.has(scheduleStatusRaw)) {
        return NextResponse.json(
          { success: false, error: 'Estado de horario no válido (PENDIENTE o CONFIRMADO).' },
          { status: 400 }
        );
      }
      if (departureTimeRaw && !HHMM_REGEX.test(departureTimeRaw)) {
        return NextResponse.json(
          { success: false, error: 'Hora de desplazamiento no válida (HH:MM).' },
          { status: 400 }
        );
      }

      const departureTimeMadrid = departureTimeRaw || null;
      const effectiveUtcIso = madridLocalToUtcIso(proposedDate, proposedTime);

      await queryNeon(
        `INSERT INTO intranet_match_schedules (
           match_id, team_season_id, proposed_date, proposed_time,
           venue_override, locality_override, departure_time_madrid,
           schedule_status, notes, updated_by, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid, NOW())
         ON CONFLICT (match_id) DO UPDATE SET
           team_season_id = EXCLUDED.team_season_id,
           proposed_date = EXCLUDED.proposed_date,
           proposed_time = EXCLUDED.proposed_time,
           venue_override = EXCLUDED.venue_override,
           locality_override = EXCLUDED.locality_override,
           departure_time_madrid = EXCLUDED.departure_time_madrid,
           schedule_status = EXCLUDED.schedule_status,
           notes = EXCLUDED.notes,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW();`,
        [
          matchId,
          teamSeasonId,
          proposedDate,
          proposedTime,
          venueOverride || null,
          localityOverride || null,
          departureTimeMadrid,
          scheduleStatusRaw,
          notes || null,
          ctx.user.id,
        ]
      );

      // Mantener sincronizada la fecha/hora de asignaciones técnicas existentes de este partido
      await queryNeon(
        `UPDATE intranet_match_assignments
         SET madrid_date = $2,
             starts_at_utc = $3::timestamptz
         WHERE match_id = $1;`,
        [matchId, proposedDate, effectiveUtcIso]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'UPSERT_MATCH_SCHEDULE',
        module: 'Desplazamientos',
        targetType: 'MATCH_SCHEDULE',
        targetId: matchId,
        details: {
          matchId,
          teamSeasonId,
          proposedDate,
          proposedTime,
          scheduleStatus: scheduleStatusRaw,
          departureTimeMadrid,
          venueOverride: venueOverride || null,
          localityOverride: localityOverride || null,
        },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        matchId,
        proposedDate,
        proposedTime,
        scheduleStatus: scheduleStatusRaw,
        departureTimeMadrid,
      });
    }

    if (action === 'assign_match_staff') {
      const matchId = String(body.matchId || '').trim();
      const userId = String(body.userId || '').trim();
      const assignmentRole = String(body.assignmentRole || '').trim() as AssignmentRoleCode;
      const notes = body.notes ? String(body.notes).trim().slice(0, 300) : null;
      const tripId = body.tripId ? String(body.tripId).trim() : null;
      const replaceRoleSlot = Boolean(body.replaceRoleSlot);

      const match = matchById.get(matchId);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Partido no encontrado en el calendario oficial.' },
          { status: 404 }
        );
      }

      assertCan(ctx, 'trip.manage', { teamSeasonId: match.teamId });

      if (!UUID_REGEX.test(userId)) {
        return NextResponse.json(
          { success: false, error: 'Usuario de staff no válido.' },
          { status: 400 }
        );
      }
      if (!VALID_ASSIGNMENT_ROLES.has(assignmentRole)) {
        return NextResponse.json(
          { success: false, error: `Rol de partido no válido: ${assignmentRole}` },
          { status: 400 }
        );
      }
      if (tripId && !UUID_REGEX.test(tripId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de expedición no válido.' },
          { status: 400 }
        );
      }

      const [activeUsers, scheduleRows] = await Promise.all([
        queryNeon<{ id: string; name: string }>(
          `SELECT id::text AS id, name FROM intranet_users WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1;`,
          [userId]
        ),
        queryNeon<MatchScheduleRow>(
          `SELECT
             match_id, team_season_id, proposed_date, proposed_time, court_code,
             venue_override, locality_override, departure_time_madrid,
             schedule_status, notes, updated_by::text AS updated_by, updated_at::text AS updated_at
           FROM intranet_match_schedules;`
        ),
      ]);

      if (activeUsers.length === 0) {
        return NextResponse.json(
          { success: false, error: 'El miembro del staff seleccionado no está activo.' },
          { status: 400 }
        );
      }

      const scheduleMap = new Map(scheduleRows.map((s) => [s.match_id, s]));
      const targetEff = resolveEffectiveMatch(match, allMatches, scheduleMap.get(matchId));
      const madridDate = targetEff.madridDate;
      const startsAtUtc = targetEff.matchDateUtc;

      if (replaceRoleSlot) {
        await queryNeon(
          `DELETE FROM intranet_match_assignments
           WHERE match_id = $1 AND assignment_role = $2 AND user_id <> $3::uuid;`,
          [matchId, assignmentRole, userId]
        );
      }

      // Heredar trip_id existente del partido si no se pasó uno explícito
      let effectiveTripId = tripId;
      if (!effectiveTripId) {
        const existingTripRows = await queryNeon<{ trip_id: string | null }>(
          `SELECT trip_id::text AS trip_id
           FROM intranet_match_assignments
           WHERE match_id = $1 AND trip_id IS NOT NULL
           LIMIT 1;`,
          [matchId]
        );
        effectiveTripId = existingTripRows[0]?.trip_id || null;
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_match_assignments (
           match_id, team_season_id, madrid_date, starts_at_utc,
           user_id, assignment_role, trip_id, notes, assigned_by
         ) VALUES ($1, $2, $3, $4::timestamptz, $5::uuid, $6, $7::uuid, $8, $9::uuid)
         ON CONFLICT (match_id, user_id) DO UPDATE SET
           madrid_date = EXCLUDED.madrid_date,
           starts_at_utc = EXCLUDED.starts_at_utc,
           assignment_role = EXCLUDED.assignment_role,
           trip_id = COALESCE(EXCLUDED.trip_id, intranet_match_assignments.trip_id),
           notes = COALESCE(EXCLUDED.notes, intranet_match_assignments.notes),
           assigned_by = EXCLUDED.assigned_by
         RETURNING id::text AS id;`,
        [
          matchId,
          match.teamId,
          madridDate,
          startsAtUtc,
          userId,
          assignmentRole,
          effectiveTripId,
          notes,
          ctx.user.id,
        ]
      );

      // Calcular avisos informativos (NO bloqueantes) de otros partidos del mismo entrenador ese día
      const [userAssignments, teamRows] = await Promise.all([
        queryNeon<{
          match_id: string;
          team_season_id: string;
          madrid_date: string;
          starts_at_utc: string;
        }>(
          `SELECT match_id, team_season_id, madrid_date, starts_at_utc::text AS starts_at_utc
           FROM intranet_match_assignments
           WHERE user_id = $1::uuid AND match_id <> $2;`,
          [userId, matchId]
        ),
        queryNeon<{ id: string; name: string }>(`SELECT id, name FROM intranet_team_seasons;`),
      ]);
      const teamNameMap = new Map(teamRows.map((t) => [t.id, t.name]));

      const targetTimeMs = new Date(startsAtUtc).getTime();
      const sameDayWarnings: Array<{
        matchId: string;
        teamName: string;
        timeStr: string;
        venueName: string;
        locality: string;
        isClubHome: boolean;
        diffMinutes: number;
      }> = [];

      for (const other of userAssignments) {
        const otherMatch = matchById.get(other.match_id);
        const otherEff = otherMatch
          ? resolveEffectiveMatch(otherMatch, allMatches, scheduleMap.get(other.match_id))
          : null;
        const otherDate = otherEff?.madridDate || other.madrid_date;
        if (otherDate !== madridDate) continue;

        const otherUtc = otherEff?.matchDateUtc || other.starts_at_utc;
        const diffMinutes = Math.round(
          Math.abs(new Date(otherUtc).getTime() - targetTimeMs) / 60000
        );

        sameDayWarnings.push({
          matchId: other.match_id,
          teamName:
            teamNameMap.get(other.team_season_id) ||
            getClubTeamNameById(other.team_season_id),
          timeStr: otherEff?.madridTime || formatMadridTime(otherUtc),
          venueName: otherEff?.venueName || 'Sede por confirmar',
          locality: otherEff?.locality || '',
          isClubHome: Boolean(otherMatch?.isClubHome),
          diffMinutes,
        });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'ASSIGN_MATCH_STAFF',
        module: 'Desplazamientos',
        targetType: 'MATCH_ASSIGNMENT',
        targetId: inserted[0]?.id || matchId,
        details: {
          matchId,
          teamSeasonId: match.teamId,
          madridDate,
          userId,
          staffName: activeUsers[0].name,
          assignmentRole,
          sameDayWarningsCount: sameDayWarnings.length,
        },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        assignmentId: inserted[0]?.id,
        sameDayWarnings,
      });
    }

    if (action === 'remove_assignment') {
      const assignmentId = body.assignmentId ? String(body.assignmentId).trim() : null;
      const matchId = body.matchId ? String(body.matchId).trim() : null;
      const userId = body.userId ? String(body.userId).trim() : null;

      let existingRows: Array<{
        id: string;
        match_id: string;
        team_season_id: string;
        user_id: string;
      }> = [];

      if (assignmentId && UUID_REGEX.test(assignmentId)) {
        existingRows = await queryNeon(
          `SELECT id::text AS id, match_id, team_season_id, user_id::text AS user_id
           FROM intranet_match_assignments
           WHERE id = $1::uuid
           LIMIT 1;`,
          [assignmentId]
        );
      } else if (matchId && userId && UUID_REGEX.test(userId)) {
        existingRows = await queryNeon(
          `SELECT id::text AS id, match_id, team_season_id, user_id::text AS user_id
           FROM intranet_match_assignments
           WHERE match_id = $1 AND user_id = $2::uuid
           LIMIT 1;`,
          [matchId, userId]
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Indica el identificador de asignación a eliminar.' },
          { status: 400 }
        );
      }

      const row = existingRows[0];
      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Asignación no encontrada.' },
          { status: 404 }
        );
      }

      assertCan(ctx, 'trip.manage', { teamSeasonId: row.team_season_id });

      await queryNeon(
        `DELETE FROM intranet_match_assignments WHERE id = $1::uuid;`,
        [row.id]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REMOVE_MATCH_STAFF',
        module: 'Desplazamientos',
        targetType: 'MATCH_ASSIGNMENT',
        targetId: row.id,
        details: {
          matchId: row.match_id,
          teamSeasonId: row.team_season_id,
          removedUserId: row.user_id,
        },
        ipAddress,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'upsert_staff_trip') {
      assertCan(ctx, 'trip.manage');

      const tripId = body.tripId ? String(body.tripId).trim() : null;
      const madridDate = String(body.madridDate || '').trim();
      const destinationLocality = String(body.destinationLocality || '').trim().slice(0, 120);
      const venueName = body.venueName ? String(body.venueName).trim().slice(0, 200) : null;
      const departureTimeMadrid = String(body.departureTimeMadrid || '').trim();
      const meetingPoint = body.meetingPoint
        ? String(body.meetingPoint).trim().slice(0, 200)
        : null;
      const transportNotes = body.transportNotes
        ? String(body.transportNotes).trim().slice(0, 600)
        : null;
      const matchIds = Array.isArray(body.matchIds)
        ? Array.from(new Set(body.matchIds.map((x) => String(x || '').trim()).filter(Boolean)))
        : [];

      if (tripId && !UUID_REGEX.test(tripId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de expedición no válido.' },
          { status: 400 }
        );
      }
      if (!YMD_REGEX.test(madridDate)) {
        return NextResponse.json(
          { success: false, error: 'Fecha de viaje no válida (YYYY-MM-DD).' },
          { status: 400 }
        );
      }
      if (destinationLocality.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Indica la localidad de destino.' },
          { status: 400 }
        );
      }
      if (!HHMM_REGEX.test(departureTimeMadrid)) {
        return NextResponse.json(
          { success: false, error: 'Hora de salida Madrid no válida (HH:MM).' },
          { status: 400 }
        );
      }

      for (const mid of matchIds) {
        const m = matchById.get(mid);
        if (!m) {
          return NextResponse.json(
            { success: false, error: `Partido no válido en selección: ${mid}` },
            { status: 400 }
          );
        }
        assertCan(ctx, 'trip.manage', { teamSeasonId: m.teamId });
      }

      let savedTripId = tripId;
      if (savedTripId) {
        const tripMetaRows = await queryNeon<{ id: string; created_by: string | null }>(
          `SELECT id::text AS id, created_by::text AS created_by
           FROM intranet_staff_trips
           WHERE id = $1::uuid
           LIMIT 1;`,
          [savedTripId]
        );
        if (tripMetaRows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Expedición no encontrada.' },
            { status: 404 }
          );
        }

        const linkedTeams = await queryNeon<{ team_season_id: string }>(
          `SELECT DISTINCT team_season_id
           FROM intranet_match_assignments
           WHERE trip_id = $1::uuid;`,
          [savedTripId]
        );
        if (linkedTeams.length > 0) {
          for (const row of linkedTeams) {
            assertCan(ctx, 'trip.manage', { teamSeasonId: row.team_season_id });
          }
        } else {
          const manageScope = getAuthorizedTeamScope(ctx, 'trip.manage');
          if (!manageScope.isGlobal && tripMetaRows[0].created_by !== ctx.user.id) {
            throw new IntranetForbiddenError(
              'No tienes permiso para modificar esta expedición.'
            );
          }
        }

        await queryNeon(
          `UPDATE intranet_staff_trips
           SET madrid_date = $2,
               destination_locality = $3,
               venue_name = $4,
               departure_time_madrid = $5,
               meeting_point = $6,
               transport_notes = $7
           WHERE id = $1::uuid;`,
          [
            savedTripId,
            madridDate,
            destinationLocality,
            venueName,
            departureTimeMadrid,
            meetingPoint,
            transportNotes,
          ]
        );
      } else {
        const inserted = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_staff_trips (
             madrid_date, destination_locality, venue_name,
             departure_time_madrid, meeting_point, transport_notes, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
           RETURNING id::text AS id;`,
          [
            madridDate,
            destinationLocality,
            venueName,
            departureTimeMadrid,
            meetingPoint,
            transportNotes,
            ctx.user.id,
          ]
        );
        savedTripId = inserted[0].id;
      }

      // Desvincular partidos quitados de esta expedición
      await queryNeon(
        `UPDATE intranet_match_assignments
         SET trip_id = NULL
         WHERE trip_id = $1::uuid
           AND NOT (match_id = ANY($2::text[]));`,
        [savedTripId, matchIds]
      );

      let linkedAssignmentsCount = 0;
      if (matchIds.length > 0) {
        const linked = await queryNeon<{ id: string }>(
          `UPDATE intranet_match_assignments
           SET trip_id = $1::uuid
           WHERE match_id = ANY($2::text[])
           RETURNING id::text AS id;`,
          [savedTripId, matchIds]
        );
        linkedAssignmentsCount = linked.length;
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'UPSERT_STAFF_TRIP',
        module: 'Desplazamientos',
        targetType: 'STAFF_TRIP',
        targetId: savedTripId,
        details: {
          madridDate,
          destinationLocality,
          departureTimeMadrid,
          meetingPoint,
          matchIds,
          linkedAssignmentsCount,
        },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        tripId: savedTripId,
        linkedAssignmentsCount,
      });
    }

    if (action === 'delete_staff_trip') {
      assertCan(ctx, 'trip.manage');
      const tripId = String(body.tripId || '').trim();
      if (!UUID_REGEX.test(tripId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de expedición no válido.' },
          { status: 400 }
        );
      }

      const tripMetaRows = await queryNeon<{ id: string; created_by: string | null }>(
        `SELECT id::text AS id, created_by::text AS created_by
         FROM intranet_staff_trips
         WHERE id = $1::uuid
         LIMIT 1;`,
        [tripId]
      );
      if (tripMetaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Expedición no encontrada.' },
          { status: 404 }
        );
      }

      const linkedTeams = await queryNeon<{ team_season_id: string }>(
        `SELECT DISTINCT team_season_id
         FROM intranet_match_assignments
         WHERE trip_id = $1::uuid;`,
        [tripId]
      );
      if (linkedTeams.length > 0) {
        for (const row of linkedTeams) {
          assertCan(ctx, 'trip.manage', { teamSeasonId: row.team_season_id });
        }
      } else {
        const manageScope = getAuthorizedTeamScope(ctx, 'trip.manage');
        if (!manageScope.isGlobal && tripMetaRows[0].created_by !== ctx.user.id) {
          throw new IntranetForbiddenError(
            'No tienes permiso para eliminar esta expedición.'
          );
        }
      }

      await queryNeon(
        `UPDATE intranet_match_assignments SET trip_id = NULL WHERE trip_id = $1::uuid;`,
        [tripId]
      );
      await queryNeon(`DELETE FROM intranet_staff_trips WHERE id = $1::uuid;`, [tripId]);

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'DELETE_STAFF_TRIP',
        module: 'Desplazamientos',
        targetType: 'STAFF_TRIP',
        targetId: tripId,
        details: {},
        ipAddress,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: `Acción no soportada: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Trips POST');
  }
}
