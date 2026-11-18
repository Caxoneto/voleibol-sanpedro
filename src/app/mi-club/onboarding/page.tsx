'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  KeyRound,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';
import { CLUB_INFO } from '@/lib/club-info';

interface OnboardingAthlete {
  id: string;
  fullName: string;
  birthYear: number | null;
  birthDate: string | null;
  shirtSize: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: string;
  isGuardianView: boolean;
  ageEvaluation: {
    age: number | null;
    isMinor: boolean;
    isMinor14To17: boolean;
  };
  teams: Array<{ teamName: string; isPrimary: boolean }>;
  guardian: {
    fullName: string;
    phone: string | null;
  } | null;
  consent: {
    status: 'ACTIVE' | 'REVOKED' | 'SHREDDED' | 'PENDING';
    canSignInPortal: boolean;
  };
}

const SHIRT_SIZES = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

function OnboardingWizardInner() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || '';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Step 1 (Invitación)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTargetType, setInviteTargetType] = useState<'GUARDIAN' | 'ATHLETE' | 'STAFF'>('GUARDIAN');
  const [actName, setActName] = useState('');
  const [actPhone, setActPhone] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actPasswordConfirm, setActPasswordConfirm] = useState('');

  // Step 2 (Ficha + Emergencia)
  const [athletes, setAthletes] = useState<OnboardingAthlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Step 3 (RGPD sin preselección)
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

  async function loadMemberAthletes() {
    const res = await fetch('/api/intranet/member', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'No se pudo cargar tu ficha.');
    }
    const list: OnboardingAthlete[] = json.athletes || [];
    setAthletes(list);
    const first = list[0];
    if (first) {
      setSelectedAthleteId(first.id);
      setEmName(first.emergencyContactName || '');
      setEmPhone(first.emergencyContactPhone || '');
      setContactPhone(json.user?.phone || first.guardian?.phone || '');
      setShirtSize(first.shirtSize || '');
      setBirthDate(first.birthDate || '');
      setSignerName(
        first.ageEvaluation.isMinor
          ? first.guardian?.fullName || json.user?.name || ''
          : first.fullName
      );
      setSignerPhone(json.user?.phone || first.guardian?.phone || '');
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function init() {
      try {
        if (inviteToken) {
          const invRes = await fetch(
            `/api/intranet/auth/invite?invite=${encodeURIComponent(inviteToken)}`,
            { cache: 'no-store', signal: controller.signal }
          );
          const invJson = await invRes.json();
          if (!invRes.ok || !invJson.success) {
            setErrorMsg(invJson.error || 'La invitación no es válida o ha caducado.');
            setLoading(false);
            return;
          }
          setInviteEmail(invJson.invitation.email || '');
          setInviteTargetType(invJson.invitation.targetType || 'GUARDIAN');
          setStep(1);
          setLoading(false);
          return;
        }

        // Sin invitación: comprobar si ya tiene sesión activa
        const meRes = await fetch('/api/intranet/auth/me', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!meRes.ok) {
          routerRef.current.replace('/acceso');
          return;
        }
        const meJson = await meRes.json();
        if (!meJson?.authenticated || !meJson?.session) {
          routerRef.current.replace('/acceso');
          return;
        }
        await loadMemberAthletes();
        setStep(2);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : 'Error inicializando asistente.');
        setLoading(false);
      }
    }

    init();
    return () => controller.abort();
  }, [inviteToken]);

  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId) || athletes[0] || null;

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (actPassword.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (actPassword !== actPasswordConfirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          name: actName,
          phone: actPhone || undefined,
          password: actPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudo activar la cuenta.');
        return;
      }
      if (json.redirectTo === '/club' || json.requiresTwoFactorSetup) {
        routerRef.current.replace(json.redirectTo);
        return;
      }
      await loadMemberAthletes();
      setToastMsg('Cuenta activada. Ahora revisa la ficha deportiva y el contacto de emergencia.');
      setStep(2);
    } catch {
      setErrorMsg('Error de red al activar tu cuenta.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentAthlete) {
      routerRef.current.replace('/mi-club');
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
          action: 'complete_onboarding_profile',
          athleteId: currentAthlete.id,
          emergencyContactName: emName,
          emergencyContactPhone: emPhone,
          phone: contactPhone || undefined,
          shirtSize: shirtSize || undefined,
          birthDate: birthDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'No se pudo verificar la ficha.');
        return;
      }
      await loadMemberAthletes();
      setToastMsg('Ficha verificada correctamente. Último paso: autorizaciones RGPD.');
      setStep(3);
    } catch {
      setErrorMsg('Error de red al guardar la ficha.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentAthlete) return;
    if (consentImage === null || consentTravel === null) {
      setErrorMsg('Debes elegir Autorizo o No autorizo en ambas decisiones.');
      return;
    }
    if (!signatureData) {
      setErrorMsg('Debes firmar en el recuadro manuscrito antes de finalizar.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_integrated_consent',
          athleteId: currentAthlete.id,
          consentImage,
          consentTravel,
          signerName: currentAthlete.ageEvaluation.isMinor
            ? signerName
            : currentAthlete.fullName,
          signerDni,
          signerRelationship: currentAthlete.ageEvaluation.isMinor
            ? signerRel
            : 'PROPIO_JUGADOR',
          signerPhone,
          patriaPotestadAccepted: currentAthlete.ageEvaluation.isMinor
            ? patriaPotestad
            : undefined,
          minorConsentAccepted: currentAthlete.ageEvaluation.isMinor14To17
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
      routerRef.current.replace('/mi-club');
    } catch {
      setErrorMsg('Error de red al completar el onboarding.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="bg-surface-container border border-white/10 p-8 flex flex-col items-center gap-3 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e]">
          <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
          <p className="font-headline text-base uppercase text-white">Preparando Bienvenida</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-8 space-y-6 overflow-x-hidden">
      {/* Cabecera y progreso */}
      <div className="bg-surface-container border border-white/10 p-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <span className="text-[11px] font-label-sm uppercase tracking-widest text-primary font-bold">
          {CLUB_INFO.shortName} · Alta y Verificación Familiar
        </span>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold uppercase text-white mt-1">
          Bienvenido a Mi Club
        </h1>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
          {[
            { num: 1, label: '1. Cuenta', icon: KeyRound },
            { num: 2, label: '2. Ficha', icon: UserCheck },
            { num: 3, label: '3. RGPD', icon: FileCheck2 },
          ].map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const done = step > s.num;
            return (
              <div
                key={s.num}
                className={`px-2.5 py-2 border flex items-center justify-center gap-1.5 font-bold uppercase ${
                  active
                    ? 'bg-primary-container text-white border-primary-container'
                    : done
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                    : 'bg-surface-container-low text-tertiary border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
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

      {/* PASO 1: ACTIVACIÓN DE CUENTA */}
      {step === 1 && (
        <form
          onSubmit={handleStep1Submit}
          className="bg-surface-container border border-white/10 p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_#0e0e0e]"
        >
          <div>
            <h2 className="font-headline text-lg font-bold uppercase text-white">
              Paso 1 · Activa tu Cuenta de Acceso
            </h2>
            <p className="text-xs text-tertiary mt-1">
              Invitación ({inviteTargetType === 'ATHLETE' ? 'Deportista' : 'Tutor / Familia'}) para{' '}
              <strong className="text-white">{inviteEmail || 'tu correo'}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                Tu nombre completo *
              </label>
              <input
                type="text"
                required
                value={actName}
                onChange={(e) => setActName(e.target.value)}
                placeholder="Nombre y apellidos"
                className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                Teléfono de contacto
              </label>
              <input
                type="tel"
                value={actPhone}
                onChange={(e) => setActPhone(e.target.value)}
                placeholder="600 000 000"
                className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                Contraseña (mín. 8 caracteres) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={actPassword}
                onChange={(e) => setActPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                Repetir contraseña *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={actPasswordConfirm}
                onChange={(e) => setActPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !inviteToken}
            className="w-full py-3 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{busy ? 'Activando cuenta...' : 'Activar Cuenta y Continuar'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      )}

      {/* PASO 2: REVISIÓN DE FICHA Y EMERGENCIA */}
      {step === 2 && (
        <form
          onSubmit={handleStep2Submit}
          className="bg-surface-container border border-white/10 p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_#0e0e0e]"
        >
          <div>
            <h2 className="font-headline text-lg font-bold uppercase text-white">
              Paso 2 · Revisión de Ficha y Contacto de Emergencia
            </h2>
            <p className="text-xs text-tertiary mt-1">
              Confirma los datos deportivos y de emergencia para verificar la ficha en el club.
            </p>
          </div>

          {athletes.length > 1 && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                Deportista a verificar
              </label>
              <select
                value={selectedAthleteId}
                onChange={(e) => {
                  const next = athletes.find((a) => a.id === e.target.value);
                  setSelectedAthleteId(e.target.value);
                  if (next) {
                    setEmName(next.emergencyContactName || '');
                    setEmPhone(next.emergencyContactPhone || '');
                    setShirtSize(next.shirtSize || '');
                    setBirthDate(next.birthDate || '');
                  }
                }}
                className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
              >
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentAthlete ? (
            <>
              <div className="bg-surface-container-low border border-white/10 p-3.5 text-xs">
                <p className="font-bold text-white text-sm">{currentAthlete.fullName}</p>
                <p className="text-tertiary mt-0.5">
                  Equipo: {currentAthlete.teams[0]?.teamName || 'Por asignar'} ·{' '}
                  {currentAthlete.birthYear ? `Año ${currentAthlete.birthYear}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Contacto de emergencia (Nombre) *
                  </label>
                  <input
                    type="text"
                    required
                    value={emName}
                    onChange={(e) => setEmName(e.target.value)}
                    placeholder="Nombre del familiar o contacto"
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Teléfono de emergencia *
                  </label>
                  <input
                    type="tel"
                    required
                    value={emPhone}
                    onChange={(e) => setEmPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Fecha nacimiento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Talla equipación
                  </label>
                  <select
                    value={shirtSize}
                    onChange={(e) => setShirtSize(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  >
                    <option value="">Selecciona...</option>
                    {SHIRT_SIZES.map((s) => (
                      <option key={s} value={s}>
                        Talla {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Teléfono contacto
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{busy ? 'Verificando ficha...' : 'Confirmar Ficha y Continuar a RGPD'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className="space-y-3 text-xs text-tertiary">
              <p>No hay deportistas vinculados todavía a esta cuenta.</p>
              <Link
                href="/mi-club"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white font-bold uppercase"
              >
                <span>Ir a Mi Club</span>
              </Link>
            </div>
          )}
        </form>
      )}

      {/* PASO 3: AUTORIZACIONES RGPD */}
      {step === 3 && currentAthlete && (
        <div className="bg-surface-container border border-white/10 p-5 sm:p-6 space-y-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h2 className="font-headline text-lg font-bold uppercase text-white">
                Paso 3 · Autorizaciones RGPD ({currentAthlete.fullName})
              </h2>
              <p className="text-xs text-tertiary mt-0.5">
                Trámite oficial de consentimiento informado.
              </p>
            </div>
            {currentAthlete.consent.status === 'ACTIVE' && (
              <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                Ya vigente
              </span>
            )}
          </div>

          {currentAthlete.consent.status === 'ACTIVE' && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <span className="text-emerald-200">
                Este deportista ya cuenta con una autorización RGPD vigente. Puedes acceder directamente a tu zona privada o renovarla a continuación.
              </span>
              <Link
                href="/mi-club"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase shrink-0 text-center"
              >
                Entrar a Mi Club
              </Link>
            </div>
          )}

          {!currentAthlete.consent.canSignInPortal ? (
            <div className="space-y-4 text-xs">
              <div className="bg-surface-container-low border border-amber-500/35 p-4 text-amber-200">
                Al tratarse de un/a deportista menor de 18 años, la autorización RGPD debe ser firmada por su padre, madre o tutor legal desde su acceso familiar o mediante el portal oficial{' '}
                <Link href="/autorizaciones" className="underline font-bold text-white">
                  /autorizaciones
                </Link>.
              </div>
              <Link
                href="/mi-club"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white font-bold uppercase"
              >
                <span>Ir a Mi Club</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              {/* Decisión 1 sin preselección */}
              <div className="border border-white/10 bg-surface-container-low p-4 space-y-2">
                <p className="text-xs font-bold text-white">
                  1. Tratamiento y Difusión de Imágenes Deportivas (web oficial, RRSS, retransmisiones y prensa sin fines comerciales) *
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="onb_image"
                      checked={consentImage === true}
                      onChange={() => setConsentImage(true)}
                    />
                    <span className="font-bold text-emerald-300">Autorizo</span>
                  </label>
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="onb_image"
                      checked={consentImage === false}
                      onChange={() => setConsentImage(false)}
                    />
                    <span className="font-bold text-rose-300">No autorizo</span>
                  </label>
                </div>
              </div>

              {/* Decisión 2 sin preselección */}
              <div className="border border-white/10 bg-surface-container-low p-4 space-y-2">
                <p className="text-xs font-bold text-white">
                  2. Desplazamientos y Viajes Deportivos Oficiales (competiciones FAVB/AFADE, torneos y concentraciones) *
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="onb_travel"
                      checked={consentTravel === true}
                      onChange={() => setConsentTravel(true)}
                    />
                    <span className="font-bold text-emerald-300">Autorizo</span>
                  </label>
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 bg-surface-container text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="onb_travel"
                      checked={consentTravel === false}
                      onChange={() => setConsentTravel(false)}
                    />
                    <span className="font-bold text-rose-300">No autorizo</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    {currentAthlete.ageEvaluation.isMinor
                      ? 'Nombre Padre / Madre / Tutor *'
                      : 'Nombre Deportista (+18) *'}
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={!currentAthlete.ageEvaluation.isMinor}
                    value={
                      currentAthlete.ageEvaluation.isMinor
                        ? signerName
                        : currentAthlete.fullName
                    }
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    DNI / NIE / Pasaporte *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerDni}
                    onChange={(e) => setSignerDni(e.target.value)}
                    placeholder="12345678Z"
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
                {currentAthlete.ageEvaluation.isMinor && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                      Parentesco *
                    </label>
                    <select
                      value={signerRel}
                      onChange={(e) =>
                        setSignerRel(e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL')
                      }
                      className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                    >
                      <option value="PADRE">Padre</option>
                      <option value="MADRE">Madre</option>
                      <option value="TUTOR_LEGAL">Tutor/a Legal</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-tertiary mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs text-on-surface">
                {currentAthlete.ageEvaluation.isMinor && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={patriaPotestad}
                      onChange={(e) => setPatriaPotestad(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Declaro ostentar la patria potestad o tutela legal del menor (Arts. 154-156 Código Civil).
                    </span>
                  </label>
                )}

                {currentAthlete.ageEvaluation.isMinor14To17 && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={minorAssent}
                      onChange={(e) => setMinorAssent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Confirmo que el/la deportista (14–17 años) ha sido informado/a y presta su conocimiento y asentimiento (Art. 3.1 LO 1/1982).
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
                    Acepto la información de protección de datos (Art. 13 RGPD) del {CLUB_INFO.name}.
                  </span>
                </label>
              </div>

              <SignaturePad
                compact
                onSignatureChange={setSignatureData}
                hintLabel={`✕ Firma de ${
                  currentAthlete.ageEvaluation.isMinor
                    ? signerName || 'Representante Legal'
                    : currentAthlete.fullName
                }`}
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-3 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Finalizando alta...' : 'Firmar y Entrar en Mi Club'}
                </button>
                <Link
                  href="/mi-club"
                  className="px-4 py-3 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface text-center"
                >
                  Saltar por ahora
                </Link>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function MiClubOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
          <div className="bg-surface-container border border-white/10 p-8 flex flex-col items-center gap-3 max-w-sm w-full text-center">
            <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
            <p className="font-headline text-base uppercase text-white">Cargando asistente...</p>
          </div>
        </div>
      }
    >
      <OnboardingWizardInner />
    </Suspense>
  );
}
