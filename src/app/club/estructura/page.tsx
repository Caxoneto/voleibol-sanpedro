'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';

interface SeasonItem {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

interface TeamStaffMember {
  userId: string;
  name: string;
  email: string;
  staffFunction: string;
}

interface TeamItem {
  id: string;
  seasonId: string;
  categoryId: string;
  name: string;
  division: string;
  association: 'FAVB' | 'AFADE';
  gender: 'MASCULINO' | 'FEMENINO';
  isActive: boolean;
  sortOrder: number;
  staff: TeamStaffMember[];
}

interface CourtItem {
  id: string;
  venueId: string;
  name: string;
  surfaceType: string | null;
  isActive: boolean;
}

interface VenueItem {
  id: string;
  name: string;
  address: string | null;
  mapsUrl: string | null;
  locality: string;
  isHomeVenue: boolean;
  isActive: boolean;
  courts: CourtItem[];
}

interface SlotItem {
  id: string;
  teamSeasonId: string;
  teamName: string;
  association: string;
  gender: string;
  courtId: string;
  courtName: string;
  venueId: string;
  venueName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  staff: TeamStaffMember[];
}

interface ConflictItem {
  id: string;
  type: 'COURT_OVERLAP' | 'COACH_OVERLAP';
  weekday: number;
  slotAId: string;
  slotBId: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  timeRangeA: string;
  timeRangeB: string;
  courtName?: string;
  venueName?: string;
  coachName?: string;
  summary: string;
}

interface ClosureItem {
  id: string;
  venueId: string;
  venueName: string;
  courtId: string | null;
  courtName: string | null;
  madridDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  createdAt: string;
}

interface ProposalItem {
  id: string;
  teamSeasonId: string;
  teamName: string;
  slotId: string | null;
  proposedCourtId: string | null;
  proposedCourtName: string | null;
  proposedVenueName: string | null;
  proposedWeekday: number;
  proposedStartTime: string;
  proposedEndTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedBy: string;
  proposedByName: string;
  reviewedByName: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface HomeMatchItem {
  id: string;
  teamId: string;
  teamName: string;
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  venueName: string;
  court: string | null;
  matchDateUtc: string;
  madridDate: string;
  madridTime: string;
  madridLabel: string;
  status: string;
}

interface StructureResponse {
  success: boolean;
  todayMadrid: string;
  currentSeason: SeasonItem | null;
  seasons: SeasonItem[];
  teams: TeamItem[];
  venues: VenueItem[];
  slots: SlotItem[];
  conflicts: ConflictItem[];
  closures: ClosureItem[];
  proposals: ProposalItem[];
  upcomingHomeMatches: HomeMatchItem[];
  error?: string;
}

type StructureTab = 'schedule' | 'venues_favb' | 'catalog';

const WEEKDAYS: Array<{ value: number; short: string; label: string }> = [
  { value: 1, short: 'Lun', label: 'Lunes' },
  { value: 2, short: 'Mar', label: 'Martes' },
  { value: 3, short: 'Mié', label: 'Miércoles' },
  { value: 4, short: 'Jue', label: 'Jueves' },
  { value: 5, short: 'Vie', label: 'Viernes' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 7, short: 'Dom', label: 'Domingo' },
];

const WEEKDAY_LABEL_MAP = new Map(WEEKDAYS.map((d) => [d.value, d.label]));

const STAFF_FN_SHORT: Record<string, string> = {
  HEAD_COACH: '1º Entr.',
  ASSISTANT: 'Ayud.',
  DELEGATE: 'Deleg.',
  TRAINER: 'Prep.',
};

export default function ClubEstructuraPage() {
  const { session, hasPermission } = useClubSession();

  const canManageSchedule = hasPermission('schedule.manage');
  const canProposeSchedule = hasPermission('schedule.propose');
  const canManageVenues = hasPermission('venue.manage');
  const canManageSeasons = hasPermission('season.manage');

  const [activeTab, setActiveTab] = useState<StructureTab>('schedule');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StructureResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filtros de cuadrante
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterVenueId, setFilterVenueId] = useState('ALL');

