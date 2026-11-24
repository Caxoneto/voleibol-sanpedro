'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  Calendar,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Radio,
  Search,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import StreamingModal from '@/components/StreamingModal';
import { useStreaming } from '@/lib/use-streaming';
import { formatDisplayDate, formatMadridDateString } from '@/lib/date-utils';
import { getShortTeamLabelInFamily, getTeamColorTheme, groupByCategoryFamily } from '@/lib/club-info';

type AssignmentRoleCode = 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE';
type ScheduleStatusCode = 'PENDIENTE' | 'CONFIRMADO' | 'OFICIAL';

const ROLE_SLOTS: Array<{ code: 'HEAD_COACH' | 'ASSISTANT'; label: string; short: string }> = [
  { code: 'HEAD_COACH', label: 'Entrenador Principal', short: 'Entrenador' },
  { code: 'ASSISTANT', label: 'Ayudante', short: 'Ayudante' },
];

interface MatchAssignmentItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  assignmentRole: AssignmentRoleCode;
  tripId: string | null;
  notes: string | null;
  hasConflict: boolean;
}

interface StaffTripSummary {
  id: string;
  madridDate: string;
  destinationLocality: string;
  venueName: string | null;
  departureTimeMadrid: string;
  meetingPoint: string | null;
  transportNotes: string | null;
}

interface MatchCardItem {
  id: string;
  teamSeasonId: string;
  teamName: string;
  association: 'FAVB' | 'AFADE';
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  isClubHome: boolean;
  venueName: string;
  locality: string;
  court: string | null;
  venueEstimated: boolean;
  venueOverride: string | null;
  localityOverride: string | null;
  proposedDate: string;
  proposedTime: string;
  scheduleStatus: ScheduleStatusCode;
  departureTimeMadrid: string | null;
  scheduleNotes: string | null;
  isScheduledManually: boolean;
  officialMadridDate: string;
  officialMadridTime: string;
  googleMapsUrl: string | null;
  matchDateUtc: string;
  madridDate: string;
  madridTime: string;
  madridDateFormatted: string;
  status: string;
  assignments: MatchAssignmentItem[];
  hasConflict: boolean;
  canManageMatch: boolean;
  trip: StaffTripSummary | null;
}

interface TripFullItem extends StaffTripSummary {
  createdByName: string | null;
  createdAt: string;
  linkedMatchIds: string[];
  linkedMatches: Array<{
    matchId: string;
    teamSeasonId: string;
    teamName: string;
    madridTime: string;
    opponent: string;
  }>;
}

interface ConflictItem {
  id: string;
  userId: string;
  userName: string;
  madridDate: string;
  madridDateFormatted: string;
  diffMinutes: number;
  matches: Array<{
    assignmentId: string;
    matchId: string;
    teamSeasonId: string;
    teamName: string;
    madridTime: string;
    opponent: string;
    venueName: string;
    locality: string;
    assignmentRole: AssignmentRoleCode;
  }>;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  teamSeasonIds: string[];
}

interface SameDayWarningItem {
  matchId: string;
  teamName: string;
  timeStr: string;
  venueName: string;
  locality: string;
  isClubHome: boolean;
  diffMinutes?: number;
}

interface UserScheduleEntry {
  matchId: string;
  madridTime: string;
  startsAtUtc: string;
  teamName: string;
  venueName: string;
  locality: string;
  isClubHome: boolean;
}

interface TripsApiData {
  success: boolean;
  todayMadrid: string;
  weekendWindow: { from: string; to: string };
  teams: Array<{ id: string; name: string; association: string }>;
  rounds: number[];
  awayRounds: number[];
  roundSummaries: Array<{ round: number; totalCount: number; awayCount: number }>;
  matches: MatchCardItem[];
  trips: TripFullItem[];
  conflicts: ConflictItem[];
  staff: StaffMember[];
  userScheduleIndex: Record<string, UserScheduleEntry[]>;
}

const CONFLICT_MS = 150 * 60 * 1000;

function getScheduleBadge(status: ScheduleStatusCode): { label: string; className: string } {
  if (status === 'CONFIRMADO') {
    return {
      label: 'Confirmado',
      className: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    };
  }
  if (status === 'PENDIENTE') {
    return {
      label: 'Pendiente de consenso',
      className: 'bg-amber-500/15 text-amber-200 border-amber-400/50',
    };
  }
  return {
    label: 'Oficial',
    className: 'bg-surface-container-highest text-tertiary border-white/15',
  };
}

