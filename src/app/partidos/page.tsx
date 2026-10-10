'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
import { FavbMatch, getConsolidatedOfficialMatches } from '@/lib/favb-scraper';
import {
  formatMadridDate,
  formatMadridDateString,
  formatMadridTime,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo, getTeamInitials } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';

interface DisplaySetColumn {
  label: string;
  home: number;
  away: number;
  isCurrent: boolean;
}

type CategorySubTab = 'pending' | 'finished';

function PartidosContent() {
  const searchParams = useSearchParams();
  const initialMatchParam = searchParams.get('match') || searchParams.get('partido');
  const rawCategoryParam = searchParams.get('categoria') || searchParams.get('cat');

  // Inicializar sincrónicamente con los partidos consolidados para que el DOM exista desde el instante 0
  const initialConsolidated = useMemo(() => getConsolidatedOfficialMatches(), []);

  // Determinar categoría inicial (por parámetro o deducida del partido pulsado)
  const resolvedInitialCategory = useMemo(() => {
    if (rawCategoryParam) return rawCategoryParam;
    if (initialMatchParam) {
      const found = initialConsolidated.find((m) => m.id === initialMatchParam);
      if (found?.categoryId) return found.categoryId;
    }
    return 'cat-senior-fem';
  }, [rawCategoryParam, initialMatchParam, initialConsolidated]);

  const [matches, setMatches] = useState<FavbMatch[]>(initialConsolidated);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');

  // Sub-pestaña activa por categoría ('pending' | 'finished')
  const [subTabByCategory, setSubTabByCategory] = useState<Record<string, CategorySubTab>>(() => {
    const map: Record<string, CategorySubTab> = {};
    if (initialMatchParam) {
      const found = initialConsolidated.find((m) => m.id === initialMatchParam);
      if (found && found.categoryId) {
        map[found.categoryId] = found.status === 'FINISHED' ? 'finished' : 'pending';
      }
    }
    return map;
  });

  // ID del partido enfocado al navegar desde el carrusel de Inicio
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(initialMatchParam);

  // IDs de partidos con refresco individual en curso
  const [refreshingMatchIds, setRefreshingMatchIds] = useState<Set<string>>(new Set());
  const [refreshFeedback, setRefreshFeedback] = useState<{
    matchId: string;
    message: string;
  } | null>(null);

  // Estado del acordeón: categoría expandida
  const [expandedCatId, setExpandedCatId] = useState<string | null>(resolvedInitialCategory);

  // Referencia al contenedor de scroll horizontal de categorías
  const catScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Jugadora destacada real de la plantilla oficial (Capitana Senior Femenino: María López Quevedo #8)
  const mvpPlayer =
    INITIAL_PLAYERS.find((p) => p.teamId === 'team-sf' && p.isCaptain) || INITIAL_PLAYERS[0];
  const featuredMatch = INITIAL_MATCHES.find((m) => m.isFeatured) || INITIAL_MATCHES[0];

  // Sincronización en segundo plano al montar el componente
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

  // Centrar siempre la píldora de la categoría activa en la barra horizontal (sin cancelar el scroll vertical)
  const centerCategoryPill = (catId: string | null) => {
    if (!catId) return;
    const container = catScrollContainerRef.current;
    const pill = document.getElementById(`cat-pill-${catId}`);
    if (container && pill) {
      const targetLeft = pill.offsetLeft - container.clientWidth / 2 + pill.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (expandedCatId) {
      centerCategoryPill(expandedCatId);
    }
  }, [expandedCatId]);

  // Control de navegación desde el carrusel de Inicio (?categoria=...&match=...)
  useEffect(() => {
    if (!resolvedInitialCategory) return;
    setExpandedCatId(resolvedInitialCategory);

    if (initialMatchParam) {
      setHighlightedMatchId(initialMatchParam);
      const targetMatch = matches.find((m) => m.id === initialMatchParam);
      const targetCatId = targetMatch?.categoryId || resolvedInitialCategory;
      if (targetMatch) {
        const desiredTab: CategorySubTab =
          targetMatch.status === 'FINISHED' ? 'finished' : 'pending';
        setSubTabByCategory((prev) =>
          prev[targetCatId] === desiredTab ? prev : { ...prev, [targetCatId]: desiredTab }
        );
      }

      const scrollBoth = () => {
        centerCategoryPill(targetCatId);
        const matchEl = document.getElementById(`match-${initialMatchParam}`);
        if (matchEl) {
          matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      const t1 = setTimeout(scrollBoth, 120);
      const t2 = setTimeout(scrollBoth, 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [resolvedInitialCategory, initialMatchParam]);

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
        // Si veníamos con un partido en la URL y su estado cambió tras sincronizar, asegurar pestaña correcta
        if (initialMatchParam) {
          const updatedTarget = (data.matches as FavbMatch[]).find(
            (m) => m.id === initialMatchParam
          );
          if (updatedTarget && updatedTarget.categoryId) {
            const desiredTab: CategorySubTab =
              updatedTarget.status === 'FINISHED' ? 'finished' : 'pending';
            setSubTabByCategory((prev) => ({
              ...prev,
              [updatedTarget.categoryId!]: desiredTab,
            }));
          }
        }
      }
    } catch (err) {
      console.error('Error al sincronizar con favoley.net', err);
    } finally {
      setSyncing(false);
    }
  };

  // Actualizar un partido individual consultando favoley.net en tiempo real
  const handleRefreshSingleMatch = async (matchId: string, simulate = false, silent = false) => {
    if (!silent) {
      setRefreshingMatchIds((prev) => new Set(prev).add(matchId));
    }
    try {
      const res = await fetch(
        `/api/favb/match/${matchId}?force=true${simulate ? '&simulate=true' : ''}`
      );
      const data = await res.json();
      if (data.success && data.match) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === data.match.id || m.favbId === data.match.favbId ? data.match : m
          )
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

  // Alternar acordeón
  const handleToggleCategory = (catId: string) => {
    setExpandedCatId((current) => (current === catId ? null : catId));
  };

  // Seleccionar categoría desde la barra superior (expande y hace scroll suave a la categoría)
  const handleSelectCategoryFromBar = (catId: string) => {
    setExpandedCatId(catId);
    centerCategoryPill(catId);
    setTimeout(() => {
      const catEl = document.getElementById(catId);
      if (catEl) {
        catEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Descarga de archivo .ics para el móvil
  const handleDownloadIcs = (m: FavbMatch) => {
    const matchObj = INITIAL_MATCHES.find((im) => im.id === m.id);
    const dateIso = m.matchDate || (matchObj ? matchObj.matchDate : new Date().toISOString());
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
    const dateIso = m.matchDate || (matchObj ? matchObj.matchDate : new Date().toISOString());
    return generateGoogleCalendarUrl(
      `Voleibol: ${m.homeTeam} vs ${m.awayTeam}`,
      m.venue,
      dateIso
    );
  };

  // Enlace directo de Google Maps para el pabellón del partido
  const getVenueMapsLink = (m: FavbMatch) => {
    if (m.isClubHome) return CLUB_INFO.venueMapsUrl;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`;
  };

  // Regla de colores unificada con la página de inicio: verde ganando, blanco perdiendo, amarillo empate
  const getPointColorClass = (myVal: number, oppVal: number) => {
    if (myVal > oppVal) return 'text-emerald-400';
    if (myVal < oppVal) return 'text-white';
    return 'text-amber-300';
  };

  // Construye las columnas de sets estilo tenis (S1, S2, S3...) para cualquier partido en vivo o finalizado
  const getTennisSetColumns = (m: FavbMatch): DisplaySetColumn[] => {
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
  const getTotalSetsDisplay = (m: FavbMatch) => {
    if (m.homeScore !== undefined && m.awayScore !== undefined) {
      return { home: m.homeScore, away: m.awayScore };
    }
    if (m.setScores && m.setScores.length > 0) {
      if (m.status === 'FINISHED') {
        const calc = calculateMatchScore(m.setScores);
        return { home: calc.homeSetsWon, away: calc.awaySetsWon };
      }
      const completedSets = m.setScores.slice(0, Math.max(0, m.setScores.length - 1));
      const home = completedSets.filter((s) => s.home > s.away).length;
      const away = completedSets.filter((s) => s.away > s.home).length;
      return { home, away };
    }
    return { home: 0, away: 0 };
  };

  // Agrupar los partidos oficiales por categorías y ordenarlos estrictamente por proximidad temporal
  const categoriesData = useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => {
      const catTeams = INITIAL_TEAMS.filter((t) => t.categoryId === cat.id);

      const catMatches = matches.filter((m) => {
        if (m.categoryId && m.categoryId === cat.id) return true;
        return (
          m.categoryName.toLowerCase().includes(cat.name.toLowerCase()) ||
          cat.name.toLowerCase().includes(m.categoryName.toLowerCase())
        );
      });

      // En vivo: ordenados por proximidad temporal ascendente
      const live = catMatches
        .filter((m) => m.status === 'LIVE')
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      // Próximos / Pendientes: ordenados por proximidad temporal ascendente (el más cercano primero)
      const scheduled = catMatches
        .filter((m) => m.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      // Finalizados: ordenados por proximidad temporal descendente (el más reciente primero)
      const finished = catMatches
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

      // Partido destacado en rojo de la categoría: el partido en vivo, o si no hay ninguno en vivo, el próximo más cercano
      const nextOrLiveMatch = live[0] || scheduled[0];

      return {
        category: cat,
        team: catTeams[0],
        totalCount: catMatches.length,
        live,
        scheduled,
        finished,
        nextMatch: nextOrLiveMatch,
        redHighlightedMatchId: nextOrLiveMatch?.id || null,
      };
    });
  }, [matches]);

  // Todos los partidos actualmente en directo
  const allLiveMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'LIVE');
  }, [matches]);

  // Renderizador reutilizable de tarjeta de resultado (en vivo o finalizado) con formato tenis + botones solo icono
  const renderScoreboardCard = (
    m: FavbMatch,
    showCategoryName = false,
    forceRedBorder = false
  ) => {
    const isLive = m.status === 'LIVE';
    const isFinished = m.status === 'FINISHED';
    const isRedBorder = isLive || forceRedBorder || highlightedMatchId === m.id;
    const setColumns = getTennisSetColumns(m);
    const totalSets = getTotalSetsDisplay(m);
    const isRefreshing = refreshingMatchIds.has(m.id);
    const compactCols = setColumns.length >= 4;

    return (
      <div
        key={m.id}
        id={`match-${m.id}`}
        className={`bg-surface-container-high/80 p-3.5 sm:p-4 flex flex-col justify-between transition-all shadow-lg ${
          isRedBorder
            ? 'border-2 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.28)]'
            : 'border border-white/10 hover:border-primary-container/50'
        }`}
      >
        <div>
          {/* 1. Cabecera: Jornada, Fecha/Estado y a la derecha [Botón Actualizar Icono] + [Icono Casa/Fuera] */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[10px] font-bold shrink-0">
                J{m.round}
              </span>
              {showCategoryName ? (
                <span className="font-bold text-white uppercase text-[11px] truncate">
                  {m.categoryName}
                </span>
              ) : (
                <span className="text-[11px] text-tertiary font-semibold">
                  {m.dateStr} · {m.timeStr}h
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón actualizar: SOLO icono, a la izquierda del icono de casa/fuera, solo si NO ha finalizado */}
              {!isFinished && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshSingleMatch(m.id);
                  }}
                  disabled={isRefreshing}
                  className={`w-6 h-6 flex items-center justify-center shrink-0 border transition-colors ${
                    isLive
                      ? 'bg-red-950/90 hover:bg-red-800 text-red-300 border-red-500/50'
                      : 'bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border-white/15'
                  }`}
                  title="Actualizar marcador desde favoley.net"
                  aria-label="Actualizar marcador"
                >
                  <span
                    className={`material-symbols-outlined text-[15px] ${
                      isRefreshing ? 'animate-spin text-white' : ''
                    }`}
                  >
                    sync
                  </span>
                </button>
              )}

              {/* Icono de En Casa o Fuera */}
              <span
                className={`w-6 h-6 flex items-center justify-center shrink-0 border ${
                  m.isClubHome
                    ? 'text-primary bg-primary-container/20 border-primary-container/40'
                    : 'text-tertiary bg-white/5 border-white/10'
                }`}
                title={
                  m.isClubHome
                    ? 'En casa (Pabellón Sergio Scariolo)'
                    : `Fuera (${m.venue})`
                }
              >
                <span className="material-symbols-outlined text-[15px]">
                  {m.isClubHome ? 'home' : 'flight'}
                </span>
              </span>
            </div>
          </div>

          {/* 2. Subcabecera: Estado a la izquierda + Encabezados de Sets (S1, S2... | SETS) encima de las columnas */}
          <div className="flex items-center justify-between gap-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span>En Juego</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Finalizado
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {setColumns.map((col, idx) => (
                <span
                  key={`hdr-${m.id}-${idx}`}
                  className={`${
                    compactCols ? 'w-6 sm:w-7' : 'w-7 sm:w-8'
                  } text-center font-mono text-[10px] font-extrabold uppercase ${
                    col.isCurrent ? 'text-red-400' : 'text-tertiary'
                  }`}
                >
                  {col.label}
                </span>
              ))}
              <span className="w-8 sm:w-9 ml-0.5 pl-1 border-l border-white/15 text-center font-mono text-[10px] font-extrabold uppercase text-primary">
                SETS
              </span>
            </div>
          </div>

          {/* 3. Filas de Equipos a la izquierda + Columnas de Sets y Total a la derecha (mismos colores que Inicio) */}
          <div className="space-y-2 py-1">
            {/* Equipo Local */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1" title={m.homeTeam}>
                <Image
                  src={getTeamLogo(m.homeTeam)}
                  alt={m.homeTeam}
                  width={32}
                  height={32}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                />
                <span
                  className={`text-xs sm:text-sm uppercase truncate ${
                    m.isClubHome ? 'text-primary font-bold' : 'text-white font-semibold'
                  }`}
                >
                  <span className="sm:hidden font-display-xl text-base tracking-wider">
                    {getTeamInitials(m.homeTeam)}
                  </span>
                  <span className="hidden sm:inline">{m.homeTeam}</span>
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {setColumns.map((col, idx) => (
                  <span
                    key={`home-set-${m.id}-${idx}`}
                    className={`${
                      compactCols ? 'w-6 sm:w-7 text-xs sm:text-sm' : 'w-7 sm:w-8 text-sm sm:text-base'
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
                  className={`w-8 sm:w-9 ml-0.5 pl-1 border-l border-white/15 h-7 flex items-center justify-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.08] ${getPointColorClass(
                    totalSets.home,
                    totalSets.away
                  )}`}
                >
                  {totalSets.home}
                </span>
              </div>
            </div>

            {/* Equipo Visitante */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1" title={m.awayTeam}>
                <Image
                  src={getTeamLogo(m.awayTeam)}
                  alt={m.awayTeam}
                  width={32}
                  height={32}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                />
                <span
                  className={`text-xs sm:text-sm uppercase truncate ${
                    !m.isClubHome ? 'text-primary font-bold' : 'text-white font-semibold'
                  }`}
                >
                  <span className="sm:hidden font-display-xl text-base tracking-wider">
                    {getTeamInitials(m.awayTeam)}
                  </span>
                  <span className="hidden sm:inline">{m.awayTeam}</span>
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {setColumns.map((col, idx) => (
                  <span
                    key={`away-set-${m.id}-${idx}`}
                    className={`${
                      compactCols ? 'w-6 sm:w-7 text-xs sm:text-sm' : 'w-7 sm:w-8 text-sm sm:text-base'
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
                  className={`w-8 sm:w-9 ml-0.5 pl-1 border-l border-white/15 h-7 flex items-center justify-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.08] ${getPointColorClass(
                    totalSets.away,
                    totalSets.home
                  )}`}
                >
                  {totalSets.away}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de tarjeta con sede y botones de SOLO icono (Ubicación Maps + Acta FAVB) */}
        <div className="pt-2.5 mt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px] text-tertiary">
          <div className="flex items-center gap-1 min-w-0">
            <span className="material-symbols-outlined text-[14px] text-primary shrink-0">
              pin_drop
            </span>
            <span className="truncate">{m.venue}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={getVenueMapsLink(m)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center border border-white/10 transition-colors"
              title={`Cómo llegar a ${m.venue}`}
              aria-label="Cómo llegar al pabellón"
            >
              <span className="material-symbols-outlined text-[14px]">directions</span>
            </a>

            <a
              href={m.favbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 bg-surface-container-highest hover:bg-primary-container text-primary hover:text-white flex items-center justify-center border border-white/10 transition-colors"
              title="Ver acta oficial en favoley.net"
              aria-label="Ver acta oficial en favoley.net"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-background relative">
      {/* Top Hero Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-8 sm:py-10 border-b border-white/5 overflow-hidden">
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
              Partidos federados y marcadores oficiales de la Federación Andaluza de Voleibol (favoley.net). Selecciona una categoría para consultar sus encuentros pendientes o finalizados.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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
          <span className="text-xs font-bold uppercase tracking-wider">
            {refreshFeedback.message}
          </span>
        </div>
      )}

      {/* Selector Rápido Horizontal de Categorías (Sticky) + Botón Icono Actualizar integrado en Desktop */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div
            ref={catScrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary shrink-0 mr-1 hidden sm:inline">
              Categoría:
            </span>
            {categoriesData.map(({ category }) => {
              const isSelected = expandedCatId === category.id;
              return (
                <button
                  key={category.id}
                  id={`cat-pill-${category.id}`}
                  onClick={() => handleSelectCategoryFromBar(category.id)}
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

          {/* En Desktop: Botón de actualizar (solo icono) fijo a la derecha en la barra sticky de categorías */}
          <button
            type="button"
            onClick={() => fetchFavbMatches(true)}
            disabled={syncing}
            className="hidden md:flex w-9 h-9 bg-primary-container hover:bg-secondary-container disabled:opacity-50 text-white items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] transition-all shrink-0"
            title={`Actualizar todos los marcadores desde favoley.net (Última: ${lastSyncTime})`}
            aria-label="Actualizar resultados"
          >
            <span className={`material-symbols-outlined text-[19px] ${syncing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </section>

      {/* En Mobile: Botón flotante (solo icono) arriba a la derecha justo debajo del listado de categorías */}
      <button
        type="button"
        onClick={() => fetchFavbMatches(true)}
        disabled={syncing}
        className="md:hidden fixed top-[170px] right-3 z-40 w-10 h-10 bg-primary-container/95 hover:bg-primary-container disabled:opacity-50 text-white flex items-center justify-center border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-sm active:scale-95 transition-all"
        title="Actualizar resultados desde favoley.net"
        aria-label="Actualizar resultados"
      >
        <span className={`material-symbols-outlined text-[20px] ${syncing ? 'animate-spin' : ''}`}>
          sync
        </span>
      </button>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Banner Informativo y Leyenda de Iconos */}
        <div className="p-3 bg-surface-container-low border border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-tertiary gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Fuente oficial: <strong>Federación Andaluza de Voleibol (favoley.net)</strong>
            </span>
            <span className="font-mono text-[11px] text-tertiary/70 hidden sm:inline">
              · Actualizado: {lastSyncTime}
            </span>
          </div>

          {/* Leyenda de Iconos */}
          <div className="flex items-center gap-4 text-xs font-semibold text-white">
            <span
              className="flex items-center gap-1.5"
              title="Partido jugado en el Pabellón Polideportivo Sergio Scariolo"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-primary-container/20 text-primary border border-primary-container/30">
                <span className="material-symbols-outlined text-[15px]">home</span>
              </span>
              <span>En Casa</span>
            </span>
            <span
              className="flex items-center gap-1.5"
              title="Partido jugado fuera de casa (a domicilio)"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-white/5 text-tertiary border border-white/10">
                <span className="material-symbols-outlined text-[15px]">flight</span>
              </span>
              <span>Fuera</span>
            </span>
          </div>
        </div>

        {/* MÓDULO DESTACADO: PARTIDOS EN DIRECTO AHORA */}
        {allLiveMatches.length > 0 && (
          <section className="bg-red-950/20 border-2 border-red-500 p-4 sm:p-6 shadow-2xl relative animate-fadeIn">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-red-500/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="font-display-xl text-xl sm:text-2xl uppercase text-white font-bold tracking-wide">
                PARTIDOS EN DIRECTO AHORA ({allLiveMatches.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allLiveMatches.map((m) => renderScoreboardCard(m, true, true))}
            </div>
          </section>
        )}

        {/* NÚCLEO: LISTADO CLASIFICADO POR CATEGORÍAS (ACORDEÓN CON PESTAÑAS PENDIENTES / FINALIZADOS) */}
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
              Rodeado en <span className="text-red-400 font-bold">rojo</span> el partido en juego o el próximo más cercano.
            </p>
          </div>

          {/* Acordeón de las categorías */}
          <div className="space-y-3">
            {categoriesData.map(
              ({
                category,
                team,
                totalCount,
                live,
                scheduled,
                finished,
                nextMatch,
                redHighlightedMatchId,
              }) => {
                const isExpanded = expandedCatId === category.id;
                const pendingCount = live.length + scheduled.length;
                const activeSubTab: CategorySubTab =
                  subTabByCategory[category.id] ||
                  (pendingCount > 0 ? 'pending' : 'finished');

                return (
                  <div
                    key={category.id}
                    id={category.id}
                    className={`border transition-all duration-300 scroll-mt-44 ${
                      isExpanded
                        ? 'bg-surface-container-low border-primary-container/80 shadow-xl'
                        : 'bg-surface-container-lowest/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Encabezado del Acordeón */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(category.id)}
                      className="w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                    >
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

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        {live.length > 0 ? (
                          <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/60 px-3 py-1 text-xs text-red-300 font-bold uppercase tracking-wider animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>
                              EN JUEGO: J{live[0].round} ({live[0].homeScore ?? 0}-
                              {live[0].awayScore ?? 0})
                            </span>
                          </div>
                        ) : nextMatch ? (
                          <div className="flex items-center gap-2 bg-surface-container-highest/60 px-2.5 py-1 text-xs border border-red-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="font-bold text-white">
                              Próx: J{nextMatch.round} · {nextMatch.dateStr}
                            </span>
                            <span
                              className="p-0.5 text-primary flex items-center justify-center"
                              title={
                                nextMatch.isClubHome
                                  ? 'En casa (Sergio Scariolo)'
                                  : `Fuera (${nextMatch.venue})`
                              }
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {nextMatch.isClubHome ? 'home' : 'flight'}
                              </span>
                            </span>
                          </div>
                        ) : null}

                        <span className="text-xs font-mono text-tertiary bg-white/5 px-2 py-1 hidden sm:inline">
                          {totalCount} part.
                        </span>

                        <span
                          className={`material-symbols-outlined text-2xl transition-transform duration-300 ${
                            isExpanded
                              ? 'rotate-180 text-primary'
                              : 'text-tertiary group-hover:text-white'
                          }`}
                        >
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Panel Desplegable Separado por Pestañas: PENDIENTES vs FINALIZADOS */}
                    {isExpanded && (
                      <div className="px-3.5 sm:px-6 pb-6 pt-3 border-t border-white/10 space-y-5 animate-fadeIn">
                        {/* Barra de Sub-Pestañas: Pendientes vs Finalizados */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSubTabByCategory((prev) => ({
                                  ...prev,
                                  [category.id]: 'pending',
                                }))
                              }
                              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
                                activeSubTab === 'pending'
                                  ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                                  : 'bg-surface-container-high text-tertiary hover:text-white border-white/10'
                              }`}
                            >
                              {live.length > 0 && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-300"></span>
                                </span>
                              )}
                              <span>Pendientes</span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono ${
                                  activeSubTab === 'pending'
                                    ? 'bg-black/30 text-white'
                                    : 'bg-white/10 text-tertiary'
                                }`}
                              >
                                {pendingCount}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSubTabByCategory((prev) => ({
                                  ...prev,
                                  [category.id]: 'finished',
                                }))
                              }
                              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
                                activeSubTab === 'finished'
                                  ? 'bg-primary-container text-white border-primary-container shadow-[2px_2px_0px_0px_#0e0e0e]'
                                  : 'bg-surface-container-high text-tertiary hover:text-white border-white/10'
                              }`}
                            >
                              <span>Finalizados</span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono ${
                                  activeSubTab === 'finished'
                                    ? 'bg-black/30 text-white'
                                    : 'bg-white/10 text-tertiary'
                                }`}
                              >
                                {finished.length}
                              </span>
                            </button>
                          </div>

                          <span className="text-[11px] text-tertiary">
                            {activeSubTab === 'pending'
                              ? 'Ordenados por proximidad (más cercano primero)'
                              : 'Ordenados por fecha (más reciente primero)'}
                          </span>
                        </div>

                        {/* PESTAÑA 1: PARTIDOS PENDIENTES (EN JUEGO + PRÓXIMOS) */}
                        {activeSubTab === 'pending' && (
                          <div className="space-y-5">
                            {/* Si hay partido EN JUEGO, mostrarlo arriba con su marcador en directo rodeado en rojo */}
                            {live.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                  </span>
                                  <h4 className="font-headline-sm text-xs sm:text-sm uppercase text-red-400 font-bold">
                                    En Juego Ahora ({live.length})
                                  </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {live.map((m) => renderScoreboardCard(m, false, true))}
                                </div>
                              </div>
                            )}

                            {/* Listado de próximos partidos programados ordenados por proximidad */}
                            {scheduled.length === 0 && live.length === 0 ? (
                              <div className="p-6 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                                No hay partidos pendientes en esta categoría. Consulta la pestaña de Finalizados.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {scheduled.map((m) => {
                                  const isRefreshing = refreshingMatchIds.has(m.id);
                                  // Rodear en rojo si es el próximo partido más cercano (y no hay ninguno en vivo) o si fue pulsado desde Inicio
                                  const isClosestRed =
                                    m.id === redHighlightedMatchId || m.id === highlightedMatchId;

                                  return (
                                    <div
                                      key={m.id}
                                      id={`match-${m.id}`}
                                      className={`bg-surface-container-high/70 p-3.5 sm:p-4 flex flex-col justify-between transition-all relative shadow-md ${
                                        isClosestRed
                                          ? 'border-2 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
                                          : 'border border-white/10 hover:border-primary-container/60'
                                      }`}
                                    >
                                      <div>
                                        {/* Cabecera: Jornada, etiqueta Próximo si es el primero, y [Botón Actualizar Icono] + [Icono Casa/Avión] */}
                                        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[10px] font-bold">
                                              J{m.round}
                                            </span>
                                            {m.id === redHighlightedMatchId && (
                                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold uppercase tracking-wider">
                                                Próximo Partido
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRefreshSingleMatch(m.id);
                                              }}
                                              disabled={isRefreshing}
                                              className="w-6 h-6 flex items-center justify-center bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border border-white/15 transition-colors"
                                              title="Comprobar en favoley.net si ha comenzado o actualizar marcador"
                                              aria-label="Actualizar marcador"
                                            >
                                              <span
                                                className={`material-symbols-outlined text-[15px] ${
                                                  isRefreshing ? 'animate-spin text-white' : ''
                                                }`}
                                              >
                                                sync
                                              </span>
                                            </button>

                                            <span
                                              className={`w-6 h-6 flex items-center justify-center border ${
                                                m.isClubHome
                                                  ? 'text-primary bg-primary-container/20 border-primary-container/40'
                                                  : 'text-tertiary bg-white/5 border-white/10'
                                              }`}
                                              title={
                                                m.isClubHome
                                                  ? 'Partido en casa (Pabellón Sergio Scariolo)'
                                                  : `Partido fuera (${m.venue})`
                                              }
                                            >
                                              <span className="material-symbols-outlined text-[15px]">
                                                {m.isClubHome ? 'home' : 'flight'}
                                              </span>
                                            </span>
                                          </div>
                                        </div>

                                        {/* Enfrentamiento con escudos sin recuadro */}
                                        <div className="py-3 space-y-2.5">
                                          <div className="flex items-center gap-2.5" title={m.homeTeam}>
                                            <Image
                                              src={getTeamLogo(m.homeTeam)}
                                              alt={m.homeTeam}
                                              width={30}
                                              height={30}
                                              className="w-7 h-7 object-contain shrink-0"
                                            />
                                            <p
                                              className={`font-headline-sm text-xs sm:text-sm uppercase font-bold truncate ${
                                                m.isClubHome ? 'text-primary' : 'text-white'
                                              }`}
                                            >
                                              {m.homeTeam}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2.5" title={m.awayTeam}>
                                            <Image
                                              src={getTeamLogo(m.awayTeam)}
                                              alt={m.awayTeam}
                                              width={30}
                                              height={30}
                                              className="w-7 h-7 object-contain shrink-0"
                                            />
                                            <p
                                              className={`font-headline-sm text-xs sm:text-sm uppercase font-bold truncate ${
                                                !m.isClubHome ? 'text-primary' : 'text-white'
                                              }`}
                                            >
                                              {m.awayTeam}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Fecha, Sede y Acciones de SOLO Icono */}
                                      <div className="pt-2.5 border-t border-white/10 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="text-tertiary font-semibold">
                                            {formatMadridDate(m.matchDate, {
                                              weekday: 'short',
                                              day: 'numeric',
                                              month: 'short',
                                            })}
                                          </span>
                                          <span className="font-bold text-primary font-mono">
                                            {m.timeStr}h
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-1">
                                          <div className="flex items-center gap-1 text-[11px] text-tertiary min-w-0">
                                            <span className="material-symbols-outlined text-[14px] text-primary shrink-0">
                                              pin_drop
                                            </span>
                                            <span className="truncate" title={m.venue}>
                                              {m.venue}
                                            </span>
                                          </div>

                                          {/* Botones de acción: SOLO ICONOS */}
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                              href={getGoogleCalendarLink(m)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                                              title="Añadir a Google Calendar"
                                              aria-label="Añadir a Google Calendar"
                                            >
                                              <span className="material-symbols-outlined text-[15px] text-primary">
                                                event
                                              </span>
                                            </a>

                                            <button
                                              type="button"
                                              onClick={() => handleDownloadIcs(m)}
                                              className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                                              title="Añadir a la agenda del móvil (.ics)"
                                              aria-label="Añadir al móvil"
                                            >
                                              <span className="material-symbols-outlined text-[15px] text-primary">
                                                smartphone
                                              </span>
                                            </button>

                                            <a
                                              href={getVenueMapsLink(m)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="w-7 h-7 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center transition-all border border-white/10"
                                              title={`Cómo llegar a ${m.venue}`}
                                              aria-label="Cómo llegar al pabellón"
                                            >
                                              <span className="material-symbols-outlined text-[15px]">
                                                directions
                                              </span>
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* PESTAÑA 2: PARTIDOS FINALIZADOS (Ordenados por proximidad: más reciente primero) */}
                        {activeSubTab === 'finished' && (
                          <div>
                            {finished.length === 0 ? (
                              <div className="p-6 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                                Aún no se han disputado partidos con acta oficial cerrada en esta categoría.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {finished.map((m, idx) =>
                                  // Rodear en rojo el más reciente si fue pulsado desde Inicio o es el primero de la lista de finalizados cuando no hay pendientes
                                  renderScoreboardCard(
                                    m,
                                    false,
                                    m.id === highlightedMatchId || (pendingCount === 0 && idx === 0)
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* Sección MVP de la Afición con Jugadora Oficial (Exclusivo Senior Femenino +18) */}
        {mvpPlayer && (
          <section className="bg-surface-container-high border border-primary-container/30 p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500 text-black text-[10px] uppercase font-bold tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">military_tech</span>
                  CAPITANA Y REFERENTE • SENIOR FEMENINO (+18)
                </div>
                <h3 className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
                  {mvpPlayer.firstName} {mvpPlayer.lastName}
                </h3>
                <p className="font-body-md text-xs sm:text-sm text-tertiary leading-relaxed">
                  Capitana del primer equipo Senior Femenino en 1ª División Andaluza, liderando al C.D. Voleibol San Pedro en la competición autonómica oficial.
                </p>
                <div className="flex items-center gap-6 pt-2 text-xs">
                  <div>
                    <span className="text-tertiary uppercase text-[10px] block">Dorsal</span>
                    <span className="font-display-xl text-xl text-primary font-bold">
                      #{mvpPlayer.number}
                    </span>
                  </div>
                  <div>
                    <span className="text-tertiary uppercase text-[10px] block">Categoría</span>
                    <span className="font-headline-sm text-sm text-white font-bold">
                      1ª División Andaluza (Senior)
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <Link
                    href="/fan-zone"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white"
                  >
                    <span>Votar MVP Senior en la Fan-Zone</span>
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
