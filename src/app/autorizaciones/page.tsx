'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  Tv,
  Newspaper,
  RotateCcw,
  Ban,
  Info,
  X,
  Bus,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { FAVB_TEAMS, FAVB_PLAYERS } from '@/lib/favb-data';
import { CLUB_INFO } from '@/lib/data-store';
import { SignaturePad } from '@/components/SignaturePad';
import { generateConsentPdf } from '@/lib/pdf-consent';
import { isValidSpanishDniOrNie } from '@/lib/consent-store';

function AutorizacionesContent() {
  const searchParams = useSearchParams();

  // Paso actual (1: Selección y Verificación, 2: Formulario y Firma, 3: Éxito)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Selección y verificación manual
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [birthInput, setBirthInput] = useState<string>('');
  const [dniLast5Input, setDniLast5Input] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Flag si se accedió mediante enlace directo emitido por administración
  const [isDirectAccess, setIsDirectAccess] = useState(false);
  const [loadingDirectAccess, setLoadingDirectAccess] = useState(false);

  // Datos del jugador verificado
  const [verifiedPlayer, setVerifiedPlayer] = useState<{
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    birthYear: number;
    isMinor: boolean;
  } | null>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');

  // Si ya estaba firmado previamente
  const [alreadySignedData, setAlreadySignedData] = useState<{
    id: string;
    signedAt: string;
    signerName: string;
    signerDni: string;
    signerRelationship: string;
    consentSocialMedia: boolean;
    consentStreaming: boolean;
    consentPress: boolean;
    consentTravel?: boolean;
    medicalNotes?: string;
  } | null>(null);

  // Paso 2: Formulario de consentimiento oficial (Modelos Junta de Andalucía)
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRelationship, setSignerRelationship] = useState<'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR'>('MADRE');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');

  // Anexo 05: Casillas de consentimiento de imagen
  const [consentSocialMedia, setConsentSocialMedia] = useState(true);
  const [consentStreaming, setConsentStreaming] = useState(true);
  const [consentPress, setConsentPress] = useState(true);
  const [denyAllConsents, setDenyAllConsents] = useState(false);

  // Anexo 06: Desplazamientos y viajes oficiales + cobertura médica
  const [consentTravel, setConsentTravel] = useState(true);
  const [medicalNotes, setMedicalNotes] = useState('');

  // Declaración responsable y firma
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [patriaPotestadAccepted, setPatriaPotestadAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Paso 3: Confirmación
  const [confirmedConsentId, setConfirmedConsentId] = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<string | null>(null);
  const [confirmedTimestamp, setConfirmedTimestamp] = useState<string | null>(null);

  // 1. Detección de Enlace Directo (Magic Link) o preselección por URL param ?directToken=...
  useEffect(() => {
    const directTokenParam = searchParams.get('directToken') || searchParams.get('token');
    if (directTokenParam) {
      setLoadingDirectAccess(true);
      fetch('/api/consent/verify-direct-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directToken: directTokenParam }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.player) {
            setVerifiedPlayer(data.player);
            setVerificationToken(data.verificationToken || '');
            setIsDirectAccess(true);

            // Auto-rellenar campos con los datos disponibles del deportista o tutor
            if (data.prefilledData) {
              if (data.prefilledData.signerName) setSignerName(data.prefilledData.signerName);
              if (data.prefilledData.signerDni) setSignerDni(data.prefilledData.signerDni);
              if (data.prefilledData.signerRelationship) {
                setSignerRelationship(data.prefilledData.signerRelationship);
              }
              if (data.prefilledData.signerPhone) setSignerPhone(data.prefilledData.signerPhone);
              if (data.prefilledData.signerEmail) setSignerEmail(data.prefilledData.signerEmail);
              if (data.player.isMinor && data.prefilledData.signerName) {
                setPatriaPotestadAccepted(true);
              }
            } else {
              if (!data.player.isMinor) {
                setSignerRelationship('PROPIO_JUGADOR');
                setSignerName(data.player.name);
              } else {
                setSignerRelationship('MADRE');
              }
            }

            if (data.alreadySigned && data.existingConsent) {
              setAlreadySignedData(data.existingConsent);
            } else {
              setStep(2);
            }
          } else {
            setVerifyError(data.error || 'El enlace directo no es válido o ha caducado.');
          }
        })
        .catch(() => {
          setVerifyError('Error al validar el enlace directo.');
        })
        .finally(() => {
          setLoadingDirectAccess(false);
        });
      return;
    }

    // Preselección habitual por equipo si no hay directToken
    const teamParam = searchParams.get('equipo') || searchParams.get('team');
    if (teamParam) {
      const match = FAVB_TEAMS.find(
        (t) => t.id === teamParam || t.categoryId === teamParam || t.name.toLowerCase().includes(teamParam.toLowerCase())
      );
      if (match) {
        setSelectedTeamId(match.id);
      }
    }
  }, [searchParams]);

  // Jugadores del equipo seleccionado
  const teamPlayers = selectedTeamId
    ? FAVB_PLAYERS.filter((p) => p.teamId === selectedTeamId)
    : [];

  // Reset de jugador al cambiar de equipo
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedPlayerId('');
    setVerifyError(null);
    setAlreadySignedData(null);
  };

  // Manejar verificación de identidad manual (Paso 1)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setAlreadySignedData(null);

    if (!selectedTeamId || !selectedPlayerId) {
      setVerifyError('Por favor, selecciona tu equipo y el nombre del deportista.');
      return;
    }

    if (!birthInput.trim()) {
      setVerifyError('Por favor, introduce el año o fecha de nacimiento del deportista.');
      return;
    }

    const cleanDni5 = dniLast5Input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!/^[0-9]{4}[A-Z]$/.test(cleanDni5)) {
      setVerifyError('Los últimos caracteres del DNI/NIE deben ser exactamente 4 números y 1 letra (ejemplo: 1234A).');
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

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerifyError(data.error || 'No se ha podido verificar la identidad. Comprueba los datos introducidos.');
        return;
      }

      setVerifiedPlayer(data.player);
      setVerificationToken(data.verificationToken || '');

      if (data.alreadySigned && data.existingConsent) {
        setAlreadySignedData(data.existingConsent);
      } else {
        if (!data.player.isMinor) {
          setSignerRelationship('PROPIO_JUGADOR');
          setSignerName(data.player.name);
        } else {
          setSignerRelationship('MADRE');
          setSignerName('');
        }
        setStep(2);
      }
    } catch {
      setVerifyError('Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Descargar resguardo de un jugador que ya estaba firmado
  const handleDownloadExisting = () => {
    if (!verifiedPlayer || !alreadySignedData) return;

    const doc = generateConsentPdf({
      consentId: alreadySignedData.id,
      playerName: verifiedPlayer.name,
      teamName: verifiedPlayer.teamName,
      birthYear: verifiedPlayer.birthYear,
      isMinor: verifiedPlayer.isMinor,
      signerName: alreadySignedData.signerName,
      signerDni: alreadySignedData.signerDni,
      signerRelationship: alreadySignedData.signerRelationship,
      consentSocialMedia: alreadySignedData.consentSocialMedia,
      consentStreaming: alreadySignedData.consentStreaming,
      consentPress: alreadySignedData.consentPress,
      consentTravel: alreadySignedData.consentTravel !== false,
      medicalNotes: alreadySignedData.medicalNotes,
      signedAt: alreadySignedData.signedAt,
    });

    const safeName = verifiedPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
  };

  const handleToggleDenyAll = (checked: boolean) => {
    setDenyAllConsents(checked);
    if (checked) {
      setConsentSocialMedia(false);
      setConsentStreaming(false);
      setConsentPress(false);
    }
  };

  const handleConsentChange = (setter: (val: boolean) => void, val: boolean) => {
    setter(val);
    if (val) {
      setDenyAllConsents(false);
    }
  };

  // Manejar envío final del consentimiento (Paso 2)
  const handleSubmitConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!verifiedPlayer) return;

    if (!signerName.trim()) {
      setSubmitError('Por favor, indica el nombre completo del firmante.');
      return;
    }

    const cleanDni = signerDni.trim().toUpperCase();
    if (!isValidSpanishDniOrNie(cleanDni)) {
      setSubmitError('El DNI o NIE del firmante no es válido (comprueba los números y la letra).');
      return;
    }

    if (verifiedPlayer.isMinor && !patriaPotestadAccepted) {
      setSubmitError('Debes marcar la declaración responsable de patria potestad.');
      return;
    }

    if (!signatureData) {
      setSubmitError('Es obligatorio firmar en el recuadro inferior con el dedo o el ratón.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanDni5 = dniLast5Input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const res = await fetch('/api/consent/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken,
          playerId: verifiedPlayer.id,
          playerName: verifiedPlayer.name,
          teamId: verifiedPlayer.teamId,
          isMinor: verifiedPlayer.isMinor,
          dniLast5: cleanDni5 || '0000X',
          signerType: verifiedPlayer.isMinor ? 'PARENT' : 'SELF_ADULT',
          signerName: signerName.trim(),
          signerDni: cleanDni,
          signerRelationship,
          signerEmail: signerEmail.trim(),
          signerPhone: signerPhone.trim(),
          consentSocialMedia,
          consentStreaming,
          consentPress,
          consentTravel,
          medicalNotes: medicalNotes.trim(),
          signatureData,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'Error al registrar la autorización. Por favor, revisa los datos.');
        return;
      }

      setConfirmedConsentId(data.consentId);
      setConfirmedHash(data.documentHash);
      setConfirmedTimestamp(data.timestamp);
      setStep(3);
    } catch {
      setSubmitError('Error de conexión al enviar el formulario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Descarga del PDF oficial generado al completar el registro
  const handleDownloadSuccessPdf = () => {
    if (!verifiedPlayer) return;

    const doc = generateConsentPdf({
      consentId: confirmedConsentId || undefined,
      playerName: verifiedPlayer.name,
      teamName: verifiedPlayer.teamName,
      birthYear: verifiedPlayer.birthYear,
      isMinor: verifiedPlayer.isMinor,
      signerName: signerName.trim(),
      signerDni: signerDni.trim().toUpperCase(),
      signerRelationship,
      signerPhone: signerPhone.trim(),
      signerEmail: signerEmail.trim(),
      consentSocialMedia,
      consentStreaming,
      consentPress,
      consentTravel,
      medicalNotes: medicalNotes.trim(),
      signatureData: signatureData || undefined,
      documentHash: confirmedHash || undefined,
      signedAt: confirmedTimestamp || undefined,
    });

    const safeName = verifiedPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizaciones_junta_andalucia_${safeName}.pdf`);
  };

  // Determinar edad estimada para mostrar explicaciones precisas de la Junta de Andalucía
  const currentYear = 2026;
  const playerAge = verifiedPlayer ? currentYear - verifiedPlayer.birthYear : 14;
  const isPlayerUnder14 = verifiedPlayer?.isMinor && playerAge < 14;
  const isPlayer14to18 = verifiedPlayer?.isMinor && playerAge >= 14;

  return (
    <div className="w-full min-h-screen bg-background text-on-surface relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background ambient */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.12] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        {/* Cabecera Principal */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container text-white text-xs font-bold uppercase tracking-wider rounded">
            <ShieldCheck className="w-4 h-4" />
            <span>Portal Oficial de Autorizaciones · Junta de Andalucía</span>
          </div>
          <h1 className="font-display-xl text-3xl sm:text-4xl text-white uppercase tracking-tight">
            Autorizaciones Oficiales y Cesión de Imagen
          </h1>
          <p className="text-sm text-tertiary max-w-xl mx-auto">
            Trámite digital oficial para deportistas y familias del {CLUB_INFO.name}. Conforme al Protocolo de Menores de la Junta de Andalucía, RGPD y LOPDGDD.
          </p>
        </div>

        {/* Indicador de carga de acceso directo */}
        {loadingDirectAccess && (
          <div className="p-6 bg-surface-container-lowest border border-white/10 rounded-xl text-center space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/80">Validando enlace directo emitido por el Club...</p>
          </div>
        )}

        {/* Indicador de pasos */}
        {!loadingDirectAccess && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                step === 1 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'
              }`}
            >
              <span>1</span>
              <span>Identificación</span>
            </div>
            <div className="hidden sm:block w-8 h-px bg-white/20" />
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                step === 2 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'
              }`}
            >
              <span>2</span>
              <span>Autorizaciones y Firma</span>
            </div>
            <div className="hidden sm:block w-8 h-px bg-white/20" />
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                step === 3 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'
              }`}
            >
              <span>3</span>
              <span>Resguardo Oficial</span>
            </div>
          </div>
        )}

        {/* Banner de Acceso Directo por Administrador */}
        {isDirectAccess && verifiedPlayer && step === 2 && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-2 shadow-lg">
            <div className="flex items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="text-white block text-sm">
                    Acceso directo verificado para {verifiedPlayer.name}
                  </strong>
                  <span>
                    Equipo: {verifiedPlayer.teamName} · Identificación oficial validada por el Club.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold uppercase text-[10px] rounded tracking-wider shrink-0">
                Datos Pre-cargados
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80 bg-emerald-900/30 p-2 rounded border border-emerald-500/20">
              ✨ <strong>Comodidad:</strong> Hemos auto-rellenado los campos con los datos disponibles del deportista y su tutor. Por favor, revísalos, traza tu firma abajo y confirma el documento.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1: SELECCIÓN Y VERIFICACIÓN DE IDENTIDAD MANUAL                       */}
        {/* ========================================================================= */}
        {step === 1 && !loadingDirectAccess && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-white/10 pb-4 space-y-1">
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                Paso 1: Identificación del Deportista
              </h2>
              <p className="text-xs text-tertiary">
                Para garantizar la seguridad y privacidad, verifica los datos del deportista federado antes de acceder a la firma.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              {/* Selector de Equipo */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  1. Selecciona el Equipo <span className="text-primary">*</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Elige tu equipo --</option>
                  {FAVB_TEAMS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Deportista */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  2. Nombre del Deportista <span className="text-primary">*</span>
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => {
                    setSelectedPlayerId(e.target.value);
                    setVerifyError(null);
                    setAlreadySignedData(null);
                  }}
                  disabled={!selectedTeamId}
                  required
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-40"
                >
                  <option value="">
                    {!selectedTeamId ? '-- Primero selecciona un equipo --' : '-- Elige al deportista --'}
                  </option>
                  {teamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} {p.number ? `(#${p.number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doble Verificación: Año de Nacimiento + 4 últimos dígitos y letra DNI/NIE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Año o Fecha de Nacimiento <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. 2012 o 15/04/2012"
                      value={birthInput}
                      onChange={(e) => setBirthInput(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                    <Calendar className="w-4 h-4 text-tertiary absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-tertiary">Año o fecha registrada en su ficha.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Últimos 4 dígitos + Letra DNI/NIE <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. 1234A"
                      maxLength={6}
                      value={dniLast5Input}
                      onChange={(e) => setDniLast5Input(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white uppercase placeholder-white/30 tracking-wider font-mono focus:outline-none focus:border-primary"
                    />
                    <Lock className="w-4 h-4 text-tertiary absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-tertiary">De la ficha federativa del deportista.</span>
                </div>
              </div>

              {/* Alerta de Error */}
              {verifyError && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Si ya estaba firmado previamente */}
              {alreadySignedData && verifiedPlayer && (
                <div className="p-5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>¡Autorización oficial ya registrada!</span>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    <strong>{verifiedPlayer.name}</strong> ({verifiedPlayer.teamName}) ya cuenta con una autorización válida firmada por <strong>{alreadySignedData.signerName}</strong> ({alreadySignedData.signerDni}) el{' '}
                    {new Date(alreadySignedData.signedAt).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadExisting}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar copia en PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAlreadySignedData(null);
                        setStep(2);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white/80 font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Modificar autorización</span>
                    </button>
                  </div>
                </div>
              )}

              {!alreadySignedData && (
                <button
                  type="submit"
                  disabled={isVerifying || !selectedPlayerId}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {isVerifying ? (
                    <span>Verificando datos federativos...</span>
                  ) : (
                    <>
                      <span>Continuar al Formulario Oficial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: ANEXOS OFICIALES DE LA JUNTA DE ANDALUCÍA Y FIRMA                   */}
        {/* ========================================================================= */}
        {step === 2 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-7 shadow-2xl">
            {/* Cabecera del paso */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                {!isDirectAccess && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white mb-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a identificación</span>
                  </button>
                )}
                <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                  Paso 2: Declaración Oficial y Firma Digital
                </h2>
                <span className="text-xs text-tertiary">
                  Documentación oficial adaptada a la normativa de la Junta de Andalucía
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-primary block">{verifiedPlayer.teamName}</span>
                <span className="text-sm font-bold text-white">{verifiedPlayer.name}</span>
                <span className="text-[11px] text-tertiary block">
                  {verifiedPlayer.isMinor
                    ? isPlayerUnder14
                      ? 'Menor de 14 años'
                      : 'Menor de 14 a 18 años'
                    : 'Mayor de edad (+18)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitConsent} className="space-y-6">
              {/* Sección Datos del Firmante */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" />
                  <span>
                    {verifiedPlayer.isMinor ? 'Datos del Padre / Madre o Tutor/a Legal' : 'Datos del Deportista (Mayor de Edad)'}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1.5">
                      Nombre y Apellidos completos <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del firmante"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1.5">
                      DNI o NIE del firmante <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 12345678Z o Y1234567B"
                      value={signerDni}
                      onChange={(e) => setSignerDni(e.target.value.toUpperCase())}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {verifiedPlayer.isMinor ? (
                    <div>
                      <label className="block text-xs text-white/80 font-medium mb-1.5">
                        Relación con el menor <span className="text-primary">*</span>
                      </label>
                      <select
                        value={signerRelationship}
                        onChange={(e) => setSignerRelationship(e.target.value as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL')}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      >
                        <option value="MADRE">Madre</option>
                        <option value="PADRE">Padre</option>
                        <option value="TUTOR_LEGAL">Tutor / Tutora Legal</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-white/80 font-medium mb-1.5">Condición</label>
                      <input
                        type="text"
                        disabled
                        value="Propio Deportista (+18)"
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white/50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1.5">
                      Teléfono móvil de contacto
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder="600 000 000"
                        value={signerPhone}
                        onChange={(e) => setSignerPhone(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <Phone className="w-3.5 h-3.5 text-tertiary absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="familia@ejemplo.com"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <Mail className="w-3.5 h-3.5 text-tertiary absolute left-3 top-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ANEXO 05: MODELO DE TRATAMIENTO DE DATOS E IMÁGENES (JUNTA DE ANDALUCÍA)   */}
              {/* ========================================================================= */}
              <div className="space-y-3 pt-5 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Tratamiento de Datos e Imágenes de Menores / Deportistas
                      </h3>
                    </div>
                    <p className="text-[11px] text-tertiary">
                      Conforme al Protocolo Marco de la Junta de Andalucía (Orden de 18 de nov. de 2024), RGPD y LOPDGDD:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white underline font-semibold self-start sm:self-auto cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Ver normativa oficial</span>
                  </button>
                </div>

                {/* Casilla Única Oficial: Cesión de Imagen Integral */}
                <label
                  className={`block p-4 rounded-xl border transition-all ${
                    denyAllConsents
                      ? 'bg-surface-container-low/40 border-white/5 opacity-40 cursor-not-allowed'
                      : consentSocialMedia
                      ? 'bg-primary/10 border-primary/50 cursor-pointer shadow-md'
                      : 'bg-surface-container-low border-white/10 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={denyAllConsents}
                      checked={consentSocialMedia}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setConsentSocialMedia(val);
                        setConsentStreaming(val);
                        setConsentPress(val);
                        if (val) setDenyAllConsents(false);
                      }}
                      className="mt-1 w-4 h-4 rounded border-white/30 text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <span>Autorización para el Tratamiento y Difusión de Imágenes</span>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">
                        Autorizo al <strong>{CLUB_INFO.name}</strong> y a las entidades organizadoras y patrocinadores para captar y divulgar la imagen del deportista en la web oficial, redes sociales del club, retransmisiones oficiales de partidos (streaming), prensa y soportes deportivos con la exclusiva finalidad de promoción del deporte, conforme a la Ley 1/1982, RGPD y el Protocolo Marco de Protección de Menores de la Junta de Andalucía.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Casilla Alternativa: Denegación Expresa Total de Imágenes */}
                <label
                  className={`block p-4 rounded-xl border transition-all cursor-pointer ${
                    denyAllConsents
                      ? 'bg-red-950/40 border-red-500/70 shadow-lg shadow-red-950/40'
                      : 'bg-surface-container-low/80 border-red-500/20 hover:border-red-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={denyAllConsents}
                      onChange={(e) => handleToggleDenyAll(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-red-500/50 text-red-500 focus:ring-red-500 accent-red-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-red-300">
                        <Ban className="w-4 h-4 text-red-400" />
                        <span>No autorizo la captación ni difusión de imágenes (Denegación expresa de imagen)</span>
                      </div>
                      <p className="text-xs text-red-200/80 leading-relaxed">
                        Al marcar esta opción, no se concede ninguna cesión de imagen en redes, streaming ni prensa oficial. Se registrará la denegación en acta interna para conocimiento estricto de técnicos y delegados de campo.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* ========================================================================= */}
              {/* DESPLAZAMIENTOS, VIAJES Y ASISTENCIA SANITARIA OFICIAL                    */}
              {/* ========================================================================= */}
              <div className="space-y-3 pt-5 border-t border-white/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Autorización de Desplazamientos y Asistencia Médica Oficial
                    </h3>
                  </div>
                  <p className="text-[11px] text-tertiary">
                    Modelo oficial de desplazamientos de la Junta de Andalucía y la Federación Andaluza de Voleibol (FAVB):
                  </p>
                </div>

                <label
                  className={`block p-4 rounded-lg border transition-all cursor-pointer ${
                    consentTravel
                      ? 'bg-blue-950/20 border-blue-500/50 shadow-md'
                      : 'bg-surface-container-low border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={consentTravel}
                      onChange={(e) => setConsentTravel(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-blue-400 text-blue-500 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <span>Autorización de Salidas, Viajes Oficiales y Cobertura Sanitaria</span>
                      </div>
                      <p className="text-xs text-blue-100/90 leading-relaxed">
                        Autorizo el traslado y desplazamiento del deportista para la disputa de partidos oficiales, concentraciones, Campeonatos de Andalucía (CADEBA), torneos federados y entrenamientos programados durante la temporada 2026/2027 en medios de transporte autorizados por el club (autobús concertado o vehículos designados) bajo la tutela del cuerpo técnico y delegados.
                      </p>
                      <p className="text-[11px] text-blue-200/80 leading-relaxed">
                        Asimismo, faculta a los responsables del club a gestionar la asistencia sanitaria facultativa de urgencia en caso de lesión o indisposición a través del Seguro Deportivo Obligatorio de la FAVB y el Servicio Andaluz de Salud (SAS).
                      </p>
                    </div>
                  </div>
                </label>

                {/* Observaciones médicas opcionales */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs text-white/80 font-medium flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-tertiary" />
                    <span>Observaciones de salud o alergias relevantes (Opcional):</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Indica si padece asma, alergias alimentarias, intolerancias o toma medicación especial..."
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    maxLength={400}
                    className="w-full bg-surface-container-low border border-white/15 rounded-lg p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Declaración Responsable de Patria Potestad */}
              {verifiedPlayer.isMinor && (
                <div className="p-4 bg-surface-container-low border border-white/15 rounded-lg space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patriaPotestadAccepted}
                      onChange={(e) => setPatriaPotestadAccepted(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-white/90 leading-relaxed">
                      <strong>Declaración Responsable (Junta de Andalucía):</strong> Declaro bajo mi exclusiva responsabilidad que ostento la patria potestad o tutela legal del deportista menor de edad citado y que presto este consentimiento con conocimiento y conformidad del otro progenitor para las autorizaciones oficiales de imagen y desplazamientos.
                    </span>
                  </label>
                </div>
              )}

              {/* Firma Manuscrita Táctil de Alta Calidad */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white uppercase tracking-wider">
                    Firma Manuscrita Digitalizada <span className="text-primary">*</span>
                  </label>
                  <span className="text-[11px] text-tertiary">Línea continua negra sólida</span>
                </div>
                <SignaturePad onSignatureChange={setSignatureData} />
              </div>

              {/* Enlace a Política de Privacidad */}
              <p className="text-[11px] text-tertiary leading-relaxed">
                Tus datos serán tratados conforme a nuestra{' '}
                <Link href="/privacidad" target="_blank" className="text-primary underline hover:text-primary/80">
                  Política de Privacidad
                </Link>
                . Podrás revocar esta autorización o ejercitar tus derechos de acceso, rectificación y supresión en cualquier momento escribiendo a {CLUB_INFO.contactEmail}.
              </p>

              {/* Mensaje de error si falla el envío */}
              {submitError && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={isSubmitting || !signatureData || (verifiedPlayer.isMinor && !patriaPotestadAccepted)}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-xl shadow-primary/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Registrando y generando documentos oficiales...</span>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Firmar y Generar Documentos Oficiales en PDF</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: CONFIRMACIÓN Y DESCARGA DEL PDF OFICIAL DE 1 PÁGINA               */}
        {/* ========================================================================= */}
        {step === 3 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-8 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Trámite Oficial Completado con Éxito
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Autorizaciones Registradas Oficialmente
              </h2>
              <p className="text-xs text-tertiary max-w-md mx-auto">
                Las autorizaciones oficiales han sido firmadas y custodiadas en los servidores seguros del club con sellado digital de integridad y marca temporal certificada.
              </p>
            </div>

            {/* Resumen de los datos firmados */}
            <div className="bg-surface-container-low border border-white/10 rounded-lg p-5 text-left text-xs space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-tertiary">Deportista:</span>
                <strong className="text-white">{verifiedPlayer.name}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-tertiary">Equipo / Categoría:</span>
                <strong className="text-white">{verifiedPlayer.teamName}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-tertiary">Persona Firmante:</span>
                <strong className="text-white">
                  {signerName} (DNI: {signerDni})
                </strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-tertiary">Cesión de Imagen:</span>
                <strong className={denyAllConsents ? 'text-red-400' : 'text-emerald-400'}>
                  {denyAllConsents ? 'Denegación Expresa Total' : 'Autorizado'}
                </strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-tertiary">Desplazamientos y Asistencia Médica:</span>
                <strong className={consentTravel ? 'text-emerald-400' : 'text-red-400'}>
                  {consentTravel ? 'Autorizado' : 'No Autorizado'}
                </strong>
              </div>
              {confirmedHash && (
                <div className="pt-2 text-[10px] text-tertiary space-y-1">
                  <span>Código de Sellado SHA-256:</span>
                  <div className="font-mono text-white/70 bg-black/30 p-2 rounded break-all">
                    {confirmedHash}
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Descarga del Documento Oficial */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSuccessPdf}
                className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Resguardo Oficial (PDF)</span>
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 bg-surface-container-high hover:bg-surface-container-highest text-white/80 font-bold text-sm uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL INFORMATIVO DE LOS MODELOS OFICIALES DE LA JUNTA DE ANDALUCÍA       */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded">
                  JUNTA DE ANDALUCÍA
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Marco Normativo de Protección de Menores en el Deporte
                </h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-tertiary hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-on-surface/90 leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm text-primary">
                  1. Tratamiento y Protección de Imágenes
                </h4>
                <p>
                  Regulado en el <em>Protocolo Marco de Actuación para la Protección de las Personas Menores frente a la Violencia en el Deporte</em> (Orden de 18 de noviembre de 2024 de la Consejería de Cultura y Deporte de la Junta de Andalucía) y Ley Orgánica 8/2021 (LOPIVI).
                </p>
                <p>
                  Garantiza que las imágenes tomadas durante entrenamientos, partidos y eventos solo se utilicen para fines de divulgación y promoción deportiva del club, quedando prohibido cualquier uso mercantil ajeno o cesión no autorizada.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm text-primary">
                  2. Diferenciación por Edad (Art. 7 LOPDGDD 3/2018)
                </h4>
                <p>
                  • <strong>Menores de 14 años:</strong> El consentimiento corresponde exclusivamente a los titulares de la patria potestad o tutela legal.<br />
                  • <strong>Menores de 14 a 18 años:</strong> Requiere el consentimiento informado del menor con la conformidad y conocimiento de sus padres/tutores.<br />
                  • <strong>Mayores de edad (+18):</strong> Declaración expresa directa del propio deportista.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm text-primary">
                  3. Desplazamientos, Viajes y Asistencia Sanitaria
                </h4>
                <p>
                  Autoriza los desplazamientos fuera de San Pedro Alcántara para competiciones oficiales de la Federación Andaluza de Voleibol (FAVB), garantizando la supervisión técnica y habilitando la asistencia médica inmediata a través del Seguro Deportivo Obligatorio y el Servicio Andaluz de Salud (SAS).
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm text-primary">
                  4. Derecho de Revocación
                </h4>
                <p>
                  El consentimiento prestado puede ser revocado en cualquier momento, de forma total o parcial, notificándolo a <strong>{CLUB_INFO.contactEmail}</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2.5 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-primary/90 cursor-pointer"
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
          <div className="text-sm text-tertiary">Cargando portal de autorizaciones...</div>
        </div>
      }
    >
      <AutorizacionesContent />
    </Suspense>
  );
}
