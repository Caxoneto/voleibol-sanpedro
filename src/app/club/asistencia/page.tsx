'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useClubSession } from '@/components/intranet/ClubShell';
import { ABSENCE_REASONS, ATTENDANCE_STATES } from '@/lib/intranet/catalog';
import { buildCsvString } from '@/lib/intranet/csv-utils';
import { formatMadridDate, formatMadridDateString } from '@/lib/date-utils';

type AttendanceStatusCode =
  | 'PRESENTE'
  | 'RETRASO'
  | 'FALTA_JUSTIFICADA'
  | 'FALTA_INJUSTIFICADA'
  | 'LESIONADO_ASISTE';

type AbsenceReasonCode = 'LESION' | 'ENFERMEDAD' | 'ESTUDIOS' | 'FAMILIAR' | 'OTRO';

const OFFLINE_QUEUE_KEY = 'cdv_attendance_offline_queue_v1';

const SHORT_CODE_MAP: Record<
  AttendanceStatusCode,
  { short: string; label: string; activeCls: string; idleCls: string }
> = {
  PRESENTE: {
    short: 'P',
    label: 'Presente',
    activeCls: 'bg-emerald-600 text-white border-emerald-400 shadow-[2px_2px_0px_0px_#0e0e0e]',
    idleCls: 'bg-surface-container-low text-emerald-300/80 border-white/10 hover:border-emerald-500/50',
  },
  RETRASO: {
    short: 'R',
    label: 'Retraso',
    activeCls: 'bg-amber-500 text-zinc-950 border-amber-300 shadow-[2px_2px_0px_0px_#0e0e0e]',
    idleCls: 'bg-surface-container-low text-amber-300/80 border-white/10 hover:border-amber-400/50',
  },
  FALTA_JUSTIFICADA: {
    short: 'FJ',
    label: 'F. Just.',
    activeCls: 'bg-blue-600 text-white border-blue-400 shadow-[2px_2px_0px_0px_#0e0e0e]',
    idleCls: 'bg-surface-container-low text-blue-300/80 border-white/10 hover:border-blue-400/50',
  },
  FALTA_INJUSTIFICADA: {
    short: 'FI',
    label: 'F. Injust.',
    activeCls: 'bg-rose-600 text-white border-rose-400 shadow-[2px_2px_0px_0px_#0e0e0e]',
    idleCls: 'bg-surface-container-low text-rose-300/80 border-white/10 hover:border-rose-400/50',
  },
  LESIONADO_ASISTE: {
    short: 'L',
    label: 'Lesionado',
    activeCls: 'bg-purple-600 text-white border-purple-400 shadow-[2px_2px_0px_0px_#0e0e0e]',
    idleCls: 'bg-surface-container-low text-purple-300/80 border-white/10 hover:border-purple-400/50',
  },
};

interface RosterAthlete {
  athleteId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dorsal: number | null;
  position: string | null;
  isPrimary: boolean;
}

interface SessionRecordItem {
  athleteId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dorsal: number | null;
  status: AttendanceStatusCode;
  absenceReason: AbsenceReasonCode | null;
  isGuest: boolean;
  notes: string | null;
  updatedAt: string;
}

interface TrainingSessionItem {
  id: string;
  teamSeasonId: string;
  teamName: string;
  slotId: string | null;
  courtId: string | null;
  courtName: string | null;
  venueName: string | null;
  madridDate: string;
  startsAtUtc: string;
  endsAtUtc: string;
  startTimeMadrid: string;
  endTimeMadrid: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  cancellationReason: string | null;
  notes: string | null;
  isOver48h: boolean;
  canTake: boolean;
  canManageSession: boolean;
  records: SessionRecordItem[];
}

interface TrainingSlotItem {
  id: string;
  teamSeasonId: string;
  teamName: string;
  courtId: string;
  courtName: string | null;
  venueName: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  canOpen: boolean;
  existingSessionId: string | null;
}

interface TodayApiData {
  date: string;
  weekday: number;
  teams: Array<{
    id: string;
    name: string;
    division: string;
    association: string;
    canTake: boolean;
    canManageSession: boolean;
  }>;
  sessions: TrainingSessionItem[];
  slots: TrainingSlotItem[];
  rostersByTeam: Record<string, RosterAthlete[]>;
  venuesAndCourts: Array<{
    courtId: string;
    courtName: string;
    venueId: string;
    venueName: string;
    label: string;
  }>;
}

interface RollCallEntry {
  athleteId: string;
  fullName: string;
  dorsal: number | null;
  status: AttendanceStatusCode;
  absenceReason: AbsenceReasonCode | null;
  isGuest: boolean;
  notes: string;
}

interface OfflineQueuedSession {
  sessionId: string;
  teamSeasonId: string;
  teamName: string;
  madridDate: string;
  savedAtIso: string;
  records: Array<{
    athleteId: string;
    status: AttendanceStatusCode;
    absenceReason: AbsenceReasonCode | null;
    isGuest: boolean;
    notes: string | null;
  }>;
}

interface ReportsData {
  from: string;
  to: string;
  alertThreshold: number;
  teams: Array<{ id: string; name: string; division: string }>;
  summaryByStatus: Record<AttendanceStatusCode, number>;
  totalSessions: number;
  totalRecords: number;
  overallAttendanceRate: number;
  teamStats: Array<{
    teamSeasonId: string;
    teamName: string;
    sessionsCount: number;
    completedSessionsCount: number;
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    justifiedAbsenceCount: number;
    unjustifiedAbsenceCount: number;
    injuredPresentCount: number;
    attendanceRate: number;
  }>;
  athleteStats: Array<{
    athleteId: string;
    fullName: string;
    teamSeasonId: string;
    teamName: string;
    dorsal: number | null;
    totalRecords: number;
    present: number;
    late: number;
    justified: number;
    unjustified: number;
    injured: number;
    attendanceRate: number;
    currentConsecutiveUnjustified: number;
    maxConsecutiveUnjustified: number;
    hasAlert: boolean;
  }>;
  alerts: Array<{
    athleteId: string;
    fullName: string;
    teamSeasonId: string;
    teamName: string;
    dorsal: number | null;
    unjustified: number;
    currentConsecutiveUnjustified: number;
    maxConsecutiveUnjustified: number;
    attendanceRate: number;
    reasonText: string;
  }>;
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return formatMadridDateString(new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0)));
}

