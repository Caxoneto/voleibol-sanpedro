'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  Calendar,
  CheckSquare,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';

type AssignmentRoleCode = 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE';

const ROLE_SLOTS: Array<{ code: AssignmentRoleCode; label: string; short: string }> = [
  { code: 'HEAD_COACH', label: 'Primer Entrenador', short: '1º Entr.' },
  { code: 'ASSISTANT', label: 'Ayudante', short: 'Ayudante' },
  { code: 'DELEGATE', label: 'Delegado', short: 'Delegado' },
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

interface TripsApiData {
  success: boolean;
  todayMadrid: string;
  weekendWindow: { from: string; to: string };
  teams: Array<{ id: string; name: string; association: string }>;
  matches: MatchCardItem[];
  trips: TripFullItem[];
  conflicts: ConflictItem[];
  staff: StaffMember[];
  userScheduleIndex: Record<
    string,
    Array<{ matchId: string; madridTime: string; startsAtUtc: string; teamName: string }>
  >;
}

const CONFLICT_MS = 150 * 60 * 1000;

export default function ClubDesplazamientosPage() {
  const { hasPermission } = useClubSession();
  const canManage = hasPermission('trip.manage');

  const [range, setRange] = useState<'weekend' | 'upcoming' | 'all'>('weekend');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [assocFilter, setAssocFilter] = useState<'ALL' | 'FAVB' | 'AFADE'>('ALL');
  const [onlyAway, setOnlyAway] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TripsApiData | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Selección de partidos para agrupar en expedición
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

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
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          range: currentRange,
          teamId: currentTeam,
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
    void loadTripsData(range, teamFilter, controller.signal);
    return () => controller.abort();
  }, [range, teamFilter, loadTripsData]);

  const filteredMatches = useMemo(() => {
    if (!data) return [];
    const q = searchTerm.trim().toLowerCase();
    return data.matches.filter((m) => {
      if (assocFilter !== 'ALL' && m.association !== assocFilter) return false;
      if (onlyAway && m.isClubHome) return false;
      if (q) {
        const haystack = `${m.teamName} ${m.homeTeamName} ${m.awayTeamName} ${m.venueName} ${m.locality}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, assocFilter, onlyAway, searchTerm]);

  function checkCandidateNearConflict(
    userId: string,
    match: MatchCardItem
  ): { conflict: boolean; label: string | null } {
    if (!data) return { conflict: false, label: null };
    const entries = data.userScheduleIndex[`${userId}::${match.madridDate}`] || [];
    const targetMs = new Date(match.matchDateUtc).getTime();
    for (const e of entries) {
      if (e.matchId === match.id) continue;
      const diff = Math.abs(new Date(e.startsAtUtc).getTime() - targetMs);
      if (diff < CONFLICT_MS) {
        return {
          conflict: true,
          label: `${e.teamName} ${e.madridTime}`,
        };
      }
    }
    return { conflict: false, label: null };
  }

  async function handleAssignRole(
    match: MatchCardItem,
    role: AssignmentRoleCode,
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
      setFeedback({ type: 'ok', text: 'Asignación técnica guardada.' });
      await loadTripsData(range, teamFilter);
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
      await loadTripsData(range, teamFilter);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error quitando asignación.',
      });
    } finally {
      setBusyKey(null);
    }
  }

  function toggleSelectMatch(matchId: string) {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
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
      departureTimeMadrid: '08:30',
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
      await loadTripsData(range, teamFilter);
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
      await loadTripsData(range, teamFilter);
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

  return (
    <div className="space-y-5 pb-12">
      {/* Cabecera + Badge de Conflictos */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bus className="w-4 h-4 text-primary-container" aria-hidden="true" />
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Logística Interna · Solo Staff
              </span>
            </div>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Desplazamientos Técnicos de Jornada
            </h1>
            <p className="text-xs sm:text-sm text-tertiary mt-1">
              Cuadrante de entrenadores por partido, detección de solapes &lt;2h30m y expediciones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Badge destacado de Conflictos de Entrenador */}
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-2 border text-xs font-bold uppercase tracking-wider ${
                (data?.conflicts.length || 0) > 0
                  ? 'bg-rose-950/70 border-rose-400 text-rose-200 shadow-[3px_3px_0px_0px_#0e0e0e]'
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Conflictos de Entrenador: {data ? data.conflicts.length : '—'}
              </span>
            </div>

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

        {/* Panel detallado de conflictos si existen */}
        {data && data.conflicts.length > 0 && (
          <div
            role="alert"
            className="bg-rose-950/35 border border-rose-500/50 p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Solapamientos detectados (&lt; 150 min entre partidos en el mismo día Madrid)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {data.conflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="bg-surface-container-lowest/90 border border-rose-500/30 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-white">{conf.userName}</strong>
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase">
                      {conf.diffMinutes} min de margen
                    </span>
                  </div>
                  <p className="text-[11px] text-tertiary capitalize">
                    {conf.madridDateFormatted} ({conf.madridDate})
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-rose-200/90">
                    {conf.matches.map((m) => (
                      <li key={m.assignmentId}>
                        • <strong>{m.madridTime}</strong> — {m.teamName} vs {m.opponent} (
                        {m.venueName})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {feedback && (
        <div
          role="alert"
          className={`px-4 py-3 border text-xs sm:text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros de jornada */}
      <div className="bg-surface-container border border-white/10 p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'weekend', label: 'Próxima jornada / Fin de semana' },
              { id: 'upcoming', label: 'Próximos partidos' },
              { id: 'all', label: 'Todos los partidos' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                range === r.id
                  ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container-low text-tertiary border-white/15 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-white/10">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            aria-label="Filtrar por equipo"
            className="bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
          >
            <option value="ALL">Todos los equipos autorizados</option>
            {(data?.teams || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
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
              placeholder="Buscar rival, localidad o pabellón..."
              className="w-full bg-surface-container-lowest border border-white/20 pl-9 pr-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyAway((prev) => !prev)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer flex items-center justify-center gap-2 ${
              onlyAway
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/60'
                : 'bg-surface-container-lowest text-tertiary border-white/15 hover:text-white'
            }`}
          >
            <Bus className="w-4 h-4" aria-hidden="true" />
            <span>{onlyAway ? 'Solo fuera de casa ✓' : 'Solo fuera de casa'}</span>
          </button>
        </div>
      </div>

      {/* Expediciones del cuerpo técnico */}
      {data && data.trips.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
            Expediciones del Cuerpo Técnico ({data.trips.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.trips.map((trip) => (
              <article
                key={trip.id}
                className="bg-surface-container border border-amber-400/40 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {trip.madridDate} · Salida {trip.departureTimeMadrid}
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
                  <p className="text-xs text-on-surface">
                    <strong className="text-tertiary">Punto de encuentro:</strong>{' '}
                    {trip.meetingPoint}
                  </p>
                )}
                {trip.transportNotes && (
                  <p className="text-xs text-tertiary bg-surface-container-low px-2.5 py-1.5 border border-white/5">
                    {trip.transportNotes}
                  </p>
                )}

                <div className="pt-1.5 border-t border-white/10 text-[11px] text-tertiary">
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
        </section>
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
              Cuadrante de Partidos ({filteredMatches.length})
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
              No hay partidos para los filtros seleccionados. Prueba &ldquo;Próximos partidos&rdquo; o
              &ldquo;Todos los partidos&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredMatches.map((match) => {
                const isSelected = selectedMatchIds.includes(match.id);
                const opponent = match.isClubHome ? match.awayTeamName : match.homeTeamName;

                return (
                  <article
                    key={match.id}
                    className={`bg-surface-container border p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3 ${
                      match.hasConflict
                        ? 'border-rose-500/70'
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
                            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                              match.isClubHome
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-950/60 text-amber-200 border-amber-400/50'
                            }`}
                          >
                            {match.isClubHome ? 'LOCAL' : 'FUERA'}
                          </span>
                          {match.hasConflict && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-rose-600 text-white">
                              Conflicto &lt;2h30m
                            </span>
                          )}
                          {match.trip && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-200 border border-amber-400/40">
                              Expedición {match.trip.departureTimeMadrid}
                            </span>
                          )}
                        </div>

                        <h3 className="font-headline text-base sm:text-lg font-bold text-white">
                          {match.teamName}
                        </h3>
                        <p className="text-xs font-semibold text-on-surface/90">
                          {match.isClubHome ? 'vs ' : '@ '}
                          {opponent}
                        </p>
                      </div>

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

                    {/* Fecha, hora y pabellón */}
                    <div className="bg-surface-container-low border border-white/10 p-2.5 text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface">
                        <span className="inline-flex items-center gap-1 capitalize">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          {match.madridDateFormatted} ({match.madridDate})
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-white">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          {match.madridTime}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 text-tertiary">
                        <span className="inline-flex items-start gap-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="break-words">
                            {match.venueName}
                            {match.locality ? ` · ${match.locality}` : ''}
                          </span>
                        </span>
                        {match.googleMapsUrl && (
                          <a
                            href={match.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                          >
                            <span>Mapa</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Asignaciones de Primer Entrenador, Ayudante y Delegado */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Cuerpo Técnico Asignado</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                                  ? 'bg-rose-950/30 border-rose-500/50'
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
                                    const near = checkCandidateNearConflict(st.id, match);
                                    return (
                                      <option key={st.id} value={st.id}>
                                        {near.conflict
                                          ? `⚠ [SOLAPE ${near.label}] ${st.name}`
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

      {/* ==================== MODAL EXPEDICIÓN CUERPO TÉCNICO ==================== */}
      {tripModalOpen && data && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expedición del cuerpo técnico"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <form
            onSubmit={handleSaveTrip}
            className="bg-surface-container border border-white/20 w-full sm:max-w-lg p-4 sm:p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold uppercase text-white flex items-center gap-2">
                <Bus className="w-4 h-4 text-primary" />
                <span>
                  {tripForm.tripId ? 'Editar Expedición' : 'Agrupar Desplazamiento Técnico'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setTripModalOpen(false)}
                className="p-1 text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fecha (Madrid)
                  </label>
                  <input
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Hora de salida (Madrid)
                  </label>
                  <input
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Localidad destino
                </label>
                <input
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Pabellón destino (opcional)
                </label>
                <input
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Punto de encuentro
                </label>
                <input
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Notas internas de transporte / coches
                </label>
                <textarea
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
                  Vincular partidos de {tripForm.madridDate || 'la fecha'}
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTripModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
