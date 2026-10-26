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

export function useStreaming() {
  const [status, setStatus] = useState<StreamingStatus>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY_STATUS);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return { active: false, url: null, matchId: null, matchTitle: null };
  });

  const [recordings, setRecordings] = useState<MatchRecordingsMap>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY_RECORDINGS);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  const [todayMatches, setTodayMatches] = useState<StreamingMatchOption[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<StreamingMatchOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/streaming', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newStatus: StreamingStatus = {
          active: !!data.active,
          url: data.url || null,
          matchId: data.matchId || null,
          matchTitle: data.matchTitle || null,
          startedAt: data.startedAt,
        };
        setStatus(newStatus);

        if (data.recordings && typeof data.recordings === 'object') {
          setRecordings(data.recordings);
          try {
            localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(data.recordings));
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
          setStatus(detail.status);
          if (detail.recordings) {
            setRecordings(detail.recordings);
            try {
              localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(detail.recordings));
            } catch {}
          }
        } else {
          setStatus(detail);
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
    setStatus(newStatus);
    if (updatedRecordings) {
      setRecordings(updatedRecordings);
      try {
        localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(updatedRecordings));
      } catch {}
    }
    try {
      localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(newStatus));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(STREAMING_EVENT, {
        detail: { status: newStatus, recordings: updatedRecordings },
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
    updateLocalStatus,
  };
}
