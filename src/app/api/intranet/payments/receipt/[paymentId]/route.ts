import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { computeAgeInMadrid } from '@/lib/date-utils';
import { decryptDataStrict } from '@/lib/encryption';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { IntranetForbiddenError } from '@/lib/intranet/rbac';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import {
  generatePaymentReceiptPdf,
  getPaymentMethodLabel,
} from '@/lib/intranet/pdf-receipt';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  context: { params: { paymentId: string } }
) {
  try {
    const session = await requireIntranetSession();
    const paymentId = String(context.params?.paymentId || '').trim();
    if (!UUID_REGEX.test(paymentId)) {
      return NextResponse.json(
        { success: false, error: 'Identificador de recibo no válido.' },
        { status: 400 }
      );
    }

    const rows = await queryNeon<{
      id: string;
      athlete_id: string;
      athlete_name: string;
      birth_year: number | null;
      birth_date_enc: string | null;
      team_name: string | null;
      amount: string;
      method: string;
      paid_madrid_date: string;
      reference: string | null;
      receipt_number: string;
      status: string;
      notes: string | null;
      payer_name: string | null;
      payer_email: string | null;
      payment_reference_code: string | null;
      guardian_name: string | null;
      guardian_email: string | null;
    }>(
      `SELECT
         p.id::text, p.athlete_id,
         TRIM(a.first_name || ' ' || a.last_name) AS athlete_name,
         a.birth_year, a.birth_date_enc,
         ts.name AS team_name,
         p.amount::text, p.method, p.paid_madrid_date,
         p.reference, p.receipt_number, p.status, p.notes,
         e.payer_name, e.payer_email, e.payment_reference_code,
         g.full_name AS guardian_name, g.email AS guardian_email
       FROM intranet_payments p
       INNER JOIN intranet_athletes a ON a.id = p.athlete_id
       LEFT JOIN intranet_enrollments e ON e.id = p.enrollment_id
       LEFT JOIN LATERAL (
         SELECT at2.team_season_id
         FROM intranet_athlete_teams at2
         WHERE at2.athlete_id = a.id
         ORDER BY at2.is_primary DESC
         LIMIT 1
       ) pt ON true
       LEFT JOIN intranet_team_seasons ts ON ts.id = pt.team_season_id
       LEFT JOIN LATERAL (
         SELECT g2.full_name, g2.email
         FROM intranet_guardianships g2
         WHERE g2.athlete_id = a.id
         ORDER BY g2.is_primary_payer DESC, g2.created_at ASC
         LIMIT 1
       ) g ON true
       WHERE p.id = $1::uuid
         AND a.status <> 'SHREDDED'
       LIMIT 1;`,
      [paymentId]
    );

    const payment = rows[0];
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Recibo de pago no encontrado.' },
        { status: 404 }
      );
    }

    const hasGlobalPaymentsView =
      session.isPresident ||
      (session.isStaff &&
        session.effectivePermissions['payments.view']?.scope === 'GLOBAL');
    const isOwner = session.ownAthleteId === payment.athlete_id;
    const isGuardian = session.guardianAthleteIds.includes(payment.athlete_id);

    if (!hasGlobalPaymentsView && !isOwner && !isGuardian) {
      throw new IntranetForbiddenError(
        'No tienes autorización para acceder a este recibo de pago.'
      );
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Este cobro fue anulado y no dispone de recibo vigente.' },
        { status: 400 }
      );
    }

    const allocRows = await queryNeon<{
      concept: string;
      allocated_amount: string;
    }>(
      `SELECT c.concept, pa.allocated_amount::text AS allocated_amount
       FROM intranet_payment_allocations pa
       INNER JOIN intranet_charges c ON c.id = pa.charge_id
       WHERE pa.payment_id = $1::uuid
       ORDER BY c.due_madrid_date ASC, c.installment_number ASC;`,
      [paymentId]
    );

    let birthDatePlain: string | null = null;
    if (payment.birth_date_enc) {
      const dec = decryptDataStrict(
        payment.birth_date_enc,
        `${payment.athlete_id}:birth_date_enc`
      );
      if (dec.ok && dec.value) birthDatePlain = dec.value;
    }
    const ageEval = computeAgeInMadrid(birthDatePlain, payment.birth_year);
    const hideGuardianPrivateDetails =
      !hasGlobalPaymentsView && !isGuardian && isOwner && ageEval.isMinor;

    const payerName = hideGuardianPrivateDetails
      ? 'Representante legal'
      : payment.payer_name || payment.guardian_name || payment.athlete_name;
    const payerEmail = hideGuardianPrivateDetails
      ? null
      : payment.payer_email || payment.guardian_email || null;

    const pdfBuffer = generatePaymentReceiptPdf({
      receiptNumber: payment.receipt_number,
      paidMadridDate: payment.paid_madrid_date,
      athleteName: payment.athlete_name,
      teamName: payment.team_name || 'Sin equipo asignado',
      payerName,
      payerEmail,
      methodLabel: getPaymentMethodLabel(payment.method),
      reference: payment.reference || payment.payment_reference_code || null,
      amount: Number(payment.amount),
      items: allocRows.map((a) => ({
        concept: a.concept,
        amount: Number(a.allocated_amount),
      })),
      notes: payment.notes,
    });

    await recordAuditLog({
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'DOWNLOAD_PAYMENT_RECEIPT',
      module: 'Pagos',
      targetType: 'PAYMENT',
      targetId: payment.id,
      details: {
        athleteId: payment.athlete_id,
        receiptNumber: payment.receipt_number,
        viaStaff: hasGlobalPaymentsView,
      },
      ipAddress: getClientIp(req),
    });

    const safeFileRef = payment.receipt_number.replace(/[^A-Za-z0-9._-]/g, '_');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Recibo-${safeFileRef}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Payment Receipt GET');
  }
}
