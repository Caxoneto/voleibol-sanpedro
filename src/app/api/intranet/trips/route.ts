import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
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
import { getClubTeamNameById } from '@/lib/club-info';
import { FAVB_MATCHES } from '@/lib/favb-data';
import { AFADE_MATCHES } from '@/lib/afade-data';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
  parseMadridDateTimeSafe,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_REGEX = /^\d{2}:\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ASSIGNMENT_ROLES = new Set(['HEAD_COACH', 'ASSISTANT', 'DELEGATE']);
const STAFF_ROLES = ROLES_CATALOG.filter((r) => r.isStaff).map((r) => r.code);
const CONFLICT_THRESHOLD_MS = 150 * 60 * 1000; // 150 minutos (2.5h)

type AssignmentRoleCode = 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE';

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

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
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

function getAllClubMatches() {
  const combined = [
    ...FAVB_MATCHES.map((m) => ({ ...m, association: 'FAVB' as const })),
    ...AFADE_MATCHES.map((m) => ({ ...m, association: 'AFADE' as const })),
  ];
  return combined.filter(
    (m) =>
      !m.homeTeamName.toLowerCase().includes('descansa') &&
      !m.awayTeamName.toLowerCase().includes('descansa')
  );
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

    const allMatches = getAllClubMatches();
    const matchLookup = new Map(allMatches.map((m) => [m.id, m]));

    const [assignmentRows, tripRows, staffUsersRows, staffTeamsRows, teamsRows] =
      await Promise.all([
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

    const teamNameMap = new Map(teamsRows.map((t) => [t.id, t.name]));

    // Calcular conflictos de jornada (< 150 min entre 2+ partidos del mismo técnico el mismo día Madrid)
    const byUserDate = new Map<string, typeof assignmentRows>();
    for (const a of assignmentRows) {
      const key = `${a.user_id}::${a.madrid_date}`;
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
        assignmentRole: AssignmentRoleCode;
      }>;
    }> = [];

    for (const list of Array.from(byUserDate.values())) {
      if (list.length < 2) continue;
      const sorted = [...list].sort(
        (a, b) =>
          new Date(a.starts_at_utc).getTime() - new Date(b.starts_at_utc).getTime()
      );
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          const diffMs = Math.abs(
            new Date(b.starts_at_utc).getTime() - new Date(a.starts_at_utc).getTime()
          );
          if (diffMs < CONFLICT_THRESHOLD_MS) {
            conflictedAssignmentIds.add(a.id);
            conflictedAssignmentIds.add(b.id);
            conflictedMatchIds.add(a.match_id);
            conflictedMatchIds.add(b.match_id);

            const matchA = matchLookup.get(a.match_id);
            const matchB = matchLookup.get(b.match_id);
            conflicts.push({
              id: `${a.id}-${b.id}`,
              userId: a.user_id,
              userName: a.user_name,
              madridDate: a.madrid_date,
              madridDateFormatted: formatMadridDate(a.starts_at_utc),
              diffMinutes: Math.round(diffMs / 60000),
              matches: [a, b].map((item, idx) => {
                const rawM = idx === 0 ? matchA : matchB;
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
                  madridTime: formatMadridTime(item.starts_at_utc),
                  opponent,
                  venueName: rawM?.venueName || 'Pabellón por confirmar',
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

    for (const a of assignmentRows) {
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

    // Filtrar y enriquecer partidos
    const enrichedMatches = allMatches
      .map((m) => {
        const parsedDate = parseMadridDateTimeSafe(m.matchDate);
        const madridDate = formatMadridDateString(parsedDate);
        const madridTime = formatMadridTime(parsedDate);
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
          venueName: m.venueName,
          locality: m.locality || (m.isClubHome ? 'San Pedro Alcántara' : ''),
          googleMapsUrl: m.googleMapsUrl || null,
          matchDateUtc: parsedDate.toISOString(),
          madridDate,
          madridTime,
          madridDateFormatted: formatMadridDate(parsedDate),
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
      })
      .filter((m) => {
        if (!combinedScope.isGlobal && !combinedScope.teamIds.includes(m.teamSeasonId)) {
          return false;
        }
        if (teamIdFilter !== 'ALL' && m.teamSeasonId !== teamIdFilter) {
          return false;
        }
        if (YMD_REGEX.test(fromParam) && m.madridDate < fromParam) return false;
        if (YMD_REGEX.test(toParam) && m.madridDate > toParam) return false;
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
          const raw = matchLookup.get(mid);
          return {
            matchId: mid,
            teamSeasonId: raw?.teamId || '',
            teamName: raw ? getClubTeamNameById(raw.teamId) : mid,
            madridTime: raw ? formatMadridTime(raw.matchDate) : '',
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

    // Devolver también un mapa rápido userId+madridDate -> startsAtUtc para advertir en UI al asignar
    const userScheduleIndex: Record<string, Array<{ matchId: string; madridTime: string; startsAtUtc: string; teamName: string }>> = {};
    for (const a of assignmentRows) {
      const key = `${a.user_id}::${a.madrid_date}`;
      if (!userScheduleIndex[key]) userScheduleIndex[key] = [];
      userScheduleIndex[key].push({
        matchId: a.match_id,
        madridTime: formatMadridTime(a.starts_at_utc),
        startsAtUtc: a.starts_at_utc,
        teamName: teamNameMap.get(a.team_season_id) || getClubTeamNameById(a.team_season_id),
      });
    }

    return NextResponse.json({
      success: true,
      todayMadrid,
      weekendWindow: { from: weekendFrom, to: weekendTo },
      teams: authorizedTeams,
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
    const allMatches = getAllClubMatches();
    const matchById = new Map(allMatches.map((m) => [m.id, m]));

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

      const activeUsers = await queryNeon<{ id: string; name: string }>(
        `SELECT id::text AS id, name FROM intranet_users WHERE id = $1::uuid AND status = 'ACTIVE' LIMIT 1;`,
        [userId]
      );
      if (activeUsers.length === 0) {
        return NextResponse.json(
          { success: false, error: 'El miembro del staff seleccionado no está activo.' },
          { status: 400 }
        );
      }

      const parsedDate = parseMadridDateTimeSafe(match.matchDate);
      const madridDate = formatMadridDateString(parsedDate);
      const startsAtUtc = parsedDate.toISOString();

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
        },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        assignmentId: inserted[0]?.id,
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
        const updated = await queryNeon<{ id: string }>(
          `UPDATE intranet_staff_trips
           SET madrid_date = $2,
               destination_locality = $3,
               venue_name = $4,
               departure_time_madrid = $5,
               meeting_point = $6,
               transport_notes = $7
           WHERE id = $1::uuid
           RETURNING id::text AS id;`,
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
        if (updated.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Expedición no encontrada.' },
            { status: 404 }
          );
        }
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
