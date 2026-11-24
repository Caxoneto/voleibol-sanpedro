'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Radio, Square, X } from 'lucide-react';
import {
  StreamingStatus,
  MatchRecordingsMap,
  useStreaming,
  isValidYouTubeUrl,
} from '@/lib/use-streaming';

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  currentUrl: string | null;
  matchId?: string | null;
  matchTitle?: string | null;
  defaultMatchId?: string | null;
  onSuccess: (newStatus: StreamingStatus, recordings?: MatchRecordingsMap) => void;
}

export default function StreamingModal({
  isOpen,
  onClose,
  isLive,
  currentUrl,
  matchId: initialMatchId,
  matchTitle: initialMatchTitle,
  defaultMatchId,
  onSuccess,
}: StreamingModalProps) {
  const { todayMatches, upcomingMatches, status: liveStatus } = useStreaming();

  const [url, setUrl] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wasOpenRef = useRef(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setUrl('');
      setSelectedMatchId(
        defaultMatchId || (todayMatches.length > 0 ? todayMatches[0].id : 'general')
      );
      setError(null);
      setIsSubmitting(false);
    }
    if (!isOpen && wasOpenRef.current) {
      const prev = lastFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        requestAnimationFrame(() => prev.focus());
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, todayMatches, defaultMatchId]);

  useEffect(() => {
    if (isOpen && defaultMatchId) {
      setSelectedMatchId(defaultMatchId);
    }
  }, [isOpen, defaultMatchId]);

  useEffect(() => {
    if (
      isOpen &&
      !defaultMatchId &&
      (!selectedMatchId || selectedMatchId === 'general') &&
      todayMatches.length > 0 &&
      !url
    ) {
      setSelectedMatchId(todayMatches[0].id);
    }
  }, [isOpen, todayMatches, selectedMatchId, url, defaultMatchId]);

  useEffect(() => {
    if (!isOpen) return;

    const modalEl = modalRef.current;
    if (modalEl && !modalEl.contains(document.activeElement)) {
      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        requestAnimationFrame(() => focusable[0].focus());
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !modalRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMatchTitle =
    initialMatchTitle ||
    liveStatus.matchTitle ||
    (initialMatchId || liveStatus.matchId ? `Partido ${initialMatchId || liveStatus.matchId}` : null);

  const allSelectableMatches = [...todayMatches, ...upcomingMatches];

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Introduce la URL del streaming de YouTube.');
      return;
    }

    if (!isValidYouTubeUrl(trimmedUrl)) {
      setError(
        'La dirección debe ser un enlace válido de YouTube (ej. https://www.youtube.com/watch?v=... o https://youtu.be/...).'
      );
      return;
    }

    let chosenTitle: string | null = null;
    if (selectedMatchId && selectedMatchId !== 'general') {
      const matchFound = allSelectableMatches.find((m) => m.id === selectedMatchId);
      if (matchFound) {
        chosenTitle = `${matchFound.categoryName}: ${matchFound.homeTeam} vs ${matchFound.awayTeam}`;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          url: trimmedUrl,
          matchId: selectedMatchId || null,
          matchTitle: chosenTitle,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setError(data?.error || 'Tu cuenta no tiene permisos de staff para publicar retransmisiones.');
        return;
      }

      if (!res.ok || (data && !data.success)) {
        setError(data?.error || `Error del servidor (${res.status}). Inténtalo de nuevo.`);
        return;
      }

      const newStatus: StreamingStatus = {
        active: true,
        url: trimmedUrl,
        matchId: data?.matchId || selectedMatchId || null,
        matchTitle: data?.matchTitle || chosenTitle,
        startedAt: data?.startedAt,
      };

      onSuccess(newStatus);
      onClose();
    } catch (err) {
      console.error('Error publicando streaming:', err);
      setError('Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setError(data?.error || 'Tu cuenta no tiene permisos para finalizar retransmisiones.');
        return;
      }

      if (!res.ok || (data && !data.success)) {
        setError(data?.error || 'Error finalizando la retransmisión.');
        return;
      }

      const finishedStatus: StreamingStatus = {
        active: false,
        url: null,
        matchId: null,
        matchTitle: null,
      };

      onSuccess(finishedStatus, data?.recordings);
      onClose();
    } catch (err) {
      console.error('Error deteniendo streaming:', err);
      setError('Error de conexión al finalizar el directo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streaming-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-surface-container-low border-2 border-white/15 rounded-none p-5 sm:p-7 shadow-brutal-dark max-h-[90dvh] overflow-y-auto overflow-x-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-primary-container to-amber-500" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana de streaming"
          className="absolute top-3.5 right-3.5 w-10 h-10 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 border border-white/15 rounded-none transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {isLive ? (
          <form onSubmit={handleStopStream}>
            <div className="flex items-center gap-2.5 mb-2 text-primary">
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-headline-sm text-xs uppercase tracking-wider font-bold">
                Retransmisión en Curso
              </span>
            </div>

            <h3
              id="streaming-modal-title"
              className="font-headline-md text-xl sm:text-2xl text-on-surface uppercase tracking-wide mb-2 pr-10"
            >
              Finalizar Retransmisión
            </h3>

            <p className="text-xs sm:text-sm text-tertiary mb-4 leading-relaxed">
              La emisión se detendrá y el vídeo quedará vinculado automáticamente en diferido al partido seleccionado.
            </p>

            <div className="space-y-2 mb-5">
              {currentMatchTitle && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-none flex items-start gap-2.5">
                  <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-red-200 uppercase font-bold tracking-wider block">
                      Partido Asociado
                    </span>
                    <p className="text-xs text-white font-semibold break-words">{currentMatchTitle}</p>
                  </div>
                </div>
              )}

              {currentUrl && isValidYouTubeUrl(currentUrl) && (
                <div className="p-3 bg-black/50 border border-white/10 rounded-none flex items-center justify-between gap-2 overflow-hidden">
                  <div className="min-w-0">
                    <span className="text-[10px] text-tertiary uppercase tracking-wider block">
                      URL de YouTube
                    </span>
                    <p className="text-xs text-white truncate font-mono">{currentUrl}</p>
                  </div>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-none border border-white/15 transition-colors"
                  >
                    Ver ↗
                  </a>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-none text-red-200 text-xs mb-4 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded-none border border-white/15 transition-colors cursor-pointer"
              >
                Mantener Directo
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary-container hover:bg-cta-hover text-white rounded-none border border-red-400/50 shadow-brutal-dark active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>Finalizar y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStartStream}>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Radio className="w-4 h-4" aria-hidden="true" />
              <span className="font-headline-sm text-xs uppercase tracking-wider font-bold">
                Emisión Oficial en Directo
              </span>
            </div>

            <h3
              id="streaming-modal-title"
              className="font-headline-md text-xl sm:text-2xl text-on-surface uppercase tracking-wide mb-3 pr-10"
            >
              Publicar Streaming
            </h3>

            {error && (
              <div
                role="alert"
                className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-none text-red-200 text-xs mb-4 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5 mb-5">
              <div>
                <label
                  htmlFor="streaming-match-select"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
                >
                  Partido a Retransmitir
                </label>
                <select
                  id="streaming-match-select"
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/80 border border-white/20 focus:border-primary focus:outline-none rounded-none text-white transition-colors cursor-pointer"
                >
                  {todayMatches.length > 0 && (
                    <optgroup
                      label="── Partidos de Hoy ──"
                      className="bg-neutral-900 text-red-300 font-bold"
                    >
                      {todayMatches.map((m) => (
                        <option key={m.id} value={m.id} className="text-white bg-neutral-900 font-normal">
                          {m.timeStr ? `${m.timeStr} · ` : ''}{m.categoryName} ({m.homeTeam} vs {m.awayTeam})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {upcomingMatches.length > 0 && (
                    <optgroup
                      label="── Próximos Partidos ──"
                      className="bg-neutral-900 text-tertiary font-bold"
                    >
                      {upcomingMatches.slice(0, 10).map((m) => (
                        <option key={m.id} value={m.id} className="text-white bg-neutral-900 font-normal">
                          {m.dateStr} {m.timeStr ? `${m.timeStr} ` : ''}· {m.categoryName}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="── General ──" className="bg-neutral-900 text-tertiary font-bold">
                    <option value="general" className="text-white bg-neutral-900 font-normal">
                      Retransmisión General / Amistoso
                    </option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label
                  htmlFor="streaming-url"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
                >
                  URL del Directo de YouTube
                </label>
                <input
                  id="streaming-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/60 border border-white/15 focus:border-primary focus:outline-none rounded-none text-white placeholder-tertiary/75 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded-none border border-white/15 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary-container hover:bg-cta-hover text-white rounded-none border border-red-400/50 shadow-brutal-dark active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" aria-hidden="true" />
                    <span>Emitir en Directo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