  // Modal Añadir Franja
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotTeamId, setSlotTeamId] = useState('');
  const [slotCourtId, setSlotCourtId] = useState('');
  const [slotWeekday, setSlotWeekday] = useState(1);
  const [slotStart, setSlotStart] = useState('17:30');
  const [slotEnd, setSlotEnd] = useState('19:00');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotStrict, setSlotStrict] = useState(false);
  const [slotSubmitting, setSlotSubmitting] = useState(false);

  // Modal Proponer Cambio de Horario
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [propTeamId, setPropTeamId] = useState('');
  const [propCourtId, setPropCourtId] = useState('');
  const [propWeekday, setPropWeekday] = useState(1);
  const [propStart, setPropStart] = useState('18:00');
  const [propEnd, setPropEnd] = useState('19:30');
  const [propReason, setPropReason] = useState('');
  const [propSubmitting, setPropSubmitting] = useState(false);

  // Formulario Cierre / Festivo
  const [closureVenueId, setClosureVenueId] = useState('');
  const [closureCourtId, setClosureCourtId] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const [closureStart, setClosureStart] = useState('');
  const [closureEnd, setClosureEnd] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closureSubmitting, setClosureSubmitting] = useState(false);

  // Formularios Catálogo Pabellones / Pistas / Temporadas
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueLocality, setVenueLocality] = useState('San Pedro Alcántara');
  const [venueMapsUrl, setVenueMapsUrl] = useState('');
  const [venueSubmitting, setVenueSubmitting] = useState(false);

  const [courtVenueId, setCourtVenueId] = useState('');
  const [courtName, setCourtName] = useState('');
  const [courtSurface, setCourtSurface] = useState('Pista completa');
  const [courtSubmitting, setCourtSubmitting] = useState(false);

  const [seasonName, setSeasonName] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [seasonCurrent, setSeasonCurrent] = useState(false);
  const [seasonSubmitting, setSeasonSubmitting] = useState(false);

  const loadedRef = useRef(false);

  const fetchStructure = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/structure', { cache: 'no-store' });
      const json = (await res.json()) as StructureResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar la estructura deportiva.');
      }
      setData(json);
      if (json.venues.length > 0) {
        setClosureVenueId((prev) => prev || json.venues[0].id);
        setCourtVenueId((prev) => prev || json.venues[0].id);
        const firstCourt = json.venues.flatMap((v) => v.courts)[0];
        if (firstCourt) {
          setSlotCourtId((prev) => prev || firstCourt.id);
          setPropCourtId((prev) => prev || firstCourt.id);
        }
      }
      if (json.teams.length > 0) {
        setSlotTeamId((prev) => prev || json.teams[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de red cargando estructura.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchStructure();
  }, [fetchStructure]);

  const allCourts = useMemo(() => {
    return (data?.venues || []).flatMap((v) =>
      v.courts.map((c) => ({ ...c, venueName: v.name }))
    );
  }, [data]);

  const filteredSlots = useMemo(() => {
    return (data?.slots || []).filter((s) => {
      if (filterTeamId !== 'ALL' && s.teamSeasonId !== filterTeamId) return false;
      if (filterVenueId !== 'ALL' && s.venueId !== filterVenueId) return false;
      return true;
    });
  }, [data, filterTeamId, filterVenueId]);

  const conflictSlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of data?.conflicts || []) {
      ids.add(c.slotAId);
      ids.add(c.slotBId);
    }
    return ids;
  }, [data]);

  const closureDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const cl of data?.closures || []) {
      set.add(cl.madridDate);
    }
    return set;
  }, [data]);

  const proposableTeams = useMemo(() => {
    const all = data?.teams || [];
    if (session.isPresident || canManageSchedule) return all;
    if (session.staffTeamIds.length > 0) {
      const allowed = new Set(session.staffTeamIds);
      return all.filter((t) => allowed.has(t.id));
    }
    return all;
  }, [data, session, canManageSchedule]);

  async function postAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/intranet/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'No se pudo completar la operación.');
    }
    return json;
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (slotSubmitting) return;
    setSlotSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const res = await postAction({
        action: 'create_slot',
        teamSeasonId: slotTeamId,
        courtId: slotCourtId,
        weekday: slotWeekday,
        startTime: slotStart,
        endTime: slotEnd,
        notes: slotNotes || null,
        strict: slotStrict,
      });
      setSlotModalOpen(false);
      setSlotNotes('');
      setFeedbackMsg(
        res.warning ? `Franja creada con advertencia: ${res.warning}` : 'Franja semanal añadida.'
      );
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando franja.');
    } finally {
      setSlotSubmitting(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    setErrorMsg(null);
    try {
      await postAction({ action: 'delete_slot', slotId });
      setFeedbackMsg('Franja eliminada del cuadrante.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error eliminando franja.');
    }
  }

  async function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault();
    if (propSubmitting) return;
    setPropSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await postAction({
        action: 'propose_schedule',
        teamSeasonId: propTeamId || proposableTeams[0]?.id,
        proposedCourtId: propCourtId || null,
        proposedWeekday: propWeekday,
        proposedStartTime: propStart,
        proposedEndTime: propEnd,
        reason: propReason,
      });
      setProposeModalOpen(false);
      setPropReason('');
      setFeedbackMsg('Propuesta de cambio de horario enviada a coordinación.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error enviando propuesta.');
    } finally {
      setPropSubmitting(false);
    }
  }

  async function handleResolveProposal(proposalId: string, decision: 'APPROVED' | 'REJECTED') {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await postAction({
        action: 'resolve_proposal',
        proposalId,
        decision,
      });
      setFeedbackMsg(
        decision === 'APPROVED' ? 'Propuesta aprobada y aplicada al cuadrante.' : 'Propuesta rechazada.'
      );
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error resolviendo propuesta.');
    }
  }

  async function handleCreateClosure(e: React.FormEvent) {
    e.preventDefault();
    if (closureSubmitting) return;
    setClosureSubmitting(true);
    setErrorMsg(null);
    try {
      await postAction({
        action: 'create_closure',
        venueId: closureVenueId,
        courtId: closureCourtId || null,
        madridDate: closureDate,
        startTime: closureStart || null,
        endTime: closureEnd || null,
        reason: closureReason,
      });
      setClosureDate('');
      setClosureStart('');
      setClosureEnd('');
      setClosureReason('');
      setFeedbackMsg('Cierre / festivo registrado correctamente.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando cierre.');
    } finally {
      setClosureSubmitting(false);
    }
  }

  async function handleDeleteClosure(closureId: string) {
    setErrorMsg(null);
    try {
      await postAction({ action: 'delete_closure', closureId });
      setFeedbackMsg('Cierre eliminado.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error eliminando cierre.');
    }
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    if (venueSubmitting) return;
    setVenueSubmitting(true);
    setErrorMsg(null);
    try {
      await postAction({
        action: 'create_venue',
        name: venueName,
        address: venueAddress || null,
        locality: venueLocality,
        mapsUrl: venueMapsUrl || null,
        isHomeVenue: true,
      });
      setVenueName('');
      setVenueAddress('');
      setVenueMapsUrl('');
      setFeedbackMsg('Pabellón creado.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando pabellón.');
    } finally {
      setVenueSubmitting(false);
    }
  }

  async function handleCreateCourt(e: React.FormEvent) {
    e.preventDefault();
    if (courtSubmitting) return;
    setCourtSubmitting(true);
    setErrorMsg(null);
    try {
      await postAction({
        action: 'create_court',
        venueId: courtVenueId,
        name: courtName,
        surfaceType: courtSurface,
      });
      setCourtName('');
      setFeedbackMsg('Pista añadida al pabellón.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando pista.');
    } finally {
      setCourtSubmitting(false);
    }
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (seasonSubmitting) return;
    setSeasonSubmitting(true);
    setErrorMsg(null);
    try {
      await postAction({
        action: 'create_season',
        name: seasonName,
        startDate: seasonStart,
        endDate: seasonEnd,
        isCurrent: seasonCurrent,
      });
      setSeasonName('');
      setSeasonStart('');
      setSeasonEnd('');
      setSeasonCurrent(false);
      setFeedbackMsg('Temporada guardada correctamente.');
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando temporada.');
    } finally {
      setSeasonSubmitting(false);
    }
  }

  async function handleToggleTeam(team: TeamItem) {
    setErrorMsg(null);
    try {
      await postAction({
        action: 'toggle_team',
        teamSeasonId: team.id,
        isActive: !team.isActive,
      });
      setFeedbackMsg(
        `Equipo ${team.name} ${!team.isActive ? 'activado' : 'desactivado'}.`
      );
      await fetchStructure();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error actualizando equipo.');
    }
  }

  if (loading && !data) {
    return (
      <div className="bg-surface-container border border-white/10 p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
        <p className="text-xs font-label-md uppercase tracking-wider text-tertiary">
          Cargando estructura deportiva y horarios...
        </p>
      </div>
    );
  }

  const pendingProposals = (data?.proposals || []).filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary-container shrink-0" aria-hidden="true" />
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Estructura Deportiva · Temporada {data?.currentSeason?.name || '2026/2027'}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Pabellones, Pistas y Horarios
            </h1>
            <p className="text-xs sm:text-sm text-tertiary mt-1">
              Cuadrante semanal, detección automática de conflictos, ocupación FAVB y gestión de
              instalaciones (hora oficial Europe/Madrid).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchStructure}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Actualizar</span>
            </button>
            {canProposeSchedule && (
              <button
                type="button"
                onClick={() => {
                  setPropTeamId(proposableTeams[0]?.id || '');
                  setProposeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-primary-container/50 text-xs font-label-md uppercase font-bold text-primary cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Proponer cambio</span>
              </button>
            )}
            {canManageSchedule && (
              <button
                type="button"
                onClick={() => setSlotModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Añadir franja</span>
              </button>
            )}
          </div>
        </div>

        {/* KPIs rápidos */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Franjas Activas
              </p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-0.5">
                {data.slots.length}
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Conflictos Detectados
              </p>
              <p
                className={`font-headline text-2xl font-bold mt-0.5 ${
                  data.conflicts.length > 0 ? 'text-error' : 'text-emerald-400'
                }`}
              >
                {data.conflicts.length}
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Propuestas Pendientes
              </p>
              <p className="font-headline text-2xl font-bold text-amber-400 mt-0.5">
                {pendingProposals.length}
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Partidos Casa FAVB
              </p>
              <p className="font-headline text-2xl font-bold text-primary mt-0.5">
                {data.upcomingHomeMatches.length}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="bg-error-container/40 border border-error/40 text-error px-4 py-3 text-xs sm:text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-error hover:text-white cursor-pointer"
            aria-label="Cerrar error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pestañas */}
      <nav
        aria-label="Secciones de estructura deportiva"
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-white/10"
      >
        {[
          { id: 'schedule' as const, label: 'Horarios y Conflictos' },
          { id: 'venues_favb' as const, label: 'Ocupación y Partidos FAVB' },
          { id: 'catalog' as const, label: 'Pabellones, Pistas y Equipos' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                active
                  ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container text-tertiary border-white/10 hover:text-white hover:border-white/25'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* PESTAÑA 1: HORARIOS SEMANALES Y CONFLICTOS */}
      {activeTab === 'schedule' && data && (
        <section className="space-y-5">
          {/* Panel superior: Conflictos detectados + Propuestas */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Conflictos detectados */}
            <div
              className={`xl:col-span-7 border p-4 space-y-3 ${
                data.conflicts.length > 0
                  ? 'bg-error-container/20 border-error/40'
                  : 'bg-surface-container border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {data.conflicts.length > 0 ? (
                    <AlertOctagon className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-400 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
                    Conflictos Detectados ({data.conflicts.length})
                  </h2>
                </div>
                <span className="text-[10px] uppercase font-bold text-tertiary">
                  Pista y Entrenador
                </span>
              </div>

              {data.conflicts.length === 0 ? (
                <p className="text-xs text-emerald-300/90">
                  No existen solapamientos de pista ni de entrenadores entre las franjas activas.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-surface-container-lowest/80 border border-error/35 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-error-container text-error">
                          {c.type === 'COURT_OVERLAP'
                            ? 'Pista solapada'
                            : 'Entrenador solapado'}
                        </span>
                        <span className="font-bold text-primary">
                          {WEEKDAY_LABEL_MAP.get(c.weekday)}
                        </span>
                      </div>
                      <p className="text-on-surface/90">{c.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Propuestas de cambio de horario */}
            <div className="xl:col-span-5 bg-surface-container border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
                  Propuestas de Horario ({pendingProposals.length} pendientes)
                </h2>
              </div>

              {data.proposals.length === 0 ? (
                <p className="text-xs text-tertiary">
                  No hay propuestas de cambio de horario registradas.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.proposals.slice(0, 12).map((p) => (
                    <div
                      key={p.id}
                      className="bg-surface-container-low border border-white/10 p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-bold text-on-surface">{p.teamName}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] uppercase font-bold border ${
                            p.status === 'PENDING'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : p.status === 'APPROVED'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-error-container/50 text-error border-error/40'
                          }`}
                        >
                          {p.status === 'PENDING'
                            ? 'Pendiente'
                            : p.status === 'APPROVED'
                            ? 'Aprobada'
                            : 'Rechazada'}
                        </span>
                      </div>
                      <p className="text-primary font-semibold">
                        {WEEKDAY_LABEL_MAP.get(p.proposedWeekday)} · {p.proposedStartTime}-
                        {p.proposedEndTime}
                        {p.proposedCourtName ? ` · ${p.proposedCourtName}` : ''}
                      </p>
                      <p className="text-tertiary">
                        {p.reason} <span className="opacity-70">({p.proposedByName})</span>
                      </p>

                      {p.status === 'PENDING' && canManageSchedule && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleResolveProposal(p.id, 'APPROVED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 text-[10px] uppercase font-bold cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Aprobar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveProposal(p.id, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-error-container/40 hover:bg-error-container/70 border border-error/40 text-error text-[10px] uppercase font-bold cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filtros de Cuadrante */}
          <div className="bg-surface-container border border-white/10 p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                Filtrar por equipo
              </label>
              <select
                value={filterTeamId}
                onChange={(e) => setFilterTeamId(e.target.value)}
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                <option value="ALL">Todos los equipos ({data.teams.length})</option>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.association})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                Filtrar por pabellón
              </label>
              <select
                value={filterVenueId}
                onChange={(e) => setFilterVenueId(e.target.value)}
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                <option value="ALL">Todos los pabellones ({data.venues.length})</option>
                {data.venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuadrante Semanal Lunes-Domingo */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {WEEKDAYS.map((day) => {
              const daySlots = filteredSlots.filter((s) => s.weekday === day.value);
              return (
                <div
                  key={day.value}
                  className="bg-surface-container border border-white/10 flex flex-col min-w-0"
                >
                  <div className="px-3 py-2.5 bg-surface-container-low border-b border-white/10 flex items-center justify-between">
                    <span className="font-headline-sm text-xs uppercase tracking-wider text-on-surface font-bold">
                      {day.label}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-surface-container-high text-primary border border-white/10">
                      {daySlots.length}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2.5 flex-1">
                    {daySlots.length === 0 ? (
                      <p className="text-[11px] text-tertiary/60 text-center py-4">
                        Sin franjas
                      </p>
                    ) : (
                      daySlots.map((slot) => {
                        const hasConflict = conflictSlotIds.has(slot.id);
                        return (
                          <div
                            key={slot.id}
                            className={`p-2.5 border space-y-1.5 text-xs ${
                              hasConflict
                                ? 'bg-error-container/25 border-error/60'
                                : 'bg-surface-container-low border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-primary">
                                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {slot.startTime}-{slot.endTime}
                              </span>
                              {canManageSchedule && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  title="Eliminar franja"
                                  aria-label={`Eliminar franja de ${slot.teamName}`}
                                  className="text-tertiary hover:text-error cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <p className="font-bold text-on-surface leading-tight">
                              {slot.teamName}
                            </p>
                            <p className="text-[11px] text-tertiary leading-tight">
                              {slot.courtName} · {slot.venueName}
                            </p>

                            {slot.staff.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {slot.staff.map((st) => (
                                  <span
                                    key={`${slot.id}-${st.userId}-${st.staffFunction}`}
                                    className="px-1.5 py-0.5 text-[10px] bg-surface-container text-on-surface/85 border border-white/10"
                                  >
                                    {st.name.split(' ')[0]} (
                                    {STAFF_FN_SHORT[st.staffFunction] || st.staffFunction})
                                  </span>
                                ))}
                              </div>
                            )}

                            {hasConflict && (
                              <p className="text-[10px] font-bold uppercase text-error flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Conflicto activo
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PESTAÑA 2: OCUPACIÓN DE PABELLONES, PARTIDOS FAVB Y CIERRES */}
      {activeTab === 'venues_favb' && data && (
        <section className="space-y-6">
          {/* Ocupación por Pabellón y Pista */}
          <div className="space-y-4">
            <h2 className="font-headline-sm text-base uppercase text-on-surface flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-container" aria-hidden="true" />
              <span>Ocupación Semanal por Pabellón y Pista</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.venues.map((v) => (
                <div
                  key={v.id}
                  className="bg-surface-container border border-white/10 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="min-w-0">
                      <h3 className="font-headline text-base font-bold text-on-surface">
                        {v.name}
                      </h3>
                      <p className="text-xs text-tertiary truncate">
                        {v.address || v.locality}
                      </p>
                    </div>
                    {v.mapsUrl && (
                      <a
                        href={v.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Mapa</span>
                      </a>
                    )}
                  </div>

                  {v.courts.length === 0 ? (
                    <p className="text-xs text-tertiary">Sin pistas registradas.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {v.courts.map((c) => {
                        const courtSlots = data.slots.filter((s) => s.courtId === c.id);
                        return (
                          <div
                            key={c.id}
                            className="bg-surface-container-low border border-white/5 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-on-surface">{c.name}</span>
                              <span className="text-[10px] uppercase text-tertiary">
                                {c.surfaceType || 'Pista'} · {courtSlots.length} franja(s)
                              </span>
                            </div>
                            {courtSlots.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {courtSlots.map((cs) => (
                                  <span
                                    key={cs.id}
                                    className="px-2 py-1 text-[11px] bg-surface-container border border-white/10 text-on-surface"
                                  >
                                    <strong className="text-primary">
                                      {WEEKDAYS.find((d) => d.value === cs.weekday)?.short}
                                    </strong>{' '}
                                    {cs.startTime}-{cs.endTime} · {cs.teamName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Partidos Oficiales en Casa FAVB + Cierres / Festivos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Próximos partidos FAVB en casa */}
            <div className="lg:col-span-7 bg-surface-container border border-white/10 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary-container" aria-hidden="true" />
                  <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
                    Próximos Partidos en Casa (FAVB · Europe/Madrid)
                  </h2>
                </div>
                <span className="text-[11px] text-tertiary">
                  Hoy: {data.todayMadrid}
                </span>
              </div>

              {data.upcomingHomeMatches.length === 0 ? (
                <p className="text-sm text-tertiary py-6 text-center">
                  No hay próximos partidos oficiales en casa registrados a partir de hoy (
                  {data.todayMadrid}).
                </p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {data.upcomingHomeMatches.map((m) => {
                    const hasClosureCollision = closureDatesSet.has(m.madridDate);
                    return (
                      <div
                        key={m.id}
                        className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          hasClosureCollision
                            ? 'bg-error-container/25 border-error/50'
                            : 'bg-surface-container-low border-white/10'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-primary-container/20 text-primary border border-primary-container/40">
                              J{m.round} · {m.teamName}
                            </span>
                            {hasClosureCollision && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-error-container text-error">
                                Coincide con cierre
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-on-surface">
                            {m.homeTeamName} vs {m.awayTeamName}
                          </p>
                          <p className="text-tertiary truncate">
                            {m.venueName}
                            {m.court ? ` · ${m.court}` : ''}
                          </p>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <p className="font-mono font-bold text-primary">
                            {m.madridDate} · {m.madridTime}
                          </p>
                          <p className="text-[11px] text-tertiary capitalize">{m.madridLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gestión de Cierres y Festivos */}
            <div className="lg:col-span-5 bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <CalendarOff className="w-4 h-4 text-primary-container" aria-hidden="true" />
                <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
                  Cierres y Festivos de Pabellón
                </h2>
              </div>

              {(canManageVenues || canManageSchedule) && (
                <form onSubmit={handleCreateClosure} className="space-y-3 pb-3 border-b border-white/10">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                      Pabellón *
                    </label>
                    <select
                      required
                      value={closureVenueId}
                      onChange={(e) => {
                        setClosureVenueId(e.target.value);
                        setClosureCourtId('');
                      }}
                      className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                    >
                      {data.venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                        Pista (opcional)
                      </label>
                      <select
                        value={closureCourtId}
                        onChange={(e) => setClosureCourtId(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                      >
                        <option value="">Todo el pabellón</option>
                        {(data.venues.find((v) => v.id === closureVenueId)?.courts || []).map(
                          (c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                        Fecha (Madrid) *
                      </label>
                      <input
                        type="date"
                        required
                        value={closureDate}
                        onChange={(e) => setClosureDate(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                        Desde (opcional)
                      </label>
                      <input
                        type="time"
                        value={closureStart}
                        onChange={(e) => setClosureStart(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                        Hasta (opcional)
                      </label>
                      <input
                        type="time"
                        value={closureEnd}
                        onChange={(e) => setClosureEnd(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                      Motivo del cierre *
                    </label>
                    <input
                      type="text"
                      required
                      value={closureReason}
                      onChange={(e) => setClosureReason(e.target.value)}
                      placeholder="Ej. Torneo municipal, Festivo local, Mantenimiento..."
                      className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={closureSubmitting}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                  >
                    {closureSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Registrar cierre</span>
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.closures.length === 0 ? (
                  <p className="text-xs text-tertiary text-center py-4">
                    Sin cierres registrados.
                  </p>
                ) : (
                  data.closures.map((cl) => (
                    <div
                      key={cl.id}
                      className="bg-surface-container-low border border-white/10 p-2.5 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-mono font-bold text-primary">
                          {cl.madridDate}
                          {cl.startTime && cl.endTime
                            ? ` (${cl.startTime}-${cl.endTime})`
                            : ' (Todo el día)'}
                        </p>
                        <p className="font-bold text-on-surface">
                          {cl.venueName}
                          {cl.courtName ? ` · ${cl.courtName}` : ''}
                        </p>
                        <p className="text-tertiary">{cl.reason}</p>
                      </div>
                      {(canManageVenues || canManageSchedule) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClosure(cl.id)}
                          className="text-tertiary hover:text-error cursor-pointer shrink-0"
                          aria-label="Eliminar cierre"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PESTAÑA 3: PABELLONES, PISTAS Y EQUIPOS */}
      {activeTab === 'catalog' && data && (
        <section className="space-y-6">
          {/* Alta de Pabellones y Pistas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
              <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface border-b border-white/10 pb-2.5">
                Pabellones y Pistas Registradas ({data.venues.length})
              </h2>
              <div className="space-y-3">
                {data.venues.map((v) => (
                  <div
                    key={v.id}
                    className="bg-surface-container-low border border-white/10 p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-on-surface">{v.name}</h3>
                        <p className="text-xs text-tertiary">
                          {v.address || v.locality} · {v.locality}
                        </p>
                      </div>
                      {v.mapsUrl && (
                        <a
                          href={v.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <span>Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {v.courts.map((c) => (
                        <span
                          key={c.id}
                          className="px-2.5 py-1 text-xs bg-surface-container border border-white/10 text-on-surface"
                        >
                          {c.name}{' '}
                          <span className="text-[10px] text-tertiary">
                            ({c.surfaceType || 'Pista'})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canManageVenues && (
              <div className="lg:col-span-5 space-y-4">
                <form
                  onSubmit={handleCreateVenue}
                  className="bg-surface-container border border-white/10 p-4 space-y-3"
                >
                  <h3 className="font-headline-sm text-xs uppercase tracking-wider text-primary font-bold">
                    Nuevo Pabellón
                  </h3>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Nombre del pabellón *"
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Dirección completa"
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={venueLocality}
                      onChange={(e) => setVenueLocality(e.target.value)}
                      placeholder="Localidad"
                      className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                    />
                    <input
                      type="url"
                      value={venueMapsUrl}
                      onChange={(e) => setVenueMapsUrl(e.target.value)}
                      placeholder="URL Google Maps"
                      className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={venueSubmitting}
                    className="w-full px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                  >
                    {venueSubmitting ? 'Guardando...' : 'Crear Pabellón'}
                  </button>
                </form>

                <form
                  onSubmit={handleCreateCourt}
                  className="bg-surface-container border border-white/10 p-4 space-y-3"
                >
                  <h3 className="font-headline-sm text-xs uppercase tracking-wider text-primary font-bold">
                    Añadir Pista a Pabellón
                  </h3>
                  <select
                    required
                    value={courtVenueId}
                    onChange={(e) => setCourtVenueId(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                  >
                    {data.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="Nombre de la pista (ej. Pista 3) *"
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    value={courtSurface}
                    onChange={(e) => setCourtSurface(e.target.value)}
                    placeholder="Tipo (ej. Pista completa / Transversal)"
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
                  />
                  <button
                    type="submit"
                    disabled={courtSubmitting}
                    className="w-full px-4 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-on-surface text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                  >
                    {courtSubmitting ? 'Añadiendo...' : 'Añadir Pista'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Temporadas y Equipos */}
          <div className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-container" aria-hidden="true" />
                <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
                  Temporadas y Equipos ({data.teams.length})
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.seasons.map((s) => (
                  <span
                    key={s.id}
                    className={`px-2.5 py-1 text-xs font-bold border ${
                      s.isCurrent
                        ? 'bg-primary-container text-white border-primary-container'
                        : 'bg-surface-container-low text-tertiary border-white/10'
                    }`}
                  >
                    {s.name} ({s.startDate} → {s.endDate})
                  </span>
                ))}
              </div>
            </div>

            {canManageSeasons && (
              <form
                onSubmit={handleCreateSeason}
                className="bg-surface-container-low border border-white/10 p-3.5 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
              >
                <div>
                  <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                    Nueva temporada
                  </label>
                  <input
                    type="text"
                    required
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="Ej. 2027/2028"
                    className="w-full bg-surface-container border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                    Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    className="w-full bg-surface-container border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                    Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    className="w-full bg-surface-container border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-on-surface py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seasonCurrent}
                    onChange={(e) => setSeasonCurrent(e.target.checked)}
                    className="accent-[#d90429]"
                  />
                  <span>Marcar actual</span>
                </label>
                <button
                  type="submit"
                  disabled={seasonSubmitting}
                  className="px-3 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer"
                >
                  {seasonSubmitting ? '...' : 'Guardar temporada'}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.teams.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 border space-y-2 ${
                    t.isActive
                      ? 'bg-surface-container-low border-white/10'
                      : 'bg-surface-container-lowest/60 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{t.name}</p>
                      <p className="text-[11px] text-tertiary truncate">{t.division}</p>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-surface-container border border-white/10 text-primary shrink-0">
                      {t.association}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {t.staff.length === 0 ? (
                      <span className="text-[11px] text-tertiary/70">Sin cuerpo técnico</span>
                    ) : (
                      t.staff.map((st) => (
                        <span
                          key={`${t.id}-${st.userId}-${st.staffFunction}`}
                          className="px-2 py-0.5 text-[10px] bg-surface-container border border-white/10 text-on-surface"
                        >
                          {st.name} · {STAFF_FN_SHORT[st.staffFunction] || st.staffFunction}
                        </span>
                      ))
                    )}
                  </div>

                  {canManageSeasons && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleTeam(t)}
                        className={`px-2.5 py-1 text-[10px] uppercase font-bold border cursor-pointer ${
                          t.isActive
                            ? 'bg-surface-container text-tertiary border-white/15 hover:text-error'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {t.isActive ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MODAL: AÑADIR FRANJA SEMANAL */}
      {slotModalOpen && data && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-slot-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-surface-container border border-white/15 w-full max-w-lg p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2
                id="modal-slot-title"
                className="font-headline text-lg uppercase font-bold text-on-surface"
              >
                Añadir Franja Semanal
              </h2>
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Equipo *
                </label>
                <select
                  required
                  value={slotTeamId}
                  onChange={(e) => setSlotTeamId(e.target.value)}
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {data.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.association})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Pabellón y Pista *
                </label>
                <select
                  required
                  value={slotCourtId}
                  onChange={(e) => setSlotCourtId(e.target.value)}
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {allCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.venueName} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Día
                  </label>
                  <select
                    value={slotWeekday}
                    onChange={(e) => setSlotWeekday(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Inicio
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={(e) => setSlotStart(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  placeholder="Ej. Pista compartida hasta las 18:30"
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={slotStrict}
                  onChange={(e) => setSlotStrict(e.target.checked)}
                  className="accent-[#d90429]"
                />
                <span>Bloquear guardado si existe conflicto de pista o entrenador (modo estricto)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={slotSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                >
                  {slotSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar franja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROPONER CAMBIO DE HORARIO */}
      {proposeModalOpen && data && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-propose-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-surface-container border border-white/15 w-full max-w-lg p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2
                id="modal-propose-title"
                className="font-headline text-lg uppercase font-bold text-on-surface"
              >
                Proponer Cambio de Horario
              </h2>
              <button
                type="button"
                onClick={() => setProposeModalOpen(false)}
                className="text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Equipo *
                </label>
                <select
                  required
                  value={propTeamId}
                  onChange={(e) => setPropTeamId(e.target.value)}
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {proposableTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Pista propuesta
                </label>
                <select
                  value={propCourtId}
                  onChange={(e) => setPropCourtId(e.target.value)}
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {allCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.venueName} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Día
                  </label>
                  <select
                    value={propWeekday}
                    onChange={(e) => setPropWeekday(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Inicio
                  </label>
                  <input
                    type="time"
                    required
                    value={propStart}
                    onChange={(e) => setPropStart(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                    Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={propEnd}
                    onChange={(e) => setPropEnd(e.target.value)}
                    className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Motivo de la solicitud *
                </label>
                <textarea
                  required
                  rows={3}
                  value={propReason}
                  onChange={(e) => setPropReason(e.target.value)}
                  placeholder="Ej. Exámenes de bachillerato o ajuste con otro equipo..."
                  className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setProposeModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={propSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                >
                  {propSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enviar propuesta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
