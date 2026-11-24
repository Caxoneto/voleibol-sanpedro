'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Home,
  MapPin,
  Plane,
  RefreshCw,
  Smartphone,
  Trophy,
  Vote,
} from 'lucide-react';
import {
  CLUB_CATEGORIES_META,
  CLUB_TEAMS_META,
  CLUB_INFO,
  doesMatchBelongToCategory,
  getTeamColorTheme,
} from '@/lib/club-info';
import CategoryTeamSelectorBar from '@/components/CategoryTeamSelectorBar';
import type { FavbMatch } from '@/lib/favb-scraper';
import {
  formatDisplayDate,
  formatMadridDateString,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo, getTeamInitials } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';
import MatchActaModal from '@/components/MatchActaModal';
import { isRestMatch } from '@/lib/match-utils';
import { useStreaming, isValidYouTubeUrl } from '@/lib/use-streaming';
import { sanitizeHttpsUrl } from '@/lib/validators';

interface DisplaySetColumn {
  label: string;
  home: number;
  away: number;
  isCurrent: boolean;
}

type CategorySubTab = 'pending' | 'finished';

const MATCHES_STORAGE_KEY = 'cdv_synced_matches_v8';

function stripMatchRostersForCache(list: FavbMatch[]): FavbMatch[] {
  return list.map(({ homeRoster: _h, awayRoster: _a, ...rest }) => rest);
}

