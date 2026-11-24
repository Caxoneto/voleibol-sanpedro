'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface StreamingStatus {
  active: boolean;
  url: string | null;
  matchId?: string | null;
  matchTitle?: string | null;
  startedAt?: string;
}

export interface StreamingMatchOption {
  id: string;
  round: number;
  categoryName: string;
  homeTeam: string;
  awayTeam: string;
  timeStr: string;
  dateStr: string;
  venue: string;
}

export type MatchRecordingsMap = Record<string, string>;

const STORAGE_KEY_STATUS = 'cdv_streaming_state_v2';
const STORAGE_KEY_RECORDINGS = 'cdv_streaming_recordings_v1';
export const STREAMING_EVENT = 'cdv-streaming-update';

export interface StreamingPayloadEvent {
  status: StreamingStatus;
  recordings?: MatchRecordingsMap;
}

const DEFAULT_STATUS: StreamingStatus = {
  active: false,
  url: null,
  matchId: null,
  matchTitle: null,
};

export function isValidYouTubeUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      return false;
    }
    if (host === 'youtu.be') {
      return parsed.pathname.length > 1;
    }
    return (
      parsed.pathname.startsWith('/watch') ||
      parsed.pathname.startsWith('/live') ||
      parsed.pathname.startsWith('/embed') ||
      parsed.pathname.startsWith('/shorts')
    );
  } catch {
    return false;
  }
}

export function sanitizeRecordings(raw: unknown): MatchRecordingsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: MatchRecordingsMap = {};
  const keyRegex = /^[a-zA-Z0-9_-]{1,64}$/;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (keyRegex.test(key) && typeof val === 'string' && isValidYouTubeUrl(val)) {
      clean[key] = val.trim();
    }
  }
  return clean;
}

export function sanitizeStatus(raw: unknown): StreamingStatus {
  const fallback: StreamingStatus = { ...DEFAULT_STATUS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  const active = typeof obj.active === 'boolean' ? obj.active : false;
  const rawUrl = typeof obj.url === 'string' ? obj.url : null;
  const validUrl = rawUrl && isValidYouTubeUrl(rawUrl) ? rawUrl.trim() : null;

  if (!validUrl) {
    return {
      active: false,
      url: null,
      matchId: typeof obj.matchId === 'string' ? obj.matchId : null,
      matchTitle: typeof obj.matchTitle === 'string' ? obj.matchTitle : null,
      startedAt: typeof obj.startedAt === 'string' ? obj.startedAt : undefined,
    };
  }

  return {
    active,
    url: validUrl,
    matchId: typeof obj.matchId === 'string' ? obj.matchId : null,
    matchTitle: typeof obj.matchTitle === 'string' ? obj.matchTitle : null,
    startedAt: typeof obj.startedAt === 'string' ? obj.startedAt : undefined,
  };
}

export function loadFromStorage(): StreamingStatus {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATUS };
  }
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY_STATUS);
    if (!cached) return { ...DEFAULT_STATUS };
    return sanitizeStatus(JSON.parse(cached));
  } catch {
    return { ...DEFAULT_STATUS };
  }
}

export function loadRecordingsFromStorage(): MatchRecordingsMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY_RECORDINGS);
    if (!cached) return {};
    return sanitizeRecordings(JSON.parse(cached));
  } catch {
    return {};
  }
}

interface SharedStreamingState {
  status: StreamingStatus;
  recordings: MatchRecordingsMap;
  todayMatches: StreamingMatchOption[];
  upcomingMatches: StreamingMatchOption[];
  recentMatches: StreamingMatchOption[];
  loading: boolean;
  hydrated: boolean;
}

let sharedState: SharedStreamingState = {
  status: { ...DEFAULT_STATUS },
  recordings: {},
  todayMatches: [],
  upcomingMatches: [],
  recentMatches: [],
  loading: true,
  hydrated: false,
};

let lastTodayJson = '[]';
let lastUpcomingJson = '[]';
let lastRecentJson = '[]';
let lastStatusJson = JSON.stringify(DEFAULT_STATUS);
let lastRecordingsJson = '{}';

const POLLING_DISABLED_PREFIXES = [
  '/privacidad',
  '/aviso-legal',
  '/cookies',
  '/accesibilidad',
  '/acceso',
  '/inscripcion',
  '/autorizaciones',
  '/mi-club',
  '/club',
  '/admin',
];

function isPollingDisabledRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return POLLING_DISABLED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const listeners = new Set<() => void>();
let subscriberCount = 0;
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let inFlightFetch: Promise<void> | null = null;
let storageHydrated = false;
let windowListenerBound = false;
let visibilityListenerBound = false;
let initialFetchTriggered = false;
let lastFetchAtMs = 0;
let currentRoutePathname: string | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function stopPollingTimer() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function syncPollingSchedule() {
  stopPollingTimer();
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (subscriberCount <= 0) return;
  if (isPollingDisabledRoute(currentRoutePathname)) return;
  if (document.visibilityState !== 'visible') return;

  pollingTimer = setInterval(() => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      !isPollingDisabledRoute(currentRoutePathname)
    ) {
      void fetchSharedStatus();
    }
  }, 30000);
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') {
    stopPollingTimer();
    return;
  }
  if (document.visibilityState === 'visible') {
    if (!isPollingDisabledRoute(currentRoutePathname)) {
      if (Date.now() - lastFetchAtMs > 10000) {
        void fetchSharedStatus();
      }
      syncPollingSchedule();
    }
  }
}

function hydrateSharedFromStorageOnce() {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;

  const cachedStatus = loadFromStorage();
  const cachedRecordings = loadRecordingsFromStorage();
  const statusJson = JSON.stringify(cachedStatus);
  const recordingsJson = JSON.stringify(cachedRecordings);

  sharedState = {
    ...sharedState,
    status: statusJson !== lastStatusJson ? cachedStatus : sharedState.status,
    recordings: recordingsJson !== lastRecordingsJson ? cachedRecordings : sharedState.recordings,
    hydrated: true,
  };
  lastStatusJson = statusJson;
  lastRecordingsJson = recordingsJson;
  notifyListeners();
}

