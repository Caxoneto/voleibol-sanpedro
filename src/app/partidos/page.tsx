'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  INITIAL_CATEGORIES,
  INITIAL_TEAMS,
  INITIAL_MATCHES,
  INITIAL_PLAYERS,
  CLUB_INFO,
} from '@/lib/data-store';
import { FavbMatch } from '@/lib/favb-scraper';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';

function PartidosContent() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get('categoria') || searchParams.get('cat') || 'cat-senior-fem';
  const initialMatchParam = searchParams.get('match') || searchParams.get('partido');

  const [matches, setMatches] = useState<FavbMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');

  // IDs de partidos con refresco individual en curso
  const [refreshingMatchIds, setRefreshingMatchIds] = useState<Set<string>>(new Set());
  const [refreshFeedback, setRefreshFeedback] = useState<{ matchId: string; message: string } | null>(null);

  // Estado del acordeón: solo una categoría expandida a la vez. Al abrir una, se contraen las demás.
  const [expandedCatId, setExpandedCatId] = useState<string | null>(initialCategoryParam);

  // MVP simbólico del último partido
  const mvpPlayer = INITIAL_PLAYERS[1]; // Mateo Fernández
  const featuredMatch = INITIAL_MATCHES.find((m) => m.isFeatured) || INITIAL_MATCHES[0];

  // Sincronización al montar el componente
  useEffect(() => {
    fetchFavbMatches(false);
  }, []);

  // Polling automático cada 45 segundos para partidos EN VIVO o programados para HOY
  useEffect(() => {
    const todayStr = formatMadridDateString(new Date());
    const targetMatches = matches.filter(
      (m) => m.status === 'LIVE' || (m.status === 'SCHEDULED' && m.dateStr === todayStr)
    );
    if (targetMatches.length === 0) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        targetMatches.forEach((m) => {
          handleRefreshSingleMatch(m.id, false, true);
        });
      }
    }, 45000);

    return () => clearInterval(timer);
  }, [matches]);

  // Control de scroll y expansión si viene por URL
  useEffect(() => {
    if (initialCategoryParam) {
      setExpandedCatId(initialCategoryParam);
    }
    if (initialMatchParam) {
      setTimeout(() => {
        const el = document.getElementById(`match-${initialMatchParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [initialCategoryParam, initialMatchParam]);

  const fetchFavbMatches = async (force: boolean) => {
    if (force) setSyncing(true);
    try {
      const res = await fetch(`/api/favb/sync?force=${force}`);
      const data = await res.json();
      if (data.success && data.matches) {
        setMatches(data.matches);
        setLastSyncTime(
          new Date(data.lastSync).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      }
    } catch (err) {
      console.error('Error al sincronizar con favoley.net', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Actualizar un partido individual consultando favoley.net en tiempo real
  const handleRefreshSingleMatch = async (matchId: string, simulate = false, silent = false) => {
    if (!silent) {
      setRefreshingMatchIds((prev) => new Set(prev).add(matchId));
    }
    try {
      const res = await fetch(`/api/favb/match/${matchId}?force=true${simulate ? '&simulate=true' : ''}`);
      const data = await res.json();
      if (data.success && data.match) {
        setMatches((prev) =>
          prev.map((m) => (m.id === data.match.id || m.favbId === data.match.favbId ? data.match : m))
        );
        if (!silent) {
          const statusMsg =
            data.match.status === 'LIVE'
              ? '🔴 ¡EN DIRECTO! Marcador actualizado'
              : data.match.status === 'FINISHED'
              ? '✅ Partido finalizado. Acta cerrada.'
              : 'Marcador al día con favoley.net';
          setRefreshFeedback({ matchId, message: statusMsg });
          setTimeout(() => setRefreshFeedback(null), 3500);
        }
      }
    } catch (err) {
      console.error(`Error al actualizar marcador del partido ${matchId}`, err);
    } finally {
      if (!silent) {
        setRefreshingMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      }
    }
  };

  // Alternar acordeón: si está abierta se contrae, si se pulsa otra se cierran las demás y se abre esa
  const handleToggleCategory = (catId: string) => {
    setExpandedCatId((current) => (current === catId ? null : catId));
  };

  // Descarga de archivo .ics para el móvil
  const handleDownloadIcs = (m: FavbMatch) => {
    const matchObj = INITIAL_MATCHES.find((im) => im.id === m.id);
    const dateIso = matchObj ? matchObj.matchDate : new Date().toISOString();
    const icsString = generateIcsContent(
      `${m.homeTeam} vs ${m.awayTeam}`,
      m.venue,
      dateIso,
      m.id
    );
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `partido-san-pedro-j${m.round}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Enlace directo de Google Calendar
  const getGoogleCalendarLink = (m: FavbMatch) => {
    const matchObj = INITIAL_MATCHES.find((im) => im.id === m.id);
    const dateIso = matchObj ? matchObj.matchDate : new Date().toISOString();
    return generateGoogleCalendarUrl(
      `Voleibol: ${m.homeTeam} vs ${m.awayTeam}`,
      m.venue,
      dateIso
    );
  };

  // Agrupar los partidos oficiales por las 12 categorías (incluyendo en directo, programados y finalizados)
  const categoriesData = useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => {
      const catTeams = INITIAL_TEAMS.filter((t) => t.categoryId === cat.id);

      // Partidos de esta categoría
      const catMatches = matches.filter((m) => {
        if (m.categoryId && m.categoryId === cat.id) return true;
        return (
          m.categoryName.toLowerCase().includes(cat.name.toLowerCase()) ||
          cat.name.toLowerCase().includes(m.categoryName.toLowerCase())
        );
      });

      const live = catMatches
        .filter((m) => m.status === 'LIVE')
        .sort((a, b) => a.round - b.round);

      const scheduled = catMatches
        .filter((m) => m.status === 'SCHEDULED')
        .sort((a, b) => a.round - b.round);

      const finished = catMatches
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => b.round - a.round);

      const nextMatch = live[0] || scheduled[0];

      return {
        category: cat,
        team: catTeams[0],
        totalCount: catMatches.length,
        live,
        scheduled,
        finished,
        nextMatch,
      };
    });
  }, [matches]);

  // Todos los partidos actualmente en directo
  const allLiveMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'LIVE');
  }, [matches]);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Hero Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-10 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                ACTAS OFICIALES FAVB
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                TEMPORADA 2026 / 2027
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              PARTIDOS Y RESULTADOS
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Partidos federados y marcadores oficiales de la Federación Andaluza de Voleibol (favoley.net). Selecciona una categoría para desplegar su calendario y actas oficiales.
            </p>
          </div>

          {/* Botones de acción FAVB */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => fetchFavbMatches(true)}
              disabled={syncing}
              className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all border border-white/10 flex items-center gap-2 shadow"
              title="Forzar actualización en tiempo real desde favoley.net"
            >
              <span
                className={`material-symbols-outlined text-primary text-[18px] ${
                  syncing ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span>{syncing ? 'Sincronizando...' : 'Actualizar Resultados'}</span>
            </button>

            <a
              href="https://favoley.net/publico/seccion.php?seccion=competiciones"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow"
            >
              Ver en favoley.net
            </a>
          </div>
        </div>
      </section>

      {/* Notificación flotante de feedback al actualizar marcador */}
      {refreshFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161616] border-2 border-primary-container text-white px-4 py-3 shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-primary text-[22px]">check_circle</span>
          <span className="text-xs font-bold uppercase tracking-wider">{refreshFeedback.message}</span>
        </div>
      )}

      {/* Selector Rápido Horizontal de Categorías (Píldoras) */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary shrink-0 mr-1 hidden sm:inline">
              Categoría:
            </span>
            {categoriesData.map(({ category }) => {
              const isSelected = expandedCatId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleToggleCategory(category.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-primary-container text-white shadow-[2px_2px_0px_0px_#0e0e0e] -translate-y-0.5'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-10">
        {/* Banner Informativo y Leyenda de Iconos */}
        <div className="p-3 bg-surface-container-low border border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-tertiary gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Fuente oficial: <strong>Federación Andaluza de Voleibol (favoley.net)</strong></span>
            <span className="font-mono text-[11px] text-tertiary/70 hidden sm:inline">· Actualizado: {lastSyncTime}</span>
          </div>

          {/* Leyenda de Iconos Solicitada: Casa y Avión */}
          <div className="flex items-center gap-4 text-xs font-semibold text-white">
            <span className="flex items-center gap-1.5" title="Partido jugado en el Pabellón Polideportivo Sergio Scariolo">
              <span className="w-6 h-6 flex items-center justify-center bg-primary-container/20 text-primary border border-primary-container/30">
                <span className="material-symbols-outlined text-[15px]">home</span>
              </span>
              <span>En Casa</span>
            </span>
            <span className="flex items-center gap-1.5" title="Partido jugado fuera de casa (a domicilio)">
              <span className="w-6 h-6 flex items-center justify-center bg-white/5 text-tertiary border border-white/10">
                <span className="material-symbols-outlined text-[15px]">flight</span>
              </span>
              <span>Fuera</span>
            </span>
          </div>
        </div>

        {/* MÓDULO DESTACADO: PARTIDOS EN DIRECTO AHORA (Aparece si hay partidos en juego) */}
        {allLiveMatches.length > 0 && (
          <section className="bg-red-950/20 border-2 border-red-500/60 p-5 sm:p-7 shadow-2xl relative animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-red-500/30">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h2 className="font-display-xl text-xl sm:text-2xl uppercase text-white font-bold tracking-wide">
                  PARTIDOS EN DIRECTO AHORA ({allLiveMatches.length})
                </h2>
              </div>
              <span className="text-xs text-red-300 font-mono">
                Sincronización en vivo cada 45s con favoley.net
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allLiveMatches.map((m) => (
                <div
                  key={m.id}
                  className="bg-surface-container-high/90 border border-red-500/50 p-4 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">J{m.round}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          EN JUEGO
                        </span>
                      </div>
                      <span className="text-[11px] text-tertiary">{m.categoryName}</span>
                    </div>

                    <div className="py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                          <Image
                            src={getTeamLogo(m.homeTeam)}
                            alt={m.homeTeam}
                            width={22}
                            height={22}
                            className="object-contain max-h-full max-w-full"
                          />
                        </div>
                        <p className={`font-headline-sm text-sm uppercase font-bold truncate ${m.isClubHome ? 'text-primary' : 'text-white'}`}>
                          {m.homeTeam}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                          <Image
                            src={getTeamLogo(m.awayTeam)}
                            alt={m.awayTeam}
                            width={22}
                            height={22}
                            className="object-contain max-h-full max-w-full"
                          />
                        </div>
                        <p className={`font-headline-sm text-sm uppercase font-bold truncate ${!m.isClubHome ? 'text-primary' : 'text-white'}`}>
                          {m.awayTeam}
                        </p>
                      </div>
                    </div>

                    {/* Marcador de sets en vivo */}
                    <div className="my-2 p-2.5 bg-surface-container-lowest border border-red-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-display-xl text-2xl text-white font-bold leading-none">
                          {m.homeScore ?? 0} : {m.awayScore ?? 0}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-red-400">Sets</span>
                      </div>
                      {m.setScores && m.setScores.length > 0 && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          {m.setScores.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white font-bold">
                              {s.home}-{s.away}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tanteo en tiempo real del set en juego */}
                    {m.currentSetScore && (
                      <div className="mb-2 px-2.5 py-1.5 bg-red-950/70 border border-red-500/40 flex items-center justify-between text-xs">
                        <span className="font-bold text-red-300 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                          {m.currentSetScore.set} (Puntos):
                        </span>
                        <span className="font-mono font-bold text-white tracking-widest text-sm">
                          {m.currentSetScore.home} - {m.currentSetScore.away}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-tertiary truncate">📍 {m.venue}</span>
                    <button
                      onClick={() => handleRefreshSingleMatch(m.id)}
                      disabled={refreshingMatchIds.has(m.id)}
                      className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-500/50 transition-all shrink-0 shadow"
                      title="Actualizar marcador en directo desde favoley.net"
                    >
                      <span className={`material-symbols-outlined text-[15px] text-red-400 ${refreshingMatchIds.has(m.id) ? 'animate-spin' : ''}`}>
                        sync
                      </span>
                      <span>{refreshingMatchIds.has(m.id) ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Partido Estelar Destacado */}
        {(() => {
          const liveFeatured = matches.find((m) => m.id === featuredMatch.id);
          const featuredHomeTeam = liveFeatured ? liveFeatured.homeTeam : featuredMatch.homeTeamName;
          const featuredAwayTeam = liveFeatured ? liveFeatured.awayTeam : featuredMatch.awayTeamName;
          const featuredStatus = liveFeatured ? liveFeatured.status : featuredMatch.status;
          const isFeaturedLive = featuredStatus === 'LIVE';
          const isFeaturedFinished = featuredStatus === 'FINISHED';
          const featuredHomeScore = liveFeatured ? liveFeatured.homeScore : undefined;
          const featuredAwayScore = liveFeatured ? liveFeatured.awayScore : undefined;
          const featuredSetScores = liveFeatured ? liveFeatured.setScores : featuredMatch.setScores;

          return (
            <section className={`border p-6 sm:p-8 shadow-2xl relative transition-all ${
              isFeaturedLive
                ? 'bg-red-950/20 border-red-500/60'
                : 'bg-surface-container-low border-primary-container/40'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-primary-container text-white text-xs uppercase font-bold tracking-widest">
                    PARTIDO ESTELAR DE LA JORNADA {featuredMatch.round}
                  </span>
                  <span className="text-xs text-tertiary uppercase font-semibold">
                    1ª División Andaluza
                  </span>

                  {/* Estado en vivo con punto rojo parpadeante o finalizado */}
                  {isFeaturedLive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-950 text-red-400 border border-red-500/60 text-xs font-bold uppercase tracking-wider animate-pulse">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      EN DIRECTO
                    </span>
                  )}

                  {isFeaturedFinished && (
                    <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                      FINALIZADO
                    </span>
                  )}
                </div>

                {/* Icono de Casa en Partido Destacado */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/20 text-primary border border-primary-container/40 text-xs font-bold uppercase tracking-wider"
                  title="En Casa (Pabellón Polideportivo Sergio Scariolo)"
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  <span>Pabellón Sergio Scariolo</span>
                </span>
              </div>

              {/* Versus Central */}
              <div className="py-6 grid grid-cols-1 md:grid-cols-7 items-center gap-6 text-center">
                {/* Equipo Local */}
                <div className="md:col-span-3 flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container-high border-2 border-primary-container flex items-center justify-center p-2 mb-2 shadow-lg">
                    <Image
                      src={getTeamLogo(featuredHomeTeam)}
                      alt={featuredHomeTeam}
                      width={64}
                      height={64}
                      className="object-contain max-h-full max-w-full"
                    />
                  </div>
                  <h2 className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                    {featuredHomeTeam}
                  </h2>
                  <span className="text-xs uppercase font-bold text-primary mt-0.5">Local</span>
                </div>

                {/* VS o Marcador en Directo */}
                <div className="md:col-span-1 flex flex-col items-center justify-center">
                  {isFeaturedLive || isFeaturedFinished ? (
                    <div className="flex flex-col items-center">
                      <div className={`px-4 py-2 border mb-1.5 shadow-lg ${
                        isFeaturedLive
                          ? 'bg-red-950/90 border-red-500/60 text-white'
                          : 'bg-surface-container-lowest border-white/10 text-white'
                      }`}>
                        <span className="font-display-xl text-3xl sm:text-4xl leading-none font-bold">
                          {featuredHomeScore ?? 0} : {featuredAwayScore ?? 0}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${
                        isFeaturedLive ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {isFeaturedLive ? 'SETS EN JUEGO' : 'RESULTADO FINAL'}
                      </span>

                      {/* Parciales si existen */}
                      {featuredSetScores && featuredSetScores.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 justify-center max-w-[140px]">
                          {featuredSetScores.map((s, idx) => (
                            <span key={idx} className="text-[10px] font-mono text-tertiary">
                              ({s.home}-{s.away})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Botón de actualizar: SOLO si está en juego (si finalizó no se muestra) */}
                      {isFeaturedLive && (
                        <button
                          onClick={() => handleRefreshSingleMatch(featuredMatch.id)}
                          disabled={refreshingMatchIds.has(featuredMatch.id)}
                          className="mt-2.5 px-3 py-1 bg-red-900/40 hover:bg-red-800/60 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-500/40 transition-all shadow"
                          title="Actualizar marcador en tiempo real desde favoley.net"
                        >
                          <span className={`material-symbols-outlined text-[15px] text-red-400 ${refreshingMatchIds.has(featuredMatch.id) ? 'animate-spin' : ''}`}>
                            sync
                          </span>
                          <span>{refreshingMatchIds.has(featuredMatch.id) ? '...' : 'Actualizar'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="px-3 py-1.5 bg-surface-container-lowest border border-white/10 mb-1.5">
                        <span className="font-display-xl text-2xl sm:text-3xl text-primary leading-none">
                          VS
                        </span>
                      </div>
                      <span className="text-xs text-tertiary uppercase font-bold">
                        {formatMadridTime(featuredMatch.matchDate)}h
                      </span>
                      <span className="text-[11px] text-tertiary">
                        {formatMadridDate(featuredMatch.matchDate, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>

                      {/* Botón de comprobar marcador en partido programado */}
                      <button
                        onClick={() => handleRefreshSingleMatch(featuredMatch.id)}
                        disabled={refreshingMatchIds.has(featuredMatch.id)}
                        className="mt-2.5 px-2.5 py-1 bg-surface-container-high hover:bg-surface-bright text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10 transition-all shadow"
                        title="Comprobar en favoley.net si ha comenzado"
                      >
                        <span className={`material-symbols-outlined text-[15px] text-primary ${refreshingMatchIds.has(featuredMatch.id) ? 'animate-spin' : ''}`}>
                          sync
                        </span>
                        <span>{refreshingMatchIds.has(featuredMatch.id) ? '...' : 'Actualizar'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Equipo Visitante */}
                <div className="md:col-span-3 flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container-high border border-white/10 flex items-center justify-center p-2 mb-2 shadow-lg">
                    <Image
                      src={getTeamLogo(featuredAwayTeam)}
                      alt={featuredAwayTeam}
                      width={64}
                      height={64}
                      className="object-contain max-h-full max-w-full"
                    />
                  </div>
                  <h2 className="font-display-xl text-xl sm:text-2xl uppercase text-on-surface">
                    {featuredAwayTeam}
                  </h2>
                  <span className="text-xs uppercase font-bold text-tertiary mt-0.5">Visitante</span>
                </div>
              </div>
            </section>
          );
        })()}


        {/* NÚCLEO: LISTADO CLASIFICADO POR CATEGORÍAS (ACORDEÓN ESTRICTO) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Competiciones FAVB 2026 / 2027
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                Partidos Oficiales por Categoría
              </h2>
            </div>
            <p className="text-xs text-tertiary">
              Haz clic en cualquier categoría para desplegar sus partidos (las demás se contraerán).
            </p>
          </div>

          {/* Acordeón de las 12 categorías */}
          <div className="space-y-3">
            {categoriesData.map(({ category, team, totalCount, live, scheduled, finished, nextMatch }) => {
              const isExpanded = expandedCatId === category.id;

              return (
                <div
                  key={category.id}
                  id={category.id}
                  className={`border transition-all duration-300 ${
                    isExpanded
                      ? 'bg-surface-container-low border-primary-container/80 shadow-xl'
                      : 'bg-surface-container-lowest/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Encabezado del Acordeón (Botón interactivo) */}
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(category.id)}
                    className="w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left transition-colors cursor-pointer group"
                  >
                    {/* Título de la Categoría y División */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 shrink-0 flex items-center justify-center font-display-xl text-base transition-colors ${
                          isExpanded
                            ? 'bg-primary-container text-white shadow-md'
                            : 'bg-surface-container-high text-tertiary group-hover:text-white'
                        }`}
                      >
                        {category.order}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display-xl text-lg sm:text-xl uppercase text-white group-hover:text-primary transition-colors truncate">
                            {category.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-surface-container-high text-tertiary text-[10px] font-bold uppercase tracking-wider border border-white/5">
                            {team?.division || 'FAVB'}
                          </span>
                        </div>
                        <p className="text-xs text-tertiary mt-0.5 truncate">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    {/* Resumen & Icono de Despliegue */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                      {/* Píldora de EN DIRECTO o Próximo partido */}
                      {live.length > 0 ? (
                        <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/60 px-3 py-1.5 text-xs text-red-300 font-bold uppercase tracking-wider animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          <span>EN JUEGO: J{live[0].round} ({live[0].homeScore ?? 0}-{live[0].awayScore ?? 0})</span>
                        </div>
                      ) : nextMatch ? (
                        <div className="flex items-center gap-2 bg-surface-container-highest/60 px-3 py-1.5 text-xs border border-white/5">
                          <span className="font-bold text-white">
                            J{nextMatch.round} · {nextMatch.dateStr}
                          </span>
                          <span
                            className="p-0.5 text-primary flex items-center justify-center"
                            title={nextMatch.isClubHome ? 'En casa (Sergio Scariolo)' : 'Fuera'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {nextMatch.isClubHome ? 'home' : 'flight'}
                            </span>
                          </span>
                        </div>
                      ) : null}

                      <span className="text-xs font-mono text-tertiary bg-white/5 px-2 py-1">
                        {totalCount} partidos
                      </span>

                      {/* Flecha animada de acordeón */}
                      <span
                        className={`material-symbols-outlined text-2xl transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-primary' : 'text-tertiary group-hover:text-white'
                        }`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Panel Desplegable con todos los partidos de la categoría */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-white/5 space-y-8 animate-fadeIn">
                      {/* Bloque 0: Partidos EN JUEGO (Si existen en esta categoría) */}
                      {live.length > 0 && (
                        <div className="p-4 sm:p-5 bg-red-950/20 border-2 border-red-500/50 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-red-500/30">
                            <h4 className="font-headline-sm text-sm uppercase text-white font-bold flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                              </span>
                              <span>Partidos en Juego ({live.length})</span>
                            </h4>
                            <span className="text-[11px] text-red-300 font-mono">
                              Marcador en vivo desde favoley.net
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {live.map((m) => (
                              <div
                                key={m.id}
                                id={`match-${m.id}`}
                                className="bg-surface-container-high/90 border border-red-500/50 p-4 flex flex-col justify-between shadow-lg"
                              >
                                <div>
                                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-primary">JORNADA {m.round}</span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        EN DIRECTO
                                      </span>
                                    </div>
                                    <span
                                      className={`p-1 flex items-center justify-center border ${
                                        m.isClubHome
                                          ? 'text-primary bg-primary-container/20 border-primary-container/40'
                                          : 'text-tertiary bg-white/5 border-white/10'
                                      }`}
                                      title={m.isClubHome ? 'En casa (Sergio Scariolo)' : 'Fuera / A domicilio'}
                                    >
                                      <span className="material-symbols-outlined text-[17px]">
                                        {m.isClubHome ? 'home' : 'flight'}
                                      </span>
                                    </span>
                                  </div>

                                  <div className="py-2.5 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                        <Image
                                          src={getTeamLogo(m.homeTeam)}
                                          alt={m.homeTeam}
                                          width={18}
                                          height={18}
                                          className="object-contain max-h-full max-w-full"
                                        />
                                      </div>
                                      <p className={`font-headline-sm text-sm uppercase font-bold truncate ${m.isClubHome ? 'text-primary' : 'text-white'}`}>
                                        {m.homeTeam}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                        <Image
                                          src={getTeamLogo(m.awayTeam)}
                                          alt={m.awayTeam}
                                          width={18}
                                          height={18}
                                          className="object-contain max-h-full max-w-full"
                                        />
                                      </div>
                                      <p className={`font-headline-sm text-sm uppercase font-bold truncate ${!m.isClubHome ? 'text-primary' : 'text-white'}`}>
                                        {m.awayTeam}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Marcador de Sets en Directo */}
                                  <div className="my-2 p-2.5 bg-surface-container-lowest border border-red-500/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-display-xl text-2xl text-white font-bold leading-none">
                                        {m.homeScore ?? 0} : {m.awayScore ?? 0}
                                      </span>
                                      <span className="text-[10px] uppercase font-bold text-red-400">Sets</span>
                                    </div>
                                    {m.setScores && m.setScores.length > 0 && (
                                      <div className="flex items-center gap-1 font-mono text-[11px]">
                                        {m.setScores.map((s, idx) => (
                                          <span key={idx} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white font-bold">
                                            {s.home}-{s.away}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Tanteo en tiempo real del set en juego */}
                                  {m.currentSetScore && (
                                    <div className="mb-2 px-2 py-1 bg-red-950/70 border border-red-500/30 flex items-center justify-between text-xs">
                                      <span className="font-bold text-red-300 uppercase tracking-wide flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                                        {m.currentSetScore.set}:
                                      </span>
                                      <span className="font-mono font-bold text-white tracking-widest text-sm">
                                        {m.currentSetScore.home} - {m.currentSetScore.away}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-tertiary truncate">📍 {m.venue}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRefreshSingleMatch(m.id);
                                    }}
                                    disabled={refreshingMatchIds.has(m.id)}
                                    className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-500/50 transition-all shrink-0 shadow"
                                    title="Actualizar tanteo desde favoley.net"
                                  >
                                    <span className={`material-symbols-outlined text-[15px] text-red-400 ${refreshingMatchIds.has(m.id) ? 'animate-spin' : ''}`}>
                                      sync
                                    </span>
                                    <span>{refreshingMatchIds.has(m.id) ? 'Actualizando...' : 'Actualizar'}</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bloque 1: Próximos Partidos */}
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                          <h4 className="font-headline-sm text-sm uppercase text-white font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary-container" />
                            Próximos Partidos ({scheduled.length})
                          </h4>
                          <span className="text-[11px] text-tertiary">
                            Horarios oficiales FAVB
                          </span>
                        </div>

                        {scheduled.length === 0 ? (
                          <div className="p-6 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                            No hay partidos programados pendientes para esta categoría.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scheduled.map((m) => (
                              <div
                                key={m.id}
                                id={`match-${m.id}`}
                                className="bg-surface-container-high/60 border border-white/5 hover:border-primary-container/60 p-4 flex flex-col justify-between transition-all relative shadow-md"
                              >
                                <div>
                                  {/* Cabecera de tarjeta: Jornada y Condición (Casa / Avión) */}
                                  <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs">
                                    <span className="font-mono font-bold text-primary">
                                      JORNADA {m.round}
                                    </span>

                                    {/* Icono de Casa o Avión SIN texto largo */}
                                    <span
                                      className={`p-1 flex items-center justify-center border ${
                                        m.isClubHome
                                          ? 'text-primary bg-primary-container/20 border-primary-container/40'
                                          : 'text-tertiary bg-white/5 border-white/10'
                                      }`}
                                      title={
                                        m.isClubHome
                                          ? 'Partido en casa (Pabellón Sergio Scariolo)'
                                          : 'Partido fuera / a domicilio'
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[17px]">
                                        {m.isClubHome ? 'home' : 'flight'}
                                      </span>
                                    </span>
                                  </div>

                                  {/* Enfrentamiento con escudos */}
                                  <div className="py-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                        <Image
                                          src={getTeamLogo(m.homeTeam)}
                                          alt={m.homeTeam}
                                          width={18}
                                          height={18}
                                          className="object-contain max-h-full max-w-full"
                                        />
                                      </div>
                                      <p
                                        className={`font-headline-sm text-sm uppercase font-bold truncate ${
                                          m.isClubHome ? 'text-primary' : 'text-white'
                                        }`}
                                      >
                                        {m.homeTeam}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                        <Image
                                          src={getTeamLogo(m.awayTeam)}
                                          alt={m.awayTeam}
                                          width={18}
                                          height={18}
                                          className="object-contain max-h-full max-w-full"
                                        />
                                      </div>
                                      <p
                                        className={`font-headline-sm text-sm uppercase font-bold truncate ${
                                          !m.isClubHome ? 'text-primary' : 'text-white'
                                        }`}
                                      >
                                        {m.awayTeam}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Fecha, Sede y Acciones con BOTÓN DE ACTUALIZAR */}
                                <div className="pt-3 border-t border-white/5 space-y-3 text-xs">
                                  <div className="flex items-center justify-between text-tertiary">
                                    <span>{m.dateStr}</span>
                                    <span className="font-bold text-white font-mono">{m.timeStr}h</span>
                                  </div>

                                  <div className="flex items-start gap-1.5 text-[11px] text-tertiary">
                                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">
                                      pin_drop
                                    </span>
                                    <span className="line-clamp-2">{m.venue}</span>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                                    {/* BOTÓN DE ACTUALIZAR MARCADOR EN VIVO (favoley.net) */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRefreshSingleMatch(m.id);
                                      }}
                                      disabled={refreshingMatchIds.has(m.id)}
                                      className="px-2.5 py-1.5 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-primary-container/40"
                                      title="Comprobar en favoley.net si ha comenzado o actualizar marcador"
                                    >
                                      <span
                                        className={`material-symbols-outlined text-[15px] ${
                                          refreshingMatchIds.has(m.id) ? 'animate-spin' : ''
                                        }`}
                                      >
                                        sync
                                      </span>
                                      <span>{refreshingMatchIds.has(m.id) ? '...' : 'Actualizar'}</span>
                                    </button>

                                    <a
                                      href={getGoogleCalendarLink(m)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1.5 bg-surface-container-highest hover:bg-surface-bright text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-white/10"
                                      title="Añadir a Google Calendar"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-primary">event</span>
                                      <span>Google Cal</span>
                                    </a>

                                    <button
                                      onClick={() => handleDownloadIcs(m)}
                                      className="px-2.5 py-1.5 bg-surface-container-highest hover:bg-surface-bright text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border border-white/10"
                                      title="Añadir a la agenda de tu móvil (Apple Calendar, etc.)"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-primary">smartphone</span>
                                      <span>Móvil</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bloque 2: Partidos Finalizados y Actas Oficiales Set a Set (SIN BOTÓN DE ACTUALIZAR) */}
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                          <h4 className="font-headline-sm text-sm uppercase text-white font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400" />
                            Resultados Oficiales y Parciales Set a Set ({finished.length})
                          </h4>
                          <span className="text-[11px] text-tertiary">
                            Actas cerradas FAVB
                          </span>
                        </div>

                        {finished.length === 0 ? (
                          <div className="p-6 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                            Aún no se han disputado partidos con acta oficial cerrada en esta categoría.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {finished.map((m) => {
                              const score =
                                m.setScores && m.setScores.length > 0
                                  ? calculateMatchScore(m.setScores)
                                  : null;

                              return (
                                <div
                                  key={m.id}
                                  id={`match-${m.id}`}
                                  className="bg-surface-container-high/50 border border-white/10 p-5 hover:border-primary-container/40 transition-all shadow-md"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                      <span className="font-display-xl text-base text-primary">
                                        JORNADA {m.round}
                                      </span>
                                      <span className="text-xs text-tertiary uppercase font-semibold">
                                        {m.dateStr} • {m.timeStr}h
                                      </span>

                                      {/* Badge de Partido Finalizado */}
                                      <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                        FINALIZADO
                                      </span>

                                      {/* Icono de Casa o Avión en partido finalizado */}
                                      <span
                                        className={`p-1 flex items-center justify-center border ${
                                          m.isClubHome
                                            ? 'text-primary bg-primary-container/20 border-primary-container/40'
                                            : 'text-tertiary bg-white/5 border-white/10'
                                        }`}
                                        title={
                                          m.isClubHome
                                            ? 'Partido en casa (Pabellón Sergio Scariolo)'
                                            : 'Partido fuera / a domicilio'
                                        }
                                      >
                                        <span className="material-symbols-outlined text-[15px]">
                                          {m.isClubHome ? 'home' : 'flight'}
                                        </span>
                                      </span>
                                    </div>

                                    <span className="text-xs text-tertiary truncate max-w-md">
                                      📍 {m.venue}
                                    </span>
                                  </div>


                                  {/* Marcador Set a Set */}
                                  <div className="py-4 overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                      <thead>
                                        <tr className="border-b border-white/10 text-xs text-tertiary uppercase">
                                          <th className="py-2 pr-4 font-semibold">Equipo</th>
                                          <th className="py-2 px-3 text-center font-bold text-white bg-primary-container/20">
                                            SETS
                                          </th>
                                          {m.setScores &&
                                            m.setScores.map((_, sIdx) => (
                                              <th key={sIdx} className="py-2 px-3 text-center">
                                                Set {sIdx + 1}
                                              </th>
                                            ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-white/5">
                                          <td className="py-2.5 pr-4 font-headline-sm text-sm uppercase font-bold text-white">
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                                <Image
                                                  src={getTeamLogo(m.homeTeam)}
                                                  alt={m.homeTeam}
                                                  width={18}
                                                  height={18}
                                                  className="object-contain max-h-full max-w-full"
                                                />
                                              </div>
                                              <span className={m.isClubHome ? 'text-primary' : 'text-white'}>
                                                {m.homeTeam}
                                              </span>
                                              {m.isClubHome && (
                                                <span className="ml-1 text-[9px] text-primary uppercase font-bold tracking-wider">
                                                  (Club)
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-display-xl text-xl text-white bg-primary-container/20 font-bold">
                                            {score ? score.homeSetsWon : m.homeScore ?? '–'}
                                          </td>
                                          {m.setScores?.map((s, idx) => (
                                            <td
                                              key={idx}
                                              className={`py-2.5 px-3 text-center font-mono text-sm ${
                                                s.home > s.away
                                                  ? 'text-primary font-bold bg-primary-container/10'
                                                  : 'text-tertiary'
                                              }`}
                                            >
                                              {s.home}
                                            </td>
                                          ))}
                                        </tr>

                                        <tr>
                                          <td className="py-2.5 pr-4 font-headline-sm text-sm uppercase font-bold text-white">
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 bg-surface-container-low border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                                                <Image
                                                  src={getTeamLogo(m.awayTeam)}
                                                  alt={m.awayTeam}
                                                  width={18}
                                                  height={18}
                                                  className="object-contain max-h-full max-w-full"
                                                />
                                              </div>
                                              <span className={!m.isClubHome ? 'text-primary' : 'text-white'}>
                                                {m.awayTeam}
                                              </span>
                                              {!m.isClubHome && (
                                                <span className="ml-1 text-[9px] text-primary uppercase font-bold tracking-wider">
                                                  (Club)
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-display-xl text-xl text-white bg-primary-container/20 font-bold">
                                            {score ? score.awaySetsWon : m.awayScore ?? '–'}
                                          </td>
                                          {m.setScores?.map((s, idx) => (
                                            <td
                                              key={idx}
                                              className={`py-2.5 px-3 text-center font-mono text-sm ${
                                                s.away > s.home
                                                  ? 'text-primary font-bold bg-primary-container/10'
                                                  : 'text-tertiary'
                                              }`}
                                            >
                                              {s.away}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-tertiary">
                                    <span>Acta oficial federada</span>
                                    <a
                                      href={m.favbUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      <span>Ver acta completa en favoley.net</span>
                                      <span className="material-symbols-outlined text-[14px]">
                                        open_in_new
                                      </span>
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección MVP de la Afición */}
        {mvpPlayer && (
          <section className="bg-surface-container-high border border-primary-container/30 p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500 text-black text-[10px] uppercase font-bold tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">military_tech</span>
                  MVP DE LA AFICIÓN • JORNADA RECIENTE
                </div>
                <h3 className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
                  {mvpPlayer.firstName} {mvpPlayer.lastName}
                </h3>
                <p className="font-body-md text-xs sm:text-sm text-tertiary leading-relaxed">
                  Elegido por votación popular de la afición tras su destacada actuación en 1ª División Andaluza frente al CV Pizarra.
                </p>
                <div className="flex items-center gap-6 pt-2 text-xs">
                  <div>
                    <span className="text-tertiary uppercase text-[10px] block">Dorsal</span>
                    <span className="font-display-xl text-xl text-primary font-bold">
                      #{mvpPlayer.number}
                    </span>
                  </div>
                  <div>
                    <span className="text-tertiary uppercase text-[10px] block">Demarcación</span>
                    <span className="font-headline-sm text-sm text-white font-bold">
                      {mvpPlayer.position}
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <Link
                    href="/fan-zone"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white"
                  >
                    <span>Votar en la Fan-Zone para la próxima jornada</span>
                    <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
                  </Link>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-center">
                <div className="relative w-44 h-52 sm:w-52 sm:h-60 border-2 border-primary-container shadow-2xl overflow-hidden bg-[#18181b]">
                  <Image
                    src={mvpPlayer.photoUrl}
                    alt={mvpPlayer.firstName}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 text-center">
                    <span className="font-display-xl text-lg text-white uppercase leading-none">
                      #{mvpPlayer.number} {mvpPlayer.firstName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <SponsorBanner customText="APOYA AL C.D. VOLEIBOL SAN PEDRO EN TODAS SUS CATEGORÍAS" />
    </div>
  );
}

export default function PartidosPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-background flex items-center justify-center text-white text-sm">
          Cargando partidos oficiales FAVB...
        </div>
      }
    >
      <PartidosContent />
    </Suspense>
  );
}
