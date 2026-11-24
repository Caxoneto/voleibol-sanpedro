'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileDown,
  FileText,
  Home,
  MapPin,
  Navigation,
  Plane,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import {
  CLUB_CATEGORIES_META,
  CLUB_TEAMS_META,
  CLUB_INFO,
  ClubCategoryFamilyCode,
  doesMatchBelongToCategory,
  doesMatchBelongToCategoryFamily,
  getTeamColorTheme,
} from '@/lib/club-info';
import CategoryTeamSelectorBar from '@/components/CategoryTeamSelectorBar';
import { Match } from '@/lib/types';
import {
  formatMadridDate,
  formatMadridTime,
  generateGoogleCalendarUrl,
  generateIcsContent,
  generateMultipleIcsContent,
} from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';
import { isRestMatch } from '@/lib/match-utils';
import { useStreaming, isValidYouTubeUrl } from '@/lib/use-streaming';
import { sanitizeHttpsUrl } from '@/lib/validators';
import MatchActaModal from '@/components/MatchActaModal';

interface RoundSummary {
  round: number;
  matches: Match[];
  dateLabel: string;
  hasPending: boolean;
  allFinished: boolean;
  earliestPendingTime: number;
}

const MATCHES_STORAGE_KEY = 'cdv_synced_matches_v8';

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

