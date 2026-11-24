'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { formatDisplayDate, formatMadridDateString } from '@/lib/date-utils';
import { getShortTeamLabelInFamily, getTeamColorTheme, groupByCategoryFamily } from '@/lib/club-info';

interface TeamOption {
  id: string;
  name: string;
  division: string;
}

interface CoachScheduleSlot {
  teamSeasonId: string;
  teamName: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface CoachItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  teams: Array<{ teamSeasonId: string; teamName: string; fn: string }>;
  weeklySchedule: CoachScheduleSlot[];
}

interface CoachAvailabilityItem {
  coachId: string;
  coachName: string;
  available: boolean;
  conflicts: string[];
}

interface SubstitutionItem {
  id: string;
  sessionId: string | null;
  teamSeasonId: string;
  teamName: string;
  madridDate: string;
  madridDateFormatted: string;
  startTime: string;
  endTime: string;
  absentUserId: string;
  absentUserName: string;
  substituteUserId: string | null;
  substituteUserName: string | null;
  reason: string;
  status: 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  tempOverrideId: string | null;
  overrideValidFromMadrid: string | null;
  overrideValidToMadrid: string | null;
  assignedByName: string | null;
  createdAt: string;
  canCancel: boolean;
  canAssignHere: boolean;
  coachAvailability: CoachAvailabilityItem[];
}

interface SubstitutionsApiResponse {
  success: boolean;
  todayMadrid: string;
  availableTeams: TeamOption[];
  allTeams: TeamOption[];
  coaches: CoachItem[];
  substitutions: SubstitutionItem[];
}

function getIsoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

