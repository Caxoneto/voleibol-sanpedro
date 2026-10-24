'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StreamingStatus {
  active: boolean;
  url: string | null;
  startedAt?: string;
}

const STORAGE_KEY = 'cdv_streaming_state_v1';
export const STREAMING_EVENT = 'cdv-streaming-update';

export function useStreaming() {
  const [status, setStatus] = useState<StreamingStatus>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return { active: false, url: null };
  });

  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/streaming', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newStatus: StreamingStatus = {
          active: !!data.active,
          url: data.url || null,
          startedAt: data.startedAt,
        };
        setStatus(newStatus);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatus));
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
      const customEvent = e as CustomEvent<StreamingStatus>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(customEvent.detail));
        } catch {}
      }
    };

    window.addEventListener(STREAMING_EVENT, handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener(STREAMING_EVENT, handleUpdate);
    };
  }, [fetchStatus]);

  const updateLocalStatus = (newStatus: StreamingStatus) => {
    setStatus(newStatus);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatus));
    } catch {}
    window.dispatchEvent(new CustomEvent(STREAMING_EVENT, { detail: newStatus }));
  };

  return { status, loading, refetch: fetchStatus, updateLocalStatus };
}