export default function ClubDesplazamientosPage() {
  const { hasPermission } = useClubSession();
  const canManage = hasPermission('trip.manage');
  const canManageStreaming = hasPermission('web.streaming');
  const { status: streamingStatus, updateLocalStatus } = useStreaming();
  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);

  const [range, setRange] = useState<'weekend' | 'upcoming' | 'all'>('weekend');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [selectedRound, setSelectedRound] = useState<number | 'ALL'>('ALL');
  const [assocFilter, setAssocFilter] = useState<'ALL' | 'FAVB' | 'AFADE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TripsApiData | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Avisos informativos no bloqueantes al asignar entrenador con otro partido ese día
  const [sameDayWarningsByMatch, setSameDayWarningsByMatch] = useState<
    Record<string, { staffName: string; warnings: SameDayWarningItem[] }>
  >({});

  // Selección de partidos para agrupar en expedición
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  // Modal de conflictos
  const [conflictsModalOpen, setConflictsModalOpen] = useState(false);

  // Modal de streaming para partidos de hoy
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [streamingMatchId, setStreamingMatchId] = useState<string | null>(null);

  // Modal de Horario / Salida por partido
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);
  const [scheduleTargetMatch, setScheduleTargetMatch] = useState<MatchCardItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    matchId: '',
    teamSeasonId: '',
    proposedDate: '',
    proposedTime: '',
    scheduleStatus: 'PENDIENTE' as 'PENDIENTE' | 'CONFIRMADO',
    departureTimeMadrid: '',
    venueOverride: '',
    localityOverride: '',
    notes: '',
  });

  // Modal de expedición
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripForm, setTripForm] = useState({
    tripId: '',
    madridDate: '',
    destinationLocality: '',
    venueName: '',
    departureTimeMadrid: '08:30',
    meetingPoint: 'Pabellón Sergio Scariolo (Parking)',
    transportNotes: '',
    matchIds: [] as string[],
  });
  const [savingTrip, setSavingTrip] = useState(false);

  const loadTripsData = useCallback(
    async (
      currentRange: 'weekend' | 'upcoming' | 'all',
      currentTeam: string,
      currentRound: number | 'ALL',
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          range: currentRange,
          teamId: currentTeam,
          round: currentRound === 'ALL' ? 'ALL' : String(currentRound),
        });
        const res = await fetch(`/api/intranet/trips?${params.toString()}`, {
          cache: 'no-store',
          signal,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'No se pudo cargar el cuadrante de desplazamientos.');
        }
        setData(json as TripsApiData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error ? err.message : 'Error cargando cuadrante de jornada.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTripsData(range, teamFilter, selectedRound, controller.signal);
    return () => controller.abort();
  }, [range, teamFilter, selectedRound, loadTripsData]);

  const awayRoundsSet = useMemo(() => {
    return new Set(data?.awayRounds || []);
  }, [data?.awayRounds]);

  const filteredMatches = useMemo(() => {
    if (!data) return [];
    const q = searchTerm.trim().toLowerCase();
    return data.matches.filter((m) => {
      if (m.isClubHome) return false;
      if (assocFilter !== 'ALL' && m.association !== assocFilter) return false;
      if (q) {
        const haystack =
          `${m.teamName} ${m.homeTeamName} ${m.awayTeamName} ${m.venueName} ${m.locality}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, assocFilter, searchTerm]);

  function checkCandidateSameDay(
    userId: string,
    match: MatchCardItem
  ): { nearConflict: boolean; sameDay: boolean; label: string | null } {
    if (!data) return { nearConflict: false, sameDay: false, label: null };
    const entries = data.userScheduleIndex[`${userId}::${match.madridDate}`] || [];
    const others = entries.filter((e) => e.matchId !== match.id);
    if (others.length === 0) return { nearConflict: false, sameDay: false, label: null };

    const targetMs = new Date(match.matchDateUtc).getTime();
    for (const e of others) {
      const diff = Math.abs(new Date(e.startsAtUtc).getTime() - targetMs);
      if (diff < CONFLICT_MS) {
        return {
          nearConflict: true,
          sameDay: true,
          label: `${e.madridTime} · ${e.teamName}`,
        };
      }
    }
    const first = others[0];
    return {
      nearConflict: false,
      sameDay: true,
      label: `${first.madridTime} · ${first.teamName}`,
    };
  }

  function getPersistedSameDayNotices(match: MatchCardItem): Array<{
    staffName: string;
    other: UserScheduleEntry;
  }> {
    if (!data) return [];
    const notices: Array<{ staffName: string; other: UserScheduleEntry }> = [];
    for (const a of match.assignments) {
      if (a.assignmentRole !== 'HEAD_COACH' && a.assignmentRole !== 'ASSISTANT') continue;
      const entries = data.userScheduleIndex[`${a.userId}::${match.madridDate}`] || [];
      for (const e of entries) {
        if (e.matchId !== match.id) {
          notices.push({ staffName: a.userName, other: e });
        }
      }
    }
    return notices;
  }

  async function handleAssignRole(
    match: MatchCardItem,
    role: 'HEAD_COACH' | 'ASSISTANT',
    userId: string
  ) {
    if (!userId) return;
    const key = `${match.id}-${role}`;
    setBusyKey(key);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_match_staff',
          matchId: match.id,
          userId,
          assignmentRole: role,
          replaceRoleSlot: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo asignar el técnico al partido.');
      }

      const staffObj = data?.staff.find((s) => s.id === userId);
      const staffName = staffObj?.name || 'Técnico';
      const warnings = Array.isArray(json.sameDayWarnings)
        ? (json.sameDayWarnings as SameDayWarningItem[])
        : [];

      if (warnings.length > 0) {
        setSameDayWarningsByMatch((prev) => ({
          ...prev,
          [match.id]: { staffName, warnings },
        }));
        const firstW = warnings[0];
        setFeedback({
          type: 'warn',
          text: `${staffName} asignado. Aviso informativo: también dirige a ${firstW.teamName} ese día a las ${firstW.timeStr} (${firstW.venueName}${firstW.locality ? `, ${firstW.locality}` : ''}).`,
        });
      } else {
        setSameDayWarningsByMatch((prev) => {
          if (!prev[match.id]) return prev;
          const copy = { ...prev };
          delete copy[match.id];
          return copy;
        });
        setFeedback({ type: 'ok', text: 'Asignación técnica guardada.' });
      }

      await loadTripsData(range, teamFilter, selectedRound);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error asignando técnico.',
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setBusyKey(assignmentId);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_assignment',
          assignmentId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo quitar la asignación.');
      }
      await loadTripsData(range, teamFilter, selectedRound);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error quitando asignación.',
      });
    } finally {
      setBusyKey(null);
    }
  }

  function openScheduleModal(match: MatchCardItem) {
    setScheduleTargetMatch(match);
    setScheduleModalError(null);
    setScheduleForm({
      matchId: match.id,
      teamSeasonId: match.teamSeasonId,
      proposedDate: match.proposedDate || match.madridDate,
      proposedTime: match.proposedTime || match.madridTime,
      scheduleStatus: match.scheduleStatus === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDIENTE',
      departureTimeMadrid: match.departureTimeMadrid || '',
      venueOverride: match.venueOverride || '',
      localityOverride: match.localityOverride || '',
      notes: match.scheduleNotes || '',
    });
    setScheduleModalOpen(true);
  }

  async function handleSaveMatchSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (scheduleSaving) return;
    setScheduleSaving(true);
    setScheduleModalError(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_match_schedule',
          matchId: scheduleForm.matchId,
          teamSeasonId: scheduleForm.teamSeasonId,
          proposedDate: scheduleForm.proposedDate,
          proposedTime: scheduleForm.proposedTime,
          scheduleStatus: scheduleForm.scheduleStatus,
          departureTimeMadrid: scheduleForm.departureTimeMadrid.trim() || null,
          venueOverride: scheduleForm.venueOverride.trim() || null,
          localityOverride: scheduleForm.localityOverride.trim() || null,
          notes: scheduleForm.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar el horario del partido.');
      }
      setScheduleModalOpen(false);
      setFeedback({
        type: 'ok',
        text: `Horario actualizado (${scheduleForm.proposedDate} · ${scheduleForm.proposedTime} · ${scheduleForm.scheduleStatus === 'CONFIRMADO' ? 'Confirmado' : 'Pendiente de consenso'}).`,
      });
      await loadTripsData(range, teamFilter, selectedRound);
    } catch (err) {
      setScheduleModalError(
        err instanceof Error ? err.message : 'Error guardando horario y salida.'
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  function toggleSelectMatch(matchId: string) {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  }

  function openStreamingForMatch(matchId: string) {
    setStreamingMatchId(matchId);
    setStreamingModalOpen(true);
  }

  function openNewTripModal() {
    const selectedObjs = (data?.matches || []).filter((m) =>
      selectedMatchIds.includes(m.id)
    );
    const first = selectedObjs[0] || filteredMatches.find((m) => !m.isClubHome) || filteredMatches[0];
    setTripForm({
      tripId: '',
      madridDate: first?.madridDate || data?.todayMadrid || '',
      destinationLocality: first?.locality || '',
      venueName: first?.venueName || '',
      departureTimeMadrid: first?.departureTimeMadrid || '08:30',
      meetingPoint: 'Pabellón Sergio Scariolo (Parking)',
      transportNotes: '',
      matchIds: selectedObjs.map((m) => m.id),
    });
    setTripModalOpen(true);
  }

  function openEditTripModal(trip: TripFullItem) {
    setTripForm({
      tripId: trip.id,
      madridDate: trip.madridDate,
      destinationLocality: trip.destinationLocality,
      venueName: trip.venueName || '',
      departureTimeMadrid: trip.departureTimeMadrid,
      meetingPoint: trip.meetingPoint || '',
      transportNotes: trip.transportNotes || '',
      matchIds: trip.linkedMatchIds,
    });
    setTripModalOpen(true);
  }

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    setSavingTrip(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_staff_trip',
          tripId: tripForm.tripId || null,
          madridDate: tripForm.madridDate,
          destinationLocality: tripForm.destinationLocality,
          venueName: tripForm.venueName || null,
          departureTimeMadrid: tripForm.departureTimeMadrid,
          meetingPoint: tripForm.meetingPoint || null,
          transportNotes: tripForm.transportNotes || null,
          matchIds: tripForm.matchIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar la expedición.');
      }
      setTripModalOpen(false);
      setSelectedMatchIds([]);
      setFeedback({
        type: 'ok',
        text: `Expedición guardada (${json.linkedAssignmentsCount || 0} asignaciones vinculadas).`,
      });
      await loadTripsData(range, teamFilter, selectedRound);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error guardando expedición.',
      });
    } finally {
      setSavingTrip(false);
    }
  }

  async function handleDeleteTrip(tripId: string) {
    setBusyKey(`del-${tripId}`);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_staff_trip', tripId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo eliminar la expedición.');
      }
      setFeedback({ type: 'ok', text: 'Expedición eliminada.' });
      await loadTripsData(range, teamFilter, selectedRound);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error eliminando expedición.',
      });
    } finally {
      setBusyKey(null);
    }
  }

  const candidateMatchesForTripDate = useMemo(() => {
    if (!data || !tripForm.madridDate) return [];
    return data.matches.filter((m) => m.madridDate === tripForm.madridDate);
  }, [data, tripForm.madridDate]);

  const activeTodayMadrid = data?.todayMadrid || todayMadrid;

  return (
    <div className="space-y-5 pb-12 overflow-x-hidden">
      {/* Cabecera + Badge de Conflictos */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bus className="w-5 h-5 text-primary-container shrink-0" aria-hidden="true" />
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white break-words">
              Desplazamientos Técnicos de Jornada
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {data && data.conflicts.length > 0 && (
              <button
                type="button"
                onClick={() => setConflictsModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-950/70 hover:bg-rose-900/70 border border-rose-400 text-rose-200 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Solapes &lt;2h30: {data.conflicts.length}</span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={openNewTripModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>
                  {selectedMatchIds.length > 0
                    ? `Agrupar (${selectedMatchIds.length})`
                    : 'Nueva Expedición'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {feedback && (
        <div
          role="alert"
          className={`px-4 py-3 border text-xs sm:text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : feedback.type === 'warn'
              ? 'bg-amber-950/60 border-amber-400/60 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          <span className="break-words">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
            className="p-1 opacity-75 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros de rango, equipo y jornadas en cuadros */}
      <div className="bg-surface-container border border-white/10 p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'weekend', label: 'Próxima jornada / Fin de semana' },
                { id: 'upcoming', label: 'Próximos desplazamientos' },
                { id: 'all', label: 'Todos los desplazamientos' },
              ] as const
            ).map((r) => {
              const active = selectedRound === 'ALL' && range === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRound('ALL');
                    setRange(r.id);
                  }}
                  className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                    active
                      ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container-low text-tertiary border-white/15 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {selectedRound !== 'ALL' && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200 bg-amber-500/15 border border-amber-400/40 px-2.5 py-1">
              Mostrando Jornada J{selectedRound}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          <select
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e.target.value);
              setSelectedRound('ALL');
            }}
            aria-label="Filtrar por equipo"
            className="bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
          >
            <option value="ALL">Todos los equipos autorizados</option>
            {groupByCategoryFamily(data?.teams || [], (t) => `${t.id} ${t.name}`).map(
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

          <select
            value={assocFilter}
            onChange={(e) => setAssocFilter(e.target.value as 'ALL' | 'FAVB' | 'AFADE')}
            aria-label="Filtrar por competición"
            className="bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
          >
            <option value="ALL">FAVB + AFADE</option>
            <option value="FAVB">Solo FAVB</option>
            <option value="AFADE">Solo AFADE</option>
          </select>

          <div className="relative">
            <Search
              className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar rival, localidad o pabellón"
              placeholder="Buscar rival, localidad o pabellón..."
              className="w-full bg-surface-container-lowest border border-white/20 pl-9 pr-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
            />
          </div>
        </div>

        {/* Selector de Jornadas en cuadros */}
        {data && data.rounds.length > 0 && (
          <div className="pt-2.5 border-t border-white/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                Selector de Jornadas
              </p>
              {teamFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-200">
                  <Plane className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Jornada fuera de casa para el equipo seleccionado</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto category-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedRound('ALL')}
                className={`h-8 px-3 shrink-0 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                  selectedRound === 'ALL'
                    ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                    : 'bg-surface-container-low text-tertiary border-white/15 hover:text-white'
                }`}
              >
                Todas
              </button>

              {data.rounds.map((r) => {
                const isActive = selectedRound === r;
                const isTeamAwayRound = teamFilter !== 'ALL' && awayRoundsSet.has(r);

                let boxClass =
                  'bg-surface-container-low text-tertiary border-white/15 hover:text-white';
                if (isTeamAwayRound && isActive) {
                  boxClass =
                    'bg-amber-500/35 border-2 border-amber-300 text-white shadow-[2px_2px_0px_0px_#0e0e0e] ring-1 ring-amber-300/60';
                } else if (isTeamAwayRound) {
                  boxClass =
                    'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30';
                } else if (isActive) {
                  boxClass =
                    'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]';
                }

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRound(r)}
                    title={
                      isTeamAwayRound
                        ? `Jornada ${r} (Fuera de casa)`
                        : `Jornada ${r}`
                    }
                    className={`h-8 min-w-[44px] px-2.5 shrink-0 inline-flex items-center justify-center gap-1 text-[11px] font-bold uppercase border cursor-pointer transition-colors ${boxClass}`}
                  >
                    {isTeamAwayRound && (
                      <Plane className="w-3 h-3 shrink-0" aria-hidden="true" />
                    )}
                    <span>J{r}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expediciones del cuerpo técnico (plegable cuando hay más de 2) */}
      {data && data.trips.length > 0 && (
        <details
          open={data.trips.length <= 2}
          className="group bg-surface-container-low border border-amber-400/30"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-200 hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-200">
              Expediciones del Cuerpo Técnico ({data.trips.length})
            </h2>
            <ChevronDown className="w-4 h-4 text-amber-300 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 pt-1 border-t border-white/10">
            {data.trips.map((trip) => (
              <article
                key={trip.id}
                className="bg-surface-container border border-amber-400/40 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2 min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {formatDisplayDate(trip.madridDate)} · Salida {trip.departureTimeMadrid}
                    </p>
                    <h3 className="font-headline text-base font-bold text-white truncate">
                      {trip.destinationLocality}
                    </h3>
                    {trip.venueName && (
                      <p className="text-xs text-tertiary truncate">{trip.venueName}</p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTripModal(trip)}
                        aria-label="Editar expedición"
                        className="p-1.5 bg-surface-container-low hover:bg-surface-container-high border border-white/10 text-tertiary hover:text-white cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTrip(trip.id)}
                        disabled={busyKey === `del-${trip.id}`}
                        aria-label="Eliminar expedición"
                        className="p-1.5 bg-surface-container-low hover:bg-rose-950/60 border border-white/10 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {trip.meetingPoint && (
                  <p className="text-xs text-on-surface break-words">
                    <strong className="text-tertiary">Punto de encuentro:</strong>{' '}
                    {trip.meetingPoint}
                  </p>
                )}
                {trip.transportNotes && (
                  <p className="text-xs text-tertiary bg-surface-container-low px-2.5 py-1.5 border border-white/5 break-words">
                    {trip.transportNotes}
                  </p>
                )}

                <div className="pt-1.5 border-t border-white/10 text-[11px] text-tertiary break-words">
                  {trip.linkedMatches.length === 0 ? (
                    <span>Sin partidos con staff vinculado todavía</span>
                  ) : (
                    <span>
                      Partidos ({trip.linkedMatches.length}):{' '}
                      {trip.linkedMatches
                        .map((m) => `${m.teamName} (${m.madridTime})`)
                        .join(' · ')}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </details>
      )}

      {loading && (
        <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
          <span>Cargando partidos y asignaciones técnicas...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-error-container/30 border border-error/40 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Cuadrante de partidos */}
      {!loading && data && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
              Desplazamientos Fuera de Casa ({filteredMatches.length})
            </h2>
            {canManage && selectedMatchIds.length > 0 && (
              <button
                type="button"
                onClick={openNewTripModal}
                className="text-xs font-bold uppercase text-amber-300 hover:underline cursor-pointer"
              >
                Agrupar {selectedMatchIds.length} partido(s) en expedición →
              </button>
            )}
          </div>

          {filteredMatches.length === 0 ? (
            <div className="bg-surface-container border border-white/10 p-6 text-center text-sm text-tertiary">
              No hay desplazamientos para los filtros seleccionados. Prueba otra jornada o selecciona
              &ldquo;Todos los desplazamientos&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredMatches.map((match) => {
                const isSelected = selectedMatchIds.includes(match.id);
                const opponent = match.isClubHome ? match.awayTeamName : match.homeTeamName;
                const isTodayMatch = match.madridDate === activeTodayMadrid;
                const isThisMatchLive =
                  streamingStatus.active && streamingStatus.matchId === match.id;
                const scheduleBadge = getScheduleBadge(match.scheduleStatus);
                const freshWarning = sameDayWarningsByMatch[match.id];
                const persistedNotices = getPersistedSameDayNotices(match);

                return (
                  <article
                    key={match.id}
                    className={`bg-surface-container border p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3 min-w-0 ${
                      match.hasConflict
                        ? 'border-amber-400/70'
                        : isSelected
                        ? 'border-amber-400'
                        : 'border-white/15'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-surface-container-highest text-tertiary border border-white/10">
                            {match.association} · J{match.round}
                          </span>

                          <span
                            title="Desplazamiento fuera de casa"
                            className="inline-flex items-center justify-center px-1.5 py-0.5 border bg-amber-950/60 text-amber-200 border-amber-400/50"
                          >
                            <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="sr-only">Partido fuera de casa</span>
                          </span>

                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border ${scheduleBadge.className}`}
                          >
                            {scheduleBadge.label}
                          </span>

                          {match.departureTimeMadrid && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-200 border border-amber-400/50">
                              Salida {match.departureTimeMadrid}
                            </span>
                          )}

                          {match.trip && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-200 border border-amber-400/40">
                              Expedición {match.trip.departureTimeMadrid}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`font-headline text-base sm:text-lg font-bold break-words ${
                            getTeamColorTheme(match.teamName).colorKey
                              ? getTeamColorTheme(match.teamName).textClass
                              : 'text-white'
                          }`}
                        >
                          {match.teamName}
                        </h3>
                        <p className="text-xs font-semibold text-on-surface/90 break-words">
                          {match.isClubHome ? 'vs ' : '@ '}
                          {opponent}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {canManage && match.canManageMatch && (
                          <button
                            type="button"
                            onClick={() => openScheduleModal(match)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border bg-surface-container-low hover:bg-surface-container-high border-white/15 hover:border-amber-400/60 text-amber-200 cursor-pointer transition-colors"
                          >
                            <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Horario / Salida</span>
                          </button>
                        )}

                        {canManageStreaming && isTodayMatch && (
                          <button
                            type="button"
                            onClick={() => openStreamingForMatch(match.id)}
                            title={
                              isThisMatchLive
                                ? 'Gestionar emisión en directo'
                                : 'Emitir partido en directo'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                              isThisMatchLive
                                ? 'bg-red-700 hover:bg-red-600 border-red-400/60 text-white'
                                : 'bg-surface-container-low hover:bg-primary-container border-white/15 hover:border-primary-container text-primary hover:text-white'
                            }`}
                          >
                            <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Emitir</span>
                          </button>
                        )}

                        {canManage && match.canManageMatch && (
                          <button
                            type="button"
                            onClick={() => toggleSelectMatch(match.id)}
                            aria-pressed={isSelected}
                            title="Seleccionar para agrupar desplazamiento"
                            className="p-1.5 text-amber-300 hover:bg-surface-container-high border border-white/10 cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-tertiary" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fecha, hora, salida y pabellón real resuelto */}
                    <div className="bg-surface-container-low border border-white/10 p-2.5 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          {formatDisplayDate(match.madridDate)}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-white">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          {match.madridTime}
                        </span>
                        {match.departureTimeMadrid && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-200">
                            <Bus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            Hora de salida: {match.departureTimeMadrid}
                          </span>
                        )}
                      </div>

                      {match.googleMapsUrl ? (
                        <a
                          href={match.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 min-w-0 text-tertiary hover:text-white transition-colors group/venue"
                          title={`Abrir ${match.venueName} en Google Maps`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 break-words">
                            <span className="text-on-surface font-medium group-hover/venue:text-primary group-hover/venue:underline">
                              {match.venueName}
                            </span>
                            {match.locality && (
                              <span className="text-tertiary"> · {match.locality}</span>
                            )}
                            {match.court && (
                              <span className="text-primary font-bold"> · {match.court}</span>
                            )}
                            {match.venueEstimated && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-300/90">
                                (Sede habitual)
                              </span>
                            )}
                          </div>
                        </a>
                      ) : (
                        <div className="flex items-start gap-1.5 min-w-0 text-tertiary">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0 break-words">
                            <span className="text-on-surface font-medium">
                              {match.venueName}
                            </span>
                            {match.locality && (
                              <span className="text-tertiary"> · {match.locality}</span>
                            )}
                            {match.court && (
                              <span className="text-primary font-bold"> · {match.court}</span>
                            )}
                            {match.venueEstimated && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-300/90">
                                (Sede habitual)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {match.scheduleNotes && (
                        <p className="text-[11px] text-amber-200/90 border-t border-white/5 pt-1 break-words">
                          Nota: {match.scheduleNotes}
                        </p>
                      )}
                    </div>

                    {/* Aviso informativo compacto en 1 línea si un entrenador coincide ese mismo día */}
                    {(freshWarning || persistedNotices.length > 0) && (
                      <div className="bg-amber-500/10 border border-amber-400/40 px-2.5 py-1.5 text-[11px] text-amber-200 space-y-0.5">
                        {freshWarning
                          ? freshWarning.warnings.map((w) => (
                              <p key={`fresh-${w.matchId}`} className="flex items-center gap-1.5 truncate">
                                <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  <strong>Doble jornada ({freshWarning.staffName}):</strong>{' '}
                                  {w.timeStr} · {w.teamName} · {w.venueName}
                                  {w.locality ? ` (${w.locality})` : ''}
                                </span>
                              </p>
                            ))
                          : persistedNotices.map((n, idx) => (
                              <p key={`persisted-${n.other.matchId}-${idx}`} className="flex items-center gap-1.5 truncate">
                                <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  <strong>Doble jornada ({n.staffName}):</strong>{' '}
                                  {n.other.madridTime} · {n.other.teamName} · {n.other.venueName}
                                  {n.other.locality ? ` (${n.other.locality})` : ''}
                                </span>
                              </p>
                            ))}
                      </div>
                    )}

                    {/* Asignaciones de Entrenador Principal y Ayudante (sin DELEGATE) */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Cuerpo Técnico Asignado</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ROLE_SLOTS.map((slot) => {
                          const assigned = match.assignments.find(
                            (a) => a.assignmentRole === slot.code
                          );
                          const slotBusy = busyKey === `${match.id}-${slot.code}`;

                          return (
                            <div
                              key={slot.code}
                              className={`border p-2 space-y-1.5 ${
                                assigned?.hasConflict
                                  ? 'bg-amber-950/30 border-amber-400/50'
                                  : 'bg-surface-container-lowest border-white/10'
                              }`}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                                {slot.label}
                              </p>

                              {assigned ? (
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-white truncate">
                                    {assigned.userName}
                                  </span>
                                  {canManage && match.canManageMatch && (
                                    <button
                                      type="button"
                                      onClick={() => void handleRemoveAssignment(assigned.id)}
                                      disabled={busyKey === assigned.id}
                                      aria-label={`Quitar ${assigned.userName}`}
                                      className="p-0.5 text-rose-300 hover:bg-rose-950/60 cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-500 italic">Sin asignar</p>
                              )}

                              {canManage && match.canManageMatch && (
                                <select
                                  value=""
                                  disabled={slotBusy}
                                  aria-label={`Asignar ${slot.label} para ${match.teamName}`}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      void handleAssignRole(match, slot.code, e.target.value);
                                    }
                                  }}
                                  className="w-full bg-surface-container border border-white/15 px-2 py-1 text-[11px] text-on-surface outline-none focus:border-primary-container"
                                >
                                  <option value="">
                                    {slotBusy
                                      ? 'Guardando...'
                                      : assigned
                                      ? 'Cambiar...'
                                      : `+ ${slot.short}`}
                                  </option>
                                  {data.staff.map((st) => {
                                    const check = checkCandidateSameDay(st.id, match);
                                    return (
                                      <option key={st.id} value={st.id}>
                                        {check.nearConflict
                                          ? `⚠ [SOLAPE ${check.label}] ${st.name}`
                                          : check.sameDay
                                          ? `ℹ [MISMO DÍA ${check.label}] ${st.name}`
                                          : st.name}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== MODAL HORARIO / SALIDA POR PARTIDO ==================== */}
      <IntranetModal
        isOpen={scheduleModalOpen && Boolean(scheduleTargetMatch)}
        onClose={() => setScheduleModalOpen(false)}
        title="Horario, Sede y Salida"
        subtitle={
          scheduleTargetMatch
            ? `${scheduleTargetMatch.teamName} ${
                scheduleTargetMatch.isClubHome ? 'vs' : '@'
              } ${
                scheduleTargetMatch.isClubHome
                  ? scheduleTargetMatch.awayTeamName
                  : scheduleTargetMatch.homeTeamName
              }`
            : undefined
        }
        accent="amber"
        size="md"
      >
        {scheduleTargetMatch && (
          <form onSubmit={handleSaveMatchSchedule} className="space-y-3.5">
            {scheduleModalError && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{scheduleModalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="desp-sched-date" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Fecha del partido (Madrid) *
                </label>
                <input
                  id="desp-sched-date"
                  type="date"
                  required
                  value={scheduleForm.proposedDate}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, proposedDate: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="desp-sched-time" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Hora del partido (Madrid) *
                </label>
                <input
                  id="desp-sched-time"
                  type="time"
                  required
                  value={scheduleForm.proposedTime}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, proposedTime: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="desp-sched-status" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Estado del horario *
                </label>
                <select
                  id="desp-sched-status"
                  value={scheduleForm.scheduleStatus}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      scheduleStatus:
                        e.target.value === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDIENTE',
                    }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  <option value="PENDIENTE">Pendiente de consenso</option>
                  <option value="CONFIRMADO">Confirmado</option>
                </select>
              </div>
              <div>
                <label htmlFor="desp-sched-dep-time" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Hora de desplazamiento (opcional)
                </label>
                <input
                  id="desp-sched-dep-time"
                  type="time"
                  value={scheduleForm.departureTimeMadrid}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      departureTimeMadrid: e.target.value,
                    }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="desp-sched-venue" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Pabellón (opcional, sobreescribe sede)
                </label>
                <input
                  id="desp-sched-venue"
                  type="text"
                  value={scheduleForm.venueOverride}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, venueOverride: e.target.value }))
                  }
                  placeholder={scheduleTargetMatch.venueName}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="desp-sched-locality" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Localidad (opcional)
                </label>
                <input
                  id="desp-sched-locality"
                  type="text"
                  value={scheduleForm.localityOverride}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, localityOverride: e.target.value }))
                  }
                  placeholder={scheduleTargetMatch.locality || 'Ej: Málaga'}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="desp-sched-notes" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                Notas logísticas o de consenso (opcional)
              </label>
              <textarea
                id="desp-sched-notes"
                rows={2}
                value={scheduleForm.notes}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Ej: Acordado con el club rival cambiar al sábado tarde / Salida desde parking Scariolo"
                className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={scheduleSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {scheduleSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{scheduleSaving ? 'Guardando...' : 'Guardar Horario'}</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* ==================== MODAL CONFLICTOS DE ENTRENADORES ==================== */}
      <IntranetModal
        isOpen={conflictsModalOpen && Boolean(data && data.conflicts.length > 0)}
        onClose={() => setConflictsModalOpen(false)}
        title="Coincidencias de Entrenadores (< 150 min)"
        subtitle="Aviso informativo de partidos cercanos en el mismo día (Europe/Madrid)"
        accent="amber"
        size="lg"
      >
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.conflicts.map((conf) => (
              <div
                key={conf.id}
                className="bg-surface-container-lowest/90 border border-amber-400/40 p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-white">{conf.userName}</strong>
                  <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[10px] font-bold uppercase shrink-0">
                    {conf.diffMinutes} min de margen
                  </span>
                </div>
                <p className="text-[11px] text-tertiary">
                  {formatDisplayDate(conf.madridDate)}
                </p>
                <ul className="space-y-1 text-[11px] text-amber-100/90">
                  {conf.matches.map((m) => (
                    <li key={m.assignmentId}>
                      • <strong>{m.madridTime}</strong> — {m.teamName} vs {m.opponent} (
                      {m.venueName}
                      {m.locality ? `, ${m.locality}` : ''})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </IntranetModal>

      {/* ==================== MODAL EXPEDICIÓN CUERPO TÉCNICO ==================== */}
      <IntranetModal
        isOpen={tripModalOpen && Boolean(data)}
        onClose={() => setTripModalOpen(false)}
        title={tripForm.tripId ? 'Editar Expedición Cuerpo Técnico' : 'Expedición Cuerpo Técnico'}
        accent="amber"
        size="md"
      >
        {data && (
          <form onSubmit={handleSaveTrip} className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="desp-trip-date" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fecha (Madrid)
                  </label>
                  <input
                    id="desp-trip-date"
                    type="date"
                    required
                    value={tripForm.madridDate}
                    onChange={(e) =>
                      setTripForm((prev) => ({
                        ...prev,
                        madridDate: e.target.value,
                      }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="desp-trip-time" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Hora de salida (Madrid)
                  </label>
                  <input
                    id="desp-trip-time"
                    type="time"
                    required
                    value={tripForm.departureTimeMadrid}
                    onChange={(e) =>
                      setTripForm((prev) => ({
                        ...prev,
                        departureTimeMadrid: e.target.value,
                      }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="desp-trip-dest" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Localidad destino
                </label>
                <input
                  id="desp-trip-dest"
                  type="text"
                  required
                  value={tripForm.destinationLocality}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      destinationLocality: e.target.value,
                    }))
                  }
                  placeholder="Ej: Málaga / Vélez-Málaga / Córdoba"
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="desp-trip-venue" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Pabellón destino (opcional)
                </label>
                <input
                  id="desp-trip-venue"
                  type="text"
                  value={tripForm.venueName}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, venueName: e.target.value }))
                  }
                  placeholder="Ej: Complejo Polideportivo Elola"
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="desp-trip-meeting" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Punto de encuentro
                </label>
                <input
                  id="desp-trip-meeting"
                  type="text"
                  value={tripForm.meetingPoint}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, meetingPoint: e.target.value }))
                  }
                  placeholder="Ej: Parking Pabellón Sergio Scariolo"
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label htmlFor="desp-trip-notes" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Notas internas de transporte / coches
                </label>
                <textarea
                  id="desp-trip-notes"
                  rows={2}
                  value={tripForm.transportNotes}
                  onChange={(e) =>
                    setTripForm((prev) => ({
                      ...prev,
                      transportNotes: e.target.value,
                    }))
                  }
                  placeholder="Ej: Salen 2 vehículos de entrenadores + material de botiquín"
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Partidos de esa fecha para vincular */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                  Vincular partidos de {tripForm.madridDate ? formatDisplayDate(tripForm.madridDate) : 'la fecha'}
                </p>
                {candidateMatchesForTripDate.length === 0 ? (
                  <p className="text-xs text-tertiary italic">
                    No hay partidos cargados en la vista actual para esa fecha.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-white/10 p-2 bg-surface-container-lowest">
                    {candidateMatchesForTripDate.map((m) => {
                      const checked = tripForm.matchIds.includes(m.id);
                      const hasStaff = m.assignments.length > 0;
                      return (
                        <label
                          key={m.id}
                          className="flex items-start gap-2 text-xs cursor-pointer p-1 hover:bg-white/[0.03]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setTripForm((prev) => ({
                                ...prev,
                                matchIds: isChecked
                                  ? [...prev.matchIds, m.id]
                                  : prev.matchIds.filter((id) => id !== m.id),
                              }));
                            }}
                            className="mt-0.5 accent-[#d90429]"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-white">
                              {m.madridTime} · {m.teamName}
                            </p>
                            <p className="text-[11px] text-tertiary truncate">
                              {m.venueName}
                              {!hasStaff && ' · (Asigna staff al partido para vincularlo)'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTripModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingTrip}
                className="px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {savingTrip ? 'Guardando...' : 'Guardar Expedición'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {canManageStreaming && (
        <StreamingModal
          isOpen={streamingModalOpen}
          onClose={() => {
            setStreamingModalOpen(false);
            setStreamingMatchId(null);
          }}
          isLive={streamingStatus.active}
          currentUrl={streamingStatus.url}
          matchId={streamingStatus.matchId}
          matchTitle={streamingStatus.matchTitle}
          defaultMatchId={streamingMatchId}
          onSuccess={updateLocalStatus}
        />
      )}
    </div>
  );
}
