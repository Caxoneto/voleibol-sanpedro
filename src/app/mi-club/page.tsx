'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';
import { CLUB_INFO } from '@/lib/club-info';
import { formatDisplayDate } from '@/lib/date-utils';
import { ABSENCE_REASONS, ATTENDANCE_STATES } from '@/lib/intranet/catalog';

type MemberTab = 'ficha' | 'asistencia' | 'rgpd' | 'pagos';

interface MemberTeam {
  teamSeasonId: string;
  teamName: string;
  division: string;
  isPrimary: boolean;
  dorsal: number | null;
  position: string | null;
}

interface MemberTrainingSlot {
  teamSeasonId: string;
  teamName: string;
  weekday: number;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  venueName: string;
  courtName: string;
}

interface MemberAthlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthYear: number | null;
  birthDate: string | null;
  birthDateVerified: boolean;
  ageEvaluation: {
    age: number | null;
    isMinor: boolean;
    isMinor14To17: boolean;
    isBoundaryUnverified: boolean;
  };
  gender: string;
  shirtSize: string | null;
  jerseyNumber: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: string;
  isOwnAccount: boolean;
  isGuardianView: boolean;
  teams: MemberTeam[];
  trainingSchedule?: MemberTrainingSlot[];
  guardian: {
    fullName: string;
    relationship: string;
    email: string | null;
    phone: string | null;
  } | null;
  consent: {
    status: 'ACTIVE' | 'REVOKED' | 'SHREDDED' | 'PENDING';
    consentSocialMedia: boolean;
    consentStreaming: boolean;
    consentPress: boolean;
    consentImage: boolean;
    consentTravel: boolean;
    signedAtIso: string | null;
    signerName: string | null;
    signerRelationship: string | null;
    signatureMethod: string | null;
    documentHash: string | null;
    canSignInPortal: boolean;
  };
  payments: {
    readOnly: true;
    statusSummary: 'Al corriente' | 'Próximo vencimiento' | 'Vencido' | 'Sin cuotas registradas';
    enrollments: Array<{
      id: string;
      productName: string;
      planName: string;
      periodicity: string;
      seasonId: string;
      payerName: string;
      payerEmail: string | null;
      paymentReferenceCode: string;
      status: string;
      appliedDiscounts?: Array<{
        label: string;
        computedAmount: number;
        reason: string | null;
      }>;
    }>;
    charges: Array<{
      id: string;
      enrollmentId: string;
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
    }>;
    payments: Array<{
      id: string;
      enrollmentId: string | null;
      amount: number;
      method: string;
      methodLabel: string;
      paidMadridDate: string;
      reference: string | null;
      receiptNumber: string;
      origin: string;
      receiptUrl: string;
    }>;
    totals: {
      totalFinal: number;
      totalPaid: number;
      totalPending: number;
      totalOverdue: number;
    };
  };
  attendance?: {
    totalSessions: number;
    presentCount: number;
    lateCount: number;
    justifiedCount: number;
    unjustifiedCount: number;
    injuredCount: number;
    ratePercent: number;
    recentRecords: Array<{
      sessionId: string;
      madridDate: string;
      startTime: string;
      endTime: string;
      teamName: string;
      status: string;
      absenceReason: string | null;
      notes: string | null;
    }>;
  };
}

interface MemberRegistrationRequest {
  id: string;
  athleteId: string;
  athleteFullName: string;
  categoryLabel: string;
  productName: string | null;
  planName: string | null;
  planAmount: number | null;
  isMinor: boolean;
  guardianName: string | null;
  consentImage: boolean;
  consentTravel: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedTeamNames: string[];
  enrollmentId: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  familyGroupId: string | null;
  resubmitPath: string | null;
}

interface MemberApiResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  selectedAthleteId: string | null;
  athletes: MemberAthlete[];
  registrationRequests?: MemberRegistrationRequest[];
  pendingRegistrationCount?: number;
  bankIban: string | null;
}

const SHIRT_SIZES = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

const ATTENDANCE_LABEL_MAP = new Map<string, string>(
  ATTENDANCE_STATES.map((s) => [s.code, s.label])
);
const ABSENCE_REASON_MAP = new Map<string, string>(
  ABSENCE_REASONS.map((r) => [r.code, r.label])
);

const ATTENDANCE_DARK_BADGE: Record<string, string> = {
  PRESENTE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  RETRASO: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  FALTA_JUSTIFICADA: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  FALTA_INJUSTIFICADA: 'bg-rose-500/20 text-rose-300 border-rose-500/45',
  LESIONADO_ASISTE: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
};

function formatYmdEs(ymd: string): string {
  return formatDisplayDate(ymd);
}

function eur(v: number): string {
  return `${v.toFixed(2)} €`;
}

