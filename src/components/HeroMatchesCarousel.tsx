'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMadridDate, formatMadridDateString, formatMadridTime } from '@/lib/date-utils';
import { getTeamLogo } from '@/lib/team-logos';

export interface HeroCarouselMatchItem {
  id: string;
  round: number;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  homeTeamName: string;
  awayTeamName: string;
  isClubHome: boolean;
  matchDate: string;
  dateStr: string;
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE' | 'CANCELLED';
  homeScore?: number;
  awayScore?: number;
  setScores?: { home: number; away: number }[];
  currentSetScore?: { set: string; home: number; away: number };
}

interface HeroMatchesCarouselProps {
  initialMatches: HeroCarouselMatchItem[];
  todayStr: string;
}

type FilterTab = 'finished' | 'today' | 'upcoming';

export default function HeroMatchesCarousel({
  initialMatches,
  todayStr,
}: HeroMatchesCarouselProps) {
  const [matches, setMatches] = useState<HeroCarouselMatchItem[]>(initialMatches);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Actualizar un partido individual desde favoley.net
  const refreshSingleMatch = async (matchId: string, silent = false) => {
    if (!silent) {
      setRefreshingIds((prev) => new Set(prev).add(matchId));
    }
    try {
      const res = await fetch(`/api/favb/match/${matchId}?force=true`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.match) {
        const updated = data.match;
        setMatches((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  status: updated.status,
                  homeScore: updated.homeScore ?? m.homeScore,
                  awayScore: updated.awayScore ?? m.awayScore,
                  setScores:
                    updated.setScores && updated.setScores.length > 0
                      ? updated.setScores
                      : m.setScores,
                  currentSetScore: updated.currentSetScore,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error(`Error actualizando partido ${matchId}:`, err);
    } finally {
      if (!silent) {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      }
    }
  };

  // Polling automático cada 45 segundos para partidos en vivo o programados de hoy
  useEffect(() => {
    const activeOrToday = matches.filter(
      (m) => m.status === 'LIVE' || (m.status === 'SCHEDULED' && m.dateStr === todayStr)
    );
    if (activeOrToday.length === 0) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        activeOrToday.forEach((m) => {
          refreshSingleMatch(m.id, true);
        });
      }
    }, 45000);

    return () => clearInterval(timer);
  }, [matches, todayStr]);

  // 1. Pestaña "Finalizados": partidos de hoy finalizados + completando con anteriores hasta 4
  const finishedMatches = useMemo(() => {
    const todayFinished = matches
      .filter((m) => m.status === 'FINISHED' && m.dateStr === todayStr)
      .sort((a, b) => {
        const tDiff = new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
        if (tDiff !== 0) return tDiff;
        return a.categoryOrder - b.categoryOrder;
      });

    const pastFinished = matches
      .filter((m) => m.status === 'FINISHED' && m.dateStr < todayStr)
      .sort((a, b) => {
        const tDiff = new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
        if (tDiff !== 0) return tDiff;
        return a.categoryOrder - b.categoryOrder;
      });

    const neededFromPast = Math.max(0, 4 - todayFinished.length);
    return [...todayFinished, ...pastFinished.slice(0, neededFromPast)];
  }, [matches, todayStr]);

  // 2. Pestaña "Hoy" (Predeterminada): partidos del día de hoy ordenados por hora y categoría
  const todayMatches = useMemo(() => {
    return matches
      .filter((m) => m.dateStr === todayStr)
      .sort((a, b) => {
        const timeA = new Date(a.matchDate).getTime();
        const timeB = new Date(b.matchDate).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.categoryOrder - b.categoryOrder;
      });
  }, [matches, todayStr]);

  // 3. Pestaña "Próximos": próximo partido programado por categoría (posteriores a hoy o pendientes)
  // Ordenados de izquierda a derecha por proximidad temporal y desempate por mayor categoría
  const upcomingMatches = useMemo(() => {
    const byCategory = new Map<string, HeroCarouselMatchItem>();

    const scheduledSorted = matches
      .filter((m) => m.status === 'SCHEDULED' && m.dateStr > todayStr)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    for (const m of scheduledSorted) {
      if (!byCategory.has(m.categoryId)) {
        byCategory.set(m.categoryId, m);
      }
    }

    // Si alguna categoría aún tiene partido pendiente hoy y no se incluyó, o para mostrar todos los próximos:
    const allScheduledByCat = matches
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    for (const m of allScheduledByCat) {
      if (!byCategory.has(m.categoryId)) {
        byCategory.set(m.categoryId, m);
      }
    }

    return Array.from(byCategory.values()).sort((a, b) => {
      const timeA = new Date(a.matchDate).getTime();
      const timeB = new Date(b.matchDate).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.categoryOrder - b.categoryOrder;
    });
  }, [matches, todayStr]);

  const currentList =
    activeTab === 'finished'
      ? finishedMatches
      : activeTab === 'today'
      ? todayMatches
      : upcomingMatches;

  const hasLiveToday = todayMatches.some((m) => m.status === 'LIVE');

  const getScoreDisplay = (m: HeroCarouselMatchItem) => {
    if (m.homeScore !== undefined && m.awayScore !== undefined) {
      return { home: m.homeScore, away: m.awayScore };
    }
    if (m.setScores && m.setScores.length > 0) {
      const home = m.setScores.filter((s) => s.home > s.away).length;
      const away = m.setScores.filter((s) => s.away > s.home).length;
      return { home, away };
    }
    return { home: 0, away: 0 };
  };

  return (
    <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10 w-full">
      {/* Cabecera con los 3 botones de filtro y enlace Ver todos */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón 1: Finalizados */}
          <button
            type="button"
            onClick={() => setActiveTab('finished')}
            className={`px-3 py-1.5 text-[11px] sm:text-xs font-label-md uppercase tracking-wider font-bold transition-all border ${
              activeTab === 'finished'
                ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                : 'bg-surface-container-high/80 text-tertiary hover:text-white border-white/10'
            }`}
          >
            Finalizados
          </button>

          {/* Botón 2: Hoy (Predeterminado) */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 text-[11px] sm:text-xs font-label-md uppercase tracking-wider font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                : 'bg-surface-container-high/80 text-tertiary hover:text-white border-white/10'
            }`}
          >
            {hasLiveToday && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-300"></span>
              </span>
            )}
            <span>Hoy</span>
            {todayMatches.length > 0 && (
              <span
                className={`px-1 py-0.2 text-[9px] font-mono ${
                  activeTab === 'today' ? 'bg-black/30 text-white' : 'bg-white/10 text-tertiary'
                }`}
              >
                {todayMatches.length}
              </span>
            )}
          </button>

          {/* Botón 3: Próximos */}
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 text-[11px] sm:text-xs font-label-md uppercase tracking-wider font-bold transition-all border ${
              activeTab === 'upcoming'
                ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                : 'bg-surface-container-high/80 text-tertiary hover:text-white border-white/10'
            }`}
          >
            Próximos
          </button>
        </div>

        <Link
          href="/partidos"
          className="text-[11px] sm:text-xs text-tertiary hover:text-white uppercase font-bold flex items-center gap-1 group transition-colors"
        >
          <span>Ver todos</span>
          <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Carrusel horizontal de tarjetas */}
      {currentList.length === 0 ? (
        <div className="bg-surface-container-low/80 border border-white/10 p-4 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-tertiary">
            No hay partidos registrados para hoy ({formatMadridDate(new Date())}).
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className="px-3 py-1 bg-primary-container text-white text-[11px] uppercase font-bold tracking-wider"
          >
            Ver Próximos Partidos
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          {currentList.map((match) => {
            const isLive = match.status === 'LIVE';
            const isFinished = match.status === 'FINISHED';
            const score = getScoreDisplay(match);
            const isRefreshing = refreshingIds.has(match.id);

            return (
              <Link
                key={`${activeTab}-${match.id}`}
                href={`/partidos?categoria=${match.categoryId}&match=${match.id}#match-${match.id}`}
                className={`group shrink-0 w-[235px] sm:w-[255px] bg-surface-container-low/95 hover:bg-surface-container-high border p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 shadow-md hover:-translate-y-0.5 ${
                  isLive
                    ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'border-white/10 hover:border-primary-container'
                }`}
                title={`Ver detalles: ${match.categoryName} en partidos`}
              >
                {/* Cabecera: Jornada, Categoría, Estado y Casa/Avión */}
                <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[9px] sm:text-[10px] font-bold shrink-0">
                      J{match.round}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white truncate">
                      {match.categoryName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-500/50 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        VIVO
                      </span>
                    )}
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 border ${
                        match.isClubHome
                          ? 'text-primary bg-primary-container/15 border-primary-container/30'
                          : 'text-tertiary bg-white/5 border-white/10'
                      }`}
                      title={match.isClubHome ? 'En casa (Pabellón Sergio Scariolo)' : 'Fuera / A domicilio'}
                    >
                      <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                        {match.isClubHome ? 'home' : 'flight'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Equipos con escudos y resultado */}
                <div className="py-2 space-y-1.5">
                  {/* Equipo Local */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 bg-surface-container-high border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                        <Image
                          src={getTeamLogo(match.homeTeamName)}
                          alt={match.homeTeamName}
                          width={14}
                          height={14}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                          match.isClubHome ? 'text-primary font-bold' : 'text-on-surface'
                        }`}
                      >
                        {match.homeTeamName}
                      </span>
                    </div>
                    {(isLive || isFinished) && (
                      <span
                        className={`font-display-xl text-sm font-bold leading-none ${
                          isFinished && score.home > score.away ? 'text-primary' : 'text-white'
                        }`}
                      >
                        {score.home}
                      </span>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 bg-surface-container-high border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                        <Image
                          src={getTeamLogo(match.awayTeamName)}
                          alt={match.awayTeamName}
                          width={14}
                          height={14}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                          !match.isClubHome ? 'text-primary font-bold' : 'text-on-surface'
                        }`}
                      >
                        {match.awayTeamName}
                      </span>
                    </div>
                    {(isLive || isFinished) && (
                      <span
                        className={`font-display-xl text-sm font-bold leading-none ${
                          isFinished && score.away > score.home ? 'text-primary' : 'text-white'
                        }`}
                      >
                        {score.away}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie de tarjeta según estado: LIVE, FINISHED o SCHEDULED */}
                {isLive ? (
                  <div className="pt-1.5 border-t border-red-500/30 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-red-400 font-bold uppercase truncate">
                        {match.currentSetScore
                          ? `${match.currentSetScore.set.replace(/en juego/i, '').trim()}: ${match.currentSetScore.home}-${match.currentSetScore.away}`
                          : 'En Juego'}
                      </span>
                    </div>

                    {/* Botón de actualizar marcador en vivo */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        refreshSingleMatch(match.id, false);
                      }}
                      disabled={isRefreshing}
                      className="px-1.5 py-0.5 bg-red-900/50 hover:bg-red-800 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-red-500/40 shrink-0"
                      title="Actualizar marcador desde favoley.net"
                    >
                      <span
                        className={`material-symbols-outlined text-[12px] text-red-300 ${
                          isRefreshing ? 'animate-spin' : ''
                        }`}
                      >
                        sync
                      </span>
                      <span>{isRefreshing ? '...' : 'Actualizar'}</span>
                    </button>
                  </div>
                ) : isFinished ? (
                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-emerald-400 font-bold uppercase">
                      Final · {match.dateStr === todayStr ? 'Hoy' : formatMadridDate(match.matchDate, { day: 'numeric', month: 'short' })}
                    </span>
                    {match.setScores && match.setScores.length > 0 && (
                      <span className="text-tertiary font-mono text-[9px] truncate">
                        ({match.setScores.map((s) => `${s.home}-${s.away}`).join(', ')})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                    <span className="text-tertiary capitalize">
                      {match.dateStr === todayStr
                        ? 'Hoy'
                        : formatMadridDate(match.matchDate, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-primary font-mono">
                        {formatMadridTime(match.matchDate)}h
                      </span>
                      {match.dateStr === todayStr && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            refreshSingleMatch(match.id, false);
                          }}
                          disabled={isRefreshing}
                          className="p-0.5 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border border-white/10 transition-colors flex items-center justify-center"
                          title="Comprobar si ha comenzado en favoley.net"
                        >
                          <span
                            className={`material-symbols-outlined text-[12px] ${
                              isRefreshing ? 'animate-spin text-primary' : ''
                            }`}
                          >
                            sync
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
