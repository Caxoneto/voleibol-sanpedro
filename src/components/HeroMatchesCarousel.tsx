'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMadridDate } from '@/lib/date-utils';
import { getTeamLogo, getTeamInitials } from '@/lib/team-logos';

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
  status: 'SCHEDULED' | 'FINISHED' | 'LIVE' | 'POSTPONED' | 'CANCELLED';
  statusText?: string;
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

interface DisplaySetColumn {
  label: string;
  home: number;
  away: number;
  isCurrent: boolean;
}

export default function HeroMatchesCarousel({
  initialMatches,
  todayStr,
}: HeroMatchesCarouselProps) {
  const initialHasToday = useMemo(
    () => initialMatches.some((m) => m.dateStr === todayStr),
    [initialMatches, todayStr]
  );

  const [matches, setMatches] = useState<HeroCarouselMatchItem[]>(initialMatches);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialHasToday ? 'today' : 'upcoming');
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const userChangedTabRef = useRef<boolean>(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  // Estados de navegación y desplazamiento para Desktop
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftStartRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  // Comprobar si se puede seguir haciendo scroll en los extremos
  const checkScrollLimits = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  // Desplazar el carrusel una tarjeta o cantidad determinada
  const scrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = 315; // Ancho aproximado de tarjeta (300px) + gap (10px-15px)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScrollLimits, 320);
  };

  // Convertir el desplazamiento de rueda vertical (mouse wheel) a scroll horizontal en Desktop
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const canScrollH =
          (e.deltaY > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 1) ||
          (e.deltaY < 0 && el.scrollLeft > 0);
        if (canScrollH) {
          e.preventDefault();
          el.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
          checkScrollLimits();
        }
      }
    };

    const handleScroll = () => {
      checkScrollLimits();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    checkScrollLimits();

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Reiniciar scroll horizontal al cambiar de pestaña y recalcular límites
  useEffect(() => {
    const el = carouselRef.current;
    if (el) {
      el.scrollLeft = 0;
      setTimeout(checkScrollLimits, 120);
    }
  }, [activeTab]);

  // Manejo de arrastre con ratón (drag to scroll) en Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = carouselRef.current;
    if (!el) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = carouselRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 6) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    checkScrollLimits();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Actualizar un partido individual desde favoley.net
  const refreshSingleMatch = async (matchId: string, silent = false) => {
    if (!silent) {
      setRefreshingIds((prev) => new Set(prev).add(matchId));
    }
    try {
      const res = await fetch(`/api/favb/match/${matchId}?force=true`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && data.match) {
        const updated = data.match;
        setMatches((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  status: updated.status,
                  statusText: updated.statusText ?? m.statusText,
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

  // Sincronización inmediata al montar + polling automático cada 45 segundos para partidos en vivo o de hoy
  useEffect(() => {
    const mergeSyncedMatches = (liveList: Array<Record<string, unknown>>) => {
      const liveMap = new Map(liveList.map((lm) => [String(lm.id), lm]));
      setMatches((prev) =>
        prev.map((m) => {
          const live = liveMap.get(m.id);
          if (!live) return m;
          return {
            ...m,
            homeTeamName: typeof live.homeTeam === 'string' && live.homeTeam ? live.homeTeam : m.homeTeamName,
            awayTeamName: typeof live.awayTeam === 'string' && live.awayTeam ? live.awayTeam : m.awayTeamName,
            isClubHome: typeof live.isClubHome === 'boolean' ? live.isClubHome : m.isClubHome,
            matchDate: typeof live.matchDate === 'string' && live.matchDate ? live.matchDate : m.matchDate,
            dateStr: typeof live.dateStr === 'string' && live.dateStr ? live.dateStr : m.dateStr,
            status:
              live.status === 'FINISHED' ||
              live.status === 'LIVE' ||
              live.status === 'SCHEDULED' ||
              live.status === 'POSTPONED' ||
              live.status === 'CANCELLED'
                ? (live.status as HeroCarouselMatchItem['status'])
                : m.status,
            statusText: typeof live.statusText === 'string' ? live.statusText : m.statusText,
            homeScore: typeof live.homeScore === 'number' ? live.homeScore : m.homeScore,
            awayScore: typeof live.awayScore === 'number' ? live.awayScore : m.awayScore,
            setScores:
              Array.isArray(live.setScores) && live.setScores.length > 0
                ? (live.setScores as { home: number; away: number }[])
                : m.setScores,
            currentSetScore:
              live.currentSetScore && typeof live.currentSetScore === 'object'
                ? (live.currentSetScore as { set: string; home: number; away: number })
                : m.currentSetScore,
          };
        })
      );
    };

    try {
      const cached = localStorage.getItem('cdv_synced_matches_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
          mergeSyncedMatches(parsed.matches);
        }
      }
    } catch {
      // Ignorar errores de localStorage
    }

    fetch('/api/favb/sync', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
          mergeSyncedMatches(data.matches);
          try {
            localStorage.setItem(
              'cdv_synced_matches_v1',
              JSON.stringify({
                matches: data.matches,
                lastSync: data.lastSync || new Date().toISOString(),
              })
            );
          } catch {
            // Ignorar cuota de localStorage
          }
        }
      })
      .catch(() => {});

    const activeOrToday = matches.filter(
      (m) => m.status === 'LIVE' || (m.status === 'SCHEDULED' && m.dateStr === todayStr)
    );
    if (activeOrToday.length === 0) return;

    activeOrToday.forEach((m) => {
      refreshSingleMatch(m.id, true);
    });

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        activeOrToday.forEach((m) => {
          refreshSingleMatch(m.id, true);
        });
      }
    }, 45000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

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

  // 2. Pestaña "Hoy": partidos del día de hoy ordenados por hora y categoría
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

  // 3. Pestaña "Próximos": próximo partido programado por categoría
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

  // Si no hay partidos hoy (ni siquiera tras sincronizar), mostrar "Próximos" por defecto
  useEffect(() => {
    if (userChangedTabRef.current) return;
    if (todayMatches.length > 0) {
      setActiveTab('today');
    } else {
      setActiveTab('upcoming');
    }
  }, [todayMatches.length]);

  const currentList =
    activeTab === 'finished'
      ? finishedMatches
      : activeTab === 'today'
      ? todayMatches
      : upcomingMatches;

  const hasLiveToday = todayMatches.some((m) => m.status === 'LIVE');

  // Posicionar el carrusel automáticamente en el primer partido que esté jugándose (o el próximo en horario de juego)
  useEffect(() => {
    const container = carouselRef.current;
    if (!container || currentList.length === 0) return;

    const nowMs = Date.now();
    // 1. Buscar el primero con estado LIVE
    let targetMatch = currentList.find((m) => m.status === 'LIVE');

    // 2. Si estamos en "Hoy" y ninguno figura aún como LIVE explícito, buscar el primero en ventana de juego (desde 15 min antes hasta 2h15m después del inicio) o el primer pendiente
    if (!targetMatch && activeTab === 'today') {
      targetMatch =
        currentList.find((m) => {
          if (m.status === 'FINISHED') return false;
          const startMs = new Date(m.matchDate).getTime();
          return nowMs >= startMs - 15 * 60 * 1000 && nowMs <= startMs + 135 * 60 * 1000;
        }) || currentList.find((m) => m.status !== 'FINISHED');
    }

    if (!targetMatch) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    const cardEl = document.getElementById(`hero-card-${activeTab}-${targetMatch.id}`);
    if (cardEl) {
      const targetLeft = cardEl.offsetLeft - (container.clientWidth - cardEl.clientWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activeTab, currentList]);

  // Regla de colores solicitada: verde ganando, blanco perdiendo, amarillo empate
  const getPointColorClass = (myVal: number, oppVal: number) => {
    if (myVal > oppVal) return 'text-emerald-400';
    if (myVal < oppVal) return 'text-white';
    return 'text-amber-300';
  };

  // Construye las columnas de sets estilo tenis (S1, S2, S3...)
  const getTennisSetColumns = (m: HeroCarouselMatchItem): DisplaySetColumn[] => {
    const isLive = m.status === 'LIVE';
    const cols: DisplaySetColumn[] = (m.setScores || []).map((s, idx) => ({
      label: `S${idx + 1}`,
      home: s.home,
      away: s.away,
      isCurrent: false,
    }));

    if (isLive) {
      if (m.currentSetScore) {
        const numMatch = m.currentSetScore.set.match(/(\d+)/);
        const setNumber = numMatch ? parseInt(numMatch[1], 10) : cols.length || 1;
        if (cols.length >= setNumber && setNumber >= 1) {
          cols[setNumber - 1] = {
            label: `S${setNumber}`,
            home: m.currentSetScore.home,
            away: m.currentSetScore.away,
            isCurrent: true,
          };
        } else {
          cols.push({
            label: `S${setNumber}`,
            home: m.currentSetScore.home,
            away: m.currentSetScore.away,
            isCurrent: true,
          });
        }
      } else if (cols.length > 0) {
        cols[cols.length - 1].isCurrent = true;
      } else {
        cols.push({
          label: 'S1',
          home: 0,
          away: 0,
          isCurrent: true,
        });
      }
    }

    return cols;
  };

  // Obtiene el marcador global de sets ganados
  const getTotalSetsDisplay = (m: HeroCarouselMatchItem) => {
    if (m.homeScore !== undefined && m.awayScore !== undefined) {
      return { home: m.homeScore, away: m.awayScore };
    }
    if (m.setScores && m.setScores.length > 0) {
      const completedSets =
        m.status === 'LIVE' ? m.setScores.slice(0, Math.max(0, m.setScores.length - 1)) : m.setScores;
      const home = completedSets.filter((s) => s.home > s.away).length;
      const away = completedSets.filter((s) => s.away > s.home).length;
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
            onClick={() => {
              userChangedTabRef.current = true;
              setActiveTab('finished');
            }}
            className={`px-3 py-1.5 text-[11px] sm:text-xs font-label-md uppercase tracking-wider font-bold transition-all border ${
              activeTab === 'finished'
                ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                : 'bg-surface-container-high/80 text-tertiary hover:text-white border-white/10'
            }`}
          >
            Finalizados
          </button>

          {/* Botón 2: Hoy */}
          <button
            type="button"
            onClick={() => {
              userChangedTabRef.current = true;
              setActiveTab('today');
            }}
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
            onClick={() => {
              userChangedTabRef.current = true;
              setActiveTab('upcoming');
            }}
            className={`px-3 py-1.5 text-[11px] sm:text-xs font-label-md uppercase tracking-wider font-bold transition-all border ${
              activeTab === 'upcoming'
                ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                : 'bg-surface-container-high/80 text-tertiary hover:text-white border-white/10'
            }`}
          >
            Próximos
          </button>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Controles de flechas izquierda/derecha para Desktop */}
          {currentList.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 bg-surface-container-high/90 border border-white/10 rounded-xs p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                aria-label="Desplazar partidos hacia la izquierda"
                title="Partidos anteriores"
                className="w-7 h-7 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-tertiary transition-all rounded-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <span className="w-px h-3.5 bg-white/10" aria-hidden="true" />
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                aria-label="Desplazar partidos hacia la derecha"
                title="Siguientes partidos"
                className="w-7 h-7 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-tertiary transition-all rounded-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
          )}

          <Link
            href="/partidos"
            className="text-[11px] sm:text-xs text-tertiary hover:text-white uppercase font-bold flex items-center gap-1 group transition-colors"
          >
            <span>Ver todos</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* Carrusel horizontal de tarjetas con botones flotantes y soporte drag en Desktop */}
      {currentList.length === 0 ? (
        <div className="bg-surface-container-low/80 border border-white/10 p-4 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-tertiary">
            No hay partidos registrados para hoy ({formatMadridDate(new Date())}).
          </p>
          <button
            type="button"
            onClick={() => {
              userChangedTabRef.current = true;
              setActiveTab('upcoming');
            }}
            className="px-3 py-1 bg-primary-container text-white text-[11px] uppercase font-bold tracking-wider"
          >
            Ver Próximos Partidos
          </button>
        </div>
      ) : (
        <div className="relative group/carousel">
          {/* Botón flotante Izquierda en Desktop */}
          {canScrollLeft && currentList.length > 1 && (
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              aria-label="Desplazar partidos a la izquierda"
              title="Anterior"
              className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-14 bg-black/85 hover:bg-primary-container text-white items-center justify-center border border-white/20 hover:border-primary-container/80 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all rounded-r cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
          )}

          {/* Botón flotante Derecha en Desktop */}
          {canScrollRight && currentList.length > 1 && (
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              aria-label="Desplazar partidos a la derecha"
              title="Siguiente"
              className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-14 bg-black/85 hover:bg-primary-container text-white items-center justify-center border border-white/20 hover:border-primary-container/80 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all rounded-l cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          )}

          <div
            ref={carouselRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory ${
              isDragging ? 'cursor-grabbing select-none' : 'sm:cursor-grab'
            }`}
          >
          {currentList.map((match) => {
            const isLive = match.status === 'LIVE';
            const isFinished = match.status === 'FINISHED';
            const hasScoreboard = isLive || isFinished;
            const totalSets = getTotalSetsDisplay(match);
            const setColumns = hasScoreboard ? getTennisSetColumns(match) : [];
            const isRefreshing = refreshingIds.has(match.id);
            const compactCols = setColumns.length >= 4;
            const isSingleCard = currentList.length === 1;

            return (
              <div
                key={`${activeTab}-${match.id}`}
                id={`hero-card-${activeTab}-${match.id}`}
                className={`group relative shrink-0 overflow-hidden ${
                  isSingleCard
                    ? 'w-full sm:w-[300px] snap-start'
                    : 'w-[calc(100%-3.5rem)] sm:w-[300px] snap-center first:snap-start last:snap-end'
                } bg-surface-container-low/95 hover:bg-surface-container-high border p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 shadow-md hover:-translate-y-0.5 ${
                  isLive
                    ? 'border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.22)]'
                    : match.status === 'POSTPONED'
                    ? 'border-amber-500/40 hover:border-amber-500/70'
                    : match.status === 'CANCELLED'
                    ? 'border-red-500/40 hover:border-red-500/70'
                    : 'border-white/10 hover:border-primary-container'
                }`}
                title={`${match.categoryName}: ${match.homeTeamName} vs ${match.awayTeamName}`}
              >
                <Link
                  href={`/partidos?cat=${match.categoryId}#match-${match.id}`}
                  onClick={(e) => {
                    if (hasDraggedRef.current) {
                      e.preventDefault();
                    }
                  }}
                  aria-label={`Ver detalles del partido ${match.homeTeamName} contra ${match.awayTeamName}`}
                  className="absolute inset-0 z-0 rounded-sm"
                />

                {/* 1. Cabecera: Jornada, Categoría y a la derecha [Botón Actualizar Icono] + [Icono Casa/Fuera] */}
                <div className="relative z-30 flex items-center justify-between gap-1.5 pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[9px] sm:text-[10px] font-bold shrink-0">
                      J{match.round}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white truncate">
                      {match.categoryName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isFinished && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          refreshSingleMatch(match.id, false);
                        }}
                        disabled={isRefreshing}
                        className={`w-5 h-5 flex items-center justify-center shrink-0 border transition-colors ${
                          isLive
                            ? 'bg-red-950/90 hover:bg-red-800 text-red-300 border-red-500/50'
                            : 'bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border-white/15'
                        }`}
                        title={`Actualizar marcador desde ${match.id.startsWith('afade-') ? 'ligaafade.es' : 'favoley.net'}`}
                        aria-label="Actualizar marcador"
                      >
                        <span
                          className={`material-symbols-outlined text-[13px] ${
                            isRefreshing ? 'animate-spin text-white' : ''
                          }`}
                          aria-hidden="true"
                        >
                          sync
                        </span>
                      </button>
                    )}

                    {/* Icono de En Casa o Fuera */}
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 border ${
                        match.isClubHome
                          ? 'text-primary bg-primary-container/15 border-primary-container/30'
                          : 'text-tertiary bg-white/5 border-white/10'
                      }`}
                      title={match.isClubHome ? 'En casa (Pabellón Sergio Scariolo)' : 'Fuera / A domicilio'}
                    >
                      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                        {match.isClubHome ? 'home' : 'flight'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. Subcabecera: Estado/Fecha a la izquierda + Encabezados de Sets (S1, S2... | SETS) encima de los puntos */}
                <div className="relative z-10 pointer-events-none flex items-center justify-between gap-1 pt-1.5 pb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-400">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span>En Juego</span>
                      </span>
                    ) : match.status === 'POSTPONED' ? (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Aplazado
                      </span>
                    ) : match.status === 'CANCELLED' ? (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-red-400">
                        Cancelado
                      </span>
                    ) : isFinished ? (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Final ·{' '}
                        {match.dateStr === todayStr
                          ? 'Hoy'
                          : formatMadridDate(match.matchDate, { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-tertiary capitalize">
                        {match.dateStr === todayStr
                          ? 'Hoy'
                          : formatMadridDate(match.matchDate, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                      </span>
                    )}
                  </div>

                  {hasScoreboard ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {setColumns.map((col, idx) => (
                        <span
                          key={`hdr-${idx}`}
                          className={`${
                            compactCols ? 'w-6 sm:w-6.5' : 'w-7 sm:w-7.5'
                          } text-center font-mono text-[10px] font-extrabold uppercase ${
                            col.isCurrent ? 'text-red-400' : 'text-tertiary'
                          }`}
                        >
                          {col.label}
                        </span>
                      ))}
                      <span className="w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 text-center font-mono text-[10px] font-extrabold uppercase text-primary">
                        SETS
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs font-extrabold text-primary">
                      {new Date(match.matchDate).toLocaleTimeString('en-GB', {
                        timeZone: 'Europe/Madrid',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      h
                    </span>
                  )}
                </div>

                {/* 3. Filas de Equipos (Logo Grande + 3 Iniciales + Nombre completo en carrusel) + Columnas de Sets + Total de Sets */}
                <div className="relative z-10 pointer-events-none space-y-2 pt-0.5">
                  {/* Fila Equipo Local */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex items-center gap-2 min-w-0 flex-1 ${
                        match.status === 'POSTPONED' || match.status === 'CANCELLED' ? 'pr-24 sm:pr-28' : ''
                      }`}
                      title={match.homeTeamName}
                    >
                      <Image
                        src={getTeamLogo(match.homeTeamName)}
                        alt={match.homeTeamName}
                        width={32}
                        height={32}
                        className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                      />
                      <span
                        className={`font-display-xl text-base sm:text-lg tracking-wider uppercase leading-none shrink-0 w-9 sm:w-10 ${
                          match.isClubHome ? 'text-primary' : 'text-white'
                        }`}
                      >
                        {getTeamInitials(match.homeTeamName)}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden mask-fade-edges">
                        <div className="animate-team-marquee items-center whitespace-nowrap text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-tertiary/90">
                          <span className="pr-6">{match.homeTeamName}</span>
                          <span className="pr-6" aria-hidden="true">
                            {match.homeTeamName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {hasScoreboard && (
                      <div className="flex items-center gap-1 shrink-0">
                        {setColumns.map((col, idx) => (
                          <span
                            key={`home-set-${idx}`}
                            className={`${
                              compactCols ? 'w-6 sm:w-6.5 text-xs sm:text-sm' : 'w-7 sm:w-7.5 text-sm sm:text-base'
                            } h-7 flex items-center justify-center font-mono font-extrabold leading-none rounded-[2px] ${
                              col.isCurrent
                                ? 'bg-red-950/60 border border-red-500/40'
                                : 'bg-white/[0.04]'
                            } ${getPointColorClass(col.home, col.away)}`}
                          >
                            {col.home}
                          </span>
                        ))}
                        <span
                          className={`w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 h-7 flex items-center justify-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.08] ${getPointColorClass(
                            totalSets.home,
                            totalSets.away
                          )}`}
                        >
                          {totalSets.home}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fila Equipo Visitante */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex items-center gap-2 min-w-0 flex-1 ${
                        match.status === 'POSTPONED' || match.status === 'CANCELLED' ? 'pr-24 sm:pr-28' : ''
                      }`}
                      title={match.awayTeamName}
                    >
                      <Image
                        src={getTeamLogo(match.awayTeamName)}
                        alt={match.awayTeamName}
                        width={32}
                        height={32}
                        className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                      />
                      <span
                        className={`font-display-xl text-base sm:text-lg tracking-wider uppercase leading-none shrink-0 w-9 sm:w-10 ${
                          !match.isClubHome ? 'text-primary' : 'text-white'
                        }`}
                      >
                        {getTeamInitials(match.awayTeamName)}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden mask-fade-edges">
                        <div className="animate-team-marquee items-center whitespace-nowrap text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-tertiary/90">
                          <span className="pr-6">{match.awayTeamName}</span>
                          <span className="pr-6" aria-hidden="true">
                            {match.awayTeamName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {hasScoreboard && (
                      <div className="flex items-center gap-1 shrink-0">
                        {setColumns.map((col, idx) => (
                          <span
                            key={`away-set-${idx}`}
                            className={`${
                              compactCols ? 'w-6 sm:w-6.5 text-xs sm:text-sm' : 'w-7 sm:w-7.5 text-sm sm:text-base'
                            } h-7 flex items-center justify-center font-mono font-extrabold leading-none rounded-[2px] ${
                              col.isCurrent
                                ? 'bg-red-950/60 border border-red-500/40'
                                : 'bg-white/[0.04]'
                            } ${getPointColorClass(col.away, col.home)}`}
                          >
                            {col.away}
                          </span>
                        ))}
                        <span
                          className={`w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 h-7 flex items-center justify-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.08] ${getPointColorClass(
                            totalSets.away,
                            totalSets.home
                          )}`}
                        >
                          {totalSets.away}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cartel diagonal de APLAZADO / CANCELADO a la derecha donde irían los marcadores */}
                  {(match.status === 'POSTPONED' || match.status === 'CANCELLED') && (
                    <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-end">
                      <div
                        className={`-rotate-6 sm:-rotate-12 transform px-2.5 sm:px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.16em] uppercase font-black shadow-[0_6px_20px_rgba(0,0,0,0.85)] select-none rounded-[2px] ${
                          match.status === 'CANCELLED'
                            ? 'bg-red-950/95 text-red-200 border-red-500'
                            : 'bg-amber-500/95 text-black border-amber-200'
                        }`}
                      >
                        {match.statusText?.toUpperCase() || (match.status === 'CANCELLED' ? 'CANCELADO' : 'APLAZADO')}
                      </div>
                    </div>
                  )}
                </div>


              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
