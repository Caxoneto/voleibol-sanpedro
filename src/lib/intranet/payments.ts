import crypto from 'crypto';
import { queryNeon } from '@/lib/streaming-store';
import { formatMadridDateString, getCurrentMadridYear } from '@/lib/date-utils';
import { encryptData } from '@/lib/encryption';
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { generatePaymentReceiptPdf, getPaymentMethodLabel } from './pdf-receipt';
import { recordAuditLog } from './audit';
import { IntranetValidationError } from './rbac';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type PaymentTrafficLight = 'GREEN' | 'YELLOW' | 'RED' | 'NONE';

export interface DiscountCalcInput {
  id?: string | null;
  label: string;
  valueType: 'PERCENTAGE' | 'FIXED';
  value: number;
  stackable: boolean;
  maxDiscountAmount?: number | null;
  reason?: string;
  siblingAthleteIds?: string[];
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
    siblingAthleteIds?: string[];
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
        siblingAthleteIds: bestRule.siblingAthleteIds,
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
        siblingAthleteIds: rule.siblingAthleteIds,
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
  siblingAthleteIds?: string[];
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

  const cleanSiblingIds = Array.from(
    new Set(
      (params.siblingAthleteIds || [])
        .map((id) => String(id || '').trim())
        .filter((id) => Boolean(id) && id !== params.athleteId)
    )
  );

