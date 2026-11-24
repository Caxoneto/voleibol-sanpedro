'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Ban,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  Mail,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { buildCsvString } from '@/lib/intranet/csv-utils';
import { formatDisplayDate, formatMadridDateString } from '@/lib/date-utils';
import { getShortTeamLabelInFamily, groupByCategoryFamily } from '@/lib/club-info';

type TabKey = 'resumen' | 'cargos' | 'inscripciones' | 'productos' | 'descuentos';

interface PricePlanItem {
  id: string;
  productId: string;
  name: string;
  periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
  totalAmount: number;
  installmentsCount: number;
  dueDay: number;
  activeMonths: number[];
  prorationMode: 'NONE' | 'BY_REMAINING_MONTHS' | 'BY_DAYS';
  initialFeeAmount: number;
  isActive: boolean;
}

interface ProductItem {
  id: string;
  seasonId: string;
  name: string;
  productType: 'SEASON_FEE' | 'REGISTRATION' | 'LICENSE' | 'KIT' | 'CAMP_TOURNAMENT' | 'OTHER';
  isRecurring: boolean;
  applicableTeamIds: string[];
  description: string | null;
  isActive: boolean;
  pricePlans: PricePlanItem[];
}

interface DiscountRuleItem {
  id: string;
  seasonId: string;
  name: string;
  kind: 'SIBLING' | 'EARLY_ANNUAL' | 'LARGE_FAMILY' | 'SCHOLARSHIP' | 'STAFF_CHILD' | 'CUSTOM';
  valueType: 'PERCENTAGE' | 'FIXED';
  value: number;
  applicableProductIds: string[];
  stackable: boolean;
  maxDiscountAmount: number | null;
  requiresReason: boolean;
  isActive: boolean;
}

interface EnrollmentItem {
  id: string;
  athleteId: string;
  athleteName: string;
  teamId: string | null;
  teamName: string;
  productId: string;
  productName: string;
  pricePlanId: string;
  planName: string;
  periodicity: string;
  seasonId: string;
  payerName: string;
  payerEmail: string | null;
  paymentReferenceCode: string;
  status: string;
  notes: string | null;
  appliedDiscounts: Array<{
    discountRuleId: string | null;
    label: string;
    valueType: string;
    value: number;
    computedAmount: number;
    reason: string | null;
  }>;
}

interface ChargeItem {
  id: string;
  enrollmentId: string;
  athleteId: string;
  athleteName: string;
  teamId: string | null;
  teamName: string;
  paymentReferenceCode: string;
  productName: string;
  installmentNumber: number;
  concept: string;
  dueMadridDate: string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  origin: string;
  lastReminderSentAt: string | null;
}

interface PaymentItem {
  id: string;
  athleteId: string;
  athleteName: string;
  teamId: string | null;
  teamName: string;
  enrollmentId: string | null;
  amount: number;
  method: string;
  methodLabel: string;
  paidMadridDate: string;
  reference: string | null;
  receiptNumber: string;
  status: string;
  origin: string;
  notes: string | null;
  voidReason: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  division: string;
  association: string;
}

interface AthleteOption {
  id: string;
  name: string;
  status: string;
  teamId: string | null;
  teamName: string;
  guardianName: string | null;
  guardianEmail: string | null;
}

interface ReportsData {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalWaived: number;
  totalDiscountsApplied: number;
  overdueAging: Array<{ bucket: string; count: number; amount: number }>;
  byMonth: Array<{ month: string; expected: number; collected: number; pending: number; overdue: number }>;
  byMethod: Array<{ method: string; label: string; count: number; amount: number }>;
  byTeam: Array<{
    teamId: string;
    teamName: string;
    expected: number;
    collected: number;
    pending: number;
    overdue: number;
    athletesCount: number;
  }>;
}

interface PaymentsApiPayload {
  success: boolean;
  currentSeasonId: string;
  todayMadrid: string;
  products: ProductItem[];
  discountRules: DiscountRuleItem[];
  enrollments: EnrollmentItem[];
  charges: ChargeItem[];
  payments: PaymentItem[];
  teams: TeamOption[];
  athletes: AthleteOption[];
  reports: ReportsData;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SEASON_FEE: 'Cuota de Temporada',
  REGISTRATION: 'Matrícula / Inscripción',
  LICENSE: 'Licencia Federativa',
  KIT: 'Equipación / Material',
  CAMP_TOURNAMENT: 'Campus / Torneo',
  OTHER: 'Otro Concepto',
};

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  ANNUAL: 'Anual (Pago único)',
  CUSTOM: 'Personalizada',
};

const PRORATION_LABELS: Record<string, string> = {
  NONE: 'Sin prorrateo',
  BY_REMAINING_MONTHS: 'Por meses restantes',
  BY_DAYS: 'Por días',
};

const DISCOUNT_KIND_LABELS: Record<string, string> = {
  SIBLING: 'Hermanos/as',
  EARLY_ANNUAL: 'Pronto Pago Anual',
  LARGE_FAMILY: 'Familia Numerosa',
  SCHOLARSHIP: 'Beca / Ayuda Social',
  STAFF_CHILD: 'Hijo/a de Staff',
  CUSTOM: 'Regla Personalizada',
};

