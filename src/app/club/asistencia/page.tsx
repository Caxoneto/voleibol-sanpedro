'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { ABSENCE_REASONS, ATTENDANCE_STATES } from '@/lib/intranet/catalog';
import { buildCsvString } from '@/lib/intranet/csv-utils';
import { formatDisplayDate, formatMadridDate, formatMadridDateString } from '@/lib/date-utils';
import {
  getShortTeamLabelInFamily,
  getTeamColorTheme,
  groupByCategoryFamily,
} from '@/lib/club-info';

type AttendanceStatusCode =
  | 'PRESENTE'
  | 'RETRASO'
  | 'FALTA_JUSTIFICADA'
  | 'FALTA_INJUSTIFICADA'
  | 'LESIONADO_ASISTE';

type AbsenceReasonCode = 'LESION' | 'ENFERMEDAD' | 'ESTUDIOS' | 'FAMILIAR' | 'OTRO';

type CoachComplianceStatus =
  | 'A_TIEMPO'
  | 'CON_RETRASO'
  | 'SIN_PASAR_LISTA'
  | 'PENDIENTE'
  | 'CANCELLED';

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

const ABSENCE_REASON_LABEL_MAP = new Map(ABSENCE_REASONS.map((r) => [r.code, r.label]));
const ATTENDANCE_LABEL_MAP = new Map(ATTENDANCE_STATES.map((s) => [s.code, s.label]));

interface TeamCoachInfo {
  userId: string;
  name: string;
  email: string;
  staffFunction: string;
}

interface StaffCoachOption {
  id: string;
  name: string;
  email: string;
}

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
  assignedCoachId: string | null;
  assignedCoachName: string | null;
  takenBy: string | null;
  takenByName: string | null;
  takenAt: string | null;
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
  coachesByTeam?: Record<string, TeamCoachInfo[]>;
  staffCoaches?: StaffCoachOption[];
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

interface AthleteStatItem {
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
}

interface AthleteSessionDetailItem {
  sessionId: string;
  madridDate: string;
  startTime: string;
  teamId: string;
  teamName: string;
  status: AttendanceStatusCode;
  absenceReason: AbsenceReasonCode | null;
  notes: string | null;
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
  athleteStats: AthleteStatItem[];
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
  coachesByTeam?: Record<string, TeamCoachInfo[]>;
  selectedAthleteSessions?: AthleteSessionDetailItem[];
}

interface CoachSummaryItem {
  coachId: string | null;
  coachName: string;
  totalEvaluated: number;
  onTimeCount: number;
  lateCount: number;
  missedCount: number;
  pendingCount: number;
  cancelledCount: number;
  remindersSentCount: number;
  complianceRate: number;
  onTimeRate: number;
}

interface CoachExpectedLogItem {
  key: string;
  madridDate: string;
  startTime: string;
  endTime: string;
  teamSeasonId: string;
  teamName: string;
  courtLabel: string | null;
  slotId: string | null;
  sessionId: string | null;
  complianceStatus: CoachComplianceStatus;
  delayMinutes: number | null;
  expectedCoachId: string | null;
  expectedCoachName: string;
  takenById: string | null;
  takenByName: string | null;
  takenAt: string | null;
  takenAtMadrid: string | null;
  hadSubstitution: boolean;
  absentCoachName: string | null;
  substituteCoachName: string | null;
  cancellationReason: string | null;
  reminders: Array<{
    id: string;
    coachEmail: string;
    sentAt: string;
    sentTimeMadrid: string;
  }>;
}

interface CoachHistoryData {
  from: string;
  to: string;
  teams: Array<{ id: string; name: string; division: string }>;
  summaryByCoach: CoachSummaryItem[];
  expectedLogs: CoachExpectedLogItem[];
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

function getCoachDisplayForTeam(
  coachesByTeam: Record<string, TeamCoachInfo[]> | undefined,
  teamSeasonId: string,
  explicitName?: string | null
): string {
  if (explicitName && explicitName.trim()) return explicitName.trim();
  const list = coachesByTeam?.[teamSeasonId] || [];
  if (list.length > 0) return list[0].name;
  return 'Sin entrenador asignado';
}

export default function ClubAsistenciaPage() {
  const { hasPermission } = useClubSession();
  const canTakeAny = hasPermission('attendance.take');
  const canReports = hasPermission('attendance.reports');
  const canManageAny = hasPermission('session.manage');

  const todayMadrid = useMemo(() => formatMadridDateString(new Date()), []);
  const [activeTab, setActiveTab] = useState<'today' | 'reports' | 'coaches'>(
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

  // Sesión abierta en modal de pase de lista
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [rollCall, setRollCall] = useState<RollCallEntry[]>([]);
  const [rollCallSearch, setRollCallSearch] = useState('');
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
    assignedCoachId: '',
    startTime: '18:00',
    endTime: '19:30',
    notes: '',
  });
  const [creatingExtra, setCreatingExtra] = useState(false);

