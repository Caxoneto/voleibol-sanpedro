'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const fallback: StreamingStatus = { active: false, url: null, matchId: null, matchTitle: null };
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
    active: active,
    url: validUrl,
    matchId: typeof obj.matchId === 'string' ? obj.matchId : null,
    matchTitle: typeof obj.matchTitle === 'string' ? obj.matchTitle : null,
    startedAt: typeof obj.startedAt === 'string' ? obj.startedAt : undefined,
  };
}

export function loadFromStorage(): StreamingStatus {
  if (typeof window === 'undefined') {
    return { active: false, url: null, matchId: null, matchTitle: null };
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY_STATUS);
    if (!cached) return { active: false, url: null, matchId: null, matchTitle: null };
    const parsed = JSON.parse(cached);
    return sanitizeStatus(parsed);
  } catch {
    return { active: false, url: null, matchId: null, matchTitle: null };
  }
}

export function loadRecordingsFromStorage(): MatchRecordingsMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY_RECORDINGS);
    if (!cached) return {};
    const parsed = JSON.parse(cached);
    return sanitizeRecordings(parsed);
  } catch {
    return {};
  }
}

export function useStreaming() {
  const [status, setStatus] = useState<StreamingStatus>(() => loadFromStorage());
  const [recordings, setRecordings] = useState<MatchRecordingsMap>(() => loadRecordingsFromStorage());

  const [todayMatches, setTodayMatches] = useState<StreamingMatchOption[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<StreamingMatchOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/streaming', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newStatus = sanitizeStatus({
          active: !!data.active,
          url: data.url || null,
          matchId: data.matchId || null,
          matchTitle: data.matchTitle || null,
          startedAt: data.startedAt,
        });
        setStatus(newStatus);

        if (data.recordings) {
          const cleanRecordings = sanitizeRecordings(data.recordings);
          setRecordings(cleanRecordings);
          try {
            localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(cleanRecordings));
          } catch {}
        }

        if (Array.isArray(data.todayMatches)) {
          setTodayMatches(data.todayMatches);
        }
        if (Array.isArray(data.upcomingMatches)) {
          setUpcomingMatches(data.upcomingMatches);
        }

        try {
          localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(newStatus));
        } catch {}
      }
    } catch {
      // Ignorar fallos de red silenciosamente
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Polling cada 30 segundos solo si la pestaña está visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, 30000);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<StreamingPayloadEvent | StreamingStatus>;
      if (customEvent.detail) {
        const detail = customEvent.detail;
        if ('status' in detail) {
          const cleanStatus = sanitizeStatus(detail.status);
          setStatus(cleanStatus);
          if (detail.recordings) {
            const cleanRecs = sanitizeRecordings(detail.recordings);
            setRecordings(cleanRecs);
            try {
              localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(cleanRecs));
            } catch {}
          }
        } else {
          setStatus(sanitizeStatus(detail));
        }
      }
    };

    window.addEventListener(STREAMING_EVENT, handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener(STREAMING_EVENT, handleUpdate);
    };
  }, [fetchStatus]);

  const updateLocalStatus = (newStatus: StreamingStatus, updatedRecordings?: MatchRecordingsMap) => {
    const cleanStatus = sanitizeStatus(newStatus);
    setStatus(cleanStatus);
    const cleanRecs = updatedRecordings ? sanitizeRecordings(updatedRecordings) : undefined;
    if (cleanRecs) {
      setRecordings(cleanRecs);
      try {
        localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(cleanRecs));
      } catch {}
    }
    try {
      localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(cleanStatus));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(STREAMING_EVENT, {
        detail: { status: cleanStatus, recordings: cleanRecs },
      })
    );
  };

  return {
    status,
    recordings,
    todayMatches,
    upcomingMatches,
    loading,
    refetch: fetchStatus,
    refreshStatus: fetchStatus,
    updateLocalStatus,
  };
}