function toMins(hhmm: string): number {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export default function ClubSustitucionesPage() {
  const { session, hasPermission } = useClubSession();
  const canAssign = hasPermission('substitution.assign');

  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubstitutionsApiResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ASSIGNED' | 'CANCELLED'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Selección de sustituto por tarjeta
  const [selectedCoachBySubId, setSelectedCoachBySubId] = useState<Record<string, string>>({});
  const [assigningSubId, setAssigningSubId] = useState<string | null>(null);
  const [cancellingSubId, setCancellingSubId] = useState<string | null>(null);

  // Modal de asignación directa (sin solicitud previa)
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [directForm, setDirectForm] = useState({
    teamSeasonId: '',
    madridDate: todayMadrid,
    startTime: '18:00',
    endTime: '19:30',
    absentUserId: '',
    substituteUserId: '',
    reason: 'Cobertura técnica directa',
  });
  const [submittingDirect, setSubmittingDirect] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intranet/substitutions', {
        cache: 'no-store',
        signal,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudieron cargar las sustituciones.');
      }
      const typed = json as SubstitutionsApiResponse;
      setData(typed);

      setDirectForm((prev) => ({
        ...prev,
        teamSeasonId: prev.teamSeasonId || typed.allTeams[0]?.id || '',
        absentUserId: prev.absentUserId || session.user.id,
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error cargando sustituciones.');
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  async function handleAssignSubstitute(sub: SubstitutionItem) {
    const substituteUserId =
      selectedCoachBySubId[sub.id] ||
      sub.coachAvailability.find((c) => c.available)?.coachId ||
      '';

    if (!substituteUserId) {
      setFeedback({ type: 'err', text: 'Selecciona un entrenador sustituto.' });
      return;
    }

    setAssigningSubId(sub.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_substitute',
          substitutionId: sub.id,
          substituteUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo asignar el sustituto.');
      }
      setFeedback({
        type: 'ok',
        text: json.emailSent
          ? 'Sustituto asignado, permiso temporal de asistencia concedido (-2h/+24h) y aviso enviado por email.'
          : 'Sustituto asignado y permiso temporal de asistencia concedido (-2h/+24h).',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error asignando sustituto.',
      });
    } finally {
      setAssigningSubId(null);
    }
  }

  async function handleDirectAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!directForm.substituteUserId || !directForm.teamSeasonId) return;
    setSubmittingDirect(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_substitute',
          teamSeasonId: directForm.teamSeasonId,
          madridDate: directForm.madridDate,
          startTime: directForm.startTime,
          endTime: directForm.endTime,
          absentUserId: directForm.absentUserId || session.user.id,
          substituteUserId: directForm.substituteUserId,
          reason: directForm.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear la asignación directa.');
      }
      setDirectModalOpen(false);
      setFeedback({
        type: 'ok',
        text: json.emailSent
          ? 'Cobertura directa asignada con permiso temporal de asistencia y aviso por email.'
          : 'Cobertura directa asignada con permiso temporal de asistencia.',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error en asignación directa.',
      });
    } finally {
      setSubmittingDirect(false);
    }
  }

  async function handleCancelSub(subId: string) {
    setCancellingSubId(subId);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_substitution',
          substitutionId: subId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cancelar la sustitución.');
      }
      setFeedback({
        type: 'ok',
        text: 'Sustitución cancelada y permiso temporal revocado.',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error cancelando sustitución.',
      });
    } finally {
      setCancellingSubId(null);
    }
  }

  const counts = useMemo(() => {
    const list = data?.substitutions || [];
    return {
      total: list.length,
      open: list.filter((s) => s.status === 'OPEN').length,
      assigned: list.filter((s) => s.status === 'ASSIGNED' || s.status === 'COMPLETED').length,
      cancelled: list.filter((s) => s.status === 'CANCELLED').length,
    };
  }, [data]);

  const filteredSubs = useMemo(() => {
    const list = data?.substitutions || [];
    if (statusFilter === 'ALL') return list;
    if (statusFilter === 'ASSIGNED') {
      return list.filter((s) => s.status === 'ASSIGNED' || s.status === 'COMPLETED');
    }
    return list.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

  const directCoachConflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!data || !directForm.madridDate || !directForm.startTime || !directForm.endTime) {
      return map;
    }
    const weekday = getIsoWeekdayFromYmd(directForm.madridDate);
    const reqS = toMins(directForm.startTime);
    const reqE = toMins(directForm.endTime);

    for (const c of data.coaches) {
      const list: string[] = [];
      for (const sl of c.weeklySchedule) {
        if (sl.weekday !== weekday) continue;
        if (reqS < toMins(sl.endTime) && toMins(sl.startTime) < reqE) {
          list.push(`Entreno ${sl.teamName} (${sl.startTime}-${sl.endTime})`);
        }
      }
      map.set(c.id, list);
    }
    return map;
  }, [data, directForm.madridDate, directForm.startTime, directForm.endTime]);

  return (
    <div className="space-y-5 pb-12">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <ArrowLeftRight className="w-5 h-5 text-primary-container shrink-0" aria-hidden="true" />
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Sustituciones de Entrenadores
            </h1>
          </div>

          {canAssign && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDirectModalOpen(true)}
                disabled={loading || !data}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Asignar sustitución</span>
              </button>
            </div>
          )}
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-white/10">
          <div className="bg-surface-container-low border border-white/10 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Pendientes
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">{counts.open}</p>
          </div>
          <div className="bg-surface-container-low border border-white/10 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Asignadas
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {counts.assigned}
            </p>
          </div>
          <div className="bg-surface-container-low border border-white/10 p-2.5 sm:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
              Canceladas
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              {counts.cancelled}
            </p>
          </div>
        </div>
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

      {loading && (
        <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
          <span>Cargando sustituciones y disponibilidad de entrenadores...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-error-container/30 border border-error/40 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {!loading && data && (
        <section className="w-full space-y-4">
          {/* Filtros de estado */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'ALL', label: `Todas (${counts.total})` },
                { id: 'OPEN', label: `Pendientes (${counts.open})` },
                { id: 'ASSIGNED', label: `Asignadas (${counts.assigned})` },
                { id: 'CANCELLED', label: `Canceladas (${counts.cancelled})` },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                  statusFilter === pill.id
                    ? 'bg-primary-container text-white border-primary-container'
                    : 'bg-surface-container text-tertiary border-white/10 hover:text-white'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {filteredSubs.length === 0 ? (
            <div className="bg-surface-container border border-white/10 p-6 text-center text-sm text-tertiary">
              Sin sustituciones registradas.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredSubs.map((sub) => {
                const sortedCoaches = [...sub.coachAvailability].sort((a, b) => {
                  if (a.available !== b.available) return a.available ? -1 : 1;
                  return a.coachName.localeCompare(b.coachName, 'es');
                });
                const defaultFreeId =
                  sortedCoaches.find((c) => c.available)?.coachId ||
                  sortedCoaches[0]?.coachId ||
                  '';
                const currentSelectedCoachId =
                  selectedCoachBySubId[sub.id] ?? sub.substituteUserId ?? defaultFreeId;

                const isOpen = sub.status === 'OPEN';
                const isAssigned = sub.status === 'ASSIGNED' || sub.status === 'COMPLETED';
                const isCancelled = sub.status === 'CANCELLED';

                return (
                  <article
                    key={sub.id}
                    className={`bg-surface-container border p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3 ${
                      isOpen
                        ? 'border-amber-400/50'
                        : isAssigned
                        ? 'border-emerald-500/40'
                        : 'border-white/10 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              isOpen
                                ? 'bg-amber-950/60 text-amber-200 border-amber-400/50'
                                : isAssigned
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {isOpen
                              ? 'Pendiente cobertura'
                              : isAssigned
                              ? 'Cubierta'
                              : 'Cancelada'}
                          </span>
                          <span className="text-xs text-tertiary flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                            {formatDisplayDate(sub.madridDate)}
                          </span>
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                            {sub.startTime} – {sub.endTime}
                          </span>
                        </div>

                        <h2
                          className={`font-headline text-base sm:text-lg font-bold mt-1.5 ${
                            getTeamColorTheme(sub.teamName).colorKey
                              ? getTeamColorTheme(sub.teamName).textClass
                              : 'text-white'
                          }`}
                        >
                          {sub.teamName}
                        </h2>
                        <p className="text-xs text-tertiary mt-0.5">
                          Entrenador cubierto: <strong className="text-white">{sub.absentUserName}</strong> ·
                          Motivo: <span className="text-on-surface">{sub.reason}</span>
                        </p>
                      </div>

                      {sub.canCancel && (
                        <button
                          type="button"
                          onClick={() => void handleCancelSub(sub.id)}
                          disabled={cancellingSubId === sub.id}
                          className="self-start inline-flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-low hover:bg-rose-950/60 border border-white/15 hover:border-rose-500/40 text-[11px] font-bold uppercase text-rose-300 cursor-pointer shrink-0"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{cancellingSubId === sub.id ? 'Cancelando...' : 'Cancelar'}</span>
                        </button>
                      )}
                    </div>

                    {/* Estado asignado + pill compacto de rango horario */}
                    {isAssigned && sub.substituteUserName && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-200 min-w-0">
                          <UserCheck
                            className="w-4 h-4 text-emerald-400 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            Sustituto: <strong className="text-white">{sub.substituteUserName}</strong>
                            {sub.assignedByName && (
                              <span className="text-emerald-200/70"> ({sub.assignedByName})</span>
                            )}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {sub.overrideValidFromMadrid && sub.overrideValidToMadrid
                              ? `${sub.overrideValidFromMadrid} → ${sub.overrideValidToMadrid}`
                              : 'Permiso -2h / +24h'}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Selector de sustituto para Coordinador / Presidente */}
                    {!isCancelled && sub.canAssignHere && (
                      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                        <select
                          value={currentSelectedCoachId}
                          onChange={(e) =>
                            setSelectedCoachBySubId((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          aria-label={`Seleccionar sustituto para ${sub.teamName}`}
                          className="flex-1 min-w-0 bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                        >
                          {sortedCoaches.map((c) => (
                            <option key={c.coachId} value={c.coachId}>
                              {c.available
                                ? `[LIBRE] ${c.coachName}`
                                : `[CONFLICTO: ${c.conflicts[0]}] ${c.coachName}`}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleAssignSubstitute(sub)}
                          disabled={assigningSubId === sub.id || !currentSelectedCoachId}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {assigningSubId === sub.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isAssigned ? 'Reasignar' : 'Asignar'}</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== MODAL ASIGNAR SUSTITUCIÓN ==================== */}
      <IntranetModal
        isOpen={directModalOpen && Boolean(data)}
        onClose={() => setDirectModalOpen(false)}
        title="Asignar Sustitución"
        subtitle="Asigna cobertura técnica con permiso temporal automático de asistencia (-2h/+24h)"
        size="md"
      >
        {data && (
          <form onSubmit={handleDirectAssignSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="sust-direct-team" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Equipo
                </label>
                <select
                  id="sust-direct-team"
                  required
                  value={directForm.teamSeasonId}
                  onChange={(e) =>
                    setDirectForm((prev) => ({ ...prev, teamSeasonId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  {groupByCategoryFamily(data.allTeams, (t) => `${t.id} ${t.name}`).map(
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="sust-direct-date" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fecha (Madrid)
                  </label>
                  <input
                    id="sust-direct-date"
                    type="date"
                    required
                    value={directForm.madridDate}
                    onChange={(e) =>
                      setDirectForm((prev) => ({ ...prev, madridDate: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="sust-direct-start" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Inicio
                  </label>
                  <input
                    id="sust-direct-start"
                    type="time"
                    required
                    value={directForm.startTime}
                    onChange={(e) =>
                      setDirectForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="sust-direct-end" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fin
                  </label>
                  <input
                    id="sust-direct-end"
                    type="time"
                    required
                    value={directForm.endTime}
                    onChange={(e) =>
                      setDirectForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sust-direct-absent" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Entrenador cubierto (ausente)
                </label>
                <select
                  id="sust-direct-absent"
                  value={directForm.absentUserId}
                  onChange={(e) =>
                    setDirectForm((prev) => ({ ...prev, absentUserId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  {data.coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sust-direct-sub" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Entrenador sustituto asignado
                </label>
                <select
                  id="sust-direct-sub"
                  required
                  value={directForm.substituteUserId}
                  onChange={(e) =>
                    setDirectForm((prev) => ({ ...prev, substituteUserId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  <option value="">Selecciona sustituto...</option>
                  {data.coaches.map((c) => {
                    const conf = directCoachConflicts.get(c.id) || [];
                    return (
                      <option key={c.id} value={c.id}>
                        {conf.length === 0
                          ? `[LIBRE] ${c.name}`
                          : `[CONFLICTO: ${conf[0]}] ${c.name}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="sust-direct-reason" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Motivo / Observaciones
                </label>
                <input
                  id="sust-direct-reason"
                  type="text"
                  required
                  value={directForm.reason}
                  onChange={(e) =>
                    setDirectForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDirectModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingDirect}
                className="px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {submittingDirect ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>
    </div>
  );
}
