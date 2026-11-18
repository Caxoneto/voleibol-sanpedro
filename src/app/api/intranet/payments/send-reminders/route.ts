import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { formatMadridDateString } from '@/lib/date-utils';
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { refreshOverdueCharges } from '@/lib/intranet/payments';

export const dynamic = 'force-dynamic';

function addMadridCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
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

    let actorUserId: string | null = null;
    let actorEmail = 'cron@voleibolsanpedro.es';

    if (!isAuthorizedCron) {
      const session = await requireIntranetSession();
      const canSend =
        session.isPresident ||
        (session.isStaff &&
          (can(session, 'payments.record') || can(session, 'payments.reports')));
      if (!canSend) {
        throw new IntranetForbiddenError(
          'No tienes permisos para enviar recordatorios de pago.'
        );
      }
      actorUserId = session.user.id;
      actorEmail = session.user.email;
    }

    await refreshOverdueCharges();

    const todayMadrid = formatMadridDateString(new Date());
    const cutoffMadrid = addMadridCalendarDays(todayMadrid, 5);
    const allowDemo = process.env.ALLOW_DEMO_PLAYERS === 'true';
    const bankIban = process.env.CLUB_BANK_IBAN?.trim() || '';

    const candidates = await queryNeon<{
      charge_id: string;
      athlete_id: string;
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
    }>(
      `SELECT
         c.id::text AS charge_id,
         c.athlete_id,
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
       WHERE c.status IN ('VENCIDO', 'PENDIENTE', 'PARCIAL')
         AND (c.final_amount - c.paid_amount) > 0
         AND c.due_madrid_date <= $1
         AND (c.last_reminder_sent_at IS NULL OR c.last_reminder_sent_at < NOW() - INTERVAL '7 days')
         AND a.status NOT IN ('BAJA', 'SHREDDED')
         AND ($2::boolean = true OR a.is_demo = false)
       ORDER BY c.due_madrid_date ASC;`,
      [cutoffMadrid, allowDemo]
    );

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let firstError: string | undefined;

    for (const row of candidates) {
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
        ? `[CDV San Pedro] Aviso de cuota vencida · ${safeAthlete}`
        : `[CDV San Pedro] Recordatorio de próximo vencimiento · ${safeAthlete}`;

      const ibanLine = bankIban
        ? `IBAN del Club: ${bankIban}`
        : `Solicita o confirma el IBAN oficial en Secretaría (${CLUB_INFO.contactEmail}) o en tu Zona de Familias (/mi-club).`;

      const text = [
        `${CLUB_INFO.name} · Área de Tesorería`,
        ``,
        `Hola ${safePayer},`,
        ``,
        isOverdue
          ? `Te informamos que consta un cargo vencido pendiente de abono para ${safeAthlete}:`
          : `Te recordamos que se aproxima la fecha de vencimiento de la siguiente cuota de ${safeAthlete}:`,
        ``,
        `Concepto: ${safeConcept}`,
        `Fecha de vencimiento: ${row.due_madrid_date}`,
        `Importe pendiente: ${pendingAmt.toFixed(2)} €`,
        `Código de referencia (indicar en transferencia): ${refCode}`,
        ``,
        `Instrucciones de pago:`,
        `- Transferencia bancaria indicando en el concepto "${refCode} - ${safeAthlete}".`,
        `- ${ibanLine}`,
        `- También puedes abonar en Efectivo o TPV Físico en la oficina/pabellón del club.`,
        ``,
        `Puedes consultar tus cuotas y descargar tus recibos en https://voleibolsanpedro.es/mi-club`,
        `Contacto Tesorería / Secretaría: ${CLUB_INFO.contactEmail} · ${CLUB_INFO.contactPhone}`,
      ].join('\n');

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden;">
          <div style="background: #d90429; padding: 18px 24px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)} · Tesorería</div>
            <h2 style="margin: 6px 0 0 0; font-size: 18px;">${isOverdue ? 'Aviso de Cuota Vencida' : 'Recordatorio de Vencimiento de Cuota'}</h2>
          </div>
          <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Hola <strong>${escapeHtml(safePayer)}</strong>,</p>
            <p>${
              isOverdue
                ? `Consta una cuota vencida pendiente de abono correspondiente a <strong>${escapeHtml(safeAthlete)}</strong>:`
                : `Te recordamos el próximo vencimiento de cuota correspondiente a <strong>${escapeHtml(safeAthlete)}</strong>:`
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
              <li><strong>En el Club:</strong> Efectivo o TPV Físico en horarios de Secretaría/Tesorería.</li>
            </ul>
            <p style="font-size: 12px; color: #52525b; margin-top: 20px;">
              Consulta el estado de tus cuotas y descarga recibos PDF en <strong>voleibolsanpedro.es/mi-club</strong>.<br/>
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
      details: {
        viaCron: isAuthorizedCron,
        totalCandidates: candidates.length,
        sentCount,
        skippedCount,
        failedCount,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
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
