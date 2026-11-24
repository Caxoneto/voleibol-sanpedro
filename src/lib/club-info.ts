import type { ClubInfo, Category, Team } from './types';

/**
 * Datos institucionales ligeros y metadatos de categorías/equipos del club.
 * Módulo seguro para cliente y servidor: NO importa favb-data.ts ni datasets de deportistas.
 */
export interface ExtendedClubInfo extends ClubInfo {
  raedNumber: string;
}

export const CLUB_INFO: ExtendedClubInfo = {
  name: 'C.D. Voleibol San Pedro',
  shortName: 'CDV San Pedro',
  federationRegisteredName: 'SAN PEDRO C.D VOLEIBOL',
  cif: 'G93147924',
  raedNumber: process.env.NEXT_PUBLIC_CLUB_RAED_NUMBER?.trim() || '',
  president: 'Alberto Alcántara González',
  officialAddress: 'C/ Diego Piña Macias Nº 21, 29670 San Pedro Alcántara (Málaga)',
  postalCode: '29670',
  city: 'San Pedro Alcántara',
  province: 'Málaga',
  region: 'Málaga, Andalucía',
  venueName: 'Pabellón Polideportivo Sergio Scariolo',
  venueAddress: 'Diseminado Ensanche Sur I, 16S, 29670 Marbella, Málaga',
  venueMapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n+Polideportivo+Sergio+Scariolo,+Diseminado+Ensanche+Sur+I,+16S,+29670+Marbella,+M%C3%A1laga',
  federationName: 'Federación Andaluza de Voleibol (FAVB)',
  federationUrl: 'https://favoley.net/publico/index.php',
  contactEmail: 'info@voleibolsanpedro.es',
  contactPhone: '+34 657 71 37 71',
  whatsappUrl:
    'https://wa.me/34657713771?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20el%20C.D.%20Voleibol%20San%20Pedro',
  instagramUrl: 'https://www.instagram.com/voleibolsanpedro/',
  facebookUrl: 'https://www.facebook.com/CDVoleibolSanPedro/',
  socialHashtag: '#VoleibolSanPedro',
  motto: 'Pasión, cantera y orgullo sampedreño',
};

