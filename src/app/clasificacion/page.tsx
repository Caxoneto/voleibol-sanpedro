'use client';

import { useState } from 'react';
import { INITIAL_CATEGORIES, INITIAL_STANDINGS, CLUB_INFO } from '@/lib/data-store';
import SponsorBanner from '@/components/SponsorBanner';

export default function ClasificacionPage() {
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-senior-masc-a');
  const [showRulesDropdown, setShowRulesDropdown] = useState<boolean>(false);

  // Filtrar categorías que tengan clasificación activa
  const availableCategories = INITIAL_CATEGORIES.filter((c) =>
    INITIAL_STANDINGS.some((s) => s.categoryId === c.id)
  );

  const standings = INITIAL_STANDINGS.filter(
    (s) => s.categoryId === selectedCatId
  ).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffB = b.setsFor - b.setsAgainst;
    const diffA = a.setsFor - a.setsAgainst;
    return diffB - diffA;
  });

  const activeCategory =
    INITIAL_CATEGORIES.find((c) => c.id === selectedCatId) || INITIAL_CATEGORIES[0];

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                TABLAS OFICIALES FAVB
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                TEMPORADA 2026 / 2027
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              CLASIFICACIÓN OFICIAL
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Puntuaciones y actas oficiales de la Federación Andaluza de Voleibol (favoley.net). Consulta posiciones, sets a favor y coeficientes de competición.
            </p>
          </div>

          <a
            href={CLUB_INFO.federationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-high hover:bg-primary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-md shrink-0 border border-white/5"
          >
            <span>Actas en favoley.net</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </section>

      {/* Tabs por categoría */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {availableCategories.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
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
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-10">
        {/* Cabecera del grupo activo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="text-xs text-primary font-bold uppercase tracking-wider">
              {activeCategory.description}
            </span>
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
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-white/10 text-xs text-tertiary uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center font-bold">POS</th>
                <th className="py-3 px-4 font-semibold">CLUB / EQUIPO</th>
                <th className="py-3 px-3 text-center font-semibold" title="Partidos Jugados">PJ</th>
                <th className="py-3 px-3 text-center font-semibold" title="Partidos Ganados">PG</th>
                <th className="py-3 px-3 text-center font-semibold" title="Partidos Perdidos">PP</th>
                <th className="py-3 px-3 text-center font-semibold" title="Sets a Favor">SF</th>
                <th className="py-3 px-3 text-center font-semibold" title="Sets en Contra">SC</th>
                <th className="py-3 px-3 text-center font-semibold" title="Diferencia de Sets">DIF</th>
                <th className="py-3 px-4 text-center font-bold text-white bg-primary-container/20">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
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
                    <td className="py-4 px-4 text-center relative">
                      {isPlayoffZone && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
                      )}
                      <span
                        className={`font-display-xl text-lg ${
                          isPlayoffZone ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        {pos}
                      </span>
                    </td>

                    {/* Nombre del Club */}
                    <td className="py-4 px-4 font-headline-sm uppercase text-white font-bold">
                      <div className="flex items-center gap-2">
                        <span className={team.isCurrentClub ? 'text-primary' : 'text-white'}>
                          {team.teamName}
                        </span>
                        {team.isCurrentClub && (
                          <span className="px-2 py-0.5 bg-primary-container text-white text-[9px] uppercase font-bold tracking-wider">
                            Nuestro Club
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Métricas */}
                    <td className="py-4 px-3 text-center font-mono text-tertiary">{team.played}</td>
                    <td className="py-4 px-3 text-center font-mono text-emerald-400 font-bold">{team.won}</td>
                    <td className="py-4 px-3 text-center font-mono text-rose-400">{team.lost}</td>
                    <td className="py-4 px-3 text-center font-mono text-tertiary">{team.setsFor}</td>
                    <td className="py-4 px-3 text-center font-mono text-tertiary">{team.setsAgainst}</td>
                    <td className="py-4 px-3 text-center font-mono text-tertiary">
                      {setDiff > 0 ? `+${setDiff}` : setDiff}
                    </td>

                    {/* Puntos Oficiales */}
                    <td className="py-4 px-4 text-center font-display-xl text-2xl text-white bg-primary-container/20">
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
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">info</span>
              <div>
                <h3 className="font-headline-sm text-sm uppercase text-white font-bold group-hover:text-primary transition-colors">
                  Criterio Oficial de Puntuación FAVB / RFEVB
                </h3>
                <span className="text-xs text-tertiary">
                  Haz clic para ver cómo se calculan los puntos oficiales según sets ganados
                </span>
              </div>
            </div>
            <span className={`material-symbols-outlined text-tertiary transition-transform duration-200 text-[24px] ${showRulesDropdown ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {showRulesDropdown && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
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
