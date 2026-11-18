'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Radio, Square, X } from 'lucide-react';
import { StreamingStatus, MatchRecordingsMap, useStreaming, isValidYouTubeUrl } from '@/lib/use-streaming';

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  currentUrl: string | null;
  matchId?: string | null;
  matchTitle?: string | null;
  onSuccess: (newStatus: StreamingStatus, recordings?: MatchRecordingsMap) => void;
}

export default function StreamingModal({
  isOpen,
  onClose,
  isLive,
  currentUrl,
  matchId: initialMatchId,
  matchTitle: initialMatchTitle,
  onSuccess,
}: StreamingModalProps) {
  const { todayMatches, status: liveStatus } = useStreaming();

  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
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

  // Reiniciar campos ÚNICAMENTE cuando se abre el modal (evita perder inputs si todayMatches refresca en background)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setUrl('');
      setPassword('');
      setSelectedMatchId(todayMatches.length > 0 ? todayMatches[0].id : 'general');
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
  }, [isOpen, todayMatches]);

  // Si todayMatches llega tras abrir sin selección previa, preseleccionar el primero sin borrar inputs
  useEffect(() => {
    if (isOpen && (!selectedMatchId || selectedMatchId === 'general') && todayMatches.length > 0 && !url && !password) {
      setSelectedMatchId(todayMatches[0].id);
    }
  }, [isOpen, todayMatches, selectedMatchId, url, password]);

  // Gestión accesible de Escape + focus trap (solo enfoca en apertura real)
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
        } else if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
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

  // Iniciar nueva retransmisión
  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Por favor, introduce la dirección del streaming de YouTube.');
      return;
    }

    if (!password) {
      setError('Por favor, introduce la contraseña de autorización.');
      return;
    }

    const trimmedUrl = url.trim();
    if (!isValidYouTubeUrl(trimmedUrl)) {
      setError(
        'La dirección debe ser un enlace válido de YouTube (ej. https://www.youtube.com/watch?v=... o https://youtu.be/...)'
      );
      return;
    }

    let chosenTitle: string | null = null;
    if (selectedMatchId && selectedMatchId !== 'general') {
      const matchFound = todayMatches.find((m) => m.id === selectedMatchId);
      if (matchFound) {
        chosenTitle = matchFound.categoryName;
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
          password,
          matchId: selectedMatchId || null,
          matchTitle: chosenTitle,
        }),
      });

      let data: {
        success?: boolean;
        error?: string;
        startedAt?: string;
        matchId?: string;
        matchTitle?: string;
      } | null = null;

      try {
        data = await res.json();
      } catch {}

      if (res.status === 401) {
        setError(data?.error || 'Contraseña de autorización incorrecta.');
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

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error publicando streaming:', err);
      setError('Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalizar retransmisión activa con confirmación de contraseña y guardado de vídeo
  const handleStopStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, introduce la contraseña para confirmar la finalización.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          password,
        }),
      });

      let data: {
        success?: boolean;
        error?: string;
        recordedMatchId?: string;
        recordings?: MatchRecordingsMap;
      } | null = null;

      try {
        data = await res.json();
      } catch {}

      if (res.status === 401) {
        setError(data?.error || 'Contraseña de autorización incorrecta.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-surface-container-low border border-white/15 rounded-lg p-5 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.35)] max-h-[90dvh] overflow-y-auto overflow-x-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-primary-container to-amber-500" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana de streaming"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
              className="font-headline-md text-xl sm:text-2xl text-on-surface uppercase tracking-wide mb-2"
            >
              ¿Finalizar Retransmisión?
            </h3>

            <p className="text-xs sm:text-sm text-tertiary mb-3.5 leading-relaxed font-body-sm">
              Al finalizar, la emisión en directo se cerrará y el enlace de YouTube se guardará automáticamente en el partido correspondiente con el botón <strong className="text-white">«Ver partido»</strong> para visualización en diferido.
            </p>

            <div className="space-y-2 mb-4">
              {currentMatchTitle && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded flex items-start gap-2.5">
                  <Radio className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-[10px] text-red-200 uppercase font-bold tracking-wider block">
                      Partido Asociado
                    </span>
                    <p className="text-xs text-white font-semibold">{currentMatchTitle}</p>
                    <span className="text-[11px] text-emerald-300 font-medium block mt-1">
                      El botón «Ver partido» se añadirá a este partido en la web.
                    </span>
                  </div>
                </div>
              )}

              {currentUrl && isValidYouTubeUrl(currentUrl) && (
                <div className="p-3 bg-black/50 border border-white/10 rounded flex items-center justify-between gap-2 overflow-hidden">
                  <div className="min-w-0">
                    <span className="text-[10px] text-tertiary uppercase tracking-wider block">
                      URL del vídeo de YouTube
                    </span>
                    <p className="text-xs text-white truncate font-mono">{currentUrl}</p>
                  </div>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded transition-colors"
                  >
                    Ver ↗
                  </a>
                </div>
              )}
            </div>

            {error && (
              <div role="alert" className="p-2.5 bg-red-950/80 border border-red-500/50 rounded text-red-200 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="stop-streaming-password"
                className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
              >
                Contraseña de Autorización
              </label>
              <input
                id="stop-streaming-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduce la contraseña para finalizar"
                className="w-full px-3 py-2 text-base sm:text-xs bg-black/60 border border-white/15 focus:border-primary focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded border border-white/15 transition-colors cursor-pointer"
              >
                Mantener Directo
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary-container hover:bg-cta-hover text-white rounded border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Guardando y finalizando...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    <span>Finalizar y Guardar Vídeo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStartStream}>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="font-headline-sm text-xs uppercase tracking-wider font-bold">
                Retransmisión Oficial
              </span>
            </div>

            <h3
              id="streaming-modal-title"
              className="font-headline-md text-xl sm:text-2xl text-on-surface uppercase tracking-wide mb-1.5"
            >
              Publicar Streaming
            </h3>

            <p className="text-xs text-tertiary mb-4 leading-relaxed font-body-sm">
              Selecciona el partido que se va a retransmitir, introduce la URL del directo de YouTube y la contraseña autorizada.
            </p>

            {error && (
              <div role="alert" className="p-2.5 bg-red-950/80 border border-red-500/50 rounded text-red-200 text-xs mb-4 flex items-center gap-2">
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
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/80 border border-white/20 focus:border-primary focus:outline-none rounded text-white transition-colors cursor-pointer"
                >
                  {todayMatches.length > 0 ? (
                    <optgroup label="── Partidos de Hoy ──" className="bg-neutral-900 text-red-300 font-bold">
                      {todayMatches.map((m) => (
                        <option key={m.id} value={m.id} className="text-white bg-neutral-900 font-normal">
                          {m.categoryName}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option value="" disabled className="text-tertiary bg-neutral-900">
                      No hay partidos programados para hoy
                    </option>
                  )}

                  <optgroup label="── Opciones ──" className="bg-neutral-900 text-tertiary font-bold">
                    <option value="general" className="text-white bg-neutral-900 font-normal">
                      Retransmisión General / Amistoso
                    </option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-tertiary mt-1">
                  Al finalizar la retransmisión, el enlace quedará guardado automáticamente en el partido con el botón «Ver partido».
                </p>
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
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/60 border border-white/15 focus:border-primary focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="streaming-password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
                >
                  Contraseña de Autorización
                </label>
                <input
                  id="streaming-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña del club"
                  className="w-full px-3 py-2 text-base sm:text-xs bg-black/60 border border-white/15 focus:border-primary focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded border border-white/15 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary-container hover:bg-cta-hover text-white rounded border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
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