const MONTH_OPTIONS = [
  { num: 9, label: 'Sep' },
  { num: 10, label: 'Oct' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Dic' },
  { num: 1, label: 'Ene' },
  { num: 2, label: 'Feb' },
  { num: 3, label: 'Mar' },
  { num: 4, label: 'Abr' },
  { num: 5, label: 'May' },
  { num: 6, label: 'Jun' },
];

function eur(val: number): string {
  return `${val.toFixed(2)} €`;
}

function chargeBadgeClass(status: string): string {
  switch (status) {
    case 'PAGADO':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
    case 'VENCIDO':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/45';
    case 'PARCIAL':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    case 'CONDONADO':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/35';
    case 'ANULADO':
      return 'bg-white/5 text-tertiary border-white/15';
    default:
      return 'bg-amber-500/10 text-amber-200 border-amber-400/30';
  }
}

export default function ClubPagosPage() {
  const { hasPermission, hasAnyPermission } = useClubSession();

  const canRead = hasAnyPermission([
    'payments.view',
    'payments.record',
    'products.manage',
    'discounts.manage',
    'payments.reports',
  ]);
  const canRecord = hasPermission('payments.record');
  const canVoid = hasPermission('payments.void');
  const canManageProducts = hasPermission('products.manage');
  const canManageDiscounts = hasPermission('discounts.manage');
  const canApplyDiscounts = hasPermission('discounts.apply');
  const canReports = hasPermission('payments.reports');

  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentsApiPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingChargeReminderId, setSendingChargeReminderId] = useState<string | null>(null);

  // Filtros Cargos y Cobros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [chargesSubView, setChargesSubView] = useState<'charges' | 'payments'>('charges');

  // Modales
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [pricePlanModalOpen, setPricePlanModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  const [payAthleteId, setPayAthleteId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'POS_TERMINAL'>('BANK_TRANSFER');
  const [payDate, setPayDate] = useState(() => formatMadridDateString(new Date()));
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const [reasonModal, setReasonModal] = useState<{
    kind: 'void_payment' | 'waive_charge';
    targetId: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  // Inscripción form
  const [enrAthleteId, setEnrAthleteId] = useState('');
  const [enrProductId, setEnrProductId] = useState('');
  const [enrPlanId, setEnrPlanId] = useState('');
  const [enrStartMonth, setEnrStartMonth] = useState<number>(9);
  const [enrDiscountIds, setEnrDiscountIds] = useState<string[]>([]);
  const [enrManualActive, setEnrManualActive] = useState(false);
  const [enrManualLabel, setEnrManualLabel] = useState('');
  const [enrManualType, setEnrManualType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [enrManualValue, setEnrManualValue] = useState('');
  const [enrManualReason, setEnrManualReason] = useState('');
  const [enrPayerName, setEnrPayerName] = useState('');
  const [enrPayerEmail, setEnrPayerEmail] = useState('');
  const [enrPayerDni, setEnrPayerDni] = useState('');
  const [enrNotes, setEnrNotes] = useState('');

  // Producto form
  const [prodId, setProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodType, setProdType] = useState<ProductItem['productType']>('SEASON_FEE');
  const [prodRecurring, setProdRecurring] = useState(true);
  const [prodDescription, setProdDescription] = useState('');

  // Modalidad (PricePlan) form
  const [planTargetProductId, setPlanTargetProductId] = useState<string>('');
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPeriodicity, setPlanPeriodicity] = useState<PricePlanItem['periodicity']>('MONTHLY');
  const [planTotalAmount, setPlanTotalAmount] = useState('');
  const [planInstallments, setPlanInstallments] = useState('9');
  const [planDueDay, setPlanDueDay] = useState('5');
  const [planActiveMonths, setPlanActiveMonths] = useState<number[]>([9, 10, 11, 12, 1, 2, 3, 4, 5]);
  const [planProration, setPlanProration] = useState<PricePlanItem['prorationMode']>('BY_REMAINING_MONTHS');

  // Regla descuento form
  const [discId, setDiscId] = useState<string | null>(null);
  const [discName, setDiscName] = useState('');
  const [discKind, setDiscKind] = useState<DiscountRuleItem['kind']>('SIBLING');
  const [discValueType, setDiscValueType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discValue, setDiscValue] = useState('');
  const [discProductIds, setDiscProductIds] = useState<string[]>([]);
  const [discStackable, setDiscStackable] = useState(false);
  const [discMaxCap, setDiscMaxCap] = useState('');
  const [discRequiresReason, setDiscRequiresReason] = useState(false);

  const fetchPaymentsData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/payments', { cache: 'no-store', signal });
      const json = (await res.json()) as PaymentsApiPayload & { error?: string };
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudieron cargar los datos de tesorería.');
        setLoading(false);
        return;
      }
      setData(json);
      if (json.todayMadrid) {
        setPayDate((prev) => prev || json.todayMadrid);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setErrorMsg('Error de conexión al cargar Tesorería.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void fetchPaymentsData(controller.signal);
    return () => controller.abort();
  }, [canRead, fetchPaymentsData]);

  async function postPaymentAction(payload: Record<string, unknown>, successText: string) {
    setBusy(true);
    setErrorMsg(null);
    setToastMsg(null);
    try {
      const res = await fetch('/api/intranet/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Error al ejecutar la operación.');
        return false;
      }
      setToastMsg(successText);
      await fetchPaymentsData();
      return json;
    } catch {
      setErrorMsg('Error de red al procesar la operación.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const filteredCharges = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.charges.filter((c) => {
      if (filterTeamId !== 'ALL' && c.teamId !== filterTeamId) return false;
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      if (q) {
        const hay = `${c.athleteName} ${c.concept} ${c.paymentReferenceCode} ${c.teamName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, searchQuery, filterTeamId, filterStatus]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.payments.filter((p) => {
      if (filterTeamId !== 'ALL' && p.teamId !== filterTeamId) return false;
      if (q) {
        const hay = `${p.athleteName} ${p.receiptNumber} ${p.reference || ''} ${p.teamName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, searchQuery, filterTeamId]);

  const payAthleteOpenCharges = useMemo(() => {
    if (!data || !payAthleteId) return [];
    return data.charges.filter(
      (c) =>
        c.athleteId === payAthleteId &&
        ['VENCIDO', 'PENDIENTE', 'PARCIAL'].includes(c.status) &&
        c.pendingAmount > 0
    );
  }, [data, payAthleteId]);

  const selectedEnrProduct = useMemo(
    () => data?.products.find((p) => p.id === enrProductId) || null,
    [data, enrProductId]
  );

  const selectedEnrPlan = useMemo(
    () => selectedEnrProduct?.pricePlans.find((pl) => pl.id === enrPlanId) || null,
    [selectedEnrProduct, enrPlanId]
  );

  const applicableRulesForEnr = useMemo(() => {
    if (!data || !enrProductId) return [];
    return data.discountRules.filter(
      (r) =>
        r.isActive &&
        (r.applicableProductIds.length === 0 || r.applicableProductIds.includes(enrProductId))
    );
  }, [data, enrProductId]);

  const enrollmentPreview = useMemo(() => {
    if (!selectedEnrPlan) return null;
    const months = selectedEnrPlan.activeMonths?.length
      ? selectedEnrPlan.activeMonths
      : [9, 10, 11, 12, 1, 2, 3, 4, 5];
    let base = selectedEnrPlan.totalAmount;
    if (
      selectedEnrPlan.periodicity === 'MONTHLY' &&
      selectedEnrPlan.prorationMode === 'BY_REMAINING_MONTHS'
    ) {
      const idx = months.indexOf(enrStartMonth);
      const remaining = idx >= 0 ? months.length - idx : months.length;
      base = Math.round(((base / months.length) * remaining + Number.EPSILON) * 100) / 100;
    }
    let discTotal = 0;
    for (const rid of enrDiscountIds) {
      const rule = applicableRulesForEnr.find((r) => r.id === rid);
      if (!rule) continue;
      let dAmt = rule.valueType === 'PERCENTAGE' ? (base * rule.value) / 100 : rule.value;
      if (rule.maxDiscountAmount && rule.maxDiscountAmount > 0) {
        dAmt = Math.min(dAmt, rule.maxDiscountAmount);
      }
      discTotal += dAmt;
    }
    if (enrManualActive && Number(enrManualValue) > 0) {
      const mVal = Number(enrManualValue);
      discTotal += enrManualType === 'PERCENTAGE' ? (base * mVal) / 100 : mVal;
    }
    discTotal = Math.min(base, Math.round((discTotal + Number.EPSILON) * 100) / 100);
    return {
      base,
      discount: discTotal,
      net: Math.max(0, Math.round((base - discTotal + Number.EPSILON) * 100) / 100),
    };
  }, [
    selectedEnrPlan,
    enrStartMonth,
    enrDiscountIds,
    applicableRulesForEnr,
    enrManualActive,
    enrManualType,
    enrManualValue,
  ]);

  function handleExportCsv() {
    if (!data) return;
    const headers = [
      'Deportista',
      'Equipo',
      'Concepto',
      'Referencia',
      'Vencimiento',
      'Base (€)',
      'Descuento (€)',
      'Final (€)',
      'Pagado (€)',
      'Pendiente (€)',
      'Estado',
      'Origen',
    ];
    const rows = data.charges.map((c) => [
      c.athleteName,
      c.teamName,
      c.concept,
      c.paymentReferenceCode,
      c.dueMadridDate,
      c.baseAmount.toFixed(2),
      c.discountAmount.toFixed(2),
      c.finalAmount.toFixed(2),
      c.paidAmount.toFixed(2),
      c.pendingAmount.toFixed(2),
      c.status,
      c.origin,
    ]);
    const csv = buildCsvString(headers, rows, ';');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tesoreria-CDVSP-${data.todayMadrid}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendReminders() {
    setBusy(true);
    setErrorMsg(null);
    setToastMsg(null);
    try {
      const res = await fetch('/api/intranet/payments/send-reminders', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudieron enviar los recordatorios.');
        return;
      }
      setToastMsg(
        `Recordatorios procesados: ${json.sentCount} enviados, ${json.skippedCount} omitidos (sin email/importe), ${json.failedCount} fallidos.` +
          (json.warning ? ` (${json.warning})` : '')
      );
      await fetchPaymentsData();
    } catch {
      setErrorMsg('Error de red al enviar avisos de vencimiento.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendSingleChargeReminder(c: ChargeItem) {
    setSendingChargeReminderId(c.id);
    setErrorMsg(null);
    setToastMsg(null);
    try {
      const res = await fetch('/api/intranet/payments/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeId: c.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(
          json.error || json.warning || `No se pudo enviar el aviso para ${c.athleteName}.`
        );
        return;
      }
      setToastMsg(`Aviso enviado correctamente a ${c.athleteName} (${c.concept}).`);
      await fetchPaymentsData();
    } catch {
      setErrorMsg('Error de red al enviar el aviso de pago.');
    } finally {
      setSendingChargeReminderId(null);
    }
  }

  function openPaymentModal(preselectAthleteId?: string, preselectAmount?: number) {
    const targetId = preselectAthleteId || data?.athletes[0]?.id || '';
    setErrorMsg(null);
    setPayAthleteId(targetId);
    setPayAmount(preselectAmount ? preselectAmount.toFixed(2) : '');
    setPayMethod('BANK_TRANSFER');
    setPayDate(data?.todayMadrid || formatMadridDateString(new Date()));
    setPayReference('');
    setPayNotes('');
    setPaymentModalOpen(true);
  }

  function openEnrollmentModal() {
    setErrorMsg(null);
    setEnrAthleteId('');
    setEnrProductId('');
    setEnrPlanId('');
    setEnrStartMonth(9);
    setEnrDiscountIds([]);
    setEnrManualActive(false);
    setEnrManualLabel('');
    setEnrManualType('PERCENTAGE');
    setEnrManualValue('');
    setEnrManualReason('');
    setEnrPayerName('');
    setEnrPayerEmail('');
    setEnrPayerDni('');
    setEnrNotes('');
    setEnrollmentModalOpen(true);
  }

  function openProductModal(product?: ProductItem) {
    setErrorMsg(null);
    if (product) {
      setProdId(product.id);
      setProdName(product.name);
      setProdType(product.productType);
      setProdRecurring(product.isRecurring);
      setProdDescription(product.description || '');
    } else {
      setProdId(null);
      setProdName('');
      setProdType('SEASON_FEE');
      setProdRecurring(true);
      setProdDescription('');
    }
    setProductModalOpen(true);
  }

  function openPricePlanModal(productId?: string, plan?: PricePlanItem) {
    setErrorMsg(null);
    if (plan) {
      setPlanId(plan.id);
      setPlanTargetProductId(productId || plan.productId);
      setPlanName(plan.name);
      setPlanPeriodicity(plan.periodicity);
      setPlanTotalAmount(String(plan.totalAmount));
      setPlanInstallments(String(plan.installmentsCount));
      setPlanDueDay(String(plan.dueDay));
      setPlanActiveMonths(plan.activeMonths);
      setPlanProration(plan.prorationMode);
    } else {
      setPlanId(null);
      setPlanTargetProductId(productId || data?.products[0]?.id || '');
      setPlanName('');
      setPlanPeriodicity('MONTHLY');
      setPlanTotalAmount('');
      setPlanInstallments('9');
      setPlanDueDay('5');
      setPlanActiveMonths([9, 10, 11, 12, 1, 2, 3, 4, 5]);
      setPlanProration('BY_REMAINING_MONTHS');
    }
    setPricePlanModalOpen(true);
  }

  function openDiscountModal(rule?: DiscountRuleItem) {
    setErrorMsg(null);
    if (rule) {
      setDiscId(rule.id);
      setDiscName(rule.name);
      setDiscKind(rule.kind);
      setDiscValueType(rule.valueType);
      setDiscValue(String(rule.value));
      setDiscProductIds(rule.applicableProductIds);
      setDiscStackable(rule.stackable);
      setDiscMaxCap(rule.maxDiscountAmount ? String(rule.maxDiscountAmount) : '');
      setDiscRequiresReason(rule.requiresReason);
    } else {
      setDiscId(null);
      setDiscName('');
      setDiscKind('SIBLING');
      setDiscValueType('PERCENTAGE');
      setDiscValue('');
      setDiscProductIds([]);
      setDiscStackable(false);
      setDiscMaxCap('');
      setDiscRequiresReason(false);
    }
    setDiscountModalOpen(true);
  }

  async function handleRecordPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await postPaymentAction(
      {
        action: 'record_payment',
        athleteId: payAthleteId,
        amount: Number(payAmount),
        method: payMethod,
        paidMadridDate: payDate,
        reference: payReference || undefined,
        notes: payNotes || undefined,
      },
      'Cobro registrado y recibo generado correctamente.'
    );
    if (ok) {
      setPaymentModalOpen(false);
    }
  }

  async function handleReasonModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonModal || !reasonText.trim()) return;
    const payload =
      reasonModal.kind === 'void_payment'
        ? { action: 'void_payment', paymentId: reasonModal.targetId, reason: reasonText.trim() }
        : { action: 'waive_charge', chargeId: reasonModal.targetId, reason: reasonText.trim() };
    const ok = await postPaymentAction(
      payload,
      reasonModal.kind === 'void_payment'
        ? 'Cobro anulado y saldo recalculado.'
        : 'Cargo marcado como condonado.'
    );
    if (ok) {
      setReasonModal(null);
      setReasonText('');
    }
  }

  async function handleEnrollmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await postPaymentAction(
      {
        action: 'create_enrollment',
        athleteId: enrAthleteId,
        productId: enrProductId,
        pricePlanId: enrPlanId,
        seasonId: data?.currentSeasonId,
        payerName: enrPayerName,
        payerEmail: enrPayerEmail || undefined,
        payerDni: enrPayerDni || undefined,
        discountRuleIds: enrDiscountIds,
        manualDiscount:
          enrManualActive && Number(enrManualValue) > 0
            ? {
                label: enrManualLabel || 'Descuento manual',
                valueType: enrManualType,
                value: Number(enrManualValue),
                reason: enrManualReason,
              }
            : undefined,
        startMonth: selectedEnrPlan?.periodicity === 'MONTHLY' ? enrStartMonth : undefined,
        notes: enrNotes || undefined,
      },
      'Inscripción creada y cargos generados correctamente.'
    );
    if (ok) {
      setEnrollmentModalOpen(false);
      setEnrAthleteId('');
      setEnrProductId('');
      setEnrPlanId('');
      setEnrDiscountIds([]);
      setEnrManualActive(false);
      setEnrManualLabel('');
      setEnrManualValue('');
      setEnrManualReason('');
      setEnrPayerName('');
      setEnrPayerEmail('');
      setEnrPayerDni('');
      setEnrNotes('');
    }
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await postPaymentAction(
      {
        action: 'upsert_product',
        id: prodId,
        seasonId: data?.currentSeasonId,
        name: prodName,
        productType: prodType,
        isRecurring: prodRecurring,
        description: prodDescription || null,
      },
      prodId ? 'Producto actualizado.' : 'Producto creado.'
    );
    if (ok) {
      setProductModalOpen(false);
      setProdId(null);
      setProdName('');
      setProdDescription('');
    }
  }

  async function handlePricePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await postPaymentAction(
      {
        action: 'upsert_price_plan',
        id: planId,
        productId: planTargetProductId,
        name: planName,
        periodicity: planPeriodicity,
        totalAmount: Number(planTotalAmount),
        installmentsCount: Number(planInstallments || 1),
        dueDay: Number(planDueDay || 5),
        activeMonths: planActiveMonths,
        prorationMode: planProration,
      },
      planId ? 'Modalidad actualizada.' : 'Modalidad de pago añadida.'
    );
    if (ok) {
      setPricePlanModalOpen(false);
      setPlanId(null);
      setPlanName('');
      setPlanTotalAmount('');
    }
  }

  async function handleDiscountSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await postPaymentAction(
      {
        action: 'upsert_discount_rule',
        id: discId,
        seasonId: data?.currentSeasonId,
        name: discName,
        kind: discKind,
        valueType: discValueType,
        value: Number(discValue),
        applicableProductIds: discProductIds,
        stackable: discStackable,
        maxDiscountAmount: discMaxCap ? Number(discMaxCap) : null,
        requiresReason: discRequiresReason,
      },
      discId ? 'Regla de descuento actualizada.' : 'Regla de descuento creada.'
    );
    if (ok) {
      setDiscountModalOpen(false);
      setDiscId(null);
      setDiscName('');
      setDiscValue('');
      setDiscMaxCap('');
      setDiscProductIds([]);
    }
  }

  if (!canRead) {
    return (
      <div className="bg-surface-container border border-white/10 p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h1 className="font-headline text-xl font-bold uppercase text-white">
              Acceso Restringido · Tesorería
            </h1>
            <p className="text-sm text-tertiary mt-1">
              Tu perfil de staff no dispone de permisos de gestión económica o cobros.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-primary-container shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-label-sm uppercase tracking-widest text-primary font-bold">
                Tesorería y Cuotas · Temporada {data?.currentSeasonId || '2026-2027'}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
              Gestión de Pagos y Productos
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canRecord && (
              <button
                type="button"
                onClick={() => openPaymentModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase tracking-wider font-bold shadow-[3px_3px_0px_0px_#0e0e0e] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Registrar Cobro</span>
              </button>
            )}
            {(canRecord || canReports) && (
              <button
                type="button"
                onClick={handleSendReminders}
                disabled={busy || !data}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase tracking-wider font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Enviar avisos</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase tracking-wider font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fetchPaymentsData()}
              disabled={loading || busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase tracking-wider font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div
          role="tablist"
          aria-label="Secciones de Tesorería"
          className="mt-5 flex flex-wrap gap-1.5 border-t border-white/10 pt-4"
        >
          {(
            [
              { id: 'resumen', label: 'Resumen', icon: TrendingUp, show: true },
              { id: 'cargos', label: 'Cargos y Cobros', icon: FileText, show: true },
              {
                id: 'inscripciones',
                label: 'Cuotas Asignadas',
                icon: UserPlus,
                show: canRecord || canApplyDiscounts,
              },
              {
                id: 'productos',
                label: 'Productos',
                icon: Package,
                show: canManageProducts,
              },
              {
                id: 'descuentos',
                label: 'Descuentos',
                icon: BadgePercent,
                show: canManageDiscounts,
              },
            ] as const
          )
            .filter((t) => t.show)
            .map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-label-md uppercase tracking-wider font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container-low text-on-surface/80 border-white/10 hover:text-white hover:border-white/25'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </header>

      {/* Mensajes de estado */}
      {errorMsg && (
        <div
          role="alert"
          className="bg-error-container/40 border border-error/40 text-error px-4 py-3 text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}
      {toastMsg && (
        <div
          role="status"
          className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 px-4 py-3 text-sm flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="bg-surface-container border border-white/10 p-10 flex items-center justify-center gap-3 text-sm text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin text-primary-container" aria-hidden="true" />
          <span>Cargando contabilidad y cuotas del club...</span>
        </div>
      ) : null}

      {/* TAB 1: RESUMEN */}
      {data && activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="bg-surface-container border border-white/10 p-4 shadow-[3px_3px_0px_0px_#0e0e0e]">
              <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">Total Previsto</p>
              <p className="font-headline text-2xl font-bold text-white mt-1">
                {eur(data.reports.totalExpected)}
              </p>
            </div>
            <div className="bg-surface-container border border-emerald-500/30 p-4 shadow-[3px_3px_0px_0px_#0e0e0e]">
              <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">Total Cobrado</p>
              <p className="font-headline text-2xl font-bold text-emerald-300 mt-1">
                {eur(data.reports.totalCollected)}
              </p>
            </div>
            <div className="bg-surface-container border border-amber-500/30 p-4 shadow-[3px_3px_0px_0px_#0e0e0e]">
              <p className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">Total Pendiente</p>
              <p className="font-headline text-2xl font-bold text-amber-300 mt-1">
                {eur(data.reports.totalPending)}
              </p>
            </div>
            <div className="bg-surface-container border border-rose-500/40 p-4 shadow-[3px_3px_0px_0px_#0e0e0e]">
              <p className="text-[11px] uppercase tracking-wider text-rose-300 font-bold">Total Vencido</p>
              <p className="font-headline text-2xl font-bold text-rose-300 mt-1">
                {eur(data.reports.totalOverdue)}
              </p>
            </div>
            <div className="bg-surface-container border border-sky-500/30 p-4 shadow-[3px_3px_0px_0px_#0e0e0e]">
              <p className="text-[11px] uppercase tracking-wider text-sky-300 font-bold">Descuentos Aplicados</p>
              <p className="font-headline text-2xl font-bold text-sky-300 mt-1">
                {eur(data.reports.totalDiscountsApplied)}
              </p>
            </div>
          </div>

          {/* Antigüedad de Morosidad + Métodos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-container border border-white/10 p-4 sm:p-5">
              <h2 className="font-headline text-base font-bold uppercase text-white mb-3">
                Antigüedad de Morosidad (sobre fecha Madrid)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-tertiary text-[11px] uppercase">
                      <th className="py-2 pr-3">Tramo</th>
                      <th className="py-2 pr-3">Cargos</th>
                      <th className="py-2 text-right">Importe Vencido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.reports.overdueAging.map((b) => (
                      <tr key={b.bucket}>
                        <td className="py-2.5 pr-3 font-semibold text-white">{b.bucket}</td>
                        <td className="py-2.5 pr-3 text-tertiary">{b.count}</td>
                        <td className="py-2.5 text-right font-bold text-rose-300">{eur(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-surface-container border border-white/10 p-4 sm:p-5">
              <h2 className="font-headline text-base font-bold uppercase text-white mb-3">
                Desglose por Método de Cobro
              </h2>
              {data.reports.byMethod.length === 0 ? (
                <p className="text-xs text-tertiary">Aún no hay cobros completados registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-tertiary text-[11px] uppercase">
                        <th className="py-2 pr-3">Método</th>
                        <th className="py-2 pr-3">Operaciones</th>
                        <th className="py-2 text-right">Cobrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.reports.byMethod.map((m) => (
                        <tr key={m.method}>
                          <td className="py-2.5 pr-3 font-semibold text-white">{m.label}</td>
                          <td className="py-2.5 pr-3 text-tertiary">{m.count}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-300">{eur(m.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Desglose por Equipo y Mes (plegables por defecto para evitar scroll largo) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <details className="group bg-surface-container border border-white/10 overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                <h2 className="font-headline text-sm sm:text-base font-bold uppercase text-white">
                  Desglose por Equipo ({data.reports.byTeam.length})
                </h2>
                <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-white/10">
                {data.reports.byTeam.length === 0 ? (
                  <p className="text-xs text-tertiary">Sin datos económicos por equipo todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-tertiary text-[11px] uppercase">
                          <th className="py-2 pr-2">Equipo</th>
                          <th className="py-2 pr-2 text-right">Previsto</th>
                          <th className="py-2 pr-2 text-right">Cobrado</th>
                          <th className="py-2 text-right">Vencido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.reports.byTeam.map((t) => (
                          <tr key={t.teamId}>
                            <td className="py-2 pr-2 font-semibold text-white">
                              {t.teamName} <span className="text-tertiary font-normal">({t.athletesCount})</span>
                            </td>
                            <td className="py-2 pr-2 text-right text-on-surface">{eur(t.expected)}</td>
                            <td className="py-2 pr-2 text-right text-emerald-300">{eur(t.collected)}</td>
                            <td className="py-2 text-right text-rose-300">{eur(t.overdue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>

            <details className="group bg-surface-container border border-white/10 overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                <h2 className="font-headline text-sm sm:text-base font-bold uppercase text-white">
                  Evolución Mensual ({data.reports.byMonth.length})
                </h2>
                <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-white/10">
                {data.reports.byMonth.length === 0 ? (
                  <p className="text-xs text-tertiary">Sin movimientos mensuales todavía.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-tertiary text-[11px] uppercase">
                          <th className="py-2 pr-2">Mes</th>
                          <th className="py-2 pr-2 text-right">Previsto</th>
                          <th className="py-2 pr-2 text-right">Cobrado</th>
                          <th className="py-2 text-right">Vencido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.reports.byMonth.map((m) => (
                          <tr key={m.month}>
                            <td className="py-2 pr-2 font-mono font-semibold text-white">{m.month}</td>
                            <td className="py-2 pr-2 text-right text-on-surface">{eur(m.expected)}</td>
                            <td className="py-2 pr-2 text-right text-emerald-300">{eur(m.collected)}</td>
                            <td className="py-2 text-right text-rose-300">{eur(m.overdue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* TAB 2: CARGOS Y COBROS */}
      {data && activeTab === 'cargos' && (
        <div className="space-y-4">
          <div className="bg-surface-container border border-white/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setChargesSubView('charges')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border cursor-pointer ${
                    chargesSubView === 'charges'
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container-low text-tertiary border-white/10 hover:text-white'
                  }`}
                >
                  Cargos ({filteredCharges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChargesSubView('payments')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase border cursor-pointer ${
                    chargesSubView === 'payments'
                      ? 'bg-primary-container text-white border-primary-container'
                      : 'bg-surface-container-low text-tertiary border-white/10 hover:text-white'
                  }`}
                >
                  Historial de Pagos y Recibos ({filteredPayments.length})
                </button>
              </div>

              {canRecord && (
                <button
                  type="button"
                  onClick={() => openPaymentModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Registrar Cobro Manual</span>
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar deportista, concepto o código"
                  placeholder="Buscar deportista, concepto o código..."
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white placeholder:text-tertiary"
                />
              </div>

              <div className="relative">
                <Filter className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <select
                  value={filterTeamId}
                  onChange={(e) => setFilterTeamId(e.target.value)}
                  aria-label="Filtrar por equipo"
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                >
                  <option value="ALL">Todos los equipos</option>
                  {groupByCategoryFamily(data.teams, (t) => `${t.id} ${t.name}`).map(
                    ({ family, items: familyTeams }) => (
                      <optgroup key={family.code} label={family.label}>
                        {familyTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {getShortTeamLabelInFamily(t.name, family.code)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              </div>

              {chargesSubView === 'charges' && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filtrar por estado de cargo"
                  className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="VENCIDO">Vencido</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PARCIAL">Parcial</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="CONDONADO">Condonado</option>
                </select>
              )}
            </div>
          </div>

          {chargesSubView === 'charges' ? (
            <div className="bg-surface-container border border-white/10 p-3 sm:p-4">
              {filteredCharges.length === 0 ? (
                <p className="text-sm text-tertiary py-6 text-center">
                  No hay cargos que coincidan con los filtros actuales.
                </p>
              ) : (
                <>
                  {/* Móvil: Tarjetas */}
                  <div className="space-y-3 md:hidden">
                    {filteredCharges.map((c) => (
                      <div key={c.id} className="bg-surface-container-low border border-white/10 p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white truncate">{c.athleteName}</p>
                            <p className="text-[11px] text-tertiary truncate">{c.teamName}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${chargeBadgeClass(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface">{c.concept}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                          <span>Vence: <strong className="text-white">{formatDisplayDate(c.dueMadridDate)}</strong></span>
                          <span>Final: <strong className="text-white">{eur(c.finalAmount)}</strong> · Pend.: <strong className="text-amber-300">{eur(c.pendingAmount)}</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {canRecord && c.pendingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(c.athleteId, c.pendingAmount)}
                              className="px-2.5 py-1 bg-primary-container text-white text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Cobrar
                            </button>
                          )}
                          {(canRecord || canReports) &&
                            ['PENDIENTE', 'PARCIAL', 'VENCIDO'].includes(c.status) &&
                            c.pendingAmount > 0 && (
                              <button
                                type="button"
                                disabled={sendingChargeReminderId === c.id}
                                onClick={() => handleSendSingleChargeReminder(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-high border border-amber-400/35 text-amber-200 hover:text-white text-[11px] font-bold uppercase cursor-pointer disabled:opacity-50"
                              >
                                {sendingChargeReminderId === c.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-hidden="true" />
                                ) : (
                                  <Mail className="w-3 h-3 shrink-0" aria-hidden="true" />
                                )}
                                <span>{sendingChargeReminderId === c.id ? 'Enviando...' : 'Enviar aviso'}</span>
                              </button>
                            )}
                          {canVoid && !['ANULADO', 'CONDONADO'].includes(c.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setErrorMsg(null);
                                setReasonText('');
                                setReasonModal({
                                  kind: 'waive_charge',
                                  targetId: c.id,
                                  title: 'Condonar Cargo',
                                  subtitle: `${c.athleteName} · ${c.concept} (${eur(c.finalAmount)})`,
                                });
                              }}
                              className="px-2.5 py-1 bg-surface-container-high border border-white/15 text-xs text-sky-300 font-bold uppercase cursor-pointer"
                            >
                              Condonar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Tabla */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-tertiary uppercase text-[11px]">
                          <th className="py-2.5 pr-3">Deportista / Equipo</th>
                          <th className="py-2.5 pr-3">Concepto</th>
                          <th className="py-2.5 pr-3">Vencimiento</th>
                          <th className="py-2.5 pr-3 text-right">Final</th>
                          <th className="py-2.5 pr-3 text-right">Pagado</th>
                          <th className="py-2.5 pr-3 text-right">Pendiente</th>
                          <th className="py-2.5 pr-3">Estado</th>
                          <th className="py-2.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCharges.map((c) => (
                          <tr key={c.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 pr-3">
                              <div className="font-bold text-white">{c.athleteName}</div>
                              <div className="text-[11px] text-tertiary">{c.teamName} · <code className="text-[10px]">{c.paymentReferenceCode}</code></div>
                            </td>
                            <td className="py-2.5 pr-3 text-on-surface">
                              {c.concept}
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-white">
                              {formatDisplayDate(c.dueMadridDate)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-white">{eur(c.finalAmount)}</td>
                            <td className="py-2.5 pr-3 text-right text-emerald-300">{eur(c.paidAmount)}</td>
                            <td className="py-2.5 pr-3 text-right font-bold text-amber-300">{eur(c.pendingAmount)}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${chargeBadgeClass(c.status)}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                              {canRecord && c.pendingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(c.athleteId, c.pendingAmount)}
                                  className="px-2 py-1 bg-primary-container hover:bg-cta-hover text-white text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Cobrar
                                </button>
                              )}
                              {(canRecord || canReports) &&
                                ['PENDIENTE', 'PARCIAL', 'VENCIDO'].includes(c.status) &&
                                c.pendingAmount > 0 && (
                                  <button
                                    type="button"
                                    disabled={sendingChargeReminderId === c.id}
                                    onClick={() => handleSendSingleChargeReminder(c)}
                                    title="Enviar aviso individual de pago pendiente por correo"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-high border border-amber-400/35 text-amber-200 hover:text-white text-[10px] font-bold uppercase cursor-pointer disabled:opacity-50"
                                  >
                                    {sendingChargeReminderId === c.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-hidden="true" />
                                    ) : (
                                      <Mail className="w-3 h-3 shrink-0" aria-hidden="true" />
                                    )}
                                    <span>{sendingChargeReminderId === c.id ? 'Enviando' : 'Enviar aviso'}</span>
                                  </button>
                                )}
                              {canVoid && !['ANULADO', 'CONDONADO'].includes(c.status) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setErrorMsg(null);
                                    setReasonText('');
                                    setReasonModal({
                                      kind: 'waive_charge',
                                      targetId: c.id,
                                      title: 'Condonar Cargo',
                                      subtitle: `${c.athleteName} · ${c.concept} (${eur(c.finalAmount)})`,
                                    });
                                  }}
                                  className="px-2 py-1 bg-surface-container-high border border-white/15 text-sky-300 hover:text-white text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Condonar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-surface-container border border-white/10 p-3 sm:p-4">
              {filteredPayments.length === 0 ? (
                <p className="text-sm text-tertiary py-6 text-center">No hay cobros registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-tertiary uppercase text-[11px]">
                        <th className="py-2.5 pr-3">Recibo</th>
                        <th className="py-2.5 pr-3">Fecha</th>
                        <th className="py-2.5 pr-3">Deportista</th>
                        <th className="py-2.5 pr-3">Método</th>
                        <th className="py-2.5 pr-3 text-right">Importe</th>
                        <th className="py-2.5 pr-3">Estado</th>
                        <th className="py-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-3 font-mono text-white font-semibold">{p.receiptNumber}</td>
                          <td className="py-2.5 pr-3 font-mono text-tertiary">
                            {formatDisplayDate(p.paidMadridDate)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="font-bold text-white">{p.athleteName}</div>
                            <div className="text-[11px] text-tertiary">{p.teamName}</div>
                          </td>
                          <td className="py-2.5 pr-3 text-on-surface">
                            {p.methodLabel}
                            {p.reference && <div className="text-[10px] text-tertiary">Ref: {p.reference}</div>}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-bold text-emerald-300">{eur(p.amount)}</td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                p.status === 'COMPLETED'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                              }`}
                            >
                              {p.status === 'COMPLETED' ? 'COMPLETADO' : 'ANULADO'}
                            </span>
                            {p.voidReason && (
                              <div className="text-[10px] text-rose-300 mt-0.5">{p.voidReason}</div>
                            )}
                          </td>
                          <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                            {p.status === 'COMPLETED' && (
                              <a
                                href={`/api/intranet/payments/receipt/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-[10px] font-bold uppercase"
                              >
                                <Download className="w-3 h-3 text-primary" aria-hidden="true" />
                                <span>Recibo PDF</span>
                              </a>
                            )}
                            {canVoid && p.status === 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setErrorMsg(null);
                                  setReasonText('');
                                  setReasonModal({
                                    kind: 'void_payment',
                                    targetId: p.id,
                                    title: 'Anular Cobro',
                                    subtitle: `Recibo ${p.receiptNumber} · ${p.athleteName} (${eur(p.amount)})`,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-error-container/40 border border-error/40 text-error text-[10px] font-bold uppercase cursor-pointer"
                              >
                                <Ban className="w-3 h-3" aria-hidden="true" />
                                <span>Anular</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INSCRIPCIONES */}
      {data && activeTab === 'inscripciones' && (
        <div className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="font-headline text-base font-bold uppercase text-white">
              Inscripciones Activas ({data.enrollments.length})
            </h2>
            <button
              type="button"
              onClick={openEnrollmentModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Nueva inscripción</span>
            </button>
          </div>

          {data.enrollments.length === 0 ? (
            <p className="text-xs text-tertiary py-6 text-center">
              No hay inscripciones registradas todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.enrollments.map((enr) => (
                <div key={enr.id} className="bg-surface-container-low border border-white/10 p-3.5 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm">{enr.athleteName}</span>
                    <code className="px-2 py-0.5 bg-primary-container/20 text-primary border border-primary-container/40 text-[11px] font-bold">
                      {enr.paymentReferenceCode}
                    </code>
                  </div>
                  <p className="text-on-surface">
                    {enr.productName} ·{' '}
                    <span className="text-tertiary">
                      {enr.planName} ({PERIODICITY_LABELS[enr.periodicity] || enr.periodicity})
                    </span>
                  </p>
                  <p className="text-tertiary">
                    Pagador: {enr.payerName} {enr.payerEmail ? `(${enr.payerEmail})` : ''} · Equipo: {enr.teamName}
                  </p>
                  {enr.appliedDiscounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {enr.appliedDiscounts.map((ad, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px]">
                          {ad.label}: -{eur(ad.computedAmount)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRODUCTOS Y MODALIDADES */}
      {data && activeTab === 'productos' && (
        <div className="space-y-4">
          <div className="bg-surface-container border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-headline text-base font-bold uppercase text-white">
              Productos y Modalidades ({data.products.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openProductModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Nuevo producto</span>
              </button>
              <button
                type="button"
                onClick={() => openPricePlanModal()}
                disabled={data.products.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-xs font-label-md uppercase font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Nueva modalidad</span>
              </button>
            </div>
          </div>

          {data.products.length === 0 ? (
            <div className="bg-surface-container border border-white/10 p-6 text-sm text-tertiary text-center">
              No hay productos configurados aún. Crea el primero con el botón «Nuevo producto».
            </div>
          ) : (
            <div className="space-y-4">
              {data.products.map((p) => (
                <div key={p.id} className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                        {PRODUCT_TYPE_LABELS[p.productType] || p.productType} · {p.seasonId}
                      </span>
                      <h3 className="font-headline text-lg font-bold text-white">{p.name}</h3>
                      {p.description && <p className="text-xs text-tertiary mt-0.5">{p.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openProductModal(p)}
                        className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-[11px] font-bold uppercase text-white cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => openPricePlanModal(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary-container hover:bg-cta-hover text-[11px] font-bold uppercase text-white cursor-pointer"
                      >
                        <Plus className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Modalidad</span>
                      </button>
                    </div>
                  </div>

                  {p.pricePlans.length === 0 ? (
                    <p className="text-xs text-tertiary">Sin modalidades de pago configuradas.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {p.pricePlans.map((pl) => (
                        <div key={pl.id} className="bg-surface-container-low border border-white/10 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white">{pl.name}</span>
                            <span className="font-bold text-emerald-300 shrink-0">{eur(pl.totalAmount)}</span>
                          </div>
                          <p className="text-tertiary">
                            {PERIODICITY_LABELS[pl.periodicity]} · Día {pl.dueDay} · {PRORATION_LABELS[pl.prorationMode]}
                          </p>
                          <button
                            type="button"
                            onClick={() => openPricePlanModal(p.id, pl)}
                            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Editar modalidad
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DESCUENTOS CONFIGURABLES */}
      {data && activeTab === 'descuentos' && (
        <div className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="font-headline text-base font-bold uppercase text-white">
              Reglas de Descuento Configuradas ({data.discountRules.length})
            </h2>
            <button
              type="button"
              onClick={() => openDiscountModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Nueva regla</span>
            </button>
          </div>

          {data.discountRules.length === 0 ? (
            <p className="text-xs text-tertiary py-6 text-center">
              No hay descuentos configurados todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {data.discountRules.map((r) => (
                <div
                  key={r.id}
                  className={`border p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    r.isActive
                      ? 'bg-surface-container-low border-white/10'
                      : 'bg-surface-container-lowest border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{r.name}</span>
                      <span className="px-2 py-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                        {r.valueType === 'PERCENTAGE' ? `-${r.value}%` : `-${eur(r.value)}`}
                      </span>
                      {r.stackable && (
                        <span className="px-1.5 py-0.5 bg-white/10 text-on-surface text-[10px]">Acumulable</span>
                      )}
                      {r.requiresReason && (
                        <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 text-[10px]">Motivo obligatorio</span>
                      )}
                    </div>
                    <p className="text-tertiary">
                      {DISCOUNT_KIND_LABELS[r.kind] || r.kind}
                      {r.maxDiscountAmount ? ` · Tope ${eur(r.maxDiscountAmount)}` : ''}
                      {r.applicableProductIds.length > 0
                        ? ` · ${r.applicableProductIds.length} producto(s)`
                        : ' · Todos los productos'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openDiscountModal(r)}
                      className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-[11px] font-bold uppercase cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        postPaymentAction(
                          { action: 'toggle_discount_rule', id: r.id, isActive: !r.isActive },
                          r.isActive ? 'Descuento desactivado.' : 'Descuento activado.'
                        )
                      }
                      className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-[11px] font-bold uppercase text-primary cursor-pointer"
                    >
                      {r.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NUEVA INSCRIPCIÓN */}
      <IntranetModal
        isOpen={enrollmentModalOpen && Boolean(data)}
        onClose={() => setEnrollmentModalOpen(false)}
        title="Nueva Inscripción de Cuota / Producto"
        subtitle="Asocia un producto y modalidad a un deportista para generar sus cargos"
        size="lg"
      >
        {data && (
          <form onSubmit={handleEnrollmentSubmit} className="space-y-3.5">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="pagos-enr-athlete" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Deportista</label>
              <select
                id="pagos-enr-athlete"
                required
                value={enrAthleteId}
                onChange={(e) => {
                  const aid = e.target.value;
                  setEnrAthleteId(aid);
                  const ath = data.athletes.find((a) => a.id === aid);
                  if (ath) {
                    setEnrPayerName(ath.guardianName || ath.name);
                    setEnrPayerEmail(ath.guardianEmail || '');
                  }
                }}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                <option value="">Selecciona deportista...</option>
                {data.athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.teamName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pagos-enr-product" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Producto</label>
                <select
                  id="pagos-enr-product"
                  required
                  value={enrProductId}
                  onChange={(e) => {
                    setEnrProductId(e.target.value);
                    setEnrPlanId('');
                    setEnrDiscountIds([]);
                  }}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  <option value="">Selecciona producto...</option>
                  {data.products
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="pagos-enr-plan" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Modalidad</label>
                <select
                  id="pagos-enr-plan"
                  required
                  value={enrPlanId}
                  onChange={(e) => setEnrPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  <option value="">Selecciona modalidad...</option>
                  {(selectedEnrProduct?.pricePlans || [])
                    .filter((pl) => pl.isActive)
                    .map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({eur(pl.totalAmount)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedEnrPlan?.periodicity === 'MONTHLY' && (
              <div>
                <label htmlFor="pagos-enr-start-month" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                  Mes de inicio (Prorrateo: {PRORATION_LABELS[selectedEnrPlan.prorationMode]})
                </label>
                <select
                  id="pagos-enr-start-month"
                  value={enrStartMonth}
                  onChange={(e) => setEnrStartMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  {MONTH_OPTIONS.filter((m) =>
                    selectedEnrPlan.activeMonths.includes(m.num)
                  ).map((m) => (
                    <option key={m.num} value={m.num}>
                      {m.label} (Mes {m.num})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canApplyDiscounts && applicableRulesForEnr.length > 0 && (
              <div className="space-y-1.5 border border-white/10 p-3 bg-surface-container">
                <p className="text-[11px] font-bold uppercase text-tertiary">Descuentos Configurados Aplicables</p>
                {applicableRulesForEnr.map((r) => {
                  const checked = enrDiscountIds.includes(r.id);
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setEnrDiscountIds((prev) =>
                            e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                          )
                        }
                      />
                      <span>
                        {r.name} ({r.valueType === 'PERCENTAGE' ? `${r.value}%` : eur(r.value)})
                        {r.stackable ? ' · Acumulable' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {canApplyDiscounts && (
              <div className="border border-white/10 p-3 bg-surface-container space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrManualActive}
                    onChange={(e) => setEnrManualActive(e.target.checked)}
                  />
                  <span>Añadir ajuste / descuento manual puntual</span>
                </label>
                {enrManualActive && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      aria-label="Etiqueta del ajuste manual"
                      placeholder="Etiqueta (ej. Beca Junta)"
                      value={enrManualLabel}
                      onChange={(e) => setEnrManualLabel(e.target.value)}
                      className="px-2.5 py-1.5 bg-surface-container-highest border border-white/15 text-xs text-white"
                    />
                    <div className="flex gap-1.5">
                      <select
                        aria-label="Tipo de ajuste manual"
                        value={enrManualType}
                        onChange={(e) => setEnrManualType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                        className="px-2 py-1.5 bg-surface-container-highest border border-white/15 text-xs text-white"
                      >
                        <option value="PERCENTAGE">%</option>
                        <option value="FIXED">€</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label="Valor del ajuste manual"
                        placeholder="Valor"
                        value={enrManualValue}
                        onChange={(e) => setEnrManualValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-container-highest border border-white/15 text-xs text-white"
                      />
                    </div>
                    <input
                      type="text"
                      required={enrManualActive}
                      aria-label="Motivo del ajuste manual"
                      placeholder="Motivo obligatorio"
                      value={enrManualReason}
                      onChange={(e) => setEnrManualReason(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 bg-surface-container-highest border border-white/15 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pagos-enr-payer-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Nombre Pagador / Tutor</label>
                <input
                  id="pagos-enr-payer-name"
                  type="text"
                  required
                  value={enrPayerName}
                  onChange={(e) => setEnrPayerName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-enr-payer-email" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Email avisos</label>
                <input
                  id="pagos-enr-payer-email"
                  type="email"
                  value={enrPayerEmail}
                  onChange={(e) => setEnrPayerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pagos-enr-payer-dni" className="block text-[11px] font-bold uppercase text-tertiary mb-1">DNI Pagador (opcional)</label>
                <input
                  id="pagos-enr-payer-dni"
                  type="text"
                  value={enrPayerDni}
                  onChange={(e) => setEnrPayerDni(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-enr-notes" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Observaciones</label>
                <input
                  id="pagos-enr-notes"
                  type="text"
                  value={enrNotes}
                  onChange={(e) => setEnrNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            {enrollmentPreview && (
              <div className="p-3 bg-surface-container border border-primary-container/40 text-xs flex flex-wrap items-center justify-between gap-2">
                <span>Base: <strong>{eur(enrollmentPreview.base)}</strong></span>
                <span>Desc.: <strong className="text-sky-300">-{eur(enrollmentPreview.discount)}</strong></span>
                <span>Total Neto: <strong className="text-emerald-300 text-sm">{eur(enrollmentPreview.net)}</strong></span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEnrollmentModalOpen(false)}
                className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Generando...' : 'Crear Inscripción y Cargos'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: NUEVO / EDITAR PRODUCTO */}
      <IntranetModal
        isOpen={productModalOpen && Boolean(data)}
        onClose={() => setProductModalOpen(false)}
        title={prodId ? 'Editar Producto' : 'Nuevo Producto / Cuota'}
        size="md"
      >
        <form onSubmit={handleProductSubmit} className="space-y-3.5">
          {errorMsg && (
            <div
              role="alert"
              className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="pagos-prod-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Nombre del producto</label>
            <input
              id="pagos-prod-name"
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="Ej. Cuota Cantera Temporada 26/27"
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pagos-prod-type" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Tipo</label>
              <select
                id="pagos-prod-type"
                value={prodType}
                onChange={(e) => setProdType(e.target.value as ProductItem['productType'])}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodRecurring}
                  onChange={(e) => setProdRecurring(e.target.checked)}
                />
                <span>Cuota periódica / recurrente</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="pagos-prod-desc" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Descripción</label>
            <textarea
              id="pagos-prod-desc"
              rows={2}
              value={prodDescription}
              onChange={(e) => setProdDescription(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Guardando...' : prodId ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </IntranetModal>

      {/* MODAL: NUEVA / EDITAR MODALIDAD DE PAGO */}
      <IntranetModal
        isOpen={pricePlanModalOpen && Boolean(data)}
        onClose={() => setPricePlanModalOpen(false)}
        title={planId ? 'Editar Modalidad de Pago' : 'Nueva Modalidad de Pago'}
        size="md"
      >
        {data && (
          <form onSubmit={handlePricePlanSubmit} className="space-y-3.5">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="pagos-plan-product" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Producto asociado</label>
              <select
                id="pagos-plan-product"
                required
                value={planTargetProductId}
                onChange={(e) => setPlanTargetProductId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                <option value="">Selecciona producto...</option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pagos-plan-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Nombre modalidad</label>
                <input
                  id="pagos-plan-name"
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ej. 9 Mensualidades"
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-plan-periodicity" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Periodicidad</label>
                <select
                  id="pagos-plan-periodicity"
                  value={planPeriodicity}
                  onChange={(e) => setPlanPeriodicity(e.target.value as PricePlanItem['periodicity'])}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  {Object.entries(PERIODICITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="pagos-plan-total" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Total (€)</label>
                <input
                  id="pagos-plan-total"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={planTotalAmount}
                  onChange={(e) => setPlanTotalAmount(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-plan-installments" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Plazos</label>
                <input
                  id="pagos-plan-installments"
                  type="number"
                  min="1"
                  max="24"
                  value={planInstallments}
                  onChange={(e) => setPlanInstallments(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-plan-dueday" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Día venc.</label>
                <input
                  id="pagos-plan-dueday"
                  type="number"
                  min="1"
                  max="28"
                  value={planDueDay}
                  onChange={(e) => setPlanDueDay(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pagos-plan-proration" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Prorrateo</label>
              <select
                id="pagos-plan-proration"
                value={planProration}
                onChange={(e) => setPlanProration(e.target.value as PricePlanItem['prorationMode'])}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                {Object.entries(PRORATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="block text-[11px] font-bold uppercase text-tertiary mb-1.5">Meses activos</p>
              <div className="flex flex-wrap gap-1.5">
                {MONTH_OPTIONS.map((m) => {
                  const active = planActiveMonths.includes(m.num);
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() =>
                        setPlanActiveMonths((prev) =>
                          active ? prev.filter((x) => x !== m.num) : [...prev, m.num]
                        )
                      }
                      className={`px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer ${
                        active
                          ? 'bg-primary-container text-white border-primary-container'
                          : 'bg-surface-container text-tertiary border-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPricePlanModalOpen(false)}
                className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Guardando...' : planId ? 'Actualizar Modalidad' : 'Guardar Modalidad'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: NUEVA / EDITAR REGLA DE DESCUENTO */}
      <IntranetModal
        isOpen={discountModalOpen && Boolean(data)}
        onClose={() => setDiscountModalOpen(false)}
        title={discId ? 'Editar Regla de Descuento' : 'Nueva Regla de Descuento'}
        size="md"
      >
        {data && (
          <form onSubmit={handleDiscountSubmit} className="space-y-3.5">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="pagos-disc-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Nombre de la regla</label>
              <input
                id="pagos-disc-name"
                type="text"
                required
                value={discName}
                onChange={(e) => setDiscName(e.target.value)}
                placeholder="Ej. Descuento 2º Hermano/a"
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="pagos-disc-kind" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Tipo</label>
                <select
                  id="pagos-disc-kind"
                  value={discKind}
                  onChange={(e) => setDiscKind(e.target.value as DiscountRuleItem['kind'])}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  {Object.entries(DISCOUNT_KIND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pagos-disc-valtype" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Formato</label>
                <select
                  id="pagos-disc-valtype"
                  value={discValueType}
                  onChange={(e) => setDiscValueType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                >
                  <option value="PERCENTAGE">Porcentaje (%)</option>
                  <option value="FIXED">Importe fijo (€)</option>
                </select>
              </div>
              <div>
                <label htmlFor="pagos-disc-val" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Valor</label>
                <input
                  id="pagos-disc-val"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={discValue}
                  onChange={(e) => setDiscValue(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pagos-disc-cap" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Tope máximo (€, opcional)</label>
              <input
                id="pagos-disc-cap"
                type="number"
                step="0.01"
                min="0"
                value={discMaxCap}
                onChange={(e) => setDiscMaxCap(e.target.value)}
                placeholder="Sin tope"
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              />
            </div>

            {data.products.length > 0 && (
              <div className="border border-white/10 p-3 bg-surface-container space-y-1.5">
                <p className="text-[11px] font-bold uppercase text-tertiary">
                  Productos aplicables (si no marcas ninguno, aplica a todos)
                </p>
                {data.products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discProductIds.includes(p.id)}
                      onChange={(e) =>
                        setDiscProductIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={discStackable}
                  onChange={(e) => setDiscStackable(e.target.checked)}
                />
                <span>Acumulable con otros descuentos</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={discRequiresReason}
                  onChange={(e) => setDiscRequiresReason(e.target.checked)}
                />
                <span>Exigir motivo obligatorio al aplicarlo</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDiscountModalOpen(false)}
                className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Guardando...' : discId ? 'Actualizar Regla' : 'Crear Regla'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: REGISTRAR COBRO MANUAL */}
      <IntranetModal
        isOpen={paymentModalOpen && Boolean(data)}
        onClose={() => setPaymentModalOpen(false)}
        title="Registrar Cobro Manual"
        size="md"
      >
        {data && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="pagos-pay-athlete" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Deportista</label>
              <select
                id="pagos-pay-athlete"
                required
                value={payAthleteId}
                onChange={(e) => setPayAthleteId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                <option value="">Selecciona deportista...</option>
                {data.athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.teamName})
                  </option>
                ))}
              </select>
            </div>

            {payAthleteOpenCharges.length > 0 && (
              <div className="bg-surface-container border border-white/10 p-2.5 text-[11px] space-y-1">
                <p className="font-bold uppercase text-tertiary">Cargos abiertos (se imputarán por orden de vencimiento):</p>
                {payAthleteOpenCharges.slice(0, 4).map((ch) => (
                  <div key={ch.id} className="flex justify-between gap-2 text-on-surface">
                    <span className="truncate">
                      {ch.concept} ({formatDisplayDate(ch.dueMadridDate)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(ch.pendingAmount.toFixed(2))}
                      className="text-amber-300 font-bold hover:underline shrink-0 cursor-pointer"
                    >
                      {eur(ch.pendingAmount)}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pagos-pay-amount" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Importe (€)</label>
                <input
                  id="pagos-pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="pagos-pay-date" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Fecha cobro (Madrid)</label>
                <input
                  id="pagos-pay-date"
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pagos-pay-method" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Método de cobro</label>
              <select
                id="pagos-pay-method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'POS_TERMINAL')}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              >
                <option value="CASH">Efectivo (Caja del Club)</option>
                <option value="BANK_TRANSFER">Transferencia Bancaria</option>
                <option value="POS_TERMINAL">TPV Físico / Datafono</option>
              </select>
            </div>

            <div>
              <label htmlFor="pagos-pay-ref" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Referencia / Concepto bancario</label>
              <input
                id="pagos-pay-ref"
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Ej. CDVSP-2627-... o Nº recibo caja"
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              />
            </div>

            <div>
              <label htmlFor="pagos-pay-notes" className="block text-[11px] font-bold uppercase text-tertiary mb-1">Observaciones</label>
              <input
                id="pagos-pay-notes"
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Guardando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: MOTIVO OBLIGATORIO ANULAR / CONDONAR */}
      <IntranetModal
        isOpen={Boolean(reasonModal)}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.title || 'Motivo obligatorio'}
        subtitle={reasonModal?.subtitle}
        size="sm"
        accent="rose"
      >
        <form onSubmit={handleReasonModalSubmit} className="space-y-3.5">
          {errorMsg && (
            <div
              role="alert"
              className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="pagos-reason-text" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
              Motivo obligatorio (quedará auditado)
            </label>
            <textarea
              id="pagos-reason-text"
              rows={3}
              required
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Indica el motivo exacto..."
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setReasonModal(null)}
              className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !reasonText.trim()}
              className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </IntranetModal>
    </div>
  );
}