export const CLUB_CATEGORIES_META: Category[] = [
  {
    id: 'cat-senior-fem',
    name: 'Senior Femenino (1ª Andaluza)',
    slug: 'senior-femenino',
    order: 1,
    description: '1ª División Andaluza Femenina (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-senior-masc',
    name: 'Senior Masculino (2ª Andaluza · G4B)',
    slug: 'senior-masculino',
    order: 2,
    description: '2ª División Andaluza Masculina · G4B (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-juvenil-masc',
    name: 'Juvenil Masculino (G2)',
    slug: 'juvenil-masculino',
    order: 3,
    description: 'Liga Provincial Málaga · G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-juvenil-fem-rojo',
    name: 'Juvenil Femenino Rojo (Oro · G1)',
    slug: 'juvenil-femenino-rojo',
    order: 4,
    description: 'Liga Provincial Málaga · Liga Oro - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-juvenil-fem-negro',
    name: 'Juvenil Femenino Negro (Plata · G1)',
    slug: 'juvenil-femenino-negro',
    order: 5,
    description: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-cadete-masc',
    name: 'Cadete Masculino (G2)',
    slug: 'cadete-masculino',
    order: 6,
    description: 'Liga Provincial Málaga · G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-cadete-fem-rojo',
    name: 'Cadete Femenino Rojo (Oro · G2)',
    slug: 'cadete-femenino-rojo',
    order: 7,
    description: 'Liga Provincial Málaga · Liga Oro - G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-cadete-fem-negro',
    name: 'Cadete Femenino Negro (Plata · G3)',
    slug: 'cadete-femenino-negro',
    order: 8,
    description: 'Liga Provincial Málaga · Liga Plata - G3 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-infantil-masc',
    name: 'Infantil Masculino (G1)',
    slug: 'infantil-masculino',
    order: 9,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-infantil-fem-rojo',
    name: 'Infantil Femenino Rojo (Oro · G1)',
    slug: 'infantil-femenino-rojo',
    order: 10,
    description: 'Liga Provincial Málaga · Liga Oro - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-infantil-fem-negro',
    name: 'Infantil Femenino Negro (Oro · G2)',
    slug: 'infantil-femenino-negro',
    order: 11,
    description: 'Liga Provincial Málaga · Liga Oro - G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-infantil-fem-blanco',
    name: 'Infantil Femenino Blanco (Plata · G2)',
    slug: 'infantil-femenino-blanco',
    order: 12,
    description: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-infantil-fem-gris',
    name: 'Infantil Femenino Gris (Plata · G1)',
    slug: 'infantil-femenino-gris',
    order: 13,
    description: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-masc-rojo',
    name: 'Alevín Masculino Rojo (G1)',
    slug: 'alevin-masculino-rojo',
    order: 14,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-masc-negro',
    name: 'Alevín Masculino Negro (G1)',
    slug: 'alevin-masculino-negro',
    order: 15,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-rojo',
    name: 'Alevín Femenino Rojo (Oro)',
    slug: 'alevin-femenino-rojo',
    order: 16,
    description: 'Liga Provincial Málaga · Liga Oro (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-negro',
    name: 'Alevín Femenino Negro (Oro)',
    slug: 'alevin-femenino-negro',
    order: 17,
    description: 'Liga Provincial Málaga · Liga Oro (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-azul',
    name: 'Alevín Femenino Azul (Plata · G1)',
    slug: 'alevin-femenino-azul',
    order: 18,
    description: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-rosa',
    name: 'Alevín Femenino Rosa (Plata · G1)',
    slug: 'alevin-femenino-rosa',
    order: 19,
    description: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-verde',
    name: 'Alevín Femenino Verde (Plata · G1)',
    slug: 'alevin-femenino-verde',
    order: 20,
    description: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-blanco',
    name: 'Alevín Femenino Blanco (Plata · G2)',
    slug: 'alevin-femenino-blanco',
    order: 21,
    description: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-alevin-fem-gris',
    name: 'Alevín Femenino Gris (Plata · G2)',
    slug: 'alevin-femenino-gris',
    order: 22,
    description: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-benjamin-masc',
    name: 'Benjamín Masculino (G1)',
    slug: 'benjamin-masculino',
    order: 23,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-benjamin-fem-rojo',
    name: 'Benjamín Femenino Rojo (G1)',
    slug: 'benjamin-femenino-rojo',
    order: 24,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-benjamin-fem-negro',
    name: 'Benjamín Femenino Negro (G1)',
    slug: 'benjamin-femenino-negro',
    order: 25,
    description: 'Liga Provincial Málaga · G1 (FAVB)',
    association: 'FAVB',
  },
  {
    id: 'cat-senior-fem-afade',
    name: 'Senior Femenino AFADE (GB)',
    slug: 'senior-femenino-afade',
    order: 26,
    description: 'Liga AFADE Málaga · Senior Femenino - GB',
    association: 'AFADE',
  },
  {
    id: 'cat-juvenil-fem-afade',
    name: 'Juvenil Femenino AFADE (GB)',
    slug: 'juvenil-femenino-afade',
    order: 27,
    description: 'Liga AFADE Málaga · Juvenil Femenino - GB',
    association: 'AFADE',
  },
  {
    id: 'cat-infantil-fem-afade',
    name: 'Infantil Femenino AFADE (GB)',
    slug: 'infantil-femenino-afade',
    order: 28,
    description: 'Liga AFADE Málaga · Infantil Femenino - GB',
    association: 'AFADE',
  },
];

