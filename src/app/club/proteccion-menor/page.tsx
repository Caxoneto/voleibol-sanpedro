'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { CLUB_CATEGORIES_META, CLUB_CATEGORY_FAMILIES } from '@/lib/club-info';
import {
  LOPIVI_AUTHORITIES,
  LOPIVI_CHANNELS,
  LOPIVI_DELEGATE,
  LOPIVI_IMMEDIATE_MEASURES,
  LOPIVI_IMMEDIATE_RISK_OPTIONS,
  LOPIVI_LOCATIONS,
  LOPIVI_REPORTER_RELATIONS,
  LOPIVI_SITUATION_TYPES,
  LOPIVI_STATUS_LIST,
  LOPIVI_STATUS_META,
  type LopiviChannel,
  type LopiviImmediateRisk,
  type LopiviIncidentStatus,
} from '@/lib/lopivi-content';
import {
  generateLopiviConductCodePdf,
  generateLopiviIncidentRecordPdf,
  generateLopiviProtocolPdf,
} from '@/lib/pdf-lopivi';

interface LopiviIncidentItem {
  id: string;
  recordCode: string;
  channel: LopiviChannel;
  reporterRelationship: string;
  isAnonymous: boolean;
  keepIdentityReserved: boolean;
  reporterName: string;
  reporterContact: string;
  minorName: string;
  minorAge: string;
  minorCategory: string;
  minorTeam: string;
  incidentDateText: string;
  incidentLocation: string;
  incidentTypes: string[];
  immediateRisk: LopiviImmediateRisk;
  description: string;
  measuresTaken: string[];
  measuresDescription: string;
  authoritiesNotified: string[];
  authorityNotificationDate: string;
  authorityRecipient: string;
  authorityReference: string;
  followUpDate: string;
  followUpMeasures: string;
  followUpEvolution: string;
  followUpActions: string;
  closedDate: string;
  observations: string;
  status: LopiviIncidentStatus;
  createdAt: string;
  updatedAt: string;
  receivedDateText: string;
  receivedTimeText: string;
  receivedAtMadrid: string;
  updatedAtMadrid: string;
  decryptionIntegrityWarning: boolean;
}

interface LopiviStats {
  total: number;
  open: number;
  immediateRiskActive: number;
  byStatus: Record<LopiviIncidentStatus, number>;
}

const CHANNEL_LABEL_MAP = new Map(LOPIVI_CHANNELS.map((c) => [c.value, c.label]));
const MANUAL_CHANNELS = LOPIVI_CHANNELS.filter((c) => c.value !== 'CANAL_WEB');

