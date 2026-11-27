'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Award, RefreshCw, Users } from 'lucide-react';
import {
  CLUB_CATEGORIES_META,
  CLUB_TEAMS_META,
  CLUB_INFO,
  formatPlayerNameWithInitials,
  getTeamColorTheme,
} from '@/lib/club-info';
import { STAFF_ROLE_LABELS, Player, Staff } from '@/lib/types';
import SponsorBanner from '@/components/SponsorBanner';
import CategoryTeamSelectorBar from '@/components/CategoryTeamSelectorBar';

function PlantillasContent() {
  const searchParams = useSearchParams();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('senior-femenino');
  const [players, setPlayers] = useState<Player[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reemplazo limpio autorizado desde servidor (respeta anonimización y revocaciones en tiempo real)
  const applyServerRosters = useCallback(
    (incomingPlayers: Player[], incomingStaff?: Staff[], scopedTeamId?: string) => {
      setPlayers((prevPlayers) => {
        const nextList = scopedTeamId
          ? [
              ...prevPlayers.filter((p) => p.teamId !== scopedTeamId),
              ...incomingPlayers.filter((p) => p.teamId === scopedTeamId),
            ]
          : incomingPlayers;

        const ordered: Player[] = [];
        for (const team of CLUB_TEAMS_META) {
          const teamRows = nextList
            .filter((p) => p.teamId === team.id)
            .sort((a, b) => a.number - b.number);
          ordered.push(...teamRows);
        }
        return ordered;
      });

      if (Array.isArray(incomingStaff)) {
        setStaffList((prevStaff) => {
          if (!scopedTeamId) return incomingStaff;
          return [
            ...prevStaff.filter((s) => s.teamId !== scopedTeamId),
            ...incomingStaff.filter((s) => s.teamId === scopedTeamId),
          ];
        });
      }
    },
    []
  );

  const fetchLiveRosters = useCallback(
    async (targetTeamId?: string) => {
      try {
        const teamQuery = targetTeamId ? `?teamId=${encodeURIComponent(targetTeamId)}` : '';
        const res = await fetch(`/api/favb/rosters${teamQuery}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          setLoadError(
            data?.error || 'No se pudieron consultar las plantillas oficiales en este momento.'
          );
          return;
        }

        setLoadError(null);
        const incomingPlayers: Player[] = Array.isArray(data.players) ? data.players : [];
        const incomingStaff: Staff[] = Array.isArray(data.staff) ? data.staff : [];

        applyServerRosters(incomingPlayers, incomingStaff, targetTeamId);
      } catch {
        setLoadError('Error de conexión al cargar las plantillas oficiales.');
      } finally {
        setLoadingInitial(false);
      }
    },
    [applyServerRosters]
  );

  // Hidratar categoría reactivamente desde query params (?categoria=...)
  useEffect(() => {
    const catParam =
      searchParams.get('categoria') ||
      searchParams.get('category') ||
      searchParams.get('slug') ||
      searchParams.get('team');
    if (!catParam) return;

    const normalized = catParam.trim().toLowerCase();
    const matchedCat = CLUB_CATEGORIES_META.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.slug.toLowerCase() === normalized ||
        c.name.toLowerCase() === normalized
    );
    if (matchedCat) {
      setSelectedCategorySlug(matchedCat.slug);
    } else {
      const matchedTeam = CLUB_TEAMS_META.find((t) => t.id.toLowerCase() === normalized);
      if (matchedTeam) {
        const teamCat = CLUB_CATEGORIES_META.find((c) => c.id === matchedTeam.categoryId);
        if (teamCat) setSelectedCategorySlug(teamCat.slug);
      }
    }
  }, [searchParams]);

  // Limpiar caché heredada y sincronizar en segundo plano (sin ?force=true en cliente público)
  useEffect(() => {
    try {
      window.localStorage.removeItem('cdv_synced_rosters_v6');
    } catch {
      // Ignorar errores de limpieza en localStorage
    }

    void fetchLiveRosters();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchLiveRosters();
      }
    }, 90000);

    return () => {
      clearInterval(interval);
    };
  }, [applyServerRosters, fetchLiveRosters]);

  const activeCategory = useMemo(() => {
    return (
      CLUB_CATEGORIES_META.find((c) => c.slug === selectedCategorySlug) ||
      CLUB_CATEGORIES_META[0]
    );
  }, [selectedCategorySlug]);

  const activeTeam = useMemo(() => {
    return CLUB_TEAMS_META.find((t) => t.categoryId === activeCategory.id) || CLUB_TEAMS_META[0];
  }, [activeCategory]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => player.teamId === activeTeam.id);
  }, [players, activeTeam]);

  const staffMembers = useMemo(() => {
    return staffList.filter((s) => s.teamId === activeTeam.id);
  }, [staffList, activeTeam]);

  const isAfade = activeCategory.association === 'AFADE' || activeCategory.name.includes('AFADE');

  return (
    <div className="w-full min-h-screen bg-background relative overflow-x-clip">
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Header Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-6 sm:py-10 border-b border-white/5 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
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
            <p className="hidden md:block font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Conoce a los jugadores, entrenadores y cantera que defienden los colores de San Pedro Alcántara en las ligas de la Federación Andaluza de Voleibol.
            </p>
          </div>
        </div>
      </section>

      {/* Selector Dinámico de Categorías agrupado con desplegable de equipos */}
      <CategoryTeamSelectorBar
        items={CLUB_CATEGORIES_META}
        selectedValue={selectedCategorySlug}
        valueKey="slug"
        idPrefix="plantillas-cat-pill-"
        defaultOpenSelected
        ariaLabel="Categorías y equipos de plantillas"
        onSelect={(slug) => {
          setSelectedCategorySlug(slug);
        }}
      />

      {/* Categoría Info */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 relative z-10">
        <div className="pb-5 border-b border-white/5">
          <h2 className={`font-display-xl text-3xl uppercase ${getTeamColorTheme(activeCategory.name).colorKey ? getTeamColorTheme(activeCategory.name).textClass : 'text-white'}`}>
            {activeCategory.name}
          </h2>
        </div>

        {/* Grid de Jugadores */}
        <div className="py-6 sm:py-8 space-y-4">
          {loadError && filteredPlayers.length > 0 && (
            <div role="alert" className="bg-red-950/40 border border-red-500/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-red-200">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void fetchLiveRosters(activeTeam.id)}
                className="px-3 py-1 bg-primary-container hover:bg-cta-hover text-white font-bold uppercase cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}
          {loadingInitial && filteredPlayers.length === 0 ? (
            <div className="bg-surface-container-low border border-white/10 p-10 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-7 h-7 text-primary animate-spin" aria-hidden="true" />
              <p className="text-xs uppercase font-bold tracking-wider text-white">
                Cargando plantilla oficial y verificando privacidad...
              </p>
            </div>
          ) : loadError && filteredPlayers.length === 0 ? (
            <div role="alert" className="bg-red-950/40 border border-red-500/40 p-8 text-center flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-red-200 font-semibold">{loadError}</p>
              <button
                type="button"
                onClick={() => void fetchLiveRosters(activeTeam.id)}
                className="px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Reintentar carga
              </button>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-8 sm:p-14 text-center flex flex-col items-center justify-center max-w-2xl mx-auto shadow-2xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-4 text-primary">
                <Users className="w-8 h-8" aria-hidden="true" />
              </div>
              <span className="px-2.5 py-1 bg-surface-container-highest text-tertiary font-bold text-[10px] uppercase tracking-widest border border-white/10 mb-3">
                {isAfade ? 'Competición Liga AFADE 26/27' : 'Competición Oficial FAVB 26/27'}
              </span>
              <h3 className="font-display-xl text-xl sm:text-2xl uppercase text-white font-bold mb-2">
                Plantilla en fase de configuración
              </h3>
              <p className="text-xs sm:text-sm text-tertiary max-w-md leading-relaxed">
                Las licencias oficiales y la relación de jugadoras de esta categoría se publicarán en cuanto la organización valide las actas de juego.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {filteredPlayers.map((player) => {
                const isGenericSlot =
                  player.firstName === 'Jugador' || player.firstName === 'Jugadora';
                const formattedName = formatPlayerNameWithInitials(
                  player.firstName,
                  player.lastName
                );
                const displayFirst = isGenericSlot
                  ? player.firstName
                  : formattedName.firstName || player.firstName;
                const displayLast = isGenericSlot
                  ? player.lastName
                  : formattedName.lastInitials;
                const callUps = player.matchesCalledUp ?? 0;
                const totalClubCallUps = player.totalClubCallUps ?? callUps;
                const hasOtherCallUps =
                  Array.isArray(player.otherTeamCallUps) && player.otherTeamCallUps.length > 0;

                return (
                  <div
                    key={player.id}
                    className="group bg-surface-container-low border border-white/5 hover:border-primary-container/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:-translate-y-1"
                  >
                    <div className="relative h-48 sm:h-72 w-full bg-[#18181b] overflow-hidden">
                      <Image
                        src={player.photoUrl || '/images/player-placeholder.svg'}
                        alt={`${displayFirst} ${displayLast}`.trim()}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-black/20" />

                      <div className="pointer-events-none absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
                        <span className="font-display-xl text-3xl sm:text-6xl text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                          {player.number}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-display-xl text-base sm:text-xl uppercase text-white leading-tight group-hover:text-primary transition-colors">
                          {displayFirst}{' '}
                          {displayLast && (
                            <>
                              <br />
                              <span className="text-on-surface">{displayLast}</span>
                            </>
                          )}
                        </h3>
                        {player.licenseCategory && !isGenericSlot && (
                          <div className="mt-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold text-[10px] uppercase tracking-wider leading-tight"
                              title={`Promoción de cantera: compite con licencia oficial de categoría ${player.licenseCategory}`}
                            >
                              <Award className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                              <span>Promoción · Lic. {player.licenseCategory}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {!isGenericSlot && (callUps > 0 || hasOtherCallUps) && (
                        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/5 flex flex-col gap-1.5">
                          {callUps > 0 && (
                            <div
                              className="px-2 sm:px-2.5 py-1.5 bg-surface-container-highest/70 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2"
                              title={`Convocado/a en ${callUps} ${callUps === 1 ? 'partido oficial' : 'partidos oficiales'} con ${activeCategory.name}`}
                            >
                              <span className="text-[10px] uppercase tracking-wider text-tertiary font-semibold">
                                Actas Oficiales
                              </span>
                              <span className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                {callUps} {callUps === 1 ? 'Convocatoria' : 'Convocatorias'}
                              </span>
                            </div>
                          )}

                          {hasOtherCallUps && (
                            <div
                              className="px-2 sm:px-2.5 py-1.5 bg-violet-500/10 border border-violet-400/25 flex flex-col gap-1"
                              title={`Participación en doble dinámica: ${totalClubCallUps} partidos oficiales acumulados en el club`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <span className="text-[10px] uppercase tracking-wider text-violet-300 font-bold">
                                  Doble Dinámica
                                </span>
                                <span className="text-[10px] font-mono text-violet-200 font-bold">
                                  Total Club: {totalClubCallUps}{' '}
                                  {totalClubCallUps === 1 ? 'partido' : 'partidos'}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                {player.otherTeamCallUps!.map((split) => {
                                  const rawSplitLabel =
                                    split.teamName ||
                                    (split as { categoryName?: string }).categoryName ||
                                    split.teamId;
                                  const splitLabel = rawSplitLabel
                                    .replace(/\s*·\s*Grupo Único/gi, '')
                                    .replace(/\s*\(?Grupo Único\)?/gi, '')
                                    .replace(/\bGrupo\s+([A-Za-z0-9]+)/gi, 'G$1')
                                    .trim();
                                  return (
                                    <span
                                      key={split.teamId}
                                      title={`+${split.count} ${split.count === 1 ? 'convocatoria oficial' : 'convocatorias oficiales'} en ${splitLabel} · Total Club: ${totalClubCallUps} partidos`}
                                      className="text-[10px] sm:text-[11px] text-white/90 leading-snug bg-black/30 border border-white/10 px-1.5 py-0.5 block"
                                    >
                                      <strong className="text-violet-300">
                                        +{split.count} conv.
                                      </strong>{' '}
                                      en {splitLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                    staff.name.toLowerCase().includes(CLUB_INFO.president.toLowerCase())
                );
                return (
                  <div
                    key={staff.id}
                    className={`bg-surface-container-low border ${
                      isPresident
                        ? 'border-primary/40 bg-gradient-to-r from-surface-container-low to-primary/5'
                        : 'border-white/5'
                    } p-4 flex items-center gap-4 min-w-0`}
                  >
                    <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-white/10 bg-[#18181b]">
                      <Image
                        src={staff.photoUrl || '/images/staff-placeholder.svg'}
                        alt={staff.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider text-primary font-bold block">
                          {isPresident
                            ? 'Presidente y Primer Entrenador'
                            : STAFF_ROLE_LABELS[staff.role]}
                        </span>
                        {isPresident && (
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/30">
                            Dirección
                          </span>
                        )}
                      </div>
                      <h4 className="font-headline-sm text-sm uppercase text-white font-bold mt-0.5 break-words">
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

      <div className="mt-12">
        <SponsorBanner customText="¿QUIERES SER EL PATROCINADOR DE ESTA PLANTILLA?" />
      </div>
    </div>
  );
}

export default function PlantillasPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-surface flex items-center justify-center text-tertiary text-sm">
          Cargando plantillas oficiales...
        </div>
      }
    >
      <PlantillasContent />
    </Suspense>
  );
}
