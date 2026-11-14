'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INITIAL_CATEGORIES, INITIAL_STANDINGS } from '@/lib/data-store';
import { Standings } from '@/lib/types';
import { getTeamLogo } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';

const STANDINGS_STORAGE_KEY = 'cdv_synced_standings_v4';

interface SecondaryZoneRule {
  label: string;
  barClass: string;
  textClass: string;
  matches: (pos: number, totalTeams: number) => boolean;
}

interface CategoryStandingRule {
  topCut: number;
  topLabel: string;
  secondaryZone?: SecondaryZoneRule;
  summaryNote: string;
}

const DEFAULT_STANDING_RULE: CategoryStandingRule = {
  topCut: 2,
  topLabel: 'Puestos 1-2 · Fase Final / Playoff',
  summaryNote: 'Los primeros clasificados acceden a las eliminatorias por el título de la categoría.',
};

const CATEGORY_STANDINGS_RULES: Record<string, CategoryStandingRule> = {
  'cat-senior-fem': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Fase de Ascenso a 1ª División Nacional',
    secondaryZone: {
      label: 'Puestos 10-11 · Zona de Descenso a 2ª División Andaluza',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-400',
      matches: (pos, totalTeams) => pos >= Math.max(10, totalTeams - 1),
    },
    summaryNote:
      '1º Campeón de Andalucía (Fase de Ascenso a 1ª Nacional, 20-23 mayo) · 2º Opción 2ª plaza andaluza · Puestos 10º-11º Descenso a 2ª Andaluza',
  },
  'cat-senior-masc': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Fase Final Andaluza de Ascenso a 1ª Andaluza',
    summaryNote:
      'Puestos 1º y 2º clasifican a la Fase Final Andaluza de Ascenso a 1ª División Andaluza (14-16 mayo) · Sin descenso',
  },
  'cat-juvenil-masc': {
    topCut: 4,
    topLabel: 'Puestos 1-4 · Fase Final Provincial por el Título (1º al 8º) / Opción CADEBA',
    secondaryZone: {
      label: 'Puesto 5 · Fase de Clasificación Final (9º al 11º puesto)',
      barClass: 'bg-amber-500/80',
      textClass: 'text-amber-400',
      matches: (pos) => pos >= 5,
    },
    summaryNote:
      'Puestos 1º al 4º clasifican a la Fase Final por el Título (1º al 8º) · 5º juega Fase del 9º al 11º puesto · Top 2 de Málaga al CADEBA (1-4 abril)',
  },
  'cat-juvenil-fem-rojo': {
    topCut: 4,
    topLabel: 'Puestos 1-4 · Fase Final Provincial Oro por el Título (1º al 8º) / Opción CADEBA',
    secondaryZone: {
      label: 'Puestos 5-6 · Fase de Permanencia / Clasificación 9º al 12º puesto',
      barClass: 'bg-amber-500/80',
      textClass: 'text-amber-400',
      matches: (pos) => pos >= 5,
    },
    summaryNote:
      'Puestos 1º al 4º clasifican a la Fase Final Oro (1º al 8º) · Puestos 5º y 6º juegan del 9º al 12º puesto · Top 2 de Málaga al CADEBA (1-4 abril)',
  },
  'cat-juvenil-fem-negro': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Semifinales / Fase Final Liga Plata (1º al 4º puesto)',
    secondaryZone: {
      label: 'Puestos 3-7 · Cruces de Clasificación Final (5º al 14º puesto)',
      barClass: 'bg-sky-500/60',
      textClass: 'text-sky-300',
      matches: (pos) => pos >= 3 && pos <= 7,
    },
    summaryNote:
      'Puestos 1º y 2º clasifican a Semifinales por el Título de Liga Plata (1º al 4º) · Del 3º al 7º disputan cruces del 5º al 14º puesto',
  },
  'cat-cadete-masc': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Semifinales / Fase Final Provincial (1º al 4º) y CADEBA',
    secondaryZone: {
      label: 'Puestos 3-6 · Cruces de Clasificación Final (5º al 13º puesto)',
      barClass: 'bg-sky-500/60',
      textClass: 'text-sky-300',
      matches: (pos) => pos >= 3 && pos <= 6,
    },
    summaryNote:
      'Puestos 1º y 2º clasifican a Semifinales Provinciales (1º al 4º) y luchan por las 2 plazas al CADEBA (22-25 abril) · Del 3º al 6º juegan cruces finales',
  },
  'cat-cadete-fem-rojo': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Semifinales / Fase Final Oro (1º al 4º) y CADEBA',
    secondaryZone: {
      label: 'Puestos 3-7 · Cruces de Clasificación Final (5º al 14º puesto)',
      barClass: 'bg-sky-500/60',
      textClass: 'text-sky-300',
      matches: (pos) => pos >= 3 && pos <= 7,
    },
    summaryNote:
      'Puestos 1º y 2º clasifican a Semifinales Liga Oro (1º al 4º) y CADEBA (22-25 abril) · Del 3º al 7º juegan cruces del 5º al 14º puesto',
  },
  'cat-cadete-fem-negro': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Fase Final Liga Plata (Top 6 → Semifinales y Final)',
    summaryNote:
      'Puestos 1º y 2º de cada uno de los 3 grupos clasifican a la Fase Final por el Título de Liga Plata (Top 6)',
  },
  'cat-infantil-masc': {
    topCut: 4,
    topLabel: 'Puestos 1-4 · Semifinales / Fase Final Provincial (1º al 4º) y Opción CADEBA',
    summaryNote:
      'Puestos 1º al 4º clasifican a Semifinales Provinciales (1º vs 4º y 2º vs 3º) · Top 2 de Málaga al CADEBA (29 abril - 2 mayo)',
  },
  'cat-infantil-fem-rojo': {
    topCut: 4,
    topLabel: 'Puestos 1-4 · Fase Final Provincial Oro por el Título (1º al 8º) / Opción CADEBA',
    secondaryZone: {
      label: 'Puestos 5-6 · Fase de Clasificación / Permanencia (9º al 11º puesto)',
      barClass: 'bg-amber-500/80',
      textClass: 'text-amber-400',
      matches: (pos) => pos >= 5,
    },
    summaryNote:
      'Puestos 1º al 4º clasifican a la Fase Final Oro (1º al 8º) · Últimos puestos juegan del 9º al 11º · Top 2 de Málaga al CADEBA (29 abril - 2 mayo)',
  },
  'cat-infantil-fem-negro': {
    topCut: 4,
    topLabel: 'Puestos 1-4 · Fase Final Provincial Oro por el Título (1º al 8º) / Opción CADEBA',
    secondaryZone: {
      label: 'Puesto 5 · Fase de Clasificación / Permanencia (9º al 11º puesto)',
      barClass: 'bg-amber-500/80',
      textClass: 'text-amber-400',
      matches: (pos) => pos >= 5,
    },
    summaryNote:
      'Puestos 1º al 4º clasifican a la Fase Final Oro (1º al 8º) · Últimos puestos juegan del 9º al 11º · Top 2 de Málaga al CADEBA (29 abril - 2 mayo)',
  },
  'cat-infantil-fem-blanco': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Semifinales / Fase Final Liga Plata (1º al 4º puesto)',
    secondaryZone: {
      label: 'Puestos 3-9 · Cruces de Clasificación Final (5º al 18º puesto)',
      barClass: 'bg-sky-500/60',
      textClass: 'text-sky-300',
      matches: (pos) => pos >= 3 && pos <= 9,
    },
    summaryNote:
      'Puestos 1º y 2º clasifican a Semifinales por el Título de Liga Plata (1º al 4º) · Del 3º al 9º disputan cruces finales del 5º al 18º puesto',
  },
  'cat-infantil-fem-gris': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Semifinales / Fase Final Liga Plata (1º al 4º puesto)',
    secondaryZone: {
      label: 'Puestos 3-9 · Cruces de Clasificación Final (5º al 18º puesto)',
      barClass: 'bg-sky-500/60',
      textClass: 'text-sky-300',
      matches: (pos) => pos >= 3 && pos <= 9,
    },
    summaryNote:
      'Puestos 1º y 2º clasifican a Semifinales por el Título de Liga Plata (1º al 4º) · Del 3º al 9º disputan cruces finales del 5º al 18º puesto',
  },
  'cat-senior-fem-afade': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Playoff / Fase Final por el Título Municipal AFADE',
    summaryNote:
      'Puestos 1º y 2º del GB clasifican a las eliminatorias finales por el título de la Liga Municipal AFADE',
  },
  'cat-juvenil-fem-afade': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Playoff / Fase Final por el Título Municipal AFADE',
    summaryNote:
      'Puestos 1º y 2º del GB clasifican a las eliminatorias finales por el título de la Liga Municipal AFADE',
  },
  'cat-infantil-fem-afade': {
    topCut: 2,
    topLabel: 'Puestos 1-2 · Playoff / Fase Final por el Título Municipal AFADE',
    summaryNote:
      'Puestos 1º y 2º del GB clasifican a las eliminatorias finales por el título de la Liga Municipal AFADE',
  },
};

