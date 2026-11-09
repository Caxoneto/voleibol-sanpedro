'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  RefreshCw,
  MapPin,
  Navigation,
  Scale,
  Users,
  Shield,
  ExternalLink,
  Award,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { MatchReferee, MatchRosterPerson, SetScore, MatchStatus } from '@/lib/types';
import { INITIAL_CATEGORIES, INITIAL_TEAMS, CLUB_INFO } from '@/lib/data-store';
import { formatMadridDate, formatMadridTime } from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';

export interface ActaMatchData {
  id: string;
  favbId?: string;
  teamId?: string;
  categoryId?: string;
  categoryName?: string;
  competitionCode?: string;
  competitionName?: string;
  round: number;
  homeTeam?: string;
  homeTeamName?: string;
  awayTeam?: string;
  awayTeamName?: string;
  isClubHome?: boolean;
  venue?: string;
  venueName?: string;
  court?: string;
  locality?: string;
  googleMapsUrl?: string;
  dateStr?: string;
  timeStr?: string;
  matchDate: string;
  status: MatchStatus;
  statusText?: string;
  homeScore?: number;
  awayScore?: number;
  setScores?: SetScore[];
  currentSetScore?: { set: string; home: number; away: number };
  referees?: MatchReferee[];
  homeRoster?: Array<MatchRosterPerson & { role?: string }>;
  awayRoster?: Array<MatchRosterPerson & { role?: string }>;
  favbUrl?: string;
  favbMatchUrl?: string;
  afadeMatchUrl?: string;
  association?: 'FAVB' | 'AFADE';
}

interface MatchActaModalProps {
  match: ActaMatchData;
  onClose: () => void;
  onMatchUpdated?: (updated: any) => void;
}

