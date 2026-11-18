import crypto from 'crypto';
import { queryNeon } from '@/lib/streaming-store';
import { formatMadridDateString, getCurrentMadridYear } from '@/lib/date-utils';
import { encryptData } from '@/lib/encryption';
import { recordAuditLog } from './audit';

export type PaymentTrafficLight = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';

export interface DiscountCalcInput {
  id?: string | null;
  label: string;
  valueType: 'PERCENTAGE' | 'FIXED';
  value: number;
  stackable: boolean;
  maxDiscountAmount?: number | null;
  reason?: string;
}

export interface DiscountCalcResult {
  totalDiscount: number;
  applied: Array<{
    discountRuleId: string | null;
    label: string;
    valueType: 'PERCENTAGE' | 'FIXED';
    value: number;
    computedAmount: number;
    reason?: string;
  }>;
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula descuentos configurables sobre un importe base respetando acumulabilidad,
 * topes máximos y evitando descuentos negativos o superiores al importe total.
 */
export function computeConfiguredDiscounts(
  baseTotal: number,
  rules: DiscountCalcInput[]
): DiscountCalcResult {
  if (baseTotal <= 0 || rules.length === 0) {
    return { totalDiscount: 0, applied: [] };
  }

  const nonStackable = rules.filter((r) => !r.stackable);
  const stackable = rules.filter((r) => r.stackable);

  const computeSingle = (rule: DiscountCalcInput, remainingBase: number): number => {
    let raw =
      rule.valueType === 'PERCENTAGE'
        ? (remainingBase * Math.min(Math.max(rule.value, 0), 100)) / 100
        : Math.max(rule.value, 0);
    if (rule.maxDiscountAmount && rule.maxDiscountAmount > 0) {
      raw = Math.min(raw, rule.maxDiscountAmount);
    }
    return roundMoney(Math.min(raw, remainingBase));
  };

  const applied: DiscountCalcResult['applied'] = [];
  let accumulated = 0;

  // Si hay descuentos no acumulables, escoger el de mayor beneficio primero
  if (nonStackable.length > 0) {
    let bestRule = nonStackable[0];
    let bestAmount = computeSingle(bestRule, baseTotal);
    for (const candidate of nonStackable.slice(1)) {
      const amt = computeSingle(candidate, baseTotal);
      if (amt > bestAmount) {
        bestAmount = amt;
        bestRule = candidate;
      }
    }
    if (bestAmount > 0) {
      applied.push({
        discountRuleId: bestRule.id || null,
        label: bestRule.label,
        valueType: bestRule.valueType,
        value: bestRule.value,
        computedAmount: bestAmount,
        reason: bestRule.reason,
      });
      accumulated = roundMoney(accumulated + bestAmount);
    }
  }

  for (const rule of stackable) {
    const remaining = roundMoney(Math.max(0, baseTotal - accumulated));
    if (remaining <= 0) break;
    const amt = computeSingle(rule, remaining);
    if (amt > 0) {
      applied.push({
        discountRuleId: rule.id || null,
        label: rule.label,
        valueType: rule.valueType,
        value: rule.value,
        computedAmount: amt,
        reason: rule.reason,
      });
      accumulated = roundMoney(accumulated + amt);
    }
  }

  return { totalDiscount: accumulated, applied };
}

/**
 * Construye una fecha `YYYY-MM-DD` segura en Madrid para el mes y día indicados de una temporada.
 */
function buildSeasonChargeDate(seasonId: string, month: number, day: number): string {
  const [startYearStr, endYearStr] = seasonId.split('-');
  const startYear = Number(startYearStr) || 2026;
  const endYear = Number(endYearStr) || startYear + 1;
  const year = month >= 8 ? startYear : endYear;
  const clampedDay = Math.min(Math.max(1, day), month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

const MONTH_NAMES_ES: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

/**
 * Marca automáticamente como `VENCIDO` los cargos pendientes cuya fecha Madrid ya expiró.
 */
export async function refreshOverdueCharges(): Promise<void> {
  const todayMadrid = formatMadridDateString(new Date());
  await queryNeon(
    `UPDATE intranet_charges
     SET status = 'VENCIDO', updated_at = NOW()
     WHERE status IN ('PENDIENTE', 'PARCIAL')
       AND due_madrid_date < $1;`,
    [todayMadrid]
  );
}

/**
 * Inscribe a un deportista en un producto + modalidad, aplica descuentos y genera los cargos.
 */
export async function createAthleteEnrollment(params: {
  athleteId: string;
  productId: string;
  pricePlanId: string;
  seasonId: string;
  payerName: string;
  payerEmail?: string;
  payerDni?: string;
  payerUserId?: string | null;
  discountRuleIds?: string[];
  manualDiscount?: { label: string; valueType: 'PERCENTAGE' | 'FIXED'; value: number; reason: string };
  startMonth?: number;
  notes?: string;
  actor: { userId: string; email: string; ipAddress?: string | null };
}): Promise<{ enrollmentId: string; paymentReferenceCode: string; chargesCreated: number }> {
  const [products, plans] = await Promise.all([
    queryNeon<{ id: string; name: string }>(
      `SELECT id::text, name FROM intranet_products WHERE id = $1::uuid LIMIT 1;`,
      [params.productId]
    ),
    queryNeon<{
      id: string;
      name: string;
      periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
      total_amount: string;
      installments_count: number;
      due_day: number;
      active_months: number[];
      proration_mode: 'NONE' | 'BY_REMAINING_MONTHS' | 'BY_DAYS';
      initial_fee_amount: string;
    }>(`SELECT * FROM intranet_price_plans WHERE id = $1::uuid LIMIT 1;`, [params.pricePlanId]),
  ]);

  const product = products[0];
  const plan = plans[0];
  if (!product || !plan) {
    throw new Error('Producto o modalidad de pago no encontrada.');
  }

  const activeMonths =
    Array.isArray(plan.active_months) && plan.active_months.length > 0
      ? plan.active_months
      : [9, 10, 11, 12, 1, 2, 3, 4, 5];

  let targetMonths = [...activeMonths];
  if (params.startMonth && plan.periodicity === 'MONTHLY') {
    const idx = activeMonths.indexOf(params.startMonth);
    if (idx >= 0) targetMonths = activeMonths.slice(idx);
  }

  let effectiveBaseTotal = Number(plan.total_amount);
  if (
    plan.periodicity === 'MONTHLY' &&
    plan.proration_mode === 'BY_REMAINING_MONTHS' &&
    activeMonths.length > 0
  ) {
    effectiveBaseTotal = roundMoney((effectiveBaseTotal / activeMonths.length) * targetMonths.length);
  }

  const rulesToApply: DiscountCalcInput[] = [];
  if (params.discountRuleIds && params.discountRuleIds.length > 0) {
    const ruleRows = await queryNeon<{
      id: string;
      name: string;
      value_type: 'PERCENTAGE' | 'FIXED';
      value: string;
      stackable: boolean;
      max_discount_amount: string | null;
    }>(
      `SELECT id::text, name, value_type, value::text, stackable, max_discount_amount::text
       FROM intranet_discount_rules
       WHERE id = ANY($1::uuid[]) AND is_active = true;`,
      [params.discountRuleIds]
    );
    for (const r of ruleRows) {
      rulesToApply.push({
        id: r.id,
        label: r.name,
        valueType: r.value_type,
        value: Number(r.value),
        stackable: r.stackable,
        maxDiscountAmount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
      });
    }
  }

  if (params.manualDiscount && params.manualDiscount.value > 0) {
    rulesToApply.push({
      id: null,
      label: params.manualDiscount.label || 'Ajuste manual',
      valueType: params.manualDiscount.valueType,
      value: params.manualDiscount.value,
      stackable: true,
      reason: params.manualDiscount.reason,
    });
  }

  const discountRes = computeConfiguredDiscounts(effectiveBaseTotal, rulesToApply);
  const netTotal = roundMoney(Math.max(0, effectiveBaseTotal - discountRes.totalDiscount));

  const refCode = `CDVSP-${params.seasonId.replace('-', '').slice(2, 6)}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
  const payerDniEnc = params.payerDni
    ? encryptData(params.payerDni.trim().toUpperCase(), `${params.athleteId}:payer_dni`)
    : null;

  const enrRows = await queryNeon<{ id: string }>(
    `INSERT INTO intranet_enrollments (
       athlete_id, product_id, price_plan_id, season_id, payer_user_id, payer_name,
       payer_email, payer_dni_enc, payment_reference_code, status, notes
     ) VALUES ($1, $2::uuid, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, 'ACTIVE', $10)
     RETURNING id::text AS id;`,
    [
      params.athleteId,
      params.productId,
      params.pricePlanId,
      params.seasonId,
      params.payerUserId || null,
      params.payerName.trim(),
      params.payerEmail?.trim().toLowerCase() || null,
      payerDniEnc,
      refCode,
      params.notes?.trim() || null,
    ]
  );

  const enrollmentId = enrRows[0].id;

  for (const appDisc of discountRes.applied) {
    await queryNeon(
      `INSERT INTO intranet_applied_discounts (
         enrollment_id, discount_rule_id, label, value_type, value, computed_amount, reason, applied_by
       ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::uuid);`,
      [
        enrollmentId,
        appDisc.discountRuleId,
        appDisc.label,
        appDisc.valueType,
        appDisc.value,
        appDisc.computedAmount,
        appDisc.reason || null,
        params.actor.userId,
      ]
    );
  }

  // Generar plazos según modalidad
  const schedules: Array<{ num: number; concept: string; dueDate: string; base: number; disc: number; final: number }> = [];
  const todayMadrid = formatMadridDateString(new Date());

  if (plan.periodicity === 'ANNUAL') {
    schedules.push({
      num: 1,
      concept: `${product.name} · Pago Único`,
      dueDate: buildSeasonChargeDate(params.seasonId, activeMonths[0] || 9, plan.due_day),
      base: effectiveBaseTotal,
      disc: discountRes.totalDiscount,
      final: netTotal,
    });
  } else if (plan.periodicity === 'MONTHLY') {
    const count = Math.max(1, targetMonths.length);
    const perBase = roundMoney(effectiveBaseTotal / count);
    const perDisc = roundMoney(discountRes.totalDiscount / count);
    targetMonths.forEach((m, i) => {
      const isLast = i === count - 1;
      const baseAmt = isLast ? roundMoney(effectiveBaseTotal - perBase * (count - 1)) : perBase;
      const discAmt = isLast ? roundMoney(discountRes.totalDiscount - perDisc * (count - 1)) : perDisc;
      schedules.push({
        num: i + 1,
        concept: `${product.name} · ${MONTH_NAMES_ES[m] || `Mes ${m}`}`,
        dueDate: buildSeasonChargeDate(params.seasonId, m, plan.due_day),
        base: baseAmt,
        disc: discAmt,
        final: roundMoney(Math.max(0, baseAmt - discAmt)),
      });
    });
  } else {
    const count = Math.max(1, plan.installments_count || (plan.periodicity === 'QUARTERLY' ? 3 : 1));
    const perBase = roundMoney(effectiveBaseTotal / count);
    const perDisc = roundMoney(discountRes.totalDiscount / count);
    const quarterMonths = [9, 12, 3, 5];
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const baseAmt = isLast ? roundMoney(effectiveBaseTotal - perBase * (count - 1)) : perBase;
      const discAmt = isLast ? roundMoney(discountRes.totalDiscount - perDisc * (count - 1)) : perDisc;
      const m = quarterMonths[i % quarterMonths.length];
      schedules.push({
        num: i + 1,
        concept: `${product.name} · Plazo ${i + 1}/${count}`,
        dueDate: buildSeasonChargeDate(params.seasonId, m, plan.due_day),
        base: baseAmt,
        disc: discAmt,
        final: roundMoney(Math.max(0, baseAmt - discAmt)),
      });
    }
  }

  for (const ch of schedules) {
    const status = ch.final === 0 ? 'PAGADO' : ch.dueDate < todayMadrid ? 'VENCIDO' : 'PENDIENTE';
    await queryNeon(
      `INSERT INTO intranet_charges (
         enrollment_id, athlete_id, installment_number, concept, due_madrid_date,
         base_amount, discount_amount, final_amount, paid_amount, status, origin
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 0, $9, 'NATIVE');`,
      [enrollmentId, params.athleteId, ch.num, ch.concept, ch.dueDate, ch.base, ch.disc, ch.final, status]
    );
  }

  await recordAuditLog({
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    action: 'CREATE_ENROLLMENT',
    module: 'Pagos',
    targetType: 'ATHLETE',
    targetId: params.athleteId,
    details: { enrollmentId, product: product.name, netTotal, chargesCount: schedules.length },
    ipAddress: params.actor.ipAddress,
  });

  return { enrollmentId, paymentReferenceCode: refCode, chargesCreated: schedules.length };
}

/**
 * Registra un cobro manual e imputa el importe sobre uno o varios cargos (admite parciales).
 */
export async function recordManualPayment(params: {
  athleteId: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'POS_TERMINAL';
  paidMadridDate?: string;
  reference?: string;
  notes?: string;
  chargeAllocations?: Array<{ chargeId: string; amount: number }>;
  actor: { userId: string; email: string; ipAddress?: string | null };
}): Promise<{ paymentId: string; receiptNumber: string }> {
  const cleanAmount = roundMoney(params.amount);
  if (cleanAmount <= 0) {
    throw new Error('El importe del cobro debe ser mayor que 0.');
  }

  const paidDate = params.paidMadridDate?.trim() || formatMadridDateString(new Date());
  const madridYear = getCurrentMadridYear();

  const countRows = await queryNeon<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM intranet_payments WHERE receipt_number LIKE $1;`,
    [`REC-${madridYear}-%`]
  );
  const seq = Number(countRows[0]?.cnt || 0) + 1;
  const receiptNumber = `REC-${madridYear}-${String(seq).padStart(4, '0')}-${crypto
    .randomBytes(1)
    .toString('hex')
    .toUpperCase()}`;

  // Determinar cargos a imputar (los pasados explícitamente o los más antiguos pendientes)
  let allocations = params.chargeAllocations || [];
  let enrollmentId: string | null = null;

  if (allocations.length === 0) {
    const openCharges = await queryNeon<{
      id: string;
      enrollment_id: string;
      final_amount: string;
      paid_amount: string;
    }>(
      `SELECT id::text, enrollment_id::text, final_amount::text, paid_amount::text
       FROM intranet_charges
       WHERE athlete_id = $1 AND status IN ('VENCIDO','PENDIENTE','PARCIAL')
       ORDER BY due_madrid_date ASC, installment_number ASC;`,
      [params.athleteId]
    );
    let remaining = cleanAmount;
    for (const c of openCharges) {
      if (remaining <= 0) break;
      if (!enrollmentId) enrollmentId = c.enrollment_id;
      const pending = roundMoney(Math.max(0, Number(c.final_amount) - Number(c.paid_amount)));
      if (pending <= 0) continue;
      const alloc = roundMoney(Math.min(remaining, pending));
      allocations.push({ chargeId: c.id, amount: alloc });
      remaining = roundMoney(remaining - alloc);
    }
  }

  const pRows = await queryNeon<{ id: string }>(
    `INSERT INTO intranet_payments (
       athlete_id, enrollment_id, amount, method, paid_madrid_date, reference,
       receipt_number, status, origin, notes, recorded_by
     ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, 'COMPLETED', 'NATIVE', $8, $9::uuid)
     RETURNING id::text AS id;`,
    [
      params.athleteId,
      enrollmentId,
      cleanAmount,
      params.method,
      paidDate,
      params.reference?.trim() || null,
      receiptNumber,
      params.notes?.trim() || null,
      params.actor.userId,
    ]
  );

  const paymentId = pRows[0].id;
  const todayMadrid = formatMadridDateString(new Date());

  for (const alloc of allocations) {
    if (alloc.amount <= 0) continue;
    await queryNeon(
      `INSERT INTO intranet_payment_allocations (payment_id, charge_id, allocated_amount)
       VALUES ($1::uuid, $2::uuid, $3);`,
      [paymentId, alloc.chargeId, roundMoney(alloc.amount)]
    );

    await queryNeon(
      `UPDATE intranet_charges
       SET paid_amount = LEAST(final_amount, paid_amount + $2),
           status = CASE
             WHEN paid_amount + $2 >= final_amount THEN 'PAGADO'
             WHEN paid_amount + $2 > 0 THEN 'PARCIAL'
             WHEN due_madrid_date < $3 THEN 'VENCIDO'
             ELSE 'PENDIENTE'
           END,
           updated_at = NOW()
       WHERE id = $1::uuid;`,
      [alloc.chargeId, roundMoney(alloc.amount), todayMadrid]
    );
  }

  await recordAuditLog({
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    action: 'RECORD_MANUAL_PAYMENT',
    module: 'Pagos',
    targetType: 'PAYMENT',
    targetId: paymentId,
    details: { athleteId: params.athleteId, amount: cleanAmount, method: params.method, receiptNumber },
    ipAddress: params.actor.ipAddress,
  });

  return { paymentId, receiptNumber };
}

/**
 * Anula un pago completado y recalcula el saldo de los cargos imputados.
 */
export async function voidRecordedPayment(params: {
  paymentId: string;
  reason: string;
  actor: { userId: string; email: string; ipAddress?: string | null };
}): Promise<void> {
  if (!params.reason.trim()) {
    throw new Error('Es obligatorio indicar el motivo de anulación.');
  }

  const pRows = await queryNeon<{ id: string; status: string; amount: string; athlete_id: string }>(
    `SELECT id::text, status, amount::text, athlete_id FROM intranet_payments WHERE id = $1::uuid LIMIT 1;`,
    [params.paymentId]
  );
  const p = pRows[0];
  if (!p || p.status !== 'COMPLETED') {
    throw new Error('El cobro no existe o ya fue anulado.');
  }

  const allocs = await queryNeon<{ charge_id: string; allocated_amount: string }>(
    `SELECT charge_id::text, allocated_amount::text FROM intranet_payment_allocations WHERE payment_id = $1::uuid;`,
    [params.paymentId]
  );

  const todayMadrid = formatMadridDateString(new Date());
  await queryNeon(
    `UPDATE intranet_payments
     SET status = 'VOIDED', voided_by = $2::uuid, void_reason = $3
     WHERE id = $1::uuid;`,
    [params.paymentId, params.actor.userId, params.reason.trim()]
  );

  for (const a of allocs) {
    const revAmt = Number(a.allocated_amount);
    await queryNeon(
      `UPDATE intranet_charges
       SET paid_amount = GREATEST(0, paid_amount - $2),
           status = CASE
             WHEN GREATEST(0, paid_amount - $2) >= final_amount THEN 'PAGADO'
             WHEN GREATEST(0, paid_amount - $2) > 0 THEN 'PARCIAL'
             WHEN due_madrid_date < $3 THEN 'VENCIDO'
             ELSE 'PENDIENTE'
           END,
           updated_at = NOW()
       WHERE id = $1::uuid;`,
      [a.charge_id, revAmt, todayMadrid]
    );
  }

  await recordAuditLog({
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    action: 'VOID_PAYMENT',
    module: 'Pagos',
    targetType: 'PAYMENT',
    targetId: params.paymentId,
    details: { athleteId: p.athlete_id, amount: p.amount, reason: params.reason.trim() },
    ipAddress: params.actor.ipAddress,
  });
}

/**
 * Calcula únicamente el semáforo visual de cuotas por deportista (`GREEN` | `YELLOW` | `RED` | `NONE`)
 * para entrenadores y coordinadores, sin exponer jamás importes ni datos bancarios.
 */
export async function getTeamPaymentTrafficLight(
  athleteIds: string[]
): Promise<Record<string, PaymentTrafficLight>> {
  if (athleteIds.length === 0) return {};

  await refreshOverdueCharges();
  const rows = await queryNeon<{
    athlete_id: string;
    has_overdue: boolean;
    has_pending: boolean;
    has_paid: boolean;
  }>(
    `SELECT
       athlete_id,
       BOOL_OR(status = 'VENCIDO') AS has_overdue,
       BOOL_OR(status IN ('PENDIENTE','PARCIAL')) AS has_pending,
       BOOL_OR(status IN ('PAGADO','CONDONADO')) AS has_paid
     FROM intranet_charges
     WHERE athlete_id = ANY($1::text[])
       AND status <> 'ANULADO'
     GROUP BY athlete_id;`,
    [athleteIds]
  );

  const map: Record<string, PaymentTrafficLight> = {};
  for (const id of athleteIds) map[id] = 'NONE';
  for (const r of rows) {
    if (r.has_overdue) map[r.athlete_id] = 'RED';
    else if (r.has_pending) map[r.athlete_id] = 'YELLOW';
    else if (r.has_paid) map[r.athlete_id] = 'GREEN';
  }
  return map;
}
