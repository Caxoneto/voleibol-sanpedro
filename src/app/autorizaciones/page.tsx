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

  // Paso 1: Selección y verificación
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [birthInput, setBirthInput] = useState<string>('');
  const [dniLast5Input, setDniLast5Input] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Datos del jugador verificado
  const [verifiedPlayer, setVerifiedPlayer] = useState<{
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    birthYear: number;
    isMinor: boolean;
  } | null>(null);

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
  } | null>(null);

  // Paso 2: Formulario de consentimiento
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRelationship, setSignerRelationship] = useState<'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR'>('MADRE');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');

  // Casillas de consentimiento granulares
  const [consentSocialMedia, setConsentSocialMedia] = useState(false);
  const [consentStreaming, setConsentStreaming] = useState(false);
  const [consentPress, setConsentPress] = useState(false);
  const [denyAllConsents, setDenyAllConsents] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [patriaPotestadAccepted, setPatriaPotestadAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Paso 3: Confirmación
  const [confirmedConsentId, setConfirmedConsentId] = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<string | null>(null);
  const [confirmedTimestamp, setConfirmedTimestamp] = useState<string | null>(null);

  // Preselección por URL param ?equipo=...
  useEffect(() => {
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

  // Manejar verificación de identidad (Paso 1)
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

      if (data.alreadySigned && data.existingConsent) {
        setAlreadySignedData(data.existingConsent);
      } else {
        // Si no es menor (Senior), preseleccionar propio jugador
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
      signedAt: alreadySignedData.signedAt,
    });

    const safeName = verifiedPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizacion_cdv_${safeName}.pdf`);
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
          playerId: verifiedPlayer.id,
          playerName: verifiedPlayer.name,
          teamId: verifiedPlayer.teamId,
          isMinor: verifiedPlayer.isMinor,
          dniLast5: cleanDni5,
          signerType: verifiedPlayer.isMinor ? 'PARENT' : 'SELF_ADULT',
          signerName: signerName.trim(),
          signerDni: cleanDni,
          signerRelationship,
          signerEmail: signerEmail.trim(),
          signerPhone: signerPhone.trim(),
          consentSocialMedia,
          consentStreaming,
          consentPress,
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

  // Descarga del PDF generado al completar el registro
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
      signatureData: signatureData || undefined,
      documentHash: confirmedHash || undefined,
      signedAt: confirmedTimestamp || undefined,
    });

    const safeName = verifiedPlayer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`autorizacion_cdv_${safeName}.pdf`);
  };

  return (
    <div className="w-full min-h-screen bg-background text-on-surface relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background ambient */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.12] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      <div className="max-w-2xl mx-auto relative z-10 space-y-8">
        {/* Cabecera */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container text-white text-xs font-bold uppercase tracking-wider rounded">
            <ShieldCheck className="w-4 h-4" />
            <span>Portal Oficial de Autorizaciones</span>
          </div>
          <h1 className="font-display-xl text-3xl sm:text-4xl text-white uppercase tracking-tight">
            Cesión de Imagen y Protección de Datos
          </h1>
          <p className="text-sm text-tertiary max-w-lg mx-auto">
            Trámite digital oficial para deportistas y familias del {CLUB_INFO.name}. Conforme al RGPD (UE 2016/679) y LOPDGDD 3/2018.
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${step === 1 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'}`}>
            <span>1</span>
            <span>Identificación</span>
          </div>
          <div className="w-6 h-0.5 bg-white/10" />
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${step === 2 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'}`}>
            <span>2</span>
            <span>Consentimiento</span>
          </div>
          <div className="w-6 h-0.5 bg-white/10" />
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${step === 3 ? 'bg-primary text-white' : 'bg-surface-container-high text-tertiary'}`}>
            <span>3</span>
            <span>Resguardo</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PASO 1: SELECCIÓN Y VERIFICACIÓN                                           */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>Paso 1: Identificación del Deportista</span>
              </h2>
              <p className="text-xs text-tertiary mt-1">
                Para proteger la privacidad de la cantera, introducimos dos factores de verificación de la ficha federativa oficial.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              {/* Selector de Equipo */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  1. Equipo o Categoría <span className="text-primary">*</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">-- Selecciona el equipo del club --</option>
                  {FAVB_TEAMS.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Jugador */}
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
                  className="w-full bg-surface-container-low border border-white/15 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-40"
                >
                  <option value="">
                    {selectedTeamId ? '-- Selecciona el deportista --' : 'Primero selecciona el equipo'}
                  </option>
                  {teamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.number ? `#${player.number} · ` : ''}{player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dos Factores de Verificación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                    Año o Fecha de Nacimiento <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. 2008 o 15/04/2008"
                      value={birthInput}
                      onChange={(e) => setBirthInput(e.target.value)}
                      required
                      className="w-full bg-surface-container-low border border-white/15 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary"
                    />
                    <Calendar className="w-4 h-4 text-tertiary absolute left-3 top-3" />
                  </div>
                  <span className="text-[11px] text-tertiary">Año o fecha registrada en el club.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                    Últimos 4 dígitos y letra DNI/NIE <span className="text-primary">*</span>
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
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
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
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white/80 font-bold text-xs uppercase tracking-wider rounded transition-colors"
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
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-primary/20"
                >
                  {isVerifying ? (
                    <span>Verificando datos...</span>
                  ) : (
                    <>
                      <span>Continuar al Consentimiento</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: FORMULARIO DE CONSENTIMIENTO Y FIRMA                               */}
        {/* ========================================================================= */}
        {step === 2 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Cabecera del paso */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a identificación</span>
                </button>
                <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                  Paso 2: Declaración y Firma
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-primary block">{verifiedPlayer.teamName}</span>
                <span className="text-sm font-bold text-white">{verifiedPlayer.name}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitConsent} className="space-y-6">
              {/* Sección Datos del Firmante */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" />
                  <span>
                    {verifiedPlayer.isMinor ? 'Datos del Padre / Madre o Tutor/a Legal' : 'Datos del Firmante (Mayor de Edad)'}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/80 font-medium mb-1.5">
                      Nombre y Apellidos completos <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del tutor firmante"
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
                        value="Propio Jugador/a (+18)"
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

              {/* Sección: Casillas Granulares de Consentimiento */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider text-primary">
                      Alcance de la Autorización (Opciones Independientes)
                    </h3>
                    <p className="text-[11px] text-tertiary">
                      Conforme al RGPD, puedes autorizar finalidades específicas o denegar todas:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white underline font-semibold self-start sm:self-auto"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Leer condiciones y alcance legal</span>
                  </button>
                </div>

                {/* Casilla 1: Redes y Web */}
                <label
                  className={`block p-4 rounded-lg border transition-all ${
                    denyAllConsents
                      ? 'bg-surface-container-low/40 border-white/5 opacity-40 cursor-not-allowed'
                      : consentSocialMedia
                      ? 'bg-primary/10 border-primary/50 cursor-pointer'
                      : 'bg-surface-container-low border-white/10 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={denyAllConsents}
                      checked={consentSocialMedia}
                      onChange={(e) => handleConsentChange(setConsentSocialMedia, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/30 text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <Camera className="w-4 h-4 text-primary" />
                        <span>1. Páginas Web y Redes Sociales Oficiales del Club</span>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">
                        Autorizo la toma y publicación de fotografías de equipo, celebraciones de partidos oficiales y crónicas deportivas en la web oficial ({CLUB_INFO.name}) y redes oficiales del club (Instagram, Facebook).
                      </p>
                    </div>
                  </div>
                </label>

                {/* Casilla 2: Streaming */}
                <label
                  className={`block p-4 rounded-lg border transition-all ${
                    denyAllConsents
                      ? 'bg-surface-container-low/40 border-white/5 opacity-40 cursor-not-allowed'
                      : consentStreaming
                      ? 'bg-primary/10 border-primary/50 cursor-pointer'
                      : 'bg-surface-container-low border-white/10 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={denyAllConsents}
                      checked={consentStreaming}
                      onChange={(e) => handleConsentChange(setConsentStreaming, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/30 text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <Tv className="w-4 h-4 text-primary" />
                        <span>2. Retransmisión en Directo de Partidos (Streaming / YouTube)</span>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">
                        Autorizo la aparición del deportista en las emisiones de partidos oficiales en directo organizadas por el club a través de plataformas audiovisuales (YouTube/streaming deportivo).
                      </p>
                    </div>
                  </div>
                </label>

                {/* Casilla 3: Prensa */}
                <label
                  className={`block p-4 rounded-lg border transition-all ${
                    denyAllConsents
                      ? 'bg-surface-container-low/40 border-white/5 opacity-40 cursor-not-allowed'
                      : consentPress
                      ? 'bg-primary/10 border-primary/50 cursor-pointer'
                      : 'bg-surface-container-low border-white/10 hover:border-white/20 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={denyAllConsents}
                      checked={consentPress}
                      onChange={(e) => handleConsentChange(setConsentPress, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/30 text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <Newspaper className="w-4 h-4 text-primary" />
                        <span>3. Difusión en Prensa y Medios Locales</span>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">
                        Autorizo la cesión de imágenes o referencias a resultados deportivos para notas de prensa en medios de comunicación locales de San Pedro Alcántara y Marbella.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Casilla 4: Denegación Total Expresa */}
                <label
                  className={`block p-4 rounded-lg border transition-all cursor-pointer ${
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
                        <span>4. No autorizo ninguna cesión de imagen (Denegación expresa)</span>
                      </div>
                      <p className="text-xs text-red-200/80 leading-relaxed">
                        Al marcar esta opción, no se concede autorización para redes, streaming ni prensa. Se generará y custodiará el resguardo oficial firmado de denegación para que conste formalmente ante el club y el cuerpo técnico.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Declaración Responsable de Patria Potestad */}
              {verifiedPlayer.isMinor && (
                <div className="p-3.5 bg-surface-container-low border border-white/15 rounded-lg space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patriaPotestadAccepted}
                      onChange={(e) => setPatriaPotestadAccepted(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-white/90 leading-relaxed">
                      <strong>Declaración Responsable:</strong> Declaro bajo mi responsabilidad que ostento la patria potestad o tutela legal del menor citado y que actúo en su interés y con conocimiento del otro progenitor.
                    </span>
                  </label>
                </div>
              )}

              {/* Firma Manuscrita Táctil */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Firma Digitalizada <span className="text-primary">*</span>
                </label>
                <SignaturePad onSignatureChange={setSignatureData} />
              </div>

              {/* Enlace a Política de Privacidad */}
              <p className="text-[11px] text-tertiary leading-relaxed">
                Tus datos serán tratados conforme a nuestra{' '}
                <Link href="/privacidad" target="_blank" className="text-primary underline hover:text-primary/80">
                  Política de Privacidad
                </Link>
                . Podrás revocar esta autorización o ejercitar tus derechos en cualquier momento escribiendo a {CLUB_INFO.contactEmail}.
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
                  <span>Registrando y generando resguardo...</span>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Firmar y Registrar Autorización</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: CONFIRMACIÓN Y DESCARGA DEL RESGUARDO                             */}
        {/* ========================================================================= */}
        {step === 3 && verifiedPlayer && (
          <div className="bg-surface-container-lowest border border-emerald-500/30 rounded-xl p-6 sm:p-10 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Trámite Completado con Éxito
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-tight">
                Autorización Registrada
              </h2>
              <p className="text-sm text-tertiary max-w-md mx-auto">
                La cesión de derechos de imagen de <strong className="text-white">{verifiedPlayer.name}</strong> ({verifiedPlayer.teamName}) ha quedado custodiada en el registro oficial del club.
              </p>
            </div>

            {/* Resumen de permisos firmados */}
            <div className="bg-surface-container-low p-4 rounded-lg border border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-tertiary">Firmado por:</span>
                <span className="font-bold text-white">{signerName} (DNI: {signerDni})</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-tertiary">Web y Redes Sociales:</span>
                <span className={`font-bold ${consentSocialMedia ? 'text-emerald-400' : 'text-red-400'}`}>
                  {consentSocialMedia ? 'Autorizado' : 'No autorizado'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-tertiary">Streaming de Partidos:</span>
                <span className={`font-bold ${consentStreaming ? 'text-emerald-400' : 'text-red-400'}`}>
                  {consentStreaming ? 'Autorizado' : 'No autorizado'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-tertiary">Prensa y Medios:</span>
                <span className={`font-bold ${consentPress ? 'text-emerald-400' : 'text-red-400'}`}>
                  {consentPress ? 'Autorizado' : 'No autorizado'}
                </span>
              </div>
            </div>

            {/* Botón de Descarga del Resguardo PDF */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleDownloadSuccessPdf}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-5 h-5" />
                <span>Descargar Resguardo Oficial en PDF</span>
              </button>

              <Link
                href="/"
                className="inline-block text-xs text-tertiary hover:text-white transition-colors underline pt-2"
              >
                Volver a la página principal del club
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL INFORMATIVO DE CONDICIONES Y ALCANCE LEGAL                           */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Información y Alcance de las Autorizaciones (RGPD)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-tertiary hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-on-surface leading-relaxed">
              <div className="p-3 bg-surface-container-low rounded-lg border border-white/5 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>1. Páginas Web y Redes Sociales del Club</span>
                </h4>
                <p className="text-tertiary">
                  Comprende la captación y publicación de imágenes durante partidos oficiales, entrenamientos y entregas de trofeos para las crónicas deportivas del club en Instagram (@voleibolsanpedro), Facebook y en la web oficial (voleibolsanpedro.es). Las imágenes nunca se cederán a fines comerciales de terceros y se limitarán a la difusión deportiva del club.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-white/5 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-primary" />
                  <span>2. Retransmisiones en Directo (Streaming / YouTube)</span>
                </h4>
                <p className="text-tertiary">
                  Permite la emisión pública en streaming de los partidos que dispute el equipo en plataformas audiovisuales del club (YouTube). Facilita que familiares y aficionados que no puedan desplazarse al pabellón sigan los encuentros en tiempo real.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-white/5 space-y-1">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-primary" />
                  <span>3. Prensa y Medios de Comunicación Locales</span>
                </h4>
                <p className="text-tertiary">
                  Autoriza el envío de notas de prensa y fotos de equipo a periódicos y portales de noticias comarcales de San Pedro Alcántara y Marbella para destacar los logros deportivos de la cantera.
                </p>
              </div>

              <div className="p-3 bg-red-950/30 rounded-lg border border-red-500/30 space-y-1">
                <h4 className="font-bold text-red-300 flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-red-400" />
                  <span>¿Qué sucede si no autorizo la cesión de imagen?</span>
                </h4>
                <p className="text-red-200/80">
                  La no autorización <strong>no condiciona en ningún caso la práctica deportiva</strong> del menor. Podrá entrenar y competir en ligas federadas con absoluta normalidad. El club adoptará las medidas técnicas para no publicar primeros planos de su rostro ni enfocarlo en las retransmisiones.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-white/5 space-y-1">
                <h4 className="font-bold text-white">Revocación y Ejercicio de Derechos</h4>
                <p className="text-tertiary">
                  Conforme a los Arts. 15 a 22 del RGPD, podrás revocar este consentimiento o ejercer tus derechos de acceso, rectificación y supresión en cualquier momento enviando un correo a <strong className="text-white">{CLUB_INFO.contactEmail}</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase rounded transition-colors"
              >
                Entendido y Cerrar
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
