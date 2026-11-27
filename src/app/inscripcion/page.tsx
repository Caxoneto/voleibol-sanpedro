'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { evaluateMemberPassword } from '@/lib/intranet/catalog';
import {
  computeAgeInMadrid,
  formatDisplayDate,
  formatMadridDateString,
  parseBirthDateParts,
} from '@/lib/date-utils';
import { isStrictEmail, isValidSpanishDniOrNie } from '@/lib/validators';
import { SignaturePad } from '@/components/SignaturePad';

interface RegistrationLinkInfo {
  id: string;
  token: string;
  categoryCode: string;
  categoryLabel: string;
  defaultTeamSeasonId: string | null;
  seasonId: string;
}

interface AvailableCategoryOption {
  id: string;
  token: string;
  categoryCode: string;
  categoryLabel: string;
  defaultTeamSeasonId: string | null;
}

interface ChildFormDraft {
  id: string;
  linkToken: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'FEMENINO' | 'MASCULINO';
  playerDni: string;
  shirtSize: string;
  jerseyNumber: string;
  medicalAllergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  selectedPlanId: string;
  consentImage: boolean | null;
  consentTravel: boolean | null;
}

interface PaymentPlanOption {
  planId: string;
  productId: string;
  productName: string;
  productType: string;
  planName: string;
  periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
  totalAmount: number;
  installmentsCount: number;
  dueDay: number;
  description: string | null;
}

interface RegistrationReceipt {
  consentId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number;
  birthDate: string;
  isMinor: boolean;
  isMinor14To17: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone: string;
  signerEmail: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  signatureMethod: 'OTP_EMAIL';
  signatureData: string;
  documentHash: string;
  signedAt: string;
}

const SHIRT_SIZES = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL'];