function formatSyncHourMadrid(iso?: string): string {
  try {
    const date = iso ? new Date(iso) : new Date();
    return date.toLocaleTimeString('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return 'Reciente';
  }
}

function PartidosContent() {
  const { recordings } = useStreaming();
  const searchParams = useSearchParams();
  const initialMatchParam = searchParams.get('match') || searchParams.get('partido');
  const rawCategoryParam = searchParams.get('categoria') || searchParams.get('cat');

  const resolvedInitialCategory = useMemo(() => {
    if (rawCategoryParam) return rawCategoryParam;
    return 'cat-senior-fem';
  }, [rawCategoryParam]);

  const [matches, setMatches] = useState<FavbMatch[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [subTabByCategory, setSubTabByCategory] = useState<Record<string, CategorySubTab>>({});
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(initialMatchParam);
  const [refreshingMatchIds, setRefreshingMatchIds] = useState<Set<string>>(new Set());
  const [refreshFeedback, setRefreshFeedback] = useState<{
    matchId: string;
    message: string;
  } | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>(resolvedInitialCategory);
  const [selectedActaMatch, setSelectedActaMatch] = useState<FavbMatch | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const matchesRef = useRef<FavbMatch[]>([]);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrolledMatchParamRef = useRef<string | null>(null);
  const appliedRouteCatRef = useRef<string | null>(null);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    setMounted(true);
    setNowMs(Date.now());
  }, []);

  const showToast = useCallback((matchId: string, message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setRefreshFeedback({ matchId, message });
    feedbackTimerRef.current = setTimeout(() => {
      setRefreshFeedback(null);
      feedbackTimerRef.current = null;
    }, 3500);
  }, []);

  // Actualizar un partido individual sin ?force=true en rutas públicas
  const handleRefreshSingleMatch = useCallback(
    async (matchId: string, silent = false) => {
      if (!silent) {
        setRefreshingMatchIds((prev) => new Set(prev).add(matchId));
      }
      try {
        const res = await fetch(`/api/favb/match/${encodeURIComponent(matchId)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (res.ok && data.success && data.match) {
          setMatches((prev) => {
            const next = prev.map((m) =>
              m.id === data.match.id || m.favbId === data.match.favbId ? { ...m, ...data.match } : m
            );
            try {
              window.localStorage.setItem(
                MATCHES_STORAGE_KEY,
                JSON.stringify({
                  matches: stripMatchRostersForCache(next),
                  lastSync: new Date().toISOString(),
                })
              );
            } catch {
              // Ignorar cuota de localStorage
            }
            return next;
          });
          setSelectedActaMatch((prev) =>
            prev && (prev.id === data.match.id || prev.favbId === data.match.favbId)
              ? { ...prev, ...data.match }
              : prev
          );
          if (!silent) {
            const statusMsg =
              data.match.status === 'LIVE'
                ? 'EN DIRECTO · Marcador actualizado'
                : data.match.status === 'FINISHED'
                ? 'Partido finalizado. Acta cerrada.'
                : 'Marcador al día con la federación';
            showToast(matchId, statusMsg);
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
    },
    [showToast]
  );

  const fetchFavbMatches = useCallback(
    async (manual: boolean) => {
      if (manual) setSyncing(true);
      try {
        const res = await fetch('/api/favb/sync', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.matches)) {
          setMatches(data.matches);
          setLastSyncTime(formatSyncHourMadrid(data.lastSync));
          try {
            window.localStorage.setItem(
              MATCHES_STORAGE_KEY,
              JSON.stringify({
                matches: stripMatchRostersForCache(data.matches as FavbMatch[]),
                lastSync: data.lastSync || new Date().toISOString(),
              })
            );
          } catch {
            // Ignorar cuota de localStorage
          }
          if (manual) {
            showToast('global', 'Partidos, horarios y resultados actualizados.');
          }
          if (initialMatchParam) {
            const updatedTarget = (data.matches as FavbMatch[]).find(
              (m) => m.id === initialMatchParam
            );
            if (updatedTarget && updatedTarget.categoryId) {
              const desiredTab: CategorySubTab =
                updatedTarget.status === 'FINISHED' ? 'finished' : 'pending';
              setSelectedCatId(updatedTarget.categoryId);
              setSubTabByCategory((prev) => ({
                ...prev,
                [updatedTarget.categoryId!]: desiredTab,
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error al sincronizar partidos:', err);
      } finally {
        setLoadingInitial(false);
        if (manual) setSyncing(false);
      }
    },
    [initialMatchParam, showToast]
  );

  // Hidratar inmediatamente desde localStorage y sincronizar al montar
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(MATCHES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
          setMatches(parsed.matches as FavbMatch[]);
          setLoadingInitial(false);
        }
        if (parsed.lastSync) {
          setLastSyncTime(formatSyncHourMadrid(parsed.lastSync));
        }
      }
    } catch {
      // Ignorar errores de localStorage
    }
    void fetchFavbMatches(false);

    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [fetchFavbMatches]);

  // Polling automático cada 45s sin closures obsoletas ni ráfaga paralela simultánea
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const todayStr = formatMadridDateString(new Date());
        const targetMatches = matchesRef.current
          .filter((m) => m.status === 'LIVE' || (m.status === 'SCHEDULED' && m.dateStr === todayStr))
          .slice(0, 6);
        targetMatches.forEach((m, idx) => {
          setTimeout(() => {
            if (!cancelled && document.visibilityState === 'visible') {
              void handleRefreshSingleMatch(m.id, true);
            }
          }, idx * 450);
        });
      }
    }, 45000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [handleRefreshSingleMatch]);

  // Control de navegación desde el carrusel de Inicio (?cat=...&match=...)
  useEffect(() => {
    const routeKey = `${resolvedInitialCategory}::${initialMatchParam || ''}`;

    if (!initialMatchParam) {
      if (appliedRouteCatRef.current !== routeKey) {
        appliedRouteCatRef.current = routeKey;
        if (resolvedInitialCategory) {
          setSelectedCatId(resolvedInitialCategory);
        }
      }
      return;
    }

    setHighlightedMatchId(initialMatchParam);
    const targetMatch = matches.find((m) => m.id === initialMatchParam);
    const targetCatId = targetMatch?.categoryId || resolvedInitialCategory;

    if (appliedRouteCatRef.current !== routeKey && (targetMatch || matches.length > 0 || rawCategoryParam)) {
      appliedRouteCatRef.current = routeKey;
      if (targetCatId) {
        setSelectedCatId(targetCatId);
      }
    }

    if (targetMatch && scrolledMatchParamRef.current !== initialMatchParam) {
      const desiredTab: CategorySubTab =
        targetMatch.status === 'FINISHED' ? 'finished' : 'pending';
      setSubTabByCategory((prev) =>
        prev[targetCatId] === desiredTab ? prev : { ...prev, [targetCatId]: desiredTab }
      );
      scrolledMatchParamRef.current = initialMatchParam;
      const scrollBoth = () => {
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
  }, [resolvedInitialCategory, rawCategoryParam, initialMatchParam, matches]);

  // Seleccionar equipo desde la barra superior de categorías y equipos
  const handleSelectCategoryFromBar = (catId: string) => {
    setSelectedCatId(catId);
    setTimeout(() => {
      const el = document.getElementById(catId) || document.getElementById('active-team-panel');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Descarga de archivo .ics para el móvil
  const handleDownloadIcs = (m: FavbMatch) => {
    const dateIso = m.matchDate || new Date().toISOString();
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
    const dateIso = m.matchDate || new Date().toISOString();
    return generateGoogleCalendarUrl(
      `Voleibol: ${m.homeTeam} vs ${m.awayTeam}`,
      m.venue,
      dateIso
    );
  };

  // Enlace directo de Google Maps para el pabellón del partido (validado https:)
  const getVenueMapsLink = (m: FavbMatch) => {
    const raw =
      m.googleMapsUrl ||
      (m.isClubHome
        ? CLUB_INFO.venueMapsUrl
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${m.venue} ${m.locality || ''}`.trim()
          )}`);
    return sanitizeHttpsUrl(raw, CLUB_INFO.venueMapsUrl);
  };

  // Callback cuando el modal de Acta Oficial actualiza los datos de un partido en vivo
  const handleActaMatchUpdated = (updated: Partial<FavbMatch>) => {
    if (!updated) return;
    setMatches((prev) => {
      const next = prev.map((m) =>
        m.id === updated.id || (updated.favbId && m.favbId === updated.favbId)
          ? { ...m, ...updated }
          : m
      );
      try {
        localStorage.setItem(
          MATCHES_STORAGE_KEY,
          JSON.stringify({
            matches: stripMatchRostersForCache(next),
            lastSync: new Date().toISOString(),
          })
        );
      } catch {
        // Ignorar cuota de localStorage
      }
      return next;
    });
    setSelectedActaMatch((prev) =>
      prev && (prev.id === updated.id || (updated.favbId && prev.favbId === updated.favbId))
        ? { ...prev, ...updated }
        : prev
    );
  };

  // Número de jugadores/as convocados en acta (priorizando nuestro club o el total)
  const getCalledUpCount = (m: FavbMatch): number => {
    const clubSide = m.isClubHome ? m.homeRoster : m.awayRoster;
    if (Array.isArray(clubSide) && clubSide.length > 0) {
      return clubSide.filter((p) => !p.isStaff).length;
    }
    const homeCount = Array.isArray(m.homeRoster) ? m.homeRoster.filter((p) => !p.isStaff).length : 0;
    const awayCount = Array.isArray(m.awayRoster) ? m.awayRoster.filter((p) => !p.isStaff).length : 0;
    if (homeCount + awayCount > 0) {
      return homeCount + awayCount;
    }
    const clubSummaryCount = m.isClubHome ? m.homeRosterCount : m.awayRosterCount;
    if (typeof clubSummaryCount === 'number' && clubSummaryCount > 0) {
      return clubSummaryCount;
    }
    return (m.homeRosterCount ?? 0) + (m.awayRosterCount ?? 0);
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
    return CLUB_CATEGORIES_META.map((cat) => {
      const catTeams = CLUB_TEAMS_META.filter((t) => t.categoryId === cat.id);

      const catMatches = matches.filter((m) => {
        if (doesMatchBelongToCategory(m, cat.id)) return true;
        if (m.categoryId && m.categoryId === cat.id) return true;
        return (
          m.categoryName.toLowerCase().includes(cat.name.toLowerCase()) ||
          cat.name.toLowerCase().includes(m.categoryName.toLowerCase())
        );
      });

      const live = catMatches
        .filter((m) => m.status === 'LIVE')
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      const scheduled = catMatches
        .filter((m) => m.status === 'SCHEDULED' || m.status === 'POSTPONED' || m.status === 'CANCELLED')
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

      const finished = catMatches
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

      const upcomingPlayable = scheduled.filter((m) => {
        if (m.status !== 'SCHEDULED') return false;
        if (nowMs !== null) {
          const isPast12h = nowMs - new Date(m.matchDate).getTime() >= 12 * 60 * 60 * 1000;
          return !isPast12h;
        }
        return true;
      });
      const nextOrLiveMatch = live[0] || upcomingPlayable[0];

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
  }, [matches, nowMs]);

  // Datos del equipo activo seleccionado en la barra superior
  const activeTeamData = useMemo(
    () => categoriesData.find((item) => item.category.id === selectedCatId) || categoriesData[0],
    [categoriesData, selectedCatId]
  );

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
    const rawRecordingUrl = (mounted ? recordings[m.id] : null) || m.videoUrl;
    const recordingUrl = isValidYouTubeUrl(rawRecordingUrl) ? rawRecordingUrl : null;

    const teamTheme = getTeamColorTheme(m.categoryName);
    const displayDate = formatDisplayDate(m.dateStr || m.matchDate);

    return (
      <div
        key={m.id}
        id={`match-${m.id}`}
        className={`bg-surface-container-high/80 p-3.5 sm:p-4 flex flex-col justify-between transition-all shadow-lg relative overflow-hidden ${
          isRedBorder
            ? 'border-2 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.28)]'
            : m.status === 'POSTPONED'
            ? 'border border-amber-500/40 hover:border-amber-500/70'
            : m.status === 'CANCELLED'
            ? 'border border-red-500/40 hover:border-red-500/70'
            : 'border border-white/10 hover:border-primary-container/50'
        }`}
      >
        <div>
          {/* 1. Cabecera: Jornada, Fecha dd/MM/yyyy (+ Hora / Categoría) y a la derecha [Botón Actualizar] + [Icono Casa/Fuera] */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[10px] font-bold shrink-0">
                J{m.round}
              </span>
              <span className="text-[11px] text-white/90 font-mono font-semibold shrink-0">
                {displayDate}
                {m.status !== 'POSTPONED' && m.status !== 'CANCELLED' && m.timeStr
                  ? ` · ${m.timeStr}h`
                  : ''}
              </span>
              {showCategoryName && (
                <span
                  className={`font-bold uppercase text-[11px] truncate ${
                    teamTheme.colorKey ? teamTheme.textClass : 'text-white'
                  }`}
                >
                  {m.categoryName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 relative z-30">
              {/* Botón actualizar: SOLO icono, a la izquierda del icono de casa/fuera, solo si NO ha finalizado */}
              {!isFinished && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRefreshSingleMatch(m.id);
                  }}
                  disabled={isRefreshing}
                  className={`w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                    isLive
                      ? 'bg-red-950/90 hover:bg-red-800 text-red-200 border-red-500/50'
                      : 'bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border-white/15'
                  }`}
                  title={`Actualizar marcador desde ${m.id.startsWith('afade-') ? 'ligaafade.es' : 'favoley.net'}`}
                  aria-label="Actualizar marcador"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              )}

              {/* Icono de En Casa o Fuera */}
              <span
                className={`w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center shrink-0 border ${
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
                {m.isClubHome ? (
                  <Home className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Plane className="w-4 h-4" aria-hidden="true" />
                )}
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
              ) : m.status === 'POSTPONED' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Aplazado
                </span>
              ) : m.status === 'CANCELLED' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Cancelado
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Finalizado
                </span>
              )}
            </div>

            {!(m.status === 'POSTPONED' || m.status === 'CANCELLED') && (
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
            )}
          </div>

          {/* 3. Filas de Equipos a la izquierda + Columnas de Sets (o sello APLAZADO/CANCELADO en flujo flex sin solapes) */}
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="flex-1 min-w-0 space-y-2">
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
                  {m.isClubHome ? (
                    <Link
                      href={`/plantillas?categoria=${m.categoryId}`}
                      className={`text-xs sm:text-sm uppercase truncate font-bold hover:underline underline-offset-2 ${
                        teamTheme.colorKey
                          ? `${teamTheme.textClass} decoration-current`
                          : 'text-primary decoration-primary'
                      }`}
                      title={`Ver plantilla de ${m.categoryName}`}
                    >
                      <span className="sm:hidden font-display-xl text-base tracking-wider">
                        {getTeamInitials(m.homeTeam)}
                      </span>
                      <span className="hidden sm:inline">{m.homeTeam}</span>
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm uppercase truncate text-white font-semibold">
                      <span className="sm:hidden font-display-xl text-base tracking-wider">
                        {getTeamInitials(m.homeTeam)}
                      </span>
                      <span className="hidden sm:inline">{m.homeTeam}</span>
                    </span>
                  )}
                </div>

                {!(m.status === 'POSTPONED' || m.status === 'CANCELLED') && (
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
                )}
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
                  {!m.isClubHome ? (
                    <Link
                      href={`/plantillas?categoria=${m.categoryId}`}
                      className={`text-xs sm:text-sm uppercase truncate font-bold hover:underline underline-offset-2 ${
                        teamTheme.colorKey
                          ? `${teamTheme.textClass} decoration-current`
                          : 'text-primary decoration-primary'
                      }`}
                      title={`Ver plantilla de ${m.categoryName}`}
                    >
                      <span className="sm:hidden font-display-xl text-base tracking-wider">
                        {getTeamInitials(m.awayTeam)}
                      </span>
                      <span className="hidden sm:inline">{m.awayTeam}</span>
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm uppercase truncate text-white font-semibold">
                      <span className="sm:hidden font-display-xl text-base tracking-wider">
                        {getTeamInitials(m.awayTeam)}
                      </span>
                      <span className="hidden sm:inline">{m.awayTeam}</span>
                    </span>
                  )}
                </div>

                {!(m.status === 'POSTPONED' || m.status === 'CANCELLED') && (
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
                )}
              </div>
            </div>

            {/* Sello de APLAZADO / CANCELADO en flujo normal a la derecha */}
            {(m.status === 'POSTPONED' || m.status === 'CANCELLED') && (
              <div className="pointer-events-none shrink-0 flex items-center justify-end">
                <div
                  className={`-rotate-3 sm:-rotate-6 transform px-2.5 sm:px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.14em] uppercase font-black shadow-[0_4px_16px_rgba(0,0,0,0.75)] select-none rounded-[2px] ${
                    m.status === 'CANCELLED'
                      ? 'bg-red-950/95 text-red-200 border-red-500'
                      : 'bg-amber-500/95 text-black border-amber-200'
                  }`}
                >
                  {m.statusText?.toUpperCase() || (m.status === 'CANCELLED' ? 'CANCELADO' : 'APLAZADO')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie de tarjeta con sede enlazada directamente a Google Maps y barra de acciones */}
        <div className="pt-2.5 mt-2 border-t border-white/5 space-y-2 text-[11px] text-tertiary">
          {/* Pabellón + Pista + Localidad enlazados directamente a Google Maps */}
          <a
            href={getVenueMapsLink(m)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-start gap-1.5 w-full max-w-full min-w-0 text-[11px] text-tertiary hover:text-white transition-colors group/venue"
            title={`Abrir ubicación de ${m.venue} en Google Maps`}
          >
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
              {m.court && (
                <span className="px-1.5 py-0.5 bg-primary-container/25 border border-primary-container/50 text-primary font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                  {m.court}
                </span>
              )}
              {m.locality && !m.venue.toLowerCase().includes(m.locality.toLowerCase()) && (
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/80 text-[10px] font-semibold shrink-0">
                  {m.locality}
                </span>
              )}
              <span className="text-[11px] text-tertiary group-hover/venue:text-primary group-hover/venue:underline break-words leading-snug min-w-0">
                {m.venue}
              </span>
            </span>
          </a>

          {/* Barra inferior de acciones */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedActaMatch(m);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Ver Acta / Convocatoria</span>
              {getCalledUpCount(m) > 0 && (
                <span className="px-1.5 py-0.5 bg-black/40 text-white font-mono text-[10px]">
                  {getCalledUpCount(m)} conv.
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 shrink-0 relative z-30">
              {recordingUrl && isValidYouTubeUrl(recordingUrl) && (
                <a
                  href={recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-none transition-colors shadow-sm"
                  title="Ver partido en diferido en YouTube"
                  aria-label="Ver partido en diferido"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>Ver partido</span>
                </a>
              )}

              <a
                href={sanitizeHttpsUrl(m.favbUrl, CLUB_INFO.federationUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 sm:w-9 sm:h-9 bg-surface-container-highest hover:bg-primary-container text-primary hover:text-white flex items-center justify-center border border-white/10 transition-colors"
                title={m.id.startsWith('afade-') ? 'Ver información oficial en ligaafade.es' : 'Ver acta oficial en favoley.net'}
                aria-label={m.id.startsWith('afade-') ? 'Ver información oficial en ligaafade.es' : 'Ver acta oficial en favoley.net'}
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>


      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-background relative overflow-x-clip">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Top Hero Banner Compacto */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-4 sm:py-6 border-b border-white/5 overflow-hidden">
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary-container text-white text-[10px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                ACTAS OFICIALES FAVB
              </span>
              <span className="text-[11px] text-tertiary uppercase tracking-wider">
                2026 / 2027
              </span>
            </div>
            <h1 className="font-display-xl text-2xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-none">
              <span className="text-white">PARTIDOS Y </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                RESULTADOS
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* Notificación flotante de feedback al actualizar marcador */}
      {refreshFeedback && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 bg-[#161616] border-2 border-primary-container text-white px-4 py-3 shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {refreshFeedback.message}
          </span>
        </div>
      )}

      {/* Selector Rápido de Categorías -> Equipos (Sticky) + Botón Actualizar */}
      <CategoryTeamSelectorBar
        items={CLUB_CATEGORIES_META}
        selectedValue={selectedCatId}
        valueKey="id"
        onSelect={handleSelectCategoryFromBar}
        idPrefix="cat-pill-"
        defaultOpenSelected
        ariaLabel="Categorías de partidos"
        rightSlot={
          <button
            type="button"
            onClick={() => void fetchFavbMatches(true)}
            disabled={syncing}
            className="flex w-10 h-10 sm:w-9 sm:h-9 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] transition-all shrink-0 cursor-pointer"
            title={`Actualizar marcadores oficiales (FAVB y Liga AFADE) (Última: ${lastSyncTime})`}
            aria-label="Actualizar resultados"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 sm:py-5 space-y-5 relative z-10">
        {/* MÓDULO DESTACADO: PARTIDOS EN DIRECTO AHORA */}
        {allLiveMatches.length > 0 && (
          <section className="bg-red-950/20 border-2 border-red-500 p-3.5 sm:p-5 shadow-2xl relative animate-fade-in">
            <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-red-500/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="font-display-xl text-lg sm:text-xl uppercase text-white font-bold tracking-wide">
                EN DIRECTO ({allLiveMatches.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allLiveMatches.map((m) => renderScoreboardCard(m, true, true))}
            </div>
          </section>
        )}

        {/* NÚCLEO: VISTA DIRECTA DEL EQUIPO SELECCIONADO EN LA BARRA SUPERIOR */}
        <section id="active-team-panel" className="min-h-[640px] space-y-3 scroll-mt-44">
          {loadingInitial && matches.length === 0 ? (
            <div className="min-h-[560px] bg-surface-container-low border border-primary-container/60 p-8 text-center flex flex-col items-center justify-center gap-3 shadow-xl">
              <RefreshCw className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
              <p className="text-xs uppercase font-bold tracking-wider text-white">
                Cargando partidos oficiales...
              </p>
            </div>
          ) : activeTeamData && (() => {
            const { category, team, live, scheduled, finished, redHighlightedMatchId } = activeTeamData;
            const pendingCount = live.length + scheduled.length;
            const activeSubTab: CategorySubTab =
              subTabByCategory[category.id] || (pendingCount > 0 ? 'pending' : 'finished');
            const teamTheme = getTeamColorTheme(category.name);

            return (
              <div
                id={category.id}
                className="bg-surface-container-low border border-primary-container/60 shadow-xl scroll-mt-44"
              >
                {/* Cabecera unificada: Nombre equipo con color + Competición + Pendientes/Finalizados */}
                <div className="p-3.5 sm:p-4 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    {teamTheme.colorKey && (
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${teamTheme.dotClass} ${
                          teamTheme.colorKey === 'NEGRO' ? 'ring-1 ring-white/80' : ''
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <h2
                      className={`font-display-xl text-lg sm:text-2xl uppercase tracking-wide leading-tight ${
                        teamTheme.colorKey ? teamTheme.textClass : 'text-white'
                      }`}
                    >
                      {category.name}
                    </h2>
                    <span className="px-2 py-0.5 bg-surface-container-high border border-white/10 text-[11px] font-semibold text-zinc-300">
                      {team?.division || 'FAVB'}
                    </span>
                    {live.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 bg-red-950/90 border border-red-400/60 px-2 py-0.5 text-[10px] text-red-200 font-bold uppercase tracking-wider animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span>EN JUEGO ({live.length})</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setSubTabByCategory((prev) => ({
                          ...prev,
                          [category.id]: 'pending',
                        }))
                      }
                      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${
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
                      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border active:translate-x-[1px] active:translate-y-[1px] cursor-pointer ${
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
                </div>

                {/* Contenido del Equipo: Pestaña Pendientes o Finalizados */}
                <div className="p-3.5 sm:p-5 space-y-4">
                  {/* PESTAÑA 1: PARTIDOS PENDIENTES (EN JUEGO + PRÓXIMOS) */}
                  {activeSubTab === 'pending' && (
                    <div className="space-y-4">
                      {live.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <h3 className="font-headline-sm text-xs uppercase text-red-400 font-bold">
                              En Juego Ahora ({live.length})
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {live.map((m) => renderScoreboardCard(m, false, true))}
                          </div>
                        </div>
                      )}

                      {scheduled.length === 0 && live.length === 0 ? (
                        <div className="p-5 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                          No hay partidos pendientes en esta categoría.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {scheduled.map((m) => {
                            const formattedCardDate = formatDisplayDate(m.dateStr || m.matchDate);

                            if (isRestMatch(m)) {
                              const clubTeam = m.homeTeam?.toLowerCase().includes('san pedro') ? m.homeTeam : m.awayTeam;
                              return (
                                <div
                                  key={m.id}
                                  id={`match-${m.id}`}
                                  className="bg-surface-container-high/70 border border-sky-500/40 hover:border-sky-500/70 p-3.5 sm:p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-md"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[10px] font-bold shrink-0">
                                          J{m.round}
                                        </span>
                                        <span className="text-[11px] text-white/90 font-mono font-semibold shrink-0">
                                          {formattedCardDate}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-sky-950/90 text-sky-200 border border-sky-400/50 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                          Descanso
                                        </span>
                                      </div>
                                    </div>

                                    <div className="py-4 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Image
                                          src={getTeamLogo(clubTeam)}
                                          alt={clubTeam}
                                          width={30}
                                          height={30}
                                          className="w-7 h-7 object-contain shrink-0"
                                        />
                                        <p
                                          className={`font-headline-sm text-xs sm:text-sm uppercase font-bold truncate ${
                                            teamTheme.colorKey ? teamTheme.textClass : 'text-white'
                                          }`}
                                        >
                                          {clubTeam}
                                        </p>
                                      </div>

                                      {/* Sello DESCANSO en flujo flex */}
                                      <div className="pointer-events-none shrink-0 flex items-center justify-end">
                                        <div className="-rotate-3 sm:-rotate-6 transform px-2.5 sm:px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.14em] uppercase font-black shadow-[0_4px_16px_rgba(0,0,0,0.75)] select-none rounded-[2px] bg-sky-500/95 text-black border-sky-200">
                                          DESCANSO
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const isRefreshing = refreshingMatchIds.has(m.id);
                            const isClosestRed =
                              m.id === redHighlightedMatchId || m.id === highlightedMatchId;
                            const rawRecordingUrl = (mounted ? recordings[m.id] : null) || m.videoUrl;
                            const recordingUrl = isValidYouTubeUrl(rawRecordingUrl) ? rawRecordingUrl : null;

                            return (
                              <div
                                key={m.id}
                                id={`match-${m.id}`}
                                className={`bg-surface-container-high/70 p-3.5 sm:p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-md ${
                                  isClosestRed
                                    ? 'border-2 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
                                    : m.status === 'POSTPONED'
                                    ? 'border border-amber-500/40 hover:border-amber-500/70'
                                    : m.status === 'CANCELLED'
                                    ? 'border border-red-500/40 hover:border-red-500/70'
                                    : 'border border-white/10 hover:border-primary-container/60'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[10px] font-bold shrink-0">
                                        J{m.round}
                                      </span>
                                      <span className="text-[11px] text-white/90 font-mono font-semibold shrink-0">
                                        {formattedCardDate}
                                        {m.status !== 'POSTPONED' && m.status !== 'CANCELLED' && m.timeStr
                                          ? ` · ${m.timeStr}h`
                                          : ''}
                                      </span>
                                      {m.id === redHighlightedMatchId && m.status === 'SCHEDULED' && (
                                        <span className="px-1.5 py-0.5 bg-red-950/90 text-red-200 border border-red-400/50 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                          Próximo Partido
                                        </span>
                                      )}
                                      {m.status === 'POSTPONED' && (
                                        <span className="px-1.5 py-0.5 bg-amber-950/90 text-amber-200 border border-amber-400/50 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                          Aplazado
                                        </span>
                                      )}
                                      {m.status === 'CANCELLED' && (
                                        <span className="px-1.5 py-0.5 bg-red-950/90 text-red-200 border border-red-400/50 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                          Cancelado
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 relative z-30">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleRefreshSingleMatch(m.id);
                                        }}
                                        disabled={isRefreshing}
                                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white border border-white/15 transition-colors cursor-pointer"
                                        title="Comprobar marcador oficial"
                                        aria-label="Actualizar marcador"
                                      >
                                        <RefreshCw
                                          className={`w-3.5 h-3.5 ${
                                            isRefreshing ? 'animate-spin text-white' : ''
                                          }`}
                                          aria-hidden="true"
                                        />
                                      </button>

                                      <span
                                        className={`w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center border ${
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
                                        {m.isClubHome ? (
                                          <Home className="w-4 h-4" aria-hidden="true" />
                                        ) : (
                                          <Plane className="w-4 h-4" aria-hidden="true" />
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="py-3 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0" title={m.homeTeam}>
                                        <Image
                                          src={getTeamLogo(m.homeTeam)}
                                          alt={m.homeTeam}
                                          width={30}
                                          height={30}
                                          className="w-7 h-7 object-contain shrink-0"
                                        />
                                        {m.isClubHome ? (
                                          <Link
                                            href={`/plantillas?categoria=${m.categoryId}`}
                                            className={`font-headline-sm text-xs sm:text-sm uppercase font-bold truncate hover:underline underline-offset-2 ${
                                              teamTheme.colorKey
                                                ? `${teamTheme.textClass} decoration-current`
                                                : 'text-primary decoration-primary'
                                            }`}
                                            title={`Ver plantilla de ${m.categoryName}`}
                                          >
                                            {m.homeTeam}
                                          </Link>
                                        ) : (
                                          <p className="font-headline-sm text-xs sm:text-sm uppercase font-bold truncate text-white">
                                            {m.homeTeam}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2.5 min-w-0" title={m.awayTeam}>
                                        <Image
                                          src={getTeamLogo(m.awayTeam)}
                                          alt={m.awayTeam}
                                          width={30}
                                          height={30}
                                          className="w-7 h-7 object-contain shrink-0"
                                        />
                                        {!m.isClubHome ? (
                                          <Link
                                            href={`/plantillas?categoria=${m.categoryId}`}
                                            className={`font-headline-sm text-xs sm:text-sm uppercase font-bold truncate hover:underline underline-offset-2 ${
                                              teamTheme.colorKey
                                                ? `${teamTheme.textClass} decoration-current`
                                                : 'text-primary decoration-primary'
                                            }`}
                                            title={`Ver plantilla de ${m.categoryName}`}
                                          >
                                            {m.awayTeam}
                                          </Link>
                                        ) : (
                                          <p className="font-headline-sm text-xs sm:text-sm uppercase font-bold truncate text-white">
                                            {m.awayTeam}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Sello de APLAZADO / CANCELADO en flujo normal sin solapar equipos */}
                                    {(m.status === 'POSTPONED' || m.status === 'CANCELLED') && (
                                      <div className="pointer-events-none shrink-0 flex items-center justify-end">
                                        <div
                                          className={`-rotate-3 sm:-rotate-6 transform px-2.5 sm:px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.14em] uppercase font-black shadow-[0_4px_16px_rgba(0,0,0,0.75)] select-none rounded-[2px] ${
                                            m.status === 'CANCELLED'
                                              ? 'bg-red-950/95 text-red-200 border-red-500'
                                              : 'bg-amber-500/95 text-black border-amber-200'
                                          }`}
                                        >
                                          {m.statusText?.toUpperCase() ||
                                            (m.status === 'CANCELLED' ? 'CANCELADO' : 'APLAZADO')}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2.5 border-t border-white/10 space-y-2 text-xs">
                                  {/* Pabellón + Pista + Localidad enlazados directamente a Google Maps */}
                                  <a
                                    href={getVenueMapsLink(m)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-start gap-1.5 w-full max-w-full min-w-0 text-[11px] text-tertiary hover:text-white transition-colors group/venue"
                                    title={`Abrir ubicación de ${m.venue} en Google Maps`}
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                                    <span className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                                      {m.court && (
                                        <span className="px-1.5 py-0.5 bg-primary-container/25 border border-primary-container/50 text-primary font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                                          {m.court}
                                        </span>
                                      )}
                                      {m.locality && !m.venue.toLowerCase().includes(m.locality.toLowerCase()) && (
                                        <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/80 text-[10px] font-semibold shrink-0">
                                          {m.locality}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-tertiary group-hover/venue:text-primary group-hover/venue:underline break-words leading-snug min-w-0">
                                        {m.venue}
                                      </span>
                                    </span>
                                  </a>

                                  {/* Barra inferior unificada: Acta / Convocatoria + acciones de vídeo y calendario */}
                                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedActaMatch(m);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span>Ver Acta / Convocatoria</span>
                                      {getCalledUpCount(m) > 0 && (
                                        <span className="px-1.5 py-0.5 bg-black/40 text-white font-mono text-[10px]">
                                          {getCalledUpCount(m)} conv.
                                        </span>
                                      )}
                                    </button>

                                    <div className="flex items-center gap-1.5 shrink-0 relative z-30">
                                      {recordingUrl && isValidYouTubeUrl(recordingUrl) && (
                                        <a
                                          href={recordingUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-none transition-colors shadow-sm"
                                          title="Ver partido en diferido en YouTube"
                                          aria-label="Ver partido en diferido"
                                        >
                                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                          </svg>
                                          <span className="hidden sm:inline">Ver partido</span>
                                        </a>
                                      )}

                                      <a
                                        href={getGoogleCalendarLink(m)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 sm:w-9 sm:h-9 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                                        title="Añadir a Google Calendar"
                                        aria-label="Añadir a Google Calendar"
                                      >
                                        <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                                      </a>

                                      <button
                                        type="button"
                                        onClick={() => handleDownloadIcs(m)}
                                        className="w-10 h-10 sm:w-9 sm:h-9 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container cursor-pointer"
                                        title="Añadir a la agenda del móvil (.ics)"
                                        aria-label="Añadir al móvil"
                                      >
                                        <Smartphone className="w-4 h-4 text-primary" aria-hidden="true" />
                                      </button>
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

                  {/* PESTAÑA 2: PARTIDOS FINALIZADOS */}
                  {activeSubTab === 'finished' && (
                    <div>
                      {finished.length === 0 ? (
                        <div className="p-5 bg-surface-container-high/40 text-center text-xs text-tertiary border border-white/5">
                          Aún no hay partidos finalizados en esta categoría.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {finished.map((m, idx) =>
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
              </div>
            );
          })()}

          {/* Fuente Oficial y Leyenda de Iconos */}
          <div className="mt-2 py-2 px-3 bg-surface-container-low/70 border border-white/5 flex flex-wrap items-center justify-between text-[11px] text-tertiary gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>
                Fuente oficial: <strong className="text-white/80">FAVB (favoley.net)</strong>
              </span>
              <span className="font-mono text-[10px] text-tertiary/85">
                · {lastSyncTime}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-white/90">
              <span
                className="flex items-center gap-1.5"
                title="Partido jugado en el Pabellón Polideportivo Sergio Scariolo"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-primary-container/20 text-primary border border-primary-container/30">
                  <Home className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span>En Casa</span>
              </span>
              <span
                className="flex items-center gap-1.5"
                title="Partido jugado fuera de casa (a domicilio)"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-white/5 text-tertiary border border-white/10">
                  <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span>Fuera</span>
              </span>
            </div>
          </div>
        </section>

        {/* Invitación compacta a votación MVP oficial en Fan-Zone */}
        <section className="bg-surface-container-high border border-primary-container/30 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500 text-black text-[10px] uppercase font-bold tracking-wider shrink-0">
              <Trophy className="w-3 h-3" aria-hidden="true" />
              <span>MVP Senior (+18)</span>
            </span>
            <p className="text-xs sm:text-sm font-bold uppercase text-white truncate">
              Elige a la MVP del último encuentro en la Fan-Zone
            </p>
          </div>
          <Link
            href="/fan-zone"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] transition-colors shrink-0"
          >
            <Vote className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Votar MVP</span>
          </Link>
        </section>
      </div>

      <div className="relative z-10">
        <SponsorBanner customText="APOYA AL C.D. VOLEIBOL SAN PEDRO EN TODAS SUS CATEGORÍAS" />
      </div>

      {/* Modal de Acta Oficial y Convocatorias */}
      {selectedActaMatch && (
        <MatchActaModal
          match={selectedActaMatch}
          onClose={() => setSelectedActaMatch(null)}
          onMatchUpdated={handleActaMatchUpdated}
        />
      )}
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
