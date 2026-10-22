'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INITIAL_CATEGORIES, INITIAL_STANDINGS } from '@/lib/data-store';
import { Standings } from '@/lib/types';
import { getTeamLogo } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';

const STANDINGS_STORAGE_KEY = 'cdv_synced_standings_v1';

export default function ClasificacionPage() {
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-senior-fem');
  const [allStandings, setAllStandings] = useState<Standings[]>(INITIAL_STANDINGS);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showRulesDropdown, setShowRulesDropdown] = useState<boolean>(false);
  const catScrollRef = useRef<HTMLDivElement | null>(null);

  const fetchLiveStandings = async (force = false) => {
    if (force) setSyncing(true);
    try {
      const res = await fetch(`/api/favb/standings?force=${force}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.standings) && data.standings.length > 0) {
        setAllStandings(data.standings);
        const formattedTime = data.lastSync
          ? new Date(data.lastSync).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(formattedTime);

        try {
          localStorage.setItem(
            STANDINGS_STORAGE_KEY,
            JSON.stringify({
              standings: data.standings,
              lastSync: data.lastSync || new Date().toISOString(),
            })
          );
        } catch {
          // Ignorar cuota de localStorage
        }

        if (force) {
          setSyncFeedback('Clasificación oficial sincronizada en directo con favoley.net');
          setTimeout(() => setSyncFeedback(null), 3500);
        }
      }
    } catch (err) {
      console.error('Error sincronizando clasificación con favoley.net:', err);
      if (force) {
        setSyncFeedback('Mostrando última clasificación oficial sincronizada.');
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Hidratar inmediatamente desde localStorage y sincronizar al entrar y cada 60s
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STANDINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.standings) && parsed.standings.length > 0) {
          setAllStandings(parsed.standings);
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
      // Ignorar errores de lectura de localStorage
    }

    fetchLiveStandings(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLiveStandings(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Centrar píldora de categoría seleccionada en el scroll horizontal
  useEffect(() => {
    const container = catScrollRef.current;
    const pill = document.getElementById(`clasif-cat-pill-${selectedCatId}`);
    if (container && pill) {
      const targetLeft =
        pill.offsetLeft - (container.clientWidth - pill.clientWidth) / 2;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollTo({ left: Math.max(0, Math.min(maxScroll, targetLeft)), behavior: 'smooth' });
    }
  }, [selectedCatId]);

  // Filtrar categorías que tengan clasificación activa
  const availableCategories = INITIAL_CATEGORIES.filter((c) =>
    allStandings.some((s) => s.categoryId === c.id)
  );

  // Mantener el orden oficial devuelto por favoley.net (que aplica puntos, coef. de sets y coef. de tantos)
  const standings = allStandings.filter((s) => s.categoryId === selectedCatId);

  const activeCategory =
    INITIAL_CATEGORIES.find((c) => c.id === selectedCatId) || INITIAL_CATEGORIES[0];

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-5 sm:py-8 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <span className="text-xs text-tertiary uppercase tracking-wider block mb-1">
            TEMPORADA 2026 / 2027
          </span>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none">
            <span className="text-white">CLASIFICACIÓN </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
              OFICIAL
            </span>
          </h1>
        </div>
      </section>

      {/* Tabs por categoría + Botón Icono Actualizar */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-2.5 sm:gap-3">
          <div
            ref={catScrollRef}
            className="flex items-center gap-2 overflow-x-auto category-scrollbar pb-1 sm:pb-1.5 scroll-smooth snap-x snap-mandatory flex-1"
          >
            {availableCategories.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              return (
                <button
                  key={cat.id}
                  id={`clasif-cat-pill-${cat.id}`}
                  onClick={() => setSelectedCatId(cat.id)}
                  aria-pressed={isSelected}
                  className={`w-[calc(100%-4.5rem)] sm:w-auto snap-center first:snap-start last:snap-end flex items-center justify-center text-center px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-primary-container text-white shadow-[3px_3px_0px_0px_#0e0e0e] -translate-y-0.5'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => fetchLiveStandings(true)}
            disabled={syncing}
            className="w-9 h-9 bg-primary-container hover:bg-secondary-container disabled:opacity-50 text-white flex items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] transition-all shrink-0"
            title={`Sincronizar clasificación ahora con favoley.net (Última: ${lastSyncTime})`}
            aria-label="Sincronizar clasificación"
          >
            <span className={`material-symbols-outlined text-[19px] ${syncing ? 'animate-spin' : ''}`} aria-hidden="true">
              sync
            </span>
          </button>
        </div>
      </section>

      {syncFeedback && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface-container-highest border border-primary/40 text-white px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]" aria-hidden="true">check_circle</span>
          <span>{syncFeedback}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Cabecera del grupo activo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                {activeCategory.description}
              </span>
              <span className="text-tertiary text-xs">·</span>
              <span className="text-[11px] font-mono text-tertiary">
                Sincronizado con favoley.net ({lastSyncTime})
              </span>
            </div>
            <h2 className="font-display-xl text-3xl uppercase text-white mt-0.5">
              {activeCategory.name}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-primary-container inline-block" />
              Puestos 1-3 (Fase de Ascenso / Playoff)
            </span>
          </div>
        </div>

        {/* Tabla Oficial */}
        <div className="bg-surface-container-low border border-white/5 shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse sm:min-w-[640px]">
            <caption className="sr-only">Clasificación oficial de la categoría {activeCategory.name}</caption>
            <thead>
              <tr className="bg-surface-container-lowest border-b border-white/10 text-[10px] sm:text-xs text-tertiary uppercase tracking-wider">
                <th scope="col" className="py-2.5 sm:py-3 px-1.5 sm:px-4 w-8 sm:w-16 text-center font-bold">POS</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1.5 sm:px-4 font-semibold">CLUB / EQUIPO</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Partidos Jugados">PJ</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Partidos Ganados">PG</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Partidos Perdidos">PP</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Sets a Favor">SF</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Sets en Contra">SC</th>
                <th scope="col" className="py-2.5 sm:py-3 px-1 sm:px-3 text-center font-semibold" title="Diferencia de Sets">DIF</th>
                <th scope="col" className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-bold text-white bg-primary-container/20">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {standings.map((team, idx) => {
                const pos = idx + 1;
                const isPlayoffZone = pos <= 3;
                const setDiff = team.setsFor - team.setsAgainst;

                return (
                  <tr
                    key={team.id}
                    className={`transition-colors ${
                      team.isCurrentClub
                        ? 'bg-primary-container/15 font-bold hover:bg-primary-container/25'
                        : pos % 2 === 0
                        ? 'bg-surface-container/50 hover:bg-surface-container-high'
                        : 'hover:bg-surface-container-high'
                    }`}
                  >
                    {/* Posición */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-4 text-center relative">
                      {isPlayoffZone && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
                      )}
                      <span
                        className={`font-display-xl text-base sm:text-lg ${
                          isPlayoffZone ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        {pos}
                      </span>
                    </td>

                    {/* Nombre del Club con Escudo Oficial */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-4 font-headline-sm uppercase text-white font-bold max-w-[140px] sm:max-w-none">
                      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                        <Image
                          src={getTeamLogo(team.teamName)}
                          alt={team.teamName}
                          width={32}
                          height={32}
                          className="w-5 h-5 sm:w-8 sm:h-8 object-contain shrink-0"
                        />
                        {team.isCurrentClub ? (
                          <Link
                            href={`/plantillas?categoria=${selectedCatId}`}
                            className="text-primary hover:underline decoration-primary underline-offset-4 transition-colors text-[11px] sm:text-sm leading-tight truncate sm:whitespace-normal"
                            title={`Ver plantilla de ${activeCategory.name}`}
                          >
                            {team.teamName}
                          </Link>
                        ) : (
                          <span className="text-white text-[11px] sm:text-sm leading-tight truncate sm:whitespace-normal">
                            {team.teamName}
                          </span>
                        )}
                        {team.isCurrentClub && (
                          <span className="hidden md:inline-block px-2 py-0.5 bg-primary-container text-white text-[9px] uppercase font-bold tracking-wider shrink-0">
                            Nuestro Club
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Métricas */}
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-white font-semibold">
                      {team.played}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-emerald-400 font-bold">
                      {team.won}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-rose-400">
                      {team.lost}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-tertiary">
                      {team.setsFor}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-tertiary">
                      {team.setsAgainst}
                    </td>
                    <td className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center font-mono text-tertiary">
                      {setDiff > 0 ? `+${setDiff}` : setDiff}
                    </td>

                    {/* Puntos Oficiales */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center font-display-xl text-lg sm:text-2xl text-white bg-primary-container/20">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Criterio Oficial de Puntuación FAVB / RFEVB como Desplegable */}
        <section className="bg-surface-container-low border border-white/10 p-5">
          <button
            type="button"
            onClick={() => setShowRulesDropdown(!showRulesDropdown)}
            aria-expanded={showRulesDropdown}
            aria-controls="favb-rules-content"
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">info</span>
              <div>
                <h3 className="font-headline-sm text-sm uppercase text-white font-bold group-hover:text-primary transition-colors">
                  Criterio Oficial de Puntuación FAVB / RFEVB
                </h3>
                <span className="text-xs text-tertiary">
                  Haz clic para ver cómo se calculan los puntos oficiales según sets ganados
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-tertiary transition-transform duration-200 text-[24px] ${
                showRulesDropdown ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            >
              expand_more
            </span>
          </button>

          {showRulesDropdown && (
            <div id="favb-rules-content" className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-surface-container-lowest border-l-4 border-emerald-500">
                  <span className="font-bold text-white uppercase block">Victoria 3-0 o 3-1</span>
                  <p className="font-display-xl text-2xl text-emerald-400 mt-1">3 PUNTOS</p>
                  <p className="text-tertiary text-[11px] mt-1">0 puntos para el perdedor.</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-teal-500">
                  <span className="font-bold text-white uppercase block">Victoria 3-2 (Tie-break)</span>
                  <p className="font-display-xl text-2xl text-teal-400 mt-1">2 PUNTOS</p>
                  <p className="text-tertiary text-[11px] mt-1">1 punto bonus para el perdedor.</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-amber-500">
                  <span className="font-bold text-white uppercase block">Derrota 2-3 (Tie-break)</span>
                  <p className="font-display-xl text-2xl text-amber-400 mt-1">1 PUNTO</p>
                  <p className="text-tertiary text-[11px] mt-1">2 puntos para el ganador.</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-rose-500">
                  <span className="font-bold text-white uppercase block">Derrota 0-3 o 1-3</span>
                  <p className="font-display-xl text-2xl text-rose-400 mt-1">0 PUNTOS</p>
                  <p className="text-tertiary text-[11px] mt-1">3 puntos para el ganador.</p>
                </div>
              </div>

              <p className="text-xs text-tertiary">
                En caso de empate a puntos entre dos o más clubes, se aplicará el coeficiente de sets (Sets a Favor / Sets en Contra) y posteriormente el coeficiente de tantos a favor/en contra.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Banner de Colaboración */}
      <SponsorBanner customText="APOYA AL C.D. VOLEIBOL SAN PEDRO" />
    </div>
  );
}
