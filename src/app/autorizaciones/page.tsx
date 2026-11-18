'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Lock,
  FileText,
  User,
  Phone,
  Mail,
  Camera,
  RotateCcw,
  Ban,
  Info,
  X,
  Bus,
  KeyRound,
  Printer,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { CLUB_INFO, CLUB_TEAMS_META } from '@/lib/club-info';
import { getAfadeTeams } from '@/lib/afade-data';
import { isValidSpanishDniOrNie, isValidDniLast5Format, normalizeDniLast5 } from '@/lib/validators';
import { SignaturePad } from '@/components/SignaturePad';

type RelationshipType = 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
type SignatureMethodType = 'DIGITAL_WEB' | 'OTP_EMAIL' | 'PRESENCIAL';
type OtpPurposeType = 'SIGN' | 'RECEIPT' | 'REVOKE';

interface RosterOption {
  playerId: string;
  displayName: string;
  teamId: string;
  isDemo?: boolean;
}

interface VerifiedPlayerInfo {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDateVerified?: boolean;
  birthDateUnlockSupported?: boolean;
  isMinor: boolean;
  isMinor14To17?: boolean;
  isBoundaryUnverified?: boolean;
}

interface ExistingConsentSummary {
  id: string;
  signedAt: string;
  signedAtIso?: string;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  minorSignerName?: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  signatureMethod?: SignatureMethodType;
}

interface MaskedPrefillInfo {
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
}

interface ReceiptDetailPayload {
  consentId?: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDate?: string | null;
  isMinor: boolean;
  isMinor14To17?: boolean;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  signatureMethod?: SignatureMethodType;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
}

const ALL_TEAMS = (() => {
  const seen = new Set<string>();
  const combined: Array<{ id: string; name: string; division: string }> = [];
  for (const t of [...CLUB_TEAMS_META, ...getAfadeTeams()]) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      combined.push({ id: t.id, name: t.name, division: t.division });
    }
  }
  return combined;
})();

function DecisionPair({
  idPrefix,
  title,
  description,
  icon,
  allowLabel,
  denyLabel,
  value,
  onChange,
}: {
  idPrefix: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  allowLabel: string;
  denyLabel: string;
  value: boolean | null;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${idPrefix}-title`}
      className="p-4 rounded-xl border border-white/10 bg-surface-container-low space-y-3"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm text-white">
          {icon}
          <h4 id={`${idPrefix}-title`}>{title}</h4>
        </div>
        <p className="text-xs text-tertiary leading-relaxed">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
            value === true
              ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-md'
              : 'bg-surface-container-lowest border-white/15 text-white/85 hover:border-white/35'
          }`}
        >
          <span
            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              value === true ? 'border-emerald-400 bg-emerald-400' : 'border-white/40'
            }`}
          >
            {value === true && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
          </span>
          <span className="leading-snug">{allowLabel}</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`p-3 rounded-lg border text-left text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
            value === false
              ? 'bg-red-950/60 border-red-400 text-white shadow-md'
              : 'bg-surface-container-lowest border-white/15 text-white/85 hover:border-white/35'
          }`}
        >
          <span
            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              value === false ? 'border-red-400 bg-red-400' : 'border-white/40'
            }`}
          >
            {value === false && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
          </span>
          <span className="leading-snug">{denyLabel}</span>
        </button>
      </div>
    </div>
  );
}

