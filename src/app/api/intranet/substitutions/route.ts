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
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
  madridLocalToUtcIso,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_REGEX = /^\d{2}:\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STAFF_ROLES = ROLES_CATALOG.filter((r) => r.isStaff).map((r) => r.code);

function getIsoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    const canRequest = can(ctx, 'substitution.request');
    const canAssign = can(ctx, 'substitution.assign');

    if (!canRequest && !canAssign) {
      throw new IntranetForbiddenError(
        'No tienes permiso para acceder al módulo de sustituciones.'
      );
    }

    const assignScope = getAuthorizedTeamScope(ctx, 'substitution.assign');
    const statusFilter = (req.nextUrl.searchParams.get('status') || 'ALL').trim();

    const [subRows, teamsRows, staffUsersRows, staffTeamsRows, slotRows, matchAssignRows] =
      await Promise.all([
        queryNeon<{
          id: string;
          session_id: string | null;
          team_season_id: string;
          team_name: string | null;
          madrid_date: string;
          start_time: string;
          end_time: string;
          absent_user_id: string;
          absent_user_name: string | null;
          substitute_user_id: string | null;
          substitute_user_name: string | null;
          reason: string;
          status: 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
          temp_override_id: string | null;
          override_valid_from: string | null;
          override_valid_to: string | null;
          assigned_by: string | null;
          assigned_by_name: string | null;
          created_at: string;
        }>(
          `SELECT
             sub.id::text AS id,
             sub.session_id::text AS session_id,
             sub.team_season_id,
             ts.name AS team_name,
             sub.madrid_date,
             sub.start_time,
             sub.end_time,
             sub.absent_user_id::text AS absent_user_id,
             u_abs.name AS absent_user_name,
             sub.substitute_user_id::text AS substitute_user_id,
             u_sub.name AS substitute_user_name,
             sub.reason,
             sub.status,
             sub.temp_override_id::text AS temp_override_id,
             ov.valid_from::text AS override_valid_from,
             ov.valid_to::text AS override_valid_to,
             sub.assigned_by::text AS assigned_by,
             u_asg.name AS assigned_by_name,
             sub.created_at::text AS created_at
           FROM intranet_substitutions sub
           LEFT JOIN intranet_team_seasons ts ON ts.id = sub.team_season_id
           LEFT JOIN intranet_users u_abs ON u_abs.id = sub.absent_user_id
           LEFT JOIN intranet_users u_sub ON u_sub.id = sub.substitute_user_id
           LEFT JOIN intranet_users u_asg ON u_asg.id = sub.assigned_by
           LEFT JOIN intranet_permission_overrides ov ON ov.id = sub.temp_override_id
           WHERE (
             $1::boolean = true
             OR sub.absent_user_id = $2::uuid
             OR sub.substitute_user_id = $2::uuid
             OR sub.team_season_id = ANY($3::text[])
           )
           AND ($4::text = 'ALL' OR sub.status = $4)
           ORDER BY
             CASE sub.status WHEN 'OPEN' THEN 0 WHEN 'ASSIGNED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3 END ASC,
             sub.madrid_date DESC,
             sub.start_time ASC,
             sub.created_at DESC
           LIMIT 200;`,
          [
            canAssign && assignScope.isGlobal,
            ctx.user.id,
            canAssign ? assignScope.teamIds : ctx.staffTeamIds,
            statusFilter,
          ]
        ),
        queryNeon<{ id: string; name: string; division: string }>(
          `SELECT id, name, division
           FROM intranet_team_seasons
           WHERE is_active = true
           ORDER BY sort_order ASC, name ASC;`
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
        queryNeon<{
          user_id: string;
          team_season_id: string;
          team_name: string | null;
          staff_function: string;
        }>(
          `SELECT
             ts.user_id::text AS user_id,
             ts.team_season_id,
             t.name AS team_name,
             ts.staff_function
           FROM intranet_team_staff ts
           LEFT JOIN intranet_team_seasons t ON t.id = ts.team_season_id
           WHERE ts.valid_from <= NOW()
             AND (ts.valid_to IS NULL OR ts.valid_to > NOW());`
        ),
        queryNeon<{
          team_season_id: string;
          team_name: string | null;
          weekday: number;
          start_time: string;
          end_time: string;
        }>(
          `SELECT
             sl.team_season_id,
             t.name AS team_name,
             sl.weekday,
             sl.start_time,
             sl.end_time
           FROM intranet_training_slots sl
           LEFT JOIN intranet_team_seasons t ON t.id = sl.team_season_id
           WHERE sl.is_active = true;`
        ),
        queryNeon<{
          user_id: string;
          team_season_id: string;
          team_name: string | null;
          madrid_date: string;
          starts_at_utc: string;
        }>(
          `SELECT
             ma.user_id::text AS user_id,
             ma.team_season_id,
             t.name AS team_name,
             ma.madrid_date,
             ma.starts_at_utc::text AS starts_at_utc
           FROM intranet_match_assignments ma
           LEFT JOIN intranet_team_seasons t ON t.id = ma.team_season_id;`
        ),
      ]);

    const teamNameMap = new Map(teamsRows.map((t) => [t.id, t.name]));

    // Mapear equipos y horarios habituales por entrenador
    const userTeamsMap = new Map<string, Array<{ teamSeasonId: string; teamName: string; fn: string }>>();
    for (const st of staffTeamsRows) {
      const list = userTeamsMap.get(st.user_id) || [];
      list.push({
        teamSeasonId: st.team_season_id,
        teamName: st.team_name || teamNameMap.get(st.team_season_id) || st.team_season_id,
        fn: st.staff_function,
      });
      userTeamsMap.set(st.user_id, list);
    }

    const slotsByTeamMap = new Map<
      string,
      Array<{ weekday: number; startTime: string; endTime: string; teamName: string }>
    >();
    for (const sl of slotRows) {
      const list = slotsByTeamMap.get(sl.team_season_id) || [];
      list.push({
        weekday: sl.weekday,
        startTime: sl.start_time,
        endTime: sl.end_time,
        teamName: sl.team_name || teamNameMap.get(sl.team_season_id) || sl.team_season_id,
      });
      slotsByTeamMap.set(sl.team_season_id, list);
    }

    const matchesByUserDateMap = new Map<
      string,
      Array<{ madridTime: string; teamName: string }>
    >();
    for (const ma of matchAssignRows) {
      const key = `${ma.user_id}::${ma.madrid_date}`;
      const list = matchesByUserDateMap.get(key) || [];
      list.push({
        madridTime: formatMadridTime(ma.starts_at_utc),
        teamName: ma.team_name || teamNameMap.get(ma.team_season_id) || ma.team_season_id,
      });
      matchesByUserDateMap.set(key, list);
    }

    const assignedSubsByUserDateMap = new Map<
      string,
      Array<{ id: string; startTime: string; endTime: string; teamName: string }>
    >();
    for (const s of subRows) {
      if (s.status !== 'ASSIGNED' || !s.substitute_user_id) continue;
      const key = `${s.substitute_user_id}::${s.madrid_date}`;
      const list = assignedSubsByUserDateMap.get(key) || [];
      list.push({
        id: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        teamName: s.team_name || teamNameMap.get(s.team_season_id) || s.team_season_id,
      });
      assignedSubsByUserDateMap.set(key, list);
    }

    const evaluateCoachConflicts = (
      coachId: string,
      madridDate: string,
      startTime: string,
      endTime: string,
      excludeSubId?: string,
      absentUserId?: string
    ): string[] => {
      const conflicts: string[] = [];
      if (absentUserId && coachId === absentUserId) {
        conflicts.push('Es el entrenador ausente');
      }
      const reqStart = timeToMinutes(startTime);
      const reqEnd = timeToMinutes(endTime);
      const weekday = getIsoWeekdayFromYmd(madridDate);

      const coachTeams = userTeamsMap.get(coachId) || [];
      for (const ct of coachTeams) {
        const teamSlots = slotsByTeamMap.get(ct.teamSeasonId) || [];
        for (const sl of teamSlots) {
          if (sl.weekday !== weekday) continue;
          if (
            intervalsOverlap(
              reqStart,
              reqEnd,
              timeToMinutes(sl.startTime),
              timeToMinutes(sl.endTime)
            )
          ) {
            conflicts.push(
              `Entreno habitual ${sl.teamName} (${sl.startTime}-${sl.endTime})`
            );
          }
        }
      }

      const subKey = `${coachId}::${madridDate}`;
      for (const otherSub of assignedSubsByUserDateMap.get(subKey) || []) {
        if (excludeSubId && otherSub.id === excludeSubId) continue;
        if (
          intervalsOverlap(
            reqStart,
            reqEnd,
            timeToMinutes(otherSub.startTime),
            timeToMinutes(otherSub.endTime)
          )
        ) {
          conflicts.push(
            `Otra sustitución ${otherSub.teamName} (${otherSub.startTime}-${otherSub.endTime})`
          );
        }
      }

      for (const ma of matchesByUserDateMap.get(subKey) || []) {
        const matchStart = timeToMinutes(ma.madridTime);
        if (intervalsOverlap(reqStart, reqEnd, matchStart - 30, matchStart + 150)) {
          conflicts.push(`Partido ${ma.teamName} (${ma.madridTime})`);
        }
      }

      return conflicts;
    }

    // Si el frontend consulta disponibilidad para una fecha/hora puntual en el modal directo
    const checkDate = (req.nextUrl.searchParams.get('checkDate') || '').trim();
    const checkStart = (req.nextUrl.searchParams.get('checkStart') || '').trim();
    const checkEnd = (req.nextUrl.searchParams.get('checkEnd') || '').trim();

    const coaches = staffUsersRows.map((u) => {
      const teams = userTeamsMap.get(u.id) || [];
      const weeklySchedule = teams.flatMap((t) =>
        (slotsByTeamMap.get(t.teamSeasonId) || []).map((sl) => ({
          teamSeasonId: t.teamSeasonId,
          teamName: t.teamName,
          weekday: sl.weekday,
          startTime: sl.startTime,
          endTime: sl.endTime,
        }))
      );
      const checkConflicts =
        YMD_REGEX.test(checkDate) &&
        HHMM_REGEX.test(checkStart) &&
        HHMM_REGEX.test(checkEnd) &&
        checkEnd > checkStart
          ? evaluateCoachConflicts(u.id, checkDate, checkStart, checkEnd)
          : [];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        roles: u.role_codes,
        teams,
        weeklySchedule,
        checkConflicts,
      };
    });

    const substitutions = subRows.map((s) => {
      const coachAvailability = coaches.map((c) => {
        const conflicts = evaluateCoachConflicts(
          c.id,
          s.madrid_date,
          s.start_time,
          s.end_time,
          s.id,
          s.absent_user_id
        );
        return {
          coachId: c.id,
          coachName: c.name,
          available: conflicts.length === 0,
          conflicts,
        };
      });

      return {
        id: s.id,
        sessionId: s.session_id,
        teamSeasonId: s.team_season_id,
        teamName: s.team_name || teamNameMap.get(s.team_season_id) || s.team_season_id,
        madridDate: s.madrid_date,
        madridDateFormatted: formatMadridDate(
          madridLocalToUtcIso(s.madrid_date, s.start_time)
        ),
        startTime: s.start_time,
        endTime: s.end_time,
        absentUserId: s.absent_user_id,
        absentUserName: s.absent_user_name || 'Entrenador',
        substituteUserId: s.substitute_user_id,
        substituteUserName: s.substitute_user_name,
        reason: s.reason,
        status: s.status,
        tempOverrideId: s.temp_override_id,
        overrideValidFromMadrid: s.override_valid_from
          ? `${formatMadridDateString(s.override_valid_from)} ${formatMadridTime(
              s.override_valid_from
            )}`
          : null,
        overrideValidToMadrid: s.override_valid_to
          ? `${formatMadridDateString(s.override_valid_to)} ${formatMadridTime(
              s.override_valid_to
            )}`
          : null,
        assignedByName: s.assigned_by_name,
        createdAt: s.created_at,
        canCancel:
          s.status !== 'CANCELLED' &&
          (can(ctx, 'substitution.assign', { teamSeasonId: s.team_season_id }) ||
            (s.absent_user_id === ctx.user.id && s.status === 'OPEN')),
        canAssignHere:
          s.status !== 'CANCELLED' &&
          can(ctx, 'substitution.assign', { teamSeasonId: s.team_season_id }),
        coachAvailability,
      };
    });

    const availableTeams =
      ctx.isPresident || (canAssign && assignScope.isGlobal) || ctx.staffTeamIds.length === 0
        ? teamsRows
        : teamsRows.filter((t) => ctx.staffTeamIds.includes(t.id));

    return NextResponse.json({
      success: true,
      todayMadrid: formatMadridDateString(new Date()),
      availableTeams,
      allTeams: teamsRows,
      coaches,
      substitutions,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Substitutions GET');
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

    if (action === 'request_substitution') {
      assertCan(ctx, 'substitution.request');

      const teamSeasonId = String(body.teamSeasonId || '').trim();
      const madridDate = String(body.madridDate || '').trim();
      const startTime = String(body.startTime || '').trim();
      const endTime = String(body.endTime || '').trim();
      const reason = String(body.reason || '').trim().slice(0, 400);
      const sessionId = body.sessionId ? String(body.sessionId).trim() : null;

      if (!teamSeasonId) {
        return NextResponse.json(
          { success: false, error: 'Selecciona el equipo de la sesión.' },
          { status: 400 }
        );
      }
      if (!YMD_REGEX.test(madridDate)) {
        return NextResponse.json(
          { success: false, error: 'Fecha no válida (YYYY-MM-DD).' },
          { status: 400 }
        );
      }
      if (!HHMM_REGEX.test(startTime) || !HHMM_REGEX.test(endTime) || endTime <= startTime) {
        return NextResponse.json(
          { success: false, error: 'Franja horaria no válida (HH:MM).' },
          { status: 400 }
        );
      }
      if (reason.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Indica el motivo de la sustitución.' },
          { status: 400 }
        );
      }
      if (sessionId && !UUID_REGEX.test(sessionId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de sesión no válido.' },
          { status: 400 }
        );
      }

      if (
        !ctx.isPresident &&
        !can(ctx, 'substitution.assign') &&
        ctx.staffTeamIds.length > 0 &&
        !ctx.staffTeamIds.includes(teamSeasonId)
      ) {
        throw new IntranetForbiddenError(
          'Solo puedes solicitar sustituciones para tus equipos asignados.'
        );
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_substitutions (
           session_id, team_season_id, madrid_date, start_time, end_time,
           absent_user_id, reason, status
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7, 'OPEN')
         RETURNING id::text AS id;`,
        [sessionId, teamSeasonId, madridDate, startTime, endTime, ctx.user.id, reason]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REQUEST_SUBSTITUTION',
        module: 'Sustituciones',
        targetType: 'SUBSTITUTION',
        targetId: inserted[0]?.id || null,
        details: { teamSeasonId, madridDate, startTime, endTime, reason },
        ipAddress,
      });

      return NextResponse.json({ success: true, substitutionId: inserted[0]?.id });
    }

    if (action === 'assign_substitute') {
      const substitutionId = body.substitutionId ? String(body.substitutionId).trim() : null;
      const substituteUserId = String(body.substituteUserId || '').trim();

      if (!UUID_REGEX.test(substituteUserId)) {
        return NextResponse.json(
          { success: false, error: 'Selecciona un entrenador sustituto válido.' },
          { status: 400 }
        );
      }

      const subUsers = await queryNeon<{ id: string; name: string; email: string; status: string }>(
        `SELECT id::text AS id, name, email, status
         FROM intranet_users
         WHERE id = $1::uuid AND status = 'ACTIVE'
         LIMIT 1;`,
        [substituteUserId]
      );
      const substituteUser = subUsers[0];
      if (!substituteUser) {
        return NextResponse.json(
          { success: false, error: 'El entrenador sustituto seleccionado no está activo.' },
          { status: 400 }
        );
      }

      let teamSeasonId = String(body.teamSeasonId || '').trim();
      let madridDate = String(body.madridDate || '').trim();
      let startTime = String(body.startTime || '').trim();
      let endTime = String(body.endTime || '').trim();
      let reason = String(body.reason || 'Asignación directa de cobertura').trim().slice(0, 400);
      let absentUserId = body.absentUserId ? String(body.absentUserId).trim() : ctx.user.id;
      let previousOverrideId: string | null = null;
      let targetSubId = substitutionId;

      if (substitutionId) {
        if (!UUID_REGEX.test(substitutionId)) {
          return NextResponse.json(
            { success: false, error: 'Identificador de sustitución no válido.' },
            { status: 400 }
          );
        }
        const existingRows = await queryNeon<{
          id: string;
          team_season_id: string;
          madrid_date: string;
          start_time: string;
          end_time: string;
          absent_user_id: string;
          reason: string;
          status: string;
          temp_override_id: string | null;
        }>(
          `SELECT id::text AS id, team_season_id, madrid_date, start_time, end_time,
                  absent_user_id::text AS absent_user_id, reason, status,
                  temp_override_id::text AS temp_override_id
           FROM intranet_substitutions
           WHERE id = $1::uuid
           LIMIT 1;`,
          [substitutionId]
        );
        const existing = existingRows[0];
        if (!existing) {
          return NextResponse.json(
            { success: false, error: 'Solicitud de sustitución no encontrada.' },
            { status: 404 }
          );
        }
        if (existing.status === 'CANCELLED') {
          return NextResponse.json(
            { success: false, error: 'No se puede asignar una solicitud cancelada.' },
            { status: 400 }
          );
        }
        teamSeasonId = existing.team_season_id;
        madridDate = existing.madrid_date;
        startTime = existing.start_time;
        endTime = existing.end_time;
        absentUserId = existing.absent_user_id;
        reason = existing.reason;
        previousOverrideId = existing.temp_override_id;
      } else {
        if (!teamSeasonId || !YMD_REGEX.test(madridDate) || !HHMM_REGEX.test(startTime) || !HHMM_REGEX.test(endTime) || endTime <= startTime) {
          return NextResponse.json(
            { success: false, error: 'Datos de equipo, fecha u horario no válidos.' },
            { status: 400 }
          );
        }
        if (!UUID_REGEX.test(absentUserId)) {
          absentUserId = ctx.user.id;
        }
      }

      assertCan(ctx, 'substitution.assign', { teamSeasonId });

      // Revocar override previo si se está reasignando
      if (previousOverrideId) {
        await queryNeon(
          `UPDATE intranet_permission_overrides
           SET valid_to = LEAST(COALESCE(valid_to, NOW()), NOW())
           WHERE id = $1::uuid;`,
          [previousOverrideId]
        );
      }

      // Ventana temporal estricta en Europe/Madrid -> UTC: 2h antes hasta 24h después
      const startUtcIso = madridLocalToUtcIso(madridDate, startTime);
      const endUtcIso = madridLocalToUtcIso(madridDate, endTime);
      const validFromIso = new Date(new Date(startUtcIso).getTime() - 2 * 60 * 60 * 1000).toISOString();
      const validToIso = new Date(new Date(endUtcIso).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const teamRows = await queryNeon<{ name: string }>(
        `SELECT name FROM intranet_team_seasons WHERE id = $1 LIMIT 1;`,
        [teamSeasonId]
      );
      const teamName = teamRows[0]?.name || teamSeasonId;

      const overrideRes = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_permission_overrides (
           user_id, permission_code, effect, scope, team_season_id,
           reason, valid_from, valid_to, granted_by
         ) VALUES (
           $1::uuid, 'attendance.take', 'ALLOW', 'EQUIPO', $2,
           $3, $4::timestamptz, $5::timestamptz, $6::uuid
         )
         RETURNING id::text AS id;`,
        [
          substituteUserId,
          teamSeasonId,
          `Sustitución automática ${teamName} (${madridDate} ${startTime}-${endTime})`,
          validFromIso,
          validToIso,
          ctx.user.id,
        ]
      );
      const tempOverrideId = overrideRes[0].id;

      if (targetSubId) {
        await queryNeon(
          `UPDATE intranet_substitutions
           SET substitute_user_id = $2::uuid,
               status = 'ASSIGNED',
               temp_override_id = $3::uuid,
               assigned_by = $4::uuid
           WHERE id = $1::uuid;`,
          [targetSubId, substituteUserId, tempOverrideId, ctx.user.id]
        );
      } else {
        const createdSub = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_substitutions (
             team_season_id, madrid_date, start_time, end_time,
             absent_user_id, substitute_user_id, reason, status,
             temp_override_id, assigned_by
           ) VALUES (
             $1, $2, $3, $4,
             $5::uuid, $6::uuid, $7, 'ASSIGNED',
             $8::uuid, $9::uuid
           )
           RETURNING id::text AS id;`,
          [
            teamSeasonId,
            madridDate,
            startTime,
            endTime,
            absentUserId,
            substituteUserId,
            reason,
            tempOverrideId,
            ctx.user.id,
          ]
        );
        targetSubId = createdSub[0].id;
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'ASSIGN_SUBSTITUTE',
        module: 'Sustituciones',
        targetType: 'SUBSTITUTION',
        targetId: targetSubId,
        details: {
          teamSeasonId,
          madridDate,
          startTime,
          endTime,
          substituteUserId,
          substituteEmail: substituteUser.email,
          tempOverrideId,
          validFromIso,
          validToIso,
        },
        ipAddress,
      });

      // Aviso por email si SMTP está configurado (fail-safe: no bloquea asignación)
      let emailSent = false;
      try {
        const prettyDate = formatMadridDate(startUtcIso);
        const mailRes = await sendSmtpMail({
          to: substituteUser.email,
          subject: `[CDV San Pedro] Sustitución asignada · ${teamName} (${madridDate})`,
          text: [
            `${CLUB_INFO.name} · Intranet de Staff`,
            ``,
            `Hola ${substituteUser.name},`,
            `Se te ha asignado la cobertura técnica del equipo ${teamName}.`,
            `Fecha: ${prettyDate} (${madridDate})`,
            `Horario: ${startTime} - ${endTime}`,
            `Motivo: ${reason}`,
            ``,
            `El sistema te ha concedido permiso temporal automático de asistencia (attendance.take) para este equipo desde 2h antes hasta 24h después de la sesión.`,
            `Accede desde /club/asistencia para pasar lista.`,
          ].join('\n'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden;">
              <div style="background: #d90429; color: #ffffff; padding: 16px 22px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(CLUB_INFO.name)} · Staff</div>
                <h2 style="margin: 4px 0 0 0; font-size: 18px;">Sustitución técnica asignada</h2>
              </div>
              <div style="padding: 20px 22px; color: #18181b; font-size: 14px; line-height: 1.6;">
                <p>Hola <strong>${escapeHtml(substituteUser.name)}</strong>,</p>
                <p>Se te ha asignado la cobertura del entrenamiento de <strong>${escapeHtml(teamName)}</strong>:</p>
                <ul style="background: #f4f4f5; padding: 12px 18px; border-radius: 8px; list-style: none;">
                  <li><strong>Fecha:</strong> ${escapeHtml(prettyDate)} (${escapeHtml(madridDate)})</li>
                  <li><strong>Horario:</strong> ${escapeHtml(startTime)} – ${escapeHtml(endTime)}</li>
                  <li><strong>Motivo:</strong> ${escapeHtml(reason)}</li>
                </ul>
                <p style="font-size: 13px; color: #3f3f46;">Tu cuenta dispone automáticamente de permiso temporal para pasar lista en <strong>/club/asistencia</strong> (activo desde 2 horas antes hasta 24 horas después de la sesión).</p>
              </div>
            </div>
          `,
        });
        emailSent = mailRes.sent;
      } catch (mailErr) {
        console.warn('[Substitutions] Aviso SMTP no enviado:', mailErr);
      }

      return NextResponse.json({
        success: true,
        substitutionId: targetSubId,
        tempOverrideId,
        emailSent,
      });
    }

    if (action === 'cancel_substitution') {
      const substitutionId = String(body.substitutionId || '').trim();
      if (!UUID_REGEX.test(substitutionId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de sustitución no válido.' },
          { status: 400 }
        );
      }

      const rows = await queryNeon<{
        id: string;
        team_season_id: string;
        absent_user_id: string;
        status: string;
        temp_override_id: string | null;
      }>(
        `SELECT id::text AS id, team_season_id, absent_user_id::text AS absent_user_id,
                status, temp_override_id::text AS temp_override_id
         FROM intranet_substitutions
         WHERE id = $1::uuid
         LIMIT 1;`,
        [substitutionId]
      );
      const sub = rows[0];
      if (!sub) {
        return NextResponse.json(
          { success: false, error: 'Sustitución no encontrada.' },
          { status: 404 }
        );
      }

      const canAssignHere = can(ctx, 'substitution.assign', {
        teamSeasonId: sub.team_season_id,
      });
      const isOwnOpenRequest =
        sub.absent_user_id === ctx.user.id &&
        sub.status === 'OPEN' &&
        can(ctx, 'substitution.request');

      if (!canAssignHere && !isOwnOpenRequest) {
        throw new IntranetForbiddenError(
          'No tienes permiso para cancelar esta sustitución.'
        );
      }

      if (sub.temp_override_id) {
        await queryNeon(
          `UPDATE intranet_permission_overrides
           SET valid_to = LEAST(COALESCE(valid_to, NOW()), NOW())
           WHERE id = $1::uuid;`,
          [sub.temp_override_id]
        );
      }

      await queryNeon(
        `UPDATE intranet_substitutions
         SET status = 'CANCELLED'
         WHERE id = $1::uuid;`,
        [substitutionId]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CANCEL_SUBSTITUTION',
        module: 'Sustituciones',
        targetType: 'SUBSTITUTION',
        targetId: substitutionId,
        details: {
          teamSeasonId: sub.team_season_id,
          revokedOverrideId: sub.temp_override_id,
        },
        ipAddress,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: `Acción no soportada: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Substitutions POST');
  }
}
