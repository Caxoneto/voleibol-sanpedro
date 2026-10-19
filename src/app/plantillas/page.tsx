'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  INITIAL_CATEGORIES,
  INITIAL_TEAMS,
  INITIAL_PLAYERS,
  INITIAL_STAFF,
  CLUB_INFO,
} from '@/lib/data-store';
import { Position, POSITION_SHORT_LABELS, STAFF_ROLE_LABELS, Player, Staff } from '@/lib/types';
import { FAVB_COMPETITIONS } from '@/lib/favb-scraper';
import SponsorBanner from '@/components/SponsorBanner';

const ROSTERS_STORAGE_KEY = 'cdv_synced_rosters_v1';

export default function PlantillasPage() {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('senior-femenino');
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const catScrollRef = useRef<HTMLDivElement | null>(null);

  const fetchLiveRosters = async (force = false) => {
    if (force) setSyncing(true);
    try {
      const res = await fetch(`/api/favb/rosters?force=${force}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.players) && data.players.length > 0) {
        setPlayers(data.players);
        if (Array.isArray(data.staff) && data.staff.length > 0) {
          setStaffList(data.staff);
        }
        const formattedTime = data.lastSync
          ? new Date(data.lastSync).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(formattedTime);

        try {
          localStorage.setItem(
            ROSTERS_STORAGE_KEY,
            JSON.stringify({
              players: data.players,
              staff: data.staff || INITIAL_STAFF,
              lastSync: data.lastSync || new Date().toISOString(),
            })
          );
        } catch {
          // Ignorar cuota de localStorage
        }

        if (force) {
          const realCount = data.players.filter(
            (p: Player) => p.firstName !== 'Jugador' && p.firstName !== 'Jugadora'
          ).length;
          setSyncFeedback(
            `Plantillas y cuerpo técnico sincronizados con favoley.net (${realCount} licencias oficiales)`
          );
          setTimeout(() => setSyncFeedback(null), 3500);
        }
      }
    } catch {
      if (force) {
        setSyncFeedback('Mostrando última plantilla oficial sincronizada.');
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Hidratar categoría desde URL (?categoria= o ?category= o ?slug=) + localStorage y sincronizar con favoley.net
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam =
        params.get('categoria') || params.get('category') || params.get('slug') || params.get('team');
      if (catParam) {
        const normalized = catParam.trim().toLowerCase();
        const matchedCat = INITIAL_CATEGORIES.find(
          (c) =>
            c.id.toLowerCase() === normalized ||
            c.slug.toLowerCase() === normalized ||
            c.name.toLowerCase() === normalized
        );
        if (matchedCat) {
          setSelectedCategorySlug(matchedCat.slug);
        } else {
          const matchedTeam = INITIAL_TEAMS.find((t) => t.id.toLowerCase() === normalized);
          if (matchedTeam) {
            const teamCat = INITIAL_CATEGORIES.find((c) => c.id === matchedTeam.categoryId);
            if (teamCat) setSelectedCategorySlug(teamCat.slug);
          }
        }
      }
    }

    try {
      const cached = localStorage.getItem(ROSTERS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.players) && parsed.players.length > 0) {
          setPlayers(parsed.players);
        }
        if (Array.isArray(parsed.staff) && parsed.staff.length > 0) {
          setStaffList(parsed.staff);
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

    fetchLiveRosters(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLiveRosters(true);
      }
    }, 90000);
    return () => clearInterval(interval);
  }, []);

  // Centrar píldora de categoría seleccionada en el scroll horizontal
  useEffect(() => {
    const container = catScrollRef.current;
    const pill = document.getElementById(`plantillas-cat-pill-${selectedCategorySlug}`);
    if (container && pill) {
      const targetLeft = pill.offsetLeft - container.clientWidth / 2 + pill.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [selectedCategorySlug]);

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

  const activeCompMeta = FAVB_COMPETITIONS.find((c) => c.categoryId === activeCategory.id);
  const favbDirectUrl = activeCompMeta
    ? `https://favoley.net/publico/seccion.php?seccion=competicion&id=${activeCompMeta.favbId}&vista=calendario&grupo=${activeCompMeta.grupo}&fase=${activeCompMeta.fase}`
    : CLUB_INFO.federationUrl;

  // Filtrar jugadores por equipo y posición
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchTeam = player.teamId === activeTeam.id;
      const matchPos = selectedPosition === 'ALL' || player.position === selectedPosition;
      return matchTeam && matchPos;
    });
  }, [players, activeTeam, selectedPosition]);

  // Filtrar cuerpo técnico
  const staffMembers = useMemo(() => {
    return staffList.filter((s) => s.teamId === activeTeam.id);
  }, [staffList, activeTeam]);

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
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-10 sm:py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LICENCIAS EN VIVO FAVB
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                TEMPORADA 2026 / 2027
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none">
              <span className="text-white">PLANTILLAS Y </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                CUERPO TÉCNICO
              </span>
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Conoce a los jugadores, entrenadores y cantera que defienden los colores de San Pedro Alcántara en las ligas de la Federación Andaluza de Voleibol.
            </p>
          </div>

          <a
            href={favbDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-primary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-md shrink-0 border border-white/10 self-start md:self-auto"
          >
            <span>Ver actas en favoley.net</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </section>

      {/* Selector Dinámico de Categorías + Botón Icono Actualizar */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div
            ref={catScrollRef}
            className="flex items-center gap-2 overflow-x-auto category-scrollbar pb-1.5 scroll-smooth flex-1"
          >
            {INITIAL_CATEGORIES.map((cat) => {
              const isSelected = cat.slug === selectedCategorySlug;
              return (
                <button
                  key={cat.id}
                  id={`plantillas-cat-pill-${cat.slug}`}
                  onClick={() => {
                    setSelectedCategorySlug(cat.slug);
                    setSelectedPosition('ALL');
                  }}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
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

          <button
            type="button"
            onClick={() => fetchLiveRosters(true)}
            disabled={syncing}
            className="w-9 h-9 bg-primary-container hover:bg-secondary-container disabled:opacity-50 text-white flex items-center justify-center border border-white/20 shadow-[2px_2px_0px_0px_#0e0e0e] transition-all shrink-0"
            title={`Sincronizar plantillas y cuerpo técnico ahora con favoley.net (Última: ${lastSyncTime})`}
            aria-label="Sincronizar plantillas"
          >
            <span className={`material-symbols-outlined text-[19px] ${syncing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </section>

      {/* Aviso flotante de confirmación de sincronización */}
      {syncFeedback && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface-container-highest border border-primary/40 text-white px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Categoría Info & Filtros de Posición */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                {activeTeam.division}
              </span>
              <span className="text-tertiary">•</span>
              <span className="text-[11px] font-mono text-tertiary">
                Sincronizado con favoley.net ({lastSyncTime})
              </span>
            </div>
            <h2 className="font-display-xl text-3xl uppercase text-white mt-1">
              {activeCategory.name}
            </h2>
            {activeCategory.description && (
              <p className="text-xs text-tertiary mt-0.5">{activeCategory.description}</p>
            )}
          </div>

          {/* Posiciones Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-wrap">
            <span className="text-xs text-tertiary uppercase mr-2 hidden sm:inline">
              Posición:
            </span>
            {positionFilters.map((pf) => {
              const isPosActive = selectedPosition === pf.value;
              return (
                <button
                  key={pf.value}
                  onClick={() => setSelectedPosition(pf.value)}
                  className={`px-3 py-2 sm:py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors ${
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
        <div className="py-6 sm:py-8">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {filteredPlayers.map((player) => {
                const isPlaceholderSlot =
                  player.firstName === 'Jugador' || player.firstName === 'Jugadora';

                return (
                  <div
                    key={player.id}
                    className="group bg-surface-container-low border border-white/5 hover:border-primary-container/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:-translate-y-1"
                  >
                    {/* Athletic Silhouette Placeholder & Badges */}
                    <div className="relative h-48 sm:h-72 w-full bg-[#18181b] overflow-hidden">
                      <Image
                        src={player.photoUrl || '/images/player-placeholder.svg'}
                        alt={`${player.firstName} ${player.lastName}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-black/20" />

                      {/* Big Dorsal Number */}
                      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
                        <span className="font-display-xl text-4xl sm:text-6xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                          {player.number}
                        </span>
                      </div>

                      {/* Roles Badges */}
                      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col items-end gap-1">
                        {player.isCaptain && !isPlaceholderSlot && (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-amber-500 text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-wider shadow">
                            Capitán
                          </span>
                        )}
                        {isPlaceholderSlot ? (
                          <span className="px-1.5 sm:px-2 py-0.5 bg-surface-container-highest text-tertiary font-bold text-[9px] sm:text-[10px] uppercase tracking-wider border border-white/10 shadow">
                            Pendiente Acta
                          </span>
                        ) : (
                          player.isHomegrown && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-primary-container text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider shadow">
                              Federado FAVB
                            </span>
                          )
                        )}
                      </div>

                      {/* Position Overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3">
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-surface-container-highest/90 backdrop-blur-sm text-primary font-label-sm text-[10px] sm:text-[11px] uppercase tracking-widest font-bold inline-block truncate max-w-full">
                          {POSITION_SHORT_LABELS[player.position]}
                        </span>
                      </div>
                    </div>

                    {/* Player Details */}
                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-display-xl text-base sm:text-xl uppercase text-white leading-tight group-hover:text-primary transition-colors">
                          {isPlaceholderSlot ? (
                            <span>
                              {player.firstName} {player.lastName}
                            </span>
                          ) : (
                            <>
                              {player.firstName} <br />
                              <span className="text-on-surface">{player.lastName}</span>
                            </>
                          )}
                        </h3>
                        {isPlaceholderSlot && (
                          <span className="text-[10px] sm:text-[11px] text-tertiary block mt-1 leading-snug">
                            Pendiente de acta en favoley.net
                          </span>
                        )}
                      </div>

                      {/* Physical Stats */}
                      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/5 grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                        <div>
                          <span className="text-tertiary block text-[9px] sm:text-[10px] uppercase">Dorsal</span>
                          <span className="font-headline-sm text-xs sm:text-sm text-white font-bold">
                            #{player.number}
                          </span>
                        </div>
                        <div>
                          <span className="text-tertiary block text-[9px] sm:text-[10px] uppercase">Estado FAVB</span>
                          <span
                            className={`font-headline-sm text-xs sm:text-sm font-bold ${
                              isPlaceholderSlot ? 'text-tertiary' : 'text-emerald-400'
                            }`}
                          >
                            {isPlaceholderSlot ? 'Pendiente' : 'Inscrito'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                const isPresident = Boolean(
                  CLUB_INFO.president &&
                    staff.name.toLowerCase() === CLUB_INFO.president.toLowerCase()
                );
                return (
                  <div
                    key={staff.id}
                    className={`bg-surface-container-low border ${
                      isPresident
                        ? 'border-primary/40 bg-gradient-to-r from-surface-container-low to-primary/5'
                        : 'border-white/5'
                    } p-4 flex items-center gap-4`}
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
                          {isPresident
                            ? 'Presidente y Primer Entrenador'
                            : STAFF_ROLE_LABELS[staff.role]}
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
                      <span className="text-[11px] text-tertiary">{CLUB_INFO.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Banner de Patrocinador Exclusivo de Plantilla */}
      <div className="mt-12">
        <SponsorBanner customText="¿QUIERES SER EL PATROCINADOR DE ESTA PLANTILLA?" />
      </div>
    </div>
  );
}
