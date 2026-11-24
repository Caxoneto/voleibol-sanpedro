'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  HeartHandshake,
  Lock,
  Mail,
  Phone,
  Scale,
  Send,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { CLUB_CATEGORIES_META, CLUB_CATEGORY_FAMILIES } from '@/lib/club-info';
import {
  LOPIVI_CLUB_OBLIGATIONS,
  LOPIVI_CONDUCT_CODE_SECTIONS,
  LOPIVI_CONDUCT_CODE_TITLE,
  LOPIVI_DELEGATE,
  LOPIVI_IMMEDIATE_RISK_OPTIONS,
  LOPIVI_KEY_MESSAGES,
  LOPIVI_LEGAL_NORMS,
  LOPIVI_LOCATIONS,
  LOPIVI_PROTOCOL_SECTIONS,
  LOPIVI_PROTOCOL_TITLE,
  LOPIVI_REPORTER_RELATIONS,
  LOPIVI_SITUATION_TYPES,
  LOPIVI_URGENT_HELP_RESOURCES,
  type LopiviImmediateRisk,
} from '@/lib/lopivi-content';
import {
  generateLopiviConductCodePdf,
  generateLopiviIncidentRecordPdf,
  generateLopiviProtocolPdf,
  type LopiviIncidentPdfInput,
} from '@/lib/pdf-lopivi';

type PublicTab = 'canal' | 'protocolo' | 'codigo' | 'marco-legal';

interface SubmittedReceiptState {
  recordCode: string;
  receivedAtMadrid: string;
  receivedDateText: string;
  receivedTimeText: string;
  pdfPayload: LopiviIncidentPdfInput;
}

const PROTOCOL_FLOW_PHASES = [
  {
    step: '01',
    title: 'Recepción',
    desc: 'Canal web confidencial, atención directa, teléfono o email al Delegado.',
  },
  {
    step: '02',
    title: 'Atención y Protección',
    desc: 'Prioridad absoluta a la seguridad del menor. Llamada al 112 si hay peligro inmediato.',
  },
  {
    step: '03',
    title: 'Registro Confidencial',
    desc: 'Documentación cifrada con fecha, lugar, hechos objetivos y medidas iniciales.',
  },
  {
    step: '04',
    title: 'Derivación a Autoridades',
    desc: 'Comunicación inmediata a autoridades competentes ante sospecha de delito o riesgo grave.',
  },
  {
    step: '05',
    title: 'Seguimiento',
    desc: 'Vigilancia activa para evitar represalias, exposición o revictimización del menor.',
  },
];