function AutorizacionesContent() {
  const searchParams = useSearchParams();

  // Paso actual (1: Identificación / Desbloqueo, 2: Formulario y Firma, 3: Resguardo)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Selección de equipo y deportista desde /api/consent/roster-options
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [rosterOptions, setRosterOptions] = useState<RosterOption[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [birthInput, setBirthInput] = useState<string>('');
  const [dniLast5Input, setDniLast5Input] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Enlace directo (?directToken=...) con verificación única por OTP Email
  const [directTokenParam, setDirectTokenParam] = useState<string>('');
  const [isDirectAccess, setIsDirectAccess] = useState(false);
  const [loadingDirectAccess, setLoadingDirectAccess] = useState(false);
  const [requiresFactorUnlock, setRequiresFactorUnlock] = useState(false);
  const [maskedPrefill, setMaskedPrefill] = useState<MaskedPrefillInfo | null>(null);
  const [directOtpChallengeId, setDirectOtpChallengeId] = useState<string | null>(null);
  const [directOtpCode, setDirectOtpCode] = useState('');
  const [directOtpRemainingSec, setDirectOtpRemainingSec] = useState<number>(0);
  const [isSendingDirectOtp, setIsSendingDirectOtp] = useState(false);
  const [directOtpSentMsg, setDirectOtpSentMsg] = useState<string | null>(null);
  const [isUnlockingDirect, setIsUnlockingDirect] = useState(false);
  const [directUnlockError, setDirectUnlockError] = useState<string | null>(null);
  const [directOtpVerifiedSession, setDirectOtpVerifiedSession] = useState(false);
  const [directSignedActionMode, setDirectSignedActionMode] = useState<'RECEIPT' | 'REVOKE' | null>(null);
  const [isSubmittingDirectSigned, setIsSubmittingDirectSigned] = useState(false);

  // Datos del deportista y tokens de sesión
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayerInfo | null>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [actionToken, setActionToken] = useState<string>('');
  const [hasCensusEmail, setHasCensusEmail] = useState<boolean>(false);
  const [maskedContactEmail, setMaskedContactEmail] = useState<string>('');

  // Si ya estaba firmado previamente
  const [alreadySignedData, setAlreadySignedData] = useState<ExistingConsentSummary | null>(null);
  const [unlockedReceiptDetail, setUnlockedReceiptDetail] = useState<ReceiptDetailPayload | null>(null);
  const [step1StatusMessage, setStep1StatusMessage] = useState<string | null>(null);

  // Paso 2: Datos del firmante y menor 14-17
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRelationship, setSignerRelationship] = useState<RelationshipType>('MADRE');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');

  // 1ª Capa Art. 13 RGPD + 2 Decisiones Oficiales Neutras (Anexo 05 Imágenes y Anexo 06 Desplazamientos)
  const [policySummaryAccepted, setPolicySummaryAccepted] = useState(false);
  const [consentSocialMedia, setConsentSocialMedia] = useState<boolean | null>(null);
  const [consentStreaming, setConsentStreaming] = useState<boolean | null>(null);
  const [consentPress, setConsentPress] = useState<boolean | null>(null);
  const [consentTravel, setConsentTravel] = useState<boolean | null>(null);

  const handleImageConsentChange = (allowed: boolean) => {
    setConsentSocialMedia(allowed);
    setConsentStreaming(allowed);
    setConsentPress(allowed);
  };

  // Declaración responsable y firma principal
  const [patriaPotestadAccepted, setPatriaPotestadAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal OTP accesible (compartido para SIGN, RECEIPT, REVOKE sin reenvío involuntario al reabrir)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<OtpPurposeType>('SIGN');
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpChallengeTargetKey, setOtpChallengeTargetKey] = useState<string>('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpRemainingSec, setOtpRemainingSec] = useState<number>(0);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [resendReceiptOnUnlock, setResendReceiptOnUnlock] = useState(true);

  // Modal informativo de normativa
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [generatingBlankPdf, setGeneratingBlankPdf] = useState(false);

  // Paso 3: Confirmación
  const [confirmedConsentId, setConfirmedConsentId] = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<string | null>(null);
  const [confirmedTimestamp, setConfirmedTimestamp] = useState<string | null>(null);
  const [confirmedSignatureMethod, setConfirmedSignatureMethod] = useState<SignatureMethodType>('OTP_EMAIL');
  const [confirmedSignerEmail, setConfirmedSignerEmail] = useState<string>('');
  const [confirmedBirthDate, setConfirmedBirthDate] = useState<string | null>(null);
  const [receiptEmailSent, setReceiptEmailSent] = useState<boolean>(true);
  const [receiptEmailError, setReceiptEmailError] = useState<string | null>(null);

  const otpModalRef = useRef<HTMLDivElement | null>(null);
  const infoModalRef = useRef<HTMLDivElement | null>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const wasOtpOpenRef = useRef(false);
  const wasInfoOpenRef = useRef(false);
  const rosterAbortRef = useRef<AbortController | null>(null);

  // Cargar opciones de plantilla desde el servidor sin datos personales
  const fetchRosterOptions = useCallback(async (teamId: string) => {
    if (!teamId) {
      setRosterOptions([]);
      setRosterError(null);
      return;
    }

    rosterAbortRef.current?.abort();
    const controller = new AbortController();
    rosterAbortRef.current = controller;

    setLoadingRoster(true);
    setRosterError(null);
    try {
      const res = await fetch(`/api/consent/roster-options?teamId=${encodeURIComponent(teamId)}`, {
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (controller.signal.aborted) return;

      if (!res.ok || !data?.success) {
        setRosterOptions([]);
        setRosterError(data?.error || 'No se pudo cargar la lista de deportistas del club.');
        return;
      }
      setRosterOptions(Array.isArray(data.players) ? data.players : []);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setRosterOptions([]);
      setRosterError('Error de conexión con el servidor al cargar deportistas.');
    } finally {
      if (!controller.signal.aborted) {
        setLoadingRoster(false);
      }
    }
  }, []);

  // Aplicar datos cuando una verificación o desbloqueo es exitoso
  const applyUnlockedSession = useCallback(
    (data: {
      player: VerifiedPlayerInfo;
      alreadySigned?: boolean;
      emailOtpVerified?: boolean;
      hasCensusEmail?: boolean;
      maskedContactEmail?: string;
      verificationToken?: string;
      actionToken?: string;
      existingConsent?: ExistingConsentSummary;
      receiptDetail?: ReceiptDetailPayload | null;
      prefilledData?: {
        signerName?: string;
        signerDni?: string;
        signerRelationship?: string;
        signerPhone?: string;
        signerEmail?: string;
      };
    }) => {
      setVerifiedPlayer(data.player);
      setHasCensusEmail(Boolean(data.hasCensusEmail));
      setMaskedContactEmail(data.maskedContactEmail || '');
      setVerificationToken(data.verificationToken || '');
      setActionToken(data.actionToken || '');
      setDirectOtpVerifiedSession(Boolean(data.emailOtpVerified));
      setUnlockedReceiptDetail(data.receiptDetail || null);

      if (data.alreadySigned && data.existingConsent) {
        setAlreadySignedData(data.existingConsent);
        setStep(1);
        return;
      }

      setAlreadySignedData(null);
      const pre = data.prefilledData;
      if (pre?.signerName) setSignerName(pre.signerName);
      else if (!data.player.isMinor) setSignerName(data.player.name);
      else setSignerName('');

      setSignerDni(pre?.signerDni || '');
      if (
        pre?.signerRelationship === 'PADRE' ||
        pre?.signerRelationship === 'MADRE' ||
        pre?.signerRelationship === 'TUTOR_LEGAL' ||
        pre?.signerRelationship === 'PROPIO_JUGADOR'
      ) {
        setSignerRelationship(pre.signerRelationship);
      } else {
        setSignerRelationship(data.player.isMinor ? 'MADRE' : 'PROPIO_JUGADOR');
      }
      setSignerPhone(pre?.signerPhone || '');
      setSignerEmail(pre?.signerEmail || '');

      // Reiniciar estado limpio de formulario
      setPolicySummaryAccepted(false);
      setPatriaPotestadAccepted(false);
      setConsentSocialMedia(null);
      setConsentStreaming(null);
      setConsentPress(null);
      setConsentTravel(null);
      setSignatureData(null);
      setSubmitError(null);
      setConfirmedSignerEmail('');
      setConfirmedBirthDate(null);
      setStep(2);
    },
    []
  );

  // Detección de ?directToken=... o ?equipo=... al iniciar
  useEffect(() => {
    const dt = searchParams.get('directToken') || searchParams.get('token');
    if (dt) {
      setDirectTokenParam(dt);
      setLoadingDirectAccess(true);
      setVerifyError(null);
      fetch('/api/consent/verify-direct-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directToken: dt, mode: 'inspect' }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          return { ok: res.ok, status: res.status, json };
        })
        .then(({ ok, status, json }) => {
          if (ok && json?.success && json.player) {
            setIsDirectAccess(true);
            setVerifiedPlayer(json.player);
            setHasCensusEmail(Boolean(json.hasCensusEmail));
            setMaskedContactEmail(json.maskedContactEmail || '');
            setMaskedPrefill(json.maskedPrefill || null);
            setAlreadySignedData(json.alreadySigned && json.existingConsent ? json.existingConsent : null);
            setDirectSignedActionMode(null);
            setRequiresFactorUnlock(true);
          } else {
            const fallbackMsg =
              status === 429
                ? 'Demasiadas peticiones consecutivas. Espera unos segundos y recarga el enlace.'
                : 'El enlace directo no es válido o ha caducado.';
            setVerifyError(json?.error || fallbackMsg);
          }
        })
        .catch(() => {
          setVerifyError('Error de conexión al comprobar el enlace directo.');
        })
        .finally(() => {
          setLoadingDirectAccess(false);
        });
      return;
    }

    const teamParam = searchParams.get('equipo') || searchParams.get('team');
    if (teamParam) {
      const match = ALL_TEAMS.find(
        (t) =>
          t.id === teamParam ||
          t.id.includes(teamParam) ||
          t.name.toLowerCase().includes(teamParam.toLowerCase())
      );
      if (match) {
        setSelectedTeamId(match.id);
        fetchRosterOptions(match.id);
      }
    }
  }, [searchParams, fetchRosterOptions]);

  // Focus trap y Escape en modal OTP
  useEffect(() => {
    if (showOtpModal) {
      const justOpened = !wasOtpOpenRef.current;
      wasOtpOpenRef.current = true;
      const modal = otpModalRef.current;
      if (justOpened && modal && !modal.contains(document.activeElement)) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        focusable[0]?.focus();
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowOtpModal(false);
          return;
        }
        const modalEl = otpModalRef.current;
        if (e.key === 'Tab' && modalEl) {
          const items = Array.from(
            modalEl.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (items.length === 0) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (wasOtpOpenRef.current) {
      wasOtpOpenRef.current = false;
      modalTriggerRef.current?.focus();
    }
  }, [showOtpModal]);

  // Focus trap y Escape en modal informativo
  useEffect(() => {
    if (showInfoModal) {
      const justOpened = !wasInfoOpenRef.current;
      wasInfoOpenRef.current = true;
      const modal = infoModalRef.current;
      if (justOpened && modal && !modal.contains(document.activeElement)) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        focusable[0]?.focus();
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowInfoModal(false);
          return;
        }
        const modalEl = infoModalRef.current;
        if (e.key === 'Tab' && modalEl) {
          const items = Array.from(
            modalEl.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            )
          );
          if (items.length === 0) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (wasInfoOpenRef.current) {
      wasInfoOpenRef.current = false;
      modalTriggerRef.current?.focus();
    }
  }, [showInfoModal]);

  // Cuenta atrás OTP
  const hasOtpTimer = otpRemainingSec > 0;
  useEffect(() => {
    if (!hasOtpTimer) return;
    const timer = setInterval(() => {
      setOtpRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasOtpTimer]);

  const hasDirectOtpTimer = directOtpRemainingSec > 0;
  useEffect(() => {
    if (!hasDirectOtpTimer) return;
    const timer = setInterval(() => {
      setDirectOtpRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasDirectOtpTimer]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedPlayerId('');
    setVerifyError(null);
    setAlreadySignedData(null);
    setStep1StatusMessage(null);
    fetchRosterOptions(teamId);
  };

  // Paso 1 manual: verificar identidad
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setAlreadySignedData(null);
    setStep1StatusMessage(null);

    if (!selectedTeamId || !selectedPlayerId) {
      setVerifyError('Por favor, selecciona tu equipo y el deportista.');
      return;
    }
    if (!birthInput.trim()) {
      setVerifyError('Por favor, introduce el año o fecha de nacimiento del deportista.');
      return;
    }
    const cleanDni5 = normalizeDniLast5(dniLast5Input);
    if (!isValidDniLast5Format(cleanDni5)) {
      setVerifyError('Introduce los últimos caracteres de tu DNI/NIE (4 dígitos y letra, ej. 0001R) o últimos 5-6 de pasaporte.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/consent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          birthYearOrDate: birthInput.trim(),
          dniLast5: cleanDni5,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setVerifyError(data?.error || 'No se ha podido verificar la identidad. Comprueba los datos.');
        return;
      }

      applyUnlockedSession(data);
    } catch {
      setVerifyError('Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Paso 1B: Enviar código OTP al correo censado del enlace directo (con propósito explícito)
  const handleSendDirectUnlockOtp = async (forcedPurpose?: 'SIGN' | 'RECEIPT' | 'REVOKE') => {
    if (!verifiedPlayer || !directTokenParam) return;
    const effectivePurpose: 'SIGN' | 'RECEIPT' | 'REVOKE' =
      forcedPurpose || (alreadySignedData ? directSignedActionMode || 'RECEIPT' : 'SIGN');
    if (alreadySignedData && (effectivePurpose === 'RECEIPT' || effectivePurpose === 'REVOKE')) {
      setDirectSignedActionMode(effectivePurpose);
    }
    setDirectUnlockError(null);
    setDirectOtpSentMsg(null);
    setIsSendingDirectOtp(true);
    try {
      const res = await fetch('/api/consent/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: verifiedPlayer.id,
          directToken: directTokenParam,
          purpose: effectivePurpose,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setDirectUnlockError(data?.error || 'No se pudo enviar el código de verificación.');
        return;
      }
      setDirectOtpChallengeId(data.challengeId);
      setDirectOtpCode('');
      setDirectOtpRemainingSec(900);
      setDirectOtpSentMsg(
        `Código de 6 dígitos enviado a ${data.maskedEmail || maskedContactEmail} desde ${CLUB_INFO.contactEmail}.`
      );
    } catch {
      setDirectUnlockError('Error de conexión al enviar el código OTP.');
    } finally {
      setIsSendingDirectOtp(false);
    }
  };

  // Paso 1B: En enlace directo, Continuar envía OTP o valida para acceder / consultar resguardo / revocar
  const handleUnlockDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTokenParam || !verifiedPlayer) return;
    setDirectUnlockError(null);

    if (!directOtpChallengeId) {
      await handleSendDirectUnlockOtp();
      return;
    }

    if (directOtpCode.trim().length !== 6) {
      setDirectUnlockError('Introduce el código OTP de 6 dígitos enviado a tu correo electrónico.');
      return;
    }

    setIsUnlockingDirect(true);
    try {
      if (alreadySignedData && directSignedActionMode === 'REVOKE') {
        const revRes = await fetch('/api/consent/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: verifiedPlayer.id,
            directToken: directTokenParam,
            otpChallengeId: directOtpChallengeId,
            otpCode: directOtpCode.trim(),
          }),
        });
        const revData = await revRes.json().catch(() => null);
        if (!revRes.ok || !revData?.success || !revData?.verificationToken) {
          setDirectUnlockError(revData?.error || 'El código OTP introducido no es válido o ha caducado.');
          return;
        }

        setRequiresFactorUnlock(false);
        setDirectSignedActionMode(null);
        setDirectOtpChallengeId(null);
        setDirectOtpCode('');
        setStep1StatusMessage(
          'Autorización previa revocada correctamente (Art. 7.3 RGPD). Completa y firma ahora la nueva autorización.'
        );
        applyUnlockedSession({
          player: verifiedPlayer,
          alreadySigned: false,
          emailOtpVerified: false,
          hasCensusEmail: revData.hasCensusEmail ?? hasCensusEmail,
          maskedContactEmail: revData.maskedContactEmail ?? maskedContactEmail,
          verificationToken: revData.verificationToken,
          prefilledData: revData.prefilledData,
        });
        return;
      }

      const factorPurpose: 'SIGN' | 'RECEIPT' = alreadySignedData ? 'RECEIPT' : 'SIGN';
      const res = await fetch('/api/consent/verify-direct-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directToken: directTokenParam,
          factor: {
            otpChallengeId: directOtpChallengeId,
            otpCode: directOtpCode.trim(),
            purpose: factorPurpose,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setDirectUnlockError(data?.error || 'El código OTP introducido no es válido o ha caducado.');
        return;
      }

      setRequiresFactorUnlock(false);
      setDirectSignedActionMode(null);
      if (data.alreadySigned && data.receiptDetail) {
        setStep1StatusMessage('Resguardo oficial verificado. Ya puedes descargar tu documento PDF.');
      }
      applyUnlockedSession(data);
    } catch {
      setDirectUnlockError('Error de conexión al validar el acceso directo.');
    } finally {
      setIsUnlockingDirect(false);
    }
  };

  // Imprimir modelo presencial en blanco (sin sello digital ni hash)
  const handlePrintBlankPdf = async () => {
    setGeneratingBlankPdf(true);
    try {
      const selectedTeam = ALL_TEAMS.find((t) => t.id === selectedTeamId);
      const selectedRoster = rosterOptions.find((p) => p.playerId === selectedPlayerId);
      const teamName = verifiedPlayer?.teamName || selectedTeam?.name || 'C.D. Voleibol San Pedro';
      const playerName =
        verifiedPlayer?.name ||
        selectedRoster?.displayName ||
        '____________________________________________';
      const isMinorGuess =
        verifiedPlayer?.isMinor ?? !teamName.toLowerCase().includes('senior');

      const { generateConsentPdf } = await import('@/lib/pdf-consent');
      const doc = generateConsentPdf({
        playerName,
        teamName,
        isMinor: isMinorGuess,
        isMinor14To17: verifiedPlayer?.isMinor14To17,
        signerName: '',
        signerDni: '',
        signerRelationship: '',
        isPrintableBlank: true,
        signatureMethod: 'PRESENCIAL',
      });
      const safeName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || 'general';
      doc.save(`autorizacion_presencial_${safeName}.pdf`);
    } finally {
      setGeneratingBlankPdf(false);
    }
  };

  // Enviar código OTP al correo censado autoritativo
  const sendOtpForPurpose = useCallback(
    async (purpose: OtpPurposeType) => {
      if (!verifiedPlayer) return;
      setOtpError(null);
      setOtpSentMessage(null);
      setIsSendingOtp(true);

      try {
        const res = await fetch('/api/consent/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: verifiedPlayer.id,
            purpose,
            ...(purpose === 'SIGN' ? { verificationToken } : { actionToken }),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setOtpError(data?.error || 'No se pudo enviar el código de verificación.');
          return;
        }

        setOtpChallengeId(data.challengeId);
        setOtpChallengeTargetKey(`${verifiedPlayer.id}:${purpose}`);
        setOtpMaskedEmail(data.maskedEmail || maskedContactEmail);
        setOtpRemainingSec(900);
        setOtpSentMessage(
          `Código de 6 dígitos enviado a ${data.maskedEmail || maskedContactEmail} desde ${CLUB_INFO.contactEmail}.`
        );
      } catch {
        setOtpError('Error de conexión al solicitar el código OTP.');
      } finally {
        setIsSendingOtp(false);
      }
    },
    [verifiedPlayer, verificationToken, actionToken, maskedContactEmail]
  );

  // Abrir modal OTP sin reenvío automático involuntario si ya existe reto vigente
  const openOtpModal = useCallback(
    async (purpose: OtpPurposeType, triggerEl?: HTMLElement | null) => {
      if (!verifiedPlayer) return;
      modalTriggerRef.current = triggerEl || (document.activeElement as HTMLElement | null);
      setOtpPurpose(purpose);
      setOtpError(null);
      setOtpCode('');
      setShowOtpModal(true);

      const targetKey = `${verifiedPlayer.id}:${purpose}`;
      if (otpChallengeId && otpChallengeTargetKey === targetKey && otpRemainingSec > 30) {
        return;
      }
      await sendOtpForPurpose(purpose);
    },
    [verifiedPlayer, otpChallengeId, otpChallengeTargetKey, otpRemainingSec, sendOtpForPurpose]
  );

  // Envío común de autorización firmada (con OTP explícito o sesión OTP verificada en enlace directo)
  const executeConsentSubmit = async (otpParams?: { otpChallengeId: string; otpCode: string }) => {
    if (!verifiedPlayer) {
      return { ok: false, error: 'Sesión de deportista no válida.' };
    }
    const cleanDni = signerDni.trim().toUpperCase();
    const imageAllowed = consentSocialMedia === true;

    const res = await fetch('/api/consent/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationToken,
        playerId: verifiedPlayer.id,
        playerName: verifiedPlayer.name,
        teamId: verifiedPlayer.teamId,
        isMinor: verifiedPlayer.isMinor,
        signerType: verifiedPlayer.isMinor ? 'PARENT' : 'SELF_ADULT',
        signerName: signerName.trim(),
        signerDni: cleanDni,
        signerRelationship: verifiedPlayer.isMinor ? signerRelationship : 'PROPIO_JUGADOR',
        signerPhone: signerPhone.trim(),
        consentImage: imageAllowed,
        consentSocialMedia: imageAllowed,
        consentStreaming: imageAllowed,
        consentPress: imageAllowed,
        consentTravel: consentTravel === true,
        patriaPotestadAccepted: verifiedPlayer.isMinor ? patriaPotestadAccepted : true,
        policySummaryAccepted,
        signatureData,
        ...(otpParams
          ? { otpChallengeId: otpParams.otpChallengeId, otpCode: otpParams.otpCode }
          : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || 'No se pudo completar el registro. Verifica tus datos o el código OTP.',
      };
    }

    setConfirmedConsentId(data.consentId || null);
    setConfirmedHash(data.documentHash || null);
    setConfirmedTimestamp(data.timestamp || null);
    setConfirmedSignatureMethod(data.signatureMethod || 'OTP_EMAIL');
    setConfirmedSignerEmail(typeof data.signerEmail === 'string' ? data.signerEmail : '');
    setConfirmedBirthDate(typeof data.birthDate === 'string' ? data.birthDate : null);
    setReceiptEmailSent(data.receiptEmailSent === true);
    setReceiptEmailError(data.receiptEmailError || null);
    setShowOtpModal(false);
    setOtpChallengeId(null);
    setStep(3);
    return { ok: true };
  };

  // Validar Paso 2 antes de registrar (directo si OTP ya verificado al entrar, o modal OTP en flujo manual)
  const handleStep2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!verifiedPlayer) return;

    if (!hasCensusEmail) {
      setSubmitError(
        'Esta ficha no dispone de correo electrónico validado en el censo. Utiliza el impreso presencial o solicita la actualización en Secretaría.'
      );
      return;
    }

    if (!policySummaryAccepted) {
      setSubmitError('Debes confirmar la lectura de la información básica de protección de datos (1ª capa RGPD).');
      return;
    }

    if (!signerName.trim()) {
      setSubmitError('Por favor, indica el nombre y apellidos del firmante.');
      return;
    }

    const cleanDni = signerDni.trim().toUpperCase();
    if (!isValidSpanishDniOrNie(cleanDni)) {
      setSubmitError('El DNI o NIE del firmante principal no tiene un formato válido.');
      return;
    }

    if (consentSocialMedia === null || consentTravel === null) {
      setSubmitError(
        'Debes seleccionar explícitamente "Autorizo" o "No autorizo" tanto en el apartado de Imágenes como en el de Desplazamientos.'
      );
      return;
    }

    if (!patriaPotestadAccepted) {
      setSubmitError(
        verifiedPlayer.isMinor
          ? 'Debes marcar la declaración responsable de patria potestad o tutela legal.'
          : 'Debes confirmar la declaración de mayoría de edad y consentimiento.'
      );
      return;
    }

    if (!signatureData) {
      setSubmitError('Es obligatorio firmar en el recuadro principal con el dedo o el ratón.');
      return;
    }

    if (directOtpVerifiedSession) {
      setIsSubmittingDirectSigned(true);
      try {
        const submitRes = await executeConsentSubmit();
        if (!submitRes.ok) {
          if (submitRes.status === 403) {
            setDirectOtpVerifiedSession(false);
            if (isDirectAccess) {
              setRequiresFactorUnlock(true);
              setDirectOtpChallengeId(null);
              setDirectOtpCode('');
              setDirectOtpSentMsg(null);
              setDirectUnlockError(
                'Tu sesión de verificación caducó (20 min). Pulsa Continuar para validar un nuevo código OTP.'
              );
              setStep(1);
            } else {
              setVerifyError('Tu sesión de verificación caducó. Vuelve a validar tu identidad.');
              setStep(1);
            }
          } else if (submitRes.error?.toLowerCase().includes('otp')) {
            setDirectOtpVerifiedSession(false);
            await openOtpModal('SIGN');
          } else {
            setSubmitError(submitRes.error || 'No se pudo completar el registro.');
          }
        }
      } catch {
        setSubmitError('Error de conexión con el servidor al registrar la firma.');
      } finally {
        setIsSubmittingDirectSigned(false);
      }
      return;
    }

    await openOtpModal('SIGN');
  };

  // Confirmar código OTP según el propósito (SIGN | RECEIPT | REVOKE)
  const handleConfirmOtpModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPlayer) return;

    if (!otpChallengeId || otpCode.trim().length !== 6) {
      setOtpError('Introduce el código de 6 dígitos enviado al correo censado.');
      return;
    }

    setIsConfirmingOtp(true);
    setOtpError(null);

    try {
      if (otpPurpose === 'SIGN') {
        const submitRes = await executeConsentSubmit({
          otpChallengeId,
          otpCode: otpCode.trim(),
        });
        if (!submitRes.ok) {
          setOtpError(submitRes.error || 'No se pudo completar el registro. Verifica el código OTP.');
        }
        return;
      }

      if (otpPurpose === 'RECEIPT') {
        const res = await fetch('/api/consent/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: verifiedPlayer.id,
            actionToken,
            otpChallengeId,
            otpCode: otpCode.trim(),
            resendEmail: resendReceiptOnUnlock,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data.detail) {
          setOtpError(data?.error || 'No se pudo obtener el resguardo oficial.');
          return;
        }

        const detail = data.detail as ReceiptDetailPayload;
        setUnlockedReceiptDetail(detail);
        if (typeof data.actionToken === 'string' && data.actionToken.trim()) {
          setActionToken(data.actionToken.trim());
        }
        setShowOtpModal(false);
        setOtpChallengeId(null);

        const { generateConsentPdf } = await import('@/lib/pdf-consent');
        const doc = generateConsentPdf({
          consentId: detail.consentId,
          playerName: detail.playerName,
          teamName: detail.teamName,
          birthYear: detail.birthYear,
          birthDate: detail.birthDate,
          isMinor: detail.isMinor,
          isMinor14To17: detail.isMinor14To17,
          signerName: detail.signerName || '',
          signerDni: detail.signerDni || '',
          signerRelationship: detail.signerRelationship || '',
          signerPhone: detail.signerPhone,
          signerEmail: detail.signerEmail,
          minorSignerName: detail.minorSignerName,
          minorSignerDni: detail.minorSignerDni,
          minorSignatureData: detail.minorSignatureData,
          consentSocialMedia: detail.consentSocialMedia === true,
          consentStreaming: detail.consentStreaming === true,
          consentPress: detail.consentPress === true,
          consentTravel: detail.consentTravel === true,
          signatureMethod: detail.signatureMethod,
          signatureData: detail.signatureData,
          documentHash: detail.documentHash,
          signedAt: detail.signedAt,
        });
        const safeName = detail.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);

        setStep1StatusMessage(
          data.receiptEmailSent
            ? `Resguardo oficial descargado y enviado también por correo a ${otpMaskedEmail || maskedContactEmail}.`
            : resendReceiptOnUnlock && data.receiptEmailError
              ? `Resguardo descargado en este dispositivo. Aviso correo: ${data.receiptEmailError}`
              : 'Resguardo PDF oficial descargado con éxito.'
        );
        return;
      }

      if (otpPurpose === 'REVOKE') {
        const res = await fetch('/api/consent/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: verifiedPlayer.id,
            actionToken,
            otpChallengeId,
            otpCode: otpCode.trim(),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setOtpError(data?.error || 'No se pudo revocar la autorización vigente.');
          return;
        }

        setShowOtpModal(false);
        setOtpChallengeId(null);
        setAlreadySignedData(null);
        setActionToken('');
        setUnlockedReceiptDetail(null);

        if (typeof data.verificationToken === 'string' && data.verificationToken.trim()) {
          applyUnlockedSession({
            player: verifiedPlayer,
            alreadySigned: false,
            hasCensusEmail: data.hasCensusEmail ?? hasCensusEmail,
            maskedContactEmail: data.maskedContactEmail ?? maskedContactEmail,
            verificationToken: data.verificationToken.trim(),
            prefilledData: data.prefilledData,
          });
          return;
        }

        // Fallback si no vino verificationToken: re-verificar con los datos en memoria para pasar a Paso 2 limpio
        const cleanDni5 = normalizeDniLast5(dniLast5Input);
        const birthVal = birthInput.trim();
        if (cleanDni5 && birthVal) {
          const reRes = await fetch('/api/consent/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: verifiedPlayer.id,
              birthYearOrDate: birthVal,
              dniLast5: cleanDni5,
            }),
          });
          const reData = await reRes.json().catch(() => null);
          if (reRes.ok && reData?.success && !reData.alreadySigned) {
            applyUnlockedSession(reData);
            return;
          }
        }

        setStep1StatusMessage(
          'Autorización revocada conforme al Art. 7.3 RGPD. Vuelve a verificar tus datos para emitir una nueva autorización.'
        );
        setVerifiedPlayer(null);
        setStep(1);
      }
    } catch {
      setOtpError('Error de conexión al validar el código OTP.');
    } finally {
      setIsConfirmingOtp(false);
    }
  };

  // Descargar PDF ya desbloqueado si volvió a pulsar sin repetir OTP en la misma sesión
  const handleRedownloadUnlockedReceipt = async () => {
    if (!unlockedReceiptDetail) return;
    const { generateConsentPdf } = await import('@/lib/pdf-consent');
    const doc = generateConsentPdf({
      consentId: unlockedReceiptDetail.consentId,
      playerName: unlockedReceiptDetail.playerName,
      teamName: unlockedReceiptDetail.teamName,
      birthYear: unlockedReceiptDetail.birthYear,
      birthDate: unlockedReceiptDetail.birthDate,
      isMinor: unlockedReceiptDetail.isMinor,
      isMinor14To17: unlockedReceiptDetail.isMinor14To17,
      signerName: unlockedReceiptDetail.signerName || '',
      signerDni: unlockedReceiptDetail.signerDni || '',
      signerRelationship: unlockedReceiptDetail.signerRelationship || '',
      signerPhone: unlockedReceiptDetail.signerPhone,
      signerEmail: unlockedReceiptDetail.signerEmail,
      minorSignerName: unlockedReceiptDetail.minorSignerName,
      minorSignerDni: unlockedReceiptDetail.minorSignerDni,
      minorSignatureData: unlockedReceiptDetail.minorSignatureData,
      consentSocialMedia: unlockedReceiptDetail.consentSocialMedia === true,
      consentStreaming: unlockedReceiptDetail.consentStreaming === true,
      consentPress: unlockedReceiptDetail.consentPress === true,
      consentTravel: unlockedReceiptDetail.consentTravel === true,
      signatureMethod: unlockedReceiptDetail.signatureMethod,
      signatureData: unlockedReceiptDetail.signatureData,
      documentHash: unlockedReceiptDetail.documentHash,
      signedAt: unlockedReceiptDetail.signedAt,
    });
    const safeName = unlockedReceiptDetail.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
  };

  // Descargar PDF en Paso 3 tras completar firma
  const handleDownloadSuccessPdf = async () => {
    if (!verifiedPlayer) return;
    const imageAllowed = consentSocialMedia === true;
    const { generateConsentPdf } = await import('@/lib/pdf-consent');
    const doc = generateConsentPdf({
      consentId: confirmedConsentId || undefined,
      playerName: verifiedPlayer.name,
      teamName: verifiedPlayer.teamName,
      birthYear: verifiedPlayer.birthYear,
      birthDate: confirmedBirthDate || undefined,
      isMinor: verifiedPlayer.isMinor,
      isMinor14To17: verifiedPlayer.isMinor14To17,
      signerName: signerName.trim(),
      signerDni: signerDni.trim().toUpperCase(),
      signerRelationship: verifiedPlayer.isMinor ? signerRelationship : 'PROPIO_JUGADOR',
      signerPhone: signerPhone.trim(),
      signerEmail: confirmedSignerEmail || signerEmail.trim() || undefined,
      consentImage: imageAllowed,
      consentSocialMedia: imageAllowed,
      consentStreaming: imageAllowed,
      consentPress: imageAllowed,
      consentTravel: consentTravel === true,
      signatureData: signatureData || undefined,
      signatureMethod: confirmedSignatureMethod,
      documentHash: confirmedHash || undefined,
      signedAt: confirmedTimestamp || undefined,
    });

    const safeName = verifiedPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
  };

  const ageSegmentLabel = verifiedPlayer
    ? !verifiedPlayer.isMinor
      ? 'Mayor de edad (+18)'
      : verifiedPlayer.isMinor14To17
        ? 'Menor de 14 a 17 años (Tutor legal)'
        : verifiedPlayer.isBoundaryUnverified
          ? 'Menor de edad (Tutor legal · fecha pendiente)'
          : 'Menor de 14 años (Tutor legal)'
    : '';

  return (
    <div className="w-full min-h-screen bg-background text-on-surface relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.12] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        {/* Cabecera Principal */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container text-white text-xs font-bold uppercase tracking-wider rounded">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Portal Oficial de Autorizaciones · Junta de Andalucía</span>
          </div>
          <h1 className="font-display-xl text-3xl sm:text-4xl text-white uppercase tracking-tight">
            Autorizaciones Oficiales y Cesión de Imagen
          </h1>
          <p className="text-sm text-tertiary max-w-xl mx-auto">
            Trámite digital oficial para deportistas y familias del {CLUB_INFO.name}. Conforme al Protocolo de Menores de la Junta de Andalucía, RGPD y LOPDGDD.
          </p>
        </div>

        {/* Carga enlace directo */}
        {loadingDirectAccess && (
          <div className="p-6 bg-surface-container-lowest border border-white/10 rounded-xl text-center space-y-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" aria-hidden="true" />
            <p className="text-sm text-white/90">Validando enlace directo emitido por el Club...</p>
          </div>
        )}

        {/* Indicador de pasos */}
        {!loadingDirectAccess && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { n: 1 as const, label: 'Identificación' },
              { n: 2 as const, label: 'Autorizaciones y Firma' },
              { n: 3 as const, label: 'Resguardo Oficial' },
            ].map((item, idx) => (
              <React.Fragment key={item.n}>
                {idx > 0 && <div className="hidden sm:block w-8 h-px bg-white/20" aria-hidden="true" />}
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap ${
                    step === item.n
                      ? 'bg-primary-container text-white'
                      : 'bg-surface-container-high text-tertiary'
                  }`}
                >
                  <span>{item.n}</span>
                  <span>{item.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1B: VERIFICACIÓN ÚNICA POR OTP DE EMAIL EN ENLACE DIRECTO            */}
        {/* ========================================================================= */}
        {step === 1 && !loadingDirectAccess && isDirectAccess && requiresFactorUnlock && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-primary-container/40 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-white/10 pb-4 space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-primary">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Verificación por Correo Electrónico</span>
              </div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                Autorización de {verifiedPlayer.name}
              </h2>
              <p className="text-xs text-tertiary">
                Equipo: <strong className="text-white">{verifiedPlayer.teamName}</strong>.
              </p>
            </div>

            <div className="p-4 bg-surface-container-low border border-white/10 rounded-lg text-xs space-y-2">
              {maskedPrefill?.signerName && (
                <p className="text-white/90">
                  Titular / Firmante: <strong>{maskedPrefill.signerName}</strong>
                </p>
              )}
              {hasCensusEmail && (maskedContactEmail || maskedPrefill?.signerEmail) && (
                <p className="text-white/90">
                  Correo censado (no modificable):{' '}
                  <strong className="font-mono text-white break-all">
                    {maskedContactEmail || maskedPrefill?.signerEmail}
                  </strong>
                </p>
              )}
              {hasCensusEmail && !directOtpChallengeId && !alreadySignedData && (
                <p className="text-tertiary leading-relaxed pt-1 border-t border-white/10">
                  Al pulsar <strong className="text-white">Continuar</strong> enviaremos un código de seguridad (OTP) de 6 dígitos a tu correo desde{' '}
                  <strong className="text-primary font-mono">{CLUB_INFO.contactEmail}</strong> para proteger tus datos y autorizar la firma.
                </p>
              )}
              {alreadySignedData && (
                <div className="pt-2 border-t border-white/10 space-y-1 text-emerald-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>
                      Ya consta una autorización oficial vigente registrada el{' '}
                      {new Date(alreadySignedData.signedAt).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}.
                    </span>
                  </p>
                  <p className="text-tertiary">
                    Elige si deseas descargar tu resguardo PDF o revocar el consentimiento actual para emitir uno nuevo.
                  </p>
                </div>
              )}
            </div>

            {!hasCensusEmail ? (
              <div role="alert" className="p-4 bg-amber-950/50 border border-amber-500/40 rounded-lg space-y-3 text-xs text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="leading-relaxed">
                    Esta ficha aún no dispone de correo electrónico validado en el censo para recibir el código OTP de firma digital. Escribe a{' '}
                    <a href={`mailto:${CLUB_INFO.contactEmail}`} className="underline font-bold text-white">
                      {CLUB_INFO.contactEmail}
                    </a>{' '}
                    o descarga el modelo presencial para entregar firmado en Secretaría.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={generatingBlankPdf}
                  onClick={handlePrintBlankPdf}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold uppercase text-[11px] rounded cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{generatingBlankPdf ? 'Generando...' : 'Imprimir modelo presencial en blanco'}</span>
                </button>
              </div>
            ) : alreadySignedData && !directOtpChallengeId ? (
              <div className="space-y-3">
                {directUnlockError && (
                  <div role="alert" className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2 text-xs text-red-200">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{directUnlockError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSendingDirectOtp}
                    onClick={() => handleSendDirectUnlockOtp('RECEIPT')}
                    className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingDirectOtp && directSignedActionMode === 'RECEIPT' ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Consultar / Descargar Resguardo PDF</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSendingDirectOtp}
                    onClick={() => handleSendDirectUnlockOtp('REVOKE')}
                    className="w-full py-3.5 px-4 bg-surface-container-high hover:bg-red-950/70 text-white border border-white/15 hover:border-red-400/50 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingDirectOtp && directSignedActionMode === 'REVOKE' ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>Revocar y firmar de nuevo (Art. 7.3)</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUnlockDirectToken} className="space-y-4">
                {directOtpChallengeId && (
                  <div className="space-y-3 p-4 bg-surface-container-low/70 border border-white/10 rounded-xl">
                    {directSignedActionMode === 'REVOKE' && (
                      <div className="p-2.5 bg-amber-950/50 border border-amber-500/40 rounded-lg text-xs text-amber-200 leading-relaxed">
                        <strong>Revocación activa (Art. 7.3 RGPD):</strong> al confirmar el código OTP anularás el consentimiento vigente para formalizar uno nuevo a continuación.
                      </div>
                    )}
                    {directOtpSentMsg && (
                      <div role="status" className="p-2.5 bg-emerald-950/50 border border-emerald-500/35 rounded-lg text-xs text-emerald-200 text-center">
                        {directOtpSentMsg}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                      <span>Validez del código:</span>
                      {directOtpRemainingSec > 0 ? (
                        <strong className="text-emerald-400 font-mono">
                          {Math.floor(directOtpRemainingSec / 60)}:{String(directOtpRemainingSec % 60).padStart(2, '0')} min
                        </strong>
                      ) : (
                        <strong className="text-red-400 font-mono">0:00 · Caducado</strong>
                      )}
                    </div>
                    <div>
                      <label htmlFor="direct-otp-code" className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5 text-center">
                        Introduce el código OTP de 6 dígitos
                      </label>
                      <input
                        id="direct-otp-code"
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        maxLength={6}
                        placeholder="000000"
                        value={directOtpCode}
                        onChange={(e) => setDirectOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-surface-container-high border-2 border-primary/50 focus:border-primary rounded-xl px-3 sm:px-4 py-3 text-base sm:text-2xl font-mono font-bold tracking-[0.2em] sm:tracking-[0.4em] text-center text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {alreadySignedData ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDirectOtpChallengeId(null);
                            setDirectSignedActionMode(null);
                            setDirectOtpCode('');
                            setDirectUnlockError(null);
                          }}
                          className="text-xs text-tertiary hover:text-white cursor-pointer"
                        >
                          ← Cambiar opción
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        disabled={isSendingDirectOtp || isUnlockingDirect}
                        onClick={() => handleSendDirectUnlockOtp()}
                        className="text-xs text-primary hover:underline font-semibold cursor-pointer disabled:opacity-40"
                      >
                        {isSendingDirectOtp ? 'Reenviando código...' : 'Reenviar código OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {directUnlockError && (
                  <div role="alert" className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2 text-xs text-red-200">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{directUnlockError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSendingDirectOtp ||
                    isUnlockingDirect ||
                    (Boolean(directOtpChallengeId) && directOtpCode.trim().length !== 6)
                  }
                  className="w-full py-3.5 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingDirectOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Enviando código OTP...</span>
                    </>
                  ) : isUnlockingDirect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Validando código...</span>
                    </>
                  ) : directSignedActionMode === 'REVOKE' && directOtpChallengeId ? (
                    <>
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Confirmar revocación y firmar</span>
                    </>
                  ) : (
                    <>
                      <span>Continuar</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1: SELECCIÓN Y VERIFICACIÓN MANUAL                                   */}
        {/* ========================================================================= */}
        {step === 1 && !loadingDirectAccess && !(isDirectAccess && requiresFactorUnlock) && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-white/10 pb-4 space-y-1">
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                {isDirectAccess && alreadySignedData
                  ? 'Autorización Oficial Activa'
                  : 'Paso 1: Identificación del Deportista'}
              </h2>
              <p className="text-xs text-tertiary">
                {isDirectAccess && alreadySignedData
                  ? 'Esta ficha ya dispone de una autorización registrada y validada para la temporada.'
                  : 'Para garantizar la seguridad y privacidad, verifica los datos del deportista federado antes de acceder a la firma o al resguardo.'}
              </p>
            </div>

            {step1StatusMessage && (
              <div role="status" className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{step1StatusMessage}</span>
              </div>
            )}

            {!(isDirectAccess && alreadySignedData) && (
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Selector de Equipo */}
              <div>
                <label htmlFor="auth-team-select" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  1. Selecciona el Equipo <span className="text-primary">*</span>
                </label>
                <select
                  id="auth-team-select"
                  value={selectedTeamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Elige tu equipo --</option>
                  {ALL_TEAMS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Deportista vía /api/consent/roster-options */}
              <div>
                <label htmlFor="auth-player-select" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  2. Deportista del Equipo <span className="text-primary">*</span>
                </label>
                <select
                  id="auth-player-select"
                  value={selectedPlayerId}
                  onChange={(e) => {
                    setSelectedPlayerId(e.target.value);
                    setVerifyError(null);
                    setAlreadySignedData(null);
                    setStep1StatusMessage(null);
                  }}
                  disabled={!selectedTeamId || loadingRoster}
                  required
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary disabled:opacity-40"
                >
                  <option value="">
                    {!selectedTeamId
                      ? '-- Primero selecciona un equipo --'
                      : loadingRoster
                        ? 'Cargando deportistas...'
                        : rosterOptions.length === 0
                          ? '-- Sin fichas disponibles en este equipo --'
                          : '-- Elige al deportista --'}
                  </option>
                  {rosterOptions.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.displayName}
                      {p.isDemo ? ' [TEST]' : ''}
                    </option>
                  ))}
                </select>

                {rosterError && (
                  <div role="alert" className="mt-2 p-2.5 bg-red-950/50 border border-red-500/40 rounded-lg flex items-center justify-between gap-2 text-xs text-red-200">
                    <span>{rosterError}</span>
                    <button
                      type="button"
                      onClick={() => fetchRosterOptions(selectedTeamId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-white font-bold uppercase text-[11px] rounded cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      <span>Reintentar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Doble verificación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label htmlFor="auth-birth-input" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Año o Fecha de Nacimiento <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="auth-birth-input"
                      type="text"
                      placeholder="Ej. 2012 o 15/04/2012"
                      value={birthInput}
                      onChange={(e) => setBirthInput(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-10 pr-3 py-2.5 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                    <Calendar className="w-4 h-4 text-tertiary absolute left-3 top-3" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] text-tertiary">Año o fecha DD/MM/AAAA de su ficha.</span>
                </div>

                <div>
                  <label htmlFor="auth-dni5-input" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Últimos 4 dígitos + Letra DNI/NIE <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="auth-dni5-input"
                      type="text"
                      placeholder="Ej. 0001R"
                      maxLength={6}
                      value={dniLast5Input}
                      onChange={(e) => setDniLast5Input(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-10 pr-3 py-2.5 text-base sm:text-sm text-white uppercase placeholder-white/30 tracking-wider font-mono focus:outline-none focus:border-primary"
                    />
                    <Lock className="w-4 h-4 text-tertiary absolute left-3 top-3" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] text-tertiary">De la ficha federativa del deportista.</span>
                </div>
              </div>

              {verifyError && (
                <div role="alert" className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{verifyError}</span>
                </div>
              )}

              {!alreadySignedData && (
                <button
                  type="submit"
                  disabled={isVerifying || !selectedPlayerId}
                  className="w-full py-3.5 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Verificando datos federativos...</span>
                    </>
                  ) : (
                    <>
                      <span>Continuar al Formulario Oficial</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}

              {/* Impreso presencial en blanco siempre accesible */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-tertiary">
                  ¿Prefieres entregar el documento firmado a mano en Secretaría?
                </p>
                <button
                  type="button"
                  disabled={generatingBlankPdf}
                  onClick={handlePrintBlankPdf}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright text-white border border-white/15 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{generatingBlankPdf ? 'Generando...' : 'Imprimir modelo presencial en blanco'}</span>
                </button>
              </div>
            </form>
            )}

              {/* Tarjeta si ya estaba firmado previamente (sin descarga enmascarada) */}
              {alreadySignedData && verifiedPlayer && (
                <div className="p-5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>¡Autorización oficial activa registrada!</span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    <strong>{verifiedPlayer.name}</strong> ({verifiedPlayer.teamName}) cuenta con una autorización vigente firmada por{' '}
                    <strong>{alreadySignedData.signerName}</strong> ({alreadySignedData.signerDni}) el{' '}
                    {new Date(alreadySignedData.signedAt).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded bg-black/30 border border-white/10">
                      <span className="text-tertiary block">1. Imágenes Deportivas</span>
                      <strong
                        className={
                          alreadySignedData.consentSocialMedia ||
                          alreadySignedData.consentStreaming ||
                          alreadySignedData.consentPress
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }
                      >
                        {alreadySignedData.consentSocialMedia ||
                        alreadySignedData.consentStreaming ||
                        alreadySignedData.consentPress
                          ? 'Autorizado'
                          : 'No autorizado'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-black/30 border border-white/10">
                      <span className="text-tertiary block">2. Desplazamientos Oficiales</span>
                      <strong className={alreadySignedData.consentTravel ? 'text-emerald-300' : 'text-red-300'}>
                        {alreadySignedData.consentTravel ? 'Autorizado' : 'No autorizado'}
                      </strong>
                    </div>
                  </div>

                  {!hasCensusEmail && (
                    <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-lg text-xs text-amber-200 leading-relaxed">
                      Para descargar o revocar electrónicamente el resguardo oficial con tu firma sin enmascarar es necesario disponer de un correo electrónico validado en el censo. Escribe a{' '}
                      <a href={`mailto:${CLUB_INFO.contactEmail}`} className="underline font-bold text-white">
                        {CLUB_INFO.contactEmail}
                      </a>{' '}
                      o solicítalo en Secretaría.
                    </div>
                  )}

                  <div className="pt-1 flex flex-wrap gap-2.5">
                    {unlockedReceiptDetail ? (
                      <button
                        type="button"
                        onClick={handleRedownloadUnlockedReceipt}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>Descargar Resguardo Oficial (PDF)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!hasCensusEmail || !actionToken}
                        onClick={(e) => openOtpModal('RECEIPT', e.currentTarget)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>Descargar / Reenviar Resguardo PDF Oficial</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!hasCensusEmail || !actionToken}
                      onClick={(e) => openOtpModal('REVOKE', e.currentTarget)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-red-950/70 disabled:opacity-40 text-white border border-white/15 hover:border-red-400/50 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Revocar y emitir nueva firma (Art. 7.3)</span>
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: FORMULARIO OFICIAL, 1ª CAPA RGPD Y FIRMA ÚNICA                    */}
        {/* ========================================================================= */}
        {step === 2 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-7 shadow-2xl">
            {/* Cabecera responsiva */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap border-b border-white/10 pb-4">
              <div>
                {!isDirectAccess && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white mb-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Volver a identificación</span>
                  </button>
                )}
                <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                  Paso 2: Declaración Oficial y Firma Electrónica
                </h2>
                <span className="text-xs text-tertiary">
                  Protocolo Marco Junta de Andalucía · RGPD · LOPDGDD · LO 1/1982
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] font-bold text-primary block">{verifiedPlayer.teamName}</span>
                <span className="text-sm font-bold text-white">{verifiedPlayer.name}</span>
                <span className="text-[11px] text-tertiary block">{ageSegmentLabel}</span>
              </div>
            </div>

            {/* BLOQUE 1ª CAPA ART. 13 RGPD / ART. 11 LOPDGDD (LITERAL) */}
            <div className="p-4 sm:p-5 bg-surface-container-low border border-white/15 rounded-xl space-y-2.5 text-xs text-white/90 leading-relaxed">
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Información Básica sobre Protección de Datos (Art. 13 RGPD / Art. 11 LOPDGDD)</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-tertiary">
                <li>
                  <strong className="text-white">Responsable:</strong> SAN PEDRO C.D VOLEIBOL (C.D. Voleibol San Pedro) · CIF G93147924 · Domicilio: C/ Diego Piña Macias Nº 21, 29670 San Pedro Alcántara (Málaga) · Contacto y derechos:{' '}
                  <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline hover:text-white">
                    {CLUB_INFO.contactEmail}
                  </a>.
                </li>
                <li>
                  <strong className="text-white">Finalidades:</strong> (1) Gestión administrativa, federativa (FAVB/AFADE) y desplazamientos oficiales del deportista; (2) Captación, tratamiento y difusión no lucrativa de imágenes deportivas en los canales del Club (web oficial, RRSS institucionales, retransmisiones deportivas, memorias, cartelería y prensa deportiva).
                </li>
                <li>
                  <strong className="text-white">Base Jurídica y Obligatoriedad (Art. 6 y 13.2.e RGPD):</strong> Relación asociativa y obligación legal deportiva/menores (Art. 6.1.b y 6.1.c RGPD; Ley 5/2016; LOPIVI) para datos identificativos y verificación OTP; <strong className="text-white">consentimiento expreso y voluntario</strong> (Art. 6.1.a RGPD, Art. 7 LOPDGDD, LO 1/1982 y Orden 18/11/2024 BOJA núm. 229) para cesión de imágenes y transporte colectivo (denegarlas no impide la práctica deportiva).
                </li>
                <li>
                  <strong className="text-white">Destinatarios y Encargados (Cap. V RGPD):</strong> FAVB/RFEVB, Liga AFADE, aseguradora deportiva obligatoria y Patronato Municipal de Deportes de Marbella; prohibida la cesión comercial a terceros o patrocinadores. Base de datos y correo en la UE (Neon Frankfurt eu-central-1, Zoho Mail EU) y hosting en Netlify Inc. (EE. UU., EU-U.S. Data Privacy Framework / Cláusulas Contractuales Tipo).
                </li>
                <li>
                  <strong className="text-white">Conservación:</strong> Vigencia deportiva y bloqueo legal durante <strong className="text-white">4–5 años</strong> tras la baja o mayoría de edad (Art. 9.5 LO 1/1982, Art. 1964 CC y Art. 32 LOPDGDD), con supresión o <em>crypto-shredding</em> posterior.
                </li>
                <li>
                  <strong className="text-white">Derechos y Revocación (Art. 13.2.c y 7.3 RGPD):</strong> Puedes retirar tu consentimiento en cualquier momento (sin efecto retroactivo) mediante este portal con código OTP o escribiendo a {CLUB_INFO.contactEmail} (incluido el derecho personal de los deportistas mayores de 14 años a oponerse o retirar la difusión de su imagen), ejercer acceso, rectificación, supresión, limitación, portabilidad y oposición, y reclamar ante la AEPD (www.aepd.es). Consulta nuestra{' '}
                  <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-white font-semibold">
                    Política de Privacidad
                  </Link>.
                </li>
              </ul>

              <label htmlFor="consent-policy-summary" className="flex items-start gap-2.5 pt-2 border-t border-white/10 cursor-pointer text-xs text-white">
                <input
                  id="consent-policy-summary"
                  type="checkbox"
                  checked={policySummaryAccepted}
                  onChange={(e) => setPolicySummaryAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                />
                <span>
                  He leído la información básica sobre protección de datos (1ª capa RGPD) y la Política de Privacidad antes de prestar mi consentimiento. <span className="text-primary">*</span>
                </span>
              </label>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* Datos del firmante principal */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {verifiedPlayer.isMinor
                      ? 'Datos del Padre / Madre o Tutor/a Legal'
                      : 'Datos del/de la Deportista (Mayor de Edad)'}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="signer-name" className="block text-xs text-white/85 font-medium mb-1.5">
                      Nombre y Apellidos completos <span className="text-primary">*</span>
                    </label>
                    <input
                      id="signer-name"
                      type="text"
                      placeholder="Nombre del firmante"
                      value={verifiedPlayer.isMinor ? signerName : verifiedPlayer.name}
                      onChange={(e) => {
                        if (verifiedPlayer.isMinor) setSignerName(e.target.value);
                      }}
                      readOnly={!verifiedPlayer.isMinor}
                      required
                      className={`w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary ${
                        !verifiedPlayer.isMinor ? 'opacity-80 cursor-not-allowed' : ''
                      }`}
                    />
                    {!verifiedPlayer.isMinor && (
                      <span className="text-[11px] text-tertiary mt-1 block">
                        Titular mayor de edad según el censo oficial.
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signer-dni" className="block text-xs text-white/85 font-medium mb-1.5">
                      DNI o NIE del firmante <span className="text-primary">*</span>
                    </label>
                    <input
                      id="signer-dni"
                      type="text"
                      placeholder="Ej. 00000001R o X0000001R"
                      value={signerDni}
                      onChange={(e) => setSignerDni(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {verifiedPlayer.isMinor ? (
                    <div>
                      <label htmlFor="signer-relationship" className="block text-xs text-white/85 font-medium mb-1.5">
                        Relación con el menor <span className="text-primary">*</span>
                      </label>
                      <select
                        id="signer-relationship"
                        value={signerRelationship}
                        onChange={(e) => setSignerRelationship(e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL')}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary"
                      >
                        <option value="MADRE">Madre</option>
                        <option value="PADRE">Padre</option>
                        <option value="TUTOR_LEGAL">Tutor / Tutora Legal</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="signer-condition" className="block text-xs text-white/85 font-medium mb-1.5">
                        Condición
                      </label>
                      <input
                        id="signer-condition"
                        type="text"
                        disabled
                        value="Propio Deportista (+18)"
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white/60"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="signer-phone" className="block text-xs text-white/85 font-medium mb-1.5">
                      Teléfono móvil de contacto
                    </label>
                    <div className="relative">
                      <input
                        id="signer-phone"
                        type="tel"
                        placeholder="600 000 000"
                        value={signerPhone}
                        onChange={(e) => setSignerPhone(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <Phone className="w-3.5 h-3.5 text-tertiary absolute left-3 top-3.5" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                {/* Destino OTP fijo al correo censado */}
                {hasCensusEmail ? (
                  <div className="p-3.5 bg-surface-container-low border border-white/15 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start sm:items-center gap-2 text-white/90 min-w-0">
                      <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                      <span className="min-w-0">
                        Destino de verificación OTP y copia PDF (censo oficial):{' '}
                        <strong className="font-mono text-white break-all">{maskedContactEmail || signerEmail}</strong>
                      </span>
                    </div>
                    <span
                      className={`text-[11px] shrink-0 font-semibold ${
                        directOtpVerifiedSession ? 'text-emerald-400' : 'text-tertiary'
                      }`}
                    >
                      {directOtpVerifiedSession ? '✓ Verificado por OTP · No modificable' : 'No modificable en web'}
                    </span>
                  </div>
                ) : (
                  <div role="alert" className="p-4 bg-amber-950/50 border border-amber-500/40 rounded-lg space-y-2.5 text-xs text-amber-100">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="leading-relaxed">
                        Esta ficha aún no dispone de un correo electrónico validado en el censo del club para recibir el código OTP obligatorio de firma digital. Escribe a{' '}
                        <a href={`mailto:${CLUB_INFO.contactEmail}`} className="underline font-bold text-white">
                          {CLUB_INFO.contactEmail}
                        </a>{' '}
                        para incorporar tu correo o descarga el modelo presencial para entregar firmado en Secretaría.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={generatingBlankPdf}
                      onClick={handlePrintBlankPdf}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold uppercase text-[11px] rounded cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Imprimir modelo presencial en blanco</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* 2 DECISIONES OFICIALES JUNTA DE ANDALUCÍA (ANEXO 05 Y ANEXO 06)           */}
              {/* ========================================================================= */}
              <div className="space-y-4 pt-5 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" aria-hidden="true" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        1. Tratamiento y Difusión de Imágenes Deportivas
                      </h3>
                    </div>
                    <p className="text-[11px] text-tertiary leading-relaxed">
                      Protocolo Marco de Menores de la Junta de Andalucía (Orden de 18 de noviembre de 2024, BOJA núm. 229), Ley Orgánica 1/1982, RGPD y LOPDGDD.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      modalTriggerRef.current = e.currentTarget;
                      setShowInfoModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white underline font-semibold self-start sm:self-auto cursor-pointer shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ver normativa oficial</span>
                  </button>
                </div>

                {/* Bloque 1 único de Imagen (Anexo 05) */}
                <DecisionPair
                  idPrefix="decision-image"
                  title="Tratamiento y Difusión de Imágenes Deportivas"
                  description="Captación, tratamiento y difusión de fotografías o vídeos del/de la deportista en folletos, cartelería, memoria del club, web oficial (voleibolsanpedro.es), perfiles institucionales en redes sociales, Apps deportivas, retransmisiones oficiales (vídeos/streaming), pósters, estadísticas y medios de comunicación (prensa escrita y audiovisual), tomados exclusivamente durante competiciones oficiales, concentraciones, entrenamientos y eventos deportivos con la única finalidad de promoción del deporte del C.D. Voleibol San Pedro sin ánimo de lucro, respetando su dignidad y honor personal y prohibiendo cualquier uso comercial o cesión a patrocinadores."
                  icon={<Camera className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
                  allowLabel="Autorizo el tratamiento y difusión de imágenes deportivas"
                  denyLabel="No autorizo el tratamiento ni difusión de imágenes deportivas"
                  value={consentSocialMedia}
                  onChange={handleImageConsentChange}
                />
              </div>

              {/* Bloque 2: Desplazamientos (Anexo 06) */}
              <div className="space-y-3 pt-5 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        2. Desplazamientos y Viajes Deportivos Oficiales
                      </h3>
                    </div>
                    <p className="text-[11px] text-tertiary">
                      Orden 18/11/2024 (BOJA núm. 229), Ley 5/2016 del Deporte de Andalucía, Arts. 154–156 CC y R.D. 443/2001.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      modalTriggerRef.current = e.currentTarget;
                      setShowInfoModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-white underline font-semibold self-start sm:self-auto cursor-pointer shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ver normativa oficial</span>
                  </button>
                </div>

                <DecisionPair
                  idPrefix="decision-travel"
                  title="Traslado en Transportes Oficiales del Club"
                  description="Participación y traslado del deportista en autobuses fletados o vehículos oficiales designados por el club para asistir a partidos FAVB/AFADE, concentraciones, Campeonatos de Andalucía (CADEBA) y torneos oficiales durante la temporada 2026/2027 bajo supervisión de entrenadores y delegados acreditados (Orden 18/11/2024 BOJA núm. 229, Ley 5/2016, Arts. 154–156 CC y R.D. 443/2001)."
                  icon={<Bus className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />}
                  allowLabel="Autorizo los desplazamientos y viajes deportivos oficiales"
                  denyLabel="No autorizo el traslado en transportes del club (desplazamientos a cargo de tutores/medios propios)"
                  value={consentTravel}
                  onChange={setConsentTravel}
                />
              </div>

              {/* Declaración responsable según edad */}
              <div className="p-4 bg-surface-container-low border border-white/15 rounded-lg space-y-2">
                <label htmlFor="patria-potestad-check" className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    id="patria-potestad-check"
                    type="checkbox"
                    checked={patriaPotestadAccepted}
                    onChange={(e) => setPatriaPotestadAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-white/95 leading-relaxed">
                    {!verifiedPlayer.isMinor ? (
                      <>
                        <strong>Declaración de Mayoría de Edad:</strong> Declaro ser mayor de edad, deportista del C.D. Voleibol San Pedro y prestar mi consentimiento libre, informado, específico e inequívoco en los apartados marcados. <span className="text-primary">*</span>
                      </>
                    ) : verifiedPlayer.isMinor14To17 ? (
                      <>
                        <strong>Declaración Responsable del Padre, Madre o Tutor/a Legal (14–17 años):</strong> Declaro bajo mi exclusiva responsabilidad ostentar la patria potestad o tutela legal del/de la deportista de 14 a 17 años (Arts. 154–156 CC; Art. 7.1 LOPDGDD), actuando con conformidad del otro progenitor; decido sobre los desplazamientos oficiales y, habiendo informado al/a la deportista y contando con su conocimiento y asentimiento (Art. 3.1 LO 1/1982), presto el consentimiento de imagen conforme a la Orden 18/11/2024 de la Junta de Andalucía, con constancia de su derecho personal a oponerse o retirar la difusión de su imagen en cualquier momento. <span className="text-primary">*</span>
                      </>
                    ) : (
                      <>
                        <strong>Declaración Responsable del Padre, Madre o Tutor/a Legal:</strong> Declaro bajo mi exclusiva responsabilidad ostentar la patria potestad o tutela legal del/de la deportista menor de edad (Arts. 154–156 CC y Art. 7.2 LOPDGDD), actuando con conformidad del otro progenitor, y presto mi decisión expresa de imagen y desplazamientos oficiales conforme a la Orden 18/11/2024 de la Junta de Andalucía. <span className="text-primary">*</span>
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Firma única */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="block text-xs font-bold text-white uppercase tracking-wider">
                    {verifiedPlayer.isMinor
                      ? 'Firma Manuscrita del Padre / Madre / Tutor Legal'
                      : 'Firma Manuscrita del/de la Deportista (+18)'}{' '}
                    <span className="text-primary">*</span>
                  </span>
                  <span className="text-[11px] text-tertiary">Línea continua negra sólida</span>
                </div>
                <SignaturePad
                  onSignatureChange={setSignatureData}
                  hintLabel={
                    verifiedPlayer.isMinor
                      ? '✕ Firma del representante legal'
                      : '✕ Firma del/de la deportista (+18)'
                  }
                />
              </div>

              {submitError && (
                <div role="alert" className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!hasCensusEmail || isSubmittingDirectSigned}
                className="w-full py-4 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-xl cursor-pointer"
              >
                {isSubmittingDirectSigned ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Registrando autorización...</span>
                  </>
                ) : directOtpVerifiedSession ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Confirmar y Registrar Autorización</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    <span>Verificar por Código OTP y Registrar Firma</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: CONFIRMACIÓN Y RESGUARDO OFICIAL (eIDAS)                          */}
        {/* ========================================================================= */}
        {step === 3 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Trámite Oficial Completado con Éxito
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Autorizaciones Registradas Oficialmente
              </h2>
              <p className="text-xs text-tertiary max-w-lg mx-auto leading-relaxed">
                Firma Electrónica Simple (verificación OTP al correo censado + trazo manuscrito + sellado de integridad HMAC-SHA256) conforme al Art. 3.10 y Art. 25.1 del Reglamento (UE) 910/2014 (eIDAS).
              </p>
            </div>

            {!receiptEmailSent && (
              <div role="alert" className="max-w-lg mx-auto p-4 bg-amber-950/60 border border-amber-500/40 rounded-lg text-left text-xs text-amber-100 space-y-2">
                <div className="flex items-start gap-2 font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Registro completado, pero no pudo enviarse la copia por correo en este momento.</span>
                </div>
                <p className="text-amber-100/90 leading-relaxed">
                  {receiptEmailError || 'Descarga ahora tu resguardo oficial en PDF desde el botón inferior.'} También puedes recuperarlo o reenviarlo en cualquier momento desde el Paso 1 con un código OTP o escribiendo a{' '}
                  <a href={`mailto:${CLUB_INFO.contactEmail}`} className="underline text-white font-semibold">
                    {CLUB_INFO.contactEmail}
                  </a>.
                </p>
              </div>
            )}

            <div className="bg-surface-container-low border border-white/10 rounded-lg p-5 text-left text-xs space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">Deportista:</span>
                <strong className="text-white text-right">{verifiedPlayer.name}</strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">Equipo / Categoría:</span>
                <strong className="text-white text-right">{verifiedPlayer.teamName}</strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">Persona Firmante:</span>
                <strong className="text-white text-right">
                  {signerName} (DNI: {signerDni.trim().toUpperCase()})
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">1. Cesión de Imágenes:</span>
                <strong className={consentSocialMedia ? 'text-emerald-400' : 'text-red-400'}>
                  {consentSocialMedia ? 'Autorizado' : 'No Autorizado'}
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">2. Desplazamientos Oficiales:</span>
                <strong className={consentTravel ? 'text-emerald-400' : 'text-red-400'}>
                  {consentTravel ? 'Autorizado' : 'No Autorizado'}
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-tertiary">Calificación Jurídica:</span>
                <strong className="text-white text-right">Firma Electrónica Simple (OTP + eIDAS)</strong>
              </div>
              {confirmedHash && (
                <div className="pt-2 text-[10px] text-tertiary space-y-1">
                  <span>Huella de Integridad HMAC-SHA256:</span>
                  <div className="font-mono text-white/80 bg-black/30 p-2 rounded break-all">
                    {confirmedHash}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSuccessPdf}
                className="w-full sm:w-auto px-6 py-3.5 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Descargar Resguardo Oficial (PDF)</span>
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 bg-surface-container-high hover:bg-surface-bright text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL ACCESIBLE DE VERIFICACIÓN OTP (SIGN | RECEIPT | REVOKE)             */}
      {/* ========================================================================= */}
      {showOtpModal && verifiedPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            ref={otpModalRef}
            className="bg-surface-container-lowest border border-white/15 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90dvh] overflow-y-auto my-auto"
          >
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold uppercase rounded">
                  <KeyRound className="w-3 h-3" aria-hidden="true" />
                  <span>
                    {otpPurpose === 'REVOKE'
                      ? 'Confirmar Revocación (Art. 7.3 RGPD)'
                      : otpPurpose === 'RECEIPT'
                        ? 'Acceso Seguro al Resguardo PDF'
                        : 'Firma Electrónica Simple (eIDAS)'}
                  </span>
                </div>
                <h3 id="otp-modal-title" className="text-base font-bold text-white uppercase tracking-wide">
                  Verificación por Código OTP
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-tertiary hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar ventana de verificación OTP"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-white/90 leading-relaxed">
              <p>
                {otpPurpose === 'REVOKE'
                  ? 'Para revocar la autorización vigente (Art. 7.3 RGPD) y emitir una nueva firma, introduce el código de 6 dígitos enviado al correo censado:'
                  : otpPurpose === 'RECEIPT'
                    ? 'Por privacidad, introduce el código de 6 dígitos enviado al correo censado para descargar el resguardo oficial completo:'
                    : 'Para completar la Firma Electrónica Simple, introduce el código de seguridad de 6 dígitos enviado al correo censado:'}
              </p>
              <div className="p-3 bg-surface-container-low border border-white/10 rounded-xl space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1">
                  <span className="text-tertiary">Correo censado:</span>
                  <strong className="text-white font-mono break-all">{otpMaskedEmail || maskedContactEmail}</strong>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1">
                  <span className="text-tertiary">Remitente oficial:</span>
                  <strong className="text-primary font-mono break-all">{CLUB_INFO.contactEmail}</strong>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1">
                  <span className="text-tertiary">Tiempo de validez:</span>
                  {otpRemainingSec > 0 ? (
                    <strong className="text-emerald-400 font-mono">
                      {Math.floor(otpRemainingSec / 60)}:{String(otpRemainingSec % 60).padStart(2, '0')} min
                    </strong>
                  ) : (
                    <strong className="text-red-400 font-mono">0:00 · Caducado</strong>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmOtpModal} className="space-y-4">
              <div>
                <label htmlFor="otp-code-input" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 text-center">
                  Introduce el código de 6 dígitos
                </label>
                <input
                  id="otp-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full bg-surface-container-high border-2 border-primary/50 focus:border-primary rounded-xl px-3 sm:px-4 py-3 text-base sm:text-2xl font-mono font-bold text-white tracking-[0.2em] sm:tracking-[0.4em] text-center focus:outline-none"
                />
              </div>

              {otpPurpose === 'RECEIPT' && (
                <label htmlFor="resend-receipt-email" className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                  <input
                    id="resend-receipt-email"
                    type="checkbox"
                    checked={resendReceiptOnUnlock}
                    onChange={(e) => setResendReceiptOnUnlock(e.target.checked)}
                    className="w-4 h-4 accent-[#d90429] cursor-pointer"
                  />
                  <span>Enviar también una copia en PDF al correo censado</span>
                </label>
              )}

              {otpSentMessage && !otpError && (
                <div role="status" className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-[11px] text-emerald-200 text-center">
                  {otpSentMessage}
                </div>
              )}

              {otpError && (
                <div role="alert" className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                  <span>{otpError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isConfirmingOtp || isSendingOtp || otpCode.length !== 6}
                className="w-full py-3.5 bg-primary-container hover:bg-cta-hover text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg cursor-pointer"
              >
                {isConfirmingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Validando código OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {otpPurpose === 'REVOKE'
                        ? 'Confirmar Revocación (Art. 7.3)'
                        : otpPurpose === 'RECEIPT'
                          ? 'Validar y Descargar Resguardo PDF'
                          : 'Confirmar Código OTP y Completar Firma'}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => sendOtpForPurpose(otpPurpose)}
                  disabled={isSendingOtp || isConfirmingOtp}
                  className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-40"
                >
                  {isSendingOtp ? 'Enviando nuevo código...' : 'Reenviar código OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="text-tertiary hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL INFORMATIVO DE NORMATIVA OFICIAL                                     */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            ref={infoModalRef}
            className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold rounded">
                  JUNTA DE ANDALUCÍA · FAVB
                </span>
                <h3 id="info-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                  Normativa Oficial de Imágenes y Desplazamientos Deportivos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-tertiary hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar ventana normativa"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-on-surface/90 leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-primary">
                  1. Normativa sobre Tratamiento y Protección de Imágenes
                </h4>
                <p>
                  Regulado en la Ley Orgánica 1/1982 de protección civil del derecho al honor y a la propia imagen, el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD), la Ley Orgánica 8/2021 (LOPIVI) y el <em>Protocolo Marco de Actuación para la Protección de las Personas Menores frente a la Violencia en el Deporte</em> (Orden de 18 de noviembre de 2024 de la Consejería de Cultura y Deporte de la Junta de Andalucía, BOJA núm. 229). Queda prohibido cualquier uso comercial o cesión a patrocinadores.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-primary">
                  2. Régimen de Firma y Tramos de Edad (LOPDGDD · Protocolo Marco)
                </h4>
                <p>
                  • <strong>Menores de 18 años (&lt;14 y 14–17 años):</strong> Conforme a la Orden de 18 de noviembre de 2024 (BOJA núm. 229), el padre, madre o tutor/a legal formaliza con una única firma el consentimiento de desplazamientos oficiales y el tratamiento/difusión de imágenes de menores. Entre los 14 y 17 años se realiza informando previamente al/a la deportista y con su asentimiento, conservando el/la menor mayor de 14 años su derecho personal a oponerse o retirar el consentimiento de imagen en cualquier momento (Art. 7.1 LOPDGDD y Art. 3.1 LO 1/1982).<br />
                  • <strong>Mayores de edad (+18):</strong> Declaración y firma expresa directa del propio deportista.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-blue-300">
                  3. Normativa Oficial sobre Desplazamientos y Viajes Deportivos
                </h4>
                <p>
                  Regulado conforme a la <strong>Ley 5/2016, de 19 de julio, del Deporte de Andalucía</strong>, el Reglamento de la <strong>FAVB / AFADE</strong>, Campeonatos de Andalucía (CADEBA), los artículos 154–156 del Código Civil y el Real Decreto 443/2001 sobre condiciones de seguridad en el transporte colectivo de menores.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-primary">
                  4. Derecho de Revocación en Cualquier Momento (Art. 7.3 RGPD)
                </h4>
                <p>
                  Puedes retirar o modificar cualquier consentimiento en cualquier momento (sin efectos retroactivos) mediante el Paso 1 de este portal con código OTP o escribiendo a <strong>{CLUB_INFO.contactEmail}</strong>. Consulta también nuestra{' '}
                  <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-white">
                    Política de Privacidad
                  </Link>.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2.5 bg-primary-container hover:bg-cta-hover text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutorizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-background flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm text-tertiary">
            <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
            <span>Cargando portal de autorizaciones...</span>
          </div>
        </div>
      }
    >
      <AutorizacionesContent />
    </Suspense>
  );
}