  // Modal Cancelar Sesión
  const [cancelTarget, setCancelTarget] = useState<TrainingSessionItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingSession, setCancellingSession] = useState(false);

  // Informes
  const [reportTeamId, setReportTeamId] = useState('ALL');
  const [reportFrom, setReportFrom] = useState(() => shiftYmd(todayMadrid, -30));
  const [reportTo, setReportTo] = useState(todayMadrid);
  const [reportThreshold, setReportThreshold] = useState(3);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [downloadingAthletePdfId, setDownloadingAthletePdfId] = useState<string | null>(null);
  const [pdfModalAthlete, setPdfModalAthlete] = useState<AthleteStatItem | null>(null);
  const [pdfPeriodMode, setPdfPeriodMode] = useState<
    'ALL' | 'CURRENT_FILTER' | 'LAST_30_DAYS' | 'CUSTOM'
  >('ALL');
  const [pdfCustomFrom, setPdfCustomFrom] = useState(() => shiftYmd(todayMadrid, -30));
  const [pdfCustomTo, setPdfCustomTo] = useState(todayMadrid);

  // Control Entrenadores
  const [coachTeamId, setCoachTeamId] = useState('ALL');
  const [coachFrom, setCoachFrom] = useState(() => shiftYmd(todayMadrid, -14));
  const [coachTo, setCoachTo] = useState(todayMadrid);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachData, setCoachData] = useState<CoachHistoryData | null>(null);

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

  const loadCoachHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!canReports) return;
      setCoachLoading(true);
      setCoachError(null);
      try {
        const params = new URLSearchParams({
          mode: 'coach_history',
          teamId: coachTeamId,
          from: coachFrom,
          to: coachTo,
        });
        const res = await fetch(`/api/intranet/attendance?${params.toString()}`, {
          cache: 'no-store',
          signal,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Error cargando control de entrenadores.');
        }
        setCoachData(json as CoachHistoryData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setCoachError(
          err instanceof Error ? err.message : 'Error cargando control de entrenadores.'
        );
      } finally {
        setCoachLoading(false);
      }
    },
    [canReports, coachTeamId, coachFrom, coachTo]
  );

  useEffect(() => {
    if (activeTab !== 'coaches') return;
    const controller = new AbortController();
    void loadCoachHistory(controller.signal);
    return () => controller.abort();
  }, [activeTab, loadCoachHistory]);

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
      setRollCallSearch('');
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
          assignedCoachId: extraForm.assignedCoachId || null,
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
      setActiveSessionId(null);
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
      `Periodo: ${formatDisplayDate(reportsData.from)} a ${formatDisplayDate(reportsData.to)} · Umbral alerta: ${reportsData.alertThreshold} faltas · Asistencia global: ${reportsData.overallAttendanceRate}%`,
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
      doc.text(`DEPORTISTAS EN ALERTA DE ABSENTISMO (${reportsData.alerts.length})`, margin, y);
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

  function generateIndividualAthletePdf(
    athlete: AthleteStatItem,
    sessions: AthleteSessionDetailItem[],
    from: string,
    to: string,
    coachesByTeam?: Record<string, TeamCoachInfo[]>
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 14;
    let y = 14;

    doc.setFillColor(217, 4, 41);
    doc.rect(0, 0, pageW, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(17, 24, 39);
    doc.text('INFORME INDIVIDUAL DE ASISTENCIA · C.D. VOLEIBOL SAN PEDRO', margin, y + 4);

    const coachName = getCoachDisplayForTeam(coachesByTeam, athlete.teamSeasonId);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    doc.text(
      `Deportista: ${athlete.dorsal != null ? `#${athlete.dorsal} ` : ''}${athlete.fullName}`,
      margin,
      y + 11
    );
    doc.text(`Equipo: ${athlete.teamName} · Entrenador: ${coachName}`, margin, y + 16);
    doc.text(`Periodo analizado: ${formatDisplayDate(from)} a ${formatDisplayDate(to)}`, margin, y + 21);
    y += 26;

    doc.setDrawColor(217, 4, 41);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Bloque resumen
    doc.setFillColor(athlete.hasAlert ? 254 : 243, athlete.hasAlert ? 242 : 244, athlete.hasAlert ? 242 : 246);
    doc.rect(margin, y, pageW - margin * 2, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(
      `Asistencia: ${athlete.attendanceRate}%  |  Sesiones: ${athlete.totalRecords}  |  Racha FI actual: ${athlete.currentConsecutiveUnjustified}`,
      margin + 4,
      y + 6.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(
      `Presente (P): ${athlete.present}   ·   Retraso (R): ${athlete.late}   ·   Falta Justificada (FJ): ${athlete.justified}   ·   Falta Injustificada (FI): ${athlete.unjustified}   ·   Lesionado (L): ${athlete.injured}`,
      margin + 4,
      y + 13
    );
    y += 24;

    if (athlete.hasAlert) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28);
      doc.text(
        `AVISO: Alcanza o supera el umbral configurado de faltas injustificadas (${athlete.unjustified} totales, racha máx. ${athlete.maxConsecutiveUnjustified}).`,
        margin,
        y
      );
      y += 7;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(`DETALLE SESIÓN A SESIÓN (${sessions.length})`, margin, y);
    y += 5;

    const renderTableHeader = () => {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 3.5, pageW - margin * 2, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      doc.text('Fecha', margin + 2, y);
      doc.text('Hora', margin + 24, y);
      doc.text('Equipo', margin + 39, y);
      doc.text('Estado', margin + 94, y);
      doc.text('Motivo / Notas', margin + 132, y);
      y += 5.5;
    };

    renderTableHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (sessions.length === 0) {
      doc.setTextColor(107, 114, 128);
      doc.text('Sin registros de asistencia en el periodo seleccionado.', margin + 2, y);
    } else {
      for (const sess of sessions) {
        if (y > 278) {
          doc.addPage();
          y = 16;
          renderTableHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }

        const statusLabel = ATTENDANCE_LABEL_MAP.get(sess.status) || sess.status;
        const reasonLabel = sess.absenceReason
          ? ABSENCE_REASON_LABEL_MAP.get(sess.absenceReason) || sess.absenceReason
          : '';
        const extraText = [reasonLabel, sess.notes || ''].filter(Boolean).join(' · ') || '—';

        if (sess.status === 'FALTA_INJUSTIFICADA') {
          doc.setTextColor(185, 28, 28);
        } else if (sess.status === 'RETRASO') {
          doc.setTextColor(180, 83, 9);
        } else {
          doc.setTextColor(31, 41, 55);
        }

        doc.text(formatDisplayDate(sess.madridDate), margin + 2, y);
        doc.text(sess.startTime, margin + 24, y);
        doc.text(sess.teamName.slice(0, 28), margin + 39, y);
        doc.text(statusLabel.slice(0, 21), margin + 94, y);
        doc.text(extraText.slice(0, 34), margin + 132, y);
        y += 5;
      }
    }

    const safeSlug = athlete.fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    doc.save(`asistencia-${safeSlug || 'deportista'}-${from}-a-${to}.pdf`);
  }

  function openAthletePdfModal(athlete: AthleteStatItem) {
    setPdfModalAthlete(athlete);
    setPdfPeriodMode('ALL');
    setPdfCustomFrom(reportFrom);
    setPdfCustomTo(reportTo);
  }

  async function handleConfirmAthletePdfExport(e: React.FormEvent) {
    e.preventDefault();
    if (!pdfModalAthlete || downloadingAthletePdfId) return;

    const seasonStart = todayMadrid >= '2026-09-01' ? '2026-09-01' : shiftYmd(todayMadrid, -365);
    let targetFrom = seasonStart;
    let targetTo = todayMadrid;

    if (pdfPeriodMode === 'CURRENT_FILTER') {
      targetFrom = reportFrom;
      targetTo = reportTo;
    } else if (pdfPeriodMode === 'LAST_30_DAYS') {
      targetFrom = shiftYmd(todayMadrid, -30);
      targetTo = todayMadrid;
    } else if (pdfPeriodMode === 'CUSTOM') {
      targetFrom = pdfCustomFrom || reportFrom;
      targetTo = pdfCustomTo || reportTo;
    }

    if (targetFrom > targetTo) {
      setFeedbackMsg({
        type: 'err',
        text: 'La fecha inicial no puede ser posterior a la fecha final para el PDF.',
      });
      return;
    }

    setDownloadingAthletePdfId(pdfModalAthlete.athleteId);
    try {
      const params = new URLSearchParams({
        mode: 'reports',
        teamId: pdfModalAthlete.teamSeasonId || reportTeamId,
        from: targetFrom,
        to: targetTo,
        alertThreshold: String(reportThreshold),
        athleteId: pdfModalAthlete.athleteId,
      });
      const res = await fetch(`/api/intranet/attendance?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as ReportsData & { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo obtener el detalle del deportista.');
      }
      const updatedStat =
        (json.athleteStats || []).find(
          (x) =>
            x.athleteId === pdfModalAthlete.athleteId &&
            x.teamSeasonId === pdfModalAthlete.teamSeasonId
        ) ||
        (json.athleteStats || []).find((x) => x.athleteId === pdfModalAthlete.athleteId) ||
        pdfModalAthlete;

      generateIndividualAthletePdf(
        updatedStat,
        json.selectedAthleteSessions || [],
        json.from || targetFrom,
        json.to || targetTo,
        json.coachesByTeam || reportsData?.coachesByTeam
      );
      setPdfModalAthlete(null);
    } catch (err) {
      setFeedbackMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error generando el PDF individual.',
      });
    } finally {
      setDownloadingAthletePdfId(null);
    }
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

  const filteredRollCall = useMemo(() => {
    const q = rollCallSearch.trim().toLowerCase();
    if (!q) return rollCall;
    return rollCall.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.dorsal != null && String(r.dorsal).includes(q))
    );
  }, [rollCall, rollCallSearch]);

  const unlinkedSlots = useMemo(
    () => (todayData?.slots || []).filter((sl) => !sl.existingSessionId),
    [todayData]
  );

  const coachKpis = useMemo(() => {
    const logs = coachData?.expectedLogs || [];
    let evaluated = 0;
    let onTime = 0;
    let late = 0;
    let missed = 0;
    let reminders = 0;
    for (const l of logs) {
      if (l.reminders.length > 0) reminders += 1;
      if (l.complianceStatus === 'A_TIEMPO') {
        evaluated += 1;
        onTime += 1;
      } else if (l.complianceStatus === 'CON_RETRASO') {
        evaluated += 1;
        late += 1;
      } else if (l.complianceStatus === 'SIN_PASAR_LISTA') {
        evaluated += 1;
        missed += 1;
      }
    }
    return { evaluated, onTime, late, missed, reminders };
  }, [coachData]);

  return (
    <div className="space-y-5 pb-20 sm:pb-8">
      {/* Banner offline / cola pendiente */}
      {(!isOnline || offlineQueue.length > 0) && (
        <div
          role="status"
          className="bg-amber-500/15 border border-amber-400/60 px-3.5 py-2 flex items-center justify-between gap-2.5 shadow-[3px_3px_0px_0px_#0e0e0e]"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
            )}
            <span className="text-xs font-bold text-amber-200 truncate">
              {!isOnline
                ? `Sin conexión${offlineQueue.length > 0 ? ` · ${offlineQueue.length} pendiente(s)` : ' · Guardado local'}`
                : `${offlineQueue.length} sesión(es) pendiente(s)`}
            </span>
          </div>

          {offlineQueue.length > 0 && isOnline && (
            <button
              type="button"
              onClick={() => void syncOfflineQueue()}
              disabled={syncingQueue}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60 shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncingQueue ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{syncingQueue ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          )}
        </div>
      )}

      {/* Cabecera módulo */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <ClipboardCheck className="w-5 h-5 text-primary-container shrink-0" aria-hidden="true" />
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Asistencia y Entrenamientos
            </h1>
          </div>

          {/* Pestañas */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today');
                setFeedbackMsg(null);
              }}
              className={`px-3.5 py-2 text-xs font-label-md uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container-low text-on-surface border-white/15 hover:border-white/30'
              }`}
            >
              Hoy / Pasar Lista
            </button>

            {canReports && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reports');
                    setActiveSessionId(null);
                    setFeedbackMsg(null);
                  }}
                  className={`px-3.5 py-2 text-xs font-label-md uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                    activeTab === 'reports'
                      ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container-low text-on-surface border-white/15 hover:border-white/30'
                  }`}
                >
                  Informes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('coaches');
                    setActiveSessionId(null);
                    setFeedbackMsg(null);
                  }}
                  className={`px-3.5 py-2 text-xs font-label-md uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                    activeTab === 'coaches'
                      ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container-low text-on-surface border-white/15 hover:border-white/30'
                  }`}
                >
                  Control Entrenadores
                </button>
              </>
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
            className="p-1 opacity-75 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== PESTAÑA HOY / PASAR LISTA ==================== */}
      {activeTab === 'today' && (
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
                  const firstTeam =
                    todayData?.teams.find((t) => t.canTake || t.canManageSession)?.id ||
                    todayData?.teams[0]?.id ||
                    '';
                  const firstCourt = todayData?.venuesAndCourts[0]?.courtId || '';
                  const defaultCoach =
                    todayData?.coachesByTeam?.[firstTeam]?.[0]?.userId || '';
                  setExtraForm({
                    teamSeasonId: firstTeam,
                    courtId: firstCourt,
                    assignedCoachId: defaultCoach,
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
                  <div className="bg-surface-container border border-white/10 p-5 text-center">
                    <p className="text-sm font-bold text-tertiary">Sin sesiones registradas</p>
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
                      const assignedCoachDisplay = getCoachDisplayForTeam(
                        todayData.coachesByTeam,
                        sess.teamSeasonId,
                        sess.assignedCoachName
                      );

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
                                <p
                                  className={`font-headline text-base sm:text-lg font-bold truncate ${
                                    getTeamColorTheme(sess.teamName).colorKey
                                      ? getTeamColorTheme(sess.teamName).textClass
                                      : 'text-white'
                                  }`}
                                >
                                  {sess.teamName}
                                </p>
                                <p className="text-xs text-tertiary flex items-center gap-1.5 mt-0.5">
                                  <User className="w-3.5 h-3.5 text-tertiary shrink-0" aria-hidden="true" />
                                  <span className="truncate">
                                    Entrenador: <strong className="text-on-surface">{assignedCoachDisplay}</strong>
                                    {sess.takenByName && sess.takenByName !== assignedCoachDisplay && (
                                      <span className="text-tertiary"> · Lista: {sess.takenByName}</span>
                                    )}
                                  </span>
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
                                {sess.isOver48h && sess.canTake && (
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
                                <span
                                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                                    sess.isOver48h
                                      ? 'bg-amber-950/50 text-amber-200 border-amber-500/30'
                                      : 'bg-surface-container-low text-tertiary border-white/10'
                                  }`}
                                >
                                  {sess.isOver48h ? 'Bloqueado (>48h)' : 'Solo lectura'}
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
                    Franjas del día ({unlinkedSlots.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {unlinkedSlots.map((slot) => {
                      const slotCoachName = getCoachDisplayForTeam(
                        todayData.coachesByTeam,
                        slot.teamSeasonId
                      );
                      return (
                        <article
                          key={slot.id}
                          className="bg-surface-container-low border border-dashed border-white/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-headline text-base font-bold text-white truncate">
                              {slot.teamName}
                            </p>
                            <p className="text-xs text-tertiary flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                Entrenador: <strong className="text-on-surface">{slotCoachName}</strong>
                              </span>
                            </p>
                            <p className="text-xs text-tertiary truncate">
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
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== PESTAÑA INFORMES ==================== */}
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
                  {groupByCategoryFamily(
                    reportsData?.teams || todayData?.teams || [],
                    (t) => `${t.id} ${t.name}`
                  ).map(({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)}
                        </option>
                      ))}
                    </optgroup>
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/20 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            )}
          </div>

          {reportsLoading && (
            <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
              <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
              <span>Calculando estadísticas de asistencia...</span>
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

              {/* Resumen por equipos (plegable cuando supera 4 equipos) */}
              {reportsData.teamStats.length > 0 && (
                <details
                  open={reportsData.teamStats.length <= 4}
                  className="group bg-surface-container-low border border-white/10 overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span>Ver resumen por equipo ({reportsData.teamStats.length})</span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 pt-2 border-t border-white/10">
                    {reportsData.teamStats.map((ts) => {
                      const teamCoaches = reportsData.coachesByTeam?.[ts.teamSeasonId] || [];
                      const coachNames =
                        teamCoaches.length > 0
                          ? teamCoaches.map((c) => c.name).join(', ')
                          : 'Sin entrenador asignado';

                      return (
                        <div
                          key={ts.teamSeasonId}
                          className="bg-surface-container border border-white/10 p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`font-bold text-sm truncate ${
                                getTeamColorTheme(ts.teamName).colorKey
                                  ? getTeamColorTheme(ts.teamName).textClass
                                  : 'text-white'
                              }`}
                            >
                              {ts.teamName}
                            </p>
                            <span className="text-sm font-extrabold text-emerald-300 shrink-0">
                              {ts.attendanceRate}%
                            </span>
                          </div>
                          <p className="text-[11px] text-tertiary flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{coachNames}</span>
                          </p>
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
                      );
                    })}
                  </div>
                </details>
              )}

              {/* Detalle por deportista: Cards en móvil, tabla en desktop */}
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                    % Asistencia por Deportista ({reportsData.athleteStats.length})
                  </h2>
                  <span className="text-[11px] text-rose-300">
                    Las filas en rojo indican &ge; {reportsData.alertThreshold} faltas injustificadas / seguidas
                  </span>
                </div>

                {/* Móvil (< md) */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {reportsData.athleteStats.map((a) => (
                    <div
                      key={`${a.teamSeasonId}-${a.athleteId}`}
                      className={`border p-3 space-y-2 ${
                        a.hasAlert
                          ? 'bg-rose-950/55 border-l-4 border-l-rose-500 border-rose-500/50'
                          : 'bg-surface-container border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {a.dorsal != null ? `#${a.dorsal} ` : ''}
                            {a.fullName}
                          </p>
                          <p className="text-[11px] text-tertiary truncate">{a.teamName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-extrabold ${
                              a.hasAlert ? 'text-rose-200' : 'text-emerald-300'
                            }`}
                          >
                            {a.attendanceRate}%
                          </span>
                          <button
                            type="button"
                            onClick={() => openAthletePdfModal(a)}
                            disabled={downloadingAthletePdfId === a.athleteId}
                            aria-label={`Exportar PDF de ${a.fullName}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-low hover:bg-surface-container-high border border-white/15 text-[10px] font-bold uppercase text-white cursor-pointer disabled:opacity-50"
                          >
                            {downloadingAthletePdfId === a.athleteId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileText className="w-3 h-3 text-primary" />
                            )}
                            <span>PDF</span>
                          </button>
                        </div>
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
                        <th className="py-3 px-3 text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reportsData.athleteStats.map((a) => (
                        <tr
                          key={`${a.teamSeasonId}-${a.athleteId}`}
                          className={
                            a.hasAlert
                              ? 'bg-rose-950/55 border-l-4 border-l-rose-500 border-rose-500/50'
                              : 'hover:bg-white/[0.02]'
                          }
                        >
                          <td className="py-2.5 px-3 font-bold text-white">
                            {a.dorsal != null ? `#${a.dorsal} ` : ''}
                            {a.fullName}
                            {a.hasAlert && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-600 text-white uppercase">
                                Alerta ({a.unjustified} FI)
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
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => openAthletePdfModal(a)}
                              disabled={downloadingAthletePdfId === a.athleteId}
                              title={`Descargar PDF individual de ${a.fullName}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-low hover:bg-surface-container-high border border-white/15 text-[10px] font-bold uppercase text-white cursor-pointer disabled:opacity-50"
                            >
                              {downloadingAthletePdfId === a.athleteId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <FileText className="w-3 h-3 text-primary" />
                              )}
                              <span>PDF</span>
                            </button>
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

      {/* ==================== PESTAÑA CONTROL ENTRENADORES ==================== */}
      {activeTab === 'coaches' && canReports && (
        <div className="space-y-5">
          <div className="bg-surface-container border border-white/10 p-4 shadow-[4px_4px_0px_0px_#0e0e0e] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="coach-rep-team"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Equipo
                </label>
                <select
                  id="coach-rep-team"
                  value={coachTeamId}
                  onChange={(e) => setCoachTeamId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                >
                  <option value="ALL">Todos los equipos autorizados</option>
                  {groupByCategoryFamily(
                    coachData?.teams || reportsData?.teams || todayData?.teams || [],
                    (t) => `${t.id} ${t.name}`
                  ).map(({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="coach-rep-from"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Desde
                </label>
                <input
                  id="coach-rep-from"
                  type="date"
                  value={coachFrom}
                  onChange={(e) => e.target.value && setCoachFrom(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label
                  htmlFor="coach-rep-to"
                  className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                >
                  Hasta
                </label>
                <input
                  id="coach-rep-to"
                  type="date"
                  value={coachTo}
                  onChange={(e) => e.target.value && setCoachTo(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-primary-container"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <p className="text-[11px] text-tertiary">
                Control de pase de lista dentro de los 15 minutos iniciales de cada entrenamiento según los horarios del cuadrante.
              </p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Monitorización automática (+15 min) activa</span>
              </span>
            </div>
          </div>

          {coachLoading && (
            <div className="bg-surface-container border border-white/10 p-8 flex items-center justify-center gap-3 text-sm text-tertiary">
              <Loader2 className="w-5 h-5 animate-spin text-primary-container" />
              <span>Analizando cumplimiento de entrenadores...</span>
            </div>
          )}

          {coachError && !coachLoading && (
            <div className="bg-error-container/30 border border-error/40 p-4 text-sm text-error">
              {coachError}
            </div>
          )}

          {!coachLoading && coachData && (
            <div className="space-y-5">
              {/* KPIs Control Entrenadores */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-surface-container border border-white/10 p-3 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Evaluadas
                  </p>
                  <p className="text-2xl font-extrabold text-white mt-0.5">{coachKpis.evaluated}</p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    A tiempo (&le;15m)
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-300 mt-0.5">{coachKpis.onTime}</p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Con retraso
                  </p>
                  <p className="text-2xl font-extrabold text-amber-300 mt-0.5">{coachKpis.late}</p>
                </div>
                <div className="bg-surface-container border border-white/10 p-3 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Sin pasar lista
                  </p>
                  <p className="text-2xl font-extrabold text-rose-400 mt-0.5">{coachKpis.missed}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-surface-container border border-white/10 p-3 shadow-[3px_3px_0px_0px_#0e0e0e]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    Avisos 15m
                  </p>
                  <p className="text-2xl font-extrabold text-primary mt-0.5">{coachKpis.reminders}</p>
                </div>
              </div>

              {/* Resumen por Entrenador (plegable cuando supera 4) */}
              {coachData.summaryByCoach.length > 0 && (
                <details
                  open={coachData.summaryByCoach.length <= 4}
                  className="group bg-surface-container-low border border-white/10 overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
                    <span>Ver resumen por entrenador ({coachData.summaryByCoach.length})</span>
                    <ChevronDown className="w-4 h-4 text-tertiary shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 pt-2 border-t border-white/10">
                    {coachData.summaryByCoach.map((cs) => (
                      <div
                        key={cs.coachId || cs.coachName}
                        className={`bg-surface-container border p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2 ${
                          cs.missedCount > 0 ? 'border-rose-500/40' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                            <span className="truncate">{cs.coachName}</span>
                          </p>
                          <span
                            className={`text-sm font-extrabold shrink-0 ${
                              cs.missedCount > 0 ? 'text-amber-300' : 'text-emerald-300'
                            }`}
                          >
                            {cs.complianceRate}%
                          </span>
                        </div>
                        <p className="text-[11px] text-tertiary">
                          {cs.totalEvaluated} evaluadas · A tiempo: {cs.onTimeRate}%
                          {cs.remindersSentCount > 0 && ` · ${cs.remindersSentCount} aviso(s)`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 bg-emerald-950/50 text-emerald-300">
                            A tiempo: {cs.onTimeCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-950/50 text-amber-300">
                            Retraso: {cs.lateCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-rose-950/50 text-rose-300">
                            Sin lista: {cs.missedCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Historial detallado */}
              <section className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
                  Historial de Sesiones Esperadas ({coachData.expectedLogs.length})
                </h2>

                {coachData.expectedLogs.length === 0 ? (
                  <div className="bg-surface-container border border-white/10 p-6 text-center text-sm text-tertiary">
                    No hay franjas ni sesiones en el rango seleccionado.
                  </div>
                ) : (
                  <>
                    {/* Móvil (< md) */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                      {coachData.expectedLogs.map((log) => {
                        const badgeCls =
                          log.complianceStatus === 'A_TIEMPO'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : log.complianceStatus === 'CON_RETRASO'
                            ? 'bg-amber-950/60 text-amber-200 border-amber-500/40'
                            : log.complianceStatus === 'SIN_PASAR_LISTA'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                            : log.complianceStatus === 'PENDIENTE'
                            ? 'bg-blue-950/60 text-blue-200 border-blue-500/40'
                            : 'bg-surface-container-low text-tertiary border-white/10';

                        const statusText =
                          log.complianceStatus === 'A_TIEMPO'
                            ? 'A tiempo'
                            : log.complianceStatus === 'CON_RETRASO'
                            ? `Retraso (+${log.delayMinutes ?? '?'}m)`
                            : log.complianceStatus === 'SIN_PASAR_LISTA'
                            ? 'Sin pasar lista'
                            : log.complianceStatus === 'PENDIENTE'
                            ? 'Pendiente'
                            : 'Cancelada';

                        return (
                          <div
                            key={log.key}
                            className={`border p-3 space-y-1.5 ${
                              log.complianceStatus === 'SIN_PASAR_LISTA'
                                ? 'bg-rose-950/40 border-l-4 border-l-rose-500 border-rose-500/40'
                                : 'bg-surface-container border-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                  {log.teamName}
                                </p>
                                <p className="text-[11px] text-tertiary">
                                  {formatDisplayDate(log.madridDate)} · {log.startTime}–{log.endTime}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${badgeCls}`}
                              >
                                {statusText}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface">
                              Responsable: <strong>{log.expectedCoachName}</strong>
                              {log.hadSubstitution && log.absentCoachName && (
                                <span className="text-amber-300">
                                  {' '}
                                  (sustituye a {log.absentCoachName})
                                </span>
                              )}
                            </p>
                            {log.takenByName && (
                              <p className="text-[11px] text-tertiary">
                                Pasó lista: {log.takenByName}{' '}
                                {log.takenAtMadrid ? `a las ${log.takenAtMadrid}` : ''}
                              </p>
                            )}
                            {log.reminders.length > 0 && (
                              <p className="text-[11px] font-bold text-amber-300">
                                Aviso enviado: {log.reminders[0].sentTimeMadrid} ({log.reminders[0].coachEmail})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop (>= md) */}
                    <div className="hidden md:block bg-surface-container border border-white/10 shadow-[4px_4px_0px_0px_#0e0e0e] overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-surface-container-low text-[10px] uppercase tracking-wider text-tertiary">
                            <th className="py-3 px-3">Fecha / Hora</th>
                            <th className="py-3 px-3">Equipo / Pista</th>
                            <th className="py-3 px-3">Entrenador</th>
                            <th className="py-3 px-3">Estado</th>
                            <th className="py-3 px-3">Registro Lista</th>
                            <th className="py-3 px-3">Aviso +15m</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {coachData.expectedLogs.map((log) => {
                            const badgeCls =
                              log.complianceStatus === 'A_TIEMPO'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : log.complianceStatus === 'CON_RETRASO'
                                ? 'bg-amber-950/60 text-amber-200 border-amber-500/40'
                                : log.complianceStatus === 'SIN_PASAR_LISTA'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                                : log.complianceStatus === 'PENDIENTE'
                                ? 'bg-blue-950/60 text-blue-200 border-blue-500/40'
                                : 'bg-surface-container-low text-tertiary border-white/10';

                            const statusText =
                              log.complianceStatus === 'A_TIEMPO'
                                ? `A tiempo${log.delayMinutes != null ? ` (+${log.delayMinutes}m)` : ''}`
                                : log.complianceStatus === 'CON_RETRASO'
                                ? `Con retraso (+${log.delayMinutes ?? '?'} min)`
                                : log.complianceStatus === 'SIN_PASAR_LISTA'
                                ? 'Sin pasar lista'
                                : log.complianceStatus === 'PENDIENTE'
                                ? 'Pendiente'
                                : 'Cancelada';

                            return (
                              <tr
                                key={log.key}
                                className={
                                  log.complianceStatus === 'SIN_PASAR_LISTA'
                                    ? 'bg-rose-950/45 border-l-4 border-l-rose-500'
                                    : 'hover:bg-white/[0.02]'
                                }
                              >
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <p className="font-bold text-white">{formatDisplayDate(log.madridDate)}</p>
                                  <p className="text-[11px] text-tertiary">
                                    {log.startTime} – {log.endTime}
                                  </p>
                                </td>
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-white">{log.teamName}</p>
                                  {log.courtLabel && (
                                    <p className="text-[11px] text-tertiary">{log.courtLabel}</p>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <p className="text-white font-semibold">{log.expectedCoachName}</p>
                                  {log.hadSubstitution && (
                                    <p className="text-[10px] text-amber-300">
                                      Sustituto{log.absentCoachName ? ` (de ${log.absentCoachName})` : ''}
                                    </p>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase border ${badgeCls}`}
                                  >
                                    {statusText}
                                  </span>
                                  {log.cancellationReason && (
                                    <p className="text-[10px] text-tertiary mt-0.5">
                                      {log.cancellationReason}
                                    </p>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-tertiary">
                                  {log.takenByName ? (
                                    <>
                                      <p className="text-on-surface font-medium">{log.takenByName}</p>
                                      {log.takenAtMadrid && (
                                        <p className="text-[11px] text-tertiary">{log.takenAtMadrid}</p>
                                      )}
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {log.reminders.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {log.reminders.map((rem) => (
                                        <span
                                          key={rem.id}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-[10px] font-bold text-amber-200"
                                        >
                                          <Bell className="w-3 h-3" aria-hidden="true" />
                                          <span>Enviado {rem.sentTimeMadrid}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-tertiary">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL PASE DE LISTA (xl) ==================== */}
      <IntranetModal
        isOpen={Boolean(activeSession)}
        onClose={() => {
          if (!guestModalOpen) {
            setActiveSessionId(null);
          }
        }}
        title={activeSession ? activeSession.teamName : 'Pasar lista'}
        subtitle={
          activeSession
            ? `${formatDisplayDate(activeSession.madridDate)} · ${activeSession.startTimeMadrid} – ${activeSession.endTimeMadrid}${
                activeSession.courtName ? ` · ${activeSession.courtName}` : ''
              }`
            : undefined
        }
        size="xl"
        footer={
          activeSession && rollCall.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-tertiary">
                <strong className="text-white">{rollCall.length}</strong> deportistas ·{' '}
                <strong className="text-emerald-300">
                  {rollCallSummary.PRESENTE +
                    rollCallSummary.RETRASO +
                    rollCallSummary.LESIONADO_ASISTE}
                </strong>{' '}
                en pista
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSessionId(null)}
                  className="px-4 py-2.5 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAttendance()}
                  disabled={savingAttendance}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cta hover:bg-cta-hover text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-60"
                >
                  {savingAttendance ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{savingAttendance ? 'Guardando...' : 'Guardar Asistencia'}</span>
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {activeSession && (
          <div className="space-y-4">
            {feedbackMsg && feedbackMsg.type === 'err' && (
              <div
                role="alert"
                className="px-3 py-2 bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200"
              >
                {feedbackMsg.text}
              </div>
            )}

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

            {/* Buscador rápido + Añadir invitado */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={rollCallSearch}
                  onChange={(e) => setRollCallSearch(e.target.value)}
                  aria-label="Filtrar deportistas por nombre o dorsal"
                  placeholder="Filtrar por nombre o dorsal..."
                  className="w-full bg-surface-container-lowest border border-white/15 pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-tertiary/75 outline-none focus:border-primary-container"
                />
                {rollCallSearch && (
                  <button
                    type="button"
                    onClick={() => setRollCallSearch('')}
                    aria-label="Limpiar filtro"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setGuestModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/20 text-xs font-bold uppercase tracking-wider text-white cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>+ Añadir invitado</span>
              </button>
            </div>

            {/* Lista táctil de deportistas */}
            <div className="space-y-2.5">
              {filteredRollCall.length === 0 ? (
                <div className="bg-surface-container border border-white/10 p-5 text-center text-sm text-tertiary">
                  {rollCall.length === 0
                    ? 'Sin deportistas en plantilla.'
                    : 'Sin coincidencias para el filtro.'}
                </div>
              ) : (
                filteredRollCall.map((entry) => {
                  const isAbsence =
                    entry.status === 'FALTA_JUSTIFICADA' ||
                    entry.status === 'FALTA_INJUSTIFICADA';
                  const notesOpen = Boolean(expandedNotesIds[entry.athleteId] || entry.notes);

                  return (
                    <div
                      key={entry.athleteId}
                      className="bg-surface-container border border-white/10 p-3 sm:p-3.5 shadow-[3px_3px_0px_0px_#0e0e0e] space-y-2.5"
                    >
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
                      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
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
                              className={`min-h-[44px] px-0.5 sm:px-1.5 py-2 border flex flex-col items-center justify-center transition-all cursor-pointer min-w-0 ${
                                active ? cfg.activeCls : cfg.idleCls
                              }`}
                            >
                              <span className="text-xs sm:text-sm font-extrabold leading-none">
                                {cfg.short}
                              </span>
                              <span className="text-[10px] uppercase tracking-tight mt-1 leading-none truncate max-w-full">
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
                          aria-label={`Observación rápida para ${entry.fullName}`}
                          placeholder="Observación rápida (opcional)..."
                          maxLength={200}
                          className="w-full bg-surface-container-lowest border border-white/15 px-3 py-2 text-xs text-white placeholder:text-tertiary/75 focus:border-primary-container outline-none"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </IntranetModal>

      {/* ==================== MODAL INVITADO ==================== */}
      <IntranetModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        title="Añadir Deportista Invitado"
        size="md"
      >
        <div className="relative">
          <Search
            className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={guestQuery}
            onChange={(e) => setGuestQuery(e.target.value)}
            aria-label="Buscar deportista invitado por nombre o apellidos"
            placeholder="Buscar por nombre o apellidos (mín. 2 letras)..."
            autoFocus
            className="w-full bg-surface-container-lowest border border-white/20 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-primary-container"
          />
        </div>

        <div className="space-y-2 min-h-[160px] max-h-[50vh] overflow-y-auto">
          {guestLoading && (
            <div className="flex items-center justify-center py-6 text-xs text-tertiary gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando...</span>
            </div>
          )}
          {!guestLoading && guestQuery.trim().length >= 2 && guestResults.length === 0 && (
            <p className="text-xs text-tertiary text-center py-6">Sin resultados.</p>
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
                      {g.dorsal != null ? `#${g.dorsal} ` : ''}
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
      </IntranetModal>

      {/* ==================== MODAL SESIÓN EXTRA ==================== */}
      <IntranetModal
        isOpen={extraModalOpen && Boolean(todayData)}
        onClose={() => setExtraModalOpen(false)}
        title={`Abrir Sesión Extra (${selectedDate})`}
        size="md"
      >
        {todayData && (
          <form onSubmit={handleCreateExtraSession} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="asist-extra-team" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Equipo
                </label>
                <select
                  id="asist-extra-team"
                  required
                  value={extraForm.teamSeasonId}
                  onChange={(e) => {
                    const nextTeamId = e.target.value;
                    const defaultCoach =
                      todayData.coachesByTeam?.[nextTeamId]?.[0]?.userId || '';
                    setExtraForm((prev) => ({
                      ...prev,
                      teamSeasonId: nextTeamId,
                      assignedCoachId: defaultCoach,
                    }));
                  }}
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  {groupByCategoryFamily(
                    todayData.teams.filter((t) => t.canTake || t.canManageSession),
                    (t) => `${t.id} ${t.name}`
                  ).map(({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="asist-extra-coach" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Entrenador asignado
                </label>
                <select
                  id="asist-extra-coach"
                  value={extraForm.assignedCoachId}
                  onChange={(e) =>
                    setExtraForm((prev) => ({ ...prev, assignedCoachId: e.target.value }))
                  }
                  className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
                >
                  <option value="">Automático (técnico del equipo)</option>
                  {(todayData.staffCoaches || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="asist-extra-court" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Pabellón / Pista
                </label>
                <select
                  id="asist-extra-court"
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
                  <label htmlFor="asist-extra-start" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Inicio (Madrid)
                  </label>
                  <input
                    id="asist-extra-start"
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
                  <label htmlFor="asist-extra-end" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                    Fin (Madrid)
                  </label>
                  <input
                    id="asist-extra-end"
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
                <label htmlFor="asist-extra-notes" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                  Notas (opcional)
                </label>
                <input
                  id="asist-extra-notes"
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

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setExtraModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
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
        )}
      </IntranetModal>

      {/* ==================== MODAL CANCELAR SESIÓN ==================== */}
      <IntranetModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancelar Sesión"
        subtitle={
          cancelTarget
            ? `${cancelTarget.teamName} · ${formatDisplayDate(cancelTarget.madridDate)} (${cancelTarget.startTimeMadrid}-${cancelTarget.endTimeMadrid})`
            : undefined
        }
        accent="rose"
        size="sm"
      >
        {cancelTarget && (
          <form onSubmit={handleCancelSession} className="space-y-4">
            <div>
              <label htmlFor="asist-cancel-reason" className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
                Motivo de cancelación
              </label>
              <input
                id="asist-cancel-reason"
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Cierre de instalación / festivo / lluvia"
                className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={cancellingSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
              >
                {cancellingSession ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* ==================== MODAL EXPORTAR PDF INDIVIDUAL ==================== */}
      <IntranetModal
        isOpen={Boolean(pdfModalAthlete)}
        onClose={() => {
          if (!downloadingAthletePdfId) setPdfModalAthlete(null);
        }}
        title="Exportar PDF de Asistencia"
        subtitle={
          pdfModalAthlete
            ? `${pdfModalAthlete.dorsal != null ? `#${pdfModalAthlete.dorsal} ` : ''}${pdfModalAthlete.fullName} · ${pdfModalAthlete.teamName}`
            : undefined
        }
        size="md"
      >
        {pdfModalAthlete && (
          <form onSubmit={handleConfirmAthletePdfExport} className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                Selecciona el periodo a incluir en el informe
              </p>

              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    {
                      id: 'ALL' as const,
                      title: 'Todo el historial (Temporada completa)',
                      desc: `Desde 01/09/2026 hasta hoy (${formatDisplayDate(todayMadrid)})`,
                    },
                    {
                      id: 'CURRENT_FILTER' as const,
                      title: 'Periodo actual del filtro',
                      desc: `${formatDisplayDate(reportFrom)} a ${formatDisplayDate(reportTo)}`,
                    },
                    {
                      id: 'LAST_30_DAYS' as const,
                      title: 'Últimos 30 días',
                      desc: `${formatDisplayDate(shiftYmd(todayMadrid, -30))} a ${formatDisplayDate(todayMadrid)}`,
                    },
                    {
                      id: 'CUSTOM' as const,
                      title: 'Rango de fechas personalizado',
                      desc: 'Elige fecha de inicio y fecha de fin concretas',
                    },
                  ] as const
                ).map((opt) => {
                  const selected = pdfPeriodMode === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-primary-container/15 border-primary-container text-white'
                          : 'bg-surface-container-lowest border-white/10 text-on-surface hover:border-white/25'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pdf-period-mode"
                        value={opt.id}
                        checked={selected}
                        onChange={() => setPdfPeriodMode(opt.id)}
                        className="mt-1 accent-primary-container"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider">{opt.title}</p>
                        <p className="text-[11px] text-tertiary mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {pdfPeriodMode === 'CUSTOM' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label
                    htmlFor="pdf-custom-from"
                    className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                  >
                    Desde
                  </label>
                  <input
                    id="pdf-custom-from"
                    type="date"
                    required
                    value={pdfCustomFrom}
                    onChange={(e) => setPdfCustomFrom(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="pdf-custom-to"
                    className="block text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1"
                  >
                    Hasta
                  </label>
                  <input
                    id="pdf-custom-to"
                    type="date"
                    required
                    value={pdfCustomTo}
                    onChange={(e) => setPdfCustomTo(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-white/20 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                disabled={Boolean(downloadingAthletePdfId)}
                onClick={() => setPdfModalAthlete(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase text-tertiary hover:text-white cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(downloadingAthletePdfId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer disabled:opacity-50"
              >
                {downloadingAthletePdfId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{downloadingAthletePdfId ? 'Generando...' : 'Generar PDF'}</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>
    </div>
  );
}
