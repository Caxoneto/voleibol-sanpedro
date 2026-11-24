import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { formatMadridDateString } from '@/lib/date-utils';
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { requireIntranetSession, getPublicBaseUrl } from '@/lib/intranet/auth';
import { can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { refreshOverdueCharges } from '@/lib/intranet/payments';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function addMadridCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function getMadridMonthEnd(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${ym}-${String(lastDay).padStart(2, '0')}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ReminderCandidateRow = {
  charge_id: string;
  athlete_id: string;
  team_season_ids: string[];
  is_demo: boolean;
  athlete_name: string;
  concept: string;
  due_madrid_date: string;
  final_amount: string;
  paid_amount: string;
  status: string;
  payment_reference_code: string;
  payer_name: string;
  payer_email: string | null;
  guardian_email: string | null;
  user_email: string | null;
};

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    let rawBody: Record<string, unknown> = {};
    try {
      const bodyText = await req.text();
      if (bodyText.trim()) {
        const parsed = JSON.parse(bodyText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return NextResponse.json(
            { success: false, error: 'El cuerpo de la petición debe ser un objeto JSON.' },
            { status: 400 }
          );
        }
        rawBody = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo JSON no válido.' },
        { status: 400 }
      );
    }

    const chargeId = typeof rawBody.chargeId === 'string' ? rawBody.chargeId.trim() : '';
    const athleteId = typeof rawBody.athleteId === 'string' ? rawBody.athleteId.trim() : '';
    const mode = typeof rawBody.mode === 'string' ? rawBody.mode.trim() : '';
    const isManualTarget = Boolean(chargeId || athleteId);

    if (chargeId && !UUID_REGEX.test(chargeId)) {
      return NextResponse.json(
        { success: false, error: 'chargeId no tiene un formato UUID válido.' },
        { status: 400 }
      );
    }

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

    if (isManualTarget && isAuthorizedCron) {
      throw new IntranetForbiddenError(
        'Los envíos individuales de aviso requieren sesión autenticada de staff.'
      );
    }

    let staffSession: Awaited<ReturnType<typeof requireIntranetSession>> | null = null;
    let actorUserId: string | null = null;
    let actorEmail = 'cron@voleibolsanpedro.es';

    if (!isAuthorizedCron) {
      staffSession = await requireIntranetSession();
      const canSend =
        staffSession.isPresident ||
        (staffSession.isStaff &&
          (can(staffSession, 'payments.record') || can(staffSession, 'payments.reports')));
      if (!canSend) {
        throw new IntranetForbiddenError(
          'No tienes permisos para enviar recordatorios de pago.'
        );
      }
      actorUserId = staffSession.user.id;
      actorEmail = staffSession.user.email;
    }

    await refreshOverdueCharges();

    const todayMadrid = formatMadridDateString(new Date());
    const currentMadridYm = todayMadrid.slice(0, 7);
    const madridDay = Number(todayMadrid.slice(8, 10));
    const allowDemo = process.env.ALLOW_DEMO_PLAYERS === 'true';
    const bankIban = process.env.CLUB_BANK_IBAN?.trim() || '';
    const publicBaseUrl = getPublicBaseUrl();
    const miClubUrl = `${publicBaseUrl}/mi-club`;

    if (mode === 'monthly_overdue' && madridDay <= 5) {
      return NextResponse.json(
        {
          success: false,
          error: `El envío automático mensual solo está habilitado pasado el día 5 de cada mes (hoy es ${todayMadrid} en Europe/Madrid).`,
        },
        { status: 400 }
      );
    }

    const baseSelect = `
      SELECT
        c.id::text AS charge_id,
        c.athlete_id,
        COALESCE(
          ARRAY(
            SELECT at2.team_season_id
            FROM intranet_athlete_teams at2
            WHERE at2.athlete_id = a.id
            ORDER BY at2.is_primary DESC, at2.team_season_id ASC
          ),
          '{}'::text[]
        ) AS team_season_ids,
        a.is_demo,
        TRIM(a.first_name || ' ' || a.last_name) AS athlete_name,
        c.concept,
        c.due_madrid_date,
        c.final_amount::text,
        c.paid_amount::text,
        c.status,
        e.payment_reference_code,
        e.payer_name,
        e.payer_email,
        g.email AS guardian_email,
        u.email AS user_email
      FROM intranet_charges c
      INNER JOIN intranet_enrollments e ON e.id = c.enrollment_id
      INNER JOIN intranet_athletes a ON a.id = c.athlete_id
      LEFT JOIN intranet_users u ON u.id = a.user_id
      LEFT JOIN LATERAL (
        SELECT g2.email
        FROM intranet_guardianships g2
        WHERE g2.athlete_id = a.id AND g2.email IS NOT NULL
        ORDER BY g2.is_primary_payer DESC, g2.created_at ASC
        LIMIT 1
      ) g ON true
    `;

    let candidates: ReminderCandidateRow[] = [];

    if (chargeId) {
      candidates = await queryNeon<ReminderCandidateRow>(
        `${baseSelect}
         WHERE c.id = $1::uuid
           AND c.status IN ('VENCIDO', 'PENDIENTE', 'PARCIAL')
           AND (c.final_amount - c.paid_amount) > 0
           AND a.status NOT IN ('BAJA', 'SHREDDED')
         LIMIT 1;`,
        [chargeId]
      );
    } else if (athleteId) {
      candidates = await queryNeon<ReminderCandidateRow>(
        `${baseSelect}
         WHERE c.athlete_id = $1
           AND c.status IN ('VENCIDO', 'PENDIENTE', 'PARCIAL')
           AND (c.final_amount - c.paid_amount) > 0
           AND a.status NOT IN ('BAJA', 'SHREDDED')
         ORDER BY c.due_madrid_date ASC;`,
        [athleteId]
      );
    } else if (mode === 'monthly_overdue') {
      const currentMonthEnd = getMadridMonthEnd(currentMadridYm);
      candidates = await queryNeon<ReminderCandidateRow>(
        `${baseSelect}
         WHERE c.status IN ('VENCIDO', 'PENDIENTE', 'PARCIAL')
           AND (c.final_amount - c.paid_amount) > 0
           AND (c.status = 'VENCIDO' OR c.due_madrid_date <= $1)
           AND (
             c.last_reminder_sent_at IS NULL
             OR TO_CHAR(c.last_reminder_sent_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') <> $2
           )
           AND a.status NOT IN ('BAJA', 'SHREDDED')
           AND ($3::boolean = true OR a.is_demo = false)
         ORDER BY c.due_madrid_date ASC;`,
        [currentMonthEnd, currentMadridYm, allowDemo]
      );
    } else {
      const cutoffMadrid = addMadridCalendarDays(todayMadrid, 5);
      candidates = await queryNeon<ReminderCandidateRow>(
        `${baseSelect}
         WHERE c.status IN ('VENCIDO', 'PENDIENTE', 'PARCIAL')
           AND (c.final_amount - c.paid_amount) > 0
           AND c.due_madrid_date <= $1
           AND (c.last_reminder_sent_at IS NULL OR c.last_reminder_sent_at < NOW() - INTERVAL '7 days')
           AND a.status NOT IN ('BAJA', 'SHREDDED')
           AND ($2::boolean = true OR a.is_demo = false)
         ORDER BY c.due_madrid_date ASC;`,
        [cutoffMadrid, allowDemo]
      );
    }

    const hasRowAccess = (row: ReminderCandidateRow): boolean => {
      if (!staffSession || staffSession.isPresident) return true;
      const teamIds = Array.isArray(row.team_season_ids) ? row.team_season_ids : [];
      if (teamIds.length === 0) {
        const hasGlobalRecord =
          staffSession.effectivePermissions['payments.record']?.scope === 'GLOBAL' &&
          can(staffSession, 'payments.record');
        const hasGlobalReports =
          staffSession.effectivePermissions['payments.reports']?.scope === 'GLOBAL' &&
          can(staffSession, 'payments.reports');
        return hasGlobalRecord || hasGlobalReports;
      }
      return teamIds.some(
        (teamSeasonId) =>
          can(staffSession!, 'payments.record', { teamSeasonId }) ||
          can(staffSession!, 'payments.reports', { teamSeasonId })
      );
    };

    if (isManualTarget) {
      if (candidates.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se encontró ningún cargo pendiente o vencido para enviar el aviso.',
          },
          { status: 404 }
        );
      }
      if (staffSession && !staffSession.isPresident) {
        candidates = candidates.filter(hasRowAccess);
        if (candidates.length === 0) {
          throw new IntranetForbiddenError(
            'No tienes permiso para enviar avisos de pago en este equipo.'
          );
        }
      }
      if (chargeId && candidates[0]?.is_demo && !allowDemo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Los perfiles demo tienen bloqueado el envío real de correos salvo ALLOW_DEMO_PLAYERS=true.',
          },
          { status: 400 }
        );
      }
    } else if (!isAuthorizedCron && staffSession && !staffSession.isPresident) {
      candidates = candidates.filter(hasRowAccess);
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let firstError: string | undefined;

    for (const row of candidates) {
      if (isManualTarget && !allowDemo && row.is_demo) {
        skippedCount += 1;
        continue;
      }

      const targetEmail = [row.payer_email, row.guardian_email, row.user_email]
        .map((e) => (e || '').trim().toLowerCase())
        .find((e) => isStrictEmail(e));

      if (!targetEmail) {
        skippedCount += 1;
        continue;
      }

      const pendingAmt = Math.max(
        0,
        Math.round((Number(row.final_amount) - Number(row.paid_amount)) * 100) / 100
      );
      if (pendingAmt <= 0) {
        skippedCount += 1;
        continue;
      }

      const isOverdue = row.status === 'VENCIDO' || row.due_madrid_date < todayMadrid;
      const safeAthlete = stripCrlf(row.athlete_name).slice(0, 90);
      const safeConcept = stripCrlf(row.concept).slice(0, 120);
      const safePayer = stripCrlf(row.payer_name || 'Familia').slice(0, 90);
      const refCode = stripCrlf(row.payment_reference_code);

      const subject = isOverdue
        ? `[CDV San Pedro] Aviso de cuota pendiente · ${safeAthlete}`
        : `[CDV San Pedro] Recordatorio de cuota · ${safeAthlete}`;

      const ibanLine = bankIban
        ? `IBAN del Club: ${bankIban}`
        : `Solicita o confirma el IBAN oficial en Secretaría (${CLUB_INFO.contactEmail}) o en tu Zona de Familias (/mi-club).`;

      const text = [
        `${CLUB_INFO.name} · Área de Tesorería`,
        ``,
        `Hola ${safePayer},`,
        ``,
        isOverdue
          ? `Te informamos que consta un cargo vencido o pendiente de abono para ${safeAthlete}:`
          : `Te recordamos la cuota pendiente correspondiente a ${safeAthlete}:`,
        ``,
        `Concepto: ${safeConcept}`,
        `Fecha de vencimiento: ${row.due_madrid_date}`,
        `Importe pendiente: ${pendingAmt.toFixed(2)} €`,
        `Código de referencia (indicar en transferencia): ${refCode}`,
        ``,
        `Instrucciones de pago:`,
        `- Transferencia bancaria indicando en el concepto "${refCode} - ${safeAthlete}".`,
        `- ${ibanLine}`,
        `- La pasarela de pago online con tarjeta y Bizum (Redsys) se habilitará próximamente.`,
        ``,
        `Puedes consultar tus cuotas y descargar tus recibos en ${miClubUrl}`,
        `Contacto Tesorería / Secretaría: ${CLUB_INFO.contactEmail} · ${CLUB_INFO.contactPhone}`,
      ].join('\n');

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden;">
          <div style="background: #d90429; padding: 18px 24px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)} · Tesorería</div>
            <h2 style="margin: 6px 0 0 0; font-size: 18px;">${isOverdue ? 'Aviso de Cuota Pendiente / Vencida' : 'Recordatorio de Cuota del Club'}</h2>
          </div>
          <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Hola <strong>${escapeHtml(safePayer)}</strong>,</p>
            <p>${
              isOverdue
                ? `Consta una cuota pendiente de abono correspondiente a <strong>${escapeHtml(safeAthlete)}</strong>:`
                : `Te recordamos el abono de la cuota correspondiente a <strong>${escapeHtml(safeAthlete)}</strong>:`
            }</p>
            <div style="background: #f9fafb; border: 1px solid #e4e4e7; border-left: 4px solid #d90429; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
              <div><strong>Concepto:</strong> ${escapeHtml(safeConcept)}</div>
              <div><strong>Fecha de vencimiento:</strong> ${escapeHtml(row.due_madrid_date)}</div>
              <div><strong>Importe pendiente:</strong> <span style="color: #b91c1c; font-weight: bold;">${pendingAmt.toFixed(2)} €</span></div>
              <div><strong>Código de referencia:</strong> <code>${escapeHtml(refCode)}</code></div>
            </div>
            <p style="margin-bottom: 6px;"><strong>Instrucciones para realizar el abono:</strong></p>
            <ul style="margin-top: 0; padding-left: 18px; color: #3f3f46;">
              <li><strong>Transferencia Bancaria:</strong> indica en el concepto <code>${escapeHtml(refCode)}</code>. ${escapeHtml(ibanLine)}</li>
              <li>La pasarela de pago online con tarjeta y Bizum (Redsys) se habilitará próximamente.</li>
            </ul>
            <p style="font-size: 12px; color: #52525b; margin-top: 20px;">
              Consulta el estado de tus cuotas y descarga recibos PDF en <a href="${escapeHtml(miClubUrl)}" style="color: #d90429; font-weight: bold;">${escapeHtml(miClubUrl)}</a>.<br/>
              Si ya realizaste este pago recientemente, por favor ignora este aviso o responde a ${escapeHtml(CLUB_INFO.contactEmail)}.
            </p>
          </div>
        </div>
      `;

      const mailRes = await sendSmtpMail({
        to: targetEmail,
        subject,
        text,
        html,
      });

      if (mailRes.sent) {
        await queryNeon(
          `UPDATE intranet_charges SET last_reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1::uuid;`,
          [row.charge_id]
        );
        sentCount += 1;
      } else {
        failedCount += 1;
        if (!firstError && mailRes.error) firstError = mailRes.error;
      }
    }

    await recordAuditLog({
      actorUserId,
      actorEmail,
      action: 'SEND_PAYMENT_REMINDERS',
      module: 'Pagos',
      targetType: chargeId ? 'CHARGE' : athleteId ? 'ATHLETE' : 'CLUB',
      targetId: chargeId || athleteId || null,
      details: {
        viaCron: isAuthorizedCron,
        mode: chargeId ? 'single_charge' : athleteId ? 'single_athlete' : mode || 'legacy_upcoming',
        totalCandidates: candidates.length,
        sent: sentCount,
        sentCount,
        skippedCount,
        failedCount,
      },
      ipAddress: clientIp,
    });

    if (chargeId && sentCount === 0) {
      if (skippedCount > 0 && failedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'El deportista o pagador no tiene un correo electrónico válido configurado.',
            totalCandidates: candidates.length,
            sentCount,
            skippedCount,
            failedCount,
          },
          { status: 400 }
        );
      }
      if (failedCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error: firstError || 'No se pudo enviar el correo de aviso de pago.',
            totalCandidates: candidates.length,
            sentCount,
            skippedCount,
            failedCount,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      mode: chargeId ? 'single_charge' : athleteId ? 'single_athlete' : mode || 'legacy_upcoming',
      totalCandidates: candidates.length,
      sentCount,
      skippedCount,
      failedCount,
      warning: firstError,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Payment Reminders POST');
  }
}
