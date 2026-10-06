'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  INITIAL_MATCHES,
  INITIAL_PLAYERS,
  CLUB_INFO,
} from '@/lib/data-store';
import { FavbMatch } from '@/lib/favb-scraper';
import { formatMadridDate, formatMadridTime } from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import SponsorBanner from '@/components/SponsorBanner';

export default function PartidosPage() {
  const [matches, setMatches] = useState<FavbMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');

  // MVP simbólico del último partido
  const mvpPlayer = INITIAL_PLAYERS[1]; // Mateo Fernández

  // Carga automática al entrar a la sección
  useEffect(() => {
    fetchFavbMatches(false);
  }, []);

  const fetchFavbMatches = async (force: boolean) => {
    if (force) setSyncing(true);
    try {
      const res = await fetch(`/api/favb/sync?force=${force}`);
      const data = await res.json();
      if (data.success && data.matches) {
        setMatches(data.matches);
        setLastSyncTime(new Date(data.lastSync).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Error al sincronizar con favoley.net', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const featuredMatch = INITIAL_MATCHES.find((m) => m.isFeatured) || INITIAL_MATCHES[0];
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');
  const upcomingMatches = matches.filter((m) => m.status === 'SCHEDULED');

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Hero Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
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
              Resultados oficiales federados sincronizados directamente desde la Federación Andaluza de Voleibol (favoley.net). Estos resultados son oficiales y no modificables.
            </p>
          </div>

          {/* Botón de Sincronización Manual */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchFavbMatches(true)}
              disabled={syncing}
              className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright disabled:opacity-50 text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all border border-white/10 flex items-center gap-2 shadow"
              title="Forzar actualización en tiempo real desde favoley.net"
            >
              <span className={`material-symbols-outlined text-primary text-[18px] ${syncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{syncing ? 'Sincronizando FAVB...' : 'Actualizar Resultados FAVB'}</span>
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

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-12">
        {/* Banner de Sincronización Oficial */}
        <div className="p-3 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-tertiary gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Fuente oficial: <strong>Federación Andaluza de Voleibol (favoley.net)</strong></span>
          </div>
          <span className="font-mono text-[11px]">Última comprobación: {lastSyncTime}</span>
        </div>

        {/* Partido Destacado de la Jornada */}
        <section className="bg-surface-container-low border border-primary-container/40 p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-primary-container text-white text-xs uppercase font-bold tracking-widest">
                PARTIDO ESTELAR DE LA JORNADA {featuredMatch.round}
              </span>
              <span className="text-xs text-tertiary uppercase font-semibold">
                1ª División Andaluza
              </span>
            </div>
          </div>

          {/* Marcador / Versus Central */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-7 items-center gap-6 text-center">
            {/* Equipo Local */}
            <div className="md:col-span-3 flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-container-high border-2 border-primary-container flex items-center justify-center p-3 mb-3 shadow-lg">
                <Image
                  src="/images/logo.jpg"
                  alt="C.D. Voleibol San Pedro"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                {featuredMatch.homeTeamName}
              </h2>
              <span className="text-xs uppercase font-bold text-primary mt-1">Local</span>
            </div>

            {/* Marcador / Estado */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="px-4 py-2 bg-surface-container-lowest border border-white/10 mb-2">
                <span className="font-display-xl text-3xl sm:text-4xl text-primary leading-none">
                  VS
                </span>
              </div>
              <span className="text-xs text-tertiary uppercase font-bold">
                {formatMadridTime(featuredMatch.matchDate)}h
              </span>
              <span className="text-[11px] text-tertiary">
                {formatMadridDate(featuredMatch.matchDate, { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Equipo Visitante */}
            <div className="md:col-span-3 flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-container-high border border-white/10 flex items-center justify-center p-3 mb-3 shadow-lg">
                <span className="font-display-xl text-3xl text-tertiary">RIV</span>
              </div>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-on-surface">
                {featuredMatch.awayTeamName}
              </h2>
              <span className="text-xs uppercase font-bold text-tertiary mt-1">Visitante</span>
            </div>
          </div>

          {/* Footer del partido destacado */}
          <div className="bg-surface-container-lowest p-4 border-l-4 border-primary-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">stadium</span>
              <div className="text-left">
                <p className="font-headline-sm text-sm uppercase text-white font-bold">
                  {featuredMatch.venueName}
                </p>
                <p className="text-xs text-tertiary">
                  San Pedro Alcántara
                </p>
              </div>
            </div>
            <Link
              href="/calendario#pabellon"
              className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider transition-colors shadow"
            >
              Cómo llegar al Pabellón
            </Link>
          </div>
        </section>

        {/* Sección de Marcadores Oficiales Set a Set */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Actas Arbitrales Oficiales
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                Resultados Oficiales FAVB
              </h2>
            </div>
            <span className="text-xs text-tertiary hidden sm:inline">
              Datos protegidos • No modificables
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {finishedMatches.length === 0 && !loading && (
              <div className="p-8 bg-surface-container-low border border-white/5 text-center text-xs text-tertiary">
                No hay partidos finalizados con acta cerrada en la jornada activa.
              </div>
            )}

            {finishedMatches.map((m) => {
              const score = m.setScores && m.setScores.length > 0 ? calculateMatchScore(m.setScores) : null;

              return (
                <div
                  key={m.id}
                  className="bg-surface-container-low border border-white/5 p-6 hover:border-primary-container/50 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="font-display-xl text-lg text-primary">
                        JORNADA {m.round}
                      </span>
                      <span className="text-xs text-tertiary uppercase font-semibold">
                        {m.categoryName} • {m.competitionCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-tertiary">
                      <span>{m.dateStr}</span>
                      <span>•</span>
                      <span>{m.venue}</span>
                    </div>
                  </div>

                  {/* Tabla de Marcadores */}
                  <div className="py-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-tertiary uppercase">
                          <th className="py-2 pr-4 font-semibold">Equipo</th>
                          <th className="py-2 px-3 text-center font-bold">RESULTADO</th>
                          {m.setScores && m.setScores.map((_, sIdx) => (
                            <th key={sIdx} className="py-2 px-3 text-center">Set {sIdx + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5">
                          <td className="py-3 pr-4 font-headline-sm text-sm uppercase text-white font-bold">
                            <span className={m.isClubHome ? 'text-primary' : 'text-white'}>
                              {m.homeTeam}
                            </span>
                            {m.isClubHome && (
                              <span className="ml-2 text-[10px] text-primary uppercase font-bold">(Club)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-display-xl text-2xl text-white">
                            {score ? score.homeSetsWon : (m.homeScore ?? '–')}
                          </td>
                          {m.setScores?.map((s, idx) => (
                            <td
                              key={idx}
                              className={`py-3 px-3 text-center font-mono text-sm ${
                                s.home > s.away ? 'text-primary font-bold bg-primary-container/10' : 'text-tertiary'
                              }`}
                            >
                              {s.home}
                            </td>
                          ))}
                        </tr>

                        <tr>
                          <td className="py-3 pr-4 font-headline-sm text-sm uppercase text-white font-bold">
                            <span className={!m.isClubHome ? 'text-primary' : 'text-white'}>
                              {m.awayTeam}
                            </span>
                            {!m.isClubHome && (
                              <span className="ml-2 text-[10px] text-primary uppercase font-bold">(Club)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-display-xl text-2xl text-white">
                            {score ? score.awaySetsWon : (m.awayScore ?? '–')}
                          </td>
                          {m.setScores?.map((s, idx) => (
                            <td
                              key={idx}
                              className={`py-3 px-3 text-center font-mono text-sm ${
                                s.away > s.home ? 'text-primary font-bold bg-primary-container/10' : 'text-tertiary'
                              }`}
                            >
                              {s.away}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-tertiary">
                    <span>Acta oficial federada • FAVB</span>
                    <a
                      href={m.favbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Ver en favoley.net</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección MVP de la Jornada */}
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
                    <span className="font-display-xl text-xl text-primary font-bold">#{mvpPlayer.number}</span>
                  </div>
                  <div>
                    <span className="text-tertiary uppercase text-[10px] block">Demarcación</span>
                    <span className="font-headline-sm text-sm text-white font-bold">{mvpPlayer.position}</span>
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

        {/* Agenda del Fin de Semana (Todas las categorías federadas) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Cantera y Senior
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white">
                Próximos Partidos en Calendario FAVB
              </h2>
            </div>
            <Link href="/calendario" className="text-xs text-tertiary hover:text-primary uppercase font-bold">
              Ver calendario general
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map((m) => (
              <div
                key={m.id}
                className="bg-surface-container-low border border-white/5 p-5 flex flex-col justify-between hover:border-primary-container/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-tertiary uppercase pb-3 border-b border-white/5">
                    <span className="font-bold text-primary">{m.categoryName}</span>
                    <span>Jornada {m.round}</span>
                  </div>

                  <div className="py-4 space-y-1">
                    <p className={`font-headline-sm text-sm uppercase font-bold truncate ${m.isClubHome ? 'text-primary' : 'text-white'}`}>
                      {m.homeTeam}
                    </p>
                    <p className="text-[11px] text-tertiary">vs</p>
                    <p className={`font-headline-sm text-sm uppercase font-bold truncate ${!m.isClubHome ? 'text-primary' : 'text-white'}`}>
                      {m.awayTeam}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-tertiary">
                    <span>{m.dateStr}</span>
                    <span className="font-bold text-white">{m.timeStr}h</span>
                  </div>
                  <p className="text-[11px] text-tertiary truncate">
                    📍 {m.venue}
                  </p>
                  {m.isClubHome && (
                    <span className="inline-block px-2 py-0.5 bg-primary-container/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                      Partido en Casa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SponsorBanner customText="APOYA AL C.D. VOLEIBOL SAN PEDRO EN TODAS SUS CATEGORÍAS" />
    </div>
  );
}
