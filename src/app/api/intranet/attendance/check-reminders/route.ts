import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limiter';
import { getAuthorizedTeamScope, can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { runAttendanceRemindersCheck } from '@/lib/intranet/attendance-reminders';

export const dynamic = 'force-dynamic';

async function handleCheckReminders(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    const cronHeader = req.headers.get('x-cron-secret')?.trim() || '';
    const configuredCronSecret = process.env.NETLIFY_CRON_SECRET?.trim() || '';
    let isAuthorizedCron = false;
    if (cronHeader && configuredCronSecret) {
      const hBuf = Buffer.from(cronHeader, 'utf8');
      const sBuf = Buffer.from(configuredCronSecret, 'utf8');
      if (hBuf.length === sBuf.length && crypto.timingSafeEqual(hBuf, sBuf)) {
        isAuthorizedCron = true;
      }
    }

    if (cronHeader.length > 0 && !isAuthorizedCron) {
      return NextResponse.json(
        { success: false, error: 'Secreto cron inválido.' },
        { status: 401 }
      );
    }

    let actorUserId: string | null = null;
    let actorEmail = 'cron@voleibolsanpedro.es';
    let targetTeamIds: string[] | null = null;

    if (!isAuthorizedCron) {
      const session = await requireIntranetSession();
      const canCheck = session.isPresident || can(session, 'attendance.reports');
      if (!canCheck) {
        throw new IntranetForbiddenError(
          'No tienes permisos para comprobar avisos de asistencia.'
        );
      }
      actorUserId = session.user.id;
      actorEmail = session.user.email;

      const scope = getAuthorizedTeamScope(session, 'attendance.reports');
      if (!scope.isGlobal) {
        targetTeamIds = scope.teamIds;
      }
    }

    const result = await runAttendanceRemindersCheck({
      actorUserId,
      actorEmail,
      targetTeamIds,
      clientIp,
      viaCron: isAuthorizedCron,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Attendance Check Reminders');
  }
}

export async function POST(req: NextRequest) {
  return handleCheckReminders(req);
}
