'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { getShortTeamLabelInFamily, getTeamColorTheme, groupByCategoryFamily } from '@/lib/club-info';
import { formatDisplayDate } from '@/lib/date-utils';

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
  courtCode: string;
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
  courtCode: string;
  venueId: string;
  venueName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  staff: TeamStaffMember[];
}

interface HomeMatchItem {
  id: string;
  teamId: string;
  teamSeasonId: string;
  teamName: string;
  association: 'FAVB' | 'AFADE';
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  opponentName: string;
  venueName: string;
  locality: string;
  court: string | null;
  courtCode: 'P1' | 'P2' | 'P3' | null;
  matchDateUtc: string;
  dateStr: string;
  timeStr: string;
  madridDate: string;
  madridTime: string;
  madridLabel: string;
  weekday: number;
  scheduleStatus: 'PENDIENTE' | 'CONFIRMADO';
  notes: string | null;
  isScheduledManually: boolean;
  status: string;
}

interface ConflictItem {
  id: string;
  type: 'COURT_OVERLAP' | 'COACH_OVERLAP' | 'MATCH_TRAINING_OVERLAP' | 'MATCH_OVERLAP';
  weekday: number;
  dateStr?: string;
  slotAId?: string;
  slotBId?: string;
  matchAId?: string;
  matchBId?: string;
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

interface StructureResponse {
  success: boolean;
  todayMadrid: string;
  currentSeason: SeasonItem | null;
  seasons: SeasonItem[];
  teams: TeamItem[];
  venues: VenueItem[];
  slots: SlotItem[];
  conflicts: ConflictItem[];
  proposals: ProposalItem[];
  rounds: number[];
  homeMatches: HomeMatchItem[];
  upcomingHomeMatches: HomeMatchItem[];
  error?: string;
}

type ViewMode = 'BOTH' | 'TRAININGS' | 'MATCHES';
type ScarioloCourtCode = 'P1' | 'P2' | 'P3';

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

const COURT_BADGE_STYLES: Record<string, string> = {
  P1: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
  P2: 'bg-violet-500/20 text-violet-200 border-violet-400/50',
  P3: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
};

const CONFLICT_TYPE_LABEL: Record<ConflictItem['type'], string> = {
  COURT_OVERLAP: 'Pista solapada (entrenos)',
  COACH_OVERLAP: 'Entrenador solapado',
  MATCH_TRAINING_OVERLAP: 'Partido coincide con entreno',
  MATCH_OVERLAP: 'Solape entre partidos',
};

function formatShortDayMonth(ymd: string): string {
  return formatDisplayDate(ymd);
}

function getShortCourtLabel(raw?: string | null): string {
  if (!raw) return 'Sin pista';
  const norm = raw.trim().toUpperCase();
  if (norm === 'P1' || norm.includes('P1') || norm === 'PISTA 1') return 'P1';
  if (norm === 'P2' || norm.includes('P2') || norm === 'PISTA 2') return 'P2';
  if (norm === 'P3' || norm.includes('P3') || norm === 'PISTA 3' || norm.includes('CENTRAL')) return 'P3';
  return raw.trim();
}

export default function ClubEstructuraPage() {
  const { session, hasPermission } = useClubSession();

  const canManageSchedule = hasPermission('schedule.manage');
  const canProposeSchedule = hasPermission('schedule.propose');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StructureResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filtros de cuadrante
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterRound, setFilterRound] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('BOTH');

  // Modales de conflictos
  const [conflictsModalOpen, setConflictsModalOpen] = useState(false);