export default function ProteccionMenorPublicPage() {
  const [activeTab, setActiveTab] = useState<PublicTab>('canal');

  // Estado del formulario del Canal Confidencial
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [keepIdentityReserved, setKeepIdentityReserved] = useState(true);
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [reporterRelationship, setReporterRelationship] = useState('Deportista');
  const [reporterRelationshipOther, setReporterRelationshipOther] = useState('');

  const [minorName, setMinorName] = useState('');
  const [minorAge, setMinorAge] = useState('');
  const [minorCategory, setMinorCategory] = useState('');
  const [minorTeam, setMinorTeam] = useState('');

  const [incidentDateText, setIncidentDateText] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('Entrenamiento');
  const [incidentLocationOther, setIncidentLocationOther] = useState('');
  const [incidentTypes, setIncidentTypes] = useState<string[]>([]);
  const [immediateRisk, setImmediateRisk] = useState<LopiviImmediateRisk>('NO_DETERMINADO');
  const [description, setDescription] = useState('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedReceiptState | null>(null);

  const categoryOptions = useMemo(
    () => [...CLUB_CATEGORY_FAMILIES.map((f) => f.shortLabel), 'Escuela'],
    []
  );
  const teamOptions = useMemo(
    () => CLUB_CATEGORIES_META.map((c) => c.name),
    []
  );

  function toggleIncidentType(label: string) {
    setIncidentTypes((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  }

  function handleDownloadProtocolPdf() {
    const doc = generateLopiviProtocolPdf();
    doc.save('Protocolo_Interno_Proteccion_Menores_CDV_San_Pedro.pdf');
  }

  function handleDownloadConductPdf() {
    const doc = generateLopiviConductCodePdf();
    doc.save('Codigo_Conducta_Convivencia_CDV_San_Pedro.pdf');
  }

  function handleDownloadBlankModelPdf() {
    const doc = generateLopiviIncidentRecordPdf({ isBlank: true });
    doc.save('Modelo_Comunicacion_Incidencias_LOPIVI_En_Blanco.pdf');
  }

  function handleDownloadReceiptPdf() {
    if (!submittedReceipt) return;
    const doc = generateLopiviIncidentRecordPdf(submittedReceipt.pdfPayload);
    doc.save(`Justificante_Confidencial_${submittedReceipt.recordCode}.pdf`);
  }

  function resetFormForNewReport() {
    setSubmittedReceipt(null);
    setFormError(null);
    setReporterName('');
    setReporterContact('');
    setReporterRelationshipOther('');
    setMinorName('');
    setMinorAge('');
    setMinorCategory('');
    setMinorTeam('');
    setIncidentDateText('');
    setIncidentLocation('Entrenamiento');
    setIncidentLocationOther('');
    setIncidentTypes([]);
    setImmediateRisk('NO_DETERMINADO');
    setDescription('');
    setWebsiteHoneypot('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (incidentTypes.length === 0) {
      setFormError('Por favor, marca al menos un tipo de situación comunicada.');
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 15) {
      setFormError(
        'Cuéntanos brevemente qué ha ocurrido (al menos 15 caracteres) para poder ayudarte.'
      );
      return;
    }

    const finalRelation =
      reporterRelationship === 'Otra' && reporterRelationshipOther.trim()
        ? `Otra: ${reporterRelationshipOther.trim()}`
        : reporterRelationship;
    const finalLocation =
      incidentLocation === 'Otro' && incidentLocationOther.trim()
        ? `Otro: ${incidentLocationOther.trim()}`
        : incidentLocation;

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/lopivi-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAnonymous,
          keepIdentityReserved,
          reporterName: isAnonymous ? '' : reporterName.trim(),
          reporterContact: isAnonymous ? '' : reporterContact.trim(),
          reporterRelationship,
          reporterRelationshipOther: reporterRelationshipOther.trim(),
          minorName: minorName.trim(),
          minorAge: minorAge.trim(),
          minorCategory: minorCategory.trim(),
          minorTeam: minorTeam.trim(),
          incidentDateText: incidentDateText.trim(),
          incidentLocation,
          incidentLocationOther: incidentLocationOther.trim(),
          incidentTypes,
          immediateRisk,
          description: trimmedDesc,
          website: websiteHoneypot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(
          data.error ||
            'No se pudo enviar tu comunicación en este momento. Inténtalo de nuevo o contacta por teléfono con el Delegado.'
        );
        return;
      }

      const pdfPayload: LopiviIncidentPdfInput = {
        variant: 'RECEIPT',
        recordCode: data.recordCode,
        receivedDateText: data.receivedDateText,
        receivedTimeText: data.receivedTimeText,
        channel: 'CANAL_WEB',
        isAnonymous,
        keepIdentityReserved,
        reporterName: isAnonymous ? '' : reporterName.trim(),
        reporterContact: isAnonymous ? '' : reporterContact.trim(),
        reporterRelationship: finalRelation,
        minorName: minorName.trim(),
        minorAge: minorAge.trim(),
        minorCategory: minorCategory.trim(),
        minorTeam: minorTeam.trim(),
        incidentDateText: incidentDateText.trim(),
        incidentLocation: finalLocation,
        incidentTypes: [...incidentTypes],
        immediateRisk,
        description: trimmedDesc,
        status: 'RECIBIDA',
      };

      setSubmittedReceipt({
        recordCode: data.recordCode,
        receivedAtMadrid: data.receivedAtMadrid,
        receivedDateText: data.receivedDateText,
        receivedTimeText: data.receivedTimeText,
        pdfPayload,
      });
    } catch {
      setFormError(
        `Error de conexión al enviar la comunicación. Si necesitas ayuda inmediata llama al ${LOPIVI_DELEGATE.phone} o al 112.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-background relative overflow-x-clip">
      {/* Cabecera Hero */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-10 sm:py-12 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-25 blur-[2px]"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />

        <div className="max-w-6xl mx-auto relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              PROTECCIÓN DEL MENOR · LEY LOPIVI
            </span>
            <span className="px-2.5 py-1 bg-surface-container border border-white/10 text-[11px] text-tertiary uppercase tracking-wider font-semibold">
              Temporada {LOPIVI_DELEGATE.season} · Protocolo Marco Junta de Andalucía
            </span>
          </div>

          <h1 className="font-display-xl text-3xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-[0.98]">
            CANAL CONFIDENCIAL Y PROTECCIÓN DEL MENOR
          </h1>

          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-3xl leading-relaxed">
            Entorno deportivo seguro y canal confidencial cifrado para prevenir, detectar y actuar ante cualquier situación de riesgo o violencia contra personas menores de edad (LOPIVI 8/2021).
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('canal')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors shadow-[3px_3px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Comunicar una situación</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadBlankModelPdf}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container hover:bg-surface-container-high border border-white/15 text-on-surface font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span>Modelo Oficial en Blanco (PDF)</span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Franja compacta: Contacto del Delegado + Acceso rápido de emergencias + Desplegable de detalle */}
        <section
          aria-label="Contacto del Delegado de Protección y Recursos Urgentes"
          className="bg-surface-container-low border border-primary-container/40 p-4 space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white">
                <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span>Delegado: {LOPIVI_DELEGATE.name}</span>
              </div>
              <a
                href={`mailto:${LOPIVI_DELEGATE.email}`}
                className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white transition-colors truncate"
              >
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>{LOPIVI_DELEGATE.email}</span>
              </a>
              <a
                href={LOPIVI_DELEGATE.phoneHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-primary transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>{LOPIVI_DELEGATE.phone}</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="tel:112"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Emergencias 112</span>
              </a>
              <a
                href="tel:900202010"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container hover:bg-surface-bright border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>ANAR 900 20 20 10</span>
              </a>
              <a
                href="tel:016"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container hover:bg-surface-bright border border-white/15 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>016</span>
              </a>
            </div>
          </div>

          <details className="group border-t border-white/10 pt-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-primary hover:text-white transition-colors [&::-webkit-details-marker]:hidden">
              <span>Ver teléfonos gratuitos de ayuda 24h y garantías de confidencialidad</span>
              <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LOPIVI_URGENT_HELP_RESOURCES.map((res) => (
                  <div
                    key={res.id}
                    className={`p-3.5 border flex flex-col justify-between space-y-2.5 ${
                      res.urgent
                        ? 'bg-rose-950/35 border-rose-500/50'
                        : 'bg-surface-container border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-white leading-snug">
                        {res.name}
                      </h3>
                      <p className="text-[11px] text-primary font-semibold">{res.schedule}</p>
                      <p className="text-xs text-tertiary leading-relaxed">{res.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {res.phones.map((p) => (
                        <a
                          key={p.display}
                          href={p.href}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                            res.urgent
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-surface-container-high hover:bg-surface-bright text-white border border-white/15'
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{p.display}</span>
                        </a>
                      ))}
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1 text-[11px] text-tertiary hover:text-white underline pt-0.5"
                        >
                          <span>Web Fundación ANAR</span>
                          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-surface-container border-l-4 border-primary-container border-y border-r border-white/10 p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <HeartHandshake className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      {LOPIVI_KEY_MESSAGES.noProofNeededPublic}
                    </p>
                    <p className="text-[11px] text-tertiary mt-1 leading-relaxed">
                      Si algo te hace sentir incómodo/a o crees que otro deportista lo está pasando mal, cuéntanoslo igualmente.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-white">Confidencialidad y protección cifrada</p>
                    <p className="text-[11px] text-tertiary mt-1 leading-relaxed">
                      {LOPIVI_KEY_MESSAGES.confidentialityCommitment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </section>

        {/* Navegación por 4 pestañas */}
        <div className="space-y-6">
          <div
            role="tablist"
            aria-label="Secciones de Protección del Menor"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-surface-container-low p-2 border border-white/10"
          >
            {[
              {
                id: 'canal' as PublicTab,
                label: 'Canal Confidencial de Comunicación',
                shortLabel: 'Canal Confidencial',
                icon: Send,
              },
              {
                id: 'protocolo' as PublicTab,
                label: 'Protocolo Interno Frente a la Violencia',
                shortLabel: 'Protocolo Interno',
                icon: Shield,
              },
              {
                id: 'codigo' as PublicTab,
                label: 'Código de Conducta y Convivencia',
                shortLabel: 'Código de Conducta',
                icon: Users,
              },
              {
                id: 'marco-legal' as PublicTab,
                label: 'Marco Legal (LOPIVI y Protocolo Andaluz)',
                shortLabel: 'Marco Legal LOPIVI',
                icon: Scale,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2.5 px-3.5 py-3 text-xs font-label-md uppercase tracking-wider font-bold transition-all cursor-pointer text-left ${
                    selected
                      ? 'bg-primary-container text-white shadow-[3px_3px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container text-on-surface/85 hover:text-white hover:bg-surface-container-high border border-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* ==============================================================
              PESTAÑA 1: CANAL CONFIDENCIAL DE COMUNICACIÓN
             ============================================================== */}
          {activeTab === 'canal' && (
            <section
              role="tabpanel"
              aria-label="Canal Confidencial de Comunicación"
              className="space-y-6"
            >
              {submittedReceipt ? (
                <div className="bg-surface-container-low border border-emerald-500/40 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" aria-hidden="true" />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] uppercase font-bold tracking-widest">
                        Comunicación registrada de forma cifrada
                      </span>
                      <h2 className="font-headline text-2xl font-bold text-white">
                        Hemos recibido tu comunicación correctamente
                      </h2>
                      <p className="text-sm text-tertiary leading-relaxed">
                        El Delegado de Protección de Menores ({LOPIVI_DELEGATE.name}) ha sido
                        avisado para revisar este expediente en el acceso confidencial restringido.
                        Guarda tu número de registro para cualquier consulta o seguimiento.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container p-4 border border-white/10">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
                        Número de Registro Confidencial
                      </p>
                      <p className="text-xl sm:text-2xl font-mono font-bold text-primary mt-1 break-all">
                        {submittedReceipt.recordCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
                        Fecha y hora de recepción (Madrid)
                      </p>
                      <p className="text-sm sm:text-base font-bold text-white mt-1">
                        {submittedReceipt.receivedDateText} · {submittedReceipt.receivedTimeText} h
                      </p>
                    </div>
                  </div>

                  {submittedReceipt.pdfPayload.immediateRisk === 'SI' && (
                    <div className="p-4 bg-rose-950/40 border border-rose-500/50 flex items-start gap-3">
                      <AlertTriangle
                        className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="text-xs sm:text-sm text-rose-100 leading-relaxed">
                        <strong>Has indicado riesgo inmediato:</strong> si hay alguien en peligro
                        en este momento o requiere atención urgente, por favor llama ahora mismo al{' '}
                        <a href="tel:112" className="underline font-bold text-white">
                          112
                        </a>{' '}
                        o directamente al Delegado de Protección al{' '}
                        <a href={LOPIVI_DELEGATE.phoneHref} className="underline font-bold text-white">
                          {LOPIVI_DELEGATE.phone}
                        </a>
                        .
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadReceiptPdf}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Descargar Justificante Confidencial (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBlankModelPdf}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-surface-container hover:bg-surface-container-high border border-white/15 text-on-surface font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <span>Descargar Modelo Oficial en Blanco (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetFormForNewReport}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-transparent hover:bg-surface-container border border-white/15 text-tertiary hover:text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
                    >
                      <span>Enviar otra comunicación</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="bg-surface-container-low border border-white/10 p-5 sm:p-8 space-y-8"
                >
                  {/* Cabecera del formulario */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                        Modelo Oficial de Comunicación de Incidencias
                      </span>
                      <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">
                        Comunicar una preocupación o incidencia de forma confidencial
                      </h2>
                      <p className="text-xs sm:text-sm text-tertiary">
                        Todos los datos personales y el relato se cifran antes de guardarse. Solo
                        el Delegado de Protección de Menores podrá leer el expediente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBlankModelPdf}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface shrink-0 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <span>Imprimir Modelo en Blanco (PDF)</span>
                    </button>
                  </div>

                  {/* Honeypot anti-bots invisible */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="lopivi-website-hp">Sitio web</label>
                    <input
                      id="lopivi-website-hp"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={websiteHoneypot}
                      onChange={(e) => setWebsiteHoneypot(e.target.value)}
                    />
                  </div>

                  {/* Bloque 1: Quién comunica (Sección 3) */}
                  <fieldset className="space-y-4">
                    <legend className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-container text-white text-xs flex items-center justify-center font-bold">
                        1
                      </span>
                      <span>Datos de la persona que comunica (puede ser anónimo)</span>
                    </legend>

                    {/* Toggle Anónimo vs Identificado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAnonymous(false)}
                        aria-pressed={!isAnonymous}
                        className={`p-3.5 border text-left transition-colors cursor-pointer ${
                          !isAnonymous
                            ? 'bg-primary-container/15 border-primary-container text-white'
                            : 'bg-surface-container border-white/10 text-tertiary hover:border-white/25'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider">
                          Facilitar mis datos de contacto
                        </p>
                        <p className="text-xs opacity-85 mt-1">
                          El Delegado podrá contactar contigo si hace falta ampliar información.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAnonymous(true)}
                        aria-pressed={isAnonymous}
                        className={`p-3.5 border text-left transition-colors cursor-pointer ${
                          isAnonymous
                            ? 'bg-primary-container/15 border-primary-container text-white'
                            : 'bg-surface-container border-white/10 text-tertiary hover:border-white/25'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider">
                          Enviar de forma totalmente anónima
                        </p>
                        <p className="text-xs opacity-85 mt-1">
                          No guardaremos tu nombre ni tu teléfono o correo electrónico.
                        </p>
                      </button>
                    </div>

                    {!isAnonymous && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="reporter-name"
                            className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                          >
                            Nombre y apellidos (opcional)
                          </label>
                          <input
                            id="reporter-name"
                            type="text"
                            maxLength={140}
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            placeholder="Tu nombre y apellidos"
                            className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label
                            htmlFor="reporter-contact"
                            className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                          >
                            Teléfono o correo de contacto (opcional)
                          </label>
                          <input
                            id="reporter-contact"
                            type="text"
                            maxLength={150}
                            value={reporterContact}
                            onChange={(e) => setReporterContact(e.target.value)}
                            placeholder="Ej. 600 000 000 o tu correo"
                            className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Relación con el club */}
                    <div className="space-y-2">
                      <span
                        id="reporter-relationship-label"
                        className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                      >
                        Relación con el club <span className="text-primary">*</span>
                      </span>
                      <div
                        role="group"
                        aria-labelledby="reporter-relationship-label"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                      >
                        {LOPIVI_REPORTER_RELATIONS.map((rel) => {
                          const checked = reporterRelationship === rel;
                          return (
                            <button
                              key={rel}
                              type="button"
                              onClick={() => setReporterRelationship(rel)}
                              aria-pressed={checked}
                              className={`px-3 py-2.5 border text-xs font-semibold text-left transition-colors cursor-pointer ${
                                checked
                                  ? 'bg-primary-container text-white border-primary-container'
                                  : 'bg-surface-container border-white/10 text-on-surface hover:border-white/30'
                              }`}
                            >
                              {rel}
                            </button>
                          );
                        })}
                      </div>
                      {reporterRelationship === 'Otra' && (
                        <input
                          type="text"
                          maxLength={90}
                          value={reporterRelationshipOther}
                          onChange={(e) => setReporterRelationshipOther(e.target.value)}
                          placeholder="Indica brevemente tu relación con el club (ej. familiar, voluntario/a, árbitro...)"
                          aria-label="Especificar otra relación con el club"
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                      )}
                    </div>

                    {/* Reserva de identidad */}
                    <div className="p-4 bg-surface-container border border-white/10 space-y-2.5">
                      <p className="text-xs sm:text-sm font-bold text-white">
                        {LOPIVI_KEY_MESSAGES.reservedIdentityQuestion}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setKeepIdentityReserved(true)}
                          aria-pressed={keepIdentityReserved}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                            keepIdentityReserved
                              ? 'bg-primary-container text-white border-primary-container'
                              : 'bg-surface-container-high text-tertiary border-white/15'
                          }`}
                        >
                          Sí, mantener reservada
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeepIdentityReserved(false)}
                          aria-pressed={!keepIdentityReserved}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                            !keepIdentityReserved
                              ? 'bg-primary-container text-white border-primary-container'
                              : 'bg-surface-container-high text-tertiary border-white/15'
                          }`}
                        >
                          No es necesario
                        </button>
                      </div>
                      <p className="text-xs text-tertiary leading-relaxed">
                        {LOPIVI_KEY_MESSAGES.confidentialityFormNotice}
                      </p>
                    </div>
                  </fieldset>

                  {/* Bloque 2: Datos del menor afectado (Sección 4) */}
                  <fieldset className="space-y-4 pt-4 border-t border-white/10">
                    <legend className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-container text-white text-xs flex items-center justify-center font-bold">
                        2
                      </span>
                      <span>Datos del menor afectado (opcional)</span>
                    </legend>
                    <p className="text-xs text-tertiary">
                      Si no conoces todos los datos o prefieres indicar solo la categoría o equipo,
                      puedes dejar en blanco los campos que no sepas.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="minor-name"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Nombre y apellidos del menor
                        </label>
                        <input
                          id="minor-name"
                          type="text"
                          maxLength={140}
                          value={minorName}
                          onChange={(e) => setMinorName(e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="minor-age"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Edad aproximada
                        </label>
                        <input
                          id="minor-age"
                          type="text"
                          maxLength={40}
                          value={minorAge}
                          onChange={(e) => setMinorAge(e.target.value)}
                          placeholder="Ej. 13 años"
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="minor-category"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Categoría deportiva
                        </label>
                        <input
                          id="minor-category"
                          type="text"
                          list="lopivi-categories-list"
                          maxLength={80}
                          value={minorCategory}
                          onChange={(e) => setMinorCategory(e.target.value)}
                          placeholder="Ej. Infantil, Cadete, Juvenil, Escuela..."
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                        <datalist id="lopivi-categories-list">
                          {categoryOptions.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="minor-team"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Equipo
                        </label>
                        <input
                          id="minor-team"
                          type="text"
                          list="lopivi-teams-list"
                          maxLength={100}
                          value={minorTeam}
                          onChange={(e) => setMinorTeam(e.target.value)}
                          placeholder="Ej. Infantil Femenino A"
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                        <datalist id="lopivi-teams-list">
                          {teamOptions.map((teamName) => (
                            <option key={teamName} value={teamName} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </fieldset>

                  {/* Bloque 3: Descripción de la incidencia y riesgo (Secciones 5 y 6) */}
                  <fieldset className="space-y-5 pt-4 border-t border-white/10">
                    <legend className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary-container text-white text-xs flex items-center justify-center font-bold">
                        3
                      </span>
                      <span>Qué ha ocurrido y valoración inicial de riesgo</span>
                    </legend>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="incident-date-text"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Fecha en la que ocurrieron los hechos (si se conoce)
                        </label>
                        <input
                          id="incident-date-text"
                          type="text"
                          maxLength={120}
                          value={incidentDateText}
                          onChange={(e) => setIncidentDateText(e.target.value)}
                          placeholder="Ej. 18/11/2026 o esta semana durante el entreno"
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="incident-location"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Lugar donde ocurrieron <span className="text-primary">*</span>
                        </label>
                        <select
                          id="incident-location"
                          value={incidentLocation}
                          onChange={(e) => setIncidentLocation(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white outline-none"
                        >
                          {LOPIVI_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {incidentLocation === 'Otro' && (
                      <input
                        type="text"
                        maxLength={90}
                        value={incidentLocationOther}
                        onChange={(e) => setIncidentLocationOther(e.target.value)}
                        placeholder="Especifica dónde ocurrió..."
                        aria-label="Especificar otro lugar"
                        className="w-full px-3.5 py-2.5 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none"
                      />
                    )}

                    {/* Tipo de situación comunicada */}
                    <div className="space-y-2">
                      <span
                        id="incident-types-label"
                        className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                      >
                        Tipo de situación comunicada (marca una o varias){' '}
                        <span className="text-primary">*</span>
                      </span>
                      <div
                        role="group"
                        aria-labelledby="incident-types-label"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                      >
                        {LOPIVI_SITUATION_TYPES.map((typeLabel) => {
                          const selected = incidentTypes.includes(typeLabel);
                          return (
                            <label
                              key={typeLabel}
                              className={`flex items-center gap-2.5 px-3 py-2.5 border text-xs font-medium cursor-pointer transition-colors ${
                                selected
                                  ? 'bg-primary-container/20 border-primary-container text-white'
                                  : 'bg-surface-container border-white/10 text-on-surface hover:border-white/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleIncidentType(typeLabel)}
                                className="w-4 h-4 accent-[#d90429] shrink-0"
                              />
                              <span>{typeLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Riesgo inmediato */}
                    <div className="space-y-2">
                      <span
                        id="immediate-risk-label"
                        className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                      >
                        ¿Existe riesgo inmediato para el menor?{' '}
                        <span className="text-primary">*</span>
                      </span>
                      <div
                        role="group"
                        aria-labelledby="immediate-risk-label"
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                      >
                        {LOPIVI_IMMEDIATE_RISK_OPTIONS.map((opt) => {
                          const selected = immediateRisk === opt.value;
                          const isUrgentSi = opt.value === 'SI';
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setImmediateRisk(opt.value)}
                              aria-pressed={selected}
                              className={`p-3 border text-left transition-colors cursor-pointer ${
                                selected
                                  ? isUrgentSi
                                    ? 'bg-rose-900/50 border-rose-500 text-white'
                                    : 'bg-primary-container/20 border-primary-container text-white'
                                  : 'bg-surface-container border-white/10 text-tertiary hover:border-white/30'
                              }`}
                            >
                              <p className="text-xs font-bold uppercase tracking-wider text-white">
                                {opt.label}
                              </p>
                              <p className="text-[11px] opacity-85 mt-1 leading-snug">
                                {opt.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {immediateRisk === 'SI' && (
                        <div className="p-3.5 bg-rose-950/50 border border-rose-500/60 flex items-start gap-2.5">
                          <AlertTriangle
                            className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <p className="text-xs text-rose-100 leading-relaxed">
                            <strong>Atención urgente:</strong> si existe peligro físico inmediato o
                            una urgencia médica en este instante, además de enviar este formulario,
                            llama directamente al{' '}
                            <a href="tel:112" className="underline font-bold text-white">
                              112
                            </a>{' '}
                            o al Delegado ({LOPIVI_DELEGATE.phone}).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Descripción objetiva de los hechos */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor="incident-description"
                          className="block text-xs font-bold uppercase tracking-wider text-on-surface"
                        >
                          Descripción objetiva de los hechos{' '}
                          <span className="text-primary">*</span>
                        </label>
                        <span className="text-[11px] text-tertiary">
                          {description.length} / 4000 caracteres
                        </span>
                      </div>
                      <textarea
                        id="incident-description"
                        rows={6}
                        maxLength={4000}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Cuéntanos qué ha pasado, quién estaba presente y cualquier detalle que ayude a proteger al menor..."
                        className="w-full px-3.5 py-3 bg-surface-container border border-white/15 focus:border-primary-container text-sm text-white placeholder:text-tertiary/80 outline-none resize-y"
                      />
                      <p className="text-xs text-tertiary leading-relaxed">
                        {LOPIVI_KEY_MESSAGES.objectiveDescriptionHint}
                      </p>
                    </div>
                  </fieldset>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-error-container/40 border border-error/40 text-xs sm:text-sm text-error flex items-start gap-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
                    <p className="text-xs text-tertiary max-w-xl leading-relaxed">
                      Al enviar, se generará un código de registro confidencial y se avisará de
                      forma segura al Delegado de Protección de Menores sin exponer identidades por
                      correo.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors shadow-[3px_3px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{submitting ? 'Cifrando y enviando...' : 'Enviar Comunicación Confidencial'}</span>
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* ==============================================================
              PESTAÑA 2: PROTOCOLO INTERNO FRENTE A LA VIOLENCIA
             ============================================================== */}
          {activeTab === 'protocolo' && (
            <section
              role="tabpanel"
              aria-label="Protocolo Interno Frente a la Violencia"
              className="space-y-6"
            >
              <div className="bg-surface-container-low border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                    Documento Oficial del Club · Temporada {LOPIVI_DELEGATE.season}
                  </span>
                  <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">
                    {LOPIVI_PROTOCOL_TITLE}
                  </h2>
                  <p className="text-xs text-tertiary">
                    {LOPIVI_DELEGATE.clubName} · Ámbito: {LOPIVI_DELEGATE.scope}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadProtocolPdf}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Descargar Protocolo Interno (PDF)</span>
                </button>
              </div>

              {/* Flujograma Visual en 5 Fases */}
              <div className="bg-surface-container-low border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                    Flujograma de Actuación (Apartado 8)
                  </span>
                  <h3 className="font-headline text-lg font-bold text-white">
                    ¿Cómo actuamos paso a paso ante una comunicación?
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {PROTOCOL_FLOW_PHASES.map((phase) => (
                    <div
                      key={phase.step}
                      className="bg-surface-container border border-white/10 p-3.5 space-y-2 relative"
                    >
                      <span className="inline-block px-2 py-0.5 bg-primary-container text-white text-[11px] font-bold tracking-wider">
                        FASE {phase.step}
                      </span>
                      <h4 className="text-sm font-bold text-white">{phase.title}</h4>
                      <p className="text-xs text-tertiary leading-relaxed">{phase.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Los 11 apartados completos plegables */}
              <div className="space-y-2.5">
                {LOPIVI_PROTOCOL_SECTIONS.map((sec) => (
                  <details
                    key={sec.number}
                    open={sec.number === 1}
                    className="group bg-surface-container-low border border-white/10 overflow-hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5 text-left hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                      <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wide border-l-4 border-primary-container pl-3">
                        {sec.title}
                      </h3>
                      <ChevronDown className="w-4 h-4 text-tertiary group-hover:text-white shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>

                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/10 space-y-3">
                      {sec.introParagraphs?.map((p, idx) => (
                        <p key={idx} className="text-xs sm:text-sm text-on-surface/90 leading-relaxed">
                          {p}
                        </p>
                      ))}

                      {sec.delegateBlock && (
                        <div className="p-4 bg-surface-container border border-primary-container/40 space-y-1">
                          <p className="text-sm font-bold text-white">{LOPIVI_DELEGATE.name}</p>
                          <p className="text-xs text-primary font-semibold">
                            {LOPIVI_DELEGATE.roleTitle} · {LOPIVI_DELEGATE.delegateTitle}
                          </p>
                          <p className="text-xs text-tertiary">
                            Correo: {LOPIVI_DELEGATE.email} · Teléfono: {LOPIVI_DELEGATE.phone}
                          </p>
                          <p className="text-xs font-bold text-white pt-2">Funciones principales:</p>
                        </div>
                      )}

                      {sec.bullets && (
                        <ul className="space-y-1.5 pl-1">
                          {sec.bullets.map((b, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-tertiary leading-relaxed"
                            >
                              <span
                                className="w-1.5 h-1.5 bg-primary-container mt-2 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {sec.subsections && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {sec.subsections.map((sub) => (
                            <div
                              key={sub.code}
                              className="bg-surface-container border border-white/10 p-4 space-y-2"
                            >
                              <h4 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wide">
                                {sub.title}
                              </h4>
                              <ul className="space-y-1.5">
                                {sub.bullets?.map((sb, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-xs text-tertiary leading-relaxed"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 bg-primary-container mt-1.5 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>{sb}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.phases && (
                        <div className="space-y-3 pt-1">
                          {sec.phases.map((ph) => (
                            <div
                              key={ph.phase}
                              className="bg-surface-container border border-white/10 p-4 space-y-2"
                            >
                              <h4 className="text-xs sm:text-sm font-bold text-white uppercase">
                                {ph.title}
                              </h4>
                              {ph.paragraphs?.map((pp, i) => (
                                <p key={i} className="text-xs sm:text-sm text-tertiary leading-relaxed">
                                  {pp}
                                </p>
                              ))}
                              {ph.bullets && (
                                <ul className="space-y-1 pl-1">
                                  {ph.bullets.map((pb, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-xs text-tertiary"
                                    >
                                      <span
                                        className="w-1.5 h-1.5 bg-primary-container mt-1.5 shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span>{pb}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.outroParagraphs?.map((p, idx) => (
                        <p key={idx} className="text-xs sm:text-sm text-on-surface/90 leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* ==============================================================
              PESTAÑA 3: CÓDIGO DE CONDUCTA Y CONVIVENCIA
             ============================================================== */}
          {activeTab === 'codigo' && (
            <section
              role="tabpanel"
              aria-label="Código de Conducta y Convivencia"
              className="space-y-6"
            >
              <div className="bg-surface-container-low border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                    Convivencia Deportiva y Buen Trato · {LOPIVI_DELEGATE.season}
                  </span>
                  <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">
                    {LOPIVI_CONDUCT_CODE_TITLE}
                  </h2>
                  <p className="text-xs text-tertiary">
                    Normas de convivencia, respeto y buen trato para familias y deportistas del club.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadConductPdf}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Descargar Código de Conducta (PDF)</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {LOPIVI_CONDUCT_CODE_SECTIONS.map((sec) => {
                  const itemsCount = (sec.bullets?.length || 0) + (sec.introParagraphs?.length || 0);
                  return (
                    <details
                      key={sec.number}
                      className="group bg-surface-container-low border border-white/10 overflow-hidden"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5 text-left hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                        <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wide border-l-4 border-primary-container pl-3">
                          {sec.title}
                        </h3>
                        <span className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-tertiary">
                          {itemsCount > 0 && <span>{itemsCount} pts.</span>}
                          <ChevronDown className="w-4 h-4 group-hover:text-white transition-transform group-open:rotate-180" aria-hidden="true" />
                        </span>
                      </summary>

                      <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/10 space-y-3">
                        {sec.introParagraphs?.map((p, idx) => (
                          <p key={idx} className="text-xs sm:text-sm text-on-surface/90 leading-relaxed">
                            {p}
                          </p>
                        ))}

                        {sec.delegateBlock && (
                          <div className="p-4 bg-surface-container border border-primary-container/40 space-y-1">
                            <p className="text-sm font-bold text-white">{LOPIVI_DELEGATE.name}</p>
                            <p className="text-xs text-tertiary">
                              Correo: {LOPIVI_DELEGATE.email} · Teléfono: {LOPIVI_DELEGATE.phone}
                            </p>
                          </div>
                        )}

                        {sec.bullets && (
                          <ul className="space-y-1.5 pl-1">
                            {sec.bullets.map((b, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-xs sm:text-sm text-tertiary leading-relaxed"
                              >
                                <span
                                  className="w-1.5 h-1.5 bg-primary-container mt-2 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {sec.outroParagraphs?.map((p, idx) => (
                          <p key={idx} className="text-xs sm:text-sm text-on-surface/90 leading-relaxed">
                            {p}
                          </p>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==============================================================
              PESTAÑA 4: MARCO LEGAL (LOPIVI Y PROTOCOLO ANDALUZ)
             ============================================================== */}
          {activeTab === 'marco-legal' && (
            <section
              role="tabpanel"
              aria-label="Marco Legal LOPIVI y Protocolo Andaluz"
              className="space-y-6"
            >
              <div className="bg-surface-container-low border border-white/10 p-5 sm:p-6 space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-primary font-bold">
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Marco Normativo Oficial</span>
                </div>
                <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">
                  Normativa Estatal (LOPIVI) y Protocolo Marco de la Junta de Andalucía
                </h2>
                <p className="text-xs sm:text-sm text-tertiary leading-relaxed">
                  Protocolo obligatorio desde el 1 de julio de 2025 (Orden de 18 de noviembre de 2024) para entidades deportivas con menores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LOPIVI_LEGAL_NORMS.map((norm) => (
                  <div
                    key={norm.id}
                    className="bg-surface-container-low border border-white/10 p-5 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {norm.scope}
                        </span>
                        <span className="text-[11px] text-tertiary">{norm.reference}</span>
                      </div>
                      <h3 className="font-headline text-base font-bold text-white leading-snug">
                        {norm.title}
                      </h3>
                      <p className="text-xs text-tertiary leading-relaxed">{norm.summary}</p>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <a
                        href={norm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline break-words"
                      >
                        <span>{norm.urlLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* 6 Obligaciones Legales del Club plegables */}
              <div className="bg-surface-container-low border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
                    Cumplimiento Activo del Club
                  </span>
                  <h3 className="font-headline text-lg sm:text-xl font-bold text-white">
                    6 Pilares Obligatorios de Protección en el Deporte Base
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LOPIVI_CLUB_OBLIGATIONS.map((ob) => (
                    <details
                      key={ob.number}
                      className="group bg-surface-container border border-white/10 overflow-hidden"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-primary shrink-0">
                            {ob.number}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {ob.title}
                          </h4>
                        </div>
                        <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="px-3.5 pb-3.5 pt-2 border-t border-white/10 text-xs text-tertiary leading-relaxed">
                        {ob.description}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