function readOfflineQueue(): OfflineQueuedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: OfflineQueuedSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } else {
      window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Ignorar error de cuota de almacenamiento
  }
}

export default function ClubAsistenciaPage() {
  const { hasPermission } = useClubSession();
  const canTakeAny = hasPermission('attendance.take');
  const canReports = hasPermission('attendance.reports');
  const canManageAny = hasPermission('session.manage');

  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);
  const [activeTab, setActiveTab] = useState<'today' | 'reports'>(
    canTakeAny ? 'today' : canReports ? 'reports' : 'today'
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayMadrid);

  // Estado de red y cola offline
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedSession[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);

  // Datos "Hoy / Pasar Lista"
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<TodayApiData | null>(null);
  const [openingSlotId, setOpeningSlotId] = useState<string | null>(null);

  // Sesión abierta en pantalla de pase de lista (<30s)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [rollCall, setRollCall] = useState<RollCallEntry[]>([]);
  const [expandedNotesIds, setExpandedNotesIds] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(
    null
  );

  // Modal invitados
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestQuery, setGuestQuery] = useState('');
  const [guestResults, setGuestResults] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      dorsal: number | null;
      teamSeasonId: string | null;
      teamName: string;
    }>
  >([]);
  const [guestLoading, setGuestLoading] = useState(false);

  // Modal Sesión Extra
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [extraForm, setExtraForm] = useState({
    teamSeasonId: '',
    courtId: '',
    startTime: '18:00',
    endTime: '19:30',
    notes: '',
  });
  const [creatingExtra, setCreatingExtra] = useState(false);

  // Modal Cancelar Sesión
  const [cancelTarget, setCancelTarget] = useState<TrainingSessionItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingSession, setCancellingSession] = useState(false);

  // Informes y Alertas
  const [reportTeamId, setReportTeamId] = useState('ALL');
  const [reportFrom, setReportFrom] = useState(() => shiftYmd(todayMadrid, -30));
  const [reportTo, setReportTo] = useState(todayMadrid);
  const [reportThreshold, setReportThreshold] = useState(3);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);

  const syncingRef = useRef(false);

  const syncOfflineQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = readOfflineQueue();
    if (queue.length === 0) {
      setOfflineQueue([]);
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    syncingRef.current = true;
    setSyncingQueue(true);
    const remaining: OfflineQueuedSession[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const res = await fetch('/api/intranet/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_attendance',
            sessionId: item.sessionId,
            records: item.records,
          }),
        });
        if (res.ok) {
          syncedCount += 1;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    writeOfflineQueue(remaining);
    setOfflineQueue(remaining);
    syncingRef.current = false;
    setSyncingQueue(false);

    if (syncedCount > 0) {
      setFeedbackMsg({
        type: 'ok',
        text: `Sincronizadas ${syncedCount} sesión(es) pendiente(s) de la cola offline.`,
      });
    }
  }, []);

  useEffect(() => {
    setOfflineQueue(readOfflineQueue());
    const handleOnline = () => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue]);

  const loadTodayData = useCallback(
    async (dateStr: string, signal?: AbortSignal) => {
      setTodayLoading(true);
      setTodayError(null);
      try {
        const res = await fetch(
          `/api/intranet/attendance?mode=today&date=${encodeURIComponent(dateStr)}`,
          { cache: 'no-store', signal }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'No se pudieron cargar las sesiones del día.');
        }
        setTodayData(json as TodayApiData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTodayError(
          err instanceof Error ? err.message : 'Error cargando la agenda de asistencia.'
        );
      } finally {
        setTodayLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab !== 'today') return;
    const controller = new AbortController();
    void loadTodayData(selectedDate, controller.signal);
    return () => controller.abort();
  }, [activeTab, selectedDate, loadTodayData]);

  const loadReportsData = useCallback(
    async (signal?: AbortSignal) => {
      if (!canReports) return;
      setReportsLoading(true);
      setReportsError(null);
      try {
        const params = new URLSearchParams({
          mode: 'reports',
          teamId: reportTeamId,
          from: reportFrom,
          to: reportTo,
          alertThreshold: String(reportThreshold),
        });
        const res = await fetch(`/api/intranet/attendance?${params.toString()}`, {
          cache: 'no-store',
          signal,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Error cargando informes.');
        }
        setReportsData(json as ReportsData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setReportsError(err instanceof Error ? err.message : 'Error cargando informes.');
      } finally {
        setReportsLoading(false);
      }
    },
    [canReports, reportTeamId, reportFrom, reportTo, reportThreshold]
  );

  useEffect(() => {
    if (activeTab !== 'reports') return;
    const controller = new AbortController();
    void loadReportsData(controller.signal);
    return () => controller.abort();
  }, [activeTab, loadReportsData]);

  // Búsqueda debounced de invitados
  useEffect(() => {
    if (!guestModalOpen) return;
    const trimmed = guestQuery.trim();
    if (trimmed.length < 2) {
      setGuestResults([]);
      return;
    }
    const activeSess = todayData?.sessions.find((s) => s.id === activeSessionId);
    const excludeTeamId = activeSess?.teamSeasonId || '';

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setGuestLoading(true);
      try {
        const params = new URLSearchParams({
          mode: 'search_guests',
          q: trimmed,
          excludeTeamId,
        });
        const res = await fetch(`/api/intranet/attendance?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setGuestResults(json.athletes || []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        setGuestLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [guestModalOpen, guestQuery, activeSessionId, todayData]);

  const openSessionRollCall = useCallback(
    (sess: TrainingSessionItem, freshData?: TodayApiData | null) => {
      const source = freshData || todayData;
      const roster = source?.rostersByTeam?.[sess.teamSeasonId] || [];

      // Verificar si hay datos pendientes en cola offline para esta sesión
      const queued = readOfflineQueue().find((q) => q.sessionId === sess.id);
      const savedMap = new Map<
        string,
        {
          status: AttendanceStatusCode;
          absenceReason: AbsenceReasonCode | null;
          isGuest: boolean;
          notes: string;
        }
      >();

      for (const r of sess.records) {
        savedMap.set(r.athleteId, {
          status: r.status,
          absenceReason: r.absenceReason,
          isGuest: r.isGuest,
          notes: r.notes || '',
        });
      }
      if (queued) {
        for (const qr of queued.records) {
          savedMap.set(qr.athleteId, {
            status: qr.status,
            absenceReason: qr.absenceReason,
            isGuest: qr.isGuest,
            notes: qr.notes || '',
          });
        }
      }

      const entries: RollCallEntry[] = roster.map((player) => {
        const prev = savedMap.get(player.athleteId);
        return {
          athleteId: player.athleteId,
          fullName: player.fullName,
          dorsal: player.dorsal,
          status: prev?.status || 'PRESENTE',
          absenceReason: prev?.absenceReason || null,
          isGuest: prev?.isGuest ?? false,
          notes: prev?.notes || '',
        };
      });

      const rosterSet = new Set(roster.map((p) => p.athleteId));
      for (const r of sess.records) {
        if (!rosterSet.has(r.athleteId)) {
          const prev = savedMap.get(r.athleteId);
          entries.push({
            athleteId: r.athleteId,
            fullName: r.fullName,
            dorsal: r.dorsal,
            status: prev?.status || r.status,
            absenceReason: prev?.absenceReason ?? r.absenceReason,
            isGuest: true,
            notes: prev?.notes ?? (r.notes || ''),
          });
        }
      }

      setActiveSessionId(sess.id);
      setRollCall(entries);
      setExpandedNotesIds({});
      setFeedbackMsg(null);
    },
    [todayData]
  );

  async function handleOpenSlot(slot: TrainingSlotItem) {
    if (slot.existingSessionId && todayData) {
      const existing = todayData.sessions.find((s) => s.id === slot.existingSessionId);
      if (existing) {
        openSessionRollCall(existing);
        return;
      }
    }

    setOpeningSlotId(slot.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/intranet/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open_or_create_session',
          teamSeasonId: slot.teamSeasonId,
          madridDate: selectedDate,
          slotId: slot.id,
          courtId: slot.courtId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo abrir la sesión.');
      }

      // Recargar datos del día y abrir directamente el pase de lista
      const freshRes = await fetch(
        `/api/intranet/attendance?mode=today&date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      );
      const freshJson = (await freshRes.json()) as TodayApiData & { success: boolean };
      if (freshRes.ok && freshJson.success) {
        setTodayData(freshJson);
        const target = freshJson.sessions.find((s) => s.id === json.session.id);
        if (target) {
          openSessionRollCall(target, freshJson);
        }
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error abriendo la sesión.',
      });
    } finally {
      setOpeningSlotId(null);
    }
  }

  async function handleCreateExtraSession(e: React.FormEvent) {
    e.preventDefault();
    if (!extraForm.teamSeasonId) return;
    setCreatingExtra(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/intranet/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open_or_create_session',
          teamSeasonId: extraForm.teamSeasonId,
          madridDate: selectedDate,
          courtId: extraForm.courtId || null,
          startTime: extraForm.startTime,
          endTime: extraForm.endTime,
          notes: extraForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear la sesión extra.');
      }
      setExtraModalOpen(false);
      const freshRes = await fetch(
        `/api/intranet/attendance?mode=today&date=${encodeURIComponent(selectedDate)}`,
        { cache: 'no-store' }
      );
      const freshJson = (await freshRes.json()) as TodayApiData & { success: boolean };
      if (freshRes.ok && freshJson.success) {
        setTodayData(freshJson);
        const target = freshJson.sessions.find((s) => s.id === json.session.id);
        if (target) {
          openSessionRollCall(target, freshJson);
        }
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error creando sesión extra.',
      });
    } finally {
      setCreatingExtra(false);
    }
  }

  async function handleCancelSession(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancellingSession(true);
    try {
      const res = await fetch('/api/intranet/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_session',
          sessionId: cancelTarget.id,
          cancellationReason: cancelReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cancelar la sesión.');
      }
      setCancelTarget(null);
      setCancelReason('');
      setFeedbackMsg({ type: 'ok', text: 'Sesión marcada como cancelada.' });
      await loadTodayData(selectedDate);
    } catch (err) {
      setFeedbackMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error cancelando sesión.',
      });
    } finally {
      setCancellingSession(false);
    }
  }

  function updateEntryStatus(athleteId: string, status: AttendanceStatusCode) {
    setRollCall((prev) =>
      prev.map((row) => {
        if (row.athleteId !== athleteId) return row;
        const needsReason =
          status === 'FALTA_JUSTIFICADA' || status === 'FALTA_INJUSTIFICADA';
        return {
          ...row,
          status,
          absenceReason: needsReason ? row.absenceReason : null,
        };
      })
    );
  }

  function updateEntryReason(athleteId: string, reason: AbsenceReasonCode) {
    setRollCall((prev) =>
      prev.map((row) =>
        row.athleteId === athleteId
          ? { ...row, absenceReason: row.absenceReason === reason ? null : reason }
          : row
      )
    );
  }

  function updateEntryNotes(athleteId: string, notes: string) {
    setRollCall((prev) =>
      prev.map((row) => (row.athleteId === athleteId ? { ...row, notes } : row))
    );
  }

  function addGuestAthlete(guest: {
    id: string;
    fullName: string;
    dorsal: number | null;
  }) {
    setRollCall((prev) => {
      if (prev.some((p) => p.athleteId === guest.id)) return prev;
      return [
        ...prev,
        {
          athleteId: guest.id,
          fullName: guest.fullName,
          dorsal: guest.dorsal,
          status: 'PRESENTE',
          absenceReason: null,
          isGuest: true,
          notes: '',
        },
      ];
    });
    setGuestModalOpen(false);
    setGuestQuery('');
    setGuestResults([]);
  }

  function removeGuestAthlete(athleteId: string) {
    setRollCall((prev) => prev.filter((p) => p.athleteId !== athleteId));
  }

  async function handleSaveAttendance() {
    if (!activeSession || rollCall.length === 0) return;
    setSavingAttendance(true);
    setFeedbackMsg(null);

    const payloadRecords = rollCall.map((r) => ({
      athleteId: r.athleteId,
      status: r.status,
      absenceReason: r.absenceReason,
      isGuest: r.isGuest,
      notes: r.notes.trim() || null,
    }));

    const queueItem: OfflineQueuedSession = {
      sessionId: activeSession.id,
      teamSeasonId: activeSession.teamSeasonId,
      teamName: activeSession.teamName,
      madridDate: activeSession.madridDate,
      savedAtIso: new Date().toISOString(),
      records: payloadRecords,
    };

    const saveLocallyOffline = () => {
      const current = readOfflineQueue().filter(
        (item) => item.sessionId !== activeSession.id
      );
      const next = [...current, queueItem];
      writeOfflineQueue(next);
      setOfflineQueue(next);
      setFeedbackMsg({
        type: 'warn',
        text: 'Sin conexión: asistencia guardada localmente en este dispositivo. Se sincronizará automáticamente al recuperar red.',
      });
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      saveLocallyOffline();
      setSavingAttendance(false);
      return;
    }

    try {
      const res = await fetch('/api/intranet/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_attendance',
          sessionId: activeSession.id,
          records: payloadRecords,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo guardar la asistencia.');
      }

      // Limpiar si estaba en cola offline
      const remaining = readOfflineQueue().filter(
        (item) => item.sessionId !== activeSession.id
      );
      if (remaining.length !== offlineQueue.length) {
        writeOfflineQueue(remaining);
        setOfflineQueue(remaining);
      }

      setFeedbackMsg({
        type: 'ok',
        text: `Asistencia guardada (${json.savedCount} deportistas).`,
      });
      setActiveSessionId(null);
      await loadTodayData(selectedDate);
    } catch (err) {
      if (err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        saveLocallyOffline();
      } else {
        setFeedbackMsg({
          type: 'err',
          text: err instanceof Error ? err.message : 'Error guardando asistencia.',
        });
      }
    } finally {
      setSavingAttendance(false);
    }
  }

  function handleExportCsv() {
    if (!reportsData) return;
    const headers = [
      'Equipo',
      'Dorsal',
      'Deportista',
      'Sesiones',
      'Presente',
      'Retraso',
      'Falta Justificada',
      'Falta Injustificada',
      'Lesionado Asiste',
      '% Asistencia',
      'Racha FI Actual',
      'Alerta',
    ];
    const rows = reportsData.athleteStats.map((a) => [
      a.teamName,
      a.dorsal ?? '',
      a.fullName,
      a.totalRecords,
      a.present,
      a.late,
      a.justified,
      a.unjustified,
      a.injured,
      `${a.attendanceRate}%`,
      a.currentConsecutiveUnjustified,
      a.hasAlert ? 'SI' : 'NO',
    ]);
    const csv = buildCsvString(headers, rows, ';');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencia-${reportsData.from}-a-${reportsData.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (!reportsData) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 14;
    let y = 14;

    doc.setFillColor(217, 4, 41);
    doc.rect(0, 0, pageW, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('INFORME DE ASISTENCIA · C.D. VOLEIBOL SAN PEDRO', margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(
      `Periodo: ${reportsData.from} a ${reportsData.to} · Umbral alerta: ${reportsData.alertThreshold} faltas · Asistencia global: ${reportsData.overallAttendanceRate}%`,
      margin,
      y + 10
    );
    y += 16;

    doc.setDrawColor(217, 4, 41);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    if (reportsData.alerts.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text(`ALERTAS DE FALTAS (${reportsData.alerts.length})`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      for (const al of reportsData.alerts.slice(0, 20)) {
        if (y > 275) {
          doc.addPage();
          y = 16;
        }
        doc.text(
          `• ${al.fullName} (${al.teamName}): ${al.reasonText} · ${al.attendanceRate}% asistencia`,
          margin + 2,
          y
        );
        y += 4.5;
      }
      y += 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text('DETALLE POR DEPORTISTA', margin, y);
    y += 5;

    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y - 3.5, pageW - margin * 2, 6, 'F');
    doc.setFontSize(8);
    doc.text('Deportista', margin + 2, y);
    doc.text('Equipo', margin + 62, y);
    doc.text('P', margin + 122, y);
    doc.text('R', margin + 132, y);
    doc.text('FJ', margin + 142, y);
    doc.text('FI', margin + 152, y);
    doc.text('L', margin + 162, y);
    doc.text('%', margin + 172, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    for (const a of reportsData.athleteStats) {
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      doc.setTextColor(a.hasAlert ? 185 : 31, a.hasAlert ? 28 : 41, a.hasAlert ? 28 : 55);
      doc.text(`${a.dorsal ? `#${a.dorsal} ` : ''}${a.fullName}`.slice(0, 32), margin + 2, y);
      doc.text(a.teamName.slice(0, 30), margin + 62, y);
      doc.text(String(a.present), margin + 122, y);
      doc.text(String(a.late), margin + 132, y);
      doc.text(String(a.justified), margin + 142, y);
      doc.text(String(a.unjustified), margin + 152, y);
      doc.text(String(a.injured), margin + 162, y);
      doc.text(`${a.attendanceRate}%`, margin + 172, y);
      y += 4.8;
    }

    doc.save(`asistencia-${reportsData.from}-a-${reportsData.to}.pdf`);
  }

  const activeSession = useMemo(
    () => todayData?.sessions.find((s) => s.id === activeSessionId) || null,
    [todayData, activeSessionId]
  );

  const rollCallSummary = useMemo(() => {
    const counts: Record<AttendanceStatusCode, number> = {
      PRESENTE: 0,
      RETRASO: 0,
      FALTA_JUSTIFICADA: 0,
      FALTA_INJUSTIFICADA: 0,
      LESIONADO_ASISTE: 0,
    };
    for (const r of rollCall) counts[r.status] += 1;
    return counts;
  }, [rollCall]);

  const unlinkedSlots = useMemo(
    () => (todayData?.slots || []).filter((sl) => !sl.existingSessionId),
    [todayData]
  );

  return (
    <div className="space-y-5 pb-20 sm:pb-8">
      {/* Banner offline / cola pendiente */}
      {(!isOnline || offlineQueue.length > 0) && (
        <div
          role="status"
          className="bg-amber-500/15 border-2 border-amber-400/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#0e0e0e]"
        >
          <div className="flex items-start gap-2.5">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                {!isOnline
                  ? 'Modo sin conexión activo'
                  : `${offlineQueue.length} sesión(es) pendiente(s) de sincronización`}
              </p>
              <p className="text-xs text-amber-100/80 mt-0.5">
                {!isOnline
                  ? 'Puedes seguir pasando lista en pista. Se guardará en este dispositivo hasta recuperar conexión.'
                  : 'Hay registros guardados offline esperando envío a la base de datos.'}
              </p>
            </div>
          </div>

          {offlineQueue.length > 0 && isOnline && (
            <button
              type="button"
              onClick={() => void syncOfflineQueue()}
              disabled={syncingQueue}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncingQueue ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{syncingQueue ? 'Sincronizando...' : 'Sincronizar pendientes'}</span>
            </button>
          )}
        </div>
      )}

      {/* Cabecera módulo */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 text-primary-container" aria-hidden="true" />
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Control Técnico en Pista
              </span>
            </div>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Asistencia y Entrenamientos
            </h1>
            <p className="text-xs sm:text-sm text-tertiary mt-1">
              Pase de lista rápido (&lt;30s), gestión de invitados y alertas de absentismo.
            </p>
          </div>

          {/* Pestañas */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today');
                setFeedbackMsg(null);
              }}
              className={`px-4 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container-low text-on-surface border-white/15 hover:border-white/30'
              }`}
            >
              Hoy / Pasar Lista
            </button>

            {canReports && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reports');
                  setActiveSessionId(null);
                  setFeedbackMsg(null);
                }}
                className={`px-4 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                    : 'bg-surface-container-low text-on-surface border-white/15 hover:border-white/30'
                }`}
              >
                Informes y Alertas
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mensaje de feedback */}
      {feedbackMsg && (
        <div
          role="alert"
          className={`px-4 py-3 border text-xs sm:text-sm flex items-center justify-between gap-3 ${
            feedbackMsg.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : feedbackMsg.type === 'warn'
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            aria-label="Cerrar aviso"
            className="p-1 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== PESTAÑA HOY / PASAR LISTA ==================== */}
      {activeTab === 'today' && !activeSession && (
        <div className="space-y-5">
          {/* Selector de fecha + Sesión Extra */}
          <div className="bg-surface-container border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_#0e0e0e]">
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                htmlFor="attendance-date-picker"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-tertiary"
              >
                <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Fecha:</span>
              </label>
              <input
                id="attendance-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white focus:border-primary-container outline-none"
              />
              {selectedDate !== todayMadrid && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayMadrid)}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-surface-container-high border border-white/15 text-primary hover:border-primary cursor-pointer"
                >
                  Ir a Hoy
                </button>
              )}
              <span className="text-xs text-tertiary capitalize">
                {formatMadridDate(`${selectedDate}T12:00:00`)}
              </span>
            </div>

            {(canTakeAny || canManageAny) && (todayData?.teams.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstTeam = todayData?.teams[0]?.id || '';
                  const firstCourt = todayData?.venuesAndCourts[0]?.courtId || '';
                  setExtraForm({
                    teamSeasonId: firstTeam,
                    courtId: firstCourt,
                    startTime: '18:00',
                    endTime: '19:30',
                    notes: '',
                  });
                  setExtraModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Sesión Extra</span>
              </button>
            )}
          </div>

          {todayLoading && (
            <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
              <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
              <span>Cargando sesiones y pistas...</span>
            </div>
          )}

          {todayError && !todayLoading && (
            <div className="bg-error-container/30 border border-error/40 p-4 text-sm text-error">
              {todayError}
            </div>
          )}

          {!todayLoading && todayData && (
            <div className="space-y-5">
              {/* Sesiones ya creadas */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                    Sesiones del día ({todayData.sessions.length})
                  </h2>
                </div>

                {todayData.sessions.length === 0 && unlinkedSlots.length === 0 ? (
                  <div className="bg-surface-container border border-white/10 p-6 text-center space-y-2">
                    <p className="text-sm font-bold text-on-surface">
                      No hay entrenamientos programados para esta fecha.
                    </p>
                    <p className="text-xs text-tertiary">
                      Puedes cambiar la fecha o crear una &ldquo;Sesión Extra&rdquo; arriba.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {todayData.sessions.map((sess) => {
                      const rosterCount =
                        todayData.rostersByTeam[sess.teamSeasonId]?.length || 0;
                      const recordedCount = sess.records.length;
                      const isCancelled = sess.status === 'CANCELLED';
                      const isCompleted = sess.status === 'COMPLETED';
                      const hasQueued = offlineQueue.some((q) => q.sessionId === sess.id);

                      return (
                        <article
                          key={sess.id}
                          className={`bg-surface-container border p-4 shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col justify-between gap-3 ${
                            isCancelled
                              ? 'border-white/10 opacity-70'
                              : isCompleted
                              ? 'border-emerald-500/40'
                              : 'border-white/15'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-headline text-base sm:text-lg font-bold text-white truncate">
                                  {sess.teamName}
                                </p>
                                <p className="text-xs text-tertiary flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                                  <span>
                                    {sess.startTimeMadrid} – {sess.endTimeMadrid}
                                  </span>
                                  {sess.courtName && (
                                    <span className="truncate">
                                      · {sess.venueName ? `${sess.venueName} · ` : ''}
                                      {sess.courtName}
                                    </span>
                                  )}
                                </p>
                              </div>

                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                                  isCancelled
                                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                                    : isCompleted
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                    : 'bg-amber-950/60 text-amber-200 border-amber-500/40'
                                }`}
                              >
                                {isCancelled
                                  ? 'Cancelada'
                                  : isCompleted
                                  ? 'Completada'
                                  : 'Programada'}
                              </span>
                            </div>

                            {hasQueued && (
                              <p className="text-[11px] font-bold text-amber-300">
                                • Cambios locales pendientes de sincronizar
                              </p>
                            )}

                            {isCancelled && sess.cancellationReason && (
                              <p className="text-xs text-rose-300 bg-rose-950/30 px-2.5 py-1.5 border border-rose-500/20">
                                Motivo: {sess.cancellationReason}
                              </p>
                            )}

                            {!isCancelled && (
                              <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
                                <span className="bg-surface-container-low px-2 py-1 border border-white/10">
                                  Plantilla: <strong className="text-white">{rosterCount}</strong>
                                </span>
                                <span className="bg-surface-container-low px-2 py-1 border border-white/10">
                                  Marcados:{' '}
                                  <strong className="text-white">{recordedCount}</strong>
                                </span>
                                {sess.isOver48h && (
                                  <span className="bg-amber-950/50 text-amber-200 px-2 py-1 border border-amber-500/30 text-[11px]">
                                    &gt;48h
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {!isCancelled && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                              {sess.canTake ? (
                                <button
                                  type="button"
                                  onClick={() => openSessionRollCall(sess)}
                                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_#0e0e0e]"
                                >
                                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span>
                                    {recordedCount > 0 ? 'Editar lista' : 'Pasar lista'}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-xs text-tertiary italic">
                                  {sess.isOver48h
                                    ? 'Ventana de 48h superada (requiere permiso de edición histórica)'
                                    : 'Solo lectura'}
                                </span>
                              )}

                              {sess.canManageSession && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTarget(sess);
                                    setCancelReason('');
                                  }}
                                  className="px-3 py-2.5 bg-surface-container-low hover:bg-rose-950/60 border border-white/15 hover:border-rose-500/40 text-xs font-bold uppercase tracking-wider text-rose-300 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Franjas horarias del día listas para abrir en 1 toque */}
              {unlinkedSlots.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                    Franjas habituales listas para abrir en 1 toque ({unlinkedSlots.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {unlinkedSlots.map((slot) => (
                      <article
                        key={slot.id}
                        className="bg-surface-container-low border border-dashed border-white/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-headline text-base font-bold text-white truncate">
                            {slot.teamName}
                          </p>
                          <p className="text-xs text-tertiary mt-0.5 truncate">
                            {slot.startTime} – {slot.endTime} ·{' '}
                            {slot.venueName ? `${slot.venueName} · ` : ''}
                            {slot.courtName || slot.courtId}
                          </p>
                        </div>

                        {slot.canOpen && (
                          <button
                            type="button"
                            onClick={() => void handleOpenSlot(slot)}
                            disabled={openingSlotId === slot.id}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-60 shadow-[3px_3px_0px_0px_#0e0e0e]"
                          >
                            {openingSlotId === slot.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ClipboardCheck className="w-4 h-4" />
                            )}
                            <span>Abrir sesión</span>
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== PANTALLA PASE DE LISTA (<30s) ==================== */}
      {activeTab === 'today' && activeSession && (
        <div className="space-y-4">
          {/* Barra superior de sesión */}
          <div className="bg-surface-container border border-white/15 p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveSessionId(null)}
                  className="text-xs font-bold uppercase tracking-wider text-primary hover:underline mb-1 cursor-pointer"
                >
                  ← Volver a sesiones del día
                </button>
                <h2 className="font-headline text-lg sm:text-xl font-bold text-white truncate">
                  {activeSession.teamName}
                </h2>
                <p className="text-xs text-tertiary">
                  {activeSession.madridDate} · {activeSession.startTimeMadrid} –{' '}
                  {activeSession.endTimeMadrid}
                  {activeSession.courtName ? ` · ${activeSession.courtName}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGuestModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-surface-container-high hover:bg-surface-bright border border-white/20 text-xs font-bold uppercase tracking-wider text-white cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>+ Añadir jugador invitado</span>
              </button>
            </div>

            {/* Contadores en vivo */}
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {ATTENDANCE_STATES.map((st) => {
                const cfg = SHORT_CODE_MAP[st.code];
                return (
                  <div
                    key={st.code}
                    className="bg-surface-container-lowest border border-white/10 py-1.5 px-1"
                  >
                    <p className="text-[10px] font-bold uppercase text-tertiary truncate">
                      {cfg.short}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-white">
                      {rollCallSummary[st.code]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista móvil-first de deportistas */}
          <div className="space-y-2.5">
            {rollCall.length === 0 ? (
              <div className="bg-surface-container border border-white/10 p-6 text-center text-sm text-tertiary">
                No hay deportistas asignados a este equipo todavía. Usa &ldquo;+ Añadir jugador
                invitado&rdquo;.
              </div>
            ) : (
              rollCall.map((entry) => {
                const isAbsence =
                  entry.status === 'FALTA_JUSTIFICADA' ||
                  entry.status === 'FALTA_INJUSTIFICADA';
                const notesOpen = Boolean(expandedNotesIds[entry.athleteId] || entry.notes);

                return (
                  <div
                    key={entry.athleteId}
                    className="bg-surface-container border border-white/10 p-3 sm:p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2.5"
                  >
                    {/* Nombre y acciones secundarias */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-surface-container-lowest border border-white/15 text-xs font-bold text-primary shrink-0">
                          {entry.dorsal != null ? `#${entry.dorsal}` : '—'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {entry.fullName}
                          </p>
                          {entry.isGuest && (
                            <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 mt-0.5">
                              Invitado
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedNotesIds((prev) => ({
                              ...prev,
                              [entry.athleteId]: !prev[entry.athleteId],
                            }))
                          }
                          className="px-2 py-1 text-[11px] bg-surface-container-low border border-white/10 text-tertiary hover:text-white cursor-pointer"
                        >
                          {notesOpen ? 'Ocultar nota' : '+ Nota'}
                        </button>
                        {entry.isGuest && (
                          <button
                            type="button"
                            onClick={() => removeGuestAthlete(entry.athleteId)}
                            aria-label={`Quitar invitado ${entry.fullName}`}
                            className="p-1.5 text-rose-300 hover:bg-rose-950/60 border border-white/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 5 Botones táctiles grandes: P, R, FJ, FI, L */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {(Object.keys(SHORT_CODE_MAP) as AttendanceStatusCode[]).map((code) => {
                        const cfg = SHORT_CODE_MAP[code];
                        const active = entry.status === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => updateEntryStatus(entry.athleteId, code)}
                            aria-pressed={active}
                            title={cfg.label}
                            className={`min-h-[44px] px-1 py-2 border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              active ? cfg.activeCls : cfg.idleCls
                            }`}
                          >
                            <span className="text-sm font-extrabold leading-none">
                              {cfg.short}
                            </span>
                            <span className="text-[9px] uppercase tracking-tight mt-1 leading-none truncate max-w-full">
                              {cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selector rápido de motivo cuando FJ o FI */}
                    {isAbsence && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary mr-1">
                          Motivo:
                        </span>
                        {ABSENCE_REASONS.map((reason) => {
                          const selected = entry.absenceReason === reason.code;
                          return (
                            <button
                              key={reason.code}
                              type="button"
                              onClick={() => updateEntryReason(entry.athleteId, reason.code)}
                              className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                                selected
                                  ? 'bg-primary-container text-white border-primary-container'
                                  : 'bg-surface-container-lowest text-on-surface/80 border-white/15 hover:border-white/30'
                              }`}
                            >
                              {reason.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Nota opcional */}
                    {notesOpen && (
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateEntryNotes(entry.athleteId, e.target.value)}
                        placeholder="Observación rápida (opcional)..."
                        maxLength={200}
                        className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-primary-container outline-none"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Barra fija inferior de guardado */}
          {rollCall.length > 0 && (
            <div className="sticky bottom-3 z-20 bg-surface-container-lowest/95 backdrop-blur border border-white/20 p-3 shadow-[4px_4px_0px_0px_#0e0e0e] flex items-center justify-between gap-3">
              <div className="text-xs text-tertiary">
                <strong className="text-white">{rollCall.length}</strong> deportistas ·{' '}
                <strong className="text-emerald-300">
                  {rollCallSummary.PRESENTE +
                    rollCallSummary.RETRASO +
                    rollCallSummary.LESIONADO_ASISTE}
                </strong>{' '}
                en pista
              </div>

              <button
                type="button"
                onClick={() => void handleSaveAttendance()}
                disabled={savingAttendance}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-cta hover:bg-cta-hover text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-60"
              >
                {savingAttendance ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{savingAttendance ? 'Guardando...' : 'Guardar Asistencia'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== PESTAÑA INFORMES Y ALERTAS ==================== */}
      {activeTab === 'reports' && canReports && (
        <div className="space-y-5">
          {/* Filtros */}
          <div className="bg-surface-container border border-white/10 p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="rep-team"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Equipo
                </label>
                <select
                  id="rep-team"
                  value={reportTeamId}
                  onChange={(e) => setReportTeamId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                >
                  <option value="ALL">Todos mis equipos autorizados</option>
                  {(reportsData?.teams || todayData?.teams || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rep-from"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Desde
                </label>
                <input
                  id="rep-from"
                  type="date"
                  value={reportFrom}
                  onChange={(e) => e.target.value && setReportFrom(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label
                  htmlFor="rep-to"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Hasta
                </label>
                <input
                  id="rep-to"
                  type="date"
                  value={reportTo}
                  onChange={(e) => e.target.value && setReportTo(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label
                  htmlFor="rep-threshold"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Umbral Alerta (FI)
                </label>
                <select
                  id="rep-threshold"
                  value={reportThreshold}
                  onChange={(e) => setReportThreshold(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      &ge; {n} faltas injustificadas / seguidas
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {reportsData && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_#0e0e0e]"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            )}
          </div>

          {reportsLoading && (
            <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
              <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
              <span>Calculando estadísticas y alertas...</span>
            </div>
          )}

          {reportsError && !reportsLoading && (
            <div className="bg-error-container/30 border border-error/40 p-4 text-sm text-error">
              {reportsError}
            </div>
          )}

          {!reportsLoading && reportsData && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Asistencia Global
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-300 mt-1">
                    {reportsData.overallAttendanceRate}%
                  </p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Sesiones
                  </p>
                  <p className="text-2xl font-extrabold text-white mt-1">
                    {reportsData.totalSessions}
                  </p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Faltas Injustif.
                  </p>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">
                    {reportsData.summaryByStatus.FALTA_INJUSTIFICADA}
                  </p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Deportistas en Alerta
                  </p>
                  <p className="text-2xl font-extrabold text-amber-300 mt-1">
                    {reportsData.alerts.length}
                  </p>
                </div>
              </div>

              {/* Alertas */}
              <section className="bg-surface-container border border-rose-500/35 p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-rose-300">
                    Alertas de absentismo (&ge; {reportsData.alertThreshold} faltas injustificadas /
                    seguidas)
                  </h2>
                </div>

                {reportsData.alerts.length === 0 ? (
                  <p className="text-xs text-tertiary">
                    No hay deportistas por encima del umbral en este periodo.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {reportsData.alerts.map((al) => (
                      <div
                        key={`${al.teamSeasonId}-${al.athleteId}`}
                        className="bg-rose-950/30 border border-rose-500/30 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {al.dorsal ? `#${al.dorsal} ` : ''}
                            {al.fullName}
                          </p>
                          <p className="text-xs text-rose-200/80 truncate">{al.teamName}</p>
                          <p className="text-[11px] font-bold text-rose-300 mt-0.5">
                            {al.reasonText}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 bg-rose-900/60 border border-rose-400/40 text-xs font-extrabold text-white shrink-0">
                          {al.attendanceRate}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Resumen por equipos */}
              {reportsData.teamStats.length > 0 && (
                <section className="space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                    Resumen por Equipo
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportsData.teamStats.map((ts) => (
                      <div
                        key={ts.teamSeasonId}
                        className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-white truncate">{ts.teamName}</p>
                          <span className="text-sm font-extrabold text-emerald-300 shrink-0">
                            {ts.attendanceRate}%
                          </span>
                        </div>
                        <p className="text-[11px] text-tertiary">
                          {ts.sessionsCount} sesiones · {ts.totalRecords} registros
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 bg-emerald-950/50 text-emerald-300">
                            P: {ts.presentCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-950/50 text-amber-300">
                            R: {ts.lateCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-950/50 text-blue-300">
                            FJ: {ts.justifiedAbsenceCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-rose-950/50 text-rose-300">
                            FI: {ts.unjustifiedAbsenceCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-purple-950/50 text-purple-300">
                            L: {ts.injuredPresentCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Detalle por deportista: Cards en móvil, tabla en desktop */}
              <section className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                  % Asistencia por Deportista ({reportsData.athleteStats.length})
                </h2>

                {/* Móvil (< md) */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {reportsData.athleteStats.map((a) => (
                    <div
                      key={`${a.teamSeasonId}-${a.athleteId}`}
                      className={`bg-surface-container border p-3 space-y-2 ${
                        a.hasAlert ? 'border-rose-500/50' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {a.dorsal ? `#${a.dorsal} ` : ''}
                            {a.fullName}
                          </p>
                          <p className="text-[11px] text-tertiary truncate">{a.teamName}</p>
                        </div>
                        <span
                          className={`text-sm font-extrabold shrink-0 ${
                            a.hasAlert ? 'text-rose-300' : 'text-emerald-300'
                          }`}
                        >
                          {a.attendanceRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold">
                        <span className="bg-surface-container-low py-1 text-emerald-300">
                          P:{a.present}
                        </span>
                        <span className="bg-surface-container-low py-1 text-amber-300">
                          R:{a.late}
                        </span>
                        <span className="bg-surface-container-low py-1 text-blue-300">
                          FJ:{a.justified}
                        </span>
                        <span className="bg-surface-container-low py-1 text-rose-300">
                          FI:{a.unjustified}
                        </span>
                        <span className="bg-surface-container-low py-1 text-purple-300">
                          L:{a.injured}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop (>= md) */}
                <div className="hidden md:block bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e] overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-surface-container-low text-[10px] uppercase tracking-wider text-tertiary">
                        <th className="py-3 px-3">Deportista</th>
                        <th className="py-3 px-3">Equipo</th>
                        <th className="py-3 px-2 text-center">P</th>
                        <th className="py-3 px-2 text-center">R</th>
                        <th className="py-3 px-2 text-center">FJ</th>
                        <th className="py-3 px-2 text-center">FI</th>
                        <th className="py-3 px-2 text-center">L</th>
                        <th className="py-3 px-3 text-right">% Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reportsData.athleteStats.map((a) => (
                        <tr
                          key={`${a.teamSeasonId}-${a.athleteId}`}
                          className={a.hasAlert ? 'bg-rose-950/20' : 'hover:bg-white/[0.02]'}
                        >
                          <td className="py-2.5 px-3 font-bold text-white">
                            {a.dorsal ? `#${a.dorsal} ` : ''}
                            {a.fullName}
                            {a.hasAlert && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-600 text-white uppercase">
                                Alerta
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-tertiary">{a.teamName}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-300 font-bold">
                            {a.present}
                          </td>
                          <td className="py-2.5 px-2 text-center text-amber-300 font-bold">
                            {a.late}
                          </td>
                          <td className="py-2.5 px-2 text-center text-blue-300 font-bold">
                            {a.justified}
                          </td>
                          <td className="py-2.5 px-2 text-center text-rose-300 font-bold">
                            {a.unjustified}
                          </td>
                          <td className="py-2.5 px-2 text-center text-purple-300 font-bold">
                            {a.injured}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-white">
                            {a.attendanceRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL INVITADO ==================== */}
      {guestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Añadir jugador invitado"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-surface-container border border-white/20 w-full sm:max-w-md p-4 sm:p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold uppercase text-white">
                Añadir Deportista Invitado
              </h3>
              <button
                type="button"
                onClick={() => setGuestModalOpen(false)}
                className="p-1 text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={guestQuery}
                onChange={(e) => setGuestQuery(e.target.value)}
                placeholder="Buscar por nombre o apellidos (mín. 2 letras)..."
                autoFocus
                className="w-full bg-surface-container-lowest border border-white/20 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px]">
              {guestLoading && (
                <div className="flex items-center justify-center py-6 text-xs text-tertiary gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando en el censo del club...</span>
                </div>
              )}
              {!guestLoading && guestQuery.trim().length >= 2 && guestResults.length === 0 && (
                <p className="text-xs text-tertiary text-center py-6">
                  No se encontraron deportistas activos con ese nombre.
                </p>
              )}
              {!guestLoading &&
                guestResults.map((g) => {
                  const alreadyInList = rollCall.some((r) => r.athleteId === g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={alreadyInList}
                      onClick={() => addGuestAthlete(g)}
                      className="w-full text-left bg-surface-container-low hover:bg-surface-container-high border border-white/10 p-3 flex items-center justify-between gap-2 disabled:opacity-40 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {g.dorsal ? `#${g.dorsal} ` : ''}
                          {g.fullName}
                        </p>
                        <p className="text-xs text-tertiary truncate">{g.teamName}</p>
                      </div>
                      <span className="text-[11px] font-bold uppercase text-primary shrink-0">
                        {alreadyInList ? 'Añadido' : '+ Añadir'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL SESIÓN EXTRA ==================== */}
      {extraModalOpen && todayData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crear sesión extra"
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <form
            onSubmit={handleCreateExtraSession}
            className="bg-surface-container border border-white/20 w-full sm:max-w-md p-4 sm:p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold uppercase text-white">
                Abrir Sesión Extra ({selectedDate})
              </h3>
              <button
                type="button"
                onClick={() => setExtraModalOpen(false)}
                className="p-1 text-tertiary hover:text-white cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Equipo
                </label>
                <select
                  required
                  value={extraForm.teamSeasonId}
                  onChange={(e) =>
                    setExtraForm((prev) => ({ ...prev, teamSeasonId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  {todayData.teams
                    .filter((t) => t.canTake || t.canManageSession)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Pabellón / Pista
                </label>
                <select
                  value={extraForm.courtId}
                  onChange={(e) =>
                    setExtraForm((prev) => ({ ...prev, courtId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  <option value="">Sin pista específica</option>
                  {todayData.venuesAndCourts.map((c) => (
                    <option key={c.courtId} value={c.courtId}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Inicio (Madrid)
                  </label>
                  <input
                    type="time"
                    required
                    value={extraForm.startTime}
                    onChange={(e) =>
                      setExtraForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fin (Madrid)
                  </label>
                  <input
                    type="time"
                    required
                    value={extraForm.endTime}
                    onChange={(e) =>
                      setExtraForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={extraForm.notes}
                  onChange={(e) =>
                    setExtraForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ej: Entreno físico / amistoso preparación"
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExtraModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingExtra}
                className="px-4 py-2 bg-cta hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {creatingExtra ? 'Abriendo...' : 'Crear y pasar lista'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL CANCELAR SESIÓN ==================== */}
      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cancelar sesión"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCancelSession}
            className="bg-surface-container border border-white/20 w-full max-w-md p-5 space-y-4 shadow-[6px_6px_0px_0px_#0e0e0e]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold uppercase text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Cancelar Sesión</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1 text-tertiary hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-tertiary">
              {cancelTarget.teamName} · {cancelTarget.madridDate} ({cancelTarget.startTimeMadrid}-
              {cancelTarget.endTimeMadrid})
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                Motivo de cancelación
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Cierre de instalación / festivo / lluvia"
                className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={cancellingSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase cursor-pointer"
              >
                {cancellingSession ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