export const CLUB_TEAMS_META: Team[] = [
  {
    id: 'team-sf',
    categoryId: 'cat-senior-fem',
    name: 'Senior Femenino',
    division: '1ª División Andaluza Femenina (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-sm',
    categoryId: 'cat-senior-masc',
    name: 'Senior Masculino',
    division: '2ª División Andaluza Masculina · G4B (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-jm',
    categoryId: 'cat-juvenil-masc',
    name: 'Juvenil Masculino',
    division: 'Liga Provincial Málaga · G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-jf-rojo',
    categoryId: 'cat-juvenil-fem-rojo',
    name: 'Juvenil Femenino Rojo',
    division: 'Liga Provincial Málaga · Liga Oro - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-jf-negro',
    categoryId: 'cat-juvenil-fem-negro',
    name: 'Juvenil Femenino Negro',
    division: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-cm',
    categoryId: 'cat-cadete-masc',
    name: 'Cadete Masculino',
    division: 'Liga Provincial Málaga · G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-cf-rojo',
    categoryId: 'cat-cadete-fem-rojo',
    name: 'Cadete Femenino Rojo',
    division: 'Liga Provincial Málaga · Liga Oro - G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-cf-negro',
    categoryId: 'cat-cadete-fem-negro',
    name: 'Cadete Femenino Negro',
    division: 'Liga Provincial Málaga · Liga Plata - G3 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-im',
    categoryId: 'cat-infantil-masc',
    name: 'Infantil Masculino',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-if-rojo',
    categoryId: 'cat-infantil-fem-rojo',
    name: 'Infantil Femenino Rojo',
    division: 'Liga Provincial Málaga · Liga Oro - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-if-negro',
    categoryId: 'cat-infantil-fem-negro',
    name: 'Infantil Femenino Negro',
    division: 'Liga Provincial Málaga · Liga Oro - G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-if-blanco',
    categoryId: 'cat-infantil-fem-blanco',
    name: 'Infantil Femenino Blanco',
    division: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-if-gris',
    categoryId: 'cat-infantil-fem-gris',
    name: 'Infantil Femenino Gris',
    division: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-am-rojo',
    categoryId: 'cat-alevin-masc-rojo',
    name: 'Alevín Masculino Rojo',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-am-negro',
    categoryId: 'cat-alevin-masc-negro',
    name: 'Alevín Masculino Negro',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-rojo',
    categoryId: 'cat-alevin-fem-rojo',
    name: 'Alevín Femenino Rojo',
    division: 'Liga Provincial Málaga · Liga Oro (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-negro',
    categoryId: 'cat-alevin-fem-negro',
    name: 'Alevín Femenino Negro',
    division: 'Liga Provincial Málaga · Liga Oro (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-azul',
    categoryId: 'cat-alevin-fem-azul',
    name: 'Alevín Femenino Azul',
    division: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-rosa',
    categoryId: 'cat-alevin-fem-rosa',
    name: 'Alevín Femenino Rosa',
    division: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-verde',
    categoryId: 'cat-alevin-fem-verde',
    name: 'Alevín Femenino Verde',
    division: 'Liga Provincial Málaga · Liga Plata - G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-blanco',
    categoryId: 'cat-alevin-fem-blanco',
    name: 'Alevín Femenino Blanco',
    division: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-af-gris',
    categoryId: 'cat-alevin-fem-gris',
    name: 'Alevín Femenino Gris',
    division: 'Liga Provincial Málaga · Liga Plata - G2 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-bm',
    categoryId: 'cat-benjamin-masc',
    name: 'Benjamín Masculino',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-bf-rojo',
    categoryId: 'cat-benjamin-fem-rojo',
    name: 'Benjamín Femenino Rojo',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-bf-negro',
    categoryId: 'cat-benjamin-fem-negro',
    name: 'Benjamín Femenino Negro',
    division: 'Liga Provincial Málaga · G1 (FAVB)',
    season: '2026/2027',
  },
  {
    id: 'team-senior-fem-afade',
    categoryId: 'cat-senior-fem-afade',
    name: 'Senior Femenino AFADE (GB)',
    division: 'Liga AFADE Málaga · Senior Femenino - GB',
    season: '2026/2027',
  },
  {
    id: 'team-juvenil-fem-afade',
    categoryId: 'cat-juvenil-fem-afade',
    name: 'Juvenil Femenino AFADE (GB)',
    division: 'Liga AFADE Málaga · Juvenil Femenino - GB',
    season: '2026/2027',
  },
  {
    id: 'team-infantil-fem-afade',
    categoryId: 'cat-infantil-fem-afade',
    name: 'Infantil Femenino AFADE (GB)',
    division: 'Liga AFADE Málaga · Infantil Femenino - GB',
    season: '2026/2027',
  },
];

export interface ClubTeamPhaseMeta {
  teamId: string;
  categoryId: string;
  federationName: string;
  phaseKey: string;
}

/**
 * Mapa ligero de fase y denominación federativa exacta por equipo.
 * Permite resolver derbis internos entre equipos del club en una misma fase y enlazar tablas compartidas.
 */
