'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Film,
  Plus,
  Radio,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import StreamingModal from '@/components/StreamingModal';
import {
  isValidYouTubeUrl,
  useStreaming,
  type StreamingMatchOption,
} from '@/lib/use-streaming';
import { getTeamColorTheme, groupByCategoryFamily } from '@/lib/club-info';
import { formatDisplayDate } from '@/lib/date-utils';

type StreamingTab = 'matches' | 'recordings';

export default function ClubStreamingPage() {
  const { hasPermission } = useClubSession();
  const canManage = hasPermission('web.streaming');

  const {
    status,
    recordings,
    todayMatches,
    upcomingMatches,
    recentMatches,
    loading,
    refetch,
    updateLocalStatus,
  } = useStreaming();

  const [activeTab, setActiveTab] = useState<StreamingTab>('matches');
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [defaultMatchId, setDefaultMatchId] = useState<string | null>(null);

  // Modal de añadir/editar grabación en diferido
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recMatchId, setRecMatchId] = useState('');
  const [recUrl, setRecUrl] = useState('');
  const [recSaving, setRecSaving] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const matchLookup = useMemo(() => {
    const map = new Map<string, StreamingMatchOption>();
    for (const m of [...todayMatches, ...upcomingMatches, ...recentMatches]) {
      if (!map.has(m.id)) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [todayMatches, upcomingMatches, recentMatches]);

  const recordingEntries = useMemo(() => {
    return Object.entries(recordings).map(([matchId, url]) => ({
      matchId,
      url,
      match: matchLookup.get(matchId) || null,
    }));
  }, [recordings, matchLookup]);

  const selectableForRecording = useMemo(() => {
    const seen = new Set<string>();
    const list: StreamingMatchOption[] = [];
    for (const m of [...todayMatches, ...recentMatches, ...upcomingMatches]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      list.push(m);
    }
    return list;
  }, [todayMatches, recentMatches, upcomingMatches]);

  function openLiveForMatch(matchId?: string) {
    setDefaultMatchId(matchId || null);
    setLiveModalOpen(true);
  }

  function openRecordingModal(existingMatchId?: string, existingUrl?: string) {
    setRecError(null);
    setRecMatchId(existingMatchId || selectableForRecording[0]?.id || '');
    setRecUrl(existingUrl || '');
    setRecModalOpen(true);
  }

  async function handleSaveRecording(e: React.FormEvent) {
    e.preventDefault();
    if (recSaving) return;
    setRecError(null);

    const trimmedUrl = recUrl.trim();
    if (!recMatchId.trim()) {
      setRecError('Selecciona un partido oficial para asociar la grabación.');
      return;
    }
    if (!isValidYouTubeUrl(trimmedUrl)) {
      setRecError('Introduce una URL HTTPS válida de YouTube.');
      return;
    }

    setRecSaving(true);
    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_recording',
          matchId: recMatchId.trim(),
          url: trimmedUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'No se pudo guardar la grabación.');
      }

      updateLocalStatus(status, data.recordings);
      setRecModalOpen(false);
      setFeedbackMsg('Grabación vinculada al partido correctamente.');
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Error guardando la grabación.');
    } finally {
      setRecSaving(false);
    }
  }

  async function handleRemoveRecording(matchId: string) {
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_recording',
          matchId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'No se pudo eliminar la grabación.');
      }
      updateLocalStatus(status, data.recordings);
      setFeedbackMsg('Grabación desvinculada correctamente.');
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Error al eliminar la grabación.');
    }
  }

  if (!canManage) {
    return (
      <div className="bg-surface-container border border-white/10 p-6 text-sm text-tertiary">
        No tienes permisos para gestionar el streaming del club.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-5 shadow-[4px_4px_0px_0px_#0e0e0e] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 flex items-center justify-center border shrink-0 ${
              status.active
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-surface-container-high text-primary border-white/10'
            }`}
          >
            <Radio className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display-xl text-2xl sm:text-3xl uppercase tracking-wide text-on-surface leading-none">
                Streaming y Vídeos
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  status.active
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                    : 'bg-surface-container-low text-tertiary border-white/10'
                }`}
              >
                {status.active ? 'En directo' : 'Sin emisión activa'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => openRecordingModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>Añadir grabación</span>
          </button>

          <button
            type="button"
            onClick={() => openLiveForMatch()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
              status.active
                ? 'bg-red-700 hover:bg-red-600 border-red-400/50 text-white'
                : 'bg-primary-container hover:bg-cta-hover border-primary-container text-white'
            }`}
          >
            {status.active ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Finalizar directo</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Publicar directo</span>
              </>
            )}
          </button>
        </div>
      </header>

      {feedbackMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-emerald-950/40 border border-emerald-500/40 px-4 py-2.5 text-xs text-emerald-200"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedbackMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-300 hover:text-white text-[11px] uppercase font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Emisión activa */}
      {status.active && status.url && (
        <section className="bg-emerald-950/25 border border-emerald-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Emitiendo en portada y calendario</span>
            </div>
            <p className="text-sm font-bold text-on-surface truncate">
              {status.matchTitle || 'Retransmisión General'}
            </p>
            <p className="text-xs text-tertiary font-mono truncate">{status.url}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold uppercase tracking-wider text-on-surface"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>YouTube</span>
            </a>
            <button
              type="button"
              onClick={() => openLiveForMatch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Cortar directo</span>
            </button>
          </div>
        </section>
      )}

      {/* KPIs compactos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container border border-white/10 p-3.5">
          <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold block">
            Partidos hoy
          </span>
          <span className="font-headline text-2xl font-bold text-on-surface">
            {todayMatches.length}
          </span>
        </div>
        <div className="bg-surface-container border border-white/10 p-3.5">
          <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold block">
            Próximos
          </span>
          <span className="font-headline text-2xl font-bold text-on-surface">
            {upcomingMatches.length}
          </span>
        </div>
        <div className="bg-surface-container border border-white/10 p-3.5">
          <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold block">
            Grabaciones
          </span>
          <span className="font-headline text-2xl font-bold text-primary">
            {recordingEntries.length}
          </span>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('matches')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
            activeTab === 'matches'
              ? 'bg-primary-container text-white border-primary-container'
              : 'bg-surface-container text-tertiary border-white/10 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Jornada y Directos ({todayMatches.length + upcomingMatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recordings')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
            activeTab === 'recordings'
              ? 'bg-primary-container text-white border-primary-container'
              : 'bg-surface-container text-tertiary border-white/10 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Grabaciones ({recordingEntries.length})</span>
        </button>
      </div>

      {/* Contenido de pestaña */}
      {activeTab === 'matches' ? (
        <div className="space-y-4">
          {todayMatches.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
                Partidos de Hoy
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todayMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-surface-container border border-white/10 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {m.categoryName} · {m.timeStr || 'Horario por definir'}
                      </span>
                      <p className="text-sm font-bold text-on-surface truncate">
                        {m.homeTeam} vs {m.awayTeam}
                      </p>
                      <p className="text-xs text-tertiary truncate">{m.venue || 'Sede por confirmar'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={status.active}
                      onClick={() => openLiveForMatch(m.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-primary-container hover:bg-cta-hover disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Emitir</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-tertiary">
              Próximos Partidos Programados
            </h2>
            {upcomingMatches.length === 0 ? (
              <div className="bg-surface-container border border-white/10 p-6 text-center text-xs text-tertiary">
                No hay próximos partidos programados en calendario.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-surface-container border border-white/10 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider block ${
                          getTeamColorTheme(m.categoryName).colorKey
                            ? getTeamColorTheme(m.categoryName).textClass
                            : 'text-tertiary'
                        }`}
                      >
                        {formatDisplayDate(m.dateStr)} {m.timeStr ? `· ${m.timeStr}` : ''} · {m.categoryName}
                      </span>
                      <p className="text-sm font-bold text-on-surface truncate">
                        {m.homeTeam} vs {m.awayTeam}
                      </p>
                      <p className="text-xs text-tertiary truncate">{m.venue || 'Sede por confirmar'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={status.active}
                      onClick={() => openLiveForMatch(m.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 disabled:opacity-40 text-on-surface text-xs font-bold uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Radio className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Emitir</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="space-y-3">
          {recordingEntries.length === 0 ? (
            <div className="bg-surface-container border border-white/10 p-8 text-center space-y-3">
              <p className="text-xs text-tertiary">
                Todavía no hay grabaciones en diferido registradas.
              </p>
              <button
                type="button"
                onClick={() => openRecordingModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Añadir grabación</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recordingEntries.map(({ matchId, url, match }) => (
                <div
                  key={matchId}
                  className="bg-surface-container border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        match && getTeamColorTheme(match.categoryName).colorKey
                          ? getTeamColorTheme(match.categoryName).textClass
                          : 'text-primary'
                      }`}
                    >
                      {match
                        ? `${formatDisplayDate(match.dateStr)} · ${match.categoryName}`
                        : `Partido ${matchId}`}
                    </span>
                    <p className="text-sm font-bold text-on-surface truncate">
                      {match ? `${match.homeTeam} vs ${match.awayTeam}` : matchId}
                    </p>
                    <p className="text-xs text-tertiary font-mono truncate">{url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ver</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => openRecordingModal(matchId, url)}
                      className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-bold text-on-surface cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecording(matchId)}
                      aria-label={`Eliminar grabación de ${matchId}`}
                      className="p-1.5 bg-error-container/30 hover:bg-error-container/60 border border-error/30 text-error cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <StreamingModal
        isOpen={liveModalOpen}
        onClose={() => {
          setLiveModalOpen(false);
          setDefaultMatchId(null);
        }}
        isLive={status.active}
        currentUrl={status.url}
        matchId={status.matchId}
        matchTitle={status.matchTitle}
        defaultMatchId={defaultMatchId}
        onSuccess={updateLocalStatus}
      />

      <IntranetModal
        isOpen={recModalOpen}
        onClose={() => setRecModalOpen(false)}
        title="Vincular Grabación de Partido"
        subtitle="Asocia un vídeo de YouTube para habilitar el botón «Ver partido» en diferido."
        size="md"
      >
        <form onSubmit={handleSaveRecording} className="space-y-4">
          {recError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-2.5 bg-red-950/80 border border-red-500/50 text-red-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{recError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="rec-match-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
            >
              Partido
            </label>
            <select
              id="rec-match-select"
              value={recMatchId}
              onChange={(e) => setRecMatchId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-container-highest border border-white/15 text-on-surface focus:border-primary focus:outline-none"
            >
              {groupByCategoryFamily(selectableForRecording, (m) => m.categoryName).map(
                ({ family, items: familyMatches }) => (
                  <optgroup key={family.code} label={family.label}>
                    {familyMatches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatDisplayDate(m.dateStr)} · {m.categoryName} ({m.homeTeam} vs {m.awayTeam})
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="rec-youtube-url"
              className="block text-[11px] font-bold uppercase tracking-wider text-on-surface mb-1"
            >
              URL de YouTube
            </label>
            <input
              id="rec-youtube-url"
              type="url"
              required
              value={recUrl}
              onChange={(e) => setRecUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 text-xs bg-surface-container-highest border border-white/15 text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setRecModalOpen(false)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-tertiary hover:text-white border border-white/15 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={recSaving}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary-container hover:bg-cta-hover text-white cursor-pointer disabled:opacity-50"
            >
              {recSaving ? 'Guardando...' : 'Guardar grabación'}
            </button>
          </div>
        </form>
      </IntranetModal>
    </div>
  );
}
