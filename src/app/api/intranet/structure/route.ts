import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { FAVB_MATCHES } from '@/lib/favb-data';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
} from '@/lib/date-utils';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { assertCan, can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isUuid(val: unknown): val is string {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  );
}

function toMinutes(hhmm: string): number {
  const m = hhmm.match(TIME_RE);
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

function slugifyId(prefix: string, name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${base || 'item'}-${suffix}`;
}

export interface SlotRowWithMeta {
  id: string;
  teamSeasonId: string;
  teamName: string;
  association: string;
  gender: string;
  courtId: string;
  courtName: string;
  venueId: string;
  venueName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  staff: Array<{
    userId: string;
    name: string;
    email: string;
    staffFunction: string;
  }>;
}

export interface ScheduleConflict {
  id: string;
  type: 'COURT_OVERLAP' | 'COACH_OVERLAP';
  weekday: number;
  slotAId: string;
  slotBId: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  timeRangeA: string;
  timeRangeB: string;
  courtName?: string;
  venueName?: string;
  coachUserId?: string;
  coachName?: string;
  summary: string;
}

function detectSlotConflicts(
  slots: Array<{
    id: string;
    teamSeasonId: string;
    teamName: string;
    courtId: string;
    courtName: string;
    venueName: string;
    weekday: number;
    startTime: string;
    endTime: string;
  }>,
  staffByTeam: Map<
    string,
    Array<{ userId: string; name: string; email: string; staffFunction: string }>
  >
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < slots.length; i++) {
    const a = slots[i];
    const aStart = toMinutes(a.startTime);
    const aEnd = toMinutes(a.endTime);
    if (aStart < 0 || aEnd <= aStart) continue;

    for (let j = i + 1; j < slots.length; j++) {
      const b = slots[j];
      if (a.id === b.id || a.weekday !== b.weekday) continue;

      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime);
      if (bStart < 0 || bEnd <= bStart) continue;

      const overlaps = aStart < bEnd && bStart < aEnd;
      if (!overlaps) continue;

      if (a.courtId === b.courtId) {
        conflicts.push({
          id: `court:${a.id}:${b.id}`,
          type: 'COURT_OVERLAP',
          weekday: a.weekday,
          slotAId: a.id,
          slotBId: b.id,
          teamAId: a.teamSeasonId,
          teamAName: a.teamName,
          teamBId: b.teamSeasonId,
          teamBName: b.teamName,
          timeRangeA: `${a.startTime}-${a.endTime}`,
          timeRangeB: `${b.startTime}-${b.endTime}`,
          courtName: a.courtName,
          venueName: a.venueName,
          summary: `Pista "${a.courtName}" (${a.venueName}) solapada entre ${a.teamName} (${a.startTime}-${a.endTime}) y ${b.teamName} (${b.startTime}-${b.endTime}).`,
        });
      }

      if (a.teamSeasonId !== b.teamSeasonId) {
        const staffA = staffByTeam.get(a.teamSeasonId) || [];
        const staffB = staffByTeam.get(b.teamSeasonId) || [];
        const staffBIds = new Set(staffB.map((s) => s.userId));
        for (const member of staffA) {
          if (staffBIds.has(member.userId)) {
            conflicts.push({
              id: `coach:${member.userId}:${a.id}:${b.id}`,
              type: 'COACH_OVERLAP',
              weekday: a.weekday,
              slotAId: a.id,
              slotBId: b.id,
              teamAId: a.teamSeasonId,
              teamAName: a.teamName,
              teamBId: b.teamSeasonId,
              teamBName: b.teamName,
              timeRangeA: `${a.startTime}-${a.endTime}`,
              timeRangeB: `${b.startTime}-${b.endTime}`,
              coachUserId: member.userId,
              coachName: member.name,
              summary: `${member.name} coincide en horario con ${a.teamName} (${a.startTime}-${a.endTime}) y ${b.teamName} (${b.startTime}-${b.endTime}).`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

async function loadActiveSlotsAndStaff() {
  const [slotRows, staffRows] = await Promise.all([
    queryNeon<{
      id: string;
      team_season_id: string;
      team_name: string;
      association: string;
      gender: string;
      court_id: string;
      court_name: string;
      venue_id: string;
      venue_name: string;
      weekday: number;
      start_time: string;
      end_time: string;
      notes: string | null;
    }>(
      `SELECT s.id::text, s.team_season_id, t.name AS team_name, t.association, t.gender,
              s.court_id, c.name AS court_name, c.venue_id, v.name AS venue_name,
              s.weekday, s.start_time, s.end_time, s.notes
       FROM intranet_training_slots s
       INNER JOIN intranet_courts c ON c.id = s.court_id
       INNER JOIN intranet_venues v ON v.id = c.venue_id
       INNER JOIN intranet_team_seasons t ON t.id = s.team_season_id
       WHERE s.is_active = true
       ORDER BY s.weekday ASC, s.start_time ASC, t.sort_order ASC;`
    ),
    queryNeon<{
      team_season_id: string;
      user_id: string;
      name: string;
      email: string;
      staff_function: string;
    }>(
      `SELECT ts.team_season_id, ts.user_id::text, u.name, u.email, ts.staff_function
       FROM intranet_team_staff ts
       INNER JOIN intranet_users u ON u.id = ts.user_id
       WHERE ts.valid_from <= NOW()
         AND (ts.valid_to IS NULL OR ts.valid_to > NOW())
         AND u.status = 'ACTIVE'
       ORDER BY ts.staff_function ASC, u.name ASC;`
    ),
  ]);

  const staffByTeam = new Map<
    string,
    Array<{ userId: string; name: string; email: string; staffFunction: string }>
  >();

  for (const row of staffRows) {
    const list = staffByTeam.get(row.team_season_id) || [];
    if (!list.some((item) => item.userId === row.user_id && item.staffFunction === row.staff_function)) {
      list.push({
        userId: row.user_id,
        name: row.name,
        email: row.email,
        staffFunction: row.staff_function,
      });
    }
    staffByTeam.set(row.team_season_id, list);
  }

  const slots: SlotRowWithMeta[] = slotRows.map((s) => ({
    id: s.id,
    teamSeasonId: s.team_season_id,
    teamName: s.team_name,
    association: s.association,
    gender: s.gender,
    courtId: s.court_id,
    courtName: s.court_name,
    venueId: s.venue_id,
    venueName: s.venue_name,
    weekday: s.weekday,
    startTime: s.start_time,
    endTime: s.end_time,
    notes: s.notes,
    staff: staffByTeam.get(s.team_season_id) || [],
  }));

  return { slots, staffByTeam };
}

export async function GET() {
  try {
    const ctx = await requireIntranetSession();
    if (!ctx.isStaff) {
      throw new IntranetForbiddenError('Solo el personal del club puede consultar la estructura deportiva.');
    }

    await ensureIntranetSeeded();

    const [
      seasonRows,
      teamRows,
      venueRows,
      courtRows,
      closureRows,
      proposalRows,
      slotsData,
    ] = await Promise.all([
      queryNeon<{
        id: string;
        name: string;
        is_current: boolean;
        start_date: string;
        end_date: string;
      }>(
        `SELECT id, name, is_current, start_date, end_date
         FROM intranet_seasons
         ORDER BY is_current DESC, start_date DESC;`
      ),
      queryNeon<{
        id: string;
        season_id: string;
        category_id: string;
        name: string;
        division: string;
        association: 'FAVB' | 'AFADE';
        gender: 'MASCULINO' | 'FEMENINO';
        is_active: boolean;
        sort_order: number;
      }>(
        `SELECT id, season_id, category_id, name, division, association, gender, is_active, sort_order
         FROM intranet_team_seasons
         ORDER BY sort_order ASC, name ASC;`
      ),
      queryNeon<{
        id: string;
        name: string;
        address: string | null;
        maps_url: string | null;
        locality: string;
        is_home_venue: boolean;
        is_active: boolean;
      }>(
        `SELECT id, name, address, maps_url, locality, is_home_venue, is_active
         FROM intranet_venues
         ORDER BY is_home_venue DESC, name ASC;`
      ),
      queryNeon<{
        id: string;
        venue_id: string;
        name: string;
        surface_type: string | null;
        is_active: boolean;
      }>(
        `SELECT id, venue_id, name, surface_type, is_active
         FROM intranet_courts
         ORDER BY name ASC;`
      ),
      queryNeon<{
        id: string;
        venue_id: string;
        venue_name: string;
        court_id: string | null;
        court_name: string | null;
        madrid_date: string;
        start_time: string | null;
        end_time: string | null;
        reason: string;
        created_at: string;
      }>(
        `SELECT cl.id::text, cl.venue_id, v.name AS venue_name,
                cl.court_id, c.name AS court_name,
                cl.madrid_date, cl.start_time, cl.end_time, cl.reason,
                cl.created_at::text
         FROM intranet_venue_closures cl
         INNER JOIN intranet_venues v ON v.id = cl.venue_id
         LEFT JOIN intranet_courts c ON c.id = cl.court_id
         ORDER BY cl.madrid_date ASC, cl.created_at DESC
         LIMIT 120;`
      ),
      queryNeon<{
        id: string;
        team_season_id: string;
        team_name: string;
        slot_id: string | null;
        proposed_court_id: string | null;
        proposed_court_name: string | null;
        proposed_venue_name: string | null;
        proposed_weekday: number;
        proposed_start_time: string;
        proposed_end_time: string;
        reason: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        proposed_by: string;
        proposed_by_name: string;
        reviewed_by: string | null;
        reviewed_by_name: string | null;
        created_at: string;
        reviewed_at: string | null;
      }>(
        `SELECT p.id::text, p.team_season_id, t.name AS team_name, p.slot_id::text,
                p.proposed_court_id, c.name AS proposed_court_name, v.name AS proposed_venue_name,
                p.proposed_weekday, p.proposed_start_time, p.proposed_end_time,
                p.reason, p.status, p.proposed_by::text, u1.name AS proposed_by_name,
                p.reviewed_by::text, u2.name AS reviewed_by_name,
                p.created_at::text, p.reviewed_at::text
         FROM intranet_schedule_proposals p
         INNER JOIN intranet_team_seasons t ON t.id = p.team_season_id
         LEFT JOIN intranet_courts c ON c.id = p.proposed_court_id
         LEFT JOIN intranet_venues v ON v.id = c.venue_id
         INNER JOIN intranet_users u1 ON u1.id = p.proposed_by
         LEFT JOIN intranet_users u2 ON u2.id = p.reviewed_by
         ORDER BY CASE WHEN p.status = 'PENDING' THEN 0 ELSE 1 END, p.created_at DESC
         LIMIT 100;`
      ),
      loadActiveSlotsAndStaff(),
    ]);

    const currentSeason = seasonRows.find((s) => s.is_current) || seasonRows[0] || null;
    const conflicts = detectSlotConflicts(slotsData.slots, slotsData.staffByTeam);

    const courtsByVenue = new Map<
      string,
      Array<{ id: string; venueId: string; name: string; surfaceType: string | null; isActive: boolean }>
    >();
    for (const c of courtRows) {
      const list = courtsByVenue.get(c.venue_id) || [];
      list.push({
        id: c.id,
        venueId: c.venue_id,
        name: c.name,
        surfaceType: c.surface_type,
        isActive: c.is_active,
      });
      courtsByVenue.set(c.venue_id, list);
    }

    const venues = venueRows.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      mapsUrl: v.maps_url,
      locality: v.locality,
      isHomeVenue: v.is_home_venue,
      isActive: v.is_active,
      courts: courtsByVenue.get(v.id) || [],
    }));

    const teamNameMap = new Map(teamRows.map((t) => [t.id, t.name]));
    const todayMadrid = formatMadridDateString(new Date());

    const homeMatchesAll = FAVB_MATCHES.filter(
      (m) => m.isClubHome === true && m.status !== 'CANCELLED'
    ).map((m) => {
      const madridDate = formatMadridDateString(m.matchDate);
      const madridTime = formatMadridTime(m.matchDate);
      const madridLabel = formatMadridDate(m.matchDate);
      return {
        id: m.id,
        teamId: m.teamId,
        teamName: teamNameMap.get(m.teamId) || m.homeTeamName,
        round: m.round,
        homeTeamName: m.homeTeamName,
        awayTeamName: m.awayTeamName,
        venueName: m.venueName,
        court: m.court || null,
        matchDateUtc: m.matchDate,
        madridDate,
        madridTime,
        madridLabel,
        status: m.status,
      };
    });

    const upcomingHomeMatches = homeMatchesAll
      .filter((m) => m.madridDate >= todayMadrid)
      .sort((a, b) => a.matchDateUtc.localeCompare(b.matchDateUtc))
      .slice(0, 40);

    return NextResponse.json({
      success: true,
      todayMadrid,
      currentSeason: currentSeason
        ? {
            id: currentSeason.id,
            name: currentSeason.name,
            isCurrent: currentSeason.is_current,
            startDate: currentSeason.start_date,
            endDate: currentSeason.end_date,
          }
        : null,
      seasons: seasonRows.map((s) => ({
        id: s.id,
        name: s.name,
        isCurrent: s.is_current,
        startDate: s.start_date,
        endDate: s.end_date,
      })),
      teams: teamRows.map((t) => ({
        id: t.id,
        seasonId: t.season_id,
        categoryId: t.category_id,
        name: t.name,
        division: t.division,
        association: t.association,
        gender: t.gender,
        isActive: t.is_active,
        sortOrder: t.sort_order,
        staff: slotsData.staffByTeam.get(t.id) || [],
      })),
      venues,
      slots: slotsData.slots,
      conflicts,
      closures: closureRows.map((cl) => ({
        id: cl.id,
        venueId: cl.venue_id,
        venueName: cl.venue_name,
        courtId: cl.court_id,
        courtName: cl.court_name,
        madridDate: cl.madrid_date,
        startTime: cl.start_time,
        endTime: cl.end_time,
        reason: cl.reason,
        createdAt: cl.created_at,
      })),
      proposals: proposalRows.map((p) => ({
        id: p.id,
        teamSeasonId: p.team_season_id,
        teamName: p.team_name,
        slotId: p.slot_id,
        proposedCourtId: p.proposed_court_id,
        proposedCourtName: p.proposed_court_name,
        proposedVenueName: p.proposed_venue_name,
        proposedWeekday: p.proposed_weekday,
        proposedStartTime: p.proposed_start_time,
        proposedEndTime: p.proposed_end_time,
        reason: p.reason,
        status: p.status,
        proposedBy: p.proposed_by,
        proposedByName: p.proposed_by_name,
        reviewedBy: p.reviewed_by,
        reviewedByName: p.reviewed_by_name,
        createdAt: p.created_at,
        reviewedAt: p.reviewed_at,
      })),
      upcomingHomeMatches,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Structure GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    const body = await req.json();
    const action = String(body?.action || '').trim();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Acción no especificada.' }, { status: 400 });
    }

    // 1. Crear pabellón
    if (action === 'create_venue') {
      assertCan(ctx, 'venue.manage');

      const name = String(body?.name || '').trim();
      const address = body?.address ? String(body.address).trim() : null;
      const locality = String(body?.locality || 'San Pedro Alcántara').trim();
      const mapsUrl = body?.mapsUrl ? String(body.mapsUrl).trim() : null;
      const isHomeVenue = body?.isHomeVenue !== false;

      if (name.length < 2) {
        return NextResponse.json({ success: false, error: 'Indica el nombre del pabellón.' }, { status: 400 });
      }

      const id = slugifyId('venue', name);
      await queryNeon(
        `INSERT INTO intranet_venues (id, name, address, maps_url, locality, is_home_venue, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true);`,
        [id, name, address, mapsUrl, locality, isHomeVenue]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_VENUE',
        module: 'Estructura',
        targetType: 'VENUE',
        targetId: id,
        details: { name, locality, isHomeVenue },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, venueId: id });
    }

    // 2. Crear pista en un pabellón
    if (action === 'create_court') {
      assertCan(ctx, 'venue.manage');

      const venueId = String(body?.venueId || '').trim();
      const name = String(body?.name || '').trim();
      const surfaceType = String(body?.surfaceType || 'Pista completa').trim();

      if (!venueId || name.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Selecciona el pabellón e indica el nombre de la pista.' },
          { status: 400 }
        );
      }

      const id = slugifyId('court', name);
      await queryNeon(
        `INSERT INTO intranet_courts (id, venue_id, name, surface_type, is_active)
         VALUES ($1, $2, $3, $4, true);`,
        [id, venueId, name, surfaceType]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_COURT',
        module: 'Estructura',
        targetType: 'COURT',
        targetId: id,
        details: { venueId, name, surfaceType },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, courtId: id });
    }

    // 3. Crear franja semanal de entrenamiento
    if (action === 'create_slot') {
      assertCan(ctx, 'schedule.manage');

      const teamSeasonId = String(body?.teamSeasonId || '').trim();
      const courtId = String(body?.courtId || '').trim();
      const weekday = Number(body?.weekday);
      const startTime = String(body?.startTime || '').trim();
      const endTime = String(body?.endTime || '').trim();
      const notes = body?.notes ? String(body.notes).trim() : null;
      const strict = Boolean(body?.strict);

      if (
        !teamSeasonId ||
        !courtId ||
        !Number.isInteger(weekday) ||
        weekday < 1 ||
        weekday > 7 ||
        !TIME_RE.test(startTime) ||
        !TIME_RE.test(endTime) ||
        toMinutes(startTime) >= toMinutes(endTime)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos de franja no válidos. Comprueba equipo, pista, día (1-7) y hora inicio < fin.',
          },
          { status: 400 }
        );
      }

      const [teamRows, courtRows, existingData] = await Promise.all([
        queryNeon<{ id: string; name: string }>(
          `SELECT id, name FROM intranet_team_seasons WHERE id = $1 LIMIT 1;`,
          [teamSeasonId]
        ),
        queryNeon<{ id: string; name: string; venue_name: string }>(
          `SELECT c.id, c.name, v.name AS venue_name
           FROM intranet_courts c
           INNER JOIN intranet_venues v ON v.id = c.venue_id
           WHERE c.id = $1 LIMIT 1;`,
          [courtId]
        ),
        loadActiveSlotsAndStaff(),
      ]);

      if (teamRows.length === 0 || courtRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Equipo o pista no encontrado.' },
          { status: 404 }
        );
      }

      const candidateId = 'candidate-new-slot';
      const candidateSlot = {
        id: candidateId,
        teamSeasonId,
        teamName: teamRows[0].name,
        courtId,
        courtName: courtRows[0].name,
        venueName: courtRows[0].venue_name,
        weekday,
        startTime,
        endTime,
      };

      const candidateConflicts = detectSlotConflicts(
        [...existingData.slots, candidateSlot],
        existingData.staffByTeam
      ).filter((c) => c.slotAId === candidateId || c.slotBId === candidateId);

      if (strict && candidateConflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            conflictBlocked: true,
            conflicts: candidateConflicts,
            error: 'Franja bloqueada en modo estricto por conflictos de pista o entrenador.',
          },
          { status: 409 }
        );
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_training_slots (
           team_season_id, court_id, weekday, start_time, end_time, notes, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id::text AS id;`,
        [teamSeasonId, courtId, weekday, startTime, endTime, notes]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_TRAINING_SLOT',
        module: 'Estructura',
        targetType: 'TRAINING_SLOT',
        targetId: inserted[0]?.id || null,
        details: {
          teamSeasonId,
          courtId,
          weekday,
          startTime,
          endTime,
          conflictsCount: candidateConflicts.length,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        slotId: inserted[0]?.id,
        conflicts: candidateConflicts,
        warning:
          candidateConflicts.length > 0
            ? `Franja guardada con ${candidateConflicts.length} conflicto(s) detectado(s).`
            : null,
      });
    }

    // 4. Desactivar/eliminar franja semanal
    if (action === 'delete_slot') {
      assertCan(ctx, 'schedule.manage');

      const slotId = String(body?.slotId || '').trim();
      if (!isUuid(slotId)) {
        return NextResponse.json({ success: false, error: 'ID de franja no válido.' }, { status: 400 });
      }

      const rows = await queryNeon<{ id: string; team_season_id: string }>(
        `UPDATE intranet_training_slots
         SET is_active = false
         WHERE id = $1::uuid AND is_active = true
         RETURNING id::text, team_season_id;`,
        [slotId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Franja no encontrada.' }, { status: 404 });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'DELETE_TRAINING_SLOT',
        module: 'Estructura',
        targetType: 'TRAINING_SLOT',
        targetId: slotId,
        details: { teamSeasonId: rows[0].team_season_id },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    // 5. Crear cierre/festivo de pabellón o pista
    if (action === 'create_closure') {
      if (!can(ctx, 'venue.manage') && !can(ctx, 'schedule.manage')) {
        throw new IntranetForbiddenError('No tienes permiso para registrar cierres de instalaciones.');
      }

      const venueId = String(body?.venueId || '').trim();
      const courtId = body?.courtId ? String(body.courtId).trim() : null;
      const madridDate = String(body?.madridDate || '').trim();
      const startTime = body?.startTime ? String(body.startTime).trim() : null;
      const endTime = body?.endTime ? String(body.endTime).trim() : null;
      const reason = String(body?.reason || '').trim();

      if (!venueId || !DATE_RE.test(madridDate) || reason.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Indica pabellón, fecha válida (YYYY-MM-DD) y motivo.' },
          { status: 400 }
        );
      }

      if ((startTime && !TIME_RE.test(startTime)) || (endTime && !TIME_RE.test(endTime))) {
        return NextResponse.json({ success: false, error: 'Formato horario HH:MM no válido.' }, { status: 400 });
      }
      if (startTime && endTime && toMinutes(startTime) >= toMinutes(endTime)) {
        return NextResponse.json(
          { success: false, error: 'La hora de inicio del cierre debe ser anterior a la de fin.' },
          { status: 400 }
        );
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_venue_closures (
           venue_id, court_id, madrid_date, start_time, end_time, reason, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
         RETURNING id::text AS id;`,
        [venueId, courtId || null, madridDate, startTime || null, endTime || null, reason, ctx.user.id]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_VENUE_CLOSURE',
        module: 'Estructura',
        targetType: 'VENUE_CLOSURE',
        targetId: inserted[0]?.id || null,
        details: { venueId, courtId, madridDate, startTime, endTime, reason },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, closureId: inserted[0]?.id });
    }

    // 6. Eliminar cierre
    if (action === 'delete_closure') {
      if (!can(ctx, 'venue.manage') && !can(ctx, 'schedule.manage')) {
        throw new IntranetForbiddenError('No tienes permiso para eliminar cierres.');
      }

      const closureId = String(body?.closureId || '').trim();
      if (!isUuid(closureId)) {
        return NextResponse.json({ success: false, error: 'ID de cierre no válido.' }, { status: 400 });
      }

      const rows = await queryNeon<{ id: string; madrid_date: string }>(
        `DELETE FROM intranet_venue_closures WHERE id = $1::uuid RETURNING id::text, madrid_date;`,
        [closureId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Cierre no encontrado.' }, { status: 404 });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'DELETE_VENUE_CLOSURE',
        module: 'Estructura',
        targetType: 'VENUE_CLOSURE',
        targetId: closureId,
        details: { madridDate: rows[0].madrid_date },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    // 7. Proponer cambio de horario (entrenadores)
    if (action === 'propose_schedule') {
      const teamSeasonId = String(body?.teamSeasonId || '').trim();
      assertCan(ctx, 'schedule.propose', { teamSeasonId });

      const slotId = body?.slotId && isUuid(body.slotId) ? String(body.slotId).trim() : null;
      const proposedCourtId = body?.proposedCourtId ? String(body.proposedCourtId).trim() : null;
      const proposedWeekday = Number(body?.proposedWeekday);
      const proposedStartTime = String(body?.proposedStartTime || '').trim();
      const proposedEndTime = String(body?.proposedEndTime || '').trim();
      const reason = String(body?.reason || '').trim();

      if (
        !teamSeasonId ||
        !Number.isInteger(proposedWeekday) ||
        proposedWeekday < 1 ||
        proposedWeekday > 7 ||
        !TIME_RE.test(proposedStartTime) ||
        !TIME_RE.test(proposedEndTime) ||
        toMinutes(proposedStartTime) >= toMinutes(proposedEndTime) ||
        reason.length < 3
      ) {
        return NextResponse.json(
          { success: false, error: 'Propuesta no válida. Revisa equipo, día, horario y motivo.' },
          { status: 400 }
        );
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_schedule_proposals (
           team_season_id, slot_id, proposed_court_id, proposed_weekday,
           proposed_start_time, proposed_end_time, reason, status, proposed_by
         ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, 'PENDING', $8::uuid)
         RETURNING id::text AS id;`,
        [
          teamSeasonId,
          slotId,
          proposedCourtId,
          proposedWeekday,
          proposedStartTime,
          proposedEndTime,
          reason.slice(0, 400),
          ctx.user.id,
        ]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'PROPOSE_SCHEDULE_CHANGE',
        module: 'Estructura',
        targetType: 'SCHEDULE_PROPOSAL',
        targetId: inserted[0]?.id || null,
        details: {
          teamSeasonId,
          slotId,
          proposedCourtId,
          proposedWeekday,
          proposedStartTime,
          proposedEndTime,
          reason,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, proposalId: inserted[0]?.id });
    }

    // 8. Resolver propuesta de horario
    if (action === 'resolve_proposal') {
      assertCan(ctx, 'schedule.manage');

      const proposalId = String(body?.proposalId || '').trim();
      const decision = String(body?.decision || '').trim();
      const strict = Boolean(body?.strict);
      const overrideCourtId = body?.courtId ? String(body.courtId).trim() : null;

      if (!isUuid(proposalId) || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
        return NextResponse.json({ success: false, error: 'Propuesta o decisión no válida.' }, { status: 400 });
      }

      const propRows = await queryNeon<{
        id: string;
        team_season_id: string;
        slot_id: string | null;
        proposed_court_id: string | null;
        proposed_weekday: number;
        proposed_start_time: string;
        proposed_end_time: string;
        status: string;
      }>(
        `SELECT id::text, team_season_id, slot_id::text, proposed_court_id,
                proposed_weekday, proposed_start_time, proposed_end_time, status
         FROM intranet_schedule_proposals
         WHERE id = $1::uuid
         LIMIT 1;`,
        [proposalId]
      );

      const prop = propRows[0];
      if (!prop || prop.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Propuesta no encontrada o ya resuelta.' },
          { status: 404 }
        );
      }

      let conflicts: ScheduleConflict[] = [];

      if (decision === 'APPROVED') {
        const targetCourtId = overrideCourtId || prop.proposed_court_id;
        if (!targetCourtId) {
          return NextResponse.json(
            { success: false, error: 'La propuesta no indica pista; selecciona una pista para aprobarla.' },
            { status: 400 }
          );
        }

        const [teamRows, courtRows, existingData] = await Promise.all([
          queryNeon<{ name: string }>(`SELECT name FROM intranet_team_seasons WHERE id = $1 LIMIT 1;`, [
            prop.team_season_id,
          ]),
          queryNeon<{ name: string; venue_name: string }>(
            `SELECT c.name, v.name AS venue_name
             FROM intranet_courts c
             INNER JOIN intranet_venues v ON v.id = c.venue_id
             WHERE c.id = $1 LIMIT 1;`,
            [targetCourtId]
          ),
          loadActiveSlotsAndStaff(),
        ]);

        const candidateId = prop.slot_id || 'candidate-proposal-slot';
        const filteredExisting = existingData.slots.filter((s) => s.id !== prop.slot_id);
        const candidateSlot = {
          id: candidateId,
          teamSeasonId: prop.team_season_id,
          teamName: teamRows[0]?.name || prop.team_season_id,
          courtId: targetCourtId,
          courtName: courtRows[0]?.name || targetCourtId,
          venueName: courtRows[0]?.venue_name || '',
          weekday: prop.proposed_weekday,
          startTime: prop.proposed_start_time,
          endTime: prop.proposed_end_time,
        };

        conflicts = detectSlotConflicts(
          [...filteredExisting, candidateSlot],
          existingData.staffByTeam
        ).filter((c) => c.slotAId === candidateId || c.slotBId === candidateId);

        if (strict && conflicts.length > 0) {
          return NextResponse.json(
            {
              success: false,
              conflictBlocked: true,
              conflicts,
              error: 'No se pudo aprobar en modo estricto por conflictos detectados.',
            },
            { status: 409 }
          );
        }

        if (prop.slot_id) {
          await queryNeon(
            `UPDATE intranet_training_slots
             SET court_id = $2, weekday = $3, start_time = $4, end_time = $5, is_active = true
             WHERE id = $1::uuid;`,
            [
              prop.slot_id,
              targetCourtId,
              prop.proposed_weekday,
              prop.proposed_start_time,
              prop.proposed_end_time,
            ]
          );
        } else {
          await queryNeon(
            `INSERT INTO intranet_training_slots (
               team_season_id, court_id, weekday, start_time, end_time, notes, is_active
             ) VALUES ($1, $2, $3, $4, $5, $6, true);`,
            [
              prop.team_season_id,
              targetCourtId,
              prop.proposed_weekday,
              prop.proposed_start_time,
              prop.proposed_end_time,
              'Aprobada desde propuesta de horario',
            ]
          );
        }
      }

      await queryNeon(
        `UPDATE intranet_schedule_proposals
         SET status = $2, reviewed_by = $3::uuid, reviewed_at = NOW()
         WHERE id = $1::uuid;`,
        [proposalId, decision, ctx.user.id]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: `RESOLVE_SCHEDULE_PROPOSAL_${decision}`,
        module: 'Estructura',
        targetType: 'SCHEDULE_PROPOSAL',
        targetId: proposalId,
        details: { teamSeasonId: prop.team_season_id, decision, conflictsCount: conflicts.length },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, decision, conflicts });
    }

    // 9. Crear temporada
    if (action === 'create_season') {
      assertCan(ctx, 'season.manage');

      const name = String(body?.name || '').trim();
      const startDate = String(body?.startDate || '').trim();
      const endDate = String(body?.endDate || '').trim();
      const isCurrent = Boolean(body?.isCurrent);

      if (name.length < 4 || !DATE_RE.test(startDate) || !DATE_RE.test(endDate) || startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'Datos de temporada no válidos (nombre y fechas YYYY-MM-DD).' },
          { status: 400 }
        );
      }

      const id = name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

      if (isCurrent) {
        await queryNeon(`UPDATE intranet_seasons SET is_current = false;`);
      }

      await queryNeon(
        `INSERT INTO intranet_seasons (id, name, is_current, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           is_current = EXCLUDED.is_current,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date;`,
        [id, name, isCurrent, startDate, endDate]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_SEASON',
        module: 'Estructura',
        targetType: 'SEASON',
        targetId: id,
        details: { name, startDate, endDate, isCurrent },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, seasonId: id });
    }

    // 10. Activar / desactivar equipo de temporada
    if (action === 'toggle_team') {
      assertCan(ctx, 'season.manage');

      const teamSeasonId = String(body?.teamSeasonId || '').trim();
      const isActive = Boolean(body?.isActive);

      if (!teamSeasonId) {
        return NextResponse.json({ success: false, error: 'Equipo no especificado.' }, { status: 400 });
      }

      const rows = await queryNeon<{ id: string; name: string; is_active: boolean }>(
        `UPDATE intranet_team_seasons
         SET is_active = $2
         WHERE id = $1
         RETURNING id, name, is_active;`,
        [teamSeasonId, isActive]
      );
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Equipo no encontrado.' }, { status: 404 });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'TOGGLE_TEAM_ACTIVE',
        module: 'Estructura',
        targetType: 'TEAM_SEASON',
        targetId: teamSeasonId,
        details: { name: rows[0].name, isActive },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, isActive: rows[0].is_active });
    }

    return NextResponse.json(
      { success: false, error: `Acción no reconocida: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Structure POST');
  }
}