export default function MatchActaModal({
  match: initialMatch,
  onClose,
  onMatchUpdated,
}: MatchActaModalProps) {
  const [matchData, setMatchData] = useState<ActaMatchData>(initialMatch);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const onMatchUpdatedRef = useRef(onMatchUpdated);
  useEffect(() => {
    onMatchUpdatedRef.current = onMatchUpdated;
  }, [onMatchUpdated]);

  // Controla que la consulta automática al abrir el modal se ejecute como máximo 1 sola vez por partido
  const autoFetchedMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMatchData(initialMatch);
  }, [initialMatch.id]);

  const isAfade =
    matchData.association === 'AFADE' || matchData.id.startsWith('afade-');
  const resolvedFavbId =
    matchData.favbId ||
    (matchData.id.startsWith('favb-')
      ? matchData.id.replace(/^favb-/, '')
      : matchData.id);

  const fetchLiveActa = useCallback(
    async (showNotification = false) => {
      if (!resolvedFavbId) return;
      setLoading(true);
      if (showNotification) setFeedbackMsg(null);
      try {
        const targetId = isAfade ? matchData.id : resolvedFavbId;
        const res = await fetch(
          `/api/favb/match/${encodeURIComponent(targetId)}?force=true`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.success && data.match) {
          const live = data.match;
          setMatchData((prev) => ({
            ...prev,
            ...live,
            homeTeam: live.homeTeam ?? prev.homeTeam ?? prev.homeTeamName,
            homeTeamName: live.homeTeam ?? prev.homeTeamName ?? prev.homeTeam,
            awayTeam: live.awayTeam ?? prev.awayTeam ?? prev.awayTeamName,
            awayTeamName: live.awayTeam ?? prev.awayTeamName ?? prev.awayTeam,
            venue: live.venue ?? prev.venue ?? prev.venueName,
            venueName: live.venue ?? prev.venueName ?? prev.venue,
            court: live.court ?? prev.court,
            locality: live.locality ?? prev.locality,
            googleMapsUrl: live.googleMapsUrl ?? prev.googleMapsUrl,
            referees: live.referees ?? prev.referees,
            homeRoster: live.homeRoster ?? prev.homeRoster,
            awayRoster: live.awayRoster ?? prev.awayRoster,
            setScores:
              Array.isArray(live.setScores) && live.setScores.length > 0
                ? live.setScores
                : prev.setScores,
            homeScore: live.homeScore ?? prev.homeScore,
            awayScore: live.awayScore ?? prev.awayScore,
            status: live.status ?? prev.status,
            statusText: live.statusText ?? prev.statusText,
          }));
          onMatchUpdatedRef.current?.(live);
          if (showNotification) {
            setFeedbackMsg('Acta y convocatorias sincronizadas en directo con la federación.');
            setTimeout(() => setFeedbackMsg(null), 3500);
          }
        }
      } catch (err) {
        console.error('Error al consultar el acta oficial:', err);
        if (showNotification) {
          setFeedbackMsg('No se pudo conectar con la federación en este momento.');
          setTimeout(() => setFeedbackMsg(null), 3500);
        }
      } finally {
        setLoading(false);
      }
    },
    [resolvedFavbId, isAfade, matchData.id]
  );

  // Al abrir el modal, si es partido FAVB y aún no tiene homeRoster ni awayRoster, consultar una única vez
  useEffect(() => {
    if (autoFetchedMatchIdRef.current === initialMatch.id) return;
    autoFetchedMatchIdRef.current = initialMatch.id;

    const hasHomeRoster =
      Array.isArray(initialMatch.homeRoster) && initialMatch.homeRoster.length > 0;
    const hasAwayRoster =
      Array.isArray(initialMatch.awayRoster) && initialMatch.awayRoster.length > 0;
    const isFavb =
      initialMatch.association !== 'AFADE' && !initialMatch.id.startsWith('afade-');

    if (isFavb && !hasHomeRoster && !hasAwayRoster) {
      fetchLiveActa(false);
    }
  }, [initialMatch.id, initialMatch.association, initialMatch.homeRoster, initialMatch.awayRoster, fetchLiveActa]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const homeName = matchData.homeTeam || matchData.homeTeamName || 'Equipo Local';
  const awayName = matchData.awayTeam || matchData.awayTeamName || 'Equipo Visitante';
  const venueDisplay = matchData.venue || matchData.venueName || CLUB_INFO.venueName;

  const isHomeSanPedro =
    matchData.isClubHome === true || homeName.toUpperCase().includes('SAN PEDRO');
  const isAwaySanPedro =
    matchData.isClubHome === false || awayName.toUpperCase().includes('SAN PEDRO');

  const teamObj = matchData.teamId
    ? INITIAL_TEAMS.find((t) => t.id === matchData.teamId)
    : undefined;
  const catObj =
    (matchData.categoryId && INITIAL_CATEGORIES.find((c) => c.id === matchData.categoryId)) ||
    (teamObj && INITIAL_CATEGORIES.find((c) => c.id === teamObj.categoryId));

  const categoryTitle =
    catObj?.name || matchData.categoryName || teamObj?.name || 'Competición Oficial';
  const competitionSub =
    teamObj?.division || matchData.competitionName || matchData.competitionCode || (isAfade ? 'Liga AFADE' : 'FAVB');

  const dateDisplay =
    matchData.dateStr ||
    formatMadridDate(matchData.matchDate, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const timeDisplay = matchData.timeStr || formatMadridTime(matchData.matchDate);

  const setScores = matchData.setScores || [];
  const totalSets = (() => {
    if (matchData.homeScore !== undefined && matchData.awayScore !== undefined) {
      return { home: matchData.homeScore, away: matchData.awayScore };
    }
    if (setScores.length > 0) {
      const calc = calculateMatchScore(setScores);
      return { home: calc.homeSetsWon, away: calc.awaySetsWon };
    }
    return null;
  })();

  const mapsLink =
    matchData.googleMapsUrl ||
    (isHomeSanPedro
      ? CLUB_INFO.venueMapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${venueDisplay} ${matchData.locality || ''}`.trim()
        )}`);

  const officialExternalUrl =
    matchData.favbUrl ||
    matchData.favbMatchUrl ||
    matchData.afadeMatchUrl ||
    (isAfade
      ? 'https://www.ligaafade.es'
      : `https://favoley.net/publico/seccion.php?seccion=ficha_partido&id=${encodeURIComponent(
          resolvedFavbId
        )}`);

  const referees = matchData.referees || [];
  const homeRoster = matchData.homeRoster || [];
  const awayRoster = matchData.awayRoster || [];

  const renderStatusBadge = () => {
    if (matchData.status === 'LIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/90 border border-red-500 text-red-300 text-[11px] font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          En Juego
        </span>
      );
    }
    if (matchData.status === 'FINISHED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Finalizado
        </span>
      );
    }
    if (matchData.status === 'POSTPONED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          Aplazado
        </span>
      );
    }
    if (matchData.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/80 border border-red-500/50 text-red-300 text-[11px] font-bold uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] font-bold uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5 text-primary" />
        Programado
      </span>
    );
  };

  const renderTeamRosterColumn = (
    teamName: string,
    roster: Array<MatchRosterPerson & { role?: string }>,
    isSanPedro: boolean,
    sideLabel: string
  ) => {
    const players = roster.filter((p) => !p.isStaff);
    const staffList = roster.filter((p) => p.isStaff);

    return (
      <div
        className={`flex flex-col border bg-zinc-950/90 transition-all ${
          isSanPedro
            ? 'border-primary-container/80 shadow-[0_0_20px_rgba(217,4,41,0.12)]'
            : 'border-zinc-800'
        }`}
      >
        {/* Cabecera del Equipo */}
        <div
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-3 ${
            isSanPedro
              ? 'bg-gradient-to-r from-primary-container/25 via-primary-container/10 to-transparent border-primary-container/40'
              : 'bg-zinc-900/70 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src={getTeamLogo(teamName)}
              alt={teamName}
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  {sideLabel}
                </span>
                {isSanPedro && (
                  <span className="px-1.5 py-0.5 bg-primary-container text-white text-[9px] font-bold uppercase tracking-wider">
                    Nuestro Club
                  </span>
                )}
              </div>
              <h4
                className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate ${
                  isSanPedro ? 'text-primary' : 'text-white'
                }`}
                title={teamName}
              >
                {teamName}
              </h4>
            </div>
          </div>

          <span className="px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-zinc-300 font-mono text-[11px] font-bold shrink-0">
            {players.length} {players.length === 1 ? 'jugador/a' : 'convocados/as'}
          </span>
        </div>

        {/* Contenido de la Convocatoria */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-4">
          {roster.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-2.5 bg-zinc-900/40 border border-dashed border-zinc-800">
              <Users className="w-7 h-7 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-300 font-semibold">
                Convocatoria pendiente de publicación oficial en el acta federativa
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Las alineaciones y dorsales oficiales aparecen en cuanto el colegio arbitral cierra o valida la inscripción previa al encuentro.
              </p>
              <div className="pt-1">
                <a
                  href={officialExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                >
                  <span>Consultar ficha en {isAfade ? 'ligaafade.es' : 'favoley.net'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Jugadores/as Convocados/as */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-zinc-800/80">
                  <span>Jugadores / Jugadoras en Acta</span>
                  <span>Dorsal · Rol</span>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {players.map((p, idx) => (
                    <div
                      key={`${p.name}-${p.dorsal || idx}`}
                      className="py-2 flex items-center justify-between gap-2 hover:bg-white/[0.02] px-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-7 flex items-center justify-center font-mono text-xs font-extrabold border shrink-0 ${
                            isSanPedro
                              ? 'bg-primary-container/20 border-primary-container/50 text-primary'
                              : 'bg-zinc-900 border-zinc-700 text-white'
                          }`}
                        >
                          {p.dorsal ? `#${p.dorsal}` : '—'}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                          {p.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                        {p.isCaptain && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                            <Award className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>C · CAPITÁN/A</span>
                          </span>
                        )}
                        {p.isLibero && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>L · LÍBERO</span>
                          </span>
                        )}
                        {p.originCategory && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/20 border border-violet-400/50 text-violet-300 text-[10px] font-bold uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5 text-violet-400 shrink-0" />
                            <span>PROMOCIÓN: {p.originCategory}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cuerpo Técnico / Oficiales */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Cuerpo Técnico / Oficiales</span>
                </div>

                {staffList.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic">
                    Sin oficiales adicionales registrados en acta.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {staffList.map((st, sIdx) => {
                      const roleLabel = st.staffRole || st.role || 'Oficial / Entrenador';
                      return (
                        <div
                          key={`staff-${st.name}-${sIdx}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-800 text-xs"
                        >
                          <span className="font-semibold text-white truncate">{st.name}</span>
                          <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-bold uppercase tracking-wider shrink-0">
                            {roleLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-acta-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-2 border-zinc-800 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior de Acento Club */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-red-500 to-primary-container shrink-0" />

        {/* Cabecera Fija del Modal */}
        <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="px-2 py-0.5 bg-primary-container text-white font-display-xl text-sm uppercase tracking-wider">
              J{matchData.round}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="match-acta-modal-title"
                  className="font-display-xl text-lg sm:text-2xl uppercase text-white tracking-wide leading-none"
                >
                  ACTA OFICIAL • {categoryTitle}
                </h2>
                {renderStatusBadge()}
              </div>
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider mt-1 truncate">
                {competitionSub} · ID #{resolvedFavbId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchLiveActa(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-primary-container text-zinc-200 hover:text-white border border-zinc-700 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              title="Consultar y refrescar acta en vivo desde la federación"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
              <span>{loading ? 'Sincronizando...' : 'Refrescar Acta'}</span>
            </button>

            <a
              href={officialExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold uppercase tracking-wider transition-colors"
              title={`Abrir ficha oficial en ${isAfade ? 'ligaafade.es' : 'favoley.net'}`}
            >
              <span className="hidden sm:inline">Web Oficial</span>
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
              aria-label="Cerrar modal de acta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback de sincronización */}
        {feedbackMsg && (
          <div className="px-4 py-2 bg-primary-container/20 border-b border-primary-container/40 text-white text-xs font-semibold flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cuerpo Scrollable del Acta */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Marcador Principal y Parciales por Set */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-800 text-xs text-zinc-400">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-zinc-200 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {dateDisplay}
                </span>
                <span className="inline-flex items-center gap-1.5 text-primary font-mono font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {timeDisplay}h
                </span>
              </div>
              <span className="font-mono text-[11px] uppercase text-zinc-400">
                Jornada {matchData.round}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Equipo Local */}
              <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                <Image
                  src={getTeamLogo(homeName)}
                  alt={homeName}
                  width={48}
                  height={48}
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Equipo Local
                  </span>
                  <h3
                    className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate ${
                      isHomeSanPedro ? 'text-primary' : 'text-white'
                    }`}
                    title={homeName}
                  >
                    {homeName}
                  </h3>
                </div>
              </div>

              {/* Marcador Global y Sets */}
              <div className="md:col-span-4 flex flex-col items-center justify-center py-2 px-3 bg-zinc-950 border border-zinc-800">
                {totalSets &&
                (matchData.status === 'FINISHED' ||
                  matchData.status === 'LIVE' ||
                  setScores.length > 0) ? (
                  <>
                    <div className="flex items-center gap-4 font-display-xl text-3xl sm:text-4xl tracking-wider leading-none">
                      <span
                        className={
                          totalSets.home > totalSets.away ? 'text-emerald-400' : 'text-white'
                        }
                      >
                        {totalSets.home}
                      </span>
                      <span className="text-zinc-600 text-2xl">-</span>
                      <span
                        className={
                          totalSets.away > totalSets.home ? 'text-emerald-400' : 'text-white'
                        }
                      >
                        {totalSets.away}
                      </span>
                    </div>

                    {setScores.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2.5 pt-2 border-t border-zinc-800/80 w-full">
                        {setScores.map((s, idx) => (
                          <div
                            key={`modal-set-${idx}`}
                            className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-center"
                          >
                            <span className="block text-[9px] font-mono text-zinc-500 uppercase">
                              S{idx + 1}
                            </span>
                            <span className="font-mono text-xs font-bold text-zinc-200">
                              <span className={s.home > s.away ? 'text-emerald-400' : ''}>
                                {s.home}
                              </span>
                              -
                              <span className={s.away > s.home ? 'text-emerald-400' : ''}>
                                {s.away}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-1 text-center">
                    <span className="font-display-xl text-2xl text-primary tracking-widest">
                      VS
                    </span>
                    <span className="block text-[10px] font-mono uppercase text-zinc-400 mt-0.5">
                      {matchData.statusText || 'Encuentro Programado'}
                    </span>
                  </div>
                )}
              </div>

              {/* Equipo Visitante */}
              <div className="md:col-span-4 flex items-center md:justify-end gap-3 min-w-0">
                <div className="min-w-0 md:text-right order-2 md:order-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Equipo Visitante
                  </span>
                  <h3
                    className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate ${
                      isAwaySanPedro ? 'text-primary' : 'text-white'
                    }`}
                    title={awayName}
                  >
                    {awayName}
                  </h3>
                </div>
                <Image
                  src={getTeamLogo(awayName)}
                  alt={awayName}
                  width={48}
                  height={48}
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 order-1 md:order-2"
                />
              </div>
            </div>
          </div>

          {/* 2. Sede, Pista Exacta y Ubicación + Designaciones Arbitrales */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Sede, Pista y Ubicación */}
            <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <MapPin className="w-3.5 h-3.5" />
                    Instalación y Pista de Juego
                  </span>

                  {matchData.court && (
                    <span className="px-2.5 py-0.5 bg-primary-container text-white font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                      {matchData.court.toUpperCase()}
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-white leading-snug">{venueDisplay}</p>

                {matchData.locality && (
                  <p className="text-xs text-zinc-400">
                    Localidad: <strong className="text-zinc-200">{matchData.locality}</strong>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-zinc-400">
                  {isHomeSanPedro ? 'Sede Oficial C.D. Voleibol San Pedro' : 'Desplazamiento Visitante'}
                </span>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container hover:bg-secondary-container text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Cómo llegar (Maps)</span>
                </a>
              </div>
            </div>

            {/* Designaciones Arbitrales */}
            <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <Scale className="w-3.5 h-3.5" />
                    Designaciones Arbitrales (CTA FAVB)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {referees.length > 0 ? `${referees.length} colegiados/as` : 'Pendiente'}
                  </span>
                </div>

                {referees.length === 0 ? (
                  <div className="py-3 px-3 bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400">
                    Designación arbitral pendiente de publicación oficial en el acta del encuentro.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {referees.map((ref, idx) => (
                      <div
                        key={`ref-${idx}-${ref.name}`}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold uppercase shrink-0">
                            {ref.role}
                          </span>
                          <span className="font-semibold text-white truncate">{ref.name}</span>
                        </div>
                        {ref.isTrainee && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            EN PRÁCTICAS
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Convocatoria Oficial de Ambos Equipos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-display-xl text-lg sm:text-xl uppercase text-white tracking-wide">
                  CONVOCATORIA OFICIAL EN ACTA
                </h3>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-400/40 text-amber-300">
                  C · Capitán/a
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                  L · Líbero
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 border border-violet-400/40 text-violet-300">
                  Promoción Cantera
                </span>
              </div>
            </div>

            {loading && homeRoster.length === 0 && awayRoster.length === 0 ? (
              <div className="p-8 bg-zinc-900/50 border border-zinc-800 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
                <p className="text-xs font-bold uppercase tracking-wider text-white">
                  Consultando acta oficial en directo con favoley.net...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderTeamRosterColumn(homeName, homeRoster, isHomeSanPedro, 'Equipo Local')}
                {renderTeamRosterColumn(awayName, awayRoster, isAwaySanPedro, 'Equipo Visitante')}
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-3.5 sm:px-6 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0 text-xs">
          <span className="text-zinc-400 text-[11px] truncate">
            Datos oficiales sincronizados con{' '}
            <strong className="text-zinc-200">
              {isAfade ? 'Liga AFADE (ligaafade.es)' : 'Federación Andaluza de Voleibol (favoley.net)'}
            </strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-wider text-xs transition-colors shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
