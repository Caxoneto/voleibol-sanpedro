import { queryNeon } from '@/lib/streaming-store';
import {
  formatDisplayDate,
  formatMadridDateString,
  formatMadridTime,
  madridLocalToUtcIso,
} from '@/lib/date-utils';
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { getPublicBaseUrl } from '@/lib/intranet/auth';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';

const REMINDER_MIN_DELAY_MINUTES = 15;
const REMINDER_MAX_WINDOW_MINUTES = 240;
const AUTO_CHECK_THROTTLE_MS = 60_000;

const SIMULATED_PLACEHOLDER_DOMAINS = [
  '@voleibolsanpedro.es',
  '@example.com',
  '@test.local',
  '@localhost',
  '@invalid',
];

let lastAutoCheckAtMs = 0;
let inFlightRemindersCheck: Promise<AttendanceRemindersCheckResult> | null = null;

export interface AttendanceReminderDetail {
  teamSeasonId: string;
  teamName: string;
  startTime: string;
  coachEmail: string | null;
  outcome: 'SENT' | 'ALREADY_SENT' | 'NO_COACH' | 'FAILED';
  simulated?: boolean;
  error?: string;
}

export interface AttendanceRemindersCheckResult {
  success: true;
  throttled?: boolean;
  madridDate: string;
  madridTime: string;
  checkedCount: number;
  sentCount: number;
  simulatedCount: number;
  skippedAlreadySentCount: number;
  skippedNoCoachCount: number;
  failedCount: number;
  warning?: string;
  details: AttendanceReminderDetail[];
}

export interface RunAttendanceRemindersOptions {
  actorUserId?: string | null;
  actorEmail?: string;
  targetTeamIds?: string[] | null;
  clientIp?: string | null;
  viaCron?: boolean;
  respectThrottle?: boolean;
}

function getIsoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSlotClosedOnDate(
  slot: { venue_id: string; court_id: string; start_time: string; end_time: string },
  madridDate: string,
  closures: Array<{
    venue_id: string;
    court_id: string | null;
    madrid_date: string;
    start_time: string | null;
    end_time: string | null;
  }>
): boolean {
  const slotS = timeToMinutes(slot.start_time);
  const slotE = timeToMinutes(slot.end_time);
  return closures.some((cl) => {
    if (cl.madrid_date !== madridDate) return false;
    if (cl.venue_id !== slot.venue_id) return false;
    if (cl.court_id && cl.court_id !== slot.court_id) return false;
    if (cl.start_time && cl.end_time) {
      return intervalsOverlap(
        slotS,
        slotE,
        timeToMinutes(cl.start_time),
        timeToMinutes(cl.end_time)
      );
    }
    return true;
  });
}

/**
 * Impide enviar correos SMTP reales durante pruebas locales/preview o hacia cuentas internas
 * placeholder mientras no estén activos los correos reales definitivos en producción.
 */