export default function CalendarioPage() {
  const { recordings } = useStreaming();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'LOCAL' | 'VISITANTE'>('ALL');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [selectedActaMatch, setSelectedActaMatch] = useState<Match | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setNowMs(Date.now());
  }, []);

  const roundsScrollRef = useRef<HTMLDivElement | null>(null);
  const venueModalRef = useRef<HTMLDivElement | null>(null);
  const venueTriggerRef = useRef<HTMLElement | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCategoryRef = useRef(selectedCategory);
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  const showToast = useCallback((msg: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setSyncFeedback(msg);
    feedbackTimerRef.current = setTimeout(() => {
      setSyncFeedback(null);
      feedbackTimerRef.current = null;
    }, 3500);
  }, []);

  const applyLiveMatches = useCallback((liveList: Array<Record<string, unknown>>) => {
    const mapped: Match[] = liveList.map((live) => {
      const homeName = typeof live.homeTeam === 'string' && live.homeTeam
        ? live.homeTeam
        : typeof live.homeTeamName === 'string'
        ? live.homeTeamName
        : 'Equipo Local';
      const awayName = typeof live.awayTeam === 'string' && live.awayTeam
        ? live.awayTeam
        : typeof live.awayTeamName === 'string'
        ? live.awayTeamName
        : 'Equipo Visitante';
      const status =
        live.status === 'FINISHED' ||
        live.status === 'LIVE' ||
        live.status === 'SCHEDULED' ||
        live.status === 'POSTPONED' ||
        live.status === 'CANCELLED'
          ? (live.status as Match['status'])
          : 'SCHEDULED';

      return {
        id: String(live.id),
        teamId: typeof live.teamId === 'string' ? live.teamId : '',
        round: typeof live.round === 'number' ? live.round : Number(live.round) || 1,
        homeTeamName: homeName,
        awayTeamName: awayName,
        isClubHome: Boolean(live.isClubHome),
        matchDate: typeof live.matchDate === 'string' ? live.matchDate : new Date().toISOString(),
        venueName:
          typeof live.venue === 'string' && live.venue
            ? live.venue
            : typeof live.venueName === 'string' && live.venueName
            ? live.venueName
            : CLUB_INFO.venueName,
        court: typeof live.court === 'string' ? live.court : undefined,
        locality: typeof live.locality === 'string' ? live.locality : undefined,
        googleMapsUrl: typeof live.googleMapsUrl === 'string' ? live.googleMapsUrl : undefined,
        referees: Array.isArray(live.referees) ? (live.referees as Match['referees']) : undefined,
        homeRoster: Array.isArray(live.homeRoster) ? (live.homeRoster as Match['homeRoster']) : undefined,
        awayRoster: Array.isArray(live.awayRoster) ? (live.awayRoster as Match['awayRoster']) : undefined,
        homeRosterCount: typeof live.homeRosterCount === 'number' ? live.homeRosterCount : undefined,
        awayRosterCount: typeof live.awayRosterCount === 'number' ? live.awayRosterCount : undefined,
        status,
        statusText: typeof live.statusText === 'string' ? live.statusText : undefined,
        setScores: Array.isArray(live.setScores) ? (live.setScores as Match['setScores']) : [],
        currentSetScore:
          live.currentSetScore && typeof live.currentSetScore === 'object'
            ? (live.currentSetScore as Match['currentSetScore'])
            : undefined,
        association: live.association === 'AFADE' || live.association === 'FAVB' ? live.association : undefined,
        favbMatchUrl: typeof live.favbUrl === 'string' ? live.favbUrl : undefined,
        videoUrl: typeof live.videoUrl === 'string' ? live.videoUrl : undefined,
      };
    });
    setAllMatches(mapped);
  }, []);

  const handleActaMatchUpdated = (updated: Record<string, any>) => {
    if (!updated) return;
    const matchId = updated.id || (updated.favbId ? `favb-${updated.favbId}` : '');
    setAllMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId && m.id !== updated.id) return m;
        return {
          ...m,
          homeTeamName: updated.homeTeam || updated.homeTeamName || m.homeTeamName,
          awayTeamName: updated.awayTeam || updated.awayTeamName || m.awayTeamName,
          venueName: updated.venue || updated.venueName || m.venueName,
          court: updated.court ?? m.court,
          locality: updated.locality ?? m.locality,
          googleMapsUrl: updated.googleMapsUrl ?? m.googleMapsUrl,
          referees: updated.referees ?? m.referees,
          homeRoster: updated.homeRoster ?? m.homeRoster,
          awayRoster: updated.awayRoster ?? m.awayRoster,
          status: updated.status ?? m.status,
          statusText: updated.statusText ?? m.statusText,
          setScores:
            Array.isArray(updated.setScores) && updated.setScores.length > 0
              ? updated.setScores
              : m.setScores,
        };
      })
    );
    setSelectedActaMatch((prev) => {
      if (!prev || (prev.id !== matchId && prev.id !== updated.id)) return prev;
      return {
        ...prev,
        homeTeamName: updated.homeTeam || updated.homeTeamName || prev.homeTeamName,
        awayTeamName: updated.awayTeam || updated.awayTeamName || prev.awayTeamName,
        venueName: updated.venue || updated.venueName || prev.venueName,
        court: updated.court ?? prev.court,
        locality: updated.locality ?? prev.locality,
        googleMapsUrl: updated.googleMapsUrl ?? prev.googleMapsUrl,
        referees: updated.referees ?? prev.referees,
        homeRoster: updated.homeRoster ?? prev.homeRoster,
        awayRoster: updated.awayRoster ?? prev.awayRoster,
        status: updated.status ?? prev.status,
        statusText: updated.statusText ?? prev.statusText,
        setScores:
          Array.isArray(updated.setScores) && updated.setScores.length > 0
            ? updated.setScores
            : prev.setScores,
      };
    });
  };

  const getCalledUpCount = (m: Match): number => {
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

  const fetchLiveCalendarMatches = useCallback(
    async (manual = false) => {
      if (manual) setSyncing(true);
      try {
        const res = await fetch('/api/favb/sync', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.matches) && data.matches.length > 0) {
          applyLiveMatches(data.matches);
          setLastSyncTime(formatSyncHourMadrid(data.lastSync));

          try {
            const safeMatches = (data.matches as Array<Record<string, unknown>>).map(
              ({ homeRoster: _h, awayRoster: _a, ...rest }) => rest
            );
            window.localStorage.setItem(
              MATCHES_STORAGE_KEY,
              JSON.stringify({
                matches: safeMatches,
                lastSync: data.lastSync || new Date().toISOString(),
              })
            );
          } catch {
            // Ignorar límite de localStorage
          }

          if (manual) {
            const isAfade = selectedCategoryRef.current.includes('afade');
            showToast(
              `Calendario, horarios y resultados actualizados desde ${isAfade ? 'ligaafade.es' : 'las competiciones oficiales (FAVB y Liga AFADE)'}`
            );
          }
        }
      } catch {
        if (manual) {
          showToast('Mostrando último calendario oficial sincronizado.');
        }
      } finally {
        setLoadingInitial(false);
        if (manual) setSyncing(false);
      }
    },
    [applyLiveMatches, showToast]
  );

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(MATCHES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matches) && parsed.matches.length > 0) {
          applyLiveMatches(parsed.matches);
          setLoadingInitial(false);
        }
        if (parsed.lastSync) {
          setLastSyncTime(formatSyncHourMadrid(parsed.lastSync));
        }
      }
    } catch {
      // Ignorar error de lectura
    }

    void fetchLiveCalendarMatches(false);
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [applyLiveMatches, fetchLiveCalendarMatches]);

  const closeVenueModal = useCallback(() => {
    setShowVenueModal(false);
    const prev = venueTriggerRef.current;
    if (prev && typeof prev.focus === 'function') {
      requestAnimationFrame(() => prev.focus());
    }
  }, []);

  // Focus trap y tecla Escape en modal del Pabellón
  useEffect(() => {
    if (!showVenueModal) return;

    const modalEl = venueModalRef.current;
    if (modalEl) {
      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        requestAnimationFrame(() => focusable[0].focus());
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeVenueModal();
        return;
      }
      if (e.key === 'Tab' && venueModalRef.current) {
        const focusable = Array.from(
          venueModalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !venueModalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !venueModalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVenueModal, closeVenueModal]);

  // 1. Partidos filtrados por categoría y condición (Local / Visitante)
  const filteredMatches = useMemo(() => {
    return allMatches
      .filter((match) => {
        if (selectedCategory !== 'ALL') {
          if (selectedCategory.startsWith('FAMILY:')) {
            const famCode = selectedCategory.replace('FAMILY:', '') as ClubCategoryFamilyCode;
            if (!doesMatchBelongToCategoryFamily(match, famCode)) return false;
          } else if (!doesMatchBelongToCategory(match, selectedCategory)) {
            const team = CLUB_TEAMS_META.find((t) => t.id === match.teamId);
            if (!team || team.categoryId !== selectedCategory) return false;
          }
        }
        if (conditionFilter === 'LOCAL' && !match.isClubHome) return false;
        if (conditionFilter === 'VISITANTE' && match.isClubHome) return false;

        return true;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }, [allMatches, selectedCategory, conditionFilter]);

  // 2. Agrupación por Jornadas (J1, J2, J3...)
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
        if (isRestMatch(m)) return false;
        if (m.status === 'FINISHED' || m.status === 'POSTPONED' || m.status === 'CANCELLED') return false;
        if (nowMs !== null) {
          const isPast12h = nowMs - new Date(m.matchDate).getTime() >= 12 * 60 * 60 * 1000;
          if (m.status === 'SCHEDULED' && isPast12h) return false;
        }
        return true;
      });
      const upcomingAny = roundMatches.filter((m) => {
        if (m.status === 'FINISHED' || m.status === 'POSTPONED' || m.status === 'CANCELLED') return false;
        if (nowMs !== null) {
          const isPast12h = nowMs - new Date(m.matchDate).getTime() >= 12 * 60 * 60 * 1000;
          return !isPast12h;
        }
        return true;
      });
      const effectiveUpcoming = playablePending.length > 0 ? playablePending : upcomingAny;
      const firstMatch = roundMatches[0];
      const dateLabel = firstMatch
        ? formatMadridDate(firstMatch.matchDate, { day: 'numeric', month: 'short' })
        : '';

      summaries.push({
        round: roundNum,
        matches: roundMatches,
        dateLabel,
        hasPending: effectiveUpcoming.length > 0,
        allFinished: effectiveUpcoming.length === 0 && roundMatches.length > 0,
        earliestPendingTime:
          effectiveUpcoming.length > 0
            ? new Date(effectiveUpcoming[0].matchDate).getTime()
            : Number.POSITIVE_INFINITY,
      });
    }

    return summaries;
  }, [filteredMatches, nowMs]);

  // 3. Jornada recomendada por defecto
  const recommendedRound = useMemo<number | null>(() => {
    if (roundsData.length === 0) return null;
    if (nowMs !== null) {
      const upcomingRounds = roundsData.filter((r) => {
        const firstMatchTime = r.matches[0] ? new Date(r.matches[0].matchDate).getTime() : 0;
        return r.hasPending && firstMatchTime >= nowMs - 48 * 3600 * 1000;
      });

      if (upcomingRounds.length > 0) {
        return upcomingRounds[0].round;
      }
    }

    const withPending = roundsData
      .filter((r) => r.hasPending)
      .sort((a, b) => a.earliestPendingTime - b.earliestPendingTime);

    if (withPending.length > 0) {
      return withPending[0].round;
    }
    return roundsData[roundsData.length - 1].round;
  }, [roundsData, nowMs]);

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

  // Descargar calendario completo válido RFC 5545 en un único VCALENDAR
  const handleDownloadFullCalendarIcs = () => {
    const icsEvents = filteredMatches
      .filter((m) => !isRestMatch(m))
      .map((m) => ({
        title: `${m.homeTeamName} vs ${m.awayTeamName}`,
        venue: m.venueName,
        startDateUtc: m.matchDate,
        matchId: m.id,
      }));
    const icsBody = generateMultipleIcsContent(icsEvents);

    const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendario-cd-voleibol-san-pedro.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar calendario en PDF oficial con carga dinámica de jsPDF y splitTextToSize (sin solapar columnas)
  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const drawHeader = () => {
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

      let headerY = 46;
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('JORNADA', 15, headerY);
      doc.text('FECHA Y HORA', 38, headerY);
      doc.text('ENFRENTAMIENTO', 76, headerY);
      doc.text('SEDE', 150, headerY);

      doc.setDrawColor(217, 4, 41);
      doc.setLineWidth(0.5);
      doc.line(15, headerY + 2, 195, headerY + 2);
      return headerY + 8;
    };

    let y = drawHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredMatches.forEach((m) => {
      const fecha = `${formatMadridDate(m.matchDate, {
        day: '2-digit',
        month: '2-digit',
      })} ${formatMadridTime(m.matchDate)}h`;
      const versus = `${m.homeTeamName} vs ${m.awayTeamName}`;
      const sedeRaw = m.isClubHome ? 'Sergio Scariolo (LOCAL)' : m.venueName || 'Por determinar';

      const versusLines = doc.splitTextToSize(versus, 70) as string[];
      const sedeLines = doc.splitTextToSize(sedeRaw, 44) as string[];
      const lineCount = Math.max(versusLines.length, sedeLines.length, 1);
      const rowHeight = lineCount * 3.8 + 3.4;

      if (y + rowHeight > 274) {
        doc.addPage();
        y = drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      if (m.isClubHome) {
        doc.setFillColor(254, 242, 242);
        doc.rect(14, y - 3.6, 182, rowHeight, 'F');
      }

      doc.setTextColor(30, 30, 30);
      doc.text(`Jor. ${m.round}`, 15, y);
      doc.text(fecha, 38, y);
      doc.text(versusLines, 76, y);
      doc.text(sedeLines, 150, y);

      y += rowHeight;
    });

    const totalPages = doc.getNumberOfPages();
    const madridGeneratedDate = formatMadridDate(new Date(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Generado el ${madridGeneratedDate} (Europe/Madrid) desde voleibolsanpedro.es · Pág. ${page}/${totalPages}`,
        15,
        286
      );
    }

    doc.save('calendario-cd-voleibol-san-pedro.pdf');
  };

  return (
    <div className="w-full min-h-screen bg-background relative overflow-x-clip">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Top Strip */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-5 sm:py-8 border-b border-white/5 overflow-hidden">
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
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
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              title="Guardar calendario completo en mi móvil (iPhone, Android, Outlook)"
              aria-label="Guardar calendario en mi móvil"
            >
              <Smartphone className="w-[18px] h-[18px] text-primary" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              title="Exportar calendario en PDF imprimible"
              aria-label="Exportar PDF"
            >
              <FileDown className="w-[18px] h-[18px] text-primary" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                venueTriggerRef.current = e.currentTarget;
                setShowVenueModal(true);
              }}
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-primary-container hover:bg-cta-hover text-white transition-all shadow-xl border border-white/15 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              title="Cómo llegar al Pabellón Polideportivo Sergio Scariolo"
              aria-label="Cómo llegar al Pabellón"
            >
              <Navigation className="w-[18px] h-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Filter Toolbar (Categorías con desplegable de equipos) */}
      <CategoryTeamSelectorBar
        items={CLUB_CATEGORIES_META}
        selectedValue={selectedCategory}
        valueKey="id"
        idPrefix="cal-cat-pill-"
        allowAll
        allowFamilyAll
        allLabel="Todas las categorías"
        ariaLabel="Categorías y equipos del calendario"
        onSelect={(val) => handleSelectCategory(val)}
      />

      {syncFeedback && (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 bg-surface-container-highest border border-primary/40 text-white px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Selector de Jornadas (J1, J2, J3...) + Listado de Partidos de la Jornada */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 sm:py-6 space-y-4 relative z-10">
        {/* Contenedor de filtros de condición + Jornadas */}
        <div className="bg-surface-container-lowest border border-white/10 p-3 sm:p-4 space-y-3">
          {/* Condición + Sincronización */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 pb-2.5 border-b border-white/10">
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
                Local
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
              onClick={() => void fetchLiveCalendarMatches(true)}
              disabled={syncing}
              className="w-10 h-10 sm:w-9 sm:h-9 bg-primary-container hover:bg-cta-hover disabled:opacity-50 text-white flex items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px] transition-all shrink-0 cursor-pointer"
              title={`Actualizar calendario, horarios y resultados oficiales (FAVB y Liga AFADE) (Última: ${lastSyncTime})`}
              aria-label="Actualizar calendario"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>

          {roundsData.length > 0 && (
            <>
              {/* Fila Seleccionar Jornada */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarRange className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white truncate">
                    Seleccionar Jornada
                  </span>
                  {recommendedRound !== null && activeRound !== recommendedRound && (
                    <button
                      type="button"
                      onClick={() => setSelectedRound(recommendedRound)}
                      className="ml-1 px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
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
                    className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-surface-container-high hover:bg-primary-container disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 transition-colors cursor-pointer"
                    title={prevRoundObj ? `Jornada anterior (J${prevRoundObj.round})` : 'Primera jornada'}
                    aria-label="Jornada anterior"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={!nextRoundObj}
                    onClick={() => nextRoundObj && setSelectedRound(nextRoundObj.round)}
                    className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-surface-container-high hover:bg-primary-container disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 transition-colors cursor-pointer"
                    title={nextRoundObj ? `Siguiente jornada (J${nextRoundObj.round})` : 'Última jornada'}
                    aria-label="Siguiente jornada"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
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
                          ? 'bg-surface-container-low/70 text-tertiary/85 border-white/5 hover:text-white hover:border-white/20'
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
                        className={`text-[10px] uppercase tracking-tighter mt-0.5 whitespace-nowrap ${
                          isSelected ? 'text-white/95 font-semibold' : 'text-tertiary'
                        }`}
                      >
                        {r.dateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Cabecera de la Jornada seleccionada */}
        {currentRoundObj && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <h2 className="px-2.5 py-0.5 bg-primary-container text-white font-display-xl text-sm uppercase tracking-wider">
                Jornada {currentRoundObj.round}
              </h2>
              {currentRoundObj.round === recommendedRound && (
                <span className="px-2 py-0.5 bg-red-950/90 text-red-200 border border-red-400/50 text-[10px] font-bold uppercase tracking-wider">
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
          {loadingInitial && allMatches.length === 0 ? (
            <div className="bg-surface-container-low border border-white/10 p-10 text-center flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
              <p className="text-xs uppercase font-bold tracking-wider text-white">
                Cargando calendario oficial...
              </p>
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-10 text-center">
              <p className="text-sm text-tertiary">
                No hay partidos con los filtros seleccionados.
              </p>
            </div>
          ) : (
            displayedMatches.map((match) => {
              const team = CLUB_TEAMS_META.find((t) => t.id === match.teamId);
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
                          <span className="text-[10px] uppercase tracking-wider text-tertiary/85">
                            Jornada
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase font-bold text-white/80">
                            {formatMadridDate(match.matchDate)}
                          </span>
                          <span
                            className={`text-[10px] uppercase mt-0.5 font-bold ${
                              getTeamColorTheme(team?.name || clubTeamName).colorKey
                                ? getTeamColorTheme(team?.name || clubTeamName).textClass
                                : 'text-tertiary'
                            }`}
                          >
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
                          <span
                            className={`font-headline-sm text-sm sm:text-base uppercase font-bold ${
                              getTeamColorTheme(team?.name || clubTeamName).colorKey
                                ? getTeamColorTheme(team?.name || clubTeamName).textClass
                                : 'text-white'
                            }`}
                          >
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
              const rawMapsUrl =
                match.googleMapsUrl ||
                (match.isClubHome
                  ? CLUB_INFO.venueMapsUrl
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${match.venueName} ${match.locality || ''}`.trim()
                    )}`);
              const mapsUrl = sanitizeHttpsUrl(rawMapsUrl, CLUB_INFO.venueMapsUrl);

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
                          <span className="text-[10px] uppercase tracking-wider text-tertiary">
                            Jornada
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs uppercase font-bold text-white">
                            {formatMadridDate(match.matchDate)}
                          </span>
                          {match.status === 'POSTPONED' ? (
                            <span className="font-display-xl text-base sm:text-lg text-amber-400 leading-none mt-0.5">
                              APLAZADO
                            </span>
                          ) : match.status === 'CANCELLED' ? (
                            <span className="font-display-xl text-base sm:text-lg text-red-400 leading-none mt-0.5">
                              CANCELADO
                            </span>
                          ) : match.status === 'LIVE' ? (
                            <span className="inline-flex items-center gap-1.5 font-display-xl text-base sm:text-lg text-red-400 leading-none mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                              <span>EN JUEGO</span>
                            </span>
                          ) : (
                            <span className="font-display-xl text-xl text-primary leading-none mt-0.5">
                              {formatMadridTime(match.matchDate)}h
                            </span>
                          )}
                          <span
                            className={`text-[10px] uppercase mt-0.5 font-bold ${
                              getTeamColorTheme(team?.name || '').colorKey
                                ? getTeamColorTheme(team?.name || '').textClass
                                : 'text-tertiary'
                            }`}
                          >
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
                          className={`w-10 h-10 flex items-center justify-center border ${
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
                          {match.isClubHome ? (
                            <Home className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Plane className="w-4 h-4" aria-hidden="true" />
                          )}
                        </span>

                        <a
                          href={googleCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                          title="Guardar en Google Calendar"
                          aria-label="Google Calendar"
                        >
                          <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(match)}
                          className="w-10 h-10 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container cursor-pointer"
                          title="Añadir a la agenda del móvil (.ics)"
                          aria-label="Añadir al móvil"
                        >
                          <Smartphone className="w-4 h-4 text-primary" aria-hidden="true" />
                        </button>
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
                              className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate hover:underline underline-offset-2 ${
                                getTeamColorTheme(team?.name || match.homeTeamName).colorKey
                                  ? `${getTeamColorTheme(team?.name || match.homeTeamName).textClass} decoration-current`
                                  : 'text-primary decoration-primary'
                              }`}
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
                          <span className="px-2.5 py-0.5 bg-white/10 border border-white/15 font-display-xl text-sm tracking-wider inline-flex items-center gap-1">
                            <span
                              className={
                                scoreResult.homeSetsWon > scoreResult.awaySetsWon
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-white'
                              }
                            >
                              {scoreResult.homeSetsWon}
                            </span>
                            <span className="text-white/50">-</span>
                            <span
                              className={
                                scoreResult.awaySetsWon > scoreResult.homeSetsWon
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-white'
                              }
                            >
                              {scoreResult.awaySetsWon}
                            </span>
                          </span>
                        ) : match.status === 'POSTPONED' || match.status === 'CANCELLED' ? (
                          <span
                            className={`px-2 py-0.5 border font-display-xl text-[11px] sm:text-xs tracking-wider uppercase font-black shrink-0 rounded-[2px] ${
                              match.status === 'CANCELLED'
                                ? 'bg-red-950/95 text-red-200 border-red-500/80'
                                : 'bg-amber-500/95 text-black border-amber-200'
                            }`}
                          >
                            {match.statusText?.toUpperCase() ||
                              (match.status === 'CANCELLED' ? 'CANCELADO' : 'APLAZADO')}
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
                              className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate hover:underline underline-offset-2 ${
                                getTeamColorTheme(team?.name || match.awayTeamName).colorKey
                                  ? `${getTeamColorTheme(team?.name || match.awayTeamName).textClass} decoration-current`
                                  : 'text-primary decoration-primary'
                              }`}
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

                      {/* Sede enlazada directamente a Google Maps */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 w-full max-w-full min-w-0 text-xs text-tertiary hover:text-white transition-colors mt-1.5 group/venue"
                        title={`Abrir ubicación de ${match.venueName} en Google Maps`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                          {match.court && (
                            <span className="px-1.5 py-0.5 bg-primary-container/25 border border-primary-container/50 text-primary font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                              {match.court}
                            </span>
                          )}
                          {match.locality && !match.venueName.toLowerCase().includes(match.locality.toLowerCase()) && (
                            <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/80 text-[10px] font-semibold shrink-0">
                              {match.locality}
                            </span>
                          )}
                          <span className="text-xs text-tertiary group-hover/venue:text-primary group-hover/venue:underline break-words leading-snug min-w-0">
                            {match.venueName}
                          </span>
                        </span>
                      </a>

                      {/* Funcionalidad 3 (Móvil): Botón Acta / Convocatoria */}
                      <div className="mt-2 pt-1.5 border-t border-white/5 flex lg:hidden items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedActaMatch(match)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span>Acta / Convocatoria</span>
                          {getCalledUpCount(match) > 0 && (
                            <span className="px-1.5 py-0.5 bg-black/40 text-white font-mono text-[10px]">
                              {getCalledUpCount(match)} conv.
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Right (Desktop): Compact Icon-Only Actions + Botón Acta / Convocatoria */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0 relative z-30">
                      <button
                        type="button"
                        onClick={() => setSelectedActaMatch(match)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container/20 hover:bg-primary-container text-primary hover:text-white border border-primary-container/40 text-xs font-bold uppercase tracking-wider transition-colors mr-1"
                        title="Ver Acta Oficial, Árbitros y Convocatorias"
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>Acta / Convocatoria</span>
                        {getCalledUpCount(match) > 0 && (
                          <span className="px-1.5 py-0.5 bg-black/40 text-white font-mono text-[10px]">
                            {getCalledUpCount(match)}
                          </span>
                        )}
                      </button>
                      {recordingUrl && isValidYouTubeUrl(recordingUrl) && (
                        <a
                          href={recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-none transition-all shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] cursor-pointer mr-1"
                          title="Ver retransmisión completa del partido en YouTube"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>Ver partido</span>
                        </a>
                      )}
                      <span
                        className={`w-9 h-9 flex items-center justify-center border ${
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
                        {match.isClubHome ? (
                          <Home className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Plane className="w-4 h-4" aria-hidden="true" />
                        )}
                      </span>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                        title="Abrir y guardar este partido en Google Calendar"
                        aria-label="Google Calendar"
                      >
                        <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadIcs(match)}
                        className="w-9 h-9 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container cursor-pointer"
                        title="Añadir cita a la agenda de tu móvil (Apple Calendar, Android, etc.)"
                        aria-label="Añadir a mi móvil"
                      >
                        <Smartphone className="w-4 h-4 text-primary" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
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
                className="px-3.5 py-2 bg-surface-container-high hover:bg-primary-container text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Jornada {prevRoundObj.round}</span>
              </button>
            ) : (
              <div />
            )}

            {nextRoundObj ? (
              <button
                type="button"
                onClick={() => setSelectedRound(nextRoundObj.round)}
                className="px-3.5 py-2 bg-surface-container-high hover:bg-primary-container text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              >
                <span>Jornada {nextRoundObj.round}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeVenueModal();
          }}
        >
          <div
            ref={venueModalRef}
            className="bg-surface-container-lowest border-2 border-primary-container p-6 sm:p-8 max-w-xl w-full shadow-2xl relative"
          >
            <button
              type="button"
              onClick={closeVenueModal}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-surface-container-high border border-white/15 text-tertiary hover:text-white cursor-pointer"
              aria-label="Cerrar información del pabellón"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                  Sede Oficial de Juego
                </span>
                <h2 id="venue-modal-title" className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  Pabellón Sergio Scariolo
                </h2>
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
                href={sanitizeHttpsUrl(CLUB_INFO.venueMapsUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 text-center py-3 px-4 bg-primary-container hover:bg-cta-hover text-white font-label-md text-xs uppercase tracking-wider font-bold shadow-md flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Abrir en Google Maps
              </a>
              <button
                type="button"
                onClick={closeVenueModal}
                className="w-full sm:w-auto py-3 px-6 bg-surface-container-high text-on-surface font-label-md text-xs uppercase tracking-wider hover:bg-surface-bright cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Acta Oficial y Convocatorias */}
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
