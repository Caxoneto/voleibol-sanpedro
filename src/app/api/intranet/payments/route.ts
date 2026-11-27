import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { formatMadridDateString } from '@/lib/date-utils';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { assertCan, can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import {
  CURRENT_SEASON_SEED,
  type PermissionCode,
} from '@/lib/intranet/catalog';
import {
  createAthleteEnrollment,
  recordManualPayment,
  refreshOverdueCharges,
  voidRecordedPayment,
} from '@/lib/intranet/payments';
import { getPaymentMethodLabel } from '@/lib/intranet/pdf-receipt';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCT_TYPES = new Set([
  'SEASON_FEE',
  'REGISTRATION',
  'LICENSE',
  'KIT',
  'CAMP_TOURNAMENT',
  'OTHER',
]);
const PERIODICITIES = new Set(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']);
const PRORATION_MODES = new Set(['NONE', 'BY_REMAINING_MONTHS', 'BY_DAYS']);
const DISCOUNT_KINDS = new Set([
  'SIBLING',
  'EARLY_ANNUAL',
  'LARGE_FAMILY',
  'SCHOLARSHIP',
  'STAFF_CHILD',
  'CUSTOM',
]);
const VALUE_TYPES = new Set(['PERCENTAGE', 'FIXED']);
const MANUAL_METHODS = new Set(['CASH', 'BANK_TRANSFER', 'POS_TERMINAL']);

const READ_PAYMENTS_PERMS: PermissionCode[] = [
  'payments.view',
  'payments.record',
  'products.manage',
  'discounts.manage',
  'payments.reports',
];

function assertStaffTreasuryRead(session: Awaited<ReturnType<typeof requireIntranetSession>>) {
  if (session.isPresident) return;
  const ok =
    session.isStaff &&
    READ_PAYMENTS_PERMS.some((perm) => {
      const grant = session.effectivePermissions[perm];
      return Boolean(grant && grant.scope !== 'PROPIO' && can(session, perm));
    });
  if (!ok) {
    throw new IntranetForbiddenError(
      'No tienes permisos de tesorería para acceder a la gestión de pagos.'
    );
  }
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysBetweenYmd(laterYmd: string, earlierYmd: string): number {
  const [y1, m1, d1] = laterYmd.split('-').map(Number);
  const [y2, m2, d2] = earlierYmd.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc1 - utc2) / 86_400_000);
}

export async function GET() {
  try {
    await ensureIntranetSeeded();
    const session = await requireIntranetSession();
    assertStaffTreasuryRead(session);

    await refreshOverdueCharges();

    const allowDemo = process.env.ALLOW_DEMO_PLAYERS === 'true';
    const todayMadrid = formatMadridDateString(new Date());

    const [
      productRows,
      planRows,
      discountRows,
      enrollmentRows,
      appliedDiscountRows,
      chargeRows,
      paymentRows,
      teamRows,
      athleteRows,
    ] = await Promise.all([
      queryNeon<{
        id: string;
        season_id: string;
        name: string;
        product_type: string;
        is_recurring: boolean;
        applicable_team_ids: string[];
        description: string | null;
        is_active: boolean;
        created_at: string;
      }>(
        `SELECT id::text, season_id, name, product_type, is_recurring,
                COALESCE(applicable_team_ids, '{}'::text[]) AS applicable_team_ids,
                description, is_active, created_at::text
         FROM intranet_products
         ORDER BY is_active DESC, created_at DESC;`
      ),
      queryNeon<{
        id: string;
        product_id: string;
        name: string;
        periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
        total_amount: string;
        installments_count: number;
        due_day: number;
        active_months: number[];
        proration_mode: 'NONE' | 'BY_REMAINING_MONTHS' | 'BY_DAYS';
        initial_fee_amount: string;
        is_active: boolean;
      }>(
        `SELECT id::text, product_id::text, name, periodicity, total_amount::text,
                installments_count, due_day,
                COALESCE(active_months, '{9,10,11,12,1,2,3,4,5}'::integer[]) AS active_months,
                proration_mode, initial_fee_amount::text, is_active
         FROM intranet_price_plans
         ORDER BY is_active DESC, name ASC;`
      ),
      queryNeon<{
        id: string;
        season_id: string;
        name: string;
        kind: string;
        value_type: 'PERCENTAGE' | 'FIXED';
        value: string;
        applicable_product_ids: string[];
        stackable: boolean;
        max_discount_amount: string | null;
        requires_reason: boolean;
        is_active: boolean;
        created_at: string;
      }>(
        `SELECT id::text, season_id, name, kind, value_type, value::text,
                COALESCE(applicable_product_ids, '{}'::uuid[])::text[] AS applicable_product_ids,
                stackable, max_discount_amount::text, requires_reason, is_active, created_at::text
         FROM intranet_discount_rules
         ORDER BY is_active DESC, name ASC;`
      ),
      queryNeon<{
        id: string;
        athlete_id: string;
        athlete_name: string;
        team_id: string | null;
        team_name: string | null;
        product_id: string;
        product_name: string;
        price_plan_id: string;
        plan_name: string;
        periodicity: string;
        season_id: string;
        payer_name: string;
        payer_email: string | null;
        payment_reference_code: string;
        status: string;
        notes: string | null;
        created_at: string;
      }>(
        `SELECT
           e.id::text, e.athlete_id,
           TRIM(a.first_name || ' ' || a.last_name) AS athlete_name,
           pt.team_season_id AS team_id,
           ts.name AS team_name,
           e.product_id::text, p.name AS product_name,
           e.price_plan_id::text, pp.name AS plan_name, pp.periodicity,
           e.season_id, e.payer_name, e.payer_email,
           e.payment_reference_code, e.status, e.notes, e.created_at::text
         FROM intranet_enrollments e
         INNER JOIN intranet_athletes a ON a.id = e.athlete_id
         INNER JOIN intranet_products p ON p.id = e.product_id
         INNER JOIN intranet_price_plans pp ON pp.id = e.price_plan_id
         LEFT JOIN LATERAL (
           SELECT at2.team_season_id
           FROM intranet_athlete_teams at2
           WHERE at2.athlete_id = a.id
           ORDER BY at2.is_primary DESC
           LIMIT 1
         ) pt ON true
         LEFT JOIN intranet_team_seasons ts ON ts.id = pt.team_season_id
         WHERE a.status <> 'SHREDDED'
           AND ($1::boolean = true OR a.is_demo = false)
         ORDER BY e.created_at DESC;`,
        [allowDemo]
      ),
      queryNeon<{
        enrollment_id: string;
        discount_rule_id: string | null;
        label: string;
        value_type: string;
        value: string;
        computed_amount: string;
        reason: string | null;
      }>(
        `SELECT enrollment_id::text, discount_rule_id::text, label, value_type,
                value::text, computed_amount::text, reason
         FROM intranet_applied_discounts;`
      ),
      queryNeon<{
        id: string;
        enrollment_id: string;
        athlete_id: string;
        athlete_name: string;
        team_id: string | null;
        team_name: string | null;
        payment_reference_code: string;
        product_name: string;
        installment_number: number;
        concept: string;
        due_madrid_date: string;
        base_amount: string;
        discount_amount: string;
        final_amount: string;
        paid_amount: string;
        status: string;
        origin: string;
        last_reminder_sent_at: string | null;
      }>(
        `SELECT
           c.id::text, c.enrollment_id::text, c.athlete_id,
           TRIM(a.first_name || ' ' || a.last_name) AS athlete_name,
           pt.team_season_id AS team_id,
           ts.name AS team_name,
           e.payment_reference_code,
           pr.name AS product_name,
           c.installment_number, c.concept, c.due_madrid_date,
           c.base_amount::text, c.discount_amount::text, c.final_amount::text,
           c.paid_amount::text, c.status, c.origin, c.last_reminder_sent_at::text
         FROM intranet_charges c
         INNER JOIN intranet_enrollments e ON e.id = c.enrollment_id
         INNER JOIN intranet_products pr ON pr.id = e.product_id
         INNER JOIN intranet_athletes a ON a.id = c.athlete_id
         LEFT JOIN LATERAL (
           SELECT at2.team_season_id
           FROM intranet_athlete_teams at2
           WHERE at2.athlete_id = a.id
           ORDER BY at2.is_primary DESC
           LIMIT 1
         ) pt ON true
         LEFT JOIN intranet_team_seasons ts ON ts.id = pt.team_season_id
         WHERE a.status <> 'SHREDDED'
           AND ($1::boolean = true OR a.is_demo = false)
         ORDER BY c.due_madrid_date ASC, athlete_name ASC, c.installment_number ASC;`,
        [allowDemo]
      ),
      queryNeon<{
        id: string;
        athlete_id: string;
        athlete_name: string;
        team_id: string | null;
        team_name: string | null;
        enrollment_id: string | null;
        amount: string;
        method: string;
        paid_madrid_date: string;
        reference: string | null;
        receipt_number: string;
        status: string;
        origin: string;
        notes: string | null;
        void_reason: string | null;
        created_at: string;
      }>(
        `SELECT
           p.id::text, p.athlete_id,
           TRIM(a.first_name || ' ' || a.last_name) AS athlete_name,
           pt.team_season_id AS team_id,
           ts.name AS team_name,
           p.enrollment_id::text, p.amount::text, p.method,
           p.paid_madrid_date, p.reference, p.receipt_number,
           p.status, p.origin, p.notes, p.void_reason, p.created_at::text
         FROM intranet_payments p
         INNER JOIN intranet_athletes a ON a.id = p.athlete_id
         LEFT JOIN LATERAL (
           SELECT at2.team_season_id
           FROM intranet_athlete_teams at2
           WHERE at2.athlete_id = a.id
           ORDER BY at2.is_primary DESC
           LIMIT 1
         ) pt ON true
         LEFT JOIN intranet_team_seasons ts ON ts.id = pt.team_season_id
         WHERE a.status <> 'SHREDDED'
           AND ($1::boolean = true OR a.is_demo = false)
         ORDER BY p.paid_madrid_date DESC, p.created_at DESC;`,
        [allowDemo]
      ),
      queryNeon<{
        id: string;
        name: string;
        division: string;
        association: string;
      }>(
        `SELECT id, name, division, association
         FROM intranet_team_seasons
         WHERE is_active = true
         ORDER BY sort_order ASC, name ASC;`
      ),
      queryNeon<{
        id: string;
        first_name: string;
        last_name: string;
        status: string;
        team_id: string | null;
        team_name: string | null;
        guardian_name: string | null;
        guardian_email: string | null;
      }>(
        `SELECT
           a.id, a.first_name, a.last_name, a.status,
           pt.team_season_id AS team_id,
           ts.name AS team_name,
           g.full_name AS guardian_name,
           g.email AS guardian_email
         FROM intranet_athletes a
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
         WHERE a.status NOT IN ('BAJA', 'SHREDDED')
           AND ($1::boolean = true OR a.is_demo = false)
         ORDER BY a.last_name ASC, a.first_name ASC;`,
        [allowDemo]
      ),
    ]);

    const plansByProduct = new Map<string, Array<Record<string, unknown>>>();
    for (const pl of planRows) {
      const list = plansByProduct.get(pl.product_id) || [];
      list.push({
        id: pl.id,
        productId: pl.product_id,
        name: pl.name,
        periodicity: pl.periodicity,
        totalAmount: Number(pl.total_amount),
        installmentsCount: pl.installments_count,
        dueDay: pl.due_day,
        activeMonths: pl.active_months,
        prorationMode: pl.proration_mode,
        initialFeeAmount: Number(pl.initial_fee_amount),
        isActive: pl.is_active,
      });
      plansByProduct.set(pl.product_id, list);
    }

    const products = productRows.map((p) => ({
      id: p.id,
      seasonId: p.season_id,
      name: p.name,
      productType: p.product_type,
      isRecurring: p.is_recurring,
      applicableTeamIds: p.applicable_team_ids,
      description: p.description,
      isActive: p.is_active,
      createdAt: p.created_at,
      pricePlans: plansByProduct.get(p.id) || [],
    }));

    const discountRules = discountRows.map((d) => ({
      id: d.id,
      seasonId: d.season_id,
      name: d.name,
      kind: d.kind,
      valueType: d.value_type,
      value: Number(d.value),
      applicableProductIds: d.applicable_product_ids,
      stackable: d.stackable,
      maxDiscountAmount: d.max_discount_amount ? Number(d.max_discount_amount) : null,
      requiresReason: d.requires_reason,
      isActive: d.is_active,
      createdAt: d.created_at,
    }));

    const discountsByEnrollment = new Map<string, Array<Record<string, unknown>>>();
    for (const ad of appliedDiscountRows) {
      const list = discountsByEnrollment.get(ad.enrollment_id) || [];
      list.push({
        discountRuleId: ad.discount_rule_id,
        label: ad.label,
        valueType: ad.value_type,
        value: Number(ad.value),
        computedAmount: Number(ad.computed_amount),
        reason: ad.reason,
      });
      discountsByEnrollment.set(ad.enrollment_id, list);
    }

    const enrollments = enrollmentRows.map((e) => ({
      id: e.id,
      athleteId: e.athlete_id,
      athleteName: e.athlete_name,
      teamId: e.team_id,
      teamName: e.team_name || 'Sin equipo asignado',
      productId: e.product_id,
      productName: e.product_name,
      pricePlanId: e.price_plan_id,
      planName: e.plan_name,
      periodicity: e.periodicity,
      seasonId: e.season_id,
      payerName: e.payer_name,
      payerEmail: e.payer_email,
      paymentReferenceCode: e.payment_reference_code,
      status: e.status,
      notes: e.notes,
      createdAt: e.created_at,
      appliedDiscounts: discountsByEnrollment.get(e.id) || [],
    }));

    const charges = chargeRows.map((c) => {
      const finalAmt = Number(c.final_amount);
      const paidAmt = Number(c.paid_amount);
      const pendingAmt =
        c.status === 'ANULADO' || c.status === 'CONDONADO'
          ? 0
          : roundMoney(Math.max(0, finalAmt - paidAmt));
      return {
        id: c.id,
        enrollmentId: c.enrollment_id,
        athleteId: c.athlete_id,
        athleteName: c.athlete_name,
        teamId: c.team_id,
        teamName: c.team_name || 'Sin equipo asignado',
        paymentReferenceCode: c.payment_reference_code,
        productName: c.product_name,
        installmentNumber: c.installment_number,
        concept: c.concept,
        dueMadridDate: c.due_madrid_date,
        baseAmount: Number(c.base_amount),
        discountAmount: Number(c.discount_amount),
        finalAmount: finalAmt,
        paidAmount: paidAmt,
        pendingAmount: pendingAmt,
        status: c.status,
        origin: c.origin,
        lastReminderSentAt: c.last_reminder_sent_at,
      };
    });

    const payments = paymentRows.map((p) => ({
      id: p.id,
      athleteId: p.athlete_id,
      athleteName: p.athlete_name,
      teamId: p.team_id,
      teamName: p.team_name || 'Sin equipo asignado',
      enrollmentId: p.enrollment_id,
      amount: Number(p.amount),
      method: p.method,
      methodLabel: getPaymentMethodLabel(p.method),
      paidMadridDate: p.paid_madrid_date,
      reference: p.reference,
      receiptNumber: p.receipt_number,
      status: p.status,
      origin: p.origin,
      notes: p.notes,
      voidReason: p.void_reason,
      createdAt: p.created_at,
    }));

    // Calcular informes económicos agregados
    let totalExpected = 0;
    let totalCollectedFromCharges = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let totalDiscountsApplied = 0;
    let totalWaived = 0;

    const agingMap = {
      '0-30 días': { bucket: '0-30 días', count: 0, amount: 0 },
      '31-60 días': { bucket: '31-60 días', count: 0, amount: 0 },
      '+60 días': { bucket: '+60 días', count: 0, amount: 0 },
    };

    const monthMap = new Map<
      string,
      { month: string; expected: number; collected: number; pending: number; overdue: number }
    >();
    const ensureMonth = (m: string) => {
      let item = monthMap.get(m);
      if (!item) {
        item = { month: m, expected: 0, collected: 0, pending: 0, overdue: 0 };
        monthMap.set(m, item);
      }
      return item;
    };

    const teamReportMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        expected: number;
        collected: number;
        pending: number;
        overdue: number;
        athletes: Set<string>;
      }
    >();
    const ensureTeamReport = (teamId: string | null, teamName: string) => {
      const key = teamId || 'sin-equipo';
      let item = teamReportMap.get(key);
      if (!item) {
        item = {
          teamId: key,
          teamName,
          expected: 0,
          collected: 0,
          pending: 0,
          overdue: 0,
          athletes: new Set(),
        };
        teamReportMap.set(key, item);
      }
      return item;
    };

    for (const c of charges) {
      if (c.status === 'ANULADO') continue;
      totalDiscountsApplied = roundMoney(totalDiscountsApplied + c.discountAmount);
      if (c.status === 'CONDONADO') {
        totalWaived = roundMoney(totalWaived + c.finalAmount);
        continue;
      }

      totalExpected = roundMoney(totalExpected + c.finalAmount);
      totalCollectedFromCharges = roundMoney(totalCollectedFromCharges + c.paidAmount);
      totalPending = roundMoney(totalPending + c.pendingAmount);

      const mKey = c.dueMadridDate.slice(0, 7) || 'Sin fecha';
      const mEntry = ensureMonth(mKey);
      mEntry.expected = roundMoney(mEntry.expected + c.finalAmount);
      mEntry.pending = roundMoney(mEntry.pending + c.pendingAmount);

      const tEntry = ensureTeamReport(c.teamId, c.teamName);
      tEntry.athletes.add(c.athleteId);
      tEntry.expected = roundMoney(tEntry.expected + c.finalAmount);
      tEntry.collected = roundMoney(tEntry.collected + c.paidAmount);
      tEntry.pending = roundMoney(tEntry.pending + c.pendingAmount);

      if (c.status === 'VENCIDO' && c.pendingAmount > 0) {
        totalOverdue = roundMoney(totalOverdue + c.pendingAmount);
        mEntry.overdue = roundMoney(mEntry.overdue + c.pendingAmount);
        tEntry.overdue = roundMoney(tEntry.overdue + c.pendingAmount);

        const diffDays = Math.max(0, daysBetweenYmd(todayMadrid, c.dueMadridDate));
        if (diffDays <= 30) {
          agingMap['0-30 días'].count += 1;
          agingMap['0-30 días'].amount = roundMoney(agingMap['0-30 días'].amount + c.pendingAmount);
        } else if (diffDays <= 60) {
          agingMap['31-60 días'].count += 1;
          agingMap['31-60 días'].amount = roundMoney(agingMap['31-60 días'].amount + c.pendingAmount);
        } else {
          agingMap['+60 días'].count += 1;
          agingMap['+60 días'].amount = roundMoney(agingMap['+60 días'].amount + c.pendingAmount);
        }
      }
    }

    let totalCollected = 0;
    const methodMap = new Map<string, { method: string; label: string; count: number; amount: number }>();

    for (const p of payments) {
      if (p.status !== 'COMPLETED') continue;
      totalCollected = roundMoney(totalCollected + p.amount);

      const mKey = p.paidMadridDate.slice(0, 7) || 'Sin fecha';
      const mEntry = ensureMonth(mKey);
      mEntry.collected = roundMoney(mEntry.collected + p.amount);

      const methodEntry = methodMap.get(p.method) || {
        method: p.method,
        label: p.methodLabel,
        count: 0,
        amount: 0,
      };
      methodEntry.count += 1;
      methodEntry.amount = roundMoney(methodEntry.amount + p.amount);
      methodMap.set(p.method, methodEntry);
    }

    const reports = {
      totalExpected,
      totalCollected: totalCollected > 0 ? totalCollected : totalCollectedFromCharges,
      totalPending,
      totalOverdue,
      totalWaived,
      totalDiscountsApplied,
      overdueAging: [
        agingMap['0-30 días'],
        agingMap['31-60 días'],
        agingMap['+60 días'],
      ],
      byMonth: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      byMethod: Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount),
      byTeam: Array.from(teamReportMap.values())
        .map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          expected: t.expected,
          collected: t.collected,
          pending: t.pending,
          overdue: t.overdue,
          athletesCount: t.athletes.size,
        }))
        .sort((a, b) => b.expected - a.expected),
    };

    const athletes = athleteRows.map((a) => ({
      id: a.id,
      name: `${a.first_name} ${a.last_name}`.trim(),
      status: a.status,
      teamId: a.team_id,
      teamName: a.team_name || 'Sin equipo asignado',
      guardianName: a.guardian_name,
      guardianEmail: a.guardian_email,
    }));

    return NextResponse.json({
      success: true,
      currentSeasonId: CURRENT_SEASON_SEED.id,
      todayMadrid,
      products,
      discountRules,
      enrollments,
      charges,
      payments,
      teams: teamRows,
      athletes,
      reports,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Payments GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const session = await requireIntranetSession();
    const clientIp = getClientIp(req);
    const body = await req.json();
    const action = String(body?.action || '').trim();

    if (action === 'upsert_product') {
      assertCan(session, 'products.manage');
      const id = body?.id ? String(body.id).trim() : null;
      if (id && !UUID_REGEX.test(id)) {
        return NextResponse.json({ success: false, error: 'ID de producto no válido.' }, { status: 400 });
      }
      const seasonId = String(body?.seasonId || CURRENT_SEASON_SEED.id).trim();
      const name = String(body?.name || '').trim();
      const productType = String(body?.productType || 'SEASON_FEE').trim();
      const isRecurring = Boolean(body?.isRecurring ?? true);
      const applicableTeamIds = Array.isArray(body?.applicableTeamIds)
        ? body.applicableTeamIds.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [];
      const description = body?.description ? String(body.description).trim().slice(0, 500) : null;
      const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;

      if (!name || !PRODUCT_TYPES.has(productType)) {
        return NextResponse.json(
          { success: false, error: 'Nombre y tipo de producto válidos son obligatorios.' },
          { status: 400 }
        );
      }

      let productId = id;
      if (id) {
        const updated = await queryNeon<{ id: string }>(
          `UPDATE intranet_products
           SET season_id = $2, name = $3, product_type = $4, is_recurring = $5,
               applicable_team_ids = $6::text[], description = $7, is_active = $8
           WHERE id = $1::uuid
           RETURNING id::text AS id;`,
          [id, seasonId, name, productType, isRecurring, applicableTeamIds, description, isActive]
        );
        if (updated.length === 0) {
          return NextResponse.json({ success: false, error: 'Producto no encontrado.' }, { status: 404 });
        }
      } else {
        const inserted = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_products (
             season_id, name, product_type, is_recurring, applicable_team_ids, description, is_active
           ) VALUES ($1, $2, $3, $4, $5::text[], $6, $7)
           RETURNING id::text AS id;`,
          [seasonId, name, productType, isRecurring, applicableTeamIds, description, isActive]
        );
        productId = inserted[0].id;
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'UPSERT_PRODUCT',
        module: 'Pagos',
        targetType: 'PRODUCT',
        targetId: productId,
        details: { name, productType, seasonId, isActive },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, productId });
    }

    if (action === 'upsert_price_plan') {
      assertCan(session, 'products.manage');
      const id = body?.id ? String(body.id).trim() : null;
      const productId = String(body?.productId || '').trim();
      if ((id && !UUID_REGEX.test(id)) || !UUID_REGEX.test(productId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de producto o modalidad no válido.' },
          { status: 400 }
        );
      }

      const name = String(body?.name || '').trim();
      const periodicity = String(body?.periodicity || 'MONTHLY').trim();
      const totalAmount = roundMoney(Number(body?.totalAmount ?? 0));
      const installmentsCount = Math.min(Math.max(1, Number(body?.installmentsCount || 1)), 24);
      const dueDay = Math.min(Math.max(1, Number(body?.dueDay || 5)), 28);
      const activeMonthsRaw = Array.isArray(body?.activeMonths)
        ? body.activeMonths.map(Number).filter((m: number) => Number.isInteger(m) && m >= 1 && m <= 12)
        : [9, 10, 11, 12, 1, 2, 3, 4, 5];
      const activeMonths = activeMonthsRaw.length > 0 ? activeMonthsRaw : [9, 10, 11, 12, 1, 2, 3, 4, 5];
      const prorationMode = String(body?.prorationMode || 'NONE').trim();
      const initialFeeAmount = roundMoney(Math.max(0, Number(body?.initialFeeAmount ?? 0)));
      const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;

      if (!name || !PERIODICITIES.has(periodicity) || !PRORATION_MODES.has(prorationMode) || totalAmount < 0) {
        return NextResponse.json(
          { success: false, error: 'Datos de modalidad de pago no válidos.' },
          { status: 400 }
        );
      }

      let planId = id;
      if (id) {
        const updated = await queryNeon<{ id: string }>(
          `UPDATE intranet_price_plans
           SET product_id = $2::uuid, name = $3, periodicity = $4, total_amount = $5,
               installments_count = $6, due_day = $7, active_months = $8::integer[],
               proration_mode = $9, initial_fee_amount = $10, is_active = $11
           WHERE id = $1::uuid
           RETURNING id::text AS id;`,
          [
            id,
            productId,
            name,
            periodicity,
            totalAmount,
            installmentsCount,
            dueDay,
            activeMonths,
            prorationMode,
            initialFeeAmount,
            isActive,
          ]
        );
        if (updated.length === 0) {
          return NextResponse.json({ success: false, error: 'Modalidad no encontrada.' }, { status: 404 });
        }
      } else {
        const inserted = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_price_plans (
             product_id, name, periodicity, total_amount, installments_count, due_day,
             active_months, proration_mode, initial_fee_amount, is_active
           ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::integer[], $8, $9, $10)
           RETURNING id::text AS id;`,
          [
            productId,
            name,
            periodicity,
            totalAmount,
            installmentsCount,
            dueDay,
            activeMonths,
            prorationMode,
            initialFeeAmount,
            isActive,
          ]
        );
        planId = inserted[0].id;
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'UPSERT_PRICE_PLAN',
        module: 'Pagos',
        targetType: 'PRICE_PLAN',
        targetId: planId,
        details: { productId, name, periodicity, totalAmount, dueDay, prorationMode },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, planId });
    }

    if (action === 'upsert_discount_rule') {
      assertCan(session, 'discounts.manage');
      const id = body?.id ? String(body.id).trim() : null;
      if (id && !UUID_REGEX.test(id)) {
        return NextResponse.json({ success: false, error: 'ID de descuento no válido.' }, { status: 400 });
      }
      const seasonId = String(body?.seasonId || CURRENT_SEASON_SEED.id).trim();
      const name = String(body?.name || '').trim();
      const kind = String(body?.kind || 'CUSTOM').trim();
      const valueType = String(body?.valueType || 'PERCENTAGE').trim();
      const value = roundMoney(Number(body?.value ?? 0));
      const applicableProductIds = Array.isArray(body?.applicableProductIds)
        ? body.applicableProductIds
            .map((pid: unknown) => String(pid).trim())
            .filter((pid: string) => UUID_REGEX.test(pid))
        : [];
      const stackable = Boolean(body?.stackable ?? false);
      const maxDiscountAmount =
        body?.maxDiscountAmount !== null && body?.maxDiscountAmount !== undefined && body?.maxDiscountAmount !== ''
          ? roundMoney(Math.max(0, Number(body.maxDiscountAmount)))
          : null;
      const requiresReason = Boolean(body?.requiresReason ?? false);
      const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;

      if (!name || !DISCOUNT_KINDS.has(kind) || !VALUE_TYPES.has(valueType) || value <= 0) {
        return NextResponse.json(
          { success: false, error: 'Nombre, tipo y valor positivo del descuento son obligatorios.' },
          { status: 400 }
        );
      }
      if (valueType === 'PERCENTAGE' && value > 100) {
        return NextResponse.json(
          { success: false, error: 'Un descuento porcentual no puede superar el 100%.' },
          { status: 400 }
        );
      }

      let ruleId = id;
      if (id) {
        const updated = await queryNeon<{ id: string }>(
          `UPDATE intranet_discount_rules
           SET season_id = $2, name = $3, kind = $4, value_type = $5, value = $6,
               applicable_product_ids = $7::uuid[], stackable = $8, max_discount_amount = $9,
               requires_reason = $10, is_active = $11
           WHERE id = $1::uuid
           RETURNING id::text AS id;`,
          [
            id,
            seasonId,
            name,
            kind,
            valueType,
            value,
            applicableProductIds,
            stackable,
            maxDiscountAmount,
            requiresReason,
            isActive,
          ]
        );
        if (updated.length === 0) {
          return NextResponse.json({ success: false, error: 'Regla de descuento no encontrada.' }, { status: 404 });
        }
      } else {
        const inserted = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_discount_rules (
             season_id, name, kind, value_type, value, applicable_product_ids,
             stackable, max_discount_amount, requires_reason, is_active
           ) VALUES ($1, $2, $3, $4, $5, $6::uuid[], $7, $8, $9, $10)
           RETURNING id::text AS id;`,
          [
            seasonId,
            name,
            kind,
            valueType,
            value,
            applicableProductIds,
            stackable,
            maxDiscountAmount,
            requiresReason,
            isActive,
          ]
        );
        ruleId = inserted[0].id;
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'UPSERT_DISCOUNT_RULE',
        module: 'Pagos',
        targetType: 'DISCOUNT_RULE',
        targetId: ruleId,
        details: { name, kind, valueType, value, stackable, isActive },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, ruleId });
    }

    if (action === 'toggle_discount_rule') {
      assertCan(session, 'discounts.manage');
      const id = String(body?.id || '').trim();
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ success: false, error: 'ID de descuento no válido.' }, { status: 400 });
      }
      const isActive = Boolean(body?.isActive);
      const updated = await queryNeon<{ id: string; name: string }>(
        `UPDATE intranet_discount_rules SET is_active = $2 WHERE id = $1::uuid RETURNING id::text, name;`,
        [id, isActive]
      );
      if (updated.length === 0) {
        return NextResponse.json({ success: false, error: 'Regla de descuento no encontrada.' }, { status: 404 });
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'TOGGLE_DISCOUNT_RULE',
        module: 'Pagos',
        targetType: 'DISCOUNT_RULE',
        targetId: id,
        details: { name: updated[0].name, isActive },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'create_enrollment') {
      if (!can(session, 'payments.record') && !can(session, 'discounts.apply')) {
        assertCan(session, 'payments.record');
      }
      const athleteId = String(body?.athleteId || '').trim();
      const productId = String(body?.productId || '').trim();
      const pricePlanId = String(body?.pricePlanId || '').trim();
      const seasonId = String(body?.seasonId || CURRENT_SEASON_SEED.id).trim();
      const payerName = String(body?.payerName || '').trim();
      const payerEmail = body?.payerEmail ? String(body.payerEmail).trim() : undefined;
      const payerDni = body?.payerDni ? String(body.payerDni).trim() : undefined;
      const notes = body?.notes ? String(body.notes).trim() : undefined;
      const startMonth = body?.startMonth ? Number(body.startMonth) : undefined;
      const discountRuleIds = Array.isArray(body?.discountRuleIds)
        ? body.discountRuleIds
            .map((id: unknown) => String(id).trim())
            .filter((id: string) => UUID_REGEX.test(id))
        : [];
      const siblingAthleteIds = Array.isArray(body?.siblingAthleteIds)
        ? body.siblingAthleteIds
            .map((id: unknown) => String(id).trim())
            .filter(Boolean)
        : [];
      const manualDiscount =
        body?.manualDiscount && Number(body.manualDiscount.value) > 0
          ? {
              label: String(body.manualDiscount.label || 'Descuento manual').trim(),
              valueType: (body.manualDiscount.valueType === 'FIXED' ? 'FIXED' : 'PERCENTAGE') as
                | 'FIXED'
                | 'PERCENTAGE',
              value: Number(body.manualDiscount.value),
              reason: String(body.manualDiscount.reason || '').trim(),
            }
          : undefined;

      if (
        !athleteId ||
        !UUID_REGEX.test(productId) ||
        !UUID_REGEX.test(pricePlanId) ||
        !payerName
      ) {
        return NextResponse.json(
          { success: false, error: 'Deportista, producto, modalidad y pagador son obligatorios.' },
          { status: 400 }
        );
      }

      if ((discountRuleIds.length > 0 || manualDiscount) && !can(session, 'discounts.apply')) {
        assertCan(session, 'discounts.apply');
      }

      if (manualDiscount && !manualDiscount.reason) {
        return NextResponse.json(
          { success: false, error: 'El motivo es obligatorio para aplicar un ajuste de descuento manual.' },
          { status: 400 }
        );
      }

      if (discountRuleIds.length > 0) {
        const ruleChecks = await queryNeon<{
          id: string;
          name: string;
          applicable_product_ids: string[];
          requires_reason: boolean;
        }>(
          `SELECT id::text, name, COALESCE(applicable_product_ids, '{}'::uuid[])::text[] AS applicable_product_ids, requires_reason
           FROM intranet_discount_rules
           WHERE id = ANY($1::uuid[]) AND is_active = true;`,
          [discountRuleIds]
        );
        for (const r of ruleChecks) {
          if (r.applicable_product_ids.length > 0 && !r.applicable_product_ids.includes(productId)) {
            return NextResponse.json(
              {
                success: false,
                error: `El descuento "${r.name}" no es aplicable al producto seleccionado.`,
              },
              { status: 400 }
            );
          }
          if (r.requires_reason && !notes) {
            return NextResponse.json(
              {
                success: false,
                error: `El descuento "${r.name}" exige indicar un motivo en las observaciones de la inscripción.`,
              },
              { status: 400 }
            );
          }
        }
      }

      const result = await createAthleteEnrollment({
        athleteId,
        productId,
        pricePlanId,
        seasonId,
        payerName,
        payerEmail,
        payerDni,
        discountRuleIds,
        siblingAthleteIds,
        manualDiscount,
        startMonth,
        notes,
        actor: {
          userId: session.user.id,
          email: session.user.email,
          ipAddress: clientIp,
        },
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'record_payment') {
      assertCan(session, 'payments.record');
      const athleteId = String(body?.athleteId || '').trim();
      const amount = Number(body?.amount ?? 0);
      const method = String(body?.method || '').trim() as 'CASH' | 'BANK_TRANSFER' | 'POS_TERMINAL';
      const paidMadridDate = body?.paidMadridDate ? String(body.paidMadridDate).trim() : undefined;
      const reference = body?.reference ? String(body.reference).trim() : undefined;
      const notes = body?.notes ? String(body.notes).trim() : undefined;
      const chargeAllocations = Array.isArray(body?.chargeAllocations)
        ? body.chargeAllocations
            .filter(
              (a: { chargeId?: string; amount?: number }) =>
                a?.chargeId && UUID_REGEX.test(String(a.chargeId)) && Number(a.amount) > 0
            )
            .map((a: { chargeId: string; amount: number }) => ({
              chargeId: String(a.chargeId),
              amount: Number(a.amount),
            }))
        : undefined;

      if (!athleteId || !MANUAL_METHODS.has(method) || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Deportista, importe positivo y método de cobro válido (Efectivo, Transferencia o TPV físico) son obligatorios.',
          },
          { status: 400 }
        );
      }

      const res = await recordManualPayment({
        athleteId,
        amount,
        method,
        paidMadridDate,
        reference,
        notes,
        chargeAllocations,
        actor: {
          userId: session.user.id,
          email: session.user.email,
          ipAddress: clientIp,
        },
      });

      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'void_payment') {
      assertCan(session, 'payments.void');
      const paymentId = String(body?.paymentId || '').trim();
      const reason = String(body?.reason || '').trim();
      if (!UUID_REGEX.test(paymentId) || !reason) {
        return NextResponse.json(
          { success: false, error: 'Identificador de cobro y motivo de anulación obligatorios.' },
          { status: 400 }
        );
      }

      await voidRecordedPayment({
        paymentId,
        reason,
        actor: {
          userId: session.user.id,
          email: session.user.email,
          ipAddress: clientIp,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'waive_charge') {
      assertCan(session, 'payments.void');
      const chargeId = String(body?.chargeId || '').trim();
      const reason = String(body?.reason || '').trim();
      if (!UUID_REGEX.test(chargeId) || !reason) {
        return NextResponse.json(
          { success: false, error: 'Identificador de cargo y motivo de condonación obligatorios.' },
          { status: 400 }
        );
      }

      const chargeRows = await queryNeon<{
        id: string;
        athlete_id: string;
        concept: string;
        final_amount: string;
        status: string;
      }>(
        `SELECT id::text, athlete_id, concept, final_amount::text, status
         FROM intranet_charges
         WHERE id = $1::uuid
         LIMIT 1;`,
        [chargeId]
      );
      const charge = chargeRows[0];
      if (!charge) {
        return NextResponse.json({ success: false, error: 'Cargo no encontrado.' }, { status: 404 });
      }
      if (charge.status === 'ANULADO' || charge.status === 'CONDONADO') {
        return NextResponse.json(
          { success: false, error: `El cargo ya consta en estado ${charge.status}.` },
          { status: 400 }
        );
      }

      await queryNeon(
        `UPDATE intranet_charges SET status = 'CONDONADO', updated_at = NOW() WHERE id = $1::uuid;`,
        [chargeId]
      );

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'WAIVE_CHARGE',
        module: 'Pagos',
        targetType: 'CHARGE',
        targetId: chargeId,
        details: {
          athleteId: charge.athlete_id,
          concept: charge.concept,
          finalAmount: charge.final_amount,
          reason,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida en el módulo de pagos.' },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Payments POST');
  }
}