export function isSafeSimulatedRecipient(email: string): boolean {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm || !norm.includes('@')) return true;
  if (SIMULATED_PLACEHOLDER_DOMAINS.some((domain) => norm.endsWith(domain))) {
    return true;
  }
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  if (process.env.CONTEXT && process.env.CONTEXT !== 'production') {
    return true;
  }
  if (
    process.env.ATTENDANCE_REMINDERS_LIVE_SMTP !== 'true' &&
    norm === CLUB_INFO.contactEmail.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

async function executeAttendanceRemindersCheck(
  options: RunAttendanceRemindersOptions = {}
): Promise<AttendanceRemindersCheckResult> {
  await ensureIntranetSeeded();

  const now = new Date();
  const nowMs = now.getTime();
  const todayMadrid = formatMadridDateString(now);
  const currentTimeMadrid = formatMadridTime(now);
  const todayWeekday = getIsoWeekdayFromYmd(todayMadrid);

  const targetTeamIds =
    options.targetTeamIds && options.targetTeamIds.length > 0 ? options.targetTeamIds : null;

  if (options.targetTeamIds && options.targetTeamIds.length === 0) {
    return {
      success: true,
      madridDate: todayMadrid,
      madridTime: currentTimeMadrid,
      checkedCount: 0,
      sentCount: 0,
      simulatedCount: 0,
      skippedAlreadySentCount: 0,
      skippedNoCoachCount: 0,
      failedCount: 0,
      details: [],
    };
  }

  const [slotRows, closureRows, sessionRows, subRows, staffRows, existingReminders] =
    await Promise.all([
      queryNeon<{
        id: string;
        team_season_id: string;
        team_name: string;
        court_id: string;
        venue_id: string;
        court_name: string | null;
        venue_name: string | null;
        start_time: string;
        end_time: string;
      }>(
        `SELECT
           sl.id::text AS id,
           sl.team_season_id,
           t.name AS team_name,
           sl.court_id,
           c.venue_id,
           c.name AS court_name,
           v.name AS venue_name,
           sl.start_time,
           sl.end_time
         FROM intranet_training_slots sl
         INNER JOIN intranet_team_seasons t ON t.id = sl.team_season_id
         INNER JOIN intranet_courts c ON c.id = sl.court_id
         INNER JOIN intranet_venues v ON v.id = c.venue_id
         WHERE sl.weekday = $1
           AND sl.is_active = true
           AND t.is_active = true
           AND ($2::text[] IS NULL OR sl.team_season_id = ANY($2::text[]))
         ORDER BY sl.start_time ASC;`,
        [todayWeekday, targetTeamIds]
      ),
      queryNeon<{
        venue_id: string;
        court_id: string | null;
        madrid_date: string;
        start_time: string | null;
        end_time: string | null;
      }>(
        `SELECT venue_id, court_id, madrid_date, start_time, end_time
         FROM intranet_venue_closures
         WHERE madrid_date = $1;`,
        [todayMadrid]
      ),
      queryNeon<{
        id: string;
        team_season_id: string;
        team_name: string;
        slot_id: string | null;
        court_name: string | null;
        venue_name: string | null;
        starts_at_utc: string;
        ends_at_utc: string;
        status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
        has_records: boolean;
        assigned_coach_id: string | null;
        assigned_coach_name: string | null;
        assigned_coach_email: string | null;
      }>(
        `SELECT
           s.id::text AS id,
           s.team_season_id,
           t.name AS team_name,
           s.slot_id::text AS slot_id,
           c.name AS court_name,
           v.name AS venue_name,
           s.starts_at_utc::text,
           s.ends_at_utc::text,
           s.status,
           EXISTS (
             SELECT 1 FROM intranet_attendance_records ar WHERE ar.session_id = s.id
           ) AS has_records,
           s.assigned_coach_id::text AS assigned_coach_id,
           u.name AS assigned_coach_name,
           CASE WHEN u.status = 'ACTIVE' THEN u.email ELSE NULL END AS assigned_coach_email
         FROM intranet_training_sessions s
         INNER JOIN intranet_team_seasons t ON t.id = s.team_season_id
         LEFT JOIN intranet_courts c ON c.id = s.court_id
         LEFT JOIN intranet_venues v ON v.id = c.venue_id
         LEFT JOIN intranet_users u ON u.id = s.assigned_coach_id
         WHERE s.madrid_date = $1
           AND t.is_active = true
           AND ($2::text[] IS NULL OR s.team_season_id = ANY($2::text[]))
         ORDER BY s.starts_at_utc ASC;`,
        [todayMadrid, targetTeamIds]
      ),
      queryNeon<{
        session_id: string | null;
        team_season_id: string;
        start_time: string;
        end_time: string;
        substitute_user_id: string | null;
        substitute_name: string | null;
        substitute_email: string | null;
      }>(
        `SELECT
           sub.session_id::text AS session_id,
           sub.team_season_id,
           sub.start_time,
           sub.end_time,
           sub.substitute_user_id::text AS substitute_user_id,
           u.name AS substitute_name,
           u.email AS substitute_email
         FROM intranet_substitutions sub
         INNER JOIN intranet_users u ON u.id = sub.substitute_user_id
         WHERE sub.madrid_date = $1
           AND sub.status = 'ASSIGNED'
           AND u.status = 'ACTIVE'
           AND ($2::text[] IS NULL OR sub.team_season_id = ANY($2::text[]));`,
        [todayMadrid, targetTeamIds]
      ),
      queryNeon<{
        team_season_id: string;
        user_id: string;
        name: string;
        email: string;
        staff_function: string;
      }>(
        `SELECT
           ts.team_season_id,
           ts.user_id::text AS user_id,
           u.name,
           u.email,
           ts.staff_function
         FROM intranet_team_staff ts
         INNER JOIN intranet_users u ON u.id = ts.user_id
         WHERE u.status = 'ACTIVE'
           AND ts.valid_from <= NOW()
           AND (ts.valid_to IS NULL OR ts.valid_to > NOW())
           AND ts.staff_function IN ('HEAD_COACH', 'ASSISTANT')
           AND ($1::text[] IS NULL OR ts.team_season_id = ANY($1::text[]))
         ORDER BY
           CASE ts.staff_function WHEN 'HEAD_COACH' THEN 0 ELSE 1 END ASC,
           u.name ASC;`,
        [targetTeamIds]
      ),
      queryNeon<{
        team_season_id: string;
        scheduled_start_time: string;
        coach_email: string;
      }>(
        `SELECT team_season_id, scheduled_start_time, coach_email
         FROM intranet_attendance_reminders
         WHERE madrid_date = $1;`,
        [todayMadrid]
      ),
    ]);

  const sentKeys = new Set(
    existingReminders.map(
      (r) => `${r.team_season_id}::${r.scheduled_start_time}::${r.coach_email.trim().toLowerCase()}`
    )
  );

  const staffByTeam = new Map<
    string,
    Array<{ userId: string; name: string; email: string; staffFunction: string }>
  >();
  for (const st of staffRows) {
    if (!isStrictEmail(st.email)) continue;
    const list = staffByTeam.get(st.team_season_id) || [];
    if (!list.some((x) => x.email.toLowerCase() === st.email.trim().toLowerCase())) {
      list.push({
        userId: st.user_id,
        name: st.name,
        email: st.email.trim().toLowerCase(),
        staffFunction: st.staff_function,
      });
    }
    staffByTeam.set(st.team_season_id, list);
  }

  interface CandidateTraining {
    slotId: string | null;
    sessionId: string | null;
    teamSeasonId: string;
    teamName: string;
    startTime: string;
    endTime: string;
    courtLabel: string | null;
    expectedStartIso: string;
    assignedCoachId: string | null;
    assignedCoachName: string | null;
    assignedCoachEmail: string | null;
  }

  const candidates: CandidateTraining[] = [];
  const matchedSessionIds = new Set<string>();

  for (const sl of slotRows) {
    if (isSlotClosedOnDate(sl, todayMadrid, closureRows)) {
      continue;
    }

    const linkedSess =
      sessionRows.find(
        (s) =>
          !matchedSessionIds.has(s.id) &&
          (s.slot_id === sl.id ||
            (s.team_season_id === sl.team_season_id &&
              formatMadridTime(s.starts_at_utc) === sl.start_time))
      ) || null;

    if (linkedSess) {
      matchedSessionIds.add(linkedSess.id);
      if (
        linkedSess.status === 'COMPLETED' ||
        linkedSess.status === 'CANCELLED' ||
        linkedSess.has_records
      ) {
        continue;
      }
    }

    const courtLabel = sl.court_name
      ? `${sl.venue_name ? `${sl.venue_name} · ` : ''}${sl.court_name}`
      : null;

    candidates.push({
      slotId: sl.id,
      sessionId: linkedSess?.id || null,
      teamSeasonId: sl.team_season_id,
      teamName: sl.team_name,
      startTime: linkedSess ? formatMadridTime(linkedSess.starts_at_utc) : sl.start_time,
      endTime: linkedSess ? formatMadridTime(linkedSess.ends_at_utc) : sl.end_time,
      courtLabel,
      expectedStartIso: linkedSess
        ? linkedSess.starts_at_utc
        : madridLocalToUtcIso(todayMadrid, sl.start_time),
      assignedCoachId: linkedSess?.assigned_coach_id || null,
      assignedCoachName: linkedSess?.assigned_coach_name || null,
      assignedCoachEmail: linkedSess?.assigned_coach_email || null,
    });
  }

  for (const sess of sessionRows) {
    if (matchedSessionIds.has(sess.id)) continue;
    if (sess.status !== 'SCHEDULED' || sess.has_records) continue;

    const courtLabel = sess.court_name
      ? `${sess.venue_name ? `${sess.venue_name} · ` : ''}${sess.court_name}`
      : null;

    candidates.push({
      slotId: sess.slot_id,
      sessionId: sess.id,
      teamSeasonId: sess.team_season_id,
      teamName: sess.team_name,
      startTime: formatMadridTime(sess.starts_at_utc),
      endTime: formatMadridTime(sess.ends_at_utc),
      courtLabel,
      expectedStartIso: sess.starts_at_utc,
      assignedCoachId: sess.assigned_coach_id,
      assignedCoachName: sess.assigned_coach_name,
      assignedCoachEmail: sess.assigned_coach_email,
    });
  }

  const dueCandidates = candidates.filter((c) => {
    const startMs = new Date(c.expectedStartIso).getTime();
    const elapsedMinutes = Math.floor((nowMs - startMs) / 60000);
    return (
      elapsedMinutes >= REMINDER_MIN_DELAY_MINUTES &&
      elapsedMinutes <= REMINDER_MAX_WINDOW_MINUTES
    );
  });

  const baseUrl = getPublicBaseUrl();
  const attendanceUrl = `${baseUrl}/club/asistencia`;
  const prettyToday = formatDisplayDate(todayMadrid);

  let sentCount = 0;
  let simulatedCount = 0;
  let skippedAlreadySentCount = 0;
  let skippedNoCoachCount = 0;
  let failedCount = 0;
  let firstError: string | undefined;
  const details: AttendanceReminderDetail[] = [];

  for (const item of dueCandidates) {
    const elapsedMinutes = Math.max(
      REMINDER_MIN_DELAY_MINUTES,
      Math.floor((nowMs - new Date(item.expectedStartIso).getTime()) / 60000)
    );

    const activeSub = subRows.find(
      (sub) =>
        (item.sessionId && sub.session_id && sub.session_id === item.sessionId) ||
        (sub.team_season_id === item.teamSeasonId &&
          intervalsOverlap(
            timeToMinutes(item.startTime),
            timeToMinutes(item.endTime),
            timeToMinutes(sub.start_time),
            timeToMinutes(sub.end_time)
          ))
    );

    let recipients: Array<{ userId: string | null; name: string; email: string }> = [];

    if (activeSub && activeSub.substitute_email && isStrictEmail(activeSub.substitute_email)) {
      recipients = [
        {
          userId: activeSub.substitute_user_id,
          name: activeSub.substitute_name || 'Entrenador sustituto',
          email: activeSub.substitute_email.trim().toLowerCase(),
        },
      ];
    } else if (item.assignedCoachEmail && isStrictEmail(item.assignedCoachEmail)) {
      recipients = [
        {
          userId: item.assignedCoachId,
          name: item.assignedCoachName || 'Entrenador asignado',
          email: item.assignedCoachEmail.trim().toLowerCase(),
        },
      ];
    } else {
      const teamStaff = staffByTeam.get(item.teamSeasonId) || [];
      const headCoaches = teamStaff.filter((s) => s.staffFunction === 'HEAD_COACH');
      const targetStaff = headCoaches.length > 0 ? headCoaches : teamStaff;
      recipients = targetStaff.map((s) => ({
        userId: s.userId,
        name: s.name,
        email: s.email,
      }));
    }

    if (recipients.length === 0) {
      skippedNoCoachCount += 1;
      details.push({
        teamSeasonId: item.teamSeasonId,
        teamName: item.teamName,
        startTime: item.startTime,
        coachEmail: null,
        outcome: 'NO_COACH',
      });
      continue;
    }

    for (const rec of recipients) {
      const dedupeKey = `${item.teamSeasonId}::${item.startTime}::${rec.email}`;
      if (sentKeys.has(dedupeKey)) {
        skippedAlreadySentCount += 1;
        details.push({
          teamSeasonId: item.teamSeasonId,
          teamName: item.teamName,
          startTime: item.startTime,
          coachEmail: rec.email,
          outcome: 'ALREADY_SENT',
        });
        continue;
      }

      const safeTeam = stripCrlf(item.teamName).slice(0, 90);
      const safeCoach = stripCrlf(rec.name).slice(0, 90);
      const safeCourt = item.courtLabel ? stripCrlf(item.courtLabel).slice(0, 90) : null;

      const subject = `[CDV San Pedro] Aviso: +15 min sin pasar lista · ${safeTeam} (${item.startTime})`;
      const text = [
        `${CLUB_INFO.name} · Control de Asistencia`,
        ``,
        `Hola ${safeCoach},`,
        ``,
        `Han pasado ${elapsedMinutes} minutos desde el inicio previsto del entrenamiento de ${safeTeam} y todavía no consta el pase de lista.`,
        ``,
        `Fecha: ${prettyToday}`,
        `Horario: ${item.startTime} - ${item.endTime}`,
        ...(safeCourt ? [`Pista: ${safeCourt}`] : []),
        ``,
        `Por favor, registra la asistencia en cuanto puedas desde:`,
        attendanceUrl,
      ].join('\n');

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden;">
          <div style="background: #d90429; padding: 16px 22px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)} · Asistencia</div>
            <h2 style="margin: 4px 0 0 0; font-size: 18px;">Aviso: +15 min sin pasar lista</h2>
          </div>
          <div style="padding: 20px 22px; color: #18181b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Hola <strong>${escapeHtml(safeCoach)}</strong>,</p>
            <p>Han pasado <strong>${elapsedMinutes} minutos</strong> desde el inicio previsto del entrenamiento de <strong>${escapeHtml(safeTeam)}</strong> y aún no consta el registro de asistencia.</p>
            <div style="background: #f9fafb; border: 1px solid #e4e4e7; border-left: 4px solid #d90429; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
              <div><strong>Equipo:</strong> ${escapeHtml(safeTeam)}</div>
              <div><strong>Fecha:</strong> ${escapeHtml(prettyToday)}</div>
              <div><strong>Horario:</strong> ${escapeHtml(item.startTime)} – ${escapeHtml(item.endTime)}</div>
              ${safeCourt ? `<div><strong>Pista:</strong> ${escapeHtml(safeCourt)}</div>` : ''}
            </div>
            <p style="margin: 22px 0; text-align: center;">
              <a href="${escapeHtml(attendanceUrl)}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Ir a Pasar Lista</a>
            </p>
          </div>
        </div>
      `;

      const simulateDelivery = isSafeSimulatedRecipient(rec.email);
      let mailRes: { sent: boolean; error?: string };

      if (simulateDelivery) {
        mailRes = { sent: true };
        console.info(
          `[ATTENDANCE-15M-SIMULATED] Coach="${safeCoach}" Email="${rec.email}" Team="${safeTeam}" Start="${item.startTime}" Elapsed="${elapsedMinutes}m"`
        );
      } else {
        mailRes = await sendSmtpMail({
          to: rec.email,
          subject,
          text,
          html,
        });
      }

      if (mailRes.sent) {
        await queryNeon(
          `INSERT INTO intranet_attendance_reminders (
             slot_id, session_id, team_season_id, madrid_date, scheduled_start_time, coach_user_id, coach_email
           ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::uuid, $7)
           ON CONFLICT (team_season_id, madrid_date, scheduled_start_time, coach_email) DO NOTHING;`,
          [
            item.slotId,
            item.sessionId,
            item.teamSeasonId,
            todayMadrid,
            item.startTime,
            rec.userId,
            rec.email,
          ]
        );

        sentKeys.add(dedupeKey);
        sentCount += 1;
        if (simulateDelivery) simulatedCount += 1;

        await recordAuditLog({
          actorUserId: options.actorUserId ?? null,
          actorEmail: options.actorEmail || 'cron@voleibolsanpedro.es',
          action: 'ATTENDANCE_REMINDER_15M',
          module: 'Asistencia',
          targetType: 'TRAINING_SESSION',
          targetId: item.sessionId || item.slotId || item.teamSeasonId,
          details: {
            teamSeasonId: item.teamSeasonId,
            teamName: item.teamName,
            madridDate: todayMadrid,
            scheduledStartTime: item.startTime,
            elapsedMinutes,
            coachUserId: rec.userId,
            coachEmail: rec.email,
            viaCron: Boolean(options.viaCron),
            simulatedDelivery: simulateDelivery,
          },
          ipAddress: options.clientIp ?? null,
        });

        details.push({
          teamSeasonId: item.teamSeasonId,
          teamName: item.teamName,
          startTime: item.startTime,
          coachEmail: rec.email,
          outcome: 'SENT',
          simulated: simulateDelivery,
        });
      } else {
        failedCount += 1;
        if (!firstError && mailRes.error) firstError = mailRes.error;
        details.push({
          teamSeasonId: item.teamSeasonId,
          teamName: item.teamName,
          startTime: item.startTime,
          coachEmail: rec.email,
          outcome: 'FAILED',
          error: mailRes.error,
        });
      }
    }
  }

  return {
    success: true,
    madridDate: todayMadrid,
    madridTime: currentTimeMadrid,
    checkedCount: dueCandidates.length,
    sentCount,
    simulatedCount,
    skippedAlreadySentCount,
    skippedNoCoachCount,
    failedCount,
    warning: firstError,
    details,
  };
}

/**
 * Ejecuta la comprobación de entrenamientos vencidos +15 min sin pase de lista,
 * con protección contra ejecuciones simultáneas y throttle automático en consultas GET.
 */
export async function runAttendanceRemindersCheck(
  options: RunAttendanceRemindersOptions = {}
): Promise<AttendanceRemindersCheckResult> {
  const now = new Date();
  const nowMs = now.getTime();

  if (options.respectThrottle && lastAutoCheckAtMs > 0 && nowMs - lastAutoCheckAtMs < AUTO_CHECK_THROTTLE_MS) {
    return {
      success: true,
      throttled: true,
      madridDate: formatMadridDateString(now),
      madridTime: formatMadridTime(now),
      checkedCount: 0,
      sentCount: 0,
      simulatedCount: 0,
      skippedAlreadySentCount: 0,
      skippedNoCoachCount: 0,
      failedCount: 0,
      details: [],
    };
  }

  if (inFlightRemindersCheck) {
    return inFlightRemindersCheck;
  }

  const runPromise = executeAttendanceRemindersCheck(options)
    .then((res) => {
      lastAutoCheckAtMs = Date.now();
      return res;
    })
    .finally(() => {
      inFlightRemindersCheck = null;
    });

  inFlightRemindersCheck = runPromise;
  return runPromise;
}
