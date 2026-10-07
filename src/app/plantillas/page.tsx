'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  INITIAL_CATEGORIES,
  INITIAL_TEAMS,
  INITIAL_PLAYERS,
  INITIAL_STAFF,
  CLUB_INFO,
} from '@/lib/data-store';
import { Position, POSITION_SHORT_LABELS, STAFF_ROLE_LABELS } from '@/lib/types';
import SponsorBanner from '@/components/SponsorBanner';

export default function PlantillasPage() {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('senior-masculino-a');
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');

  // Encontrar la categoría seleccionada
  const activeCategory = useMemo(() => {
    return (
      INITIAL_CATEGORIES.find((c) => c.slug === selectedCategorySlug) ||
      INITIAL_CATEGORIES[0]
    );
  }, [selectedCategorySlug]);

  // Encontrar el equipo asociado
  const activeTeam = useMemo(() => {
    return INITIAL_TEAMS.find((t) => t.categoryId === activeCategory.id) || INITIAL_TEAMS[0];
  }, [activeCategory]);

  // Filtrar jugadores por equipo y posición
  const filteredPlayers = useMemo(() => {
    return INITIAL_PLAYERS.filter((player) => {
      const matchTeam = player.teamId === activeTeam.id;
      const matchPos = selectedPosition === 'ALL' || player.position === selectedPosition;
      return matchTeam && matchPos;
    });
  }, [activeTeam, selectedPosition]);

  // Filtrar cuerpo técnico
  const staffMembers = useMemo(() => {
    return INITIAL_STAFF.filter((s) => s.teamId === activeTeam.id);
  }, [activeTeam]);

  const positionFilters: { label: string; value: Position | 'ALL' }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Colocadores', value: 'SETTER' },
    { label: 'Opuestos', value: 'OPPOSITE' },
    { label: 'Receptores / Puntas', value: 'OUTSIDE_HITTER' },
    { label: 'Centrales', value: 'MIDDLE_BLOCKER' },
    { label: 'Líberos', value: 'LIBERO' },
  ];

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                TEMPORADA 2026 / 2027
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                C.D. VOLEIBOL SAN PEDRO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              PLANTILLAS Y CUERPO TÉCNICO
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Conoce a los jugadores, entrenadores y cantera que defienden los colores de San Pedro Alcántara en las ligas de la Federación Andaluza de Voleibol.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-tertiary shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            <span>Jugadores federados FAVB</span>
          </div>
        </div>
      </section>

      {/* Selector Dinámico de Categorías */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar scroll-smooth">
            {INITIAL_CATEGORIES.map((cat) => {
              const isSelected = cat.slug === selectedCategorySlug;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategorySlug(cat.slug);
                    setSelectedPosition('ALL');
                  }}
                  className={`px-4 py-2 font-label-md text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap transition-all duration-200 font-bold ${
                    isSelected
                      ? 'bg-primary-container text-white shadow-[3px_3px_0px_0px_#0e0e0e] -translate-y-0.5'
                      : 'bg-surface-container-high text-tertiary hover:text-white hover:bg-surface-container-highest'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categoría Info & Filtros de Posición */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                {activeTeam.division}
              </span>
              <span className="text-tertiary">•</span>
              <span className="text-xs text-tertiary">Temporada {activeTeam.season}</span>
            </div>
            <h2 className="font-display-xl text-3xl uppercase text-white mt-1">
              {activeCategory.name}
            </h2>
            {activeCategory.description && (
              <p className="text-xs text-tertiary mt-0.5">{activeCategory.description}</p>
            )}
          </div>

          {/* Posiciones Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-tertiary uppercase mr-2 hidden sm:inline">
              Posición:
            </span>
            {positionFilters.map((pf) => {
              const isPosActive = selectedPosition === pf.value;
              return (
                <button
                  key={pf.value}
                  onClick={() => setSelectedPosition(pf.value)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isPosActive
                      ? 'bg-white text-black font-bold'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {pf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de Jugadores con Placeholders en Grises y Negro */}
        <div className="py-8">
          {filteredPlayers.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-12 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-tertiary mb-2">
                sports_volleyball
              </span>
              <h3 className="font-headline-sm text-lg uppercase text-white font-bold">
                No hay jugadores registrados en esta posición
              </h3>
              <p className="text-xs text-tertiary mt-1">
                Selecciona otra demarcación o restablece el filtro para ver la plantilla completa.
              </p>
              <button
                onClick={() => setSelectedPosition('ALL')}
                className="mt-4 px-4 py-2 bg-primary-container text-white text-xs uppercase font-bold"
              >
                Ver todos los jugadores
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="group bg-surface-container-low border border-white/5 hover:border-primary-container/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:-translate-y-1"
                >
                  {/* Athletic Silhouette Placeholder & Badges */}
                  <div className="relative h-72 w-full bg-[#18181b] overflow-hidden">
                    <Image
                      src={player.photoUrl || '/images/player-placeholder.svg'}
                      alt={`${player.firstName} ${player.lastName}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-black/20" />

                    {/* Big Dorsal Number */}
                    <div className="absolute top-3 left-3">
                      <span className="font-display-xl text-5xl sm:text-6xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                        {player.number}
                      </span>
                    </div>

                    {/* Roles Badges */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      {player.isCaptain && (
                        <span className="px-2 py-0.5 bg-amber-500 text-black font-bold text-[10px] uppercase tracking-wider shadow">
                          Capitán
                        </span>
                      )}
                      {player.isHomegrown && (
                        <span className="px-2 py-0.5 bg-primary-container text-white font-bold text-[10px] uppercase tracking-wider shadow">
                          Cantera
                        </span>
                      )}
                    </div>

                    {/* Position Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="px-2.5 py-1 bg-surface-container-highest/90 backdrop-blur-sm text-primary font-label-sm text-[11px] uppercase tracking-widest font-bold">
                        {POSITION_SHORT_LABELS[player.position]}
                      </span>
                    </div>
                  </div>

                  {/* Player Details */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-display-xl text-xl uppercase text-white leading-tight group-hover:text-primary transition-colors">
                        {player.firstName} <br />
                        <span className="text-on-surface">{player.lastName}</span>
                      </h3>
                    </div>

                    {/* Physical Stats */}
                    <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-tertiary block text-[10px] uppercase">Altura</span>
                        <span className="font-headline-sm text-sm text-white font-bold">
                          {player.heightCm} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-tertiary block text-[10px] uppercase">Año Nac.</span>
                        <span className="font-headline-sm text-sm text-white font-bold">
                          {player.birthYear}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección de Cuerpo Técnico */}
        {staffMembers.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="mb-6">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                Dirección Deportiva
              </span>
              <h3 className="font-display-xl text-2xl uppercase text-white">
                Cuerpo Técnico
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {staffMembers.map((staff) => {
                const isPresident = Boolean(CLUB_INFO.president && staff.name.toLowerCase() === CLUB_INFO.president.toLowerCase());
                return (
                  <div
                    key={staff.id}
                    className={`bg-surface-container-low border ${isPresident ? 'border-primary/40 bg-gradient-to-r from-surface-container-low to-primary/5' : 'border-white/5'} p-4 flex items-center gap-4`}
                  >
                    <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-white/10 bg-[#18181b]">
                      <Image
                        src={staff.photoUrl || '/images/staff-placeholder.svg'}
                        alt={staff.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">
                          {isPresident ? 'Presidente y Primer Entrenador' : STAFF_ROLE_LABELS[staff.role]}
                        </span>
                        {isPresident && (
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider border border-primary/30">
                            Dirección
                          </span>
                        )}
                      </div>
                      <h4 className="font-headline-sm text-sm uppercase text-white font-bold mt-0.5">
                        {staff.name}
                      </h4>
                      <span className="text-[11px] text-tertiary">
                        {CLUB_INFO.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Banner de Patrocinador Exclusivo de Plantilla corregido */}
      <div className="mt-12">
        <SponsorBanner customText="¿QUIERES SER EL PATROCINADOR DE ESTA PLANTILLA?" />
      </div>
    </div>
  );
}