async function fetchSharedStatus(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    lastFetchAtMs = Date.now();
    try {
      const res = await fetch('/api/streaming', { cache: 'no-store' });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (data) {
        const newStatus = sanitizeStatus({
          active: !!data.active,
          url: data.url || null,
          matchId: data.matchId || null,
          matchTitle: data.matchTitle || null,
          startedAt: data.startedAt,
        });
        const newStatusJson = JSON.stringify(newStatus);
        const nextStatus = newStatusJson !== lastStatusJson ? newStatus : sharedState.status;
        lastStatusJson = newStatusJson;

        let nextRecordings = sharedState.recordings;
        if (data.recordings) {
          const cleanRecordings = sanitizeRecordings(data.recordings);
          const recJson = JSON.stringify(cleanRecordings);
          if (recJson !== lastRecordingsJson) {
            nextRecordings = cleanRecordings;
            lastRecordingsJson = recJson;
          }
          try {
            window.localStorage.setItem(STORAGE_KEY_RECORDINGS, recJson);
          } catch {
            // Ignorar cuota de localStorage
          }
        }

        let nextToday = sharedState.todayMatches;
        if (Array.isArray(data.todayMatches)) {
          const todayJson = JSON.stringify(data.todayMatches);
          if (todayJson !== lastTodayJson) {
            nextToday = data.todayMatches;
            lastTodayJson = todayJson;
          }
        }

        let nextUpcoming = sharedState.upcomingMatches;
        if (Array.isArray(data.upcomingMatches)) {
          const upcomingJson = JSON.stringify(data.upcomingMatches);
          if (upcomingJson !== lastUpcomingJson) {
            nextUpcoming = data.upcomingMatches;
            lastUpcomingJson = upcomingJson;
          }
        }

        let nextRecent = sharedState.recentMatches;
        if (Array.isArray(data.recentMatches)) {
          const recentJson = JSON.stringify(data.recentMatches);
          if (recentJson !== lastRecentJson) {
            nextRecent = data.recentMatches;
            lastRecentJson = recentJson;
          }
        }

        try {
          window.localStorage.setItem(STORAGE_KEY_STATUS, newStatusJson);
        } catch {
          // Ignorar cuota de localStorage
        }

        sharedState = {
          status: nextStatus,
          recordings: nextRecordings,
          todayMatches: nextToday,
          upcomingMatches: nextUpcoming,
          recentMatches: nextRecent,
          loading: false,
          hydrated: true,
        };
        notifyListeners();
      } else {
        sharedState = { ...sharedState, loading: false, hydrated: true };
        notifyListeners();
      }
    } catch {
      sharedState = { ...sharedState, loading: false, hydrated: true };
      notifyListeners();
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

function handleWindowStreamingEvent(e: Event) {
  const customEvent = e as CustomEvent<StreamingPayloadEvent | StreamingStatus>;
  if (!customEvent.detail) return;
  const detail = customEvent.detail;

  let nextStatus = sharedState.status;
  let nextRecordings = sharedState.recordings;

  if ('status' in detail) {
    const cleanStatus = sanitizeStatus(detail.status);
    const statusJson = JSON.stringify(cleanStatus);
    if (statusJson !== lastStatusJson) {
      nextStatus = cleanStatus;
      lastStatusJson = statusJson;
    }
    if (detail.recordings) {
      const cleanRecs = sanitizeRecordings(detail.recordings);
      const recJson = JSON.stringify(cleanRecs);
      if (recJson !== lastRecordingsJson) {
        nextRecordings = cleanRecs;
        lastRecordingsJson = recJson;
      }
      try {
        window.localStorage.setItem(STORAGE_KEY_RECORDINGS, recJson);
      } catch {}
    }
  } else {
    const cleanStatus = sanitizeStatus(detail);
    const statusJson = JSON.stringify(cleanStatus);
    if (statusJson !== lastStatusJson) {
      nextStatus = cleanStatus;
      lastStatusJson = statusJson;
    }
  }

  sharedState = {
    ...sharedState,
    status: nextStatus,
    recordings: nextRecordings,
    hydrated: true,
  };
  notifyListeners();
}

export function useStreaming() {
  const pathname = usePathname();
  // Inicialización determinista idéntica entre SSR y primer render CSR para evitar hydration mismatch
  const [snapshot, setSnapshot] = useState<SharedStreamingState>(() => ({
    status: { ...DEFAULT_STATUS },
    recordings: {},
    todayMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    loading: true,
    hydrated: false,
  }));

  useEffect(() => {
    currentRoutePathname = pathname;
    syncPollingSchedule();
  }, [pathname]);

  useEffect(() => {
    currentRoutePathname = pathname;
    const syncSnapshot = () => setSnapshot(sharedState);
    listeners.add(syncSnapshot);
    subscriberCount += 1;

    hydrateSharedFromStorageOnce();
    syncSnapshot();

    if (!initialFetchTriggered) {
      initialFetchTriggered = true;
      void fetchSharedStatus();
    }

    if (!visibilityListenerBound && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerBound = true;
    }

    if (!windowListenerBound && typeof window !== 'undefined') {
      window.addEventListener(STREAMING_EVENT, handleWindowStreamingEvent);
      windowListenerBound = true;
    }

    syncPollingSchedule();

    return () => {
      listeners.delete(syncSnapshot);
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount === 0) {
        stopPollingTimer();
        if (visibilityListenerBound && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          visibilityListenerBound = false;
        }
        if (windowListenerBound && typeof window !== 'undefined') {
          window.removeEventListener(STREAMING_EVENT, handleWindowStreamingEvent);
          windowListenerBound = false;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => fetchSharedStatus(), []);

  const updateLocalStatus = useCallback(
    (newStatus: StreamingStatus, updatedRecordings?: MatchRecordingsMap) => {
      const cleanStatus = sanitizeStatus(newStatus);
      const statusJson = JSON.stringify(cleanStatus);
      lastStatusJson = statusJson;

      let cleanRecs: MatchRecordingsMap | undefined;
      if (updatedRecordings) {
        cleanRecs = sanitizeRecordings(updatedRecordings);
        const recJson = JSON.stringify(cleanRecs);
        lastRecordingsJson = recJson;
        try {
          window.localStorage.setItem(STORAGE_KEY_RECORDINGS, recJson);
        } catch {}
      }
      try {
        window.localStorage.setItem(STORAGE_KEY_STATUS, statusJson);
      } catch {}

      sharedState = {
        ...sharedState,
        status: cleanStatus,
        recordings: cleanRecs ?? sharedState.recordings,
        hydrated: true,
      };
      notifyListeners();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(STREAMING_EVENT, {
            detail: { status: cleanStatus, recordings: cleanRecs },
          })
        );
      }
    },
    []
  );

  return {
    status: snapshot.status,
    recordings: snapshot.recordings,
    todayMatches: snapshot.todayMatches,
    upcomingMatches: snapshot.upcomingMatches,
    recentMatches: snapshot.recentMatches,
    loading: snapshot.loading,
    hydrated: snapshot.hydrated,
    refetch,
    refreshStatus: refetch,
    updateLocalStatus,
  };
}
