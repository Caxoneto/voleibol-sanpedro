'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
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
import { formatMadridDateString } from '@/lib/date-utils';

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

const REASON_PRESETS = [
  'Enfermedad / Indisposición',
  'Motivo laboral',
  'Viaje / Desplazamiento',
  'Exámenes / Estudios',
  'Asunto familiar',
];

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
  const canRequest = hasPermission('substitution.request');
  const canAssign = hasPermission('substitution.assign');

  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubstitutionsApiResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ASSIGNED' | 'CANCELLED'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Formulario de solicitud
  const [reqForm, setReqForm] = useState({
    teamSeasonId: '',
    madridDate: todayMadrid,
    startTime: '18:00',
    endTime: '19:30',
    reason: '',
  });
  const [submittingReq, setSubmittingReq] = useState(false);

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

      setReqForm((prev) => ({
        ...prev,
        teamSeasonId: prev.teamSeasonId || typed.availableTeams[0]?.id || '',
      }));
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

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReq(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/intranet/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_substitution',
          teamSeasonId: reqForm.teamSeasonId,
          madridDate: reqForm.madridDate,
          startTime: reqForm.startTime,
          endTime: reqForm.endTime,
          reason: reqForm.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo enviar la solicitud.');
      }
      setReqForm((prev) => ({ ...prev, reason: '' }));
      setFeedback({
        type: 'ok',
        text: 'Solicitud de sustitución enviada. Coordinación podrá asignar un sustituto libre.',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error enviando solicitud.',
      });
    } finally {
      setSubmittingReq(false);
    }
  }

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
          ? 'Sustituto asignado, permiso temporal attendance.take concedido (-2h/+24h) y aviso enviado por email.'
          : 'Sustituto asignado y permiso temporal attendance.take concedido (-2h/+24h).',
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
          ? 'Cobertura directa asignada con permiso temporal attendance.take y aviso por email.'
          : 'Cobertura directa asignada con permiso temporal attendance.take.',
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
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowLeftRight className="w-4 h-4 text-primary-container" aria-hidden="true" />
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Continuidad Técnica
              </span>
            </div>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Sustituciones de Entrenadores
            </h1>
            <p className="text-xs sm:text-sm text-tertiary mt-1">
              Solicitudes de cobertura y asignación de sustitutos libres con permiso temporal automático.
            </p>
          </div>

          {canAssign && (
            <button
              type="button"
              onClick={() => setDirectModalOpen(true)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Asignación Directa</span>
            </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Columna izquierda: Formulario Solicitar sustitución */}
          {canRequest && (
            <section className="lg:col-span-4 bg-surface-container border border-white/10 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h2 className="font-headline text-base font-bold uppercase text-white">
                  Solicitar Sustitución
                </h2>
                <p className="text-xs text-tertiary mt-0.5">
                  Avisa con antelación para que Coordinación asigne cobertura en pista.
                </p>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="sub-req-team"
                    className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                  >
                    Equipo
                  </label>
                  <select
                    id="sub-req-team"
                    required
                    value={reqForm.teamSeasonId}
                    onChange={(e) =>
                      setReqForm((prev) => ({ ...prev, teamSeasonId: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-container"
                  >
                    {data.availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sub-req-date"
                    className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                  >
                    Fecha de la sesión (Madrid)
                  </label>
                  <input
                    id="sub-req-date"
                    type="date"
                    required
                    value={reqForm.madridDate}
                    onChange={(e) =>
                      setReqForm((prev) => ({ ...prev, madridDate: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-container"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="sub-req-start"
                      className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                    >
                      Hora inicio
                    </label>
                    <input
                      id="sub-req-start"
                      type="time"
                      required
                      value={reqForm.startTime}
                      onChange={(e) =>
                        setReqForm((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-container"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sub-req-end"
                      className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                    >
                      Hora fin
                    </label>
                    <input
                      id="sub-req-end"
                      type="time"
                      required
                      value={reqForm.endTime}
                      onChange={(e) =>
                        setReqForm((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-container"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="sub-req-reason"
                    className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                  >
                    Motivo
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setReqForm((prev) => ({ ...prev, reason: preset }))
                        }
                        className="px-2 py-1 text-[10px] font-bold bg-surface-container-low hover:bg-surface-container-high border border-white/10 text-tertiary hover:text-white cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="sub-req-reason"
                    required
                    rows={2}
                    value={reqForm.reason}
                    onChange={(e) =>
                      setReqForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="Detalla brevemente el motivo de tu ausencia..."
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-container"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq || !reqForm.teamSeasonId}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4" />
                  )}
                  <span>{submittingReq ? 'Enviando...' : 'Enviar Solicitud'}</span>
                </button>
              </form>
            </section>
          )}

          {/* Columna derecha: Listado de coberturas */}
          <section
            className={`${canRequest ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}
          >
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
                No hay solicitudes de sustitución en esta vista.
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
                            <span className="text-xs text-tertiary capitalize flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                              {sub.madridDateFormatted} ({sub.madridDate})
                            </span>
                            <span className="text-xs font-bold text-white flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                              {sub.startTime} – {sub.endTime}
                            </span>
                          </div>

                          <h3 className="font-headline text-base sm:text-lg font-bold text-white mt-1.5">
                            {sub.teamName}
                          </h3>
                          <p className="text-xs text-tertiary mt-0.5">
                            Solicita: <strong className="text-white">{sub.absentUserName}</strong> ·
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

                      {/* Estado asignado + aviso permiso temporal */}
                      {isAssigned && sub.substituteUserName && (
                        <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <UserCheck
                              className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <div className="text-xs">
                              <p className="text-emerald-200">
                                Sustituto asignado:{' '}
                                <strong className="text-white">{sub.substituteUserName}</strong>
                                {sub.assignedByName && (
                                  <span className="text-emerald-200/70">
                                    {' '}
                                    (por {sub.assignedByName})
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-emerald-300/90 flex items-center gap-1 mt-0.5">
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  Permiso temporal automático <code>attendance.take</code> activo
                                  {sub.overrideValidFromMadrid && sub.overrideValidToMadrid
                                    ? ` (${sub.overrideValidFromMadrid} → ${sub.overrideValidToMadrid})`
                                    : ' (-2h a +24h)'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Selector de sustituto para Coordinador / Presidente */}
                      {!isCancelled && sub.canAssignHere && (
                        <div className="bg-surface-container-low border border-white/10 p-3 space-y-2.5">
                          <div className="flex items-start gap-2 text-[11px] text-amber-200/90">
                            <ShieldCheck
                              className="w-4 h-4 text-amber-300 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>
                              Al asignar un sustituto se le concederá{' '}
                              <strong>permiso temporal automático de asistencia</strong> (
                              <code>attendance.take</code>) para este equipo desde 2h antes hasta
                              24h después de la sesión.
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
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
                              <span>{isAssigned ? 'Reasignar' : 'Asignar Sustituto'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== MODAL ASIGNACIÓN DIRECTA ==================== */}
      {directModalOpen && data && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Asignación directa de sustituto"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <form
            onSubmit={handleDirectAssignSubmit}
            className="bg-surface-container border border-white/20 w-full sm:max-w-lg p-4 sm:p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold uppercase text-white">
                Asignación Directa de Cobertura
              </h3>
              <button
                type="button"
                onClick={() => setDirectModalOpen(false)}
                className="p-1 text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 p-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <span>
                Otorga automáticamente el permiso temporal <code>attendance.take</code> para el
                equipo elegido (-2h antes hasta +24h después).
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Equipo
                </label>
                <select
                  required
                  value={directForm.teamSeasonId}
                  onChange={(e) =>
                    setDirectForm((prev) => ({ ...prev, teamSeasonId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  {data.allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fecha (Madrid)
                  </label>
                  <input
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Inicio
                  </label>
                  <input
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fin
                  </label>
                  <input
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Entrenador cubierto (ausente)
                </label>
                <select
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Entrenador sustituto asignado
                </label>
                <select
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Motivo / Observaciones
                </label>
                <input
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDirectModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
