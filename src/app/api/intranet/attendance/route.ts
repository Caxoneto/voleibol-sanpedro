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
import {
  ABSENCE_REASONS,
  ATTENDANCE_STATES,
} from '@/lib/intranet/catalog';
import {
  formatMadridDateString,
  formatMadridTime,
  madridLocalToUtcIso,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_REGEX = /^\d{2}:\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ATTENDANCE_STATUSES = new Set(ATTENDANCE_STATES.map((s) => s.code));
const VALID_ABSENCE_REASONS = new Set(ABSENCE_REASONS.map((r) => r.code));

type AttendanceStatusCode =
  | 'PRESENTE'
  | 'RETRASO'
  | 'FALTA_JUSTIFICADA'
  | 'FALTA_INJUSTIFICADA'
  | 'LESIONADO_ASISTE';

type AbsenceReasonCode = 'LESION' | 'ENFERMEDAD' | 'ESTUDIOS' | 'FAMILIAR' | 'OTRO';

function getIsoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
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

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    const canTake = can(ctx, 'attendance.take');
    const canReports = can(ctx, 'attendance.reports');

    if (!canTake && !canReports) {
      throw new IntranetForbiddenError(
        'No tienes permiso para acceder al módulo de asistencia.'
      );
    }

    const { searchParams } = req.nextUrl;
    const mode = (searchParams.get('mode') || 'today').trim();

    if (mode === 'search_guests') {
      if (!canTake && !can(ctx, 'session.manage')) {
        throw new IntranetForbiddenError(
          'No tienes permiso para buscar deportistas invitados.'
        );
      }

      const rawQ = (searchParams.get('q') || '').trim();
      const excludeTeamId = (searchParams.get('excludeTeamId') || '').trim();
      if (rawQ.length < 2) {
        return NextResponse.json({ success: true, athletes: [] });
      }

      const normalizedPattern = `%${rawQ
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')}%`;

      const rows = await queryNeon<{
        id: string;
        first_name: string;
        last_name: string;
        jersey_number: number | null;
        team_season_id: string | null;
        team_name: string | null;
      }>(
        `SELECT DISTINCT ON (a.id)
           a.id,
           a.first_name,
           a.last_name,
           COALESCE(at.dorsal, a.jersey_number) AS jersey_number,
           at.team_season_id,
           ts.name AS team_name
         FROM intranet_athletes a
         LEFT JOIN intranet_athlete_teams at
           ON at.athlete_id = a.id AND at.is_primary = true
         LEFT JOIN intranet_team_seasons ts
           ON ts.id = at.team_season_id
         WHERE a.status NOT IN ('BAJA', 'SHREDDED')
           AND a.is_demo = false
           AND (
             a.full_name_normalized LIKE $1
             OR LOWER(a.first_name || ' ' || a.last_name) LIKE $1
           )
           AND ($2::text = '' OR COALESCE(at.team_season_id, '') <> $2)
         ORDER BY a.id, at.is_primary DESC NULLS LAST
         LIMIT 25;`,
        [normalizedPattern, excludeTeamId]
      );

      return NextResponse.json({
        success: true,
        athletes: rows.map((r) => ({
          id: r.id,
          firstName: r.first_name,
          lastName: r.last_name,
          fullName: `${r.first_name} ${r.last_name}`.trim(),
          dorsal: r.jersey_number,
          teamSeasonId: r.team_season_id,
          teamName: r.team_name || 'Club',
        })),
      });
    }

    if (mode === 'reports') {
      assertCan(ctx, 'attendance.reports');
      const reportsScope = getAuthorizedTeamScope(ctx, 'attendance.reports');

      const todayMadrid = formatMadridDateString(new Date());
      const rawTo = (searchParams.get('to') || todayMadrid).trim();
      const rawFrom = (searchParams.get('from') || shiftMadridDateString(rawTo, -30)).trim();
      const rawTeamId = (searchParams.get('teamId') || 'ALL').trim();
      const thresholdRaw = Number(searchParams.get('alertThreshold') || 3);
      const alertThreshold = Number.isFinite(thresholdRaw)
        ? Math.min(Math.max(1, Math.floor(thresholdRaw)), 30)
        : 3;

      if (!YMD_REGEX.test(rawFrom) || !YMD_REGEX.test(rawTo)) {
        return NextResponse.json(
          { success: false, error: 'Formato de fecha no válido (use YYYY-MM-DD).' },
          { status: 400 }
        );
      }
      if (rawFrom > rawTo) {
        return NextResponse.json(
          { success: false, error: 'La fecha inicial no puede ser posterior a la final.' },
          { status: 400 }
        );
      }

      if (rawTeamId !== 'ALL' && !reportsScope.isGlobal && !reportsScope.teamIds.includes(rawTeamId)) {
        throw new IntranetForbiddenError('No tienes permiso para ver informes de este equipo.');
      }

      const targetTeamIds =
        rawTeamId !== 'ALL'
          ? [rawTeamId]
          : reportsScope.isGlobal
          ? null
          : reportsScope.teamIds;

      if (targetTeamIds && targetTeamIds.length === 0) {
        return NextResponse.json({
          success: true,
          from: rawFrom,
          to: rawTo,
          alertThreshold,
          teams: [],
          summaryByStatus: {
            PRESENTE: 0,
            RETRASO: 0,
            FALTA_JUSTIFICADA: 0,
            FALTA_INJUSTIFICADA: 0,
            LESIONADO_ASISTE: 0,
          },
          totalSessions: 0,
          totalRecords: 0,
          overallAttendanceRate: 0,
          teamStats: [],
          athleteStats: [],
          alerts: [],
        });
      }

      const [teamsRows, sessionRows, recordRows, rosterRows] = await Promise.all([
        queryNeon<{ id: string; name: string; division: string; sort_order: number }>(
          `SELECT id, name, division, sort_order
           FROM intranet_team_seasons
           WHERE is_active = true
             AND ($1::text[] IS NULL OR id = ANY($1::text[]))
           ORDER BY sort_order ASC, name ASC;`,
          [reportsScope.isGlobal ? null : reportsScope.teamIds]
        ),
        queryNeon<{
          id: string;
          team_season_id: string;
          madrid_date: string;
          starts_at_utc: string;
          status: string;
        }>(
          `SELECT id::text AS id, team_season_id, madrid_date, starts_at_utc::text, status
           FROM intranet_training_sessions
           WHERE madrid_date >= $1
             AND madrid_date <= $2
             AND status <> 'CANCELLED'
             AND ($3::text[] IS NULL OR team_season_id = ANY($3::text[]))
           ORDER BY starts_at_utc ASC;`,
          [rawFrom, rawTo, targetTeamIds]
        ),
        queryNeon<{
          session_id: string;
          team_season_id: string;
          madrid_date: string;
          starts_at_utc: string;
          athlete_id: string;
          status: AttendanceStatusCode;
          absence_reason: AbsenceReasonCode | null;
          is_guest: boolean;
          first_name: string;
          last_name: string;
          dorsal: number | null;
        }>(
          `SELECT
             ar.session_id::text AS session_id,
             ts_sess.team_season_id,
             ts_sess.madrid_date,
             ts_sess.starts_at_utc::text,
             ar.athlete_id,
             ar.status,
             ar.absence_reason,
             ar.is_guest,
             a.first_name,
             a.last_name,
             COALESCE(at.dorsal, a.jersey_number) AS dorsal
           FROM intranet_attendance_records ar
           INNER JOIN intranet_training_sessions ts_sess ON ts_sess.id = ar.session_id
           INNER JOIN intranet_athletes a ON a.id = ar.athlete_id
           LEFT JOIN intranet_athlete_teams at
             ON at.athlete_id = a.id AND at.team_season_id = ts_sess.team_season_id
           WHERE ts_sess.madrid_date >= $1
             AND ts_sess.madrid_date <= $2
             AND ts_sess.status <> 'CANCELLED'
             AND a.status <> 'SHREDDED'
             AND a.is_demo = false
             AND ($3::text[] IS NULL OR ts_sess.team_season_id = ANY($3::text[]))
           ORDER BY ts_sess.starts_at_utc ASC;`,
          [rawFrom, rawTo, targetTeamIds]
        ),
        queryNeon<{
          athlete_id: string;
          team_season_id: string;
          first_name: string;
          last_name: string;
          dorsal: number | null;
        }>(
          `SELECT
             a.id AS athlete_id,
             at.team_season_id,
             a.first_name,
             a.last_name,
             COALESCE(at.dorsal, a.jersey_number) AS dorsal
           FROM intranet_athlete_teams at
           INNER JOIN intranet_athletes a ON a.id = at.athlete_id
           WHERE a.status NOT IN ('BAJA', 'SHREDDED')
             AND a.is_demo = false
             AND ($1::text[] IS NULL OR at.team_season_id = ANY($1::text[]))
           ORDER BY COALESCE(at.dorsal, a.jersey_number, 999) ASC, a.last_name ASC;`,
          [targetTeamIds]
        ),
      ]);

      const teamNameMap = new Map(teamsRows.map((t) => [t.id, t.name]));

      const summaryByStatus: Record<AttendanceStatusCode, number> = {
        PRESENTE: 0,
        RETRASO: 0,
        FALTA_JUSTIFICADA: 0,
        FALTA_INJUSTIFICADA: 0,
        LESIONADO_ASISTE: 0,
      };

      const teamAggMap = new Map<
        string,
        {
          teamSeasonId: string;
          teamName: string;
          sessionsCount: number;
          completedSessionsCount: number;
          totalRecords: number;
          counts: Record<AttendanceStatusCode, number>;
        }
      >();

      for (const s of sessionRows) {
        let agg = teamAggMap.get(s.team_season_id);
        if (!agg) {
          agg = {
            teamSeasonId: s.team_season_id,
            teamName: teamNameMap.get(s.team_season_id) || s.team_season_id,
            sessionsCount: 0,
            completedSessionsCount: 0,
            totalRecords: 0,
            counts: {
              PRESENTE: 0,
              RETRASO: 0,
              FALTA_JUSTIFICADA: 0,
              FALTA_INJUSTIFICADA: 0,
              LESIONADO_ASISTE: 0,
            },
          };
          teamAggMap.set(s.team_season_id, agg);
        }
        agg.sessionsCount += 1;
        if (s.status === 'COMPLETED') {
          agg.completedSessionsCount += 1;
        }
      }

      type AthleteAgg = {
        athleteId: string;
        fullName: string;
        teamSeasonId: string;
        teamName: string;
        dorsal: number | null;
        counts: Record<AttendanceStatusCode, number>;
        recordsChrono: Array<{ madridDate: string; startsAtUtc: string; status: AttendanceStatusCode }>;
      };

      const athleteAggMap = new Map<string, AthleteAgg>();

      for (const r of rosterRows) {
        const key = `${r.team_season_id}::${r.athlete_id}`;
        if (!athleteAggMap.has(key)) {
          athleteAggMap.set(key, {
            athleteId: r.athlete_id,
            fullName: `${r.first_name} ${r.last_name}`.trim(),
            teamSeasonId: r.team_season_id,
            teamName: teamNameMap.get(r.team_season_id) || r.team_season_id,
            dorsal: r.dorsal,
            counts: {
              PRESENTE: 0,
              RETRASO: 0,
              FALTA_JUSTIFICADA: 0,
              FALTA_INJUSTIFICADA: 0,
              LESIONADO_ASISTE: 0,
            },
            recordsChrono: [],
          });
        }
      }

      for (const rec of recordRows) {
        if (VALID_ATTENDANCE_STATUSES.has(rec.status)) {
          summaryByStatus[rec.status] += 1;
        }
        const teamAgg = teamAggMap.get(rec.team_season_id);
        if (teamAgg) {
          teamAgg.totalRecords += 1;
          teamAgg.counts[rec.status] += 1;
        }

        const key = `${rec.team_season_id}::${rec.athlete_id}`;
        let aAgg = athleteAggMap.get(key);
        if (!aAgg) {
          aAgg = {
            athleteId: rec.athlete_id,
            fullName: `${rec.first_name} ${rec.last_name}`.trim(),
            teamSeasonId: rec.team_season_id,
            teamName: teamNameMap.get(rec.team_season_id) || rec.team_season_id,
            dorsal: rec.dorsal,
            counts: {
              PRESENTE: 0,
              RETRASO: 0,
              FALTA_JUSTIFICADA: 0,
              FALTA_INJUSTIFICADA: 0,
              LESIONADO_ASISTE: 0,
            },
            recordsChrono: [],
          };
          athleteAggMap.set(key, aAgg);
        }
        aAgg.counts[rec.status] += 1;
        aAgg.recordsChrono.push({
          madridDate: rec.madrid_date,
          startsAtUtc: rec.starts_at_utc,
          status: rec.status,
        });
      }

      const teamStats = Array.from(teamAggMap.values()).map((t) => {
        const attended =
          t.counts.PRESENTE + t.counts.RETRASO + t.counts.LESIONADO_ASISTE;
        const attendanceRate =
          t.totalRecords > 0 ? Math.round((attended / t.totalRecords) * 1000) / 10 : 0;
        return {
          teamSeasonId: t.teamSeasonId,
          teamName: t.teamName,
          sessionsCount: t.sessionsCount,
          completedSessionsCount: t.completedSessionsCount,
          totalRecords: t.totalRecords,
          presentCount: t.counts.PRESENTE,
          lateCount: t.counts.RETRASO,
          justifiedAbsenceCount: t.counts.FALTA_JUSTIFICADA,
          unjustifiedAbsenceCount: t.counts.FALTA_INJUSTIFICADA,
          injuredPresentCount: t.counts.LESIONADO_ASISTE,
          attendanceRate,
        };
      });

      const athleteStats = Array.from(athleteAggMap.values())
        .map((a) => {
          const total =
            a.counts.PRESENTE +
            a.counts.RETRASO +
            a.counts.FALTA_JUSTIFICADA +
            a.counts.FALTA_INJUSTIFICADA +
            a.counts.LESIONADO_ASISTE;
          const attended =
            a.counts.PRESENTE + a.counts.RETRASO + a.counts.LESIONADO_ASISTE;
          const attendanceRate = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

          // Calcular racha actual (desde la última sesión hacia atrás) y máxima de faltas injustificadas
          const sorted = [...a.recordsChrono].sort(
            (x, y) => new Date(x.startsAtUtc).getTime() - new Date(y.startsAtUtc).getTime()
          );
          let maxConsecutiveUnjustified = 0;
          let running = 0;
          for (const item of sorted) {
            if (item.status === 'FALTA_INJUSTIFICADA') {
              running += 1;
              if (running > maxConsecutiveUnjustified) maxConsecutiveUnjustified = running;
            } else {
              running = 0;
            }
          }
          let currentConsecutiveUnjustified = 0;
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].status === 'FALTA_INJUSTIFICADA') {
              currentConsecutiveUnjustified += 1;
            } else {
              break;
            }
          }

          const hasAlert =
            a.counts.FALTA_INJUSTIFICADA >= alertThreshold ||
            currentConsecutiveUnjustified >= alertThreshold ||
            maxConsecutiveUnjustified >= alertThreshold;

          return {
            athleteId: a.athleteId,
            fullName: a.fullName,
            teamSeasonId: a.teamSeasonId,
            teamName: a.teamName,
            dorsal: a.dorsal,
            totalRecords: total,
            present: a.counts.PRESENTE,
            late: a.counts.RETRASO,
            justified: a.counts.FALTA_JUSTIFICADA,
            unjustified: a.counts.FALTA_INJUSTIFICADA,
            injured: a.counts.LESIONADO_ASISTE,
            attendanceRate,
            currentConsecutiveUnjustified,
            maxConsecutiveUnjustified,
            hasAlert,
          };
        })
        .sort((x, y) => {
          if (x.hasAlert !== y.hasAlert) return x.hasAlert ? -1 : 1;
          if (y.unjustified !== x.unjustified) return y.unjustified - x.unjustified;
          return x.attendanceRate - y.attendanceRate;
        });

      const alerts = athleteStats
        .filter((a) => a.hasAlert)
        .map((a) => ({
          athleteId: a.athleteId,
          fullName: a.fullName,
          teamSeasonId: a.teamSeasonId,
          teamName: a.teamName,
          dorsal: a.dorsal,
          unjustified: a.unjustified,
          currentConsecutiveUnjustified: a.currentConsecutiveUnjustified,
          maxConsecutiveUnjustified: a.maxConsecutiveUnjustified,
          attendanceRate: a.attendanceRate,
          reasonText:
            a.currentConsecutiveUnjustified >= alertThreshold
              ? `${a.currentConsecutiveUnjustified} faltas injustificadas consecutivas`
              : a.maxConsecutiveUnjustified >= alertThreshold
              ? `${a.maxConsecutiveUnjustified} faltas seguidas en el periodo (${a.unjustified} totales)`
              : `${a.unjustified} faltas injustificadas acumuladas`,
        }))
        .sort(
          (x, y) =>
            y.currentConsecutiveUnjustified - x.currentConsecutiveUnjustified ||
            y.unjustified - x.unjustified
        );

      const totalRecords = recordRows.length;
      const totalAttended =
        summaryByStatus.PRESENTE +
        summaryByStatus.RETRASO +
        summaryByStatus.LESIONADO_ASISTE;
      const overallAttendanceRate =
        totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 1000) / 10 : 0;

      return NextResponse.json({
        success: true,
        from: rawFrom,
        to: rawTo,
        alertThreshold,
        teams: teamsRows,
        summaryByStatus,
        totalSessions: sessionRows.length,
        totalRecords,
        overallAttendanceRate,
        teamStats,
        athleteStats,
        alerts,
      });
    }

    // Mode === 'today'
    const takeScope = getAuthorizedTeamScope(ctx, 'attendance.take');
    const reportsScope = getAuthorizedTeamScope(ctx, 'attendance.reports');
    const combinedScope = mergeAuthorizedScopes(takeScope, reportsScope);

    const dateStr = (searchParams.get('date') || formatMadridDateString(new Date())).trim();
    if (!YMD_REGEX.test(dateStr)) {
      return NextResponse.json(
        { success: false, error: 'Parámetro date inválido (esperado YYYY-MM-DD).' },
        { status: 400 }
      );
    }
    const weekday = getIsoWeekdayFromYmd(dateStr);

    if (!combinedScope.isGlobal && combinedScope.teamIds.length === 0) {
      return NextResponse.json({
        success: true,
        date: dateStr,
        weekday,
        teams: [],
        sessions: [],
        slots: [],
        rostersByTeam: {},
        venuesAndCourts: [],
      });
    }

    const scopeTeamParam = combinedScope.isGlobal ? null : combinedScope.teamIds;

    const [teamsRows, sessionRows, slotRows, rosterRows, courtsRows] = await Promise.all([
      queryNeon<{ id: string; name: string; division: string; association: string }>(
        `SELECT id, name, division, association
         FROM intranet_team_seasons
         WHERE is_active = true
           AND ($1::text[] IS NULL OR id = ANY($1::text[]))
         ORDER BY sort_order ASC, name ASC;`,
        [scopeTeamParam]
      ),
      queryNeon<{
        id: string;
        team_season_id: string;
        slot_id: string | null;
        court_id: string | null;
        starts_at_utc: string;
        ends_at_utc: string;
        madrid_date: string;
        status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
        cancellation_reason: string | null;
        notes: string | null;
        court_name: string | null;
        venue_name: string | null;
      }>(
        `SELECT
           s.id::text AS id,
           s.team_season_id,
           s.slot_id::text AS slot_id,
           s.court_id,
           s.starts_at_utc::text,
           s.ends_at_utc::text,
           s.madrid_date,
           s.status,
           s.cancellation_reason,
           s.notes,
           c.name AS court_name,
           v.name AS venue_name
         FROM intranet_training_sessions s
         LEFT JOIN intranet_courts c ON c.id = s.court_id
         LEFT JOIN intranet_venues v ON v.id = c.venue_id
         WHERE s.madrid_date = $1
           AND ($2::text[] IS NULL OR s.team_season_id = ANY($2::text[]))
         ORDER BY s.starts_at_utc ASC;`,
        [dateStr, scopeTeamParam]
      ),
      queryNeon<{
        id: string;
        team_season_id: string;
        court_id: string;
        weekday: number;
        start_time: string;
        end_time: string;
        notes: string | null;
        court_name: string | null;
        venue_name: string | null;
      }>(
        `SELECT
           sl.id::text AS id,
           sl.team_season_id,
           sl.court_id,
           sl.weekday,
           sl.start_time,
           sl.end_time,
           sl.notes,
           c.name AS court_name,
           v.name AS venue_name
         FROM intranet_training_slots sl
         LEFT JOIN intranet_courts c ON c.id = sl.court_id
         LEFT JOIN intranet_venues v ON v.id = c.venue_id
         WHERE sl.weekday = $1
           AND sl.is_active = true
           AND ($2::text[] IS NULL OR sl.team_season_id = ANY($2::text[]))
         ORDER BY sl.start_time ASC;`,
        [weekday, scopeTeamParam]
      ),
      queryNeon<{
        athlete_id: string;
        team_season_id: string;
        first_name: string;
        last_name: string;
        dorsal: number | null;
        position: string | null;
        is_primary: boolean;
      }>(
        `SELECT
           a.id AS athlete_id,
           at.team_season_id,
           a.first_name,
           a.last_name,
           COALESCE(at.dorsal, a.jersey_number) AS dorsal,
           at.position,
           at.is_primary
         FROM intranet_athlete_teams at
         INNER JOIN intranet_athletes a ON a.id = at.athlete_id
         WHERE a.status NOT IN ('BAJA', 'SHREDDED')
           AND a.is_demo = false
           AND ($1::text[] IS NULL OR at.team_season_id = ANY($1::text[]))
         ORDER BY COALESCE(at.dorsal, a.jersey_number, 999) ASC, a.last_name ASC, a.first_name ASC;`,
        [scopeTeamParam]
      ),
      queryNeon<{
        court_id: string;
        court_name: string;
        venue_id: string;
        venue_name: string;
      }>(
        `SELECT
           c.id AS court_id,
           c.name AS court_name,
           v.id AS venue_id,
           v.name AS venue_name
         FROM intranet_courts c
         INNER JOIN intranet_venues v ON v.id = c.venue_id
         WHERE c.is_active = true AND v.is_active = true
         ORDER BY v.name ASC, c.name ASC;`
      ),
    ]);

    const sessionIds = sessionRows.map((s) => s.id);
    const recordsBySession: Record<
      string,
      Array<{
        athleteId: string;
        firstName: string;
        lastName: string;
        fullName: string;
        dorsal: number | null;
        status: AttendanceStatusCode;
        absenceReason: AbsenceReasonCode | null;
        isGuest: boolean;
        notes: string | null;
        updatedAt: string;
      }>
    > = {};

    if (sessionIds.length > 0) {
      const recRows = await queryNeon<{
        session_id: string;
        athlete_id: string;
        status: AttendanceStatusCode;
        absence_reason: AbsenceReasonCode | null;
        is_guest: boolean;
        notes: string | null;
        updated_at: string;
        first_name: string;
        last_name: string;
        dorsal: number | null;
      }>(
        `SELECT
           ar.session_id::text AS session_id,
           ar.athlete_id,
           ar.status,
           ar.absence_reason,
           ar.is_guest,
           ar.notes,
           ar.updated_at::text,
           a.first_name,
           a.last_name,
           COALESCE(at.dorsal, a.jersey_number) AS dorsal
         FROM intranet_attendance_records ar
         INNER JOIN intranet_training_sessions s ON s.id = ar.session_id
         INNER JOIN intranet_athletes a ON a.id = ar.athlete_id
         LEFT JOIN intranet_athlete_teams at
           ON at.athlete_id = a.id AND at.team_season_id = s.team_season_id
         WHERE ar.session_id = ANY($1::uuid[])
           AND a.status <> 'SHREDDED'
         ORDER BY ar.is_guest ASC, COALESCE(at.dorsal, a.jersey_number, 999) ASC, a.last_name ASC;`,
        [sessionIds]
      );

      for (const r of recRows) {
        if (!recordsBySession[r.session_id]) recordsBySession[r.session_id] = [];
        recordsBySession[r.session_id].push({
          athleteId: r.athlete_id,
          firstName: r.first_name,
          lastName: r.last_name,
          fullName: `${r.first_name} ${r.last_name}`.trim(),
          dorsal: r.dorsal,
          status: r.status,
          absenceReason: r.absence_reason,
          isGuest: r.is_guest,
          notes: r.notes,
          updatedAt: r.updated_at,
        });
      }
    }

    const teamNameMap = new Map(teamsRows.map((t) => [t.id, t.name]));

    const rostersByTeam: Record<
      string,
      Array<{
        athleteId: string;
        firstName: string;
        lastName: string;
        fullName: string;
        dorsal: number | null;
        position: string | null;
        isPrimary: boolean;
      }>
    > = {};

    for (const r of rosterRows) {
      if (!rostersByTeam[r.team_season_id]) rostersByTeam[r.team_season_id] = [];
      rostersByTeam[r.team_season_id].push({
        athleteId: r.athlete_id,
        firstName: r.first_name,
        lastName: r.last_name,
        fullName: `${r.first_name} ${r.last_name}`.trim(),
        dorsal: r.dorsal,
        position: r.position,
        isPrimary: r.is_primary,
      });
    }

    const nowMs = Date.now();
    const sessions = sessionRows.map((s) => {
      const endsMs = new Date(s.ends_at_utc).getTime();
      const isOver48h = Number.isFinite(endsMs) && nowMs - endsMs > 48 * 60 * 60 * 1000;
      const canTakeTeam = can(ctx, 'attendance.take', { teamSeasonId: s.team_season_id });
      const canEditPastTeam = can(ctx, 'attendance.edit_past', {
        teamSeasonId: s.team_season_id,
      });
      const canManageTeam = can(ctx, 'session.manage', { teamSeasonId: s.team_season_id });
      return {
        id: s.id,
        teamSeasonId: s.team_season_id,
        teamName: teamNameMap.get(s.team_season_id) || s.team_season_id,
        slotId: s.slot_id,
        courtId: s.court_id,
        courtName: s.court_name,
        venueName: s.venue_name,
        madridDate: s.madrid_date,
        startsAtUtc: s.starts_at_utc,
        endsAtUtc: s.ends_at_utc,
        startTimeMadrid: formatMadridTime(s.starts_at_utc),
        endTimeMadrid: formatMadridTime(s.ends_at_utc),
        status: s.status,
        cancellationReason: s.cancellation_reason,
        notes: s.notes,
        isOver48h,
        canTake: canTakeTeam && (!isOver48h || canEditPastTeam),
        canManageSession: canManageTeam,
        records: recordsBySession[s.id] || [],
      };
    });

    const slots = slotRows.map((sl) => ({
      id: sl.id,
      teamSeasonId: sl.team_season_id,
      teamName: teamNameMap.get(sl.team_season_id) || sl.team_season_id,
      courtId: sl.court_id,
      courtName: sl.court_name,
      venueName: sl.venue_name,
      weekday: sl.weekday,
      startTime: sl.start_time,
      endTime: sl.end_time,
      notes: sl.notes,
      canOpen:
        can(ctx, 'attendance.take', { teamSeasonId: sl.team_season_id }) ||
        can(ctx, 'session.manage', { teamSeasonId: sl.team_season_id }),
      existingSessionId:
        sessions.find(
          (sess) =>
            sess.slotId === sl.id ||
            (sess.teamSeasonId === sl.team_season_id && sess.startTimeMadrid === sl.start_time)
        )?.id || null,
    }));

    return NextResponse.json({
      success: true,
      date: dateStr,
      weekday,
      teams: teamsRows.map((t) => ({
        ...t,
        canTake: can(ctx, 'attendance.take', { teamSeasonId: t.id }),
        canManageSession: can(ctx, 'session.manage', { teamSeasonId: t.id }),
      })),
      sessions,
      slots,
      rostersByTeam,
      venuesAndCourts: courtsRows.map((c) => ({
        courtId: c.court_id,
        courtName: c.court_name,
        venueId: c.venue_id,
        venueName: c.venue_name,
        label: `${c.venue_name} · ${c.court_name}`,
      })),
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Attendance GET');
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

    if (action === 'open_or_create_session') {
      let teamSeasonId = String(body.teamSeasonId || '').trim();
      const madridDate = String(body.madridDate || formatMadridDateString(new Date())).trim();
      const slotId = body.slotId ? String(body.slotId).trim() : null;
      let courtId = body.courtId ? String(body.courtId).trim() : null;
      let startTime = body.startTime ? String(body.startTime).trim() : '';
      let endTime = body.endTime ? String(body.endTime).trim() : '';
      const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;

      if (!YMD_REGEX.test(madridDate)) {
        return NextResponse.json(
          { success: false, error: 'Fecha Madrid no válida (use YYYY-MM-DD).' },
          { status: 400 }
        );
      }

      if (slotId) {
        if (!UUID_REGEX.test(slotId)) {
          return NextResponse.json(
            { success: false, error: 'Identificador de franja no válido.' },
            { status: 400 }
          );
        }
        const slotRows = await queryNeon<{
          team_season_id: string;
          court_id: string;
          start_time: string;
          end_time: string;
        }>(
          `SELECT team_season_id, court_id, start_time, end_time
           FROM intranet_training_slots
           WHERE id = $1::uuid AND is_active = true
           LIMIT 1;`,
          [slotId]
        );
        if (slotRows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Franja horaria no encontrada o inactiva.' },
            { status: 400 }
          );
        }
        teamSeasonId = slotRows[0].team_season_id;
        courtId = courtId || slotRows[0].court_id;
        startTime = startTime || slotRows[0].start_time;
        endTime = endTime || slotRows[0].end_time;
      }

      if (!teamSeasonId) {
        return NextResponse.json(
          { success: false, error: 'Equipo obligatorio.' },
          { status: 400 }
        );
      }

      if (
        !can(ctx, 'attendance.take', { teamSeasonId }) &&
        !can(ctx, 'session.manage', { teamSeasonId })
      ) {
        throw new IntranetForbiddenError(
          'No tienes permiso para abrir sesiones de asistencia en este equipo.'
        );
      }

      if (!HHMM_REGEX.test(startTime) || !HHMM_REGEX.test(endTime) || endTime <= startTime) {
        return NextResponse.json(
          {
            success: false,
            error: 'Horario de sesión no válido (HH:MM, la hora de fin debe ser posterior).',
          },
          { status: 400 }
        );
      }

      const startsAtUtc = madridLocalToUtcIso(madridDate, startTime);
      const endsAtUtc = madridLocalToUtcIso(madridDate, endTime);

      const upserted = await queryNeon<{
        id: string;
        team_season_id: string;
        slot_id: string | null;
        court_id: string | null;
        starts_at_utc: string;
        ends_at_utc: string;
        madrid_date: string;
        status: string;
        notes: string | null;
      }>(
        `INSERT INTO intranet_training_sessions (
           team_season_id, slot_id, court_id, starts_at_utc, ends_at_utc,
           madrid_date, status, notes, created_by
         ) VALUES ($1, $2::uuid, $3, $4::timestamptz, $5::timestamptz, $6, 'SCHEDULED', $7, $8::uuid)
         ON CONFLICT (team_season_id, madrid_date, starts_at_utc) DO UPDATE SET
           slot_id = COALESCE(intranet_training_sessions.slot_id, EXCLUDED.slot_id),
           court_id = COALESCE(intranet_training_sessions.court_id, EXCLUDED.court_id),
           notes = COALESCE(EXCLUDED.notes, intranet_training_sessions.notes)
         RETURNING id::text AS id, team_season_id, slot_id::text AS slot_id, court_id,
                   starts_at_utc::text, ends_at_utc::text, madrid_date, status, notes;`,
        [
          teamSeasonId,
          slotId,
          courtId,
          startsAtUtc,
          endsAtUtc,
          madridDate,
          notes,
          ctx.user.id,
        ]
      );

      const sess = upserted[0];
      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'OPEN_TRAINING_SESSION',
        module: 'Asistencia',
        targetType: 'TRAINING_SESSION',
        targetId: sess.id,
        details: { teamSeasonId, madridDate, startTime, endTime, slotId, courtId },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        session: {
          id: sess.id,
          teamSeasonId: sess.team_season_id,
          slotId: sess.slot_id,
          courtId: sess.court_id,
          madridDate: sess.madrid_date,
          startsAtUtc: sess.starts_at_utc,
          endsAtUtc: sess.ends_at_utc,
          startTimeMadrid: formatMadridTime(sess.starts_at_utc),
          endTimeMadrid: formatMadridTime(sess.ends_at_utc),
          status: sess.status,
          notes: sess.notes,
        },
      });
    }

    if (action === 'save_attendance') {
      const sessionId = String(body.sessionId || '').trim();
      const rawRecords = Array.isArray(body.records) ? body.records : [];

      if (!UUID_REGEX.test(sessionId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de sesión no válido.' },
          { status: 400 }
        );
      }
      if (rawRecords.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Debes incluir al menos un registro de asistencia.' },
          { status: 400 }
        );
      }

      const sessRows = await queryNeon<{
        id: string;
        team_season_id: string;
        madrid_date: string;
        ends_at_utc: string;
        status: string;
      }>(
        `SELECT id::text AS id, team_season_id, madrid_date, ends_at_utc::text, status
         FROM intranet_training_sessions
         WHERE id = $1::uuid
         LIMIT 1;`,
        [sessionId]
      );

      const session = sessRows[0];
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Sesión de entrenamiento no encontrada.' },
          { status: 404 }
        );
      }
      if (session.status === 'CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'No se puede guardar asistencia de una sesión cancelada.' },
          { status: 400 }
        );
      }

      assertCan(ctx, 'attendance.take', { teamSeasonId: session.team_season_id });

      const endsMs = new Date(session.ends_at_utc).getTime();
      if (Number.isFinite(endsMs) && Date.now() - endsMs > 48 * 60 * 60 * 1000) {
        assertCan(ctx, 'attendance.edit_past', { teamSeasonId: session.team_season_id });
      }

      const normalizedRecords: Array<{
        athleteId: string;
        status: AttendanceStatusCode;
        absenceReason: AbsenceReasonCode | null;
        isGuest: boolean;
        notes: string | null;
      }> = [];

      const seenAthletes = new Set<string>();
      for (const item of rawRecords) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as Record<string, unknown>;
        const athleteId = String(rec.athleteId || '').trim();
        const status = String(rec.status || '').trim() as AttendanceStatusCode;
        if (!athleteId || seenAthletes.has(athleteId)) continue;
        if (!VALID_ATTENDANCE_STATUSES.has(status)) {
          return NextResponse.json(
            { success: false, error: `Estado de asistencia no válido: ${status}` },
            { status: 400 }
          );
        }

        let absenceReason: AbsenceReasonCode | null = null;
        if (
          (status === 'FALTA_JUSTIFICADA' || status === 'FALTA_INJUSTIFICADA') &&
          rec.absenceReason
        ) {
          const reasonCandidate = String(rec.absenceReason).trim() as AbsenceReasonCode;
          if (!VALID_ABSENCE_REASONS.has(reasonCandidate)) {
            return NextResponse.json(
              { success: false, error: `Motivo de ausencia no válido: ${reasonCandidate}` },
              { status: 400 }
            );
          }
          absenceReason = reasonCandidate;
        }

        seenAthletes.add(athleteId);
        normalizedRecords.push({
          athleteId,
          status,
          absenceReason,
          isGuest: Boolean(rec.isGuest),
          notes: rec.notes ? String(rec.notes).trim().slice(0, 300) : null,
        });
      }

      if (normalizedRecords.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontraron registros válidos para guardar.' },
          { status: 400 }
        );
      }

      // Verificar que todos los deportistas existen y no están SHREDDED
      const athleteIds = normalizedRecords.map((r) => r.athleteId);
      const validAthletes = await queryNeon<{ id: string }>(
        `SELECT id FROM intranet_athletes WHERE id = ANY($1::text[]) AND status <> 'SHREDDED';`,
        [athleteIds]
      );
      const validSet = new Set(validAthletes.map((a) => a.id));
      const filteredRecords = normalizedRecords.filter((r) => validSet.has(r.athleteId));

      if (filteredRecords.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Ninguno de los deportistas indicados es válido.' },
          { status: 400 }
        );
      }

      await queryNeon(
        `INSERT INTO intranet_attendance_records (
           session_id, athlete_id, status, absence_reason, is_guest, notes, marked_by, updated_at
         )
         SELECT
           $1::uuid,
           u.athlete_id,
           u.status,
           u.absence_reason,
           u.is_guest,
           u.notes,
           $7::uuid,
           NOW()
         FROM UNNEST(
           $2::text[],
           $3::text[],
           $4::text[],
           $5::boolean[],
           $6::text[]
         ) AS u(athlete_id, status, absence_reason, is_guest, notes)
         ON CONFLICT (session_id, athlete_id) DO UPDATE SET
           status = EXCLUDED.status,
           absence_reason = EXCLUDED.absence_reason,
           is_guest = EXCLUDED.is_guest,
           notes = EXCLUDED.notes,
           marked_by = EXCLUDED.marked_by,
           updated_at = NOW();`,
        [
          sessionId,
          filteredRecords.map((r) => r.athleteId),
          filteredRecords.map((r) => r.status),
          filteredRecords.map((r) => r.absenceReason),
          filteredRecords.map((r) => r.isGuest),
          filteredRecords.map((r) => r.notes),
          ctx.user.id,
        ]
      );

      await queryNeon(
        `UPDATE intranet_training_sessions
         SET status = 'COMPLETED'
         WHERE id = $1::uuid AND status = 'SCHEDULED';`,
        [sessionId]
      );

      const statusBreakdown: Record<string, number> = {};
      for (const r of filteredRecords) {
        statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'SAVE_ATTENDANCE',
        module: 'Asistencia',
        targetType: 'TRAINING_SESSION',
        targetId: sessionId,
        details: {
          teamSeasonId: session.team_season_id,
          madridDate: session.madrid_date,
          savedCount: filteredRecords.length,
          statusBreakdown,
        },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        sessionId,
        savedCount: filteredRecords.length,
        statusBreakdown,
      });
    }

    if (action === 'cancel_session') {
      const sessionId = String(body.sessionId || '').trim();
      const cancellationReason = String(body.cancellationReason || '').trim().slice(0, 300);
      if (!UUID_REGEX.test(sessionId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de sesión no válido.' },
          { status: 400 }
        );
      }
      if (!cancellationReason) {
        return NextResponse.json(
          { success: false, error: 'Indica el motivo de cancelación de la sesión.' },
          { status: 400 }
        );
      }

      const sessRows = await queryNeon<{
        id: string;
        team_season_id: string;
        madrid_date: string;
      }>(
        `SELECT id::text AS id, team_season_id, madrid_date
         FROM intranet_training_sessions
         WHERE id = $1::uuid
         LIMIT 1;`,
        [sessionId]
      );
      const session = sessRows[0];
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Sesión no encontrada.' },
          { status: 404 }
        );
      }

      assertCan(ctx, 'session.manage', { teamSeasonId: session.team_season_id });

      await queryNeon(
        `UPDATE intranet_training_sessions
         SET status = 'CANCELLED', cancellation_reason = $2
         WHERE id = $1::uuid;`,
        [sessionId, cancellationReason]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CANCEL_TRAINING_SESSION',
        module: 'Asistencia',
        targetType: 'TRAINING_SESSION',
        targetId: sessionId,
        details: {
          teamSeasonId: session.team_season_id,
          madridDate: session.madrid_date,
          cancellationReason,
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
    return handleIntranetApiError(err, 'Intranet Attendance POST');
  }
}