const TABLE_ACRONYMS_LEGEND = [
  {
    code: 'PTS',
    name: 'Puntos Totales',
    description: 'Puntos oficiales acumulados (3 pts por 3-0/3-1, 2 pts por 3-2, 1 pt por 2-3, 0 pts por 0-3/1-3).',
    badgeClass: 'bg-primary-container text-white',
  },
  {
    code: 'PJ',
    name: 'Partidos Jugados',
    description: 'Total de encuentros oficiales disputados hasta la jornada actual.',
    badgeClass: 'bg-surface-container-highest text-white',
  },
  {
    code: 'PG',
    name: 'Partidos Ganados',
    description: 'Total de victorias sumando las de 3 puntos (PG3) y las de tie-break (PG2).',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
  {
    code: 'PP',
    name: 'Partidos Perdidos',
    description: 'Total de derrotas sumando las de tie-break (PP1) y las de 0 puntos (PP0).',
    badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  },
  {
    code: 'PG3',
    name: 'Ganados de 3 Puntos',
    description: 'Partidos ganados por 3-0 o 3-1 en sets (otorgan 3 puntos en la clasificación).',
    badgeClass: 'bg-emerald-500/15 text-emerald-300',
  },
  {
    code: 'PG2',
    name: 'Ganados de 2 Puntos',
    description: 'Partidos ganados por 3-2 en el quinto set / tie-break (otorgan 2 puntos).',
    badgeClass: 'bg-teal-500/15 text-teal-300',
  },
  {
    code: 'PP1',
    name: 'Perdidos de 1 Punto',
    description: 'Partidos perdidos por 2-3 en el quinto set / tie-break (otorgan 1 punto).',
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  {
    code: 'PP0',
    name: 'Perdidos de 0 Puntos',
    description: 'Partidos perdidos por 0-3 o 1-3 en sets (otorgan 0 puntos).',
    badgeClass: 'bg-rose-500/15 text-rose-300',
  },
  {
    code: 'SF',
    name: 'Sets a Favor',
    description: 'Total de sets ganados por el equipo a lo largo de la competición.',
    badgeClass: 'bg-surface-container-highest text-tertiary',
  },
  {
    code: 'SC',
    name: 'Sets en Contra',
    description: 'Total de sets encajados o perdidos por el equipo.',
    badgeClass: 'bg-surface-container-highest text-tertiary',
  },
  {
    code: 'CS',
    name: 'Coeficiente de Sets',
    description: 'Cociente entre Sets a Favor y Sets en Contra (SF / SC). Primer desempate oficial.',
    badgeClass: 'bg-sky-500/15 text-sky-300',
  },
  {
    code: 'PF',
    name: 'Puntos (Tantos) a Favor',
    description: 'Total de tantos o puntos de juego anotados en todos los sets.',
    badgeClass: 'bg-surface-container-highest text-tertiary',
  },
  {
    code: 'PC',
    name: 'Puntos (Tantos) en Contra',
    description: 'Total de tantos o puntos de juego recibidos en todos los sets.',
    badgeClass: 'bg-surface-container-highest text-tertiary',
  },
  {
    code: 'CP',
    name: 'Coeficiente de Puntos',
    description: 'Cociente entre Puntos a Favor y Puntos en Contra (PF / PC). Segundo desempate.',
    badgeClass: 'bg-sky-500/15 text-sky-300',
  },
];

function formatCoef(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0,000';
  return value.toFixed(3).replace('.', ',');
}

export default function ClasificacionPage() {
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-senior-fem');
  const [allStandings, setAllStandings] = useState<Standings[]>(INITIAL_STANDINGS);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showLegendDropdown, setShowLegendDropdown] = useState<boolean>(false);
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
          const currentIsAfade = selectedCatId.includes('afade');
          setSyncFeedback(
            `Clasificación oficial sincronizada en directo con ${currentIsAfade ? 'ligaafade.es' : 'favoley.net'}`
          );
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
          const cachedCats = new Set((parsed.standings as Standings[]).map((s) => s.categoryId));
          const missingInitial = INITIAL_STANDINGS.filter((s) => !cachedCats.has(s.categoryId));
          setAllStandings([...parsed.standings, ...missingInitial]);
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
  const isAfade = activeCategory.association === 'AFADE' || activeCategory.name.includes('AFADE');
  const categoryRule = CATEGORY_STANDINGS_RULES[selectedCatId] || DEFAULT_STANDING_RULE;

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-5 sm:py-8 border-b border-white/5 overflow-hidden">
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

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
                  className={`w-auto snap-start flex items-center justify-center text-center px-3.5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
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
            title={`Sincronizar clasificación ahora con ${isAfade ? 'ligaafade.es' : 'favoley.net'} (Última: ${lastSyncTime})`}
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

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 sm:py-10 space-y-6 relative z-10">
        {/* Cabecera del grupo activo */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                {activeCategory.description}
              </span>
              <span className="text-tertiary text-xs">·</span>
              <span className="text-[11px] font-mono text-tertiary">
                Sincronizado con {isAfade ? 'ligaafade.es' : 'favoley.net'} ({lastSyncTime})
              </span>
            </div>
            <h2 className="font-display-xl text-3xl uppercase text-white mt-0.5">
              {activeCategory.name}
            </h2>
            <p className="text-xs text-tertiary mt-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[15px] shrink-0" aria-hidden="true">
                gavel
              </span>
              <span>{categoryRule.summaryNote}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tertiary">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary-container inline-block shrink-0" />
              <span className="text-white/90 font-medium">{categoryRule.topLabel}</span>
            </span>
            {categoryRule.secondaryZone && (
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 ${categoryRule.secondaryZone.barClass} inline-block shrink-0`} />
                <span>{categoryRule.secondaryZone.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* Tabla Oficial con las 16 columnas de favoley.net */}
        <div className="bg-surface-container-low border border-white/5 shadow-2xl overflow-x-auto scroll-smooth">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <caption className="sr-only">
              Clasificación oficial de la categoría {activeCategory.name}
            </caption>
            <thead>
              <tr className="bg-surface-container-lowest border-b border-white/10 text-[10px] sm:text-xs text-tertiary uppercase tracking-wider">
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-2 sm:px-3 w-11 sm:w-14 text-center font-bold"
                  title="Posición en la clasificación"
                  aria-label="Posición en la clasificación"
                >
                  <abbr
                    title="Posición en la clasificación"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    POS.
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold min-w-[180px]"
                  title="Club o equipo participante"
                  aria-label="Club o equipo participante"
                >
                  <abbr
                    title="Club o equipo participante"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    EQUIPO
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-2 sm:px-3.5 text-center font-bold text-white bg-primary-container/20"
                  title="Puntos totales (Victoria 3-0/3-1: 3 pts · Victoria 3-2: 2 pts · Derrota 2-3: 1 pt · Derrota 0-3/1-3: 0 pts)"
                  aria-label="Puntos totales (Victoria 3-0/3-1: 3 pts · Victoria 3-2: 2 pts · Derrota 2-3: 1 pt · Derrota 0-3/1-3: 0 pts)"
                >
                  <abbr
                    title="Puntos totales (Victoria 3-0/3-1: 3 pts · Victoria 3-2: 2 pts · Derrota 2-3: 1 pt · Derrota 0-3/1-3: 0 pts)"
                    className="no-underline cursor-help border-b border-dotted border-white/40 pb-0.5"
                  >
                    PTS
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Jugados"
                  aria-label="Partidos Jugados"
                >
                  <abbr
                    title="Partidos Jugados"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PJ
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Ganados totales (PG3 + PG2)"
                  aria-label="Partidos Ganados totales (PG3 + PG2)"
                >
                  <abbr
                    title="Partidos Ganados totales (PG3 + PG2)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PG
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Perdidos totales (PP1 + PP0)"
                  aria-label="Partidos Perdidos totales (PP1 + PP0)"
                >
                  <abbr
                    title="Partidos Perdidos totales (PP1 + PP0)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PP
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Ganados por 3-0 o 3-1 (suman 3 puntos)"
                  aria-label="Partidos Ganados por 3-0 o 3-1 (suman 3 puntos)"
                >
                  <abbr
                    title="Partidos Ganados por 3-0 o 3-1 (suman 3 puntos)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PG3
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Ganados por 3-2 en el tie-break (suman 2 puntos)"
                  aria-label="Partidos Ganados por 3-2 en el tie-break (suman 2 puntos)"
                >
                  <abbr
                    title="Partidos Ganados por 3-2 en el tie-break (suman 2 puntos)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PG2
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Perdidos por 2-3 en el tie-break (suman 1 punto)"
                  aria-label="Partidos Perdidos por 2-3 en el tie-break (suman 1 punto)"
                >
                  <abbr
                    title="Partidos Perdidos por 2-3 en el tie-break (suman 1 punto)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PP1
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Partidos Perdidos por 0-3 o 1-3 (suman 0 puntos)"
                  aria-label="Partidos Perdidos por 0-3 o 1-3 (suman 0 puntos)"
                >
                  <abbr
                    title="Partidos Perdidos por 0-3 o 1-3 (suman 0 puntos)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PP0
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Sets a Favor"
                  aria-label="Sets a Favor"
                >
                  <abbr
                    title="Sets a Favor"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    SF
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Sets en Contra"
                  aria-label="Sets en Contra"
                >
                  <abbr
                    title="Sets en Contra"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    SC
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Coeficiente de Sets (Sets a Favor / Sets en Contra)"
                  aria-label="Coeficiente de Sets (Sets a Favor / Sets en Contra)"
                >
                  <abbr
                    title="Coeficiente de Sets (Sets a Favor / Sets en Contra)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    CS
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Puntos (tantos) a Favor"
                  aria-label="Puntos (tantos) a Favor"
                >
                  <abbr
                    title="Puntos (tantos) a Favor"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PF
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Puntos (tantos) en Contra"
                  aria-label="Puntos (tantos) en Contra"
                >
                  <abbr
                    title="Puntos (tantos) en Contra"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    PC
                  </abbr>
                </th>
                <th
                  scope="col"
                  className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center font-semibold"
                  title="Coeficiente de Puntos / Tantos (Puntos a Favor / Puntos en Contra)"
                  aria-label="Coeficiente de Puntos / Tantos (Puntos a Favor / Puntos en Contra)"
                >
                  <abbr
                    title="Coeficiente de Puntos / Tantos (Puntos a Favor / Puntos en Contra)"
                    className="no-underline cursor-help border-b border-dotted border-white/30 pb-0.5"
                  >
                    CP
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {standings.map((team, idx) => {
                const pos = idx + 1;
                const isTopZone = pos <= categoryRule.topCut;
                const isSecondaryZone =
                  !isTopZone &&
                  Boolean(categoryRule.secondaryZone?.matches(pos, standings.length));

                const pg3 = team.pg3 ?? 0;
                const pg2 = team.pg2 ?? 0;
                const pp1 = team.pp1 ?? 0;
                const pp0 = team.pp0 ?? 0;
                const pf = team.pointsFor ?? 0;
                const pc = team.pointsAgainst ?? 0;
                const cs =
                  typeof team.setCoef === 'number'
                    ? team.setCoef
                    : team.setsAgainst > 0
                    ? team.setsFor / team.setsAgainst
                    : team.setsFor;
                const cp =
                  typeof team.pointCoef === 'number'
                    ? team.pointCoef
                    : pc > 0
                    ? pf / pc
                    : pf;

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
                    {/* 1. POS. */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3 text-center relative">
                      {isTopZone && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
                      )}
                      {isSecondaryZone && categoryRule.secondaryZone && (
                        <span
                          className={`absolute left-0 top-0 bottom-0 w-1 ${categoryRule.secondaryZone.barClass}`}
                        />
                      )}
                      <span
                        className={`font-display-xl text-base sm:text-lg ${
                          isTopZone
                            ? 'text-primary'
                            : isSecondaryZone && categoryRule.secondaryZone
                            ? categoryRule.secondaryZone.textClass
                            : 'text-tertiary'
                        }`}
                      >
                        {pos}
                      </span>
                    </td>

                    {/* 2. EQUIPO */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 font-headline-sm uppercase text-white font-bold">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Image
                          src={getTeamLogo(team.teamName)}
                          alt={team.teamName}
                          width={32}
                          height={32}
                          className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0"
                        />
                        {team.isCurrentClub ? (
                          <Link
                            href={`/plantillas?categoria=${selectedCatId}`}
                            className="text-primary hover:underline decoration-primary underline-offset-4 transition-colors text-xs sm:text-sm leading-tight whitespace-nowrap sm:whitespace-normal"
                            title={`Ver plantilla de ${activeCategory.name}`}
                          >
                            {team.teamName}
                          </Link>
                        ) : (
                          <span className="text-white text-xs sm:text-sm leading-tight whitespace-nowrap sm:whitespace-normal">
                            {team.teamName}
                          </span>
                        )}
                        {team.isCurrentClub && (
                          <span className="hidden xl:inline-block px-2 py-0.5 bg-primary-container text-white text-[9px] uppercase font-bold tracking-wider shrink-0">
                            Nuestro Club
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. PTS */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-3.5 text-center font-display-xl text-lg sm:text-2xl text-white bg-primary-container/20">
                      {team.points}
                    </td>

                    {/* 4. PJ */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-white font-semibold">
                      {team.played}
                    </td>

                    {/* 5. PG */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-emerald-400 font-bold">
                      {team.won}
                    </td>

                    {/* 6. PP */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-rose-400 font-semibold">
                      {team.lost}
                    </td>

                    {/* 7. PG3 */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-emerald-300/90">
                      {pg3}
                    </td>

                    {/* 8. PG2 */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-teal-300/90">
                      {pg2}
                    </td>

                    {/* 9. PP1 */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-amber-300/90">
                      {pp1}
                    </td>

                    {/* 10. PP0 */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-rose-300/80">
                      {pp0}
                    </td>

                    {/* 11. SF */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-white/90">
                      {team.setsFor}
                    </td>

                    {/* 12. SC */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-tertiary">
                      {team.setsAgainst}
                    </td>

                    {/* 13. CS */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-sky-300 font-medium">
                      {formatCoef(cs)}
                    </td>

                    {/* 14. PF */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-white/90">
                      {pf}
                    </td>

                    {/* 15. PC */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-tertiary">
                      {pc}
                    </td>

                    {/* 16. CP */}
                    <td className="py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 text-center font-mono text-sky-300 font-medium">
                      {formatCoef(cp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda Desplegable de Siglas de la Tabla (Especialmente útil en Mobile) */}
        <section className="bg-surface-container-low border border-white/10 p-5">
          <button
            type="button"
            onClick={() => setShowLegendDropdown(!showLegendDropdown)}
            aria-expanded={showLegendDropdown}
            aria-controls="table-legend-content"
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">
                help
              </span>
              <div>
                <h3 className="font-headline-sm text-sm uppercase text-white font-bold group-hover:text-primary transition-colors">
                  Leyenda de Siglas y Estadísticas de la Tabla
                </h3>
                <span className="text-xs text-tertiary">
                  Toca para ver qué significa cada abreviatura de la cabecera (PTS, PG3, PG2, PP1, PP0, CS, PF, PC, CP...)
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-tertiary transition-transform duration-200 text-[24px] ${
                showLegendDropdown ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            >
              expand_more
            </span>
          </button>

          {showLegendDropdown && (
            <div
              id="table-legend-content"
              className="mt-5 pt-5 border-t border-white/10 animate-in fade-in duration-200"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {TABLE_ACRONYMS_LEGEND.map((item) => (
                  <div
                    key={item.code}
                    className="p-3 bg-surface-container-lowest border border-white/5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 font-mono font-bold text-[11px] uppercase tracking-wider shrink-0 ${item.badgeClass}`}
                      >
                        {item.code}
                      </span>
                      <span className="font-bold text-white leading-tight">{item.name}</span>
                    </div>
                    <p className="text-[11px] text-tertiary leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

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
                  Criterio Oficial de Puntuación {isAfade ? 'Liga AFADE / RFEVB' : 'FAVB / RFEVB'}
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
                  <p className="text-tertiary text-[11px] mt-1">0 puntos para el perdedor (PG3 / PP0).</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-teal-500">
                  <span className="font-bold text-white uppercase block">Victoria 3-2 (Tie-break)</span>
                  <p className="font-display-xl text-2xl text-teal-400 mt-1">2 PUNTOS</p>
                  <p className="text-tertiary text-[11px] mt-1">1 punto bonus para el perdedor (PG2).</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-amber-500">
                  <span className="font-bold text-white uppercase block">Derrota 2-3 (Tie-break)</span>
                  <p className="font-display-xl text-2xl text-amber-400 mt-1">1 PUNTO</p>
                  <p className="text-tertiary text-[11px] mt-1">2 puntos para el ganador (PP1).</p>
                </div>

                <div className="p-4 bg-surface-container-lowest border-l-4 border-rose-500">
                  <span className="font-bold text-white uppercase block">Derrota 0-3 o 1-3</span>
                  <p className="font-display-xl text-2xl text-rose-400 mt-1">0 PUNTOS</p>
                  <p className="text-tertiary text-[11px] mt-1">3 puntos para el ganador (PP0).</p>
                </div>
              </div>

              <p className="text-xs text-tertiary">
                En caso de empate a puntos (PTS) entre dos o más clubes, el orden de clasificación se decide por mayor número de partidos ganados (PG), mayor coeficiente de sets (CS = SF / SC) y mayor coeficiente de tantos (CP = PF / PC).
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