  const rulesToApply: DiscountCalcInput[] = [];
  if (params.discountRuleIds && params.discountRuleIds.length > 0) {
    const ruleRows = await queryNeon<{
      id: string;
      name: string;
      kind: string;
      value_type: 'PERCENTAGE' | 'FIXED';
      value: string;
      stackable: boolean;
      max_discount_amount: string | null;
    }>(
      `SELECT id::text, name, kind, value_type, value::text, stackable, max_discount_amount::text
       FROM intranet_discount_rules
       WHERE id = ANY($1::uuid[]) AND is_active = true;`,
      [params.discountRuleIds]
    );

    let resolvedSiblingReason: string | undefined;
    const hasSiblingRule = ruleRows.some(
      (r) => r.kind === 'SIBLING' || /hermano/i.test(r.name)
    );
    if (hasSiblingRule) {
      if (cleanSiblingIds.length === 0) {
        throw new IntranetValidationError(
          'Debes seleccionar el hermano/a de referencia para aplicar el descuento de hermano.',
          400
        );
      }
      const sibRows = await queryNeon<{ id: string; first_name: string; last_name: string }>(
        `SELECT id, first_name, last_name
         FROM intranet_athletes
         WHERE id = ANY($1::text[]) AND status <> 'SHREDDED';`,
        [cleanSiblingIds]
      );
      const sibNames = cleanSiblingIds.map((sid) => {
        const found = sibRows.find((s) => s.id === sid);
        return found ? `${found.first_name} ${found.last_name}`.trim() : sid;
      });
      resolvedSiblingReason = `Hermano/a vinculado/a: ${sibNames.join(', ')}`;
    }

    for (const r of ruleRows) {
      const isSib = r.kind === 'SIBLING' || /hermano/i.test(r.name);
      rulesToApply.push({
        id: r.id,
        label: r.name,
        valueType: r.value_type,
        value: Number(r.value),
        stackable: r.stackable,
        maxDiscountAmount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
        reason: isSib ? resolvedSiblingReason : undefined,
        siblingAthleteIds: isSib ? cleanSiblingIds : undefined,
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
         enrollment_id, discount_rule_id, label, value_type, value, computed_amount, reason, applied_by, sibling_athlete_ids
       ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::uuid, $9::text[]);`,
      [
        enrollmentId,
        appDisc.discountRuleId,
        appDisc.label,
        appDisc.valueType,
        appDisc.value,
        appDisc.computedAmount,
        appDisc.reason || null,
        params.actor.userId,
        appDisc.siblingAthleteIds || [],
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
}): Promise<{ paymentId: string; receiptNumber: string; emailSent: boolean }> {
  const cleanAmount = roundMoney(params.amount);
  if (cleanAmount <= 0) {
    throw new IntranetValidationError('El importe del cobro debe ser mayor que 0.');
  }

  // Verificar que el deportista existe y no está suprimido (RGPD Art. 17)
  const athleteRows = await queryNeon<{ id: string; status: string }>(
    `SELECT id, status FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
    [params.athleteId]
  );
  if (!athleteRows[0] || athleteRows[0].status === 'SHREDDED') {
    throw new IntranetValidationError('Deportista no encontrado o ficha suprimida.', 404);
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

  // Determinar cargos a imputar (validando pertenencia estricta al deportista o los más antiguos pendientes)
  let allocations = (params.chargeAllocations || []).filter((a) => roundMoney(a.amount) > 0);
  let enrollmentId: string | null = null;

  if (allocations.length > 0) {
    // Consolidar posibles entradas repetidas para el mismo chargeId
    const mergedByCharge = new Map<string, number>();
    for (const a of allocations) {
      const amt = roundMoney(a.amount);
      if (amt > 0) {
        mergedByCharge.set(a.chargeId, roundMoney((mergedByCharge.get(a.chargeId) || 0) + amt));
      }
    }
    const requestedIds = Array.from(mergedByCharge.keys());

    const validCharges = await queryNeon<{
      id: string;
      enrollment_id: string;
      final_amount: string;
      paid_amount: string;
    }>(
      `SELECT id::text AS id, enrollment_id::text AS enrollment_id,
              final_amount::text, paid_amount::text
       FROM intranet_charges
       WHERE id = ANY($1::uuid[])
         AND athlete_id = $2
         AND status IN ('VENCIDO','PENDIENTE','PARCIAL');`,
      [requestedIds, params.athleteId]
    );

    if (validCharges.length !== requestedIds.length) {
      throw new IntranetValidationError(
        'Uno o más cargos indicados no pertenecen al deportista o no están pendientes.',
        400
      );
    }

    const chargeMap = new Map(validCharges.map((c) => [c.id, c]));
    const validated: Array<{ chargeId: string; amount: number }> = [];
    let allocatedSum = 0;

    for (const [chargeId, amt] of Array.from(mergedByCharge.entries())) {
      const ch = chargeMap.get(chargeId)!;
      if (!enrollmentId) enrollmentId = ch.enrollment_id;
      const pending = roundMoney(Math.max(0, Number(ch.final_amount) - Number(ch.paid_amount)));
      if (amt > pending + 0.001) {
        throw new IntranetValidationError(
          'Uno o más cargos superan su importe pendiente al imputar este cobro.',
          400
        );
      }
      allocatedSum = roundMoney(allocatedSum + amt);
      validated.push({ chargeId, amount: amt });
    }

    if (allocatedSum > cleanAmount + 0.001) {
      throw new IntranetValidationError(
        'La suma de imputaciones supera el importe total del cobro.',
        400
      );
    }
    allocations = validated;
  } else {
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
       WHERE id = $1::uuid AND athlete_id = $4;`,
      [alloc.chargeId, roundMoney(alloc.amount), todayMadrid, params.athleteId]
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

  // Enviar email de confirmación de pago + recibo oficial en PDF al tutor o deportista
  let emailSent = false;
  try {
    const [athMetaRows, teamMetaRows, enrMetaRows, guardMetaRows, allocConceptRows, remainingRows] =
      await Promise.all([
        queryNeon<{ first_name: string; last_name: string; user_email: string | null }>(
          `SELECT a.first_name, a.last_name, u.email AS user_email
           FROM intranet_athletes a
           LEFT JOIN intranet_users u ON u.id = a.user_id
           WHERE a.id = $1 LIMIT 1;`,
          [params.athleteId]
        ),
        queryNeon<{ team_name: string }>(
          `SELECT ts.name AS team_name
           FROM intranet_athlete_teams at2
           INNER JOIN intranet_team_seasons ts ON ts.id = at2.team_season_id
           WHERE at2.athlete_id = $1
           ORDER BY at2.is_primary DESC, ts.sort_order ASC
           LIMIT 1;`,
          [params.athleteId]
        ),
        enrollmentId
          ? queryNeon<{ payer_name: string; payer_email: string | null }>(
              `SELECT payer_name, payer_email FROM intranet_enrollments WHERE id = $1::uuid LIMIT 1;`,
              [enrollmentId]
            )
          : queryNeon<{ payer_name: string; payer_email: string | null }>(
              `SELECT payer_name, payer_email FROM intranet_enrollments WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1;`,
              [params.athleteId]
            ),
        queryNeon<{ full_name: string; email: string | null }>(
          `SELECT full_name, email FROM intranet_guardianships WHERE athlete_id = $1 ORDER BY is_primary_payer DESC, created_at ASC LIMIT 1;`,
          [params.athleteId]
        ),
        queryNeon<{ concept: string; allocated_amount: string }>(
          `SELECT c.concept, pa.allocated_amount::text
           FROM intranet_payment_allocations pa
           INNER JOIN intranet_charges c ON c.id = pa.charge_id
           WHERE pa.payment_id = $1::uuid
           ORDER BY c.installment_number ASC;`,
          [paymentId]
        ),
        queryNeon<{ pending_sum: string }>(
          `SELECT COALESCE(SUM(GREATEST(0, final_amount - paid_amount)), 0)::text AS pending_sum
           FROM intranet_charges
           WHERE athlete_id = $1 AND status IN ('PENDIENTE', 'PARCIAL', 'VENCIDO');`,
          [params.athleteId]
        ),
      ]);

    const athMeta = athMetaRows[0];
    const athleteFullName = athMeta
      ? `${athMeta.first_name} ${athMeta.last_name}`.trim()
      : params.athleteId;
    const teamName = teamMetaRows[0]?.team_name || 'C.D. Voleibol San Pedro';
    const payerName =
      enrMetaRows[0]?.payer_name || guardMetaRows[0]?.full_name || athleteFullName;
    const recipientEmail = [
      enrMetaRows[0]?.payer_email,
      guardMetaRows[0]?.email,
      athMeta?.user_email,
    ].find((e) => e && isStrictEmail(e));

    if (recipientEmail) {
      const items =
        allocConceptRows.length > 0
          ? allocConceptRows.map((it) => ({
              concept: it.concept,
              amount: Number(it.allocated_amount),
            }))
          : [{ concept: 'Abono de cuota deportiva', amount: cleanAmount }];
      const methodLabel = getPaymentMethodLabel(params.method);
      const pendingBalance = roundMoney(Number(remainingRows[0]?.pending_sum || 0));

      const pdfBuf = generatePaymentReceiptPdf({
        receiptNumber,
        paidMadridDate: paidDate,
        athleteName: athleteFullName,
        teamName,
        payerName,
        payerEmail: recipientEmail,
        methodLabel,
        reference: params.reference?.trim() || null,
        amount: cleanAmount,
        items,
        notes: params.notes?.trim() || null,
      });
      const pdfBase64 = Buffer.from(pdfBuf).toString('base64');

      const itemsListHtml = items
        .map(
          (i) =>
            `<li>${escapeHtml(i.concept)}: <strong>${i.amount.toFixed(2)} &euro;</strong></li>`
        )
        .join('');
      const balanceHtml =
        pendingBalance <= 0
          ? `<span style="color:#047857;font-weight:700;">Al corriente de pago (0.00 &euro; pendientes)</span>`
          : `Saldo pendiente restante: <strong>${pendingBalance.toFixed(2)} &euro;</strong>`;

      const mailRes = await sendSmtpMail({
        to: recipientEmail.trim().toLowerCase(),
        subject: stripCrlf(
          `[CDV San Pedro] Pago confirmado y recibo oficial · ${receiptNumber} (${athleteFullName})`
        ),
        text: [
          `${CLUB_INFO.name} — Confirmación de Pago y Recibo Oficial`,
          ``,
          `Deportista: ${athleteFullName} (${teamName})`,
          `Pagador / Responsable: ${payerName}`,
          `Recibo Nº: ${receiptNumber}`,
          `Fecha de abono: ${paidDate}`,
          `Importe abonado: ${cleanAmount.toFixed(2)} EUR`,
          `Método: ${methodLabel}`,
          params.reference ? `Referencia: ${params.reference}` : null,
          pendingBalance <= 0
            ? `Estado de cuota: Al corriente de pago`
            : `Saldo pendiente: ${pendingBalance.toFixed(2)} EUR`,
          ``,
          `Adjuntamos el recibo oficial en PDF. También puedes consultarlo y descargarlo en tu portal /mi-club.`,
        ]
          .filter(Boolean)
          .join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f4f4f5;border:1px solid #27272a;padding:24px;">
            <p style="color:#ef4444;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">${escapeHtml(CLUB_INFO.name)} · Tesorería</p>
            <h1 style="font-size:20px;margin:0 0 12px;color:#ffffff;">Pago confirmado y recibo oficial</h1>
            <p style="font-size:14px;line-height:1.5;color:#d4d4d8;">Hemos registrado correctamente el abono de la cuota deportiva de <strong>${escapeHtml(athleteFullName)}</strong>.</p>
            <div style="background:#18181b;border:1px solid #27272a;padding:16px;margin:16px 0;font-size:13px;line-height:1.6;">
              <p style="margin:4px 0;"><strong>Recibo oficial:</strong> ${escapeHtml(receiptNumber)}</p>
              <p style="margin:4px 0;"><strong>Fecha de pago:</strong> ${escapeHtml(paidDate)}</p>
              <p style="margin:4px 0;"><strong>Equipo:</strong> ${escapeHtml(teamName)}</p>
              <p style="margin:4px 0;"><strong>Importe abonado:</strong> <span style="color:#34d399;font-weight:700;">${cleanAmount.toFixed(2)} &euro;</span></p>
              <p style="margin:4px 0;"><strong>Método de pago:</strong> ${escapeHtml(methodLabel)}</p>
              <p style="margin:8px 0 4px;"><strong>Conceptos imputados:</strong></p>
              <ul style="margin:4px 0 8px 18px;padding:0;color:#e4e4e7;">${itemsListHtml}</ul>
              <p style="margin:6px 0 0;">${balanceHtml}</p>
            </div>
            <p style="font-size:13px;color:#a1a1aa;">Adjuntamos en este correo el recibo oficial en formato PDF. También lo tienes disponible en cualquier momento dentro de tu zona privada <strong>/mi-club</strong>.</p>
          </div>
        `,
        attachments: [
          {
            filename: `recibo_${receiptNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`,
            contentType: 'application/pdf',
            contentBase64: pdfBase64,
          },
        ],
      });
      emailSent = mailRes.sent;
    }
  } catch (mailErr) {
    console.warn('[Payments] No se pudo enviar el correo de confirmación de pago:', mailErr);
  }

  return { paymentId, receiptNumber, emailSent };
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
