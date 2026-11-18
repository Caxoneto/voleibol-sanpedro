'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  LogOut,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';
import { CLUB_INFO } from '@/lib/club-info';

type MemberTab = 'ficha' | 'rgpd' | 'pagos';

interface MemberTeam {
  teamSeasonId: string;
  teamName: string;
  division: string;
  isPrimary: boolean;
  dorsal: number | null;
  position: string | null;
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
  bankIban: string | null;
}

const SHIRT_SIZES = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

function eur(v: number): string {
  return `${v.toFixed(2)} €`;
}

export default function MiClubPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [loading, setLoading] = useState(true);
  const [isStaffUser, setIsStaffUser] = useState(false);
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
      const memJson = (await memRes.json()) as MemberApiResponse & { error?: string };
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

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-hidden">
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

      {!selectedAthlete ? (
        <div className="bg-surface-container border border-white/10 p-6 text-center space-y-2">
          <p className="font-headline text-lg uppercase text-white">Sin deportistas vinculados</p>
          <p className="text-sm text-tertiary">
            Todavía no hay ninguna ficha de deportista asociada a tu cuenta. Si acabas de recibir una invitación o crees que falta un vínculo familiar, contacta con{' '}
            <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline">
              {CLUB_INFO.contactEmail}
            </a>.
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
                          <div>
                            <p className="font-bold text-white">{t.teamName}</p>
                            <p className="text-[11px] text-tertiary">{t.division}</p>
                          </div>
                          {t.isPrimary && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-primary-container/20 text-primary border border-primary-container/40">
                              Principal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        Nombre contacto de emergencia *
                      </label>
                      <input
                        type="text"
                        required
                        value={emName}
                        onChange={(e) => setEmName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Teléfono emergencia *
                        </label>
                        <input
                          type="tel"
                          required
                          value={emPhone}
                          onChange={(e) => setEmPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Teléfono personal
                        </label>
                        <input
                          type="tel"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Talla equipación
                        </label>
                        <select
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
                        <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Fecha nacimiento
                        </label>
                        <input
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
                      className="w-full py-2.5 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                    >
                      {busy ? 'Guardando...' : 'Guardar y Confirmar Ficha'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUTORIZACIONES RGPD */}
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
                      Firmado: {selectedAthlete.consent.signedAtIso.slice(0, 10)}
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
                      <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        {selectedAthlete.ageEvaluation.isMinor
                          ? 'Nombre completo Padre / Madre / Tutor *'
                          : 'Nombre del deportista firmante (+18) *'}
                      </label>
                      <input
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
                      <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        DNI / NIE / Pasaporte del firmante *
                      </label>
                      <input
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
                        <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                          Relación con el menor *
                        </label>
                        <select
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
                      <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                        Teléfono de contacto
                      </label>
                      <input
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
                    className="w-full py-2.5 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Registrando firma...' : 'Firmar y Sellar Autorización'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: MIS PAGOS (SOLO LECTURA) */}
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

                {/* Instrucciones de Transferencia + Aviso Redsys */}
                <div className="bg-surface-container-low border border-white/10 p-4 text-xs space-y-2">
                  <p className="font-bold uppercase text-white">Instrucciones de Pago y Transferencia</p>
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
                  <p className="text-amber-200/90">
                    Aviso: La pasarela de pago online con tarjeta y Bizum (Redsys) se habilitará próximamente. Actualmente los abonos se realizan mediante Transferencia Bancaria, Efectivo o TPV Físico en el club.
                  </p>
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
                            <td className="py-2.5 pr-3 font-mono text-tertiary">{ch.dueMadridDate}</td>
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
                            {p.paidMadridDate} · {p.methodLabel}
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
