'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  INITIAL_CATEGORIES,
  INITIAL_TEAMS,
  INITIAL_MATCHES,
  CLUB_INFO,
} from '@/lib/data-store';
import { Match } from '@/lib/types';
import {
  formatMadridDate,
  formatMadridTime,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';
import { isRestMatch } from '@/lib/match-utils';
import { useStreaming, isValidYouTubeUrl } from '@/lib/use-streaming';
import jsPDF from 'jspdf';

interface RoundSummary {
  round: number;
  matches: Match[];
  dateLabel: string;
  hasPending: boolean;
  allFinished: boolean;
  earliestPendingTime: number;
}

const MATCHES_STORAGE_KEY = 'cdv_synced_matches_v1';

export default function CalendarioPage() {
  const { recordings } = useStreaming();
  const [allMatches, setAllMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'LOCAL' | 'VISITANTE'>('ALL');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roundsScrollRef = useRef<HTMLDivElement | null>(null);
  const catScrollRef = useRef<HTMLDivElement | null>(null);

  const applyLiveMatches = (liveList: Array<Record<string, unknown>>) => {
    const liveMap = new Map(liveList.map((lm) => [String(lm.id), lm]));
    const merged: Match[] = INITIAL_MATCHES.map((m) => {
      const live = liveMap.get(m.id);
      if (!live) return m;
      return {
        ...m,
        homeTeamName: typeof live.homeTeam === 'string' && live.homeTeam ? live.homeTeam : m.homeTeamName,
        awayTeamName: typeof live.awayTeam === 'string' && live.awayTeam ? live.awayTeam : m.awayTeamName,
        isClubHome: typeof live.isClubHome === 'boolean' ? live.isClubHome : m.isClubHome,
        matchDate: typeof live.matchDate === 'string' && live.matchDate ? live.matchDate : m.matchDate,
        venueName: typeof live.venue === 'string' && live.venue ? live.venue : m.venueName,
        status:
          live.status === 'FINISHED' ||
          live.status === 'LIVE' ||
          live.status === 'SCHEDULED' ||
          live.status === 'POSTPONED' ||
          live.status === 'CANCELLED'
            ? (live.status as Match['status'])
            : m.status,
        statusText: typeof live.statusText === 'string' ? live.statusText : m.statusText,
        setScores:
          Array.isArray(live.setScores) && live.setScores.length > 0
            ? (live.setScores as { home: number; away: number }[])
            : m.setScores,
      };
    });
    setAllMatches(merged);
  };

  const fetchLiveCalendarMatches = async (force = false) => {
    if (force) setSyncing(true);
    try {
      const res = await fetch(`/api/favb/sync?force=${force}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
        applyLiveMatches(data.matches);
        const formattedTime = data.lastSync
          ? new Date(data.lastSync).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(formattedTime);

        try {
          localStorage.setItem(
            MATCHES_STORAGE_KEY,
            JSON.stringify({
              matches: data.matches,
              lastSync: data.lastSync || new Date().toISOString(),
            })
          );
        } catch {
          // Ignorar límite de localStorage
        }

        if (force) {
          const isAfade = selectedCategory.includes('afade');
          setSyncFeedback(
            `Calendario, horarios y resultados sincronizados con ${isAfade ? 'ligaafade.es' : 'las competiciones oficiales (FAVB y Liga AFADE)'}`
          );
          setTimeout(() => setSyncFeedback(null), 3500);
        }
      }
    } catch {
      if (force) {
        setSyncFeedback('Mostrando último calendario oficial sincronizado.');
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem(MATCHES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
          applyLiveMatches(parsed.matches);
        }
        if (parsed.lastSync) {
          setLastSyncTime(
            new Date(parsed.lastSync).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      }
    } catch {
      // Ignorar error de lectura
    }

    fetchLiveCalendarMatches(false);
  }, []);

  // Cerrar modal del Pabellón con tecla Escape
  useEffect(() => {
    if (!showVenueModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowVenueModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVenueModal]);

  // 1. Partidos filtrados por categoría y condición (Local / Visitante)
  const filteredMatches = useMemo(() => {
    return allMatches.filter((match) => {
      if (selectedCategory !== 'ALL') {
        const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
        if (!team || team.categoryId !== selectedCategory) return false;
      }
      if (conditionFilter === 'LOCAL' && !match.isClubHome) return false;
      if (conditionFilter === 'VISITANTE' && match.isClubHome) return false;

      return true;
    }).sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }, [allMatches, selectedCategory, conditionFilter]);

  // 2. Agrupación por Jornadas (J1, J2, J3...) para no sobrecargar el DOM en móvil
  const roundsData = useMemo<RoundSummary[]>(() => {
    const byRound = new Map<number, Match[]>();
    for (const m of filteredMatches) {
      const list = byRound.get(m.round) || [];
      list.push(m);
      byRound.set(m.round, list);
    }

    const summaries: RoundSummary[] = [];
    const sortedRoundNums = Array.from(byRound.keys()).sort((a, b) => a - b);

    for (const roundNum of sortedRoundNums) {
      const roundMatches = (byRound.get(roundNum) || []).sort(
        (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      );
      const playablePending = roundMatches.filter((m) => {
        if (m.status === 'FINISHED' || m.status === 'POSTPONED' || m.status === 'CANCELLED') return false;
        const isPast12h = Date.now() - new Date(m.matchDate).getTime() >= 12 * 60 * 60 * 1000;
        if (m.status === 'SCHEDULED' && isPast12h) return false;
        return true;
      });
      const pending = roundMatches.filter((m) => m.status !== 'FINISHED');
      const firstMatch = roundMatches[0];
      const dateLabel = firstMatch
        ? formatMadridDate(firstMatch.matchDate, { day: 'numeric', month: 'short' })
        : '';

      summaries.push({
        round: roundNum,
        matches: roundMatches,
        dateLabel,
        hasPending: pending.length > 0,
        allFinished: pending.length === 0 && roundMatches.length > 0,
        earliestPendingTime:
          playablePending.length > 0
            ? new Date(playablePending[0].matchDate).getTime()
            : pending.length > 0
            ? new Date(pending[0].matchDate).getTime()
            : Number.POSITIVE_INFINITY,
      });
    }

    return summaries;
  }, [filteredMatches]);

  // 3. Jornada recomendada por defecto: la jornada del próximo partido pendiente más cercano
  const recommendedRound = useMemo<number | null>(() => {
    if (roundsData.length === 0) return null;
    const withPending = roundsData
      .filter((r) => r.hasPending)
      .sort((a, b) => a.earliestPendingTime - b.earliestPendingTime);

    if (withPending.length > 0) {
      return withPending[0].round;
    }
    return roundsData[roundsData.length - 1].round;
  }, [roundsData]);

  // Actualizar jornada activa cuando cambia la categoría o si la jornada seleccionada no existe en el filtro actual
  useEffect(() => {
    if (roundsData.length === 0) {
      setSelectedRound(null);
      return;
    }
    const exists = selectedRound !== null && roundsData.some((r) => r.round === selectedRound);
    if (!exists) {
      setSelectedRound(recommendedRound);
    }
  }, [roundsData, recommendedRound, selectedRound]);

  // Al cambiar de categoría, ir directamente a la próxima jornada pendiente de esa categoría
  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedRound(null); // Fuerza recalcular la próxima jornada pendiente para la nueva categoría
  };

  // Centrar automáticamente la categoría seleccionada en el carrusel horizontal
  useEffect(() => {
    const container = catScrollRef.current;
    const pill = document.getElementById(`cal-cat-pill-${selectedCategory}`);
    if (container && pill) {
      const targetLeft = pill.offsetLeft - (container.clientWidth - pill.clientWidth) / 2;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollTo({ left: Math.max(0, Math.min(maxScroll, targetLeft)), behavior: 'smooth' });
    }
  }, [selectedCategory]);

  const activeRound = selectedRound ?? recommendedRound;

  // Centrar automáticamente el botón de la jornada activa en la barra horizontal
  useEffect(() => {
    if (activeRound === null) return;
    const container = roundsScrollRef.current;
    const pill = document.getElementById(`round-pill-${activeRound}`);
    if (container && pill) {
      const targetLeft = pill.offsetLeft - container.clientWidth / 2 + pill.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activeRound, selectedCategory, conditionFilter]);

  const currentRoundObj = useMemo(
    () => roundsData.find((r) => r.round === activeRound) || roundsData[0] || null,
    [roundsData, activeRound]
  );

  const currentRoundIndex = useMemo(
    () => (currentRoundObj ? roundsData.findIndex((r) => r.round === currentRoundObj.round) : -1),
    [roundsData, currentRoundObj]
  );

  const prevRoundObj = currentRoundIndex > 0 ? roundsData[currentRoundIndex - 1] : null;
  const nextRoundObj =
    currentRoundIndex >= 0 && currentRoundIndex < roundsData.length - 1
      ? roundsData[currentRoundIndex + 1]
      : null;

  const displayedMatches = currentRoundObj ? currentRoundObj.matches : [];

  // Descargar archivo compatible con móviles (iCal)
  const handleDownloadIcs = (match: Match) => {
    const icsString = generateIcsContent(
      `${match.homeTeamName} vs ${match.awayTeamName}`,
      match.venueName,
      match.matchDate,
      match.id
    );
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `partido-san-pedro-j${match.round}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar calendario completo para el móvil
  const handleDownloadFullCalendarIcs = () => {
    const events = filteredMatches
      .map((m) =>
        generateIcsContent(
          `${m.homeTeamName} vs ${m.awayTeamName}`,
          m.venueName,
          m.matchDate,
          m.id
        )
      )
      .join('\n');

    const blob = new Blob([events], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendario-cd-voleibol-san-pedro.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar calendario en PDF oficial
  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Fondo y cabecera
    doc.setFillColor(19, 19, 19);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(217, 4, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('C.D. VOLEIBOL SAN PEDRO', 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CALENDARIO OFICIAL DE COMPETICIÓN • TEMPORADA 2026 / 2027', 15, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      'Federación Andaluza de Voleibol (FAVB) • Pabellón Polideportivo Sergio Scariolo',
      15,
      30
    );

    // Tabla de Partidos
    let y = 46;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('JORNADA', 15, y);
    doc.text('FECHA Y HORA', 40, y);
    doc.text('ENFRENTAMIENTO', 85, y);
    doc.text('SEDE', 155, y);

    doc.setDrawColor(217, 4, 41);
    doc.setLineWidth(0.5);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredMatches.forEach((m) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const fecha = `${formatMadridDate(m.matchDate, {
        day: '2-digit',
        month: '2-digit',
      })} ${formatMadridTime(m.matchDate)}h`;
      const versus = `${m.homeTeamName} vs ${m.awayTeamName}`;
      const sede = m.isClubHome ? 'Sergio Scariolo (LOCAL)' : m.venueName.substring(0, 28);

      if (m.isClubHome) {
        doc.setFillColor(254, 242, 242);
        doc.rect(14, y - 4, 182, 7, 'F');
      }

      doc.setTextColor(30, 30, 30);
      doc.text(`Jor. ${m.round}`, 15, y);
      doc.text(fecha, 40, y);
      doc.text(versus, 85, y);
      doc.text(sede, 155, y);

      y += 8;
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-ES')} desde www.voleibolsanpedro.com`,
      15,
      285
    );

    doc.save('calendario-cd-voleibol-san-pedro.pdf');
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Strip */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-5 sm:py-8 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-3xl min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[10px] sm:text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                TEMPORADA OFICIAL 2026 / 2027
              </span>
            </div>
            <h1 className="font-display-xl text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none mt-1">
              <span className="text-white">CALENDARIO DE </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                COMPETICIÓN
              </span>
            </h1>
          </div>

          {/* Quick Action Utilities: Compact Icon-Only Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadFullCalendarIcs}
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container"
              title="Guardar calendario completo en mi móvil (iPhone, Android, Outlook)"
              aria-label="Guardar calendario en mi móvil"
            >
              <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">
                smartphone
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container"
              title="Exportar calendario en PDF imprimible"
              aria-label="Exportar PDF"
            >
              <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">
                picture_as_pdf
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="w-9 h-9 flex items-center justify-center bg-primary-container hover:bg-secondary-container text-white transition-all shadow-xl border border-white/15"
              title="Cómo llegar al Pabellón Polideportivo Sergio Scariolo"
              aria-label="Cómo llegar al Pabellón"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">near_me</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Toolbar (Categorías + Condición) */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Categorías */}
          <div
            ref={catScrollRef}
            className="flex items-center gap-2 overflow-x-auto category-scrollbar pb-1 sm:pb-1.5 scroll-smooth snap-x snap-mandatory w-full md:flex-1"
          >
            <button
              id="cal-cat-pill-ALL"
              onClick={() => handleSelectCategory('ALL')}
              aria-pressed={selectedCategory === 'ALL'}
              className={`w-[calc(100%-4.5rem)] sm:w-auto snap-center first:snap-start last:snap-end flex items-center justify-center text-center px-3.5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-primary-container text-white shadow-[2px_2px_0px_0px_#0e0e0e]'
                  : 'bg-surface-container-high text-tertiary hover:text-white'
              }`}
            >
              Todas las categorías
            </button>
            {INITIAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`cal-cat-pill-${cat.id}`}
                onClick={() => handleSelectCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={`w-[calc(100%-4.5rem)] sm:w-auto snap-center first:snap-start last:snap-end flex items-center justify-center text-center px-3.5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-primary-container text-white shadow-[2px_2px_0px_0px_#0e0e0e]'
                    : 'bg-surface-container-high text-tertiary hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Condición */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 w-full md:w-auto">
            <div className="flex items-center bg-surface-container-high p-0.5 border border-white/5 flex-1 sm:flex-initial">
              <button
                onClick={() => setConditionFilter('ALL')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 text-xs font-bold uppercase transition-colors ${
                  conditionFilter === 'ALL'
                    ? 'bg-white text-black'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setConditionFilter('LOCAL')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 text-xs font-bold uppercase transition-colors ${
                  conditionFilter === 'LOCAL'
                    ? 'bg-primary-container text-white'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Local (Scariolo)
              </button>
              <button
                onClick={() => setConditionFilter('VISITANTE')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 text-xs font-bold uppercase transition-colors ${
                  conditionFilter === 'VISITANTE'
                    ? 'bg-white text-black'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Visitante
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchLiveCalendarMatches(true)}
              disabled={syncing}
              className="w-9 h-9 bg-primary-container hover:bg-secondary-container disabled:opacity-50 text-white flex items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] transition-all shrink-0"
              title={`Sincronizar calendario, horarios y resultados oficiales (FAVB y Liga AFADE) (Última: ${lastSyncTime})`}
              aria-label="Sincronizar calendario"
            >
              <span className={`material-symbols-outlined text-[18px] ${syncing ? 'animate-spin' : ''}`} aria-hidden="true">
                sync
              </span>
            </button>
          </div>
        </div>
      </section>

      {syncFeedback && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface-container-highest border border-primary/40 text-white px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]" aria-hidden="true">check_circle</span>
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Selector de Jornadas (J1, J2, J3...) + Listado de Partidos de la Jornada */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Barra / Calendario de Jornadas (J1, J2, J3...) */}
        {roundsData.length > 0 && (
          <div className="bg-surface-container-lowest border border-white/10 p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0" aria-hidden="true">
                  calendar_view_week
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-white truncate">
                  Seleccionar Jornada
                </span>
                {recommendedRound !== null && activeRound !== recommendedRound && (
                  <button
                    type="button"
                    onClick={() => setSelectedRound(recommendedRound)}
                    className="ml-1 px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
                  >
                    Ir a J{recommendedRound} (Próxima)
                  </button>
                )}
              </div>

              {/* Flechas de navegación rápida entre jornadas */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={!prevRoundObj}
                  onClick={() => prevRoundObj && setSelectedRound(prevRoundObj.round)}
                  className="w-8 h-8 flex items-center justify-center bg-surface-container-high hover:bg-primary-container disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 transition-colors"
                  title={prevRoundObj ? `Jornada anterior (J${prevRoundObj.round})` : 'Primera jornada'}
                  aria-label="Jornada anterior"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
                </button>
                <button
                  type="button"
                  disabled={!nextRoundObj}
                  onClick={() => nextRoundObj && setSelectedRound(nextRoundObj.round)}
                  className="w-8 h-8 flex items-center justify-center bg-surface-container-high hover:bg-primary-container disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 transition-colors"
                  title={nextRoundObj ? `Siguiente jornada (J${nextRoundObj.round})` : 'Última jornada'}
                  aria-label="Siguiente jornada"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Píldoras horizontales J1, J2, J3... */}
            <div
              ref={roundsScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto category-scrollbar scroll-smooth pt-0.5 pb-1.5"
            >
              {roundsData.map((r) => {
                const isSelected = r.round === currentRoundObj?.round;
                const isRecommended = r.round === recommendedRound;
                return (
                  <button
                    key={r.round}
                    id={`round-pill-${r.round}`}
                    type="button"
                    onClick={() => setSelectedRound(r.round)}
                    className={`relative px-3 py-1.5 min-w-[58px] sm:min-w-[64px] flex flex-col items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-primary-container text-white border-white/40 shadow-[2px_2px_0px_0px_#0e0e0e] -translate-y-0.5'
                        : isRecommended
                        ? 'bg-surface-container-high text-white border-red-500/60 hover:border-red-500'
                        : r.allFinished
                        ? 'bg-surface-container-low/70 text-tertiary/70 border-white/5 hover:text-white hover:border-white/20'
                        : 'bg-surface-container-high text-tertiary border-white/10 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {isRecommended && (
                      <span
                        className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-red-500 animate-pulse'
                        }`}
                        title="Jornada en curso / próxima"
                      />
                    )}
                    <span className="font-display-xl text-base sm:text-lg leading-none">
                      J{r.round}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-tighter mt-0.5 whitespace-nowrap ${
                        isSelected ? 'text-white/90 font-semibold' : 'text-tertiary'
                      }`}
                    >
                      {r.dateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cabecera de la Jornada seleccionada */}
        {currentRoundObj && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-primary-container text-white font-display-xl text-sm uppercase tracking-wider">
                Jornada {currentRoundObj.round}
              </span>
              {currentRoundObj.round === recommendedRound && (
                <span className="px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Siguiente / Activa
                </span>
              )}
              {currentRoundObj.allFinished && (
                <span className="px-2 py-0.5 bg-white/5 text-tertiary border border-white/10 text-[10px] font-bold uppercase tracking-wider">
                  Finalizada
                </span>
              )}
            </div>
            <span className="text-xs text-tertiary font-mono">
              {displayedMatches.length}{' '}
              {displayedMatches.length === 1 ? 'partido' : 'partidos'}
            </span>
          </div>
        )}

        {/* Tarjetas de Partidos de la Jornada Seleccionada */}
        <div className="flex flex-col gap-3">
          {displayedMatches.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-10 text-center">
              <p className="text-sm text-tertiary">
                No hay partidos con los filtros seleccionados.
              </p>
            </div>
          ) : (
            displayedMatches.map((match) => {
              const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
              const isRest = isRestMatch(match);
              const rawRecordingUrl = (mounted ? recordings[match.id] : null) || match.videoUrl;
              const recordingUrl = isValidYouTubeUrl(rawRecordingUrl) ? rawRecordingUrl : null;

              if (isRest) {
                const clubTeamName = match.homeTeamName.includes('San Pedro') ? match.homeTeamName : match.awayTeamName;
                return (
                  <div
                    key={match.id}
                    className="bg-surface-container-low/70 border border-sky-500/30 hover:border-sky-500/60 p-3.5 sm:p-4 transition-all relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0">
                          <span className="font-display-xl text-lg text-tertiary leading-none">
                            J{match.round}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-tertiary/70">
                            Jornada
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase font-bold text-white/80">
                            {formatMadridDate(match.matchDate, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-[10px] text-tertiary uppercase mt-0.5">
                            {team?.name || 'Oficial FAVB/AFADE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:px-4">
                        <div className="flex items-center gap-2.5">
                          <Image
                            src={getTeamLogo(clubTeamName)}
                            alt={clubTeamName}
                            width={28}
                            height={28}
                            className="w-7 h-7 object-contain shrink-0"
                          />
                          <span className="font-headline-sm text-sm sm:text-base uppercase font-bold text-white">
                            {clubTeamName}
                          </span>
                        </div>

                        {/* Cartel DESCANSO del estilo de aplazado */}
                        <div className="flex items-center">
                          <div className="-rotate-3 sm:-rotate-6 transform px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.16em] uppercase font-black shadow-[0_4px_16px_rgba(0,0,0,0.6)] select-none rounded-[2px] bg-sky-500/95 text-black border-sky-200">
                            DESCANSO
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const isFinished = match.status === 'FINISHED';
              const scoreResult =
                isFinished && match.setScores && match.setScores.length > 0
                  ? calculateMatchScore(match.setScores)
                  : null;
              const googleCalUrl = generateGoogleCalendarUrl(
                `Voleibol: ${match.homeTeamName} vs ${match.awayTeamName}`,
                match.venueName,
                match.matchDate
              );
              const mapsUrl = match.isClubHome
                ? CLUB_INFO.venueMapsUrl
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    match.venueName
                  )}`;

              return (
                <div
                  key={match.id}
                  className={`bg-surface-container-low border p-3.5 sm:p-4 transition-all relative overflow-hidden hover:border-primary-container/60 ${
                    match.isClubHome
                      ? 'border-l-4 border-l-primary-container border-white/5'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
                    {/* Top/Left: Round, Date & Mobile Quick Icons */}
                    <div className="flex items-center justify-between lg:justify-start gap-3 lg:w-64 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-surface-container-high flex flex-col items-center justify-center border border-white/5 shrink-0">
                          <span className="font-display-xl text-lg text-primary leading-none">
                            J{match.round}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-tertiary">
                            Jornada
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs uppercase font-bold text-white">
                            {formatMadridDate(match.matchDate, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {match.status === 'POSTPONED' ? (
                            <span className="font-display-xl text-base sm:text-lg text-amber-400 leading-none mt-0.5">
                              APLAZADO
                            </span>
                          ) : match.status === 'CANCELLED' ? (
                            <span className="font-display-xl text-base sm:text-lg text-red-400 leading-none mt-0.5">
                              CANCELADO
                            </span>
                          ) : (
                            <span className="font-display-xl text-xl text-primary leading-none mt-0.5">
                              {formatMadridTime(match.matchDate)}h
                            </span>
                          )}
                          <span className="text-[10px] text-tertiary uppercase mt-0.5">
                            {team?.name || 'Oficial FAVB'}
                          </span>
                        </div>
                      </div>

                      {/* Iconos compactos en móvil a la derecha de la cabecera */}
                      <div className="flex lg:hidden items-center gap-1.5 shrink-0 relative z-30">
                        {recordingUrl && isValidYouTubeUrl(recordingUrl) && (
                          <a
                            href={recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 text-[10px] font-bold uppercase rounded shadow-sm"
                            title="Ver partido en YouTube"
                          >
                            <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>Ver</span>
                          </a>
                        )}
                        <span
                          className={`w-7 h-7 flex items-center justify-center border ${
                            match.isClubHome
                              ? 'bg-primary-container/20 text-primary border-primary-container/30'
                              : 'bg-white/5 text-tertiary border-white/10'
                          }`}
                          title={
                            match.isClubHome
                              ? 'Partido en casa (Pabellón Sergio Scariolo)'
                              : `Partido fuera (${match.venueName})`
                          }
                        >
                          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                            {match.isClubHome ? 'home' : 'flight'}
                          </span>
                        </span>

                        <a
                          href={googleCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                          title="Guardar en Google Calendar"
                          aria-label="Google Calendar"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">
                            event
                          </span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(match)}
                          className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                          title="Añadir a la agenda del móvil (.ics)"
                          aria-label="Añadir al móvil"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">
                            smartphone
                          </span>
                        </button>

                        {match.isClubHome ? (
                          <button
                            type="button"
                            onClick={() => setShowVenueModal(true)}
                            className="w-7 h-7 bg-primary-container hover:bg-secondary-container text-white flex items-center justify-center transition-colors shadow"
                            title="Ver ubicación del Pabellón Sergio Scariolo"
                            aria-label="Ubicación"
                          >
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                              directions
                            </span>
                          </button>
                        ) : (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center transition-colors border border-white/10"
                            title={`Cómo llegar a ${match.venueName}`}
                            aria-label="Cómo llegar al pabellón visitante"
                          >
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                              directions
                            </span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Middle: Matchup & Venue */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Image
                            src={getTeamLogo(match.homeTeamName)}
                            alt={match.homeTeamName}
                            width={24}
                            height={24}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                          {match.isClubHome ? (
                            <Link
                              href={`/plantillas?categoria=${team?.categoryId || 'cat-senior-fem'}`}
                              className="font-headline-sm text-sm sm:text-base uppercase font-bold truncate text-primary hover:underline decoration-primary underline-offset-2"
                              title={`Ver plantilla de ${team?.name || 'nuestro equipo'}`}
                            >
                              {match.homeTeamName}
                            </Link>
                          ) : (
                            <span className="font-headline-sm text-sm sm:text-base uppercase font-bold truncate text-white">
                              {match.homeTeamName}
                            </span>
                          )}
                        </div>

                        {scoreResult ? (
                          <span className="px-2 py-0.5 bg-white/10 border border-white/15 font-display-xl text-sm text-white tracking-wider">
                            {scoreResult.homeSetsWon} - {scoreResult.awaySetsWon}
                          </span>
                        ) : (
                          <span className="text-xs text-tertiary font-mono">vs</span>
                        )}

                        <div className="flex items-center gap-2 min-w-0">
                          <Image
                            src={getTeamLogo(match.awayTeamName)}
                            alt={match.awayTeamName}
                            width={24}
                            height={24}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                          {!match.isClubHome ? (
                            <Link
                              href={`/plantillas?categoria=${team?.categoryId || 'cat-senior-fem'}`}
                              className="font-headline-sm text-sm sm:text-base uppercase font-bold truncate text-primary hover:underline decoration-primary underline-offset-2"
                              title={`Ver plantilla de ${team?.name || 'nuestro equipo'}`}
                            >
                              {match.awayTeamName}
                            </Link>
                          ) : (
                            <span className="font-headline-sm text-sm sm:text-base uppercase font-bold truncate text-white">
                              {match.awayTeamName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Venue con ticker/marquee continuo */}
                      <div className="flex items-center gap-1.5 text-xs text-tertiary mt-1.5 min-w-0 flex-1 overflow-hidden max-w-md">
                        <span className="material-symbols-outlined text-[15px] text-primary shrink-0" aria-hidden="true">
                          pin_drop
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden mask-fade-edges">
                          <div className="animate-venue-marquee items-center whitespace-nowrap text-xs text-tertiary">
                            <span className="pr-8">{match.venueName}</span>
                            <span className="pr-8" aria-hidden="true">{match.venueName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right (Desktop): Compact Icon-Only Actions */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0 relative z-30">
                      {recordingUrl && isValidYouTubeUrl(recordingUrl) && (
                        <a
                          href={recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] cursor-pointer mr-1"
                          title="Ver retransmisión completa del partido en YouTube"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>Ver partido</span>
                        </a>
                      )}
                      <span
                        className={`w-8 h-8 flex items-center justify-center border ${
                          match.isClubHome
                            ? 'bg-primary-container/20 text-primary border-primary-container/30'
                            : 'bg-white/5 text-tertiary border-white/10'
                        }`}
                        title={
                          match.isClubHome
                            ? 'Partido en casa (Pabellón Sergio Scariolo)'
                            : `Partido fuera (${match.venueName})`
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                          {match.isClubHome ? 'home' : 'flight'}
                        </span>
                      </span>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                        title="Abrir y guardar este partido en Google Calendar"
                        aria-label="Google Calendar"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">
                          event
                        </span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadIcs(match)}
                        className="w-8 h-8 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                        title="Añadir cita a la agenda de tu móvil (Apple Calendar, Android, etc.)"
                        aria-label="Añadir a mi móvil"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">
                          smartphone
                        </span>
                      </button>

                      {match.isClubHome ? (
                        <button
                          type="button"
                          onClick={() => setShowVenueModal(true)}
                          className="w-8 h-8 bg-primary-container hover:bg-secondary-container text-white flex items-center justify-center transition-colors shadow"
                          title="Ubicación del Pabellón Sergio Scariolo"
                          aria-label="Ubicación"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            directions
                          </span>
                        </button>
                      ) : (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center transition-colors border border-white/10"
                          title={`Cómo llegar a ${match.venueName} en Google Maps`}
                          aria-label="Cómo llegar al pabellón visitante"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            directions
                          </span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Sello diagonal de APLAZADO / CANCELADO a la derecha donde irían los marcadores */}
                  {(match.status === 'POSTPONED' || match.status === 'CANCELLED') && (
                    <div className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-end">
                      <div
                        className={`-rotate-6 sm:-rotate-12 transform px-2.5 sm:px-3 py-1 border-2 font-display-xl text-xs sm:text-sm tracking-[0.16em] uppercase font-black shadow-[0_6px_20px_rgba(0,0,0,0.85)] select-none rounded-[2px] ${
                          match.status === 'CANCELLED'
                            ? 'bg-red-950/95 text-red-200 border-red-500'
                            : 'bg-amber-500/95 text-black border-amber-200'
                        }`}
                      >
                        {match.statusText?.toUpperCase() ||
                          (match.status === 'CANCELLED' ? 'CANCELADO' : 'APLAZADO')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Navegación inferior rápida entre Jornadas */}
        {roundsData.length > 1 && (
          <div className="pt-2 flex items-center justify-between gap-3">
            {prevRoundObj ? (
              <button
                type="button"
                onClick={() => setSelectedRound(prevRoundObj.round)}
                className="px-3.5 py-2 bg-surface-container-high hover:bg-primary-container text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                <span>Jornada {prevRoundObj.round}</span>
              </button>
            ) : (
              <div />
            )}

            {nextRoundObj ? (
              <button
                type="button"
                onClick={() => setSelectedRound(nextRoundObj.round)}
                className="px-3.5 py-2 bg-surface-container-high hover:bg-primary-container text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <span>Jornada {nextRoundObj.round}</span>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>

      {/* Modal: Cómo llegar al Pabellón Sergio Scariolo */}
      {showVenueModal && (
        <div
          id="pabellon"
          role="dialog"
          aria-modal="true"
          aria-labelledby="venue-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          <div className="bg-surface-container-lowest border-2 border-primary-container p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <button
              onClick={() => setShowVenueModal(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-white"
              aria-label="Cerrar información del pabellón"
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">stadium</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                  Sede Oficial de Juego
                </span>
                <h3 id="venue-modal-title" className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  Pabellón Sergio Scariolo
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-tertiary">
              <p>
                <strong className="text-white">Dirección:</strong> {CLUB_INFO.venueAddress}
              </p>
              <p>
                <strong className="text-white">Instalaciones:</strong> Gradas abiertas para aficionados y familias sampedreñas.
              </p>
              <p>
                <strong className="text-white">Aparcamiento:</strong> Amplia explanada exterior en la zona deportiva del Ensanche Sur.
              </p>

              <div className="p-3 bg-surface-container-high border-l-4 border-emerald-500 text-white font-semibold text-xs">
                ¡Ven en familia y con amigos a animar al voleibol de nuestro pueblo!
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={CLUB_INFO.venueMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 text-center py-3 px-4 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
                Abrir en Google Maps
              </a>
              <button
                onClick={() => setShowVenueModal(false)}
                className="w-full sm:w-auto py-3 px-6 bg-surface-container-high text-on-surface font-label-md text-xs uppercase tracking-wider hover:bg-surface-bright"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