export const CLUB_TEAM_PHASE_META: ClubTeamPhaseMeta[] = [
  { teamId: 'team-sf', categoryId: 'cat-senior-fem', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1-13-14' },
  { teamId: 'team-sm', categoryId: 'cat-senior-masc', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1365-127-179' },
  { teamId: 'team-jm', categoryId: 'cat-juvenil-masc', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1321-35-36' },
  { teamId: 'team-jf-rojo', categoryId: 'cat-juvenil-fem-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1330-43-44' },
  { teamId: 'team-jf-negro', categoryId: 'cat-juvenil-fem-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1330-99-128' },
  { teamId: 'team-cm', categoryId: 'cat-cadete-masc', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1313-72-94' },
  { teamId: 'team-cf-rojo', categoryId: 'cat-cadete-fem-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1304-76-100' },
  { teamId: 'team-cf-negro', categoryId: 'cat-cadete-fem-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1304-100-132' },
  { teamId: 'team-im', categoryId: 'cat-infantil-masc', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1288-71-92' },
  { teamId: 'team-if-rojo', categoryId: 'cat-infantil-fem-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1299-75-97' },
  { teamId: 'team-if-negro', categoryId: 'cat-infantil-fem-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1299-75-98' },
  { teamId: 'team-if-blanco', categoryId: 'cat-infantil-fem-blanco', federationName: 'VOLEIBOL SAN PEDRO BLANCO', phaseKey: 'favb-1299-101-134' },
  { teamId: 'team-if-gris', categoryId: 'cat-infantil-fem-gris', federationName: 'VOLEIBOL SAN PEDRO GRIS', phaseKey: 'favb-1299-101-133' },
  { teamId: 'team-am-rojo', categoryId: 'cat-alevin-masc-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1249-167-244' },
  { teamId: 'team-am-negro', categoryId: 'cat-alevin-masc-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1249-167-244' },
  { teamId: 'team-af-rojo', categoryId: 'cat-alevin-fem-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1259-168-245' },
  { teamId: 'team-af-negro', categoryId: 'cat-alevin-fem-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1259-168-245' },
  { teamId: 'team-af-azul', categoryId: 'cat-alevin-fem-azul', federationName: 'VOLEIBOL SAN PEDRO AZUL', phaseKey: 'favb-1259-169-246' },
  { teamId: 'team-af-rosa', categoryId: 'cat-alevin-fem-rosa', federationName: 'VOLEIBOL SAN PEDRO ROSA', phaseKey: 'favb-1259-169-246' },
  { teamId: 'team-af-verde', categoryId: 'cat-alevin-fem-verde', federationName: 'VOLEIBOL SAN PEDRO VERDE', phaseKey: 'favb-1259-169-246' },
  { teamId: 'team-af-blanco', categoryId: 'cat-alevin-fem-blanco', federationName: 'VOLEIBOL SAN PEDRO BLANCO', phaseKey: 'favb-1259-169-247' },
  { teamId: 'team-af-gris', categoryId: 'cat-alevin-fem-gris', federationName: 'VOLEIBOL SAN PEDRO GRIS', phaseKey: 'favb-1259-169-247' },
  { teamId: 'team-bm', categoryId: 'cat-benjamin-masc', federationName: 'VOLEIBOL SAN PEDRO', phaseKey: 'favb-1265-165-242' },
  { teamId: 'team-bf-rojo', categoryId: 'cat-benjamin-fem-rojo', federationName: 'VOLEIBOL SAN PEDRO ROJO', phaseKey: 'favb-1272-166-243' },
  { teamId: 'team-bf-negro', categoryId: 'cat-benjamin-fem-negro', federationName: 'VOLEIBOL SAN PEDRO NEGRO', phaseKey: 'favb-1272-166-243' },
  { teamId: 'team-senior-fem-afade', categoryId: 'cat-senior-fem-afade', federationName: 'CD VOLEIBOL SAN PEDRO', phaseKey: 'afade-2035' },
  { teamId: 'team-juvenil-fem-afade', categoryId: 'cat-juvenil-fem-afade', federationName: 'CD VOLEIBOL SAN PEDRO', phaseKey: 'afade-2041' },
  { teamId: 'team-infantil-fem-afade', categoryId: 'cat-infantil-fem-afade', federationName: 'CD VOLEIBOL SAN PEDRO', phaseKey: 'afade-2043' },
];

const TEAM_BY_ID = new Map(CLUB_TEAMS_META.map((t) => [t.id, t]));
const CATEGORY_BY_ID = new Map(CLUB_CATEGORIES_META.map((c) => [c.id, c]));
const TEAM_PHASE_BY_ID = new Map(CLUB_TEAM_PHASE_META.map((m) => [m.teamId, m]));
const TEAM_PHASE_BY_CAT_ID = new Map(CLUB_TEAM_PHASE_META.map((m) => [m.categoryId, m]));

function normalizeTeamNameForMatch(name?: string | null): string {
  return String(name || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function getClubTeamNameById(teamId: string): string {
  return TEAM_BY_ID.get(teamId)?.name || teamId;
}

export function getClubCategoryByTeamId(teamId: string): Category | undefined {
  const team = TEAM_BY_ID.get(teamId);
  if (!team) return undefined;
  return CATEGORY_BY_ID.get(team.categoryId);
}

/**
 * Comprueba si un partido pertenece al equipo indicado (incluyendo derbis internos
 * entre dos equipos de San Pedro dentro de la misma fase oficial).
 */
export function doesMatchBelongToTeam(
  match: { teamId?: string; homeTeamName?: string; homeTeam?: string; awayTeamName?: string; awayTeam?: string },
  targetTeamId: string
): boolean {
  if (!targetTeamId) return false;
  if (match.teamId === targetTeamId) return true;

  const primaryMeta = match.teamId ? TEAM_PHASE_BY_ID.get(match.teamId) : undefined;
  const targetMeta = TEAM_PHASE_BY_ID.get(targetTeamId);
  if (!primaryMeta || !targetMeta || primaryMeta.phaseKey !== targetMeta.phaseKey) {
    return false;
  }

  const targetNorm = normalizeTeamNameForMatch(targetMeta.federationName);
  const homeNorm = normalizeTeamNameForMatch(match.homeTeamName || match.homeTeam);
  const awayNorm = normalizeTeamNameForMatch(match.awayTeamName || match.awayTeam);
  return homeNorm === targetNorm || awayNorm === targetNorm;
}

/**
 * Comprueba si un partido pertenece a una categoría concreta (soporta derbis internos).
 */
export function doesMatchBelongToCategory(
  match: {
    categoryId?: string;
    teamId?: string;
    homeTeamName?: string;
    homeTeam?: string;
    awayTeamName?: string;
    awayTeam?: string;
  },
  targetCategoryId: string
): boolean {
  if (!targetCategoryId) return false;
  if (match.categoryId === targetCategoryId) return true;
  const catMeta = TEAM_PHASE_BY_CAT_ID.get(targetCategoryId);
  if (!catMeta) return false;
  return doesMatchBelongToTeam(match, catMeta.teamId);
}

/**
 * Dada una fila de clasificación perteneciente al club y la categoría activa,
 * devuelve la categoría exacta a la que corresponde ese equipo de San Pedro (útil en fases compartidas).
 */
export function getClubCategoryIdByStandingsTeam(
  standingsTeamName: string,
  activeCategoryId: string
): string {
  const activeMeta = TEAM_PHASE_BY_CAT_ID.get(activeCategoryId);
  if (!activeMeta) return activeCategoryId;
  const norm = normalizeTeamNameForMatch(standingsTeamName);
  const exact = CLUB_TEAM_PHASE_META.find(
    (m) => m.phaseKey === activeMeta.phaseKey && normalizeTeamNameForMatch(m.federationName) === norm
  );
  return exact?.categoryId || activeCategoryId;
}

export type ClubCategoryFamilyCode =
  | 'SENIOR'
  | 'JUVENIL'
  | 'CADETE'
  | 'INFANTIL'
  | 'ALEVIN'
  | 'BENJAMIN';

export interface ClubCategoryFamilyMeta {
  code: ClubCategoryFamilyCode;
  label: string;
  shortLabel: string;
  order: number;
}

export const CLUB_CATEGORY_FAMILIES: ClubCategoryFamilyMeta[] = [
  { code: 'SENIOR', label: 'Categoría Senior', shortLabel: 'Senior', order: 1 },
  { code: 'JUVENIL', label: 'Categoría Juvenil', shortLabel: 'Juvenil', order: 2 },
  { code: 'CADETE', label: 'Categoría Cadete', shortLabel: 'Cadete', order: 3 },
  { code: 'INFANTIL', label: 'Categoría Infantil', shortLabel: 'Infantil', order: 4 },
  { code: 'ALEVIN', label: 'Categoría Alevín', shortLabel: 'Alevín', order: 5 },
  { code: 'BENJAMIN', label: 'Categoría Benjamín', shortLabel: 'Benjamín', order: 6 },
];

const FAMILY_BY_CODE = new Map(CLUB_CATEGORY_FAMILIES.map((f) => [f.code, f]));

/**
 * Determina la familia de categoría principal (Senior, Juvenil, Cadete, Infantil, Alevín, Benjamín)
 * a partir de cualquier ID de equipo/categoría, slug o nombre visible.
 */
export function getCategoryFamilyCode(idOrName?: string | null): ClubCategoryFamilyCode {
  const raw = String(idOrName || '').trim();
  const team = TEAM_BY_ID.get(raw);
  const cat = CATEGORY_BY_ID.get(team?.categoryId || raw);
  const norm = normalizeTeamNameForMatch(cat?.name || team?.name || raw);

  if (norm.includes('BENJAMIN') || raw.includes('-bm') || raw.includes('-bf-')) return 'BENJAMIN';
  if (norm.includes('ALEVIN') || raw.includes('-am-') || raw.includes('-af-')) return 'ALEVIN';
  if (norm.includes('INFANTIL') || raw.includes('-im') || raw.includes('-if-')) return 'INFANTIL';
  if (norm.includes('CADETE') || raw.includes('-cm') || raw.includes('-cf-')) return 'CADETE';
  if (norm.includes('JUVENIL') || raw.includes('-jm') || raw.includes('-jf-')) return 'JUVENIL';
  return 'SENIOR';
}

export function getCategoryFamilyMeta(idOrName?: string | null): ClubCategoryFamilyMeta {
  const code = getCategoryFamilyCode(idOrName);
  return FAMILY_BY_CODE.get(code) || CLUB_CATEGORY_FAMILIES[0];
}

/**
 * Devuelve la etiqueta compacta de un equipo dentro del desplegable de su categoría
 * (ej. "Alevín Femenino Azul (Plata · G1)" -> "Femenino Azul (Plata · G1)").
 */
export function getShortTeamLabelInFamily(
  fullName: string,
  familyCode?: ClubCategoryFamilyCode
): string {
  const resolvedCode = familyCode || getCategoryFamilyCode(fullName);
  const familyPrefixMap: Record<ClubCategoryFamilyCode, RegExp> = {
    SENIOR: /^Senior\s+/i,
    JUVENIL: /^Juvenil\s+/i,
    CADETE: /^Cadete\s+/i,
    INFANTIL: /^Infantil\s+/i,
    ALEVIN: /^Alev[ií]n\s+/i,
    BENJAMIN: /^Benjam[ií]n\s+/i,
  };
  const stripped = String(fullName || '')
    .trim()
    .replace(familyPrefixMap[resolvedCode], '')
    .trim();
  return stripped || fullName;
}

/**
 * Agrupa una lista arbitraria (equipos, categorías, enlaces o resúmenes)
 * por las 6 categorías oficiales en orden de edad, omitiendo familias vacías.
 */
export function groupByCategoryFamily<T>(
  items: T[],
  getKey: (item: T) => string | undefined | null
): Array<{ family: ClubCategoryFamilyMeta; items: T[] }> {
  const buckets = new Map<ClubCategoryFamilyCode, T[]>();
  for (const f of CLUB_CATEGORY_FAMILIES) {
    buckets.set(f.code, []);
  }
  for (const item of items) {
    const code = getCategoryFamilyCode(getKey(item));
    buckets.get(code)!.push(item);
  }
  return CLUB_CATEGORY_FAMILIES.map((family) => ({
    family,
    items: buckets.get(family.code) || [],
  })).filter((g) => g.items.length > 0);
}

/**
 * Comprueba si un partido pertenece a cualquiera de los equipos de una familia de categoría.
 */
export function doesMatchBelongToCategoryFamily(
  match: {
    categoryId?: string;
    teamId?: string;
    homeTeamName?: string;
    homeTeam?: string;
    awayTeamName?: string;
    awayTeam?: string;
  },
  familyCode: ClubCategoryFamilyCode
): boolean {
  const matchingCatIds = CLUB_CATEGORIES_META.filter(
    (c) => getCategoryFamilyCode(c.id) === familyCode
  ).map((c) => c.id);
  return matchingCatIds.some((catId) => doesMatchBelongToCategory(match, catId));
}

const SURNAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'i', 'e', 'da', 'das', 'do', 'dos']);

/**
 * Convierte apellidos a iniciales con punto (ej. "Martínez López" -> "M. L.").
 * Preserva iniciales ya abreviadas sin duplicar puntos ni alterar dorsales numéricos.
 */
export function formatSurnameInitials(lastName?: string | null): string {
  const clean = String(lastName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  if (/^\d+$/.test(clean)) return clean;

  const rawTokens = clean.split(' ').filter(Boolean);
  const significantTokens = rawTokens.filter(
    (t) => !SURNAME_PARTICLES.has(t.toLowerCase())
  );
  const tokensToUse = significantTokens.length > 0 ? significantTokens : rawTokens;

  return tokensToUse
    .map((token) => {
      const stripped = token.replace(/\.+$/, '');
      if (!stripped) return '';
      const firstChar = stripped.charAt(0).toLocaleUpperCase('es-ES');
      return `${firstChar}.`;
    })
    .filter(Boolean)
    .join(' ');
}

function toCleanPersonWord(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return '';
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) {
    return trimmed
      .toLocaleLowerCase('es-ES')
      .replace(/^./, (c) => c.toLocaleUpperCase('es-ES'));
  }
  return trimmed;
}

/**
 * Formatea el nombre de un deportista manteniendo el nombre de pila y reduciendo
 * los apellidos a iniciales (ej. "Lucía Martínez López" -> "Lucía M. L.",
 * "SANCHEZ GOMEZ, LUCIA" -> "Lucia S. G.").
 */
export function formatPlayerNameWithInitials(
  fullNameOrFirst?: string | null,
  lastName?: string | null
): { firstName: string; lastInitials: string; displayName: string } {
  const firstRaw = String(fullNameOrFirst || '').trim().replace(/\s+/g, ' ');
  const lastRaw = String(lastName || '').trim().replace(/\s+/g, ' ');

  if (!firstRaw) {
    return { firstName: '', lastInitials: '', displayName: '' };
  }

  if (lastRaw) {
    const cleanFirst = firstRaw
      .split(' ')
      .map(toCleanPersonWord)
      .join(' ');
    const lastInitials = formatSurnameInitials(lastRaw);
    const displayName = [cleanFirst, lastInitials].filter(Boolean).join(' ').trim();
    return { firstName: cleanFirst, lastInitials, displayName };
  }

  if (firstRaw.includes(',')) {
    const [rawSurnames, ...restFirst] = firstRaw.split(',');
    const givenName = restFirst.join(' ').trim().replace(/\s+/g, ' ');
    const cleanFirst = givenName
      .split(' ')
      .filter(Boolean)
      .map(toCleanPersonWord)
      .join(' ');
    const lastInitials = formatSurnameInitials(rawSurnames);
    const displayName = [cleanFirst || firstRaw, lastInitials].filter(Boolean).join(' ').trim();
    return { firstName: cleanFirst || firstRaw, lastInitials, displayName };
  }

  const words = firstRaw.split(' ').filter(Boolean);
  if (words.length <= 1) {
    const cleanWord = toCleanPersonWord(firstRaw);
    return { firstName: cleanWord, lastInitials: '', displayName: cleanWord };
  }

  // Si termina ya en iniciales tipo "M. L."
  const alreadyInitialCount = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]\.?$/i.test(w) && w.includes('.')).length;
  if (alreadyInitialCount > 0 && words.length >= alreadyInitialCount + 1) {
    const cut = words.length - alreadyInitialCount;
    const cleanFirst = words.slice(0, cut).map(toCleanPersonWord).join(' ');
    const lastInitials = formatSurnameInitials(words.slice(cut).join(' '));
    return {
      firstName: cleanFirst,
      lastInitials,
      displayName: [cleanFirst, lastInitials].filter(Boolean).join(' ').trim(),
    };
  }

  // Convención española cuando viene como string completo sin coma:
  // 2 palabras -> Nombre + 1 Apellido; >=3 palabras -> si la primera es nombre compuesto corto vs 2 apellidos:
  // En actas/datos del club (sin coma) suelen venir "Nombre Apellido1 Apellido2" -> si >=3 tomamos los 2 últimos como apellidos
  // (y si la palabra previa al penúltimo es partícula "de/del/la", retroceder 1 más).
  let surnameStartIdx = words.length >= 3 ? words.length - 2 : words.length - 1;
  while (surnameStartIdx > 1 && SURNAME_PARTICLES.has(words[surnameStartIdx - 1].toLowerCase())) {
    surnameStartIdx -= 1;
  }
  const cleanFirst = words.slice(0, surnameStartIdx).map(toCleanPersonWord).join(' ');
  const lastInitials = formatSurnameInitials(words.slice(surnameStartIdx).join(' '));
  return {
    firstName: cleanFirst,
    lastInitials,
    displayName: [cleanFirst, lastInitials].filter(Boolean).join(' ').trim(),
  };
}

export type TeamColorKey =
  | 'VERDE'
  | 'AZUL'
  | 'ROSA'
  | 'ROJO'
  | 'BLANCO'
  | 'GRIS'
  | 'NEGRO';

export interface TeamColorTheme {
  colorKey: TeamColorKey | null;
  textClass: string;
  activeTextClass: string;
  borderClass: string;
  activeBgClass: string;
  dotClass: string;
}

const DEFAULT_TEAM_COLOR_THEME: TeamColorTheme = {
  colorKey: null,
  textClass: 'text-primary',
  activeTextClass: 'text-white',
  borderClass: 'border-primary',
  activeBgClass: 'bg-primary-container',
  dotClass: 'bg-primary',
};

const TEAM_COLOR_THEMES: Record<TeamColorKey, TeamColorTheme> = {
  VERDE: {
    colorKey: 'VERDE',
    textClass: 'text-emerald-400',
    activeTextClass: 'text-emerald-200',
    borderClass: 'border-emerald-400',
    activeBgClass: 'bg-emerald-950/90',
    dotClass: 'bg-emerald-400',
  },
  AZUL: {
    colorKey: 'AZUL',
    textClass: 'text-sky-400',
    activeTextClass: 'text-sky-200',
    borderClass: 'border-sky-400',
    activeBgClass: 'bg-sky-950/90',
    dotClass: 'bg-sky-400',
  },
  ROSA: {
    colorKey: 'ROSA',
    textClass: 'text-pink-400',
    activeTextClass: 'text-pink-200',
    borderClass: 'border-pink-400',
    activeBgClass: 'bg-pink-950/90',
    dotClass: 'bg-pink-400',
  },
  ROJO: {
    colorKey: 'ROJO',
    textClass: 'text-red-400',
    activeTextClass: 'text-red-200',
    borderClass: 'border-red-500',
    activeBgClass: 'bg-red-950/90',
    dotClass: 'bg-red-500',
  },
  BLANCO: {
    colorKey: 'BLANCO',
    textClass: 'text-white',
    activeTextClass: 'text-white',
    borderClass: 'border-white',
    activeBgClass: 'bg-zinc-800',
    dotClass: 'bg-white',
  },
  GRIS: {
    colorKey: 'GRIS',
    textClass: 'text-slate-300',
    activeTextClass: 'text-slate-100',
    borderClass: 'border-slate-400',
    activeBgClass: 'bg-slate-800',
    dotClass: 'bg-slate-400',
  },
  NEGRO: {
    colorKey: 'NEGRO',
    textClass: 'text-zinc-200',
    activeTextClass: 'text-white',
    borderClass: 'border-zinc-400',
    activeBgClass: 'bg-black',
    dotClass: 'bg-black ring-1 ring-white/85',
  },
};

/**
 * Devuelve clases Tailwind con contraste garantizado en fondo oscuro según el color
 * identificativo del equipo (Verde, Azul, Rosa, Rojo, Blanco, Gris, Negro).
 */
export function getTeamColorTheme(nameOrId?: string | null): TeamColorTheme {
  const raw = String(nameOrId || '').trim().toLowerCase();
  if (!raw) return DEFAULT_TEAM_COLOR_THEME;

  if (/\bverde\b/i.test(raw) || /-verde\b/i.test(raw)) return TEAM_COLOR_THEMES.VERDE;
  if (/\bazul\b/i.test(raw) || /-azul\b/i.test(raw)) return TEAM_COLOR_THEMES.AZUL;
  if (/\brosa\b/i.test(raw) || /-rosa\b/i.test(raw)) return TEAM_COLOR_THEMES.ROSA;
  if (/\brojo\b/i.test(raw) || /-rojo\b/i.test(raw)) return TEAM_COLOR_THEMES.ROJO;
  if (/\bblanco\b/i.test(raw) || /-blanco\b/i.test(raw)) return TEAM_COLOR_THEMES.BLANCO;
  if (/\bgris\b/i.test(raw) || /-gris\b/i.test(raw)) return TEAM_COLOR_THEMES.GRIS;
  if (/\bnegro\b/i.test(raw) || /-negro\b/i.test(raw)) return TEAM_COLOR_THEMES.NEGRO;

  return DEFAULT_TEAM_COLOR_THEME;
}