export default function ClubProteccionMenorPage() {
  const { session } = useClubSession();
  const isAuthorized = session.isPresident;

  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<LopiviIncidentItem[]>([]);
  const [stats, setStats] = useState<LopiviStats>({
    total: 0,
    open: 0,
    immediateRiskActive: 0,
    byStatus: {
      RECIBIDA: 0,
      EN_VALORACION: 0,
      MEDIDAS_ADOPTADAS: 0,
      DERIVADA_AUTORIDADES: 0,
      EN_SEGUIMIENTO: 0,
      CERRADA: 0,
    },
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyImmediateRisk, setOnlyImmediateRisk] = useState(false);

  // Selección de expediente y borrador de gestión (Secciones 6-9)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<LopiviIncidentStatus>('RECIBIDA');
  const [draftRisk, setDraftRisk] = useState<LopiviImmediateRisk>('NO_DETERMINADO');
  const [draftMeasures, setDraftMeasures] = useState<string[]>([]);
  const [draftMeasuresOther, setDraftMeasuresOther] = useState('');
  const [draftMeasuresDesc, setDraftMeasuresDesc] = useState('');
  const [draftAuthorities, setDraftAuthorities] = useState<string[]>([]);
  const [draftAuthoritiesOther, setDraftAuthoritiesOther] = useState('');
  const [draftAuthDate, setDraftAuthDate] = useState('');
  const [draftAuthRecipient, setDraftAuthRecipient] = useState('');
  const [draftAuthRef, setDraftAuthRef] = useState('');
  const [draftFollowDate, setDraftFollowDate] = useState('');
  const [draftFollowMeasures, setDraftFollowMeasures] = useState('');
  const [draftFollowEvolution, setDraftFollowEvolution] = useState('');
  const [draftFollowActions, setDraftFollowActions] = useState('');
  const [draftClosedDate, setDraftClosedDate] = useState('');
  const [draftObservations, setDraftObservations] = useState('');
  const [savingManagement, setSavingManagement] = useState(false);

  // Modales
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [mChannel, setMChannel] = useState<LopiviChannel>('PRESENCIAL');
  const [mIsAnonymous, setMIsAnonymous] = useState(false);
  const [mKeepReserved, setMKeepReserved] = useState(true);
  const [mReporterName, setMReporterName] = useState('');
  const [mReporterContact, setMReporterContact] = useState('');
  const [mRelation, setMRelation] = useState('Padre, madre o tutor legal');
  const [mRelationOther, setMRelationOther] = useState('');
  const [mMinorName, setMMinorName] = useState('');
  const [mMinorAge, setMMinorAge] = useState('');
  const [mMinorCategory, setMMinorCategory] = useState('');
  const [mMinorTeam, setMMinorTeam] = useState('');
  const [mIncidentDateText, setMIncidentDateText] = useState('');
  const [mLocation, setMLocation] = useState('Entrenamiento');
  const [mLocationOther, setMLocationOther] = useState('');
  const [mIncidentTypes, setMIncidentTypes] = useState<string[]>([]);
  const [mImmediateRisk, setMImmediateRisk] = useState<LopiviImmediateRisk>('NO_DETERMINADO');
  const [mDescription, setMDescription] = useState('');
  const [mInitialMeasures, setMInitialMeasures] = useState<string[]>([]);
  const [mInitialMeasuresDesc, setMInitialMeasuresDesc] = useState('');
  const [mSubmitting, setMSubmitting] = useState(false);
  const [mError, setMError] = useState<string | null>(null);

  const selectedIncident = useMemo(
    () => incidents.find((item) => item.id === selectedId) || null,
    [incidents, selectedId]
  );

  const hydrateManagementDraft = useCallback((item: LopiviIncidentItem) => {
    setDraftStatus(item.status);
    setDraftRisk(item.immediateRisk);

    const standardMeasures = new Set(LOPIVI_IMMEDIATE_MEASURES);
    const baseMeasures: string[] = [];
    let customMeasure = '';
    for (const m of item.measuresTaken) {
      if (standardMeasures.has(m)) {
        baseMeasures.push(m);
      } else if (m.toLowerCase().startsWith('otras medidas:')) {
        if (!baseMeasures.includes('Otras medidas')) baseMeasures.push('Otras medidas');
        customMeasure = m.replace(/^otras medidas:\s*/i, '');
      }
    }
    setDraftMeasures(baseMeasures);
    setDraftMeasuresOther(customMeasure);
    setDraftMeasuresDesc(item.measuresDescription);

    const standardAuths = new Set(LOPIVI_AUTHORITIES);
    const baseAuths: string[] = [];
    let customAuth = '';
    for (const a of item.authoritiesNotified) {
      if (standardAuths.has(a)) {
        baseAuths.push(a);
      } else if (a.toLowerCase().startsWith('otros:')) {
        if (!baseAuths.includes('Otros')) baseAuths.push('Otros');
        customAuth = a.replace(/^otros:\s*/i, '');
      }
    }
    setDraftAuthorities(baseAuths);
    setDraftAuthoritiesOther(customAuth);
    setDraftAuthDate(item.authorityNotificationDate);
    setDraftAuthRecipient(item.authorityRecipient);
    setDraftAuthRef(item.authorityReference);

    setDraftFollowDate(item.followUpDate);
    setDraftFollowMeasures(item.followUpMeasures);
    setDraftFollowEvolution(item.followUpEvolution);
    setDraftFollowActions(item.followUpActions);
    setDraftClosedDate(item.closedDate);
    setDraftObservations(item.observations);
  }, []);

  const loadIncidents = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/intranet/lopivi', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo cargar el registro confidencial LOPIVI.');
      }
      const list = (data.incidents || []) as LopiviIncidentItem[];
      setIncidents(list);
      if (data.stats) {
        setStats(data.stats as LopiviStats);
      }
      setSelectedId((prev) => {
        if (prev && list.some((x) => x.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error cargando expedientes LOPIVI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadIncidents();
  }, [isAuthorized, loadIncidents]);

  useEffect(() => {
    if (selectedIncident) {
      hydrateManagementDraft(selectedIncident);
    }
  }, [selectedIncident, hydrateManagementDraft]);

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (onlyImmediateRisk && item.immediateRisk !== 'SI') return false;
      if (!q) return true;
      return (
        item.recordCode.toLowerCase().includes(q) ||
        item.minorName.toLowerCase().includes(q) ||
        item.minorCategory.toLowerCase().includes(q) ||
        item.minorTeam.toLowerCase().includes(q) ||
        item.reporterName.toLowerCase().includes(q) ||
        item.incidentLocation.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [incidents, searchQuery, statusFilter, onlyImmediateRisk]);

  function toggleListValue(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }

  async function handleSaveManagement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIncident || savingManagement) return;
    setSavingManagement(true);
    setErrorMsg(null);
    setFeedbackMsg(null);

    const finalMeasures = draftMeasures.map((m) =>
      m === 'Otras medidas' && draftMeasuresOther.trim()
        ? `Otras medidas: ${draftMeasuresOther.trim()}`
        : m
    );
    const finalAuths = draftAuthorities.map((a) =>
      a === 'Otros' && draftAuthoritiesOther.trim()
        ? `Otros: ${draftAuthoritiesOther.trim()}`
        : a
    );

    try {
      const res = await fetch('/api/intranet/lopivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_incident_management',
          incidentId: selectedIncident.id,
          status: draftStatus,
          immediateRisk: draftRisk,
          measuresTaken: finalMeasures,
          measuresDescription: draftMeasuresDesc,
          authoritiesNotified: finalAuths,
          authorityNotificationDate: draftAuthDate,
          authorityRecipient: draftAuthRecipient,
          authorityReference: draftAuthRef,
          followUpDate: draftFollowDate,
          followUpMeasures: draftFollowMeasures,
          followUpEvolution: draftFollowEvolution,
          followUpActions: draftFollowActions,
          closedDate: draftClosedDate,
          observations: draftObservations,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el expediente.');
      }

      const updated = data.incident as LopiviIncidentItem;
      setIncidents((prev) => {
        const next = prev.map((it) => (it.id === updated.id ? updated : it));
        recomputeLocalStats(next);
        return next;
      });
      setManagementModalOpen(false);
      window.dispatchEvent(new Event('cdv-refresh-me'));
      setFeedbackMsg(`Expediente ${updated.recordCode} guardado y cifrado correctamente.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando la gestión del expediente.');
    } finally {
      setSavingManagement(false);
    }
  }

  function recomputeLocalStats(list: LopiviIncidentItem[]) {
    const byStatus: Record<LopiviIncidentStatus, number> = {
      RECIBIDA: 0,
      EN_VALORACION: 0,
      MEDIDAS_ADOPTADAS: 0,
      DERIVADA_AUTORIDADES: 0,
      EN_SEGUIMIENTO: 0,
      CERRADA: 0,
    };
    let open = 0;
    let immediateRiskActive = 0;
    for (const item of list) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      if (item.status !== 'CERRADA') {
        open += 1;
        if (item.immediateRisk === 'SI') immediateRiskActive += 1;
      }
    }
    setStats({
      total: list.length,
      open,
      immediateRiskActive,
      byStatus,
    });
  }

  async function handleCreateManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mSubmitting) return;
    setMError(null);

    if (mIncidentTypes.length === 0) {
      setMError('Selecciona al menos un tipo de situación comunicada.');
      return;
    }
    if (mDescription.trim().length < 10) {
      setMError('La descripción objetiva de los hechos debe tener al menos 10 caracteres.');
      return;
    }

    setMSubmitting(true);
    try {
      const res = await fetch('/api/intranet/lopivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_manual_incident',
          channel: mChannel,
          isAnonymous: mIsAnonymous,
          keepIdentityReserved: mKeepReserved,
          reporterName: mIsAnonymous ? '' : mReporterName.trim(),
          reporterContact: mIsAnonymous ? '' : mReporterContact.trim(),
          reporterRelationship: mRelation,
          reporterRelationshipOther: mRelationOther.trim(),
          minorName: mMinorName.trim(),
          minorAge: mMinorAge.trim(),
          minorCategory: mMinorCategory.trim(),
          minorTeam: mMinorTeam.trim(),
          incidentDateText: mIncidentDateText.trim(),
          incidentLocation: mLocation,
          incidentLocationOther: mLocationOther.trim(),
          incidentTypes: mIncidentTypes,
          immediateRisk: mImmediateRisk,
          description: mDescription.trim(),
          measuresTaken: mInitialMeasures,
          measuresDescription: mInitialMeasuresDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar la incidencia.');
      }

      const created = data.incident as LopiviIncidentItem;
      setIncidents((prev) => {
        const next = [created, ...prev];
        recomputeLocalStats(next);
        return next;
      });
      setSelectedId(created.id);
      setManualOpen(false);
      window.dispatchEvent(new Event('cdv-refresh-me'));
      setFeedbackMsg(`Incidencia registrada con código confidencial ${created.recordCode}.`);

      // Reset modal
      setMReporterName('');
      setMReporterContact('');
      setMRelationOther('');
      setMMinorName('');
      setMMinorAge('');
      setMMinorCategory('');
      setMMinorTeam('');
      setMIncidentDateText('');
      setMLocationOther('');
      setMIncidentTypes([]);
      setMImmediateRisk('NO_DETERMINADO');
      setMDescription('');
      setMInitialMeasures([]);
      setMInitialMeasuresDesc('');
    } catch (err) {
      setMError(err instanceof Error ? err.message : 'Error registrando incidencia manual.');
    } finally {
      setMSubmitting(false);
    }
  }

  function handleExportSelectedPdf(item: LopiviIncidentItem) {
    const doc = generateLopiviIncidentRecordPdf({
      variant: 'INTERNAL',
      recordCode: item.recordCode,
      receivedAtIso: item.createdAt,
      receivedDateText: item.receivedDateText,
      receivedTimeText: item.receivedTimeText,
      channel: item.channel,
      reporterName: item.reporterName,
      reporterRelationship: item.reporterRelationship,
      reporterContact: item.reporterContact,
      isAnonymous: item.isAnonymous,
      keepIdentityReserved: item.keepIdentityReserved,
      minorName: item.minorName,
      minorAge: item.minorAge,
      minorCategory: item.minorCategory,
      minorTeam: item.minorTeam,
      incidentDateText: item.incidentDateText,
      incidentLocation: item.incidentLocation,
      incidentTypes: item.incidentTypes,
      immediateRisk: item.immediateRisk,
      description: item.description,
      measuresTaken: item.measuresTaken,
      measuresDescription: item.measuresDescription,
      authoritiesNotified: item.authoritiesNotified,
      authorityNotificationDate: item.authorityNotificationDate,
      authorityRecipient: item.authorityRecipient,
      authorityReference: item.authorityReference,
      followUpDate: item.followUpDate,
      followUpMeasures: item.followUpMeasures,
      followUpEvolution: item.followUpEvolution,
      followUpActions: item.followUpActions,
      closedDate: item.closedDate,
      observations: item.observations,
      status: item.status,
    });
    doc.save(`Expediente_Confidencial_${item.recordCode}.pdf`);
  }

  if (!isAuthorized) {
    return (
      <div className="bg-surface-container border border-rose-500/40 p-6 sm:p-10 max-w-2xl mx-auto my-6 space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <Lock className="w-7 h-7 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold">
              Acceso Restringido · Ley LOPIVI
            </p>
            <h1 className="font-headline text-xl sm:text-2xl font-bold text-white">
              Registro Confidencial Exclusivo del Delegado de Protección
            </h1>
          </div>
        </div>
        <p className="text-sm text-tertiary leading-relaxed">
          Por imperativo de la Ley Orgánica 8/2021 (LOPIVI) y el Protocolo Interno de Protección de
          Menores, la lectura y gestión de expedientes confidenciales está restringida
          exclusivamente al Presidente / Delegado de Protección de Menores (
          <strong className="text-white">{LOPIVI_DELEGATE.name}</strong>).
        </p>
        <p className="text-xs text-tertiary leading-relaxed">
          Si como miembro del cuerpo técnico o directiva necesitas comunicar una incidencia o
          sospecha, utiliza el{' '}
          <a href="/proteccion-menor" className="text-primary underline font-semibold">
            Canal Confidencial de Protección del Menor
          </a>{' '}
          o contacta directamente al {LOPIVI_DELEGATE.phone}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Cabecera del módulo */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/45 text-rose-200 text-[10px] font-bold uppercase tracking-widest">
                <Lock className="w-3 h-3 text-rose-400 shrink-0" aria-hidden="true" />
                <span>Confidencial · AES-256-GCM</span>
              </span>
              <span className="text-[11px] uppercase tracking-wider text-tertiary font-semibold">
                Delegado: {LOPIVI_DELEGATE.name}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Protección del Menor y Registro LOPIVI
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMError(null);
                setManualOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold tracking-wider transition-colors cursor-pointer shadow-[3px_3px_0px_0px_#0e0e0e]"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Registrar incidencia</span>
            </button>
            <button
              type="button"
              onClick={() => setTemplatesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Plantillas PDF</span>
            </button>
            <button
              type="button"
              onClick={() => loadIncidents()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
            Total Expedientes
          </p>
          <p className="font-headline text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface-container border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
            Abiertos / En Gestión
          </p>
          <p className="font-headline text-2xl font-bold text-amber-300 mt-1">{stats.open}</p>
        </div>
        <div
          className={`border p-4 ${
            stats.immediateRiskActive > 0
              ? 'bg-rose-950/50 border-rose-500/60'
              : 'bg-surface-container border-white/10'
          }`}
        >
          <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
            Riesgo Inmediato Activo
          </p>
          <p
            className={`font-headline text-2xl font-bold mt-1 ${
              stats.immediateRiskActive > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {stats.immediateRiskActive}
          </p>
        </div>
        <div className="bg-surface-container border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-tertiary font-bold">
            Derivados / Cerrados
          </p>
          <p className="font-headline text-2xl font-bold text-white mt-1">
            {stats.byStatus.DERIVADA_AUTORIDADES} / {stats.byStatus.CERRADA}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 bg-error-container/40 border border-error/40 text-xs sm:text-sm text-error flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {feedbackMsg && (
        <div
          role="status"
          className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 text-xs sm:text-sm text-emerald-200 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="bg-surface-container border border-white/10 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 relative">
          <Search
            className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, menor, equipo, lugar o hechos..."
            aria-label="Buscar expedientes LOPIVI"
            className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-white/15 focus:border-primary-container text-xs sm:text-sm text-white placeholder:text-tertiary/60 outline-none"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado del expediente"
            className="w-full px-3 py-2 bg-surface-container-low border border-white/15 focus:border-primary-container text-xs sm:text-sm text-white outline-none"
          >
            <option value="ALL">Todos los estados ({incidents.length})</option>
            {LOPIVI_STATUS_LIST.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label} ({stats.byStatus[st.value] || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex items-center">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyImmediateRisk}
              onChange={(e) => setOnlyImmediateRisk(e.target.checked)}
              className="w-4 h-4 accent-[#d90429]"
            />
            <span>Solo Riesgo Inmediato (SÍ)</span>
          </label>
        </div>
      </div>

      {/* Layout principal: Listado izquierda + Panel de gestión Secciones 1-10 derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Lista de expedientes */}
        <div className="xl:col-span-4 space-y-2.5">
          {loading ? (
            <div className="bg-surface-container border border-white/10 p-6 text-center text-xs text-tertiary">
              Descifrando registro confidencial...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-surface-container border border-white/10 p-6 text-center space-y-2">
              <ShieldCheck className="w-7 h-7 text-primary mx-auto opacity-80" aria-hidden="true" />
              <p className="text-sm font-bold text-white">
                {incidents.length === 0
                  ? 'No hay incidencias registradas todavía'
                  : 'No hay expedientes que coincidan con el filtro'}
              </p>
              <p className="text-xs text-tertiary">
                Las comunicaciones enviadas desde /proteccion-menor o registradas manualmente
                aparecerán aquí cifradas.
              </p>
            </div>
          ) : (
            filteredIncidents.map((item) => {
              const statusMeta = LOPIVI_STATUS_META[item.status];
              const isSelected = item.id === selectedId;
              const isUrgent = item.immediateRisk === 'SI' && item.status !== 'CERRADA';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setFeedbackMsg(null);
                  }}
                  className={`w-full text-left p-4 border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-surface-container-high border-primary-container shadow-[3px_3px_0px_0px_#d90429]'
                      : isUrgent
                      ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400'
                      : 'bg-surface-container border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {item.recordCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {item.immediateRisk === 'SI' && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>RIESGO INMEDIATO: SÍ</span>
                    </div>
                  )}

                  <div className="text-xs text-on-surface space-y-0.5">
                    <p className="font-semibold truncate">
                      {item.minorName || item.minorCategory || 'Menor sin identificar'}
                      {item.minorTeam ? ` · ${item.minorTeam}` : ''}
                    </p>
                    <p className="text-tertiary truncate">
                      {CHANNEL_LABEL_MAP.get(item.channel) || item.channel} ·{' '}
                      {item.receivedAtMadrid}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {item.incidentTypes.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 bg-surface-container-low border border-white/10 text-[10px] text-tertiary"
                      >
                        {t}
                      </span>
                    ))}
                    {item.incidentTypes.length > 2 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-tertiary">
                        +{item.incidentTypes.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Panel derecho: Vista resumen Secciones 1-9 */}
        <div className="xl:col-span-8">
          {!selectedIncident ? (
            <div className="bg-surface-container border border-white/10 p-8 text-center text-sm text-tertiary">
              Selecciona un expediente del listado para consultar los datos descifrados y gestionar
              actuaciones.
            </div>
          ) : (
            <div className="bg-surface-container border border-white/10 p-5 sm:p-6 space-y-6">
              {/* Cabecera del expediente seleccionado (Secciones 1-2) */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">
                      {selectedIncident.recordCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        LOPIVI_STATUS_META[selectedIncident.status].badgeClass
                      }`}
                    >
                      {LOPIVI_STATUS_META[selectedIncident.status].label}
                    </span>
                    {selectedIncident.immediateRisk === 'SI' && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        RIESGO INMEDIATO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-tertiary">
                    Recibido el {selectedIncident.receivedDateText} a las{' '}
                    {selectedIncident.receivedTimeText} (Europe/Madrid) · Vía:{' '}
                    <strong className="text-white">
                      {CHANNEL_LABEL_MAP.get(selectedIncident.channel) || selectedIncident.channel}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      hydrateManagementDraft(selectedIncident);
                      setManagementModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_#0e0e0e]"
                  >
                    <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Gestionar actuaciones</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSelectedPdf(selectedIncident)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-white text-xs font-label-md uppercase font-bold tracking-wider cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>Exportar PDF</span>
                  </button>
                </div>
              </div>

              {selectedIncident.decryptionIntegrityWarning && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Aviso técnico: algún campo cifrado de este expediente no superó la verificación
                    de integridad o clave AAD.
                  </span>
                </div>
              )}

              {/* Secciones 3-4: Persona comunicante y menor afectado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sección 3 */}
                <div className="bg-surface-container-low border border-white/10 p-4 space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Sección 3 · Persona que comunica
                  </h2>
                  <dl className="text-xs space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Modalidad:</dt>
                      <dd className="text-white font-semibold text-right">
                        {selectedIncident.isAnonymous ? 'Anónima' : 'Identificada'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Nombre:</dt>
                      <dd className="text-white font-semibold text-right break-words">
                        {selectedIncident.isAnonymous
                          ? 'COMUNICACIÓN ANÓNIMA'
                          : selectedIncident.reporterName || 'No facilitado'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Relación:</dt>
                      <dd className="text-white text-right break-words">
                        {selectedIncident.reporterRelationship}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Contacto:</dt>
                      <dd className="text-white text-right break-all">
                        {selectedIncident.isAnonymous
                          ? '—'
                          : selectedIncident.reporterContact || 'No facilitado'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Reserva de identidad:</dt>
                      <dd className="text-amber-300 font-semibold text-right">
                        {selectedIncident.keepIdentityReserved ? 'SÍ (Mantener reservada)' : 'NO'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Sección 4 */}
                <div className="bg-surface-container-low border border-white/10 p-4 space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Sección 4 · Datos del menor afectado
                  </h2>
                  <dl className="text-xs space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Nombre y apellidos:</dt>
                      <dd className="text-white font-semibold text-right break-words">
                        {selectedIncident.minorName || 'No especificado'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Edad:</dt>
                      <dd className="text-white text-right">
                        {selectedIncident.minorAge || 'No especificada'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Categoría:</dt>
                      <dd className="text-white text-right break-words">
                        {selectedIncident.minorCategory || 'No especificada'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-tertiary">Equipo:</dt>
                      <dd className="text-white text-right break-words">
                        {selectedIncident.minorTeam || 'No especificado'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Sección 5: Descripción de la incidencia */}
              <div className="bg-surface-container-low border border-white/10 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Sección 5 · Descripción de la incidencia
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-tertiary">Fecha de los hechos: </span>
                    <strong className="text-white">
                      {selectedIncident.incidentDateText || 'No especificada'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-tertiary">Lugar: </span>
                    <strong className="text-white">{selectedIncident.incidentLocation}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIncident.incidentTypes.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 bg-primary-container/15 border border-primary-container/40 text-xs text-white font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="p-3.5 bg-surface-container border border-white/10 text-xs sm:text-sm text-on-surface whitespace-pre-wrap leading-relaxed break-words">
                  {selectedIncident.description}
                </div>
              </div>

              {/* Resumen estado actual Secciones 6-9 plegables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10 items-start">
                {/* Sección 6 */}
                <details
                  open={selectedIncident.measuresTaken.length > 0 || Boolean(selectedIncident.measuresDescription)}
                  className="group bg-surface-container-low border border-white/10 text-xs overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span className="font-bold uppercase tracking-wider text-primary">
                      Sección 6 · Riesgo y medidas ({selectedIncident.measuresTaken.length})
                    </span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="p-3.5 pt-2 border-t border-white/10 space-y-2.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-tertiary">Riesgo inmediato:</span>
                      <span
                        className={`font-bold ${
                          selectedIncident.immediateRisk === 'SI'
                            ? 'text-rose-400'
                            : selectedIncident.immediateRisk === 'NO'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {LOPIVI_IMMEDIATE_RISK_OPTIONS.find(
                          (o) => o.value === selectedIncident.immediateRisk
                        )?.label || selectedIncident.immediateRisk}
                      </span>
                    </div>
                    {selectedIncident.measuresTaken.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedIncident.measuresTaken.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 bg-surface-container border border-white/10 text-[11px] text-on-surface"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-tertiary italic">Sin medidas inmediatas marcadas.</p>
                    )}
                    {selectedIncident.measuresDescription && (
                      <p className="p-2.5 bg-surface-container border border-white/10 text-on-surface whitespace-pre-wrap break-words">
                        {selectedIncident.measuresDescription}
                      </p>
                    )}
                  </div>
                </details>

                {/* Sección 7 */}
                <details
                  open={selectedIncident.authoritiesNotified.length > 0}
                  className="group bg-surface-container-low border border-white/10 text-xs overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span className="font-bold uppercase tracking-wider text-primary">
                      Sección 7 · Autoridades ({selectedIncident.authoritiesNotified.length})
                    </span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="p-3.5 pt-2 border-t border-white/10 space-y-2.5">
                    {selectedIncident.authoritiesNotified.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedIncident.authoritiesNotified.map((a) => (
                          <span
                            key={a}
                            className="px-2 py-0.5 bg-surface-container border border-white/10 text-[11px] text-on-surface"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-tertiary italic">Sin comunicaciones a autoridades.</p>
                    )}
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-tertiary">Fecha comunicación:</dt>
                        <dd className="text-white text-right">
                          {selectedIncident.authorityNotificationDate || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-tertiary">Entidad / receptor:</dt>
                        <dd className="text-white text-right break-words">
                          {selectedIncident.authorityRecipient || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-tertiary">Nº expediente / ref.:</dt>
                        <dd className="text-white font-mono text-right break-all">
                          {selectedIncident.authorityReference || '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </details>

                {/* Sección 8 */}
                <details
                  open={Boolean(
                    selectedIncident.followUpDate ||
                      selectedIncident.closedDate ||
                      selectedIncident.followUpMeasures ||
                      selectedIncident.followUpEvolution ||
                      selectedIncident.followUpActions
                  )}
                  className="group bg-surface-container-low border border-white/10 text-xs overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span className="font-bold uppercase tracking-wider text-primary">
                      Sección 8 · Seguimiento y cierre
                    </span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="p-3.5 pt-2 border-t border-white/10 space-y-2.5">
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-tertiary">Fecha de seguimiento:</dt>
                        <dd className="text-white text-right">
                          {selectedIncident.followUpDate || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-tertiary">Fecha cierre / revisión:</dt>
                        <dd className="text-white text-right">
                          {selectedIncident.closedDate || '—'}
                        </dd>
                      </div>
                    </dl>
                    {selectedIncident.followUpMeasures && (
                      <div>
                        <p className="text-[11px] text-tertiary mb-0.5">Medidas mantenidas:</p>
                        <p className="p-2 bg-surface-container border border-white/10 text-on-surface whitespace-pre-wrap break-words">
                          {selectedIncident.followUpMeasures}
                        </p>
                      </div>
                    )}
                    {selectedIncident.followUpEvolution && (
                      <div>
                        <p className="text-[11px] text-tertiary mb-0.5">Evolución:</p>
                        <p className="p-2 bg-surface-container border border-white/10 text-on-surface whitespace-pre-wrap break-words">
                          {selectedIncident.followUpEvolution}
                        </p>
                      </div>
                    )}
                    {selectedIncident.followUpActions && (
                      <div>
                        <p className="text-[11px] text-tertiary mb-0.5">Nuevas actuaciones:</p>
                        <p className="p-2 bg-surface-container border border-white/10 text-on-surface whitespace-pre-wrap break-words">
                          {selectedIncident.followUpActions}
                        </p>
                      </div>
                    )}
                    {!selectedIncident.followUpDate &&
                      !selectedIncident.closedDate &&
                      !selectedIncident.followUpMeasures &&
                      !selectedIncident.followUpEvolution &&
                      !selectedIncident.followUpActions && (
                        <p className="text-tertiary italic">Sin actuaciones de seguimiento aún.</p>
                      )}
                  </div>
                </details>

                {/* Sección 9 */}
                <details
                  open={Boolean(selectedIncident.observations)}
                  className="group bg-surface-container-low border border-white/10 text-xs overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span className="font-bold uppercase tracking-wider text-primary">
                      Sección 9 · Observaciones
                    </span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="p-3.5 pt-2 border-t border-white/10 space-y-2.5">
                    {selectedIncident.observations ? (
                      <p className="p-2.5 bg-surface-container border border-white/10 text-on-surface whitespace-pre-wrap break-words">
                        {selectedIncident.observations}
                      </p>
                    ) : (
                      <p className="text-tertiary italic">Sin observaciones adicionales.</p>
                    )}
                    <p className="text-[11px] text-tertiary pt-1">
                      Última actualización: <strong className="text-on-surface">{selectedIncident.updatedAtMadrid}</strong>
                    </p>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Documentación Oficial LOPIVI (Plantillas PDF) */}
      <IntranetModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        title="Documentación Oficial LOPIVI"
        subtitle="Descarga los documentos y modelos oficiales del protocolo de protección del menor"
        size="md"
        accent="rose"
      >
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() =>
              generateLopiviIncidentRecordPdf({ isBlank: true }).save(
                'Modelo_Comunicacion_Incidencias_LOPIVI_En_Blanco.pdf'
              )
            }
            className="w-full flex items-center justify-between gap-3 p-3.5 bg-surface-container hover:bg-surface-container-high border border-white/10 text-left transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Modelo en blanco</p>
              <p className="text-xs text-tertiary">Hoja oficial de comunicación y registro (Secciones 1–10)</p>
            </div>
            <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() =>
              generateLopiviProtocolPdf().save(
                'Protocolo_Interno_Proteccion_Menores_CDV_San_Pedro.pdf'
              )
            }
            className="w-full flex items-center justify-between gap-3 p-3.5 bg-surface-container hover:bg-surface-container-high border border-white/10 text-left transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Protocolo</p>
              <p className="text-xs text-tertiary">Protocolo interno de protección frente a la violencia</p>
            </div>
            <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() =>
              generateLopiviConductCodePdf().save('Codigo_Conducta_Convivencia_CDV_San_Pedro.pdf')
            }
            className="w-full flex items-center justify-between gap-3 p-3.5 bg-surface-container hover:bg-surface-container-high border border-white/10 text-left transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Código de conducta</p>
              <p className="text-xs text-tertiary">Código de conducta y convivencia del club</p>
            </div>
            <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          </button>
        </div>
      </IntranetModal>

      {/* Modal: Gestión del Delegado (Secciones 6-10) */}
      <IntranetModal
        isOpen={managementModalOpen && Boolean(selectedIncident)}
        onClose={() => setManagementModalOpen(false)}
        title={
          selectedIncident
            ? `Gestionar actuaciones · ${selectedIncident.recordCode}`
            : 'Gestionar actuaciones'
        }
        subtitle="Gestión del Delegado · Secciones 6–10 (cifrado AES-256-GCM)"
        size="xl"
        accent="rose"
      >
        {selectedIncident && (
          <form onSubmit={handleSaveManagement} className="space-y-5">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-error-container/40 border border-error/40 text-xs text-error flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="mgmt-status"
                  className="block text-xs font-bold uppercase tracking-wider text-white"
                >
                  Estado del Expediente
                </label>
                <select
                  id="mgmt-status"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as LopiviIncidentStatus)}
                  className="w-full px-3 py-2.5 bg-surface-container-highest border border-white/15 focus:border-primary-container text-sm text-white outline-none"
                >
                  {LOPIVI_STATUS_LIST.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="mgmt-risk"
                  className="block text-xs font-bold uppercase tracking-wider text-white"
                >
                  Sección 6 · ¿Existe riesgo inmediato para el menor?
                </label>
                <select
                  id="mgmt-risk"
                  value={draftRisk}
                  onChange={(e) => setDraftRisk(e.target.value as LopiviImmediateRisk)}
                  className="w-full px-3 py-2.5 bg-surface-container-highest border border-white/15 focus:border-primary-container text-sm text-white outline-none"
                >
                  {LOPIVI_IMMEDIATE_RISK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sección 6: Medidas inmediatas */}
            <div className="bg-surface-container border border-white/10 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Sección 6 · Medidas inmediatas de protección
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {LOPIVI_IMMEDIATE_MEASURES.map((measure) => (
                  <label
                    key={measure}
                    className="flex items-start gap-2.5 p-2 bg-surface-container-low border border-white/10 text-xs text-on-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={draftMeasures.includes(measure)}
                      onChange={() => toggleListValue(setDraftMeasures, measure)}
                      className="w-4 h-4 accent-[#d90429] mt-0.5 shrink-0"
                    />
                    <span>{measure}</span>
                  </label>
                ))}
              </div>
              {draftMeasures.includes('Otras medidas') && (
                <input
                  type="text"
                  maxLength={160}
                  value={draftMeasuresOther}
                  onChange={(e) => setDraftMeasuresOther(e.target.value)}
                  placeholder="Especifica otras medidas adoptadas..."
                  aria-label="Especificar otras medidas adoptadas"
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                />
              )}
              <div className="space-y-1.5">
                <label
                  htmlFor="mgmt-measures-desc"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Descripción de las medidas adoptadas (cifrado)
                </label>
                <textarea
                  id="mgmt-measures-desc"
                  rows={3}
                  maxLength={4000}
                  value={draftMeasuresDesc}
                  onChange={(e) => setDraftMeasuresDesc(e.target.value)}
                  placeholder="Detalla las medidas aplicadas para proteger al menor..."
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 focus:border-primary-container text-xs sm:text-sm text-white outline-none resize-y"
                />
              </div>
            </div>

            {/* Sección 7: Comunicaciones a autoridades */}
            <div className="bg-surface-container border border-white/10 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Sección 7 · Comunicaciones realizadas a organismos y autoridades
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LOPIVI_AUTHORITIES.map((auth) => (
                  <label
                    key={auth}
                    className="flex items-start gap-2.5 p-2 bg-surface-container-low border border-white/10 text-xs text-on-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={draftAuthorities.includes(auth)}
                      onChange={() => toggleListValue(setDraftAuthorities, auth)}
                      className="w-4 h-4 accent-[#d90429] mt-0.5 shrink-0"
                    />
                    <span>{auth}</span>
                  </label>
                ))}
              </div>
              {draftAuthorities.includes('Otros') && (
                <input
                  type="text"
                  maxLength={160}
                  value={draftAuthoritiesOther}
                  onChange={(e) => setDraftAuthoritiesOther(e.target.value)}
                  placeholder="Especifica otro organismo o servicio comunicado..."
                  aria-label="Especificar otro organismo comunicado"
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="mgmt-auth-date"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Fecha de comunicación
                  </label>
                  <input
                    id="mgmt-auth-date"
                    type="text"
                    maxLength={60}
                    value={draftAuthDate}
                    onChange={(e) => setDraftAuthDate(e.target.value)}
                    placeholder="Ej. 20/11/2026"
                    className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="mgmt-auth-rec"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Persona o entidad receptora (cifrado)
                  </label>
                  <input
                    id="mgmt-auth-rec"
                    type="text"
                    maxLength={220}
                    value={draftAuthRecipient}
                    onChange={(e) => setDraftAuthRecipient(e.target.value)}
                    placeholder="Ej. Juzgado / Policía / Junta"
                    className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="mgmt-auth-ref"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Nº de expediente / Referencia (cifrado)
                  </label>
                  <input
                    id="mgmt-auth-ref"
                    type="text"
                    maxLength={140}
                    value={draftAuthRef}
                    onChange={(e) => setDraftAuthRef(e.target.value)}
                    placeholder="Si existe"
                    className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sección 8: Seguimiento de la incidencia */}
            <div className="bg-surface-container border border-white/10 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Sección 8 · Seguimiento de la incidencia
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="mgmt-follow-date"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Fecha de seguimiento
                  </label>
                  <input
                    id="mgmt-follow-date"
                    type="text"
                    maxLength={60}
                    value={draftFollowDate}
                    onChange={(e) => setDraftFollowDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="mgmt-closed-date"
                    className="block text-xs font-semibold text-on-surface"
                  >
                    Fecha de cierre o revisión
                  </label>
                  <input
                    id="mgmt-closed-date"
                    type="text"
                    maxLength={60}
                    value={draftClosedDate}
                    onChange={(e) => setDraftClosedDate(e.target.value)}
                    placeholder="DD/MM/AAAA (si procede)"
                    className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="mgmt-follow-measures"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Medidas de protección mantenidas (cifrado)
                </label>
                <textarea
                  id="mgmt-follow-measures"
                  rows={2}
                  maxLength={4000}
                  value={draftFollowMeasures}
                  onChange={(e) => setDraftFollowMeasures(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none resize-y"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="mgmt-follow-evo"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Evolución de la situación (cifrado)
                </label>
                <textarea
                  id="mgmt-follow-evo"
                  rows={2}
                  maxLength={4000}
                  value={draftFollowEvolution}
                  onChange={(e) => setDraftFollowEvolution(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none resize-y"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="mgmt-follow-actions"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Nuevas actuaciones realizadas (cifrado)
                </label>
                <textarea
                  id="mgmt-follow-actions"
                  rows={2}
                  maxLength={4000}
                  value={draftFollowActions}
                  onChange={(e) => setDraftFollowActions(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none resize-y"
                />
              </div>
            </div>

            {/* Sección 9 */}
            <div className="bg-surface-container border border-white/10 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Sección 9 · Observaciones
              </h3>
              <div className="space-y-1">
                <label
                  htmlFor="mgmt-observations"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Observaciones adicionales (cifrado)
                </label>
                <textarea
                  id="mgmt-observations"
                  rows={2}
                  maxLength={4000}
                  value={draftObservations}
                  onChange={(e) => setDraftObservations(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setManagementModalOpen(false)}
                className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingManagement}
                className="inline-flex items-center gap-2 px-5 py-2 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{savingManagement ? 'Guardando y cifrando...' : 'Guardar Gestión del Expediente'}</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* Modal: Registrar Incidencia Recibida (Presencial / Teléfono / Email / Escrito) */}
      <IntranetModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Registrar Incidencia LOPIVI"
        subtitle="Comunicación recibida por vía presencial, teléfono, email o escrito"
        size="xl"
        accent="rose"
      >
        <form onSubmit={handleCreateManualSubmit} className="space-y-5">
          {/* Canal y relación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="manual-channel"
                className="block text-xs font-bold uppercase tracking-wider text-white"
              >
                Medio de comunicación *
              </label>
              <select
                id="manual-channel"
                value={mChannel}
                onChange={(e) => setMChannel(e.target.value as LopiviChannel)}
                className="w-full px-3 py-2.5 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              >
                {MANUAL_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="manual-relation"
                className="block text-xs font-bold uppercase tracking-wider text-white"
              >
                Relación de quien comunica *
              </label>
              <select
                id="manual-relation"
                value={mRelation}
                onChange={(e) => setMRelation(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              >
                {LOPIVI_REPORTER_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mRelation === 'Otra' && (
            <input
              type="text"
              maxLength={90}
              value={mRelationOther}
              onChange={(e) => setMRelationOther(e.target.value)}
              aria-label="Especificar relación"
              placeholder="Especificar relación..."
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
            />
          )}

          <div className="flex flex-wrap gap-4 p-3 bg-surface-container border border-white/10">
            <label className="inline-flex items-center gap-2 text-xs text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={mIsAnonymous}
                onChange={(e) => setMIsAnonymous(e.target.checked)}
                className="w-4 h-4 accent-[#d90429]"
              />
              <span>Comunicación anónima</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={mKeepReserved}
                onChange={(e) => setMKeepReserved(e.target.checked)}
                className="w-4 h-4 accent-[#d90429]"
              />
              <span>Mantener reservada su identidad frente a otros miembros</span>
            </label>
          </div>

          {!mIsAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="manual-reporter-name"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Nombre y apellidos de quien comunica
                </label>
                <input
                  id="manual-reporter-name"
                  type="text"
                  maxLength={140}
                  value={mReporterName}
                  onChange={(e) => setMReporterName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="manual-reporter-contact"
                  className="block text-xs font-semibold text-on-surface"
                >
                  Teléfono o email de contacto
                </label>
                <input
                  id="manual-reporter-contact"
                  type="text"
                  maxLength={150}
                  value={mReporterContact}
                  onChange={(e) => setMReporterContact(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Datos del menor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <label
                htmlFor="manual-minor-name"
                className="block text-xs font-semibold text-on-surface"
              >
                Nombre del menor afectado (opcional)
              </label>
              <input
                id="manual-minor-name"
                type="text"
                maxLength={140}
                value={mMinorName}
                onChange={(e) => setMMinorName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="manual-minor-age"
                className="block text-xs font-semibold text-on-surface"
              >
                Edad
              </label>
              <input
                id="manual-minor-age"
                type="text"
                maxLength={40}
                value={mMinorAge}
                onChange={(e) => setMMinorAge(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="manual-minor-cat"
                className="block text-xs font-semibold text-on-surface"
              >
                Categoría deportiva
              </label>
              <input
                id="manual-minor-cat"
                type="text"
                list="manual-lopivi-cats"
                maxLength={80}
                value={mMinorCategory}
                onChange={(e) => setMMinorCategory(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              />
              <datalist id="manual-lopivi-cats">
                {CLUB_CATEGORY_FAMILIES.map((f) => (
                  <option key={f.code} value={f.shortLabel} />
                ))}
                <option value="Escuela" />
              </datalist>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="manual-minor-team"
                className="block text-xs font-semibold text-on-surface"
              >
                Equipo
              </label>
              <input
                id="manual-minor-team"
                type="text"
                list="manual-lopivi-teams"
                maxLength={100}
                value={mMinorTeam}
                onChange={(e) => setMMinorTeam(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              />
              <datalist id="manual-lopivi-teams">
                {CLUB_CATEGORIES_META.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Hechos y riesgo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <label
                htmlFor="manual-inc-date"
                className="block text-xs font-semibold text-on-surface"
              >
                Fecha de los hechos (si se conoce)
              </label>
              <input
                id="manual-inc-date"
                type="text"
                maxLength={120}
                value={mIncidentDateText}
                onChange={(e) => setMIncidentDateText(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="manual-inc-loc"
                className="block text-xs font-semibold text-on-surface"
              >
                Lugar donde ocurrieron *
              </label>
              <select
                id="manual-inc-loc"
                value={mLocation}
                onChange={(e) => setMLocation(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
              >
                {LOPIVI_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mLocation === 'Otro' && (
            <input
              type="text"
              maxLength={90}
              value={mLocationOther}
              onChange={(e) => setMLocationOther(e.target.value)}
              aria-label="Especificar lugar"
              placeholder="Especificar lugar..."
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
            />
          )}

          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-white">
              Tipo de situación comunicada *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LOPIVI_SITUATION_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 p-2 bg-surface-container border border-white/10 text-xs text-on-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={mIncidentTypes.includes(t)}
                    onChange={() => toggleListValue(setMIncidentTypes, t)}
                    className="w-4 h-4 accent-[#d90429]"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manual-risk"
              className="block text-xs font-bold uppercase tracking-wider text-white"
            >
              ¿Existe riesgo inmediato para el menor? *
            </label>
            <select
              id="manual-risk"
              value={mImmediateRisk}
              onChange={(e) => setMImmediateRisk(e.target.value as LopiviImmediateRisk)}
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none"
            >
              {LOPIVI_IMMEDIATE_RISK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manual-desc"
              className="block text-xs font-bold uppercase tracking-wider text-white"
            >
              Descripción objetiva de los hechos *
            </label>
            <textarea
              id="manual-desc"
              rows={4}
              required
              maxLength={4000}
              value={mDescription}
              onChange={(e) => setMDescription(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-sm text-white outline-none resize-y"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="block text-xs font-bold uppercase tracking-wider text-white">
              Medidas inmediatas ya adoptadas (opcional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LOPIVI_IMMEDIATE_MEASURES.map((m) => (
                <label
                  key={m}
                  className="flex items-start gap-2 p-2 bg-surface-container border border-white/10 text-xs text-on-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={mInitialMeasures.includes(m)}
                    onChange={() => toggleListValue(setMInitialMeasures, m)}
                    className="w-4 h-4 accent-[#d90429] mt-0.5 shrink-0"
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              maxLength={4000}
              value={mInitialMeasuresDesc}
              onChange={(e) => setMInitialMeasuresDesc(e.target.value)}
              aria-label="Descripción breve de las medidas adoptadas en el momento"
              placeholder="Descripción breve de las medidas adoptadas en el momento (opcional)..."
              className="w-full px-3 py-2 bg-surface-container-highest border border-white/15 text-xs sm:text-sm text-white outline-none resize-y"
            />
          </div>

          {mError && (
            <div
              role="alert"
              className="p-3 bg-error-container/40 border border-error/40 text-xs text-error"
            >
              {mError}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              className="px-4 py-2 bg-surface-container-high border border-white/15 text-xs font-bold uppercase text-on-surface cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{mSubmitting ? 'Guardando...' : 'Registrar Expediente Cifrado'}</span>
            </button>
          </div>
        </form>
      </IntranetModal>
    </div>
  );
}