export default function MiClubPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [loading, setLoading] = useState(true);
  const [isStaffUser, setIsStaffUser] = useState(false);
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState<string | null>(null);
  const [downloadingConsentPdf, setDownloadingConsentPdf] = useState(false);
  const [memberData, setMemberData] = useState<MemberApiResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MemberTab>('ficha');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Edición ficha / contacto emergencia
  const [editOpen, setEditOpen] = useState(false);
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');

  // Formulario RGPD integrado (sin preselección)
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [consentImage, setConsentImage] = useState<boolean | null>(null);
  const [consentTravel, setConsentTravel] = useState<boolean | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRel, setSignerRel] = useState<'PADRE' | 'MADRE' | 'TUTOR_LEGAL'>('TUTOR_LEGAL');
  const [signerPhone, setSignerPhone] = useState('');
  const [patriaPotestad, setPatriaPotestad] = useState(false);
  const [minorAssent, setMinorAssent] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const loadPortal = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    setPendingApprovalMsg(null);
    try {
      const meRes = await fetch('/api/intranet/auth/me', { cache: 'no-store', signal });
      if (!meRes.ok) {
        routerRef.current.replace('/acceso');
        return;
      }
      const meJson = await meRes.json();
      const s = meJson?.session;
      if (
        !meJson?.authenticated ||
        !s ||
        s.requiresTwoFactorSetup ||
        s.requiresTwoFactorChallenge
      ) {
        routerRef.current.replace('/acceso');
        return;
      }
      setIsStaffUser(Boolean(s.isStaff));

      const memRes = await fetch('/api/intranet/member', { cache: 'no-store', signal });
      const memJson = (await memRes.json()) as MemberApiResponse & { error?: string; code?: string };
      if (memRes.status === 403 || memJson?.code === 'PENDING_ADMIN_APPROVAL') {
        setPendingApprovalMsg(
          memJson?.error ||
            'Tu inscripción y autorizaciones ya están registradas, pero aún están pendientes de aceptación y asignación de equipo por parte de la administración del club.'
        );
        setLoading(false);
        return;
      }
      if (!memRes.ok || !memJson.success) {
        setErrorMsg(memJson.error || 'No se pudo cargar tu zona privada.');
        setLoading(false);
        return;
      }
      setMemberData(memJson);
      setSelectedId((prev) =>
        prev && memJson.athletes.some((a) => a.id === prev)
          ? prev
          : memJson.selectedAthleteId || memJson.athletes[0]?.id || ''
      );
      setLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setErrorMsg('Error de conexión al cargar tu perfil.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPortal(controller.signal);
    return () => controller.abort();
  }, [loadPortal]);

  const selectedAthlete = useMemo(
    () => memberData?.athletes.find((a) => a.id === selectedId) || memberData?.athletes[0] || null,
    [memberData, selectedId]
  );

  // Sincronizar campos al cambiar deportista
  useEffect(() => {
    if (!selectedAthlete) return;
    setEmName(selectedAthlete.emergencyContactName || '');
    setEmPhone(selectedAthlete.emergencyContactPhone || '');
    setUserPhone(memberData?.user.phone || selectedAthlete.guardian?.phone || '');
    setShirtSize(selectedAthlete.shirtSize || '');
    setBirthDateInput(selectedAthlete.birthDate || '');

    // Reiniciar formulario RGPD sin preselección
    setShowConsentForm(false);
    setConsentImage(null);
    setConsentTravel(null);
    setSignerName(
      selectedAthlete.ageEvaluation.isMinor
        ? selectedAthlete.guardian?.fullName || memberData?.user.name || ''
        : selectedAthlete.fullName
    );
    setSignerDni('');
    setSignerPhone(memberData?.user.phone || selectedAthlete.guardian?.phone || '');
    setPatriaPotestad(false);
    setMinorAssent(false);
    setPolicyAccepted(false);
    setSignatureData(null);
  }, [selectedAthlete, memberData]);

  async function handleLogout() {
    try {
      await fetch('/api/intranet/auth/logout', { method: 'POST' });
    } finally {
      routerRef.current.replace('/acceso');
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthlete) return;
    setBusy(true);
    setErrorMsg(null);
    setToastMsg(null);
    try {
      const res = await fetch('/api/intranet/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_onboarding_profile',
          athleteId: selectedAthlete.id,
          emergencyContactName: emName,
          emergencyContactPhone: emPhone,
          phone: userPhone || undefined,
          shirtSize: shirtSize || undefined,
          birthDate: birthDateInput || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudo actualizar la ficha.');
        return;
      }
      setEditOpen(false);
      setToastMsg('Ficha deportiva y contacto de emergencia actualizados.');
      await loadPortal();
    } catch {
      setErrorMsg('Error de red al guardar los cambios.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConsentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthlete) return;
    if (consentImage === null || consentTravel === null) {
      setErrorMsg(
        'Debes seleccionar explícitamente Autorizo o No autorizo en ambas decisiones RGPD.'
      );
      return;
    }
    if (!signatureData) {
      setErrorMsg('Es obligatorio realizar la firma manuscrita en el recuadro.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setToastMsg(null);
    try {
      const res = await fetch('/api/intranet/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_integrated_consent',
          athleteId: selectedAthlete.id,
          consentImage,
          consentTravel,
          signerName: selectedAthlete.ageEvaluation.isMinor
            ? signerName
            : selectedAthlete.fullName,
          signerDni,
          signerRelationship: selectedAthlete.ageEvaluation.isMinor
            ? signerRel
            : 'PROPIO_JUGADOR',
          signerPhone,
          patriaPotestadAccepted: selectedAthlete.ageEvaluation.isMinor
            ? patriaPotestad
            : undefined,
          minorConsentAccepted: selectedAthlete.ageEvaluation.isMinor14To17
            ? minorAssent
            : undefined,
          policySummaryAccepted: policyAccepted,
          signatureData,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudo registrar la autorización RGPD.');
        return;
      }
      setShowConsentForm(false);
      setToastMsg(
        json.receiptEmailSent
          ? 'Autorización RGPD firmada y copia oficial enviada por correo electrónico.'
          : 'Autorización RGPD firmada y sellada correctamente.'
      );
      await loadPortal();
    } catch {
      setErrorMsg('Error de red al guardar la autorización.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadConsentReceiptPdf() {
    if (!selectedAthlete) return;
    setDownloadingConsentPdf(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_consent_receipt',
          athleteId: selectedAthlete.id,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.receipt) {
        setErrorMsg(json?.error || 'No se pudo generar el justificante PDF.');
        return;
      }
      const r = json.receipt;
      const { generateConsentPdf } = await import('@/lib/pdf-consent');
      const doc = generateConsentPdf({
        consentId: r.consentId,
        playerName: r.playerName,
        teamName: r.teamName,
        birthYear: r.birthYear,
        birthDate: r.birthDate,
        isMinor: r.isMinor,
        isMinor14To17: r.isMinor14To17,
        signerName: r.signerName,
        signerDni: r.signerDni,
        signerRelationship: r.signerRelationship,
        signerPhone: r.signerPhone,
        signerEmail: r.signerEmail,
        consentSocialMedia: r.consentSocialMedia,
        consentStreaming: r.consentStreaming,
        consentPress: r.consentPress,
        consentTravel: r.consentTravel,
        signatureMethod: r.signatureMethod,
        signatureData: r.signatureData,
        documentHash: r.documentHash,
        signedAt: r.signedAt,
      });
      const safeName =
        String(r.playerName || 'deportista')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'deportista';
      doc.save(`justificante_rgpd_${safeName}.pdf`);
    } catch {
      setErrorMsg('Error de red al descargar el justificante PDF.');
    } finally {
      setDownloadingConsentPdf(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="bg-surface-container border border-white/10 p-8 flex flex-col items-center gap-3 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e]">
          <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
          <p className="font-headline text-base uppercase text-white">Cargando Zona de Familias</p>
          <p className="text-xs text-tertiary">Recuperando tu ficha y estado de cuotas...</p>
        </div>
      </div>
    );
  }

  if (pendingApprovalMsg) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 overflow-x-clip">
        <div className="bg-surface-container border-2 border-amber-500/50 p-6 sm:p-8 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-5">
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="w-11 h-11 bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                {CLUB_INFO.shortName} · Solicitud en Revisión
              </span>
              <h1 className="font-headline text-2xl font-bold uppercase text-white mt-0.5">
                Inscripción Pendiente de Aceptación
              </h1>
            </div>
          </div>

          <p className="text-sm text-amber-100 leading-relaxed">{pendingApprovalMsg}</p>

          <p className="text-xs text-tertiary leading-relaxed">
            Recibirás una notificación en tu correo electrónico en cuanto Secretaría o
            Coordinación asigne equipo y active tu acceso a la zona de deportistas y familias. Si
            tienes cualquier consulta escribe a{' '}
            <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline">
              {CLUB_INFO.contactEmail}
            </a>
            .
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <Link
              href="/proteccion-menor"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              <span>Código de Conducta y Protección al Menor (LOPIVI)</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-error-container/50 hover:bg-error-container/80 border border-error/40 text-xs font-bold uppercase text-error cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-clip">
      {/* Cabecera */}
      <div className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-primary-container shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-label-sm uppercase tracking-widest text-primary font-bold">
                {CLUB_INFO.shortName} · Zona de Deportistas y Familias
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold uppercase text-white">
              Mi Club
            </h1>
            <p className="text-xs sm:text-sm text-tertiary truncate mt-0.5">
              Cuenta: <span className="text-on-surface font-medium">{memberData?.user.name}</span> ({memberData?.user.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isStaffUser && (
              <Link
                href="/club"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase text-on-surface"
              >
                <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Área Staff</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-error-container/40 hover:bg-error-container/70 border border-error/30 text-xs font-bold uppercase text-error cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* Selector de hijo/a si hay varios deportistas vinculados */}
        {memberData && memberData.athletes.length > 1 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-wider font-bold text-tertiary mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Selecciona deportista vinculado:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {memberData.athletes.map((ath) => {
                const active = ath.id === selectedAthlete?.id;
                const primaryTeam = ath.teams.find((t) => t.isPrimary)?.teamName || ath.teams[0]?.teamName;
                return (
                  <button
                    key={ath.id}
                    type="button"
                    onClick={() => setSelectedId(ath.id)}
                    className={`px-3.5 py-2 border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                        : 'bg-surface-container-low text-on-surface border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-bold">{ath.fullName}</div>
                    {primaryTeam && (
                      <div className={`text-[10px] ${active ? 'text-white/85' : 'text-tertiary'}`}>
                        {primaryTeam}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="bg-error-container/40 border border-error/40 text-error px-4 py-3 text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}
      {toastMsg && (
        <div role="status" className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 px-4 py-3 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {((memberData?.registrationRequests &&
        (memberData.athletes.length === 0 ||
          memberData.registrationRequests.some((r) => r.status !== 'APPROVED'))) ||
        false) && (
        <section
          aria-label="Solicitudes de inscripción familiar"
          className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-3 shadow-[4px_4px_0px_0px_#0e0e0e]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" aria-hidden="true" />
              <h2 className="font-headline text-sm sm:text-base font-bold uppercase text-white">
                Estado de Solicitudes e Inscripciones
              </h2>
            </div>
            <span className="text-[11px] text-tertiary">
              {memberData.registrationRequests!.filter((r) => r.status === 'PENDING').length} pendiente(s) ·{' '}
              {memberData.registrationRequests!.filter((r) => r.status === 'APPROVED').length} aceptada(s) ·{' '}
              {memberData.registrationRequests!.filter((r) => r.status === 'REJECTED').length} rechazada(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {memberData.registrationRequests!.map((req) => {
              const isPending = req.status === 'PENDING';
              const isApproved = req.status === 'APPROVED';
              const borderCls = isApproved
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : isPending
                ? 'border-amber-500/40 bg-amber-950/20'
                : 'border-rose-500/45 bg-rose-950/25';
              const badgeCls = isApproved
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                : isPending
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/35';
              const badgeLabel = isApproved
                ? 'Aceptada'
                : isPending
                ? 'Pendiente validar por el club'
                : 'Rechazada · Subsanable';

              return (
                <div key={req.id} className={`border p-3.5 space-y-2 ${borderCls}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-headline font-bold text-sm uppercase text-white truncate">
                        {req.athleteFullName}
                      </p>
                      <p className="text-[11px] text-tertiary">
                        {req.categoryLabel}
                        {req.planName
                          ? ` · ${req.planName}${req.planAmount !== null ? ` (${req.planAmount.toFixed(2)} €)` : ''}`
                          : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${badgeCls}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  {isApproved && req.assignedTeamNames.length > 0 && (
                    <p className="text-xs text-emerald-200">
                      Equipo asignado: <strong>{req.assignedTeamNames.join(', ')}</strong>
                    </p>
                  )}

                  {isPending && (
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      Documentación y RGPD recibidos. Secretaría o Coordinación revisará la solicitud y asignará equipo en breve.
                    </p>
                  )}

                  {req.status === 'REJECTED' && (
                    <div className="space-y-2">
                      <p className="text-xs text-rose-100 leading-relaxed">
                        <strong>Motivo comunicado por el club:</strong>{' '}
                        {req.adminNotes || 'Revisión requerida por parte de secretaría.'}
                      </p>
                      {req.resubmitPath && (
                        <Link
                          href={req.resubmitPath}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container hover:bg-cta-hover text-white text-[11px] font-bold uppercase"
                        >
                          <span>Subsanar inscripción</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!selectedAthlete ? (
        <div className="bg-surface-container border border-white/10 p-6 text-center space-y-2">
          <p className="font-headline text-lg uppercase text-white">
            {memberData?.registrationRequests && memberData.registrationRequests.length > 0
              ? 'Tus solicitudes están registradas arriba'
              : 'Sin deportistas vinculados'}
          </p>
          <p className="text-sm text-tertiary">
            {memberData?.registrationRequests && memberData.registrationRequests.some((r) => r.status === 'PENDING')
              ? 'En cuanto Secretaría valide la inscripción y asigne equipo, aparecerán aquí automáticamente todas las fichas, horarios, asistencias y cuotas de tus hijos/as.'
              : (
                <>
                  Todavía no hay ninguna ficha de deportista asociada a tu cuenta. Si acabas de recibir una invitación o crees que falta un vínculo familiar, contacta con{' '}
                  <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline">
                    {CLUB_INFO.contactEmail}
                  </a>.
                </>
              )}
          </p>
        </div>
      ) : (
        <>
          {/* Banner onboarding pendiente */}
          {selectedAthlete.status !== 'VERIFICADO' && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs sm:text-sm text-amber-100">
                <strong className="uppercase">Ficha pendiente de verificación:</strong> Completa el contacto de emergencia y revisa las autorizaciones RGPD para finalizar el alta de <strong>{selectedAthlete.fullName}</strong>.
              </div>
              <Link
                href="/mi-club/onboarding"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase shrink-0"
              >
                <span>Completar asistente</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          {/* Pestañas de Deportista */}
          <div role="tablist" aria-label="Secciones del deportista" className="flex flex-wrap gap-2">
            {(
              [
                { id: 'ficha', label: 'Mi Ficha', icon: User },
                { id: 'asistencia', label: 'Asistencia', icon: ClipboardCheck },
                { id: 'rgpd', label: 'Autorizaciones RGPD', icon: FileCheck2 },
                { id: 'pagos', label: 'Mis Pagos (Solo Lectura)', icon: CreditCard },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container text-on-surface border-white/10 hover:border-white/25'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: MI FICHA */}
          {activeTab === 'ficha' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-container border border-white/10 p-5 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="font-headline text-xl font-bold uppercase text-white">
                      {selectedAthlete.fullName}
                    </h2>
                    <p className="text-xs text-tertiary">
                      {selectedAthlete.birthDate
                        ? `Nacimiento: ${selectedAthlete.birthDate}`
                        : selectedAthlete.birthYear
                        ? `Año nacimiento: ${selectedAthlete.birthYear}`
                        : 'Fecha de nacimiento pendiente'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${
                      selectedAthlete.status === 'VERIFICADO'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    }`}
                  >
                    {selectedAthlete.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface-container-low border border-white/10 p-3">
                    <p className="text-tertiary uppercase text-[10px] font-bold">Dorsal</p>
                    <p className="text-white font-bold text-base mt-0.5">
                      {selectedAthlete.jerseyNumber ?? 'Sin asignar'}
                    </p>
                  </div>
                  <div className="bg-surface-container-low border border-white/10 p-3">
                    <p className="text-tertiary uppercase text-[10px] font-bold">Talla Equipación</p>
                    <p className="text-white font-bold text-base mt-0.5">
                      {selectedAthlete.shirtSize || 'Sin indicar'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase font-bold text-tertiary">Equipos Asignados</p>
                  {selectedAthlete.teams.length === 0 ? (
                    <p className="text-xs text-tertiary">Pendiente de asignación de equipo.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedAthlete.teams.map((t) => (
                        <div
                          key={t.teamSeasonId}
                          className="bg-surface-container-low border border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-white">{t.teamName}</p>
                            <p className="text-[11px] text-tertiary">{t.division}</p>
                            {t.dorsal !== null && (
                              <p className="text-[11px] text-on-surface mt-0.5">
                                {`Dorsal #${t.dorsal}`}
                              </p>
                            )}
                          </div>
                          {t.isPrimary && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-primary-container/20 text-primary border border-primary-container/40 shrink-0">
                              Principal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen rápido de cuota */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-tertiary block">
                      Estado de Cuota y Pagos
                    </span>
                    <span className="font-bold text-white">
                      {selectedAthlete.payments.statusSummary}
                    </span>
                    {selectedAthlete.payments.enrollments[0] && (
                      <span className="text-tertiary block text-[11px]">
                        Modalidad: {selectedAthlete.payments.enrollments[0].planName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pagos')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-[11px] font-bold uppercase text-white cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <span>Ver Pagos</span>
                  </button>
                </div>
              </div>

              {/* Horarios y pistas de entrenamiento + Contacto de emergencia */}
              <div className="space-y-6">
              <div className="bg-surface-container border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="font-headline text-lg font-bold uppercase text-white flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>Horarios y Pistas de Entrenamiento</span>
                  </h2>
                </div>

                {!selectedAthlete.trainingSchedule || selectedAthlete.trainingSchedule.length === 0 ? (
                  <p className="text-xs text-tertiary">
                    No hay sesiones semanales publicadas todavía para tu equipo. Consulta con tu entrenador o en Secretaría.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAthlete.trainingSchedule.map((slot, idx) => (
                      <div
                        key={`${slot.teamSeasonId}-${slot.weekday}-${slot.startTime}-${idx}`}
                        className="bg-surface-container-low border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-container/40 text-primary font-bold uppercase text-[10px]">
                              {slot.weekdayLabel}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {slot.startTime} – {slot.endTime}
                            </span>
                            <span className="text-tertiary truncate">· {slot.teamName}</span>
                          </div>
                          <p className="text-on-surface flex items-center gap-1.5 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                            <span>
                              {slot.venueName} — <strong>{slot.courtName}</strong>
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contacto de emergencia */}
              <div className="bg-surface-container border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="font-headline text-lg font-bold uppercase text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>Contacto de Emergencia y Datos</span>
                  </h2>
                  {(selectedAthlete.isGuardianView ||
                    (selectedAthlete.ageEvaluation.age !== null &&
                      selectedAthlete.ageEvaluation.age >= 14)) && (
                    <button
                      type="button"
                      onClick={() => setEditOpen((v) => !v)}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase text-white cursor-pointer"
                    >
                      {editOpen ? 'Cerrar edición' : 'Actualizar datos'}
                    </button>
                  )}
                </div>

                {!editOpen ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-surface-container-low border border-white/10 p-3.5">
                      <p className="text-tertiary uppercase text-[10px] font-bold">Persona de Emergencia</p>
                      <p className="text-white font-bold text-sm mt-1">
                        {selectedAthlete.emergencyContactName || 'Pendiente de completar'}
                      </p>
                      <p className="text-on-surface mt-0.5">
                        {selectedAthlete.emergencyContactPhone || 'Sin teléfono'}
                      </p>
                    </div>
                    {selectedAthlete.guardian && (
                      <div className="bg-surface-container-low border border-white/10 p-3.5">
                        <p className="text-tertiary uppercase text-[10px] font-bold">
                          Representante Legal ({selectedAthlete.guardian.relationship})
                        </p>
                        <p className="text-white font-bold text-sm mt-1">
                          {selectedAthlete.guardian.fullName}
                        </p>
                        <p className="text-tertiary mt-0.5">
                          {selectedAthlete.guardian.email || ''} {selectedAthlete.guardian.phone ? `· ${selectedAthlete.guardian.phone}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-3">
                    <div>
                      <label htmlFor="miclub-em-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        Nombre contacto de emergencia *
                      </label>
                      <input
                        id="miclub-em-name"
                        type="text"
                        required
                        value={emName}
                        onChange={(e) => setEmName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="miclub-em-phone" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Teléfono emergencia *
                        </label>
                        <input
                          id="miclub-em-phone"
                          type="tel"
                          required
                          value={emPhone}
                          onChange={(e) => setEmPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="miclub-user-phone" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Teléfono personal
                        </label>
                        <input
                          id="miclub-user-phone"
                          type="tel"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="miclub-shirt-size" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Talla equipación
                        </label>
                        <select
                          id="miclub-shirt-size"
                          value={shirtSize}
                          onChange={(e) => setShirtSize(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        >
                          <option value="">Selecciona talla...</option>
                          {SHIRT_SIZES.map((s) => (
                            <option key={s} value={s}>
                              Talla {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="miclub-birth-date" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Fecha de nacimiento
                        </label>
                        <input
                          id="miclub-birth-date"
                          type="date"
                          value={birthDateInput}
                          onChange={(e) => setBirthDateInput(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2.5 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
                    >
                      {busy ? 'Guardando...' : 'Guardar y Confirmar Ficha'}
                    </button>
                  </form>
                )}
              </div>
              </div>
            </div>
          )}

          {/* TAB 2: MI ASISTENCIA */}
          {activeTab === 'asistencia' && (() => {
            const att = selectedAthlete.attendance || {
              totalSessions: 0,
              presentCount: 0,
              lateCount: 0,
              justifiedCount: 0,
              unjustifiedCount: 0,
              injuredCount: 0,
              ratePercent: 0,
              recentRecords: [],
            };
            return (
              <div className="space-y-5">
                <div className="bg-surface-container border border-white/10 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <h2 className="font-headline text-xl font-bold uppercase text-white">
                        Registro de Asistencia a Entrenamientos
                      </h2>
                      <p className="text-xs text-tertiary mt-0.5">
                        Estadísticas propias y sesiones registradas de {selectedAthlete.fullName}.
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 text-xs font-bold uppercase border shrink-0 self-start sm:self-auto ${
                        att.totalSessions === 0
                          ? 'bg-white/5 text-tertiary border-white/15'
                          : att.ratePercent >= 80
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : att.ratePercent >= 60
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                      }`}
                    >
                      {att.totalSessions > 0
                        ? `Asistencia: ${att.ratePercent}% (${att.totalSessions} sesiones)`
                        : 'Sin sesiones registradas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-surface-container-low border border-white/10 p-3.5">
                      <p className="text-[11px] uppercase text-tertiary font-bold">% Asistencia</p>
                      <p className="font-headline text-xl font-bold text-white mt-0.5">
                        {att.totalSessions > 0 ? `${att.ratePercent}%` : '—'}
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-emerald-500/25 p-3.5">
                      <p className="text-[11px] uppercase text-emerald-300 font-bold">Presentes</p>
                      <p className="font-headline text-xl font-bold text-emerald-300 mt-0.5">
                        {att.presentCount}
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-amber-500/25 p-3.5">
                      <p className="text-[11px] uppercase text-amber-300 font-bold">Retrasos</p>
                      <p className="font-headline text-xl font-bold text-amber-300 mt-0.5">
                        {att.lateCount}
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-sky-500/25 p-3.5">
                      <p className="text-[11px] uppercase text-sky-300 font-bold">F. Justificadas</p>
                      <p className="font-headline text-xl font-bold text-sky-300 mt-0.5">
                        {att.justifiedCount}
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-rose-500/25 p-3.5">
                      <p className="text-[11px] uppercase text-rose-300 font-bold">F. Injustificadas</p>
                      <p className="font-headline text-xl font-bold text-rose-300 mt-0.5">
                        {att.unjustifiedCount}
                      </p>
                    </div>
                    <div className="bg-surface-container-low border border-purple-500/25 p-3.5">
                      <p className="text-[11px] uppercase text-purple-300 font-bold">Lesión (Asiste)</p>
                      <p className="font-headline text-xl font-bold text-purple-300 mt-0.5">
                        {att.injuredCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Historial Reciente de Sesiones */}
                <div className="bg-surface-container border border-white/10 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-headline text-base font-bold uppercase text-white">
                      Historial Reciente de Entrenamientos
                    </h3>
                    {att.totalSessions > 0 && (
                      <span className="text-[11px] text-tertiary">
                        Últimas {att.recentRecords.length} de {att.totalSessions} sesiones
                      </span>
                    )}
                  </div>

                  {att.recentRecords.length === 0 ? (
                    <p className="text-xs text-tertiary">
                      Aún no constan registros de asistencia en entrenamientos para este deportista.
                    </p>
                  ) : (
                    <>
                      {/* Vista móvil sin desbordamiento horizontal */}
                      <div className="md:hidden space-y-2.5">
                        {att.recentRecords.map((rec) => {
                          const statusLabel =
                            ATTENDANCE_LABEL_MAP.get(rec.status) || rec.status;
                          const badgeCls =
                            ATTENDANCE_DARK_BADGE[rec.status] ||
                            'bg-white/5 text-tertiary border-white/15';
                          const reasonLabel = rec.absenceReason
                            ? ABSENCE_REASON_MAP.get(rec.absenceReason) || rec.absenceReason
                            : null;
                          return (
                            <div
                              key={rec.sessionId}
                              className="bg-surface-container-low border border-white/10 p-3 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-white">
                                  {formatYmdEs(rec.madridDate)} · {rec.startTime}–{rec.endTime}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${badgeCls}`}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                              <p className="text-tertiary font-medium">{rec.teamName}</p>
                              {(reasonLabel || rec.notes) && (
                                <p className="text-[11px] text-on-surface/85 border-t border-white/5 pt-1">
                                  {reasonLabel ? `Motivo: ${reasonLabel}` : ''}
                                  {reasonLabel && rec.notes ? ' · ' : ''}
                                  {rec.notes || ''}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Vista escritorio */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-tertiary uppercase text-[11px]">
                              <th className="py-2 pr-3">Fecha</th>
                              <th className="py-2 pr-3">Horario</th>
                              <th className="py-2 pr-3">Equipo</th>
                              <th className="py-2 pr-3">Estado</th>
                              <th className="py-2">Motivo / Observaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {att.recentRecords.map((rec) => {
                              const statusLabel =
                                ATTENDANCE_LABEL_MAP.get(rec.status) || rec.status;
                              const badgeCls =
                                ATTENDANCE_DARK_BADGE[rec.status] ||
                                'bg-white/5 text-tertiary border-white/15';
                              const reasonLabel = rec.absenceReason
                                ? ABSENCE_REASON_MAP.get(rec.absenceReason) || rec.absenceReason
                                : null;
                              const detailText = [
                                reasonLabel ? `Motivo: ${reasonLabel}` : null,
                                rec.notes || null,
                              ]
                                .filter(Boolean)
                                .join(' · ');

                              return (
                                <tr key={rec.sessionId}>
                                  <td className="py-2.5 pr-3 font-mono text-white whitespace-nowrap">
                                    {formatYmdEs(rec.madridDate)}
                                  </td>
                                  <td className="py-2.5 pr-3 font-mono text-tertiary whitespace-nowrap">
                                    {rec.startTime} – {rec.endTime}
                                  </td>
                                  <td className="py-2.5 pr-3 font-medium text-white">
                                    {rec.teamName}
                                  </td>
                                  <td className="py-2.5 pr-3 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${badgeCls}`}
                                    >
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-tertiary">
                                    {detailText || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: AUTORIZACIONES RGPD */}
          {activeTab === 'rgpd' && (
            <div className="bg-surface-container border border-white/10 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-headline text-xl font-bold uppercase text-white">
                    Estado de Autorizaciones RGPD
                  </h2>
                  <p className="text-xs text-tertiary mt-0.5">
                    Lectura en tiempo real del registro oficial de consentimientos de {selectedAthlete.fullName}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAthlete.consent.status === 'ACTIVE' &&
                    selectedAthlete.consent.canSignInPortal && (
                      <button
                        type="button"
                        disabled={downloadingConsentPdf}
                        onClick={handleDownloadConsentReceiptPdf}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                      >
                        {downloadingConsentPdf ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Descargar Justificante RGPD (PDF)</span>
                      </button>
                    )}
                  <Link
                    href="/autorizaciones"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <span>Portal Oficial /autorizaciones</span>
                  </Link>
                  {selectedAthlete.consent.canSignInPortal && (
                    <button
                      type="button"
                      onClick={() => setShowConsentForm((v) => !v)}
                      className="px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer"
                    >
                      {showConsentForm
                        ? 'Ocultar formulario'
                        : selectedAthlete.consent.status === 'ACTIVE'
                        ? 'Renovar / Modificar RGPD'
                        : 'Firmar Autorización Ahora'}
                    </button>
                  )}
                </div>
              </div>

              {/* Estado actual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-surface-container-low border border-white/10 p-3.5">
                  <p className="text-tertiary uppercase text-[10px] font-bold">Estado Vigente</p>
                  <p className="font-headline text-lg font-bold text-white mt-1">
                    {selectedAthlete.consent.status === 'ACTIVE'
                      ? 'VIGENTE (ACTIVE)'
                      : selectedAthlete.consent.status === 'REVOKED'
                      ? 'REVOCADA'
                      : selectedAthlete.consent.status === 'SHREDDED'
                      ? 'SUPRIMIDA (ART. 17)'
                      : 'PENDIENTE DE FIRMA'}
                  </p>
                  {selectedAthlete.consent.signedAtIso && (
                    <p className="text-tertiary mt-1">
                      Firmado: {formatDisplayDate(selectedAthlete.consent.signedAtIso)}
                    </p>
                  )}
                </div>

                <div className="bg-surface-container-low border border-white/10 p-3.5">
                  <p className="text-tertiary uppercase text-[10px] font-bold">1. Imágenes Deportivas</p>
                  <p
                    className={`font-bold text-sm mt-1 ${
                      selectedAthlete.consent.status === 'ACTIVE'
                        ? selectedAthlete.consent.consentImage
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                        : 'text-tertiary'
                    }`}
                  >
                    {selectedAthlete.consent.status === 'ACTIVE'
                      ? selectedAthlete.consent.consentImage
                        ? 'SÍ AUTORIZADO'
                        : 'NO AUTORIZADO'
                      : 'Sin registrar'}
                  </p>
                </div>

                <div className="bg-surface-container-low border border-white/10 p-3.5">
                  <p className="text-tertiary uppercase text-[10px] font-bold">2. Desplazamientos Oficiales</p>
                  <p
                    className={`font-bold text-sm mt-1 ${
                      selectedAthlete.consent.status === 'ACTIVE'
                        ? selectedAthlete.consent.consentTravel
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                        : 'text-tertiary'
                    }`}
                  >
                    {selectedAthlete.consent.status === 'ACTIVE'
                      ? selectedAthlete.consent.consentTravel
                        ? 'SÍ AUTORIZADO'
                        : 'NO AUTORIZADO'
                      : 'Sin registrar'}
                  </p>
                </div>
              </div>

              {!selectedAthlete.consent.canSignInPortal && selectedAthlete.ageEvaluation.isMinor && (
                <div className="bg-surface-container-low border border-amber-500/30 p-4 text-xs text-amber-200">
                  Para deportistas menores de 18 años, la firma o modificación de la autorización RGPD debe realizarla su padre, madre o tutor legal desde su cuenta familiar o en{' '}
                  <Link href="/autorizaciones" className="underline font-bold text-white">
                    /autorizaciones
                  </Link>.
                </div>
              )}

              {/* Formulario integrado de firma / renovación */}
              {showConsentForm && selectedAthlete.consent.canSignInPortal && (
                <form
                  onSubmit={handleConsentSubmit}
                  className="bg-surface-container-low border border-primary-container/40 p-4 sm:p-5 space-y-5"
                >
                  <div>
                    <h3 className="font-headline text-base font-bold uppercase text-white">
                      Firma Integrada de Autorización RGPD y Menores
                    </h3>
                    <p className="text-xs text-tertiary mt-1">
                      Selecciona de forma expresa una opción en cada apartado. Denegar el consentimiento no impide la práctica deportiva (Art. 13.2.e RGPD).
                    </p>
                  </div>

                  {/* Decisión 1 */}
                  <div className="border border-white/10 bg-surface-container p-4 space-y-2.5">
                    <p className="text-xs font-bold text-white">
                      1. Tratamiento y Difusión de Imágenes Deportivas (web oficial, RRSS institucionales, retransmisiones y prensa deportiva sin fines comerciales) *
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container-low text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="consent_image"
                          checked={consentImage === true}
                          onChange={() => setConsentImage(true)}
                        />
                        <span className="font-bold text-emerald-300">Autorizo</span>
                      </label>
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container-low text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="consent_image"
                          checked={consentImage === false}
                          onChange={() => setConsentImage(false)}
                        />
                        <span className="font-bold text-rose-300">No autorizo</span>
                      </label>
                    </div>
                  </div>

                  {/* Decisión 2 */}
                  <div className="border border-white/10 bg-surface-container p-4 space-y-2.5">
                    <p className="text-xs font-bold text-white">
                      2. Desplazamientos y Viajes Deportivos Oficiales (competiciones FAVB/AFADE, torneos y concentraciones) *
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container-low text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="consent_travel"
                          checked={consentTravel === true}
                          onChange={() => setConsentTravel(true)}
                        />
                        <span className="font-bold text-emerald-300">Autorizo</span>
                      </label>
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container-low text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="consent_travel"
                          checked={consentTravel === false}
                          onChange={() => setConsentTravel(false)}
                        />
                        <span className="font-bold text-rose-300">No autorizo</span>
                      </label>
                    </div>
                  </div>

                  {/* Datos del firmante según tramo de edad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="miclub-signer-name" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        {selectedAthlete.ageEvaluation.isMinor
                          ? 'Nombre completo Padre / Madre / Tutor *'
                          : 'Nombre del deportista firmante (+18) *'}
                      </label>
                      <input
                        id="miclub-signer-name"
                        type="text"
                        required
                        readOnly={!selectedAthlete.ageEvaluation.isMinor}
                        value={
                          selectedAthlete.ageEvaluation.isMinor
                            ? signerName
                            : selectedAthlete.fullName
                        }
                        onChange={(e) => setSignerName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container border border-white/15 text-xs text-white read-only:opacity-75"
                      />
                    </div>
                    <div>
                      <label htmlFor="miclub-signer-dni" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        DNI / NIE / Pasaporte del firmante *
                      </label>
                      <input
                        id="miclub-signer-dni"
                        type="text"
                        required
                        value={signerDni}
                        onChange={(e) => setSignerDni(e.target.value)}
                        placeholder="12345678Z"
                        className="w-full px-3 py-2 bg-surface-container border border-white/15 text-xs text-white"
                      />
                    </div>
                    {selectedAthlete.ageEvaluation.isMinor && (
                      <div>
                        <label htmlFor="miclub-signer-rel" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Relación con el menor *
                        </label>
                        <select
                          id="miclub-signer-rel"
                          value={signerRel}
                          onChange={(e) =>
                            setSignerRel(e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL')
                          }
                          className="w-full px-3 py-2 bg-surface-container border border-white/15 text-xs text-white"
                        >
                          <option value="PADRE">Padre</option>
                          <option value="MADRE">Madre</option>
                          <option value="TUTOR_LEGAL">Tutor/a Legal</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label htmlFor="miclub-signer-phone" className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        Teléfono de contacto
                      </label>
                      <input
                        id="miclub-signer-phone"
                        type="tel"
                        value={signerPhone}
                        onChange={(e) => setSignerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container border border-white/15 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Declaraciones obligatorias */}
                  <div className="space-y-2 text-xs text-on-surface">
                    {selectedAthlete.ageEvaluation.isMinor && (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={patriaPotestad}
                          onChange={(e) => setPatriaPotestad(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Declaro bajo mi responsabilidad ostentar la patria potestad o tutela legal del menor y contar con el consentimiento del otro progenitor en su caso (Arts. 154-156 Código Civil).
                        </span>
                      </label>
                    )}

                    {selectedAthlete.ageEvaluation.isMinor14To17 && (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={minorAssent}
                          onChange={(e) => setMinorAssent(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Confirmo que el/la deportista (14 a 17 años) ha sido informado/a previamente del contenido de esta autorización y presta su conocimiento y asentimiento (Art. 3.1 LO 1/1982).
                        </span>
                      </label>
                    )}

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        He leído y acepto la información básica sobre protección de datos (Art. 13 RGPD) y el derecho de revocación en cualquier momento ante {CLUB_INFO.contactEmail}.
                      </span>
                    </label>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase text-tertiary mb-2">
                      Firma Manuscrita Única *
                    </p>
                    <SignaturePad
                      compact
                      onSignatureChange={setSignatureData}
                      hintLabel={`✕ Firma de ${
                        selectedAthlete.ageEvaluation.isMinor
                          ? signerName || 'Representante Legal'
                          : selectedAthlete.fullName
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Registrando firma...' : 'Firmar y Sellar Autorización'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: MIS PAGOS (SOLO LECTURA) */}
          {activeTab === 'pagos' && (
            <div className="space-y-5">
              {/* Semáforo y Totales */}
              <div className="bg-surface-container border border-white/10 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-headline text-xl font-bold uppercase text-white">
                      Mis Cuotas y Recibos (Solo Lectura)
                    </h2>
                    <p className="text-xs text-tertiary mt-0.5">
                      Consulta tus vencimientos, código de transferencia y descarga tus recibos oficiales en PDF.
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 text-xs font-bold uppercase border shrink-0 self-start sm:self-auto ${
                      selectedAthlete.payments.statusSummary === 'Al corriente'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : selectedAthlete.payments.statusSummary === 'Vencido'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                        : selectedAthlete.payments.statusSummary === 'Próximo vencimiento'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-tertiary border-white/15'
                    }`}
                  >
                    Estado: {selectedAthlete.payments.statusSummary}
                  </span>
                </div>

                {selectedAthlete.payments.enrollments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {selectedAthlete.payments.enrollments.map((enr) => (
                      <div
                        key={enr.id}
                        className="bg-surface-container-low border border-white/10 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-tertiary">
                            Modalidad Contratada ({enr.seasonId})
                          </p>
                          <p className="font-bold text-white truncate">
                            {enr.productName} · {enr.planName}
                          </p>
                          <p className="text-[11px] text-tertiary">
                            Ref. transferencia:{' '}
                            <code className="text-primary font-bold">{enr.paymentReferenceCode}</code>
                          </p>
                          {enr.appliedDiscounts && enr.appliedDiscounts.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {enr.appliedDiscounts.map((disc, dIdx) => (
                                <p key={dIdx} className="text-[11px] text-emerald-300 font-semibold">
                                  Descuento aplicado: {disc.label} (-{disc.computedAmount.toFixed(2)} €)
                                  {disc.reason ? (
                                    <span className="text-emerald-200/80 font-normal"> · {disc.reason}</span>
                                  ) : null}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shrink-0">
                          {enr.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-surface-container-low border border-white/10 p-3.5">
                    <p className="text-[11px] uppercase text-tertiary font-bold">Total Cuotas</p>
                    <p className="font-headline text-xl font-bold text-white mt-0.5">
                      {eur(selectedAthlete.payments.totals.totalFinal)}
                    </p>
                  </div>
                  <div className="bg-surface-container-low border border-emerald-500/25 p-3.5">
                    <p className="text-[11px] uppercase text-emerald-300 font-bold">Total Abonado</p>
                    <p className="font-headline text-xl font-bold text-emerald-300 mt-0.5">
                      {eur(selectedAthlete.payments.totals.totalPaid)}
                    </p>
                  </div>
                  <div className="bg-surface-container-low border border-amber-500/25 p-3.5">
                    <p className="text-[11px] uppercase text-amber-300 font-bold">Pendiente</p>
                    <p className="font-headline text-xl font-bold text-amber-300 mt-0.5">
                      {eur(selectedAthlete.payments.totals.totalPending)}
                    </p>
                  </div>
                </div>

                {/* Aviso Redsys compacto + Instrucciones de Transferencia plegables */}
                <div className="bg-surface-container-low border border-white/10 px-4 py-3 text-xs space-y-2">
                  <p className="text-amber-200/90">
                    Aviso: La pasarela de pago online con tarjeta y Bizum (Redsys) se habilitará próximamente. Actualmente los abonos se realizan mediante Transferencia Bancaria.
                  </p>
                  <details className="group border-t border-white/10 pt-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-bold uppercase text-white hover:text-primary transition-colors [&::-webkit-details-marker]:hidden">
                      <span>Ver instrucciones de pago por transferencia bancaria y referencias</span>
                      <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-2.5 space-y-2">
                      {selectedAthlete.payments.enrollments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedAthlete.payments.enrollments.map((enr) => (
                            <div
                              key={enr.id}
                              className="px-2.5 py-1.5 bg-surface-container border border-primary-container/40 text-on-surface"
                            >
                              <span className="text-tertiary">{enr.productName}: </span>
                              <code className="font-bold text-primary">{enr.paymentReferenceCode}</code>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-tertiary">
                        <strong className="text-on-surface">Cuenta IBAN:</strong>{' '}
                        {memberData?.bankIban ? (
                          <code className="text-white font-bold">{memberData.bankIban}</code>
                        ) : (
                          <span>Consulta el IBAN oficial en Tesorería ({CLUB_INFO.contactEmail}).</span>
                        )}{' '}
                        Indica el código de referencia <code>CDVSP-...</code> y el nombre del deportista.
                      </p>
                    </div>
                  </details>
                </div>
              </div>

              {/* Tabla de Cargos */}
              <div className="bg-surface-container border border-white/10 p-5 space-y-3">
                <h3 className="font-headline text-base font-bold uppercase text-white">
                  Detalle de Cargos y Vencimientos
                </h3>
                {selectedAthlete.payments.charges.length === 0 ? (
                  <p className="text-xs text-tertiary">No hay cargos registrados para este deportista.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-tertiary uppercase text-[11px]">
                          <th className="py-2 pr-3">Concepto</th>
                          <th className="py-2 pr-3">Vencimiento</th>
                          <th className="py-2 pr-3 text-right">Importe</th>
                          <th className="py-2 pr-3 text-right">Pagado</th>
                          <th className="py-2 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedAthlete.payments.charges.map((ch) => (
                          <tr key={ch.id}>
                            <td className="py-2.5 pr-3 font-medium text-white">{ch.concept}</td>
                            <td className="py-2.5 pr-3 font-mono text-tertiary">
                              {formatDisplayDate(ch.dueMadridDate)}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-white">{eur(ch.finalAmount)}</td>
                            <td className="py-2.5 pr-3 text-right text-emerald-300">{eur(ch.paidAmount)}</td>
                            <td className="py-2.5 text-right font-bold uppercase text-[10px]">
                              <span
                                className={`px-2 py-0.5 border ${
                                  ch.status === 'PAGADO'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                    : ch.status === 'VENCIDO'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                                }`}
                              >
                                {ch.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historial de Pagos y Recibos PDF */}
              <div className="bg-surface-container border border-white/10 p-5 space-y-3">
                <h3 className="font-headline text-base font-bold uppercase text-white">
                  Historial de Pagos y Recibos PDF
                </h3>
                {selectedAthlete.payments.payments.length === 0 ? (
                  <p className="text-xs text-tertiary">Aún no constan recibos de pago emitidos.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAthlete.payments.payments.map((p) => (
                      <div
                        key={p.id}
                        className="bg-surface-container-low border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {p.receiptNumber} · <span className="text-emerald-300">{eur(p.amount)}</span>
                          </p>
                          <p className="text-tertiary">
                            {formatDisplayDate(p.paidMadridDate)} · {p.methodLabel}
                            {p.reference ? ` · Ref: ${p.reference}` : ''}
                          </p>
                        </div>
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-[11px] font-bold uppercase shrink-0"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          <span>Descargar Recibo PDF</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