function DecisionRadioGroup({
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
      className="p-4 border border-white/10 bg-surface-container-low space-y-3"
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
          className={`p-3 border text-left text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
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
          className={`p-3 border text-left text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
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

function getInstallmentsSummary(plan: PaymentPlanOption): string {
  if (plan.periodicity === 'ANNUAL' || plan.installmentsCount <= 1) {
    return 'Pago único anual';
  }
  const perInstallment = plan.totalAmount / Math.max(1, plan.installmentsCount);
  if (plan.periodicity === 'MONTHLY') {
    return `${plan.installmentsCount} cuotas mensuales (~${perInstallment.toFixed(2)} €/mes)`;
  }
  if (plan.periodicity === 'QUARTERLY') {
    return `${plan.installmentsCount} plazos trimestrales (~${perInstallment.toFixed(2)} €/plazo)`;
  }
  return `${plan.installmentsCount} plazos`;
}

function InscripcionContent() {
  const searchParams = useSearchParams();
  const catToken = searchParams.get('cat')?.trim() || '';

  const [loadingLink, setLoadingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<RegistrationLinkInfo | null>(null);
  const [availableCategories, setAvailableCategories] = useState<AvailableCategoryOption[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanOption[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const isFirstStepRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstStepRenderRef.current) {
      isFirstStepRenderRef.current = false;
      return;
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const resetTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetTop();
    const rafId = window.requestAnimationFrame(() => {
      resetTop();
      window.dispatchEvent(new Event('resize'));
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [step]);

  // Paso 1 · Bloque 1: Deportista 1 (o titular)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'FEMENINO' | 'MASCULINO'>('FEMENINO');
  const [playerDni, setPlayerDni] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [medicalAllergies, setMedicalAllergies] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Hijos/as adicionales (misma solicitud familiar bajo un único tutor)
  const [additionalChildren, setAdditionalChildren] = useState<ChildFormDraft[]>([]);

  // Paso 1 · Bloque 2: Tutor Legal (si <18)
  const [guardianRelationship, setGuardianRelationship] = useState<'MADRE' | 'PADRE' | 'TUTOR_LEGAL'>('MADRE');
  const [guardianName, setGuardianName] = useState('');
  const [guardianDni, setGuardianDni] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // Paso 1 · Bloque 3: Modalidad de Pago
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Paso 1 · Bloque 4: Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [validatingStep1, setValidatingStep1] = useState(false);
  const [matchedExistingRoster, setMatchedExistingRoster] = useState(false);

  // Paso 2 · RGPD y Firma OTP
  const [consentImage, setConsentImage] = useState<boolean | null>(null);
  const [consentTravel, setConsentTravel] = useState<boolean | null>(null);
  const [patriaPotestadAccepted, setPatriaPotestadAccepted] = useState(false);
  const [minorConsentAccepted, setMinorConsentAccepted] = useState(false);
  const [policySummaryAccepted, setPolicySummaryAccepted] = useState(false);
  const [conductCodeAccepted, setConductCodeAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [draftPlayerId, setDraftPlayerId] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRemainingSec, setOtpRemainingSec] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpWarning, setOtpWarning] = useState<string | null>(null);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Paso 3 · Confirmación y Resguardo PDF
  const [confirmedRequestId, setConfirmedRequestId] = useState('');
  const [confirmedReceipt, setConfirmedReceipt] = useState<RegistrationReceipt | null>(null);
  const [confirmedReceipts, setConfirmedReceipts] = useState<RegistrationReceipt[]>([]);
  const [confirmedRequestIds, setConfirmedRequestIds] = useState<string[]>([]);
  const [confirmedFamilyGroupId, setConfirmedFamilyGroupId] = useState<string | null>(null);
  const [receiptEmailSent, setReceiptEmailSent] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);

  useEffect(() => {
    if (!catToken) {
      setLinkError(
        'No se ha detectado ningún código de enlace de categoría en la dirección URL.'
      );
      setLoadingLink(false);
      return;
    }

    const controller = new AbortController();
    setLoadingLink(true);
    setLinkError(null);

    fetch(`/api/intranet/registration?token=${encodeURIComponent(catToken)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        return { ok: res.ok, json };
      })
      .then(({ ok, json }) => {
        if (!ok || !json?.success || !json?.link) {
          setLinkError(
            json?.error ||
              'Este enlace de inscripción no es válido, ha sido desactivado o ha caducado.'
          );
          return;
        }
        const primaryLink = json.link as RegistrationLinkInfo;
        setLinkInfo(primaryLink);
        const cats = Array.isArray(json.availableCategories) && json.availableCategories.length > 0
          ? (json.availableCategories as AvailableCategoryOption[])
          : [
              {
                id: primaryLink.id,
                token: primaryLink.token,
                categoryCode: primaryLink.categoryCode,
                categoryLabel: primaryLink.categoryLabel,
                defaultTeamSeasonId: primaryLink.defaultTeamSeasonId,
              },
            ];
        setAvailableCategories(cats);
        const plans = Array.isArray(json.paymentPlans)
          ? (json.paymentPlans as PaymentPlanOption[])
          : [];
        setPaymentPlans(plans);
        if (plans.length > 0) {
          setSelectedPlanId((prev) =>
            prev && plans.some((p) => p.planId === prev) ? prev : plans[0].planId
          );
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLinkError('No se pudo conectar con el servidor para validar el enlace de inscripción.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingLink(false);
        }
      });

    return () => controller.abort();
  }, [catToken]);

  const hasOtpCountdown = otpRemainingSec > 0;
  useEffect(() => {
    if (!hasOtpCountdown) return;
    const timer = setInterval(() => {
      setOtpRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasOtpCountdown]);

  const parsedBirth = useMemo(() => parseBirthDateParts(birthDate), [birthDate]);
  const ageEvaluation = useMemo(
    () =>
      parsedBirth
        ? computeAgeInMadrid(birthDate, parsedBirth.year)
        : { age: null, isMinor: false, isMinor14To17: false, isBoundaryUnverified: true },
    [parsedBirth, birthDate]
  );

  const selectedPlan = useMemo(
    () => paymentPlans.find((p) => p.planId === selectedPlanId) || null,
    [paymentPlans, selectedPlanId]
  );

  const passwordEval = useMemo(() => evaluateMemberPassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === passwordConfirm;

  const fullPlayerName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const isMinor = Boolean(parsedBirth && ageEvaluation.isMinor);
  const isMinor14To17 = Boolean(parsedBirth && ageEvaluation.isMinor14To17);
  const requiresPlayerDni = Boolean(
    parsedBirth && ageEvaluation.age !== null && ageEvaluation.age >= 14
  );

  const anyMinor14To17 = useMemo(() => {
    if (isMinor14To17) return true;
    return additionalChildren.some((c) => {
      const p = parseBirthDateParts(c.birthDate);
      if (!p) return false;
      return computeAgeInMadrid(c.birthDate, p.year).isMinor14To17;
    });
  }, [isMinor14To17, additionalChildren]);

  function addAdditionalChild() {
    const newDraft: ChildFormDraft = {
      id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      linkToken: linkInfo?.token || catToken,
      firstName: '',
      lastName: lastName.trim(),
      birthDate: '',
      gender: 'FEMENINO',
      playerDni: '',
      shirtSize: '',
      jerseyNumber: '',
      medicalAllergies: '',
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      selectedPlanId: selectedPlan?.planId || paymentPlans[0]?.planId || '',
      consentImage: null,
      consentTravel: null,
    };
    setAdditionalChildren((prev) => [...prev, newDraft]);
  }

  function updateAdditionalChild(id: string, patch: Partial<ChildFormDraft>) {
    setAdditionalChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeAdditionalChild(id: string) {
    setAdditionalChildren((prev) => prev.filter((c) => c.id !== id));
  }

  function buildStep1Payload(includeConsents = false) {
    const commonBase = {
      linkToken: linkInfo?.token || catToken,
      guardianRelationship: isMinor ? guardianRelationship : undefined,
      guardianName: isMinor ? guardianName.trim() : undefined,
      guardianDni: isMinor ? guardianDni.trim().toUpperCase() : undefined,
      guardianPhone: isMinor ? guardianPhone.trim() : undefined,
      email: email.trim().toLowerCase(),
      password,
    };

    if (additionalChildren.length === 0) {
      return {
        ...commonBase,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate.trim(),
        gender,
        playerDni: playerDni.trim().toUpperCase(),
        shirtSize: shirtSize || undefined,
        jerseyNumber: jerseyNumber.trim() ? Number(jerseyNumber.trim()) : undefined,
        medicalAllergies: medicalAllergies.trim() || undefined,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        selectedProductId: selectedPlan?.productId || '',
        selectedPricePlanId: selectedPlan?.planId || '',
      };
    }

    const child1 = {
      linkToken: linkInfo?.token || catToken,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
      gender,
      playerDni: playerDni.trim().toUpperCase(),
      shirtSize: shirtSize || undefined,
      jerseyNumber: jerseyNumber.trim() ? Number(jerseyNumber.trim()) : undefined,
      medicalAllergies: medicalAllergies.trim() || undefined,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      selectedProductId: selectedPlan?.productId || '',
      selectedPricePlanId: selectedPlan?.planId || '',
      ...(includeConsents ? { consentImage, consentTravel } : {}),
    };

    const extraMapped = additionalChildren.map((c) => {
      const cPlan = paymentPlans.find((p) => p.planId === c.selectedPlanId) || selectedPlan;
      return {
        linkToken: c.linkToken || linkInfo?.token || catToken,
        firstName: c.firstName.trim(),
        lastName: c.lastName.trim(),
        birthDate: c.birthDate.trim(),
        gender: c.gender,
        playerDni: c.playerDni.trim().toUpperCase(),
        shirtSize: c.shirtSize || undefined,
        jerseyNumber: c.jerseyNumber.trim() ? Number(c.jerseyNumber.trim()) : undefined,
        medicalAllergies: c.medicalAllergies.trim() || undefined,
        emergencyContactName: (c.emergencyContactName || emergencyContactName).trim(),
        emergencyContactPhone: (c.emergencyContactPhone || emergencyContactPhone).trim(),
        selectedProductId: cPlan?.productId || '',
        selectedPricePlanId: cPlan?.planId || '',
        ...(includeConsents ? { consentImage: c.consentImage, consentTravel: c.consentTravel } : {}),
      };
    });

    return {
      ...commonBase,
      firstName: child1.firstName,
      lastName: child1.lastName,
      birthDate: child1.birthDate,
      gender: child1.gender,
      playerDni: child1.playerDni,
      selectedProductId: child1.selectedProductId,
      selectedPricePlanId: child1.selectedPricePlanId,
      children: [child1, ...extraMapped],
    };
  }

  async function handleStep1Continue(e: React.FormEvent) {
    e.preventDefault();
    setStep1Error(null);

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setStep1Error('Introduce el nombre y apellidos completos del/de la deportista.');
      return;
    }

    if (!parsedBirth || ageEvaluation.age === null) {
      setStep1Error('Introduce una fecha de nacimiento válida.');
      return;
    }
    if (ageEvaluation.age < 4 || ageEvaluation.age > 95) {
      setStep1Error('La fecha de nacimiento está fuera del rango deportivo admitido.');
      return;
    }

    const cleanPlayerDni = playerDni.trim().toUpperCase().replace(/[\s-]/g, '');
    if (requiresPlayerDni && !isValidSpanishDniOrNie(cleanPlayerDni)) {
      setStep1Error(
        'A partir de los 14 años es obligatorio introducir un DNI, NIE o Pasaporte válido del/de la deportista.'
      );
      return;
    }
    if (!requiresPlayerDni && cleanPlayerDni && !isValidSpanishDniOrNie(cleanPlayerDni)) {
      setStep1Error('El documento de identidad introducido para el/la deportista no es válido.');
      return;
    }

    if (jerseyNumber.trim()) {
      const n = Number(jerseyNumber.trim());
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        setStep1Error('El dorsal preferido debe ser un número entero entre 1 y 99.');
        return;
      }
    }

    if (
      emergencyContactName.trim().length < 2 ||
      emergencyContactPhone.replace(/\D/g, '').length < 7
    ) {
      setStep1Error('Indica el nombre y un teléfono válido del contacto de emergencia.');
      return;
    }

    if (isMinor) {
      if (guardianName.trim().length < 3) {
        setStep1Error(
          'Al ser menor de edad, es obligatorio indicar el nombre y apellidos del padre, madre o tutor/a legal.'
        );
        return;
      }
      const cleanGuardianDni = guardianDni.trim().toUpperCase().replace(/[\s-]/g, '');
      if (!isValidSpanishDniOrNie(cleanGuardianDni)) {
        setStep1Error(
          'El DNI, NIE o Pasaporte del padre, madre o tutor/a legal no es válido.'
        );
        return;
      }
      if (cleanPlayerDni && cleanPlayerDni === cleanGuardianDni) {
        setStep1Error(
          'El documento del/de la deportista menor no puede coincidir con el DNI/NIE del padre, madre o tutor/a legal. Si es menor de 14 años y aún no tiene DNI propio, deja en blanco el documento del deportista.'
        );
        return;
      }
      if (guardianPhone.replace(/\D/g, '').length < 7) {
        setStep1Error('Introduce un teléfono móvil válido del padre, madre o tutor/a legal.');
        return;
      }
    }

    if (!selectedPlan) {
      setStep1Error('Selecciona una modalidad de pago para continuar.');
      return;
    }

    if (additionalChildren.length > 0) {
      if (!isMinor) {
        setStep1Error('Las solicitudes familiares multi-hijo solo están disponibles para deportistas menores de edad bajo un mismo tutor legal.');
        return;
      }
      const seenChildDnis = new Set<string>(cleanPlayerDni ? [cleanPlayerDni] : []);
      const cleanGuardianDniUpper = guardianDni.trim().toUpperCase().replace(/[\s-]/g, '');

      for (let idx = 0; idx < additionalChildren.length; idx += 1) {
        const c = additionalChildren[idx];
        const label = `Hijo/a #${idx + 2}`;
        if (c.firstName.trim().length < 2 || c.lastName.trim().length < 2) {
          setStep1Error(`Introduce el nombre y apellidos completos para ${label}.`);
          return;
        }
        const cBirth = parseBirthDateParts(c.birthDate);
        const cAgeEval = cBirth
          ? computeAgeInMadrid(c.birthDate, cBirth.year)
          : { age: null, isMinor: false, isMinor14To17: false, isBoundaryUnverified: true };
        if (!cBirth || cAgeEval.age === null || cAgeEval.age < 4 || cAgeEval.age > 95) {
          setStep1Error(`Introduce una fecha de nacimiento válida para ${label}.`);
          return;
        }
        if (!cAgeEval.isMinor) {
          setStep1Error(`${label} (${c.firstName.trim()}) es mayor de edad (+18) y debe tramitar su inscripción de forma individual.`);
          return;
        }
        const cDni = c.playerDni.trim().toUpperCase().replace(/[\s-]/g, '');
        if (cAgeEval.age >= 14 && !isValidSpanishDniOrNie(cDni)) {
          setStep1Error(`${label} tiene 14 años o más y requiere un DNI/NIE/Pasaporte propio válido.`);
          return;
        }
        if (cDni && !isValidSpanishDniOrNie(cDni)) {
          setStep1Error(`El documento introducido para ${label} no es válido.`);
          return;
        }
        if (cDni && cDni === cleanGuardianDniUpper) {
          setStep1Error(`El DNI de ${label} no puede coincidir con el del padre/madre o tutor legal.`);
          return;
        }
        if (cDni) {
          if (seenChildDnis.has(cDni)) {
            setStep1Error(`El documento ${cDni} está duplicado entre hermanos en esta solicitud.`);
            return;
          }
          seenChildDnis.add(cDni);
        }
        if (c.jerseyNumber.trim()) {
          const n = Number(c.jerseyNumber.trim());
          if (!Number.isInteger(n) || n < 1 || n > 99) {
            setStep1Error(`El dorsal de ${label} debe estar entre 1 y 99.`);
            return;
          }
        }
        const cEmName = (c.emergencyContactName || emergencyContactName).trim();
        const cEmPhone = (c.emergencyContactPhone || emergencyContactPhone).replace(/\D/g, '');
        if (cEmName.length < 2 || cEmPhone.length < 7) {
          setStep1Error(`Indica un contacto y teléfono de emergencia válidos para ${label}.`);
          return;
        }
        if (!paymentPlans.some((p) => p.planId === c.selectedPlanId)) {
          setStep1Error(`Selecciona una modalidad de pago para ${label}.`);
          return;
        }
      }
    }

    if (!isStrictEmail(email.trim())) {
      setStep1Error('Introduce un correo electrónico válido.');
      return;
    }

    if (!passwordEval.valid) {
      setStep1Error(passwordEval.error || 'La contraseña no cumple los requisitos de seguridad.');
      return;
    }

    if (password !== passwordConfirm) {
      setStep1Error('Las contraseñas introducidas no coinciden.');
      return;
    }

    setValidatingStep1(true);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_step1',
          ...buildStep1Payload(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setStep1Error(
          data?.error || 'No se pudieron validar tus datos en el servidor. Revísalos e inténtalo de nuevo.'
        );
        return;
      }
      setMatchedExistingRoster(Boolean(data.matchedExistingRoster));
    } catch {
      setStep1Error('Error de conexión al verificar los datos del formulario.');
      return;
    } finally {
      setValidatingStep1(false);
    }

    // Reiniciar estado de Paso 2 sin preselección
    setStep2Error(null);
    setOtpNotice(null);
    setOtpWarning(null);
    setOtpChallengeId('');
    setOtpCode('');
    setOtpRemainingSec(0);
    setConsentImage(null);
    setConsentTravel(null);
    setAdditionalChildren((prev) => prev.map((c) => ({ ...c, consentImage: null, consentTravel: null })));
    setPatriaPotestadAccepted(false);
    setMinorConsentAccepted(false);
    setPolicySummaryAccepted(false);
    setConductCodeAccepted(false);
    setSignatureData(null);
    setStep(2);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }

  async function handleSendOtp() {
    setStep2Error(null);
    setOtpNotice(null);
    setOtpWarning(null);
    setSendingOtp(true);

    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          ...buildStep1Payload(),
          ...(draftPlayerId ? { playerId: draftPlayerId } : {}),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setStep2Error(data?.error || 'No se pudo enviar el código de verificación OTP.');
        return;
      }

      setDraftPlayerId(String(data.playerId || ''));
      setOtpChallengeId(String(data.challengeId || ''));
      setOtpCode('');
      setOtpRemainingSec(900);

      if (data.emailSent) {
        setOtpNotice(
          `Código OTP de 6 dígitos enviado a ${email.trim().toLowerCase()} desde ${CLUB_INFO.contactEmail}.`
        );
      } else {
        setOtpWarning(
          data.emailError ||
            'El reto OTP fue generado, pero el servidor SMTP no pudo entregar el correo en este momento. Inténtalo de nuevo o contacta con Secretaría.'
        );
      }
    } catch {
      setStep2Error('Error de conexión al enviar el código OTP de verificación.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleCompleteRegistration(e: React.FormEvent) {
    e.preventDefault();
    setStep2Error(null);

    if (consentImage === null || consentTravel === null) {
      setStep2Error(
        `Debes seleccionar explícitamente "Autorizo" o "No autorizo" en Imágenes Deportivas y Desplazamientos Oficiales para ${fullPlayerName || 'el/la deportista principal'}.`
      );
      return;
    }

    for (let i = 0; i < additionalChildren.length; i += 1) {
      const ch = additionalChildren[i];
      if (ch.consentImage === null || ch.consentTravel === null) {
        setStep2Error(
          `Debes marcar "Autorizo" o "No autorizo" en Imágenes y Desplazamientos para ${ch.firstName.trim() || `Hijo/a #${i + 2}`}.`
        );
        return;
      }
    }

    if (isMinor && !patriaPotestadAccepted) {
      setStep2Error(
        'Debes marcar la declaración responsable de patria potestad o tutela legal del menor.'
      );
      return;
    }

    if (anyMinor14To17 && !minorConsentAccepted) {
      setStep2Error(
        'Para deportistas de 14 a 17 años debes confirmar que el/la menor ha sido informado/a y presta su asentimiento.'
      );
      return;
    }

    if (!policySummaryAccepted) {
      setStep2Error(
        'Debes confirmar la lectura de la información básica sobre protección de datos (Art. 13 RGPD).'
      );
      return;
    }

    if (!conductCodeAccepted) {
      setStep2Error(
        'Debes aceptar el Código de Conducta y Protección al Menor del Club.'
      );
      return;
    }

    if (!signatureData) {
      setStep2Error('Es obligatorio trazar tu firma manuscrita en el recuadro antes de finalizar.');
      return;
    }

    if (!otpChallengeId || !draftPlayerId) {
      setStep2Error(
        'Pulsa primero "Enviar código OTP de verificación" para confirmar tu correo electrónico.'
      );
      return;
    }

    if (otpCode.trim().length !== 6) {
      setStep2Error('Introduce el código OTP de 6 dígitos enviado a tu correo electrónico.');
      return;
    }

    setSubmittingFinal(true);
    try {
      const res = await fetch('/api/intranet/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_registration',
          ...buildStep1Payload(true),
          playerId: draftPlayerId,
          challengeId: otpChallengeId,
          otpCode: otpCode.trim(),
          consentImage,
          consentTravel,
          patriaPotestadAccepted: isMinor ? patriaPotestadAccepted : undefined,
          minorConsentAccepted: anyMinor14To17 ? minorConsentAccepted : undefined,
          policySummaryAccepted,
          conductCodeAccepted,
          signatureData,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.receipt) {
        setStep2Error(
          data?.error || 'No se pudo completar la inscripción. Revisa tus datos y el código OTP.'
        );
        return;
      }

      const primaryReceipt = data.receipt as RegistrationReceipt;
      const allReceipts =
        Array.isArray(data.receipts) && data.receipts.length > 0
          ? (data.receipts as RegistrationReceipt[])
          : [primaryReceipt];
      setConfirmedRequestId(String(data.requestId || ''));
      setConfirmedRequestIds(
        Array.isArray(data.requestIds) ? (data.requestIds as string[]) : [String(data.requestId || '')]
      );
      setConfirmedFamilyGroupId(typeof data.familyGroupId === 'string' ? data.familyGroupId : null);
      setConfirmedReceipt(primaryReceipt);
      setConfirmedReceipts(allReceipts);
      setReceiptEmailSent(Boolean(data.receiptEmailSent));
      setStep(3);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch {
      setStep2Error('Error de conexión con el servidor al finalizar la inscripción.');
    } finally {
      setSubmittingFinal(false);
    }
  }

  async function handleDownloadReceiptPdf(targetReceipt?: RegistrationReceipt) {
    const rec = targetReceipt || confirmedReceipt;
    if (!rec) return;
    setDownloadingPdf(true);
    try {
      const { generateConsentPdf } = await import('@/lib/pdf-consent');
      const doc = generateConsentPdf({
        consentId: rec.consentId,
        playerName: rec.playerName,
        teamName: rec.teamName,
        birthYear: rec.birthYear,
        birthDate: rec.birthDate,
        isMinor: rec.isMinor,
        isMinor14To17: rec.isMinor14To17,
        signerName: rec.signerName,
        signerDni: rec.signerDni,
        signerRelationship: rec.signerRelationship,
        signerPhone: rec.signerPhone,
        signerEmail: rec.signerEmail,
        consentImage: rec.consentSocialMedia,
        consentSocialMedia: rec.consentSocialMedia,
        consentStreaming: rec.consentStreaming,
        consentPress: rec.consentPress,
        consentTravel: rec.consentTravel,
        signatureMethod: rec.signatureMethod,
        signatureData: rec.signatureData,
        documentHash: rec.documentHash,
        signedAt: rec.signedAt,
      });
      const safeName =
        rec.playerName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'deportista';
      doc.save(`resguardo_inscripcion_${safeName}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loadingLink) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
        <div className="bg-surface-container border border-white/10 p-8 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
          <p className="font-headline text-base uppercase text-white">
            Validando enlace de inscripción
          </p>
          <p className="text-xs text-tertiary">Cargando categoría y modalidades de la temporada...</p>
        </div>
      </div>
    );
  }

  if (linkError || !linkInfo) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 overflow-x-clip">
        <div className="bg-surface-container border border-white/15 p-6 sm:p-8 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-label-sm uppercase tracking-widest font-bold">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{CLUB_INFO.name} · Inscripción por Categoría</span>
          </div>

          <h1 className="font-display-xl text-3xl sm:text-4xl uppercase tracking-wide text-white leading-none">
            Enlace de Inscripción Requerido
          </h1>

          <div
            role="alert"
            className="bg-error-container/40 border border-error/40 text-on-error-container p-4 text-xs sm:text-sm flex items-start gap-2.5 text-left"
          >
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
            <span>{linkError || 'El enlace de inscripción utilizado no es válido.'}</span>
          </div>

          <p className="text-sm text-tertiary leading-relaxed">
            Para darte de alta como deportista o familia necesitas acceder a través del{' '}
            <strong className="text-white">enlace oficial de tu categoría</strong> facilitado por el
            club en el grupo de tu equipo o por coordinación.
          </p>

          <p className="text-xs text-tertiary leading-relaxed">
            Si no dispones del enlace o ha caducado, ponte en contacto con Secretaría en{' '}
            <a
              href={`mailto:${CLUB_INFO.contactEmail}`}
              className="text-primary underline font-semibold hover:text-white"
            >
              {CLUB_INFO.contactEmail}
            </a>
            .
          </p>

          <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase text-white"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Volver a la web</span>
            </Link>
            <Link
              href="/acceso"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-container hover:bg-cta-hover text-xs font-bold uppercase text-white shadow-[3px_3px_0px_0px_#0e0e0e]"
            >
              <span>Ya tengo cuenta · Ir a Acceso</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 overflow-x-clip">
      {/* Cabecera */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-label-sm uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            {CLUB_INFO.name} · Temporada {linkInfo.seasonId.replace('-', '/')}
          </span>
        </div>
        <h1 className="font-display-xl text-3xl sm:text-5xl uppercase tracking-wide text-on-surface leading-none">
          Inscripción y Autorización Oficial
        </h1>
        <p className="text-xs sm:text-sm text-tertiary max-w-2xl">
          Completa tu alta, elige modalidad de cuota y firma con verificación OTP.
        </p>
      </div>

      {/* Barra compacta de categoría asignada por enlace */}
      <div className="bg-surface-container border-l-4 border-primary-container border-y border-r border-white/15 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Lock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-xs text-tertiary uppercase tracking-wider">Categoría asignada:</span>
          <strong className="font-headline text-sm sm:text-base font-bold text-white truncate">
            {linkInfo.categoryLabel}
          </strong>
        </div>
        <span className="text-[11px] font-mono text-tertiary">
          Temp. {linkInfo.seasonId.replace('-', '/')}
        </span>
      </div>

      {/* Progreso de pasos */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
        {[
          { num: 1, label: '1. Datos y Acceso', icon: User },
          { num: 2, label: '2. RGPD y Firma OTP', icon: FileCheck2 },
          { num: 3, label: '3. Resguardo PDF', icon: CheckCircle2 },
        ].map((item) => {
          const Icon = item.icon;
          const active = step === item.num;
          const done = step > item.num;
          return (
            <div
              key={item.num}
              className={`min-w-0 px-1.5 sm:px-2.5 py-2 sm:py-2.5 border flex items-center justify-center gap-1 sm:gap-1.5 font-bold uppercase text-[10px] sm:text-xs ${
                active
                  ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                  : done
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                  : 'bg-surface-container text-tertiary border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* PASO 1: DATOS PERSONALES, MODALIDAD Y CREDENCIALES                    */}
      {/* ===================================================================== */}
      {step === 1 && (
        <form onSubmit={handleStep1Continue} className="space-y-6">
          {/* BLOQUE 1: DATOS DEL JUGADOR / DEPORTISTA */}
          <section className="min-w-0 bg-surface-container border-2 border-sky-500/40 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="font-headline text-lg font-bold uppercase text-white">
                    1. Datos del Jugador / Deportista
                  </h2>
                  <p className="text-xs text-tertiary">
                    Datos identificativos y de emergencia del/de la deportista inscrito/a.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-sky-500/20 border border-sky-400/50 text-sky-200 text-[10px] font-bold uppercase tracking-wider">
                Deportista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-first-name" className="block text-xs font-bold text-on-surface mb-1.5">
                  Nombre <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Lucía"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="reg-last-name" className="block text-xs font-bold text-on-surface mb-1.5">
                  Apellidos <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. García Morales"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="reg-birth-date" className="block text-xs font-bold text-on-surface mb-1.5">
                  Fecha de nacimiento <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-birth-date"
                  type="date"
                  required
                  max={todayMadrid}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full max-w-full min-w-0 appearance-none block bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
                {parsedBirth && ageEvaluation.age !== null ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Edad actual: {ageEvaluation.age} años
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        ageEvaluation.isMinor
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                          : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                      }`}
                    >
                      {ageEvaluation.isMinor
                        ? ageEvaluation.isMinor14To17
                          ? 'Menor de edad (<18 · Tramo 14–17)'
                          : 'Menor de edad (<18)'
                        : 'Mayor de edad (+18)'}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-tertiary mt-1">
                    Al indicar la fecha de nacimiento se verificará si requiere datos del tutor legal.
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <label htmlFor="reg-gender" className="block text-xs font-bold text-on-surface mb-1.5">
                  Sexo / Categoría deportiva <span className="text-primary">*</span>
                </label>
                <select
                  id="reg-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'FEMENINO' | 'MASCULINO')}
                  className="w-full max-w-full min-w-0 bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                >
                  <option value="FEMENINO">Femenino</option>
                  <option value="MASCULINO">Masculino</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="reg-player-dni" className="block text-xs font-bold text-on-surface mb-1.5">
                  DNI / NIE / Pasaporte{' '}
                  {requiresPlayerDni ? (
                    <span className="text-primary">* (Obligatorio desde 14 años)</span>
                  ) : (
                    <span className="text-tertiary font-normal">(Opcional &lt;14 años)</span>
                  )}
                </label>
                <input
                  id="reg-player-dni"
                  type="text"
                  required={requiresPlayerDni}
                  value={playerDni}
                  onChange={(e) => setPlayerDni(e.target.value.toUpperCase())}
                  placeholder="12345678Z"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm font-mono uppercase text-white focus:border-primary-container focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="reg-shirt-size" className="block text-xs font-bold text-on-surface mb-1.5">
                  Talla camiseta
                </label>
                <select
                  id="reg-shirt-size"
                  value={shirtSize}
                  onChange={(e) => setShirtSize(e.target.value)}
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
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
                <label htmlFor="reg-jersey-number" className="block text-xs font-bold text-on-surface mb-1.5">
                  Dorsal preferido <span className="text-tertiary font-normal">(Opcional)</span>
                </label>
                <input
                  id="reg-jersey-number"
                  type="number"
                  min={1}
                  max={99}
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="Ej. 7"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-allergies" className="block text-xs font-bold text-on-surface mb-1.5">
                Alergias o datos médicos relevantes{' '}
                <span className="text-tertiary font-normal">(Opcional, cifrado en el club)</span>
              </label>
              <input
                id="reg-allergies"
                type="text"
                maxLength={500}
                value={medicalAllergies}
                onChange={(e) => setMedicalAllergies(e.target.value)}
                placeholder="Ej. Alergia a frutos secos, asma de esfuerzo..."
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <label htmlFor="reg-em-name" className="block text-xs font-bold text-on-surface mb-1.5">
                  Contacto de emergencia (Nombre completo) <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-em-name"
                  type="text"
                  required
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Ej. Carmen Morales"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="reg-em-phone" className="block text-xs font-bold text-on-surface mb-1.5">
                  Teléfono de emergencia <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-em-phone"
                  type="tel"
                  required
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="600 123 456"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* BLOQUE 2: PADRE, MADRE O TUTOR LEGAL (AUTOMÁTICO SI <18) */}
          {isMinor && (
            <section className="min-w-0 bg-amber-950/25 border-2 border-amber-400/70 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
              <div className="bg-amber-500/20 border border-amber-400/50 px-3.5 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm text-amber-100">
                <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>El/la deportista es menor de edad:</strong> es obligatorio cumplimentar los
                  datos del padre, madre o tutor legal.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
                  <h2 className="font-headline text-lg font-bold uppercase text-white">
                    2. Datos del Padre, Madre o Tutor Legal
                  </h2>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  Representante Legal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-guardian-rel" className="block text-xs font-bold text-on-surface mb-1.5">
                    Parentesco <span className="text-primary">*</span>
                  </label>
                  <select
                    id="reg-guardian-rel"
                    value={guardianRelationship}
                    onChange={(e) =>
                      setGuardianRelationship(e.target.value as 'MADRE' | 'PADRE' | 'TUTOR_LEGAL')
                    }
                    className="w-full bg-surface-container-low border border-amber-400/40 px-3 py-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                  >
                    <option value="MADRE">Madre</option>
                    <option value="PADRE">Padre</option>
                    <option value="TUTOR_LEGAL">Tutor/a Legal</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-guardian-name" className="block text-xs font-bold text-on-surface mb-1.5">
                    Nombre y Apellidos completos del tutor <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-guardian-name"
                    type="text"
                    required={isMinor}
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Ej. María Morales Ruiz"
                    className="w-full bg-surface-container-low border border-amber-400/40 px-3 py-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-guardian-dni" className="block text-xs font-bold text-on-surface mb-1.5">
                    DNI / NIE / Pasaporte del tutor <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-guardian-dni"
                    type="text"
                    required={isMinor}
                    value={guardianDni}
                    onChange={(e) => setGuardianDni(e.target.value.toUpperCase())}
                    placeholder="12345678Z"
                    className="w-full bg-surface-container-low border border-amber-400/40 px-3 py-2.5 text-sm font-mono uppercase text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="reg-guardian-phone" className="block text-xs font-bold text-on-surface mb-1.5">
                    Teléfono móvil del tutor <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-guardian-phone"
                    type="tel"
                    required={isMinor}
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full bg-surface-container-low border border-amber-400/40 px-3 py-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>
            </section>
          )}

          {/* BLOQUE 3: MODALIDAD DE PAGO */}
          <section className="min-w-0 bg-surface-container border border-white/15 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <CreditCard className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-headline text-lg font-bold uppercase text-white">
                  {isMinor
                    ? `3. Modalidad de Pago${additionalChildren.length > 0 ? ` · ${fullPlayerName || 'Hijo/a 1'}` : ''}`
                    : '2. Modalidad de Pago'}
                </h2>
                <p className="text-xs text-tertiary">
                  Elige cómo deseas fraccionar o abonar la cuota de la temporada. La emisión de
                  recibos se activará tras la validación administrativa.
                </p>
              </div>
            </div>

            {paymentPlans.length === 0 ? (
              <div className="bg-error-container/30 border border-error/40 p-4 text-xs text-error">
                No hay modalidades de pago configuradas en este momento para la temporada.
              </div>
            ) : (
              <div role="radiogroup" aria-label="Modalidad de pago" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {paymentPlans.map((plan) => {
                  const selected = selectedPlanId === plan.planId;
                  return (
                    <button
                      key={plan.planId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedPlanId(plan.planId)}
                      className={`p-4 border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                        selected
                          ? 'bg-primary-container/20 border-primary-container shadow-[3px_3px_0px_0px_#d90429]'
                          : 'bg-surface-container-low border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            {plan.productName}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? 'border-primary-container bg-primary-container' : 'border-white/40'
                            }`}
                          >
                            {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="font-headline text-base font-bold uppercase text-white">
                          {plan.planName}
                        </p>
                        <p className="text-xs text-tertiary leading-snug">
                          {getInstallmentsSummary(plan)}
                        </p>
                        {plan.description && (
                          <p className="text-[11px] text-tertiary/80 leading-relaxed pt-1">
                            {plan.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                        <span className="text-[10px] uppercase font-bold text-tertiary">
                          Importe total
                        </span>
                        <span className="font-headline text-xl font-bold text-white">
                          {plan.totalAmount.toFixed(2)} €
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* BLOQUE FAMILIAR OPCIONAL: AÑADIR MÁS HIJOS/AS (SOLO MENORES) */}
          {isMinor && (
            <section className="min-w-0 bg-surface-container border border-white/15 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <h2 className="font-headline text-lg font-bold uppercase text-white">
                      Inscripción Familiar · Añadir más hijos/as (hermanos/as)
                    </h2>
                    <p className="text-xs text-tertiary">
                      Si inscribes a más de un hijo/a menor bajo el mismo tutor, añádelos aquí para crear una única solicitud familiar y gestionarlos con un solo usuario.
                    </p>
                  </div>
                </div>
                {additionalChildren.length < 5 && (
                  <button
                    type="button"
                    onClick={addAdditionalChild}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Añadir otro/a hijo/a</span>
                  </button>
                )}
              </div>

              {additionalChildren.length === 0 ? (
                <p className="text-xs text-tertiary">
                  Actualmente estás tramitando la inscripción de 1 menor. Pulsa <strong>“Añadir otro/a hijo/a”</strong> si deseas incluir hermanos/as en esta misma solicitud.
                </p>
              ) : (
                <div className="space-y-4">
                  {additionalChildren.map((child, idx) => {
                    const childNum = idx + 2;
                    const cBirth = parseBirthDateParts(child.birthDate);
                    const cAgeEval = cBirth
                      ? computeAgeInMadrid(child.birthDate, cBirth.year)
                      : { age: null, isMinor: false, isMinor14To17: false, isBoundaryUnverified: true };
                    const cRequiresDni = Boolean(cBirth && cAgeEval.age !== null && cAgeEval.age >= 14);
                    return (
                      <div
                        key={child.id}
                        className="min-w-0 bg-surface-container-low border border-white/15 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-primary-container/25 border border-primary-container/50 text-primary text-[11px] font-bold uppercase">
                              Hijo/a #{childNum}
                            </span>
                            {cAgeEval.age !== null && (
                              <span className="text-xs text-tertiary">({cAgeEval.age} años)</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalChild(child.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-[11px] font-bold uppercase cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Quitar</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0 sm:col-span-2">
                            <label htmlFor={`child-cat-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Categoría de inscripción <span className="text-primary">*</span>
                            </label>
                            <select
                              id={`child-cat-${child.id}`}
                              value={child.linkToken}
                              onChange={(e) => updateAdditionalChild(child.id, { linkToken: e.target.value })}
                              className="w-full max-w-full min-w-0 bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            >
                              {availableCategories.map((cat) => (
                                <option key={cat.token} value={cat.token}>
                                  {cat.categoryLabel}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`child-fn-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Nombre <span className="text-primary">*</span>
                            </label>
                            <input
                              id={`child-fn-${child.id}`}
                              type="text"
                              required
                              value={child.firstName}
                              onChange={(e) => updateAdditionalChild(child.id, { firstName: e.target.value })}
                              placeholder="Nombre del menor"
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor={`child-ln-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Apellidos <span className="text-primary">*</span>
                            </label>
                            <input
                              id={`child-ln-${child.id}`}
                              type="text"
                              required
                              value={child.lastName}
                              onChange={(e) => updateAdditionalChild(child.id, { lastName: e.target.value })}
                              placeholder="Apellidos completos"
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            />
                          </div>

                          <div className="min-w-0">
                            <label htmlFor={`child-birth-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Fecha de nacimiento <span className="text-primary">*</span>
                            </label>
                            <input
                              id={`child-birth-${child.id}`}
                              type="date"
                              required
                              max={todayMadrid}
                              value={child.birthDate}
                              onChange={(e) => updateAdditionalChild(child.id, { birthDate: e.target.value })}
                              className="w-full max-w-full min-w-0 appearance-none block bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            />
                          </div>

                          <div className="min-w-0">
                            <label htmlFor={`child-gender-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Sexo <span className="text-primary">*</span>
                            </label>
                            <select
                              id={`child-gender-${child.id}`}
                              value={child.gender}
                              onChange={(e) =>
                                updateAdditionalChild(child.id, {
                                  gender: e.target.value as 'FEMENINO' | 'MASCULINO',
                                })
                              }
                              className="w-full max-w-full min-w-0 bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            >
                              <option value="FEMENINO">Femenino</option>
                              <option value="MASCULINO">Masculino</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`child-dni-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              DNI / NIE / Pasaporte{' '}
                              {cRequiresDni ? (
                                <span className="text-primary">* (Oblig. &ge; 14 años)</span>
                              ) : (
                                <span className="text-tertiary font-normal">(Opcional si &lt; 14)</span>
                              )}
                            </label>
                            <input
                              id={`child-dni-${child.id}`}
                              type="text"
                              value={child.playerDni}
                              onChange={(e) =>
                                updateAdditionalChild(child.id, { playerDni: e.target.value.toUpperCase() })
                              }
                              placeholder="Ej. 12345678Z"
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm font-mono uppercase text-white focus:border-primary-container focus:outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor={`child-shirt-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Talla de equipación
                            </label>
                            <select
                              id={`child-shirt-${child.id}`}
                              value={child.shirtSize}
                              onChange={(e) => updateAdditionalChild(child.id, { shirtSize: e.target.value })}
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            >
                              <option value="">Sin especificar</option>
                              {SHIRT_SIZES.map((s) => (
                                <option key={s} value={s}>
                                  Talla {s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`child-plan-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Modalidad de Pago para Hijo/a #{childNum} <span className="text-primary">*</span>
                            </label>
                            <select
                              id={`child-plan-${child.id}`}
                              value={child.selectedPlanId}
                              onChange={(e) => updateAdditionalChild(child.id, { selectedPlanId: e.target.value })}
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            >
                              {paymentPlans.map((pl) => (
                                <option key={pl.planId} value={pl.planId}>
                                  {pl.planName} ({pl.totalAmount.toFixed(2)} €)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`child-dorsal-${child.id}`} className="block text-xs font-bold text-on-surface mb-1">
                              Dorsal preferido (opcional)
                            </label>
                            <input
                              id={`child-dorsal-${child.id}`}
                              type="number"
                              min={1}
                              max={99}
                              value={child.jerseyNumber}
                              onChange={(e) => updateAdditionalChild(child.id, { jerseyNumber: e.target.value })}
                              placeholder="1-99"
                              className="w-full bg-surface-container border border-white/15 px-3 py-2 text-sm text-white focus:border-primary-container focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* BLOQUE 4: CREDENCIALES DE ACCESO AL CLUB */}
          <section className="min-w-0 bg-surface-container border border-white/15 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <KeyRound className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-headline text-lg font-bold uppercase text-white">
                  {isMinor ? '4. Credenciales de Acceso al Club' : '3. Credenciales de Acceso al Club'}
                </h2>
                <p className="text-xs text-tertiary">
                  Será tu usuario de entrada a <strong className="text-white">/mi-club</strong> y la
                  dirección donde recibirás el código de verificación OTP para firmar.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-bold text-on-surface mb-1.5">
                Correo electrónico <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-tertiary absolute left-3 top-3" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="familia@ejemplo.es"
                  className="w-full bg-surface-container-low border border-white/15 pl-9 pr-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-tertiary mt-1">
                Si ya tienes cuenta de tutor/a en el club porque inscribiste a otro/a hijo/a, usa
                el mismo correo e introduce tu contraseña actual exacta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-on-surface mb-1.5">
                  Contraseña <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 10 caracteres seguros"
                    className="w-full bg-surface-container-low border border-white/15 pl-3 pr-10 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-password-confirm" className="block text-xs font-bold text-on-surface mb-1.5">
                  Confirmar contraseña <span className="text-primary">*</span>
                </label>
                <input
                  id="reg-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2.5 text-sm text-white focus:border-primary-container focus:outline-none"
                />
              </div>
            </div>

            {/* Indicadores en tiempo real */}
            <div className="bg-surface-container-low border border-white/10 p-3.5 space-y-1.5">
              <p className="text-[11px] font-bold uppercase text-tertiary mb-1">
                Requisitos de seguridad de la contraseña:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { ok: passwordEval.minLengthOk, label: 'Mínimo 10 caracteres' },
                  { ok: passwordEval.hasUppercase, label: 'Al menos 1 mayúscula' },
                  { ok: passwordEval.hasNumber, label: 'Al menos 1 número' },
                ].map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border ${
                      req.ok
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-surface-container border-white/10 text-tertiary'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        req.ok ? 'text-emerald-400' : 'text-white/25'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
              {passwordConfirm.length > 0 && (
                <p
                  className={`text-xs pt-1 ${
                    passwordsMatch ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {passwordsMatch
                    ? '✓ Las contraseñas coinciden.'
                    : '✕ Las contraseñas aún no coinciden.'}
                </p>
              )}
            </div>
          </section>

          {step1Error && (
            <div
              role="alert"
              className="bg-error-container/50 border border-error/50 text-on-error-container px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
              <span>{step1Error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={paymentPlans.length === 0 || validatingStep1}
            className="w-full py-3.5 px-5 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-40"
          >
            {validatingStep1 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Verificando datos...</span>
              </>
            ) : (
              <>
                <span>Continuar a Autorizaciones y Firma</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ===================================================================== */}
      {/* PASO 2: DOCUMENTO PRE-RELLENADO, RGPD Y FIRMA ELECTRÓNICA OTP         */}
      {/* ===================================================================== */}
      {step === 2 && (
        <form
          onSubmit={handleCompleteRegistration}
          className="min-w-0 bg-surface-container border border-white/15 p-4 sm:p-7 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep2Error(null);
                  setStep(1);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Volver a editar datos personales</span>
              </button>
              <h2 className="font-headline text-xl font-bold uppercase text-white">
                Paso 2 · Autorizaciones Oficiales y Firma Electrónica OTP
              </h2>
              <p className="text-xs text-tertiary mt-0.5">
                Documento pre-rellenado conforme al Protocolo Marco Junta de Andalucía, RGPD y LO 1/1982.
              </p>
            </div>
          </div>

          {matchedExistingRoster && (
            <div
              role="status"
              className="bg-emerald-950/40 border border-emerald-500/45 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Ficha deportiva identificada en el club: al validar tu correo con el código OTP y
                revisarse la solicitud, tu usuario quedará vinculado automáticamente a tu ficha
                actual sin crear duplicados.
              </span>
            </div>
          )}

          {/* Resumen plegable de datos introducidos en Paso 1 */}
          <details className="group bg-surface-container-lowest border border-white/15 text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="font-bold uppercase tracking-wider text-primary text-[11px]">
                  Revisar datos personales introducidos en el Paso 1
                </span>
                <span className="text-tertiary truncate">
                  {additionalChildren.length > 0
                    ? `Solicitud familiar (${1 + additionalChildren.length} hijos/as)`
                    : `${fullPlayerName} · ${linkInfo.categoryLabel}`}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 p-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-tertiary">
                  {additionalChildren.length > 0 ? 'Deportistas incluidos en la solicitud' : 'Deportista Inscrito/a'}
                </p>
                <p className="text-sm font-bold text-white">{fullPlayerName}</p>
                <p className="text-tertiary">
                  {linkInfo.categoryLabel} · {formatDisplayDate(birthDate)} ({ageEvaluation.age} años)
                </p>
                {additionalChildren.map((ch, idx) => {
                  const catLabel =
                    availableCategories.find((c) => c.token === ch.linkToken)?.categoryLabel ||
                    linkInfo.categoryLabel;
                  const chPlan = paymentPlans.find((p) => p.planId === ch.selectedPlanId);
                  return (
                    <div key={ch.id} className="pt-1.5 mt-1.5 border-t border-white/10">
                      <p className="text-sm font-bold text-white">
                        #{idx + 2}: {ch.firstName.trim()} {ch.lastName.trim()}
                      </p>
                      <p className="text-tertiary">
                        {catLabel} · {formatDisplayDate(ch.birthDate)}
                        {chPlan ? ` · ${chPlan.planName}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-tertiary">
                  Persona Firmante / Responsable Legal
                </p>
                <p className="text-sm font-bold text-white">
                  {isMinor ? guardianName : fullPlayerName}
                </p>
                <p className="text-tertiary">
                  Relación:{' '}
                  <strong className="text-on-surface">
                    {isMinor ? guardianRelationship : 'PROPIO_JUGADOR'}
                  </strong>{' '}
                  · DNI/NIE:{' '}
                  <span className="font-mono text-on-surface">
                    {isMinor ? guardianDni : playerDni}
                  </span>
                </p>
                <p className="text-tertiary truncate">
                  Email OTP: <strong className="text-on-surface">{email.trim().toLowerCase()}</strong>
                  {selectedPlan ? ` · Cuota: ${selectedPlan.planName}` : ''}
                </p>
              </div>
            </div>
          </details>

          {/* 2 Decisiones binarias independientes sin preselección */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Decisiones Expresas e Independientes (sin preselección) <span className="text-primary">*</span>
            </h3>

            {additionalChildren.length > 0 && (
              <div className="px-3 py-2 bg-primary-container/15 border border-primary-container/40 text-xs font-bold uppercase text-white">
                Autorizaciones RGPD para Hijo/a #1: {fullPlayerName} ({linkInfo.categoryLabel})
              </div>
            )}

            <DecisionRadioGroup
              idPrefix="reg-consent-image"
              title="1. Tratamiento y Difusión de Imágenes Deportivas"
              description="Fotos y vídeos deportivos sin fines comerciales en web oficial, redes sociales del club y prensa (Orden 18/11/2024). Denegarla no impide competir."
              icon={<Camera className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
              allowLabel="Autorizo el tratamiento y difusión de imágenes deportivas"
              denyLabel="No autorizo el tratamiento ni difusión de imágenes"
              value={consentImage}
              onChange={setConsentImage}
            />

            <DecisionRadioGroup
              idPrefix="reg-consent-travel"
              title="2. Desplazamientos y Viajes Deportivos Oficiales"
              description="Traslado en autobuses o vehículos oficiales del club a partidos FAVB/AFADE, CADEBA y torneos bajo supervisión técnica acreditada."
              icon={<Bus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
              allowLabel="Autorizo los desplazamientos y viajes deportivos oficiales"
              denyLabel="No autorizo los desplazamientos deportivos"
              value={consentTravel}
              onChange={setConsentTravel}
            />

            {additionalChildren.map((child, idx) => {
              const catLabel =
                availableCategories.find((c) => c.token === child.linkToken)?.categoryLabel ||
                linkInfo.categoryLabel;
              return (
                <div key={child.id} className="space-y-3 pt-4 border-t border-white/10">
                  <div className="px-3 py-2 bg-primary-container/15 border border-primary-container/40 text-xs font-bold uppercase text-white">
                    Autorizaciones RGPD para Hijo/a #{idx + 2}: {child.firstName.trim()} {child.lastName.trim()} ({catLabel})
                  </div>

                  <DecisionRadioGroup
                    idPrefix={`reg-consent-image-${child.id}`}
                    title="1. Tratamiento y Difusión de Imágenes Deportivas"
                    description="Fotos y vídeos deportivos sin fines comerciales en web oficial, redes sociales del club y prensa."
                    icon={<Camera className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
                    allowLabel="Autorizo el tratamiento y difusión de imágenes deportivas"
                    denyLabel="No autorizo el tratamiento ni difusión de imágenes"
                    value={child.consentImage}
                    onChange={(val) => updateAdditionalChild(child.id, { consentImage: val })}
                  />

                  <DecisionRadioGroup
                    idPrefix={`reg-consent-travel-${child.id}`}
                    title="2. Desplazamientos y Viajes Deportivos Oficiales"
                    description="Traslado en autobuses o vehículos oficiales del club a partidos FAVB/AFADE, CADEBA y torneos."
                    icon={<Bus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
                    allowLabel="Autorizo los desplazamientos y viajes deportivos oficiales"
                    denyLabel="No autorizo los desplazamientos deportivos"
                    value={child.consentTravel}
                    onChange={(val) => updateAdditionalChild(child.id, { consentTravel: val })}
                  />
                </div>
              );
            })}
          </div>

          {/* 1ª Capa RGPD Art. 13 plegable */}
          <details className="group bg-surface-container-low border border-white/10 text-[11px] text-tertiary">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-primary font-bold uppercase tracking-wider hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Ver información básica sobre Protección de Datos - Art. 13 RGPD</span>
              </span>
              <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="border-t border-white/10 p-4 leading-relaxed">
              <strong className="text-white">Responsable:</strong> {CLUB_INFO.federationRegisteredName}{' '}
              ({CLUB_INFO.name}) · CIF {CLUB_INFO.cif} · {CLUB_INFO.officialAddress} ·{' '}
              {CLUB_INFO.contactEmail}.{' '}
              <strong className="text-white">Finalidad:</strong> Gestión de inscripción, licencia
              federativa y comunicaciones del club (Art. 6.1.b/c RGPD), y decisiones voluntarias de
              imagen y desplazamientos (Art. 6.1.a RGPD).{' '}
              <strong className="text-white">Derechos:</strong> Acceso, rectificación, supresión,
              limitación, portabilidad, oposición y revocación en cualquier momento en{' '}
              {CLUB_INFO.contactEmail} o ante la AEPD.
            </p>
          </details>

          {/* Declaraciones obligatorias */}
          <div className="space-y-3 text-xs text-on-surface">
            {isMinor && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patriaPotestadAccepted}
                  onChange={(e) => setPatriaPotestadAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                />
                <span>
                  Declaro bajo mi exclusiva responsabilidad ostentar la patria potestad o tutela
                  legal del/de la menor (Arts. 154–156 del Código Civil), actuando con conformidad
                  del otro progenitor en su caso. <span className="text-primary">*</span>
                </span>
              </label>
            )}

            {anyMinor14To17 && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={minorConsentAccepted}
                  onChange={(e) => setMinorConsentAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                />
                <span>
                  Confirmo que el/la deportista (14 a 17 años) ha sido informado/a del contenido de
                  esta autorización y presta su conocimiento y asentimiento (Art. 3.1 LO 1/1982),
                  constando su derecho personal a oponerse o revocar en cualquier momento.{' '}
                  <span className="text-primary">*</span>
                </span>
              </label>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={policySummaryAccepted}
                onChange={(e) => setPolicySummaryAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
              />
              <span>
                He leído y acepto la información básica sobre protección de datos (Art. 13 RGPD) y
                la{' '}
                <Link
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-white font-semibold"
                >
                  Política de Privacidad
                </Link>
                . <span className="text-primary">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={conductCodeAccepted}
                onChange={(e) => setConductCodeAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
              />
              <span>
                He leído y acepto el{' '}
                <Link
                  href="/proteccion-menor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline hover:text-white font-semibold"
                >
                  <span>Código de Conducta y Protocolo de Protección al Menor del Club</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
                . <span className="text-primary">*</span>
              </span>
            </label>
          </div>

          {/* Firma Manuscrita */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Firma Manuscrita Única ({isMinor ? 'Padre, Madre o Tutor/a Legal' : 'Deportista +18'}){' '}
              <span className="text-primary">*</span>
            </p>
            <SignaturePad
              compact
              onSignatureChange={setSignatureData}
              hintLabel={`✕ Firma de ${isMinor ? guardianName || 'Representante Legal' : fullPlayerName}`}
            />
          </div>

          {/* Verificación OTP Email */}
          <div className="bg-surface-container-low border border-primary-container/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline text-base font-bold uppercase text-white">
                  Verificación por Código OTP de 6 Dígitos
                </h3>
                <p className="text-xs text-tertiary">
                  Para validar tu firma electrónica y crear tu usuario, solicita el código en{' '}
                  <strong className="text-white">{email.trim().toLowerCase()}</strong>.
                </p>
              </div>

              <button
                type="button"
                disabled={sendingOtp || submittingFinal}
                onClick={handleSendOtp}
                className="w-full sm:w-auto max-w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright border border-primary-container/60 text-xs font-bold uppercase text-white cursor-pointer disabled:opacity-50 sm:shrink-0"
              >
                {sendingOtp ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                ) : (
                  <Mail className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 whitespace-normal break-words text-center leading-snug">
                  {otpChallengeId
                    ? 'Reenviar código OTP'
                    : `Enviar código OTP de verificación a ${email.trim().toLowerCase()}`}
                </span>
              </button>
            </div>

            {otpNotice && (
              <div
                role="status"
                className="bg-emerald-950/50 border border-emerald-500/40 p-3 text-xs text-emerald-200 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{otpNotice}</span>
              </div>
            )}

            {otpWarning && (
              <div
                role="alert"
                className="bg-amber-950/50 border border-amber-500/40 p-3 text-xs text-amber-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{otpWarning}</span>
              </div>
            )}

            {otpChallengeId && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                  <span>Validez del código OTP:</span>
                  {otpRemainingSec > 0 ? (
                    <strong className="text-emerald-400 font-mono">
                      {Math.floor(otpRemainingSec / 60)}:
                      {String(otpRemainingSec % 60).padStart(2, '0')} min
                    </strong>
                  ) : (
                    <strong className="text-rose-400 font-mono">0:00 · Caducado</strong>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-otp-input"
                    className="block text-xs font-bold uppercase text-white mb-1.5"
                  >
                    Introduce el código OTP de 6 dígitos <span className="text-primary">*</span>
                  </label>
                  <input
                    id="reg-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full sm:max-w-xs bg-surface-container border-2 border-primary/60 focus:border-primary px-4 py-3 text-xl font-mono font-bold tracking-[0.35em] text-center text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {step2Error && (
            <div
              role="alert"
              className="bg-error-container/50 border border-error/50 text-on-error-container px-4 py-3 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
              <span>{step2Error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submittingFinal || !otpChallengeId || otpCode.trim().length !== 6}
            className="w-full py-3.5 px-5 bg-primary-container hover:bg-cta-hover text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-45"
          >
            {submittingFinal ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Verificando OTP y registrando solicitud...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Verificar OTP y Finalizar Inscripción</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ===================================================================== */}
      {/* PASO 3: SOLICITUD REGISTRADA Y RESGUARDO PDF                          */}
      {/* ===================================================================== */}
      {step === 3 && confirmedReceipt && (
        <section className="min-w-0 bg-surface-container border-2 border-emerald-500/50 p-4 sm:p-8 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-6">
          <div className="flex items-start gap-3 border-b border-white/10 pb-4">
            <div className="w-11 h-11 bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                {confirmedReceipts.length > 1
                  ? `Solicitud Familiar (${confirmedReceipts.length} hijos/as) Registrada`
                  : 'Solicitud y Autorización Registradas'}
              </span>
              <h2 className="font-headline text-2xl font-bold uppercase text-white mt-0.5">
                {confirmedReceipts.length > 1
                  ? '¡Solicitud Familiar Enviada Correctamente!'
                  : '¡Inscripción Enviada Correctamente!'}
              </h2>
              <p className="text-xs sm:text-sm text-tertiary mt-1 leading-relaxed">
                Tu usuario único de acceso (<strong className="text-white">{confirmedReceipt.signerEmail}</strong>) ha sido registrado y{' '}
                {confirmedReceipts.length > 1 ? (
                  <>
                    las solicitudes de{' '}
                    <strong className="text-white">
                      {confirmedReceipts.map((r) => r.playerName).join(', ')}
                    </strong>{' '}
                    quedan
                  </>
                ) : (
                  <>
                    la solicitud de <strong className="text-white">{confirmedReceipt.playerName}</strong> queda
                  </>
                )}{' '}
                <strong className="text-amber-300">
                  pendientes de validación y asignación de equipo por la administración del club
                </strong>
                .
              </p>
            </div>
          </div>

          <div className="bg-amber-950/35 border border-amber-500/40 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-100">
            <Clock className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-bold uppercase text-amber-200">
                Seguimiento en directo desde /mi-club
              </p>
              <p className="leading-relaxed">
                Ya puedes entrar en <strong>/acceso</strong> con tu correo y contraseña para ver el estado
                de revisión de cada hijo/a en tiempo real. Recibirás además un correo electrónico por cada resolución del club.
              </p>
            </div>
          </div>

          {confirmedFamilyGroupId && (
            <div className="text-xs bg-surface-container-low border border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span className="text-tertiary uppercase font-bold text-[10px]">
                Referencia de Solicitud Familiar Agrupada
              </span>
              <code className="text-primary font-bold min-w-0 break-all">{confirmedFamilyGroupId}</code>
            </div>
          )}

          <div className="space-y-3">
            {confirmedReceipts.map((rec, idx) => (
              <div
                key={rec.consentId || `${rec.playerId}-${idx}`}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs bg-surface-container-low border border-white/10 p-4 items-center min-w-0"
              >
                <div className="min-w-0">
                  <span className="text-tertiary block text-[10px] uppercase font-bold">
                    Deportista #{idx + 1}
                  </span>
                  <strong className="text-white break-words">{rec.playerName}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-tertiary block text-[10px] uppercase font-bold">
                    Categoría / Solicitud
                  </span>
                  <strong className="text-white">{rec.teamName}</strong>
                  <span className="block text-[10px] font-mono text-tertiary break-all">
                    {confirmedRequestIds[idx] || confirmedRequestId || rec.consentId}
                  </span>
                </div>
                <div>
                  <span className="text-tertiary block text-[10px] uppercase font-bold">
                    1. Imágenes
                  </span>
                  <strong className={rec.consentSocialMedia ? 'text-emerald-300' : 'text-rose-300'}>
                    {rec.consentSocialMedia ? 'Autorizado' : 'No autorizado'}
                  </strong>
                </div>
                <div>
                  <span className="text-tertiary block text-[10px] uppercase font-bold">
                    2. Desplazamientos
                  </span>
                  <strong className={rec.consentTravel ? 'text-emerald-300' : 'text-rose-300'}>
                    {rec.consentTravel ? 'Autorizado' : 'No autorizado'}
                  </strong>
                </div>
                <div className="flex justify-start lg:justify-end">
                  <button
                    type="button"
                    disabled={downloadingPdf}
                    onClick={() => handleDownloadReceiptPdf(rec)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {receiptEmailSent ? (
            <div className="bg-emerald-950/40 border border-emerald-500/35 p-3.5 text-xs text-emerald-200">
              ✓ Hemos enviado el acuse oficial con {confirmedReceipts.length > 1 ? `los ${confirmedReceipts.length} resguardos en PDF` : 'el resguardo en PDF'} a{' '}
              <strong>{confirmedReceipt.signerEmail}</strong>.
            </div>
          ) : (
            <div className="bg-surface-container-low border border-white/15 p-3.5 text-xs text-tertiary">
              Descarga y conserva el resguardo oficial en PDF desde los botones superiores o inferiores como
              justificante de tu firma electrónica y solicitud.
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={downloadingPdf}
              onClick={() => handleDownloadReceiptPdf(confirmedReceipt)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Descargar Resguardo Oficial en PDF (1 página)</span>
            </button>

            <Link
              href="/acceso"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider"
            >
              <span>Ir a Acceso (/acceso)</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-xs font-bold uppercase tracking-wider"
            >
              <span>Volver al Inicio</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default function InscripcionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
          <div className="bg-surface-container border border-white/10 p-8 max-w-sm w-full text-center shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
            <p className="font-headline text-base uppercase text-white">
              Cargando Formulario de Inscripción
            </p>
          </div>
        </div>
      }
    >
      <InscripcionContent />
    </Suspense>
  );
}