  // Modal Crear / Editar Entrenamiento
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotTeamId, setSlotTeamId] = useState('');
  const [slotCourtId, setSlotCourtId] = useState('');
  const [slotWeekday, setSlotWeekday] = useState(1);
  const [slotStart, setSlotStart] = useState('17:30');
  const [slotEnd, setSlotEnd] = useState('19:00');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotStrict, setSlotStrict] = useState(false);
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState(false);

  // Modal Programar / Modificar Partido en Casa
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchModalAllowPick, setMatchModalAllowPick] = useState(false);
  const [matchForm, setMatchForm] = useState({
    matchId: '',
    proposedDate: '',
    proposedTime: '12:00',
    courtCode: 'P3' as ScarioloCourtCode,
    scheduleStatus: 'PENDIENTE' as 'PENDIENTE' | 'CONFIRMADO',
    notes: '',
  });
  const [matchSubmitting, setMatchSubmitting] = useState(false);

  // Modal Proponer Cambio de Horario (entrenadores sin permiso de edición directa)
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [propSlotId, setPropSlotId] = useState<string | null>(null);
  const [propTeamId, setPropTeamId] = useState('');
  const [propCourtId, setPropCourtId] = useState('');
  const [propWeekday, setPropWeekday] = useState(1);
  const [propStart, setPropStart] = useState('18:00');
  const [propEnd, setPropEnd] = useState('19:30');
  const [propReason, setPropReason] = useState('');
  const [propSubmitting, setPropSubmitting] = useState(false);

  const loadedRef = useRef(false);
  const roundInitializedRef = useRef(false);

  const fetchStructure = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/intranet/structure', { cache: 'no-store' });
      const json = (await res.json()) as StructureResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar el cuadrante deportivo.');
      }
      setData(json);

      const scariolo =
        json.venues.find((v) => v.id === 'venue-scariolo') || json.venues[0] || null;
      const firstCourt = scariolo?.courts[0] || json.venues.flatMap((v) => v.courts)[0];
      if (firstCourt) {
        setSlotCourtId((prev) => prev || firstCourt.id);
        setPropCourtId((prev) => prev || firstCourt.id);
      }
      if (json.teams.length > 0) {
        setSlotTeamId((prev) => prev || json.teams[0].id);
      }

      // Seleccionar automáticamente la próxima jornada vigente al iniciar para mantener el cuadrante limpio
      if (!roundInitializedRef.current) {
        roundInitializedRef.current = true;
        const upcoming = (json.homeMatches || []).find(
          (m) => m.dateStr >= json.todayMadrid && m.status !== 'FINISHED'
        );
        if (upcoming) {
          setFilterRound(String(upcoming.round));
        } else if (json.rounds && json.rounds.length > 0) {
          setFilterRound(String(json.rounds[json.rounds.length - 1]));
        } else {
          setFilterRound('ALL');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de red cargando el cuadrante.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void fetchStructure();
  }, [fetchStructure]);

  // Pistas del Polideportivo Sergio Scariolo (P1, P2, P3)
  const scarioloCourts = useMemo(() => {
    const venues = data?.venues || [];
    const scariolo = venues.find((v) => v.id === 'venue-scariolo');
    const source = scariolo ? scariolo.courts : venues.flatMap((v) => v.courts);
    return [...source].sort((a, b) =>
      getShortCourtLabel(a.courtCode || a.name).localeCompare(
        getShortCourtLabel(b.courtCode || b.name)
      )
    );
  }, [data]);

  const filteredSlots = useMemo(() => {
    if (viewMode === 'MATCHES') return [];
    return (data?.slots || []).filter((s) => {
      if (s.venueId && s.venueId !== 'venue-scariolo') return false;
      if (filterTeamId !== 'ALL' && s.teamSeasonId !== filterTeamId) return false;
      return true;
    });
  }, [data, filterTeamId, viewMode]);

  const filteredHomeMatches = useMemo(() => {
    if (viewMode === 'TRAININGS') return [];
    return (data?.homeMatches || []).filter((m) => {
      if (filterTeamId !== 'ALL' && m.teamSeasonId !== filterTeamId) return false;
      if (filterRound !== 'ALL' && String(m.round) !== filterRound) return false;
      return true;
    });
  }, [data, filterTeamId, filterRound, viewMode]);

  const conflictSlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of data?.conflicts || []) {
      if (c.slotAId) ids.add(c.slotAId);
      if (c.slotBId) ids.add(c.slotBId);
    }
    return ids;
  }, [data]);

  const conflictMatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of data?.conflicts || []) {
      if (c.matchAId) ids.add(c.matchAId);
      if (c.matchBId) ids.add(c.matchBId);
    }
    return ids;
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

  const roundOptions = useMemo(() => {
    const matches = (data?.homeMatches || []).filter(
      (m) => filterTeamId === 'ALL' || m.teamSeasonId === filterTeamId
    );
    const map = new Map<number, number>();
    for (const m of matches) {
      map.set(m.round, (map.get(m.round) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, count]) => ({ round, count }));
  }, [data, filterTeamId]);

  const selectedMatchObj = useMemo(() => {
    if (!data || !matchForm.matchId) return null;
    return data.homeMatches.find((m) => m.id === matchForm.matchId) || null;
  }, [data, matchForm.matchId]);

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

  function openNewSlotModal() {
    setModalError(null);
    setConfirmDeleteSlot(false);
    setEditingSlotId(null);
    setSlotTeamId(filterTeamId !== 'ALL' ? filterTeamId : data?.teams[0]?.id || '');
    setSlotCourtId(scarioloCourts[0]?.id || '');
    setSlotWeekday(1);
    setSlotStart('17:30');
    setSlotEnd('19:00');
    setSlotNotes('');
    setSlotStrict(false);
    setSlotModalOpen(true);
  }

  function openEditSlotModal(slot: SlotItem) {
    setModalError(null);
    setConfirmDeleteSlot(false);
    setEditingSlotId(slot.id);
    setSlotTeamId(slot.teamSeasonId);
    setSlotCourtId(slot.courtId);
    setSlotWeekday(slot.weekday);
    setSlotStart(slot.startTime);
    setSlotEnd(slot.endTime);
    setSlotNotes(slot.notes || '');
    setSlotStrict(false);
    setSlotModalOpen(true);
  }

  function openProposeFromSlot(slot: SlotItem) {
    setModalError(null);
    setPropSlotId(slot.id);
    setPropTeamId(slot.teamSeasonId);
    setPropCourtId(slot.courtId);
    setPropWeekday(slot.weekday);
    setPropStart(slot.startTime);
    setPropEnd(slot.endTime);
    setPropReason('');
    setProposeModalOpen(true);
  }

  function openScheduleMatchModal(match?: HomeMatchItem) {
    setModalError(null);
    if (match) {
      setMatchModalAllowPick(false);
      setMatchForm({
        matchId: match.id,
        proposedDate: match.dateStr,
        proposedTime: match.timeStr,
        courtCode: match.courtCode || 'P3',
        scheduleStatus: match.scheduleStatus,
        notes: match.notes || '',
      });
    } else {
      const candidates =
        filteredHomeMatches.length > 0
          ? filteredHomeMatches
          : (data?.homeMatches || []).filter((m) => m.dateStr >= (data?.todayMadrid || ''));
      const first = candidates[0] || data?.homeMatches[0];
      setMatchModalAllowPick(true);
      setMatchForm({
        matchId: first?.id || '',
        proposedDate: first?.dateStr || data?.todayMadrid || '',
        proposedTime: first?.timeStr || '12:00',
        courtCode: first?.courtCode || 'P3',
        scheduleStatus: first?.scheduleStatus || 'PENDIENTE',
        notes: first?.notes || '',
      });
    }
    setMatchModalOpen(true);
  }

  function handleSelectMatchInModal(newMatchId: string) {
    const found = data?.homeMatches.find((m) => m.id === newMatchId);
    if (!found) {
      setMatchForm((prev) => ({ ...prev, matchId: newMatchId }));
      return;
    }
    setMatchForm({
      matchId: found.id,
      proposedDate: found.dateStr,
      proposedTime: found.timeStr,
      courtCode: found.courtCode || 'P3',
      scheduleStatus: found.scheduleStatus,
      notes: found.notes || '',
    });
  }

  async function handleSaveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (slotSubmitting) return;
    setSlotSubmitting(true);
    setModalError(null);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const payload = editingSlotId
        ? {
            action: 'update_slot',
            slotId: editingSlotId,
            teamSeasonId: slotTeamId,
            courtId: slotCourtId,
            weekday: slotWeekday,
            startTime: slotStart,
            endTime: slotEnd,
            notes: slotNotes.trim() || null,
            strict: slotStrict,
          }
        : {
            action: 'create_slot',
            teamSeasonId: slotTeamId,
            courtId: slotCourtId,
            weekday: slotWeekday,
            startTime: slotStart,
            endTime: slotEnd,
            notes: slotNotes.trim() || null,
            strict: slotStrict,
          };

      const res = await postAction(payload);
      setSlotModalOpen(false);
      setSlotNotes('');
      setFeedbackMsg(
        res.warning
          ? String(res.warning)
          : editingSlotId
          ? 'Entrenamiento actualizado correctamente.'
          : 'Nuevo entreno añadido al cuadrante.'
      );
      await fetchStructure();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error guardando entrenamiento.');
    } finally {
      setSlotSubmitting(false);
    }
  }

  async function handleDeleteEditingSlot() {
    if (!editingSlotId || slotSubmitting) return;
    setSlotSubmitting(true);
    setModalError(null);
    setErrorMsg(null);
    try {
      await postAction({ action: 'delete_slot', slotId: editingSlotId });
      setSlotModalOpen(false);
      setConfirmDeleteSlot(false);
      setFeedbackMsg('Franja de entrenamiento eliminada del cuadrante.');
      await fetchStructure();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error eliminando franja.');
    } finally {
      setSlotSubmitting(false);
    }
  }

  async function handleSaveHomeMatch(e: React.FormEvent) {
    e.preventDefault();
    if (matchSubmitting) return;
    setMatchSubmitting(true);
    setModalError(null);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const res = await postAction({
        action: 'upsert_home_match_schedule',
        matchId: matchForm.matchId,
        proposedDate: matchForm.proposedDate,
        proposedTime: matchForm.proposedTime,
        courtCode: matchForm.courtCode,
        scheduleStatus: matchForm.scheduleStatus,
        notes: matchForm.notes.trim() || null,
      });
      setMatchModalOpen(false);
      setFeedbackMsg(
        res.warning
          ? `Partido programado en ${matchForm.courtCode} con advertencia: ${res.warning}`
          : `Partido actualizado: ${matchForm.proposedDate} · ${matchForm.proposedTime} · ${matchForm.courtCode} (${matchForm.scheduleStatus === 'CONFIRMADO' ? 'Confirmado' : 'Pendiente'}).`
      );
      await fetchStructure();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error guardando horario de partido.');
    } finally {
      setMatchSubmitting(false);
    }
  }

  async function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault();
    if (propSubmitting) return;
    setPropSubmitting(true);
    setModalError(null);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await postAction({
        action: 'propose_schedule',
        teamSeasonId: propTeamId || proposableTeams[0]?.id,
        slotId: propSlotId,
        proposedCourtId: propCourtId || null,
        proposedWeekday: propWeekday,
        proposedStartTime: propStart,
        proposedEndTime: propEnd,
        reason: propReason,
      });
      setProposeModalOpen(false);
      setPropSlotId(null);
      setPropReason('');
      setFeedbackMsg('Propuesta de cambio de horario enviada a coordinación.');
      await fetchStructure();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error enviando propuesta.');
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

  if (loading && !data) {
    return (
      <div className="bg-surface-container border border-white/10 p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
        <p className="text-xs font-label-md uppercase tracking-wider text-tertiary">
          Cargando cuadrante del Sergio Scariolo...
        </p>
      </div>
    );
  }

  const pendingProposals = (data?.proposals || []).filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-5 pb-12 overflow-x-hidden">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Calendar className="w-5 h-5 text-primary-container shrink-0" aria-hidden="true" />
              <h1 className="font-headline text-xl sm:text-2xl lg:text-3xl font-bold text-on-surface tracking-tight break-words">
                Cuadrante (Sergio Scariolo · P1, P2, P3)
              </h1>
              {data?.currentSeason?.name && (
                <span className="px-2 py-0.5 text-[10px] font-label-sm uppercase tracking-wider font-bold bg-surface-container-low border border-white/10 text-tertiary">
                  {data.currentSeason.name}
                </span>
              )}
            </div>
            <p className="text-xs text-tertiary">
              Entrenamientos semanales y partidos oficiales en casa distribuidos en pistas P1, P2 y P3.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {data && (
              <button
                type="button"
                onClick={() => setConflictsModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border cursor-pointer transition-colors ${
                  data.conflicts.length > 0
                    ? 'bg-error-container/75 hover:bg-error-container border-error/50 text-error shadow-[2px_2px_0px_0px_#0e0e0e]'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/35 text-emerald-300'
                }`}
              >
                {data.conflicts.length > 0 ? (
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {data.conflicts.length === 0
                    ? '0 conflictos'
                    : data.conflicts.length === 1
                    ? '1 conflicto'
                    : `${data.conflicts.length} conflictos`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchStructure}
              aria-label="Actualizar cuadrante"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {canProposeSchedule && !canManageSchedule && (
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setPropSlotId(null);
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
              <>
                <button
                  type="button"
                  onClick={openNewSlotModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer"
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>+ Nuevo entreno</span>
                </button>
                <button
                  type="button"
                  onClick={() => openScheduleMatchModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs font-label-md uppercase font-bold shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>+ Programar partido</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="bg-error-container/40 border border-error/40 text-error px-4 py-3 text-xs sm:text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="break-words">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-error hover:text-white cursor-pointer shrink-0"
            aria-label="Cerrar error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros limpios por Equipo, Jornada y Vista */}
      {data && (
        <section className="bg-surface-container border border-white/10 p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="min-w-0">
              <label htmlFor="est-filter-team" className="block text-[10px] uppercase font-bold tracking-wider text-tertiary mb-1">
                Equipo
              </label>
              <select
                id="est-filter-team"
                value={filterTeamId}
                onChange={(e) => {
                  const nextTeam = e.target.value;
                  setFilterTeamId(nextTeam);
                  if (filterRound !== 'ALL' && nextTeam !== 'ALL') {
                    const hasRound = (data?.homeMatches || []).some(
                      (m) => m.teamSeasonId === nextTeam && String(m.round) === filterRound
                    );
                    if (!hasRound) setFilterRound('ALL');
                  }
                }}
                aria-label="Filtrar por equipo"
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-primary-container"
              >
                <option value="ALL">Todos los equipos ({data.teams.length})</option>
                {groupByCategoryFamily(data.teams, (t) => `${t.categoryId} ${t.name}`).map(
                  ({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)} ({t.association})
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="est-filter-round" className="block text-[10px] uppercase font-bold tracking-wider text-tertiary mb-1">
                Jornada (partidos en casa)
              </label>
              <select
                id="est-filter-round"
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value)}
                aria-label="Filtrar por jornada"
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-primary-container"
              >
                <option value="ALL">Todas las jornadas</option>
                {roundOptions.map((opt) => (
                  <option key={opt.round} value={String(opt.round)}>
                    Jornada {opt.round} ({opt.count} en casa)
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-tertiary mb-1">
                Mostrar en cuadrante
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'BOTH', label: 'Ambos' },
                    { id: 'TRAININGS', label: 'Entrenos' },
                    { id: 'MATCHES', label: 'Partidos' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`px-2 py-2 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                      viewMode === mode.id
                        ? 'bg-primary-container text-white border-primary-container'
                        : 'bg-surface-container-low text-tertiary border-white/15 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-tertiary">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-surface-container-low border border-white/25 inline-block" />
                Entreno semanal ({filteredSlots.length})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500/30 border border-amber-400 inline-block" />
                Partido en casa ({filteredHomeMatches.length})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${COURT_BADGE_STYLES.P1}`}>P1</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${COURT_BADGE_STYLES.P2}`}>P2</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${COURT_BADGE_STYLES.P3}`}>P3</span>
              <span className="hidden sm:inline text-tertiary/80 ml-1">
                {canManageSchedule ? '· Haz clic en cualquier ticket para editar' : ''}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Propuestas Pendientes (si existen) */}
      {data && pendingProposals.length > 0 && (
        <section className="bg-surface-container border border-amber-500/35 p-4 space-y-3">
          <h2 className="font-headline-sm text-sm uppercase tracking-wider text-amber-300">
            Propuestas de cambio pendientes ({pendingProposals.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {pendingProposals.map((p) => (
              <div
                key={p.id}
                className="bg-surface-container-low border border-white/10 p-3 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-bold text-on-surface">{p.teamName}</span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold border bg-amber-950/60 text-amber-300 border-amber-500/40">
                    Pendiente
                  </span>
                </div>
                <p className="text-primary font-semibold">
                  {WEEKDAY_LABEL_MAP.get(p.proposedWeekday)} · {p.proposedStartTime}-{p.proposedEndTime}
                  {p.proposedCourtName ? ` · ${getShortCourtLabel(p.proposedCourtName)}` : ''}
                </p>
                <p className="text-tertiary break-words">
                  {p.reason} <span className="opacity-70">({p.proposedByName})</span>
                </p>

                {canManageSchedule && (
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
        </section>
      )}

      {/* Cuadrante Semanal Lunes-Domingo (Sergio Scariolo · P1, P2, P3) */}
      {data && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {WEEKDAYS.map((day) => {
            const daySlots = filteredSlots.filter((s) => s.weekday === day.value);
            const dayMatches = filteredHomeMatches.filter((m) => m.weekday === day.value);
            const totalItems = daySlots.length + dayMatches.length;

            return (
              <div
                key={day.value}
                className="bg-surface-container border border-white/10 flex flex-col min-w-0"
              >
                <div className="px-3 py-2.5 bg-surface-container-low border-b border-white/10 flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-xs uppercase tracking-wider text-on-surface font-bold">
                    {day.label}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-surface-container-high text-primary border border-white/10">
                    {totalItems}
                  </span>
                </div>

                <div className="p-2.5 space-y-2 flex-1">
                  {totalItems === 0 ? (
                    <p className="text-[11px] text-tertiary/60 text-center py-4">Sin actividad</p>
                  ) : (
                    <>
                      {/* Tickets de Entrenamientos */}
                      {daySlots.map((slot) => {
                        const hasConflict = conflictSlotIds.has(slot.id);
                        const courtLabel = getShortCourtLabel(slot.courtCode || slot.courtName);
                        const courtStyle =
                          COURT_BADGE_STYLES[courtLabel] ||
                          'bg-surface-container text-on-surface border-white/20';
                        const isInteractive = canManageSchedule || canProposeSchedule;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={!isInteractive}
                            onClick={() => {
                              if (canManageSchedule) {
                                openEditSlotModal(slot);
                              } else if (canProposeSchedule) {
                                openProposeFromSlot(slot);
                              }
                            }}
                            className={`w-full text-left p-2.5 border space-y-1.5 text-xs transition-colors ${
                              isInteractive ? 'cursor-pointer hover:border-primary/60' : 'cursor-default'
                            } ${
                              hasConflict
                                ? 'bg-error-container/25 border-error/60'
                                : 'bg-surface-container-low border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-primary text-[11px]">
                                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {slot.startTime}-{slot.endTime}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${courtStyle}`}
                              >
                                {courtLabel}
                              </span>
                            </div>

                            <p
                              className={`font-bold leading-tight break-words ${
                                getTeamColorTheme(slot.teamName).colorKey
                                  ? getTeamColorTheme(slot.teamName).textClass
                                  : 'text-on-surface'
                              }`}
                            >
                              {slot.teamName}
                            </p>

                            {slot.staff.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {slot.staff.slice(0, 2).map((st) => (
                                  <span
                                    key={`${slot.id}-${st.userId}-${st.staffFunction}`}
                                    className="px-1.5 py-0.5 text-[10px] bg-surface-container text-on-surface/85 border border-white/10"
                                  >
                                    {st.name.split(' ')[0]} ({STAFF_FN_SHORT[st.staffFunction] || st.staffFunction})
                                  </span>
                                ))}
                              </div>
                            )}

                            {slot.notes && (
                              <p className="text-[10px] text-tertiary truncate">{slot.notes}</p>
                            )}

                            {hasConflict && (
                              <p className="text-[10px] font-bold uppercase text-error flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Solape activo
                              </p>
                            )}
                          </button>
                        );
                      })}

                      {/* Tickets de Partidos en Casa */}
                      {dayMatches.map((m) => {
                        const hasConflict = conflictMatchIds.has(m.id);
                        const courtLabel = m.courtCode || 'S/P';
                        const courtStyle =
                          (m.courtCode && COURT_BADGE_STYLES[m.courtCode]) ||
                          'bg-amber-950/60 text-amber-200 border-amber-400/50';
                        const isConfirmed = m.scheduleStatus === 'CONFIRMADO';

                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={!canManageSchedule}
                            onClick={() => {
                              if (canManageSchedule) openScheduleMatchModal(m);
                            }}
                            className={`w-full text-left p-2.5 border space-y-1.5 text-xs transition-colors ${
                              canManageSchedule
                                ? 'cursor-pointer hover:border-amber-300'
                                : 'cursor-default'
                            } ${
                              hasConflict
                                ? 'bg-error-container/30 border-error/70'
                                : 'bg-amber-500/10 border-amber-400/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-200 text-[11px]">
                                <Trophy className="w-3 h-3 shrink-0 text-amber-300" aria-hidden="true" />
                                {m.timeStr} · {formatShortDayMonth(m.dateStr)}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${courtStyle}`}
                              >
                                {courtLabel}
                              </span>
                            </div>

                            <p
                              className={`font-bold leading-tight break-words ${
                                getTeamColorTheme(m.teamName).colorKey
                                  ? getTeamColorTheme(m.teamName).textClass
                                  : 'text-white'
                              }`}
                            >
                              {m.teamName}
                            </p>
                            <p className="text-[11px] text-on-surface/85 leading-tight break-words">
                              vs {m.opponentName}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
                              <span className="text-[10px] font-bold uppercase text-tertiary">
                                J{m.round}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                                  isConfirmed
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                    : 'bg-amber-950/70 text-amber-200 border-amber-400/50'
                                }`}
                              >
                                {isConfirmed ? 'Confirmado' : 'Pendiente'}
                              </span>
                            </div>

                            {hasConflict && (
                              <p className="text-[10px] font-bold uppercase text-error flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Solape en pista
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* MODAL: DETALLE DE CONFLICTOS */}
      <IntranetModal
        isOpen={conflictsModalOpen && Boolean(data)}
        onClose={() => setConflictsModalOpen(false)}
        title={`Conflictos detectados (${data?.conflicts.length || 0})`}
        subtitle="Solapes de pista P1/P2/P3 (entrenos y partidos en casa) o cuerpo técnico"
        size="lg"
        accent="rose"
      >
        {data && (
          <div className="space-y-2.5">
            {data.conflicts.length === 0 ? (
              <p className="text-xs text-emerald-300 text-center py-4">
                No existen conflictos activos en el Sergio Scariolo.
              </p>
            ) : (
              data.conflicts.map((c) => (
                <div
                  key={c.id}
                  className="bg-surface-container border border-error/35 p-3 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-error-container text-error">
                      {CONFLICT_TYPE_LABEL[c.type]}
                    </span>
                    <span className="font-bold text-primary">
                      {WEEKDAY_LABEL_MAP.get(c.weekday)}
                      {c.dateStr ? ` (${formatDisplayDate(c.dateStr)})` : ''}
                    </span>
                    {c.courtName && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold border border-white/15 bg-surface-container-low text-white">
                        {getShortCourtLabel(c.courtName)}
                      </span>
                    )}
                    <span className="text-tertiary font-mono">
                      {c.timeRangeA} / {c.timeRangeB}
                    </span>
                  </div>
                  <p className="text-on-surface/95 break-words">{c.summary}</p>
                </div>
              ))
            )}
          </div>
        )}
      </IntranetModal>

      {/* MODAL: CREAR / EDITAR ENTRENAMIENTO (P1, P2, P3) */}
      <IntranetModal
        isOpen={slotModalOpen && Boolean(data)}
        onClose={() => {
          setSlotModalOpen(false);
          setConfirmDeleteSlot(false);
        }}
        title={editingSlotId ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento'}
        subtitle="Pabellón Polideportivo Sergio Scariolo (P1 · P2 · P3)"
        size="md"
        accent="primary"
      >
        {data && (
          <form onSubmit={handleSaveSlot} className="space-y-3.5">
            {modalError && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label htmlFor="est-slot-team" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Equipo *
              </label>
              <select
                id="est-slot-team"
                required
                value={slotTeamId}
                onChange={(e) => setSlotTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {groupByCategoryFamily(data.teams, (t) => `${t.categoryId} ${t.name}`).map(
                  ({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)} ({t.association})
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="est-slot-court" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Pista del Sergio Scariolo *
              </label>
              <select
                id="est-slot-court"
                required
                value={slotCourtId}
                onChange={(e) => setSlotCourtId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {scarioloCourts.map((c) => {
                  const code = getShortCourtLabel(c.courtCode || c.name);
                  return (
                    <option key={c.id} value={c.id}>
                      {code} {c.surfaceType ? `— ${c.surfaceType}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="est-slot-weekday" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Día
                </label>
                <select
                  id="est-slot-weekday"
                  value={slotWeekday}
                  onChange={(e) => setSlotWeekday(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="est-slot-start" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Inicio
                </label>
                <input
                  id="est-slot-start"
                  type="time"
                  required
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
              <div>
                <label htmlFor="est-slot-end" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Fin
                </label>
                <input
                  id="est-slot-end"
                  type="time"
                  required
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
            </div>

            <div>
              <label htmlFor="est-slot-notes" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Notas (opcional)
              </label>
              <input
                id="est-slot-notes"
                type="text"
                value={slotNotes}
                onChange={(e) => setSlotNotes(e.target.value)}
                placeholder="Ej. Pista compartida hasta las 18:30"
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={slotStrict}
                onChange={(e) => setSlotStrict(e.target.checked)}
                className="accent-[#d90429]"
              />
              <span>Bloquear guardado si existe conflicto de pista o entrenador</span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
              <div>
                {editingSlotId && (
                  confirmDeleteSlot ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteEditingSlot}
                        disabled={slotSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold uppercase cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirmar borrado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSlot(false)}
                        className="px-2.5 py-2 text-xs text-tertiary hover:text-white cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSlot(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-500/40 text-rose-300 hover:bg-rose-950/60 text-xs font-bold uppercase cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSlotModalOpen(false);
                    setConfirmDeleteSlot(false);
                  }}
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
                  <span>{editingSlotId ? 'Guardar cambios' : 'Crear entreno'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: PROGRAMAR / EDITAR PARTIDO EN CASA (P1, P2, P3) */}
      <IntranetModal
        isOpen={matchModalOpen && Boolean(data)}
        onClose={() => setMatchModalOpen(false)}
        title="Programar Partido en Casa"
        subtitle={
          selectedMatchObj
            ? `J${selectedMatchObj.round} · ${selectedMatchObj.teamName} vs ${selectedMatchObj.opponentName}`
            : 'Sergio Scariolo (P1 · P2 · P3)'
        }
        size="md"
        accent="amber"
      >
        {data && (
          <form onSubmit={handleSaveHomeMatch} className="space-y-3.5">
            {modalError && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{modalError}</span>
              </div>
            )}

            {matchModalAllowPick && (
              <div>
                <label htmlFor="est-match-pick" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Partido en casa *
                </label>
                <select
                  id="est-match-pick"
                  required
                  value={matchForm.matchId}
                  onChange={(e) => handleSelectMatchInModal(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {data.homeMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      J{m.round} ({formatDisplayDate(m.dateStr)}) · {m.teamName} vs {m.opponentName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="est-match-date" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Fecha (Europe/Madrid) *
                </label>
                <input
                  id="est-match-date"
                  type="date"
                  required
                  value={matchForm.proposedDate}
                  onChange={(e) =>
                    setMatchForm((prev) => ({ ...prev, proposedDate: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
              <div>
                <label htmlFor="est-match-time" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Hora (Europe/Madrid) *
                </label>
                <input
                  id="est-match-time"
                  type="time"
                  required
                  value={matchForm.proposedTime}
                  onChange={(e) =>
                    setMatchForm((prev) => ({ ...prev, proposedTime: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Pista en Sergio Scariolo *
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['P1', 'P2', 'P3'] as const).map((code) => {
                    const selected = matchForm.courtCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setMatchForm((prev) => ({ ...prev, courtCode: code }))}
                        className={`py-2 text-xs font-bold uppercase border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-primary-container text-white border-primary-container'
                            : 'bg-surface-container-lowest text-tertiary border-white/15 hover:text-white'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="est-match-status" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Estado *
                </label>
                <select
                  id="est-match-status"
                  value={matchForm.scheduleStatus}
                  onChange={(e) =>
                    setMatchForm((prev) => ({
                      ...prev,
                      scheduleStatus:
                        e.target.value === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDIENTE',
                    }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="CONFIRMADO">Confirmado</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="est-match-notes" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Notas (opcional)
              </label>
              <textarea
                id="est-match-notes"
                rows={2}
                value={matchForm.notes}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ej. Pendiente de validación con rival o montaje de pista central"
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setMatchModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={matchSubmitting || !matchForm.matchId}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
              >
                {matchSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar Partido</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: PROPONER CAMBIO DE HORARIO (para entrenadores sin schedule.manage) */}
      <IntranetModal
        isOpen={proposeModalOpen && Boolean(data)}
        onClose={() => setProposeModalOpen(false)}
        title="Proponer Cambio de Horario"
        size="md"
        accent="amber"
      >
        {data && (
          <form onSubmit={handleCreateProposal} className="space-y-3">
            {modalError && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label htmlFor="est-prop-team" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Equipo *
              </label>
              <select
                id="est-prop-team"
                required
                value={propTeamId}
                onChange={(e) => setPropTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {groupByCategoryFamily(proposableTeams, (t) => `${t.categoryId} ${t.name}`).map(
                  ({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="est-prop-court" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Pista propuesta
              </label>
              <select
                id="est-prop-court"
                value={propCourtId}
                onChange={(e) => setPropCourtId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {scarioloCourts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getShortCourtLabel(c.courtCode || c.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="est-prop-weekday" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Día
                </label>
                <select
                  id="est-prop-weekday"
                  value={propWeekday}
                  onChange={(e) => setPropWeekday(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="est-prop-start" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Inicio
                </label>
                <input
                  id="est-prop-start"
                  type="time"
                  required
                  value={propStart}
                  onChange={(e) => setPropStart(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
              <div>
                <label htmlFor="est-prop-end" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Fin
                </label>
                <input
                  id="est-prop-end"
                  type="time"
                  required
                  value={propEnd}
                  onChange={(e) => setPropEnd(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
            </div>

            <div>
              <label htmlFor="est-prop-reason" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Motivo de la solicitud *
              </label>
              <textarea
                id="est-prop-reason"
                required
                rows={3}
                value={propReason}
                onChange={(e) => setPropReason(e.target.value)}
                placeholder="Ej. Exámenes de bachillerato o ajuste con otro equipo..."
                className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
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
        )}
      </IntranetModal>
    </div>
  );
}
