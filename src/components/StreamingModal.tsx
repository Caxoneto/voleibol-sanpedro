'use client';

import { useState, useEffect } from 'react';
import { StreamingStatus } from '@/lib/use-streaming';

interface StreamingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  currentUrl: string | null;
  onSuccess: (newStatus: StreamingStatus) => void;
}

export default function StreamingModal({
  isOpen,
  onClose,
  isLive,
  currentUrl,
  onSuccess,
}: StreamingModalProps) {
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setPassword('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    if (!trimmedUrl.includes('youtube.com') && !trimmedUrl.includes('youtu.be')) {
      setError('La dirección debe ser un enlace válido de YouTube (ej. youtube.com/watch?v=... o youtu.be/...)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          url: trimmedUrl,
          password: password,
        }),
      });

      let data: { success?: boolean; error?: string; startedAt?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // En caso de respuesta no JSON
      }

      if (res.status === 401) {
        setError(data?.error || 'Contraseña de autorización incorrecta.');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || (data && !data.success)) {
        setError(data?.error || `Error del servidor (${res.status}). Inténtalo de nuevo.`);
        setIsSubmitting(false);
        return;
      }

      onSuccess({
        active: true,
        url: trimmedUrl,
        startedAt: data?.startedAt,
      });
      onClose();
      // Desplazar arriba del todo suavemente hacia el botón de YouTube
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

  // Finalizar retransmisión activa con confirmación de contraseña
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
          password: password,
        }),
      });

      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {}

      if (res.status === 401) {
        setError(data?.error || 'Contraseña de autorización incorrecta.');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || (data && !data.success)) {
        setError(data?.error || 'Error finalizando la retransmisión.');
        setIsSubmitting(false);
        return;
      }

      onSuccess({
        active: false,
        url: null,
      });
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
      <div className="relative w-full max-w-md bg-surface-container-low border border-white/15 rounded-lg p-5 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.35)] overflow-hidden">
        {/* Cabecera roja con resplandor superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-primary-container to-amber-500" />

        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana de streaming"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            close
          </span>
        </button>

        {/* CASO 1: YA HAY RETRANSMISIÓN -> CONFIRMAR FINALIZACIÓN CON CONTRASEÑA */}
        {isLive ? (
          <form onSubmit={handleStopStream}>
            <div className="flex items-center gap-2.5 mb-3 text-red-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
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

            <p className="text-xs sm:text-sm text-tertiary mb-3.5 leading-relaxed font-body">
              Actualmente hay un directo de YouTube visible en la portada para todos los visitantes. Para evitar cierres accidentales o no autorizados, introduce la contraseña para finalizar la emisión.
            </p>

            {currentUrl && (
              <div className="p-3 bg-black/50 border border-white/10 rounded mb-4 flex items-center justify-between gap-2 overflow-hidden">
                <div className="min-w-0">
                  <span className="text-[10px] text-tertiary uppercase tracking-wider block">
                    URL activa
                  </span>
                  <p className="text-xs text-white truncate font-mono">
                    {currentUrl}
                  </p>
                </div>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded transition-colors"
                >
                  Ver ↗
                </a>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded text-red-200 text-xs mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Campo Contraseña de Autorización para Finalizar */}
            <div className="mb-4">
              <label
                htmlFor="stop-streaming-password"
                className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
              >
                Contraseña de Autorización
              </label>
              <div className="relative">
                <input
                  id="stop-streaming-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña para finalizar"
                  className="w-full px-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-red-500 focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded border border-white/10 transition-colors cursor-pointer"
              >
                Mantener Directo
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white rounded border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                    <span>Finalizar Retransmisión</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* CASO 2: NO HAY RETRANSMISIÓN -> INTRODUCIR URL Y CONTRASEÑA */
          <form onSubmit={handleStartStream}>
            <div className="flex items-center gap-2 mb-2 text-red-500">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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

            <p className="text-xs text-tertiary mb-4 leading-relaxed font-body">
              Introduce la URL del directo generado en YouTube y la contraseña autorizada para activar el botón «En directo!» en la portada del club.
            </p>

            {error && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded text-red-200 text-xs mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5 mb-5">
              {/* Campo URL */}
              <div>
                <label
                  htmlFor="streaming-url"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
                >
                  URL del Directo de YouTube
                </label>
                <div className="relative">
                  <input
                    id="streaming-url"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                    className="w-full px-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-red-500 focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <label
                  htmlFor="streaming-password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
                >
                  Contraseña de Autorización
                </label>
                <div className="relative">
                  <input
                    id="streaming-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduce la contraseña del club"
                    className="w-full px-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-red-500 focus:outline-none rounded text-white placeholder-tertiary/60 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white hover:bg-white/5 rounded border border-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
