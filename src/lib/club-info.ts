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
    id: 'cat-senior-fem-afade',
    name: 'Senior Femenino AFADE (GB)',
    slug: 'senior-femenino-afade',
    order: 14,
    description: 'Liga AFADE Málaga · Senior Femenino - GB',
    association: 'AFADE',
  },
  {
    id: 'cat-juvenil-fem-afade',
    name: 'Juvenil Femenino AFADE (GB)',
    slug: 'juvenil-femenino-afade',
    order: 15,
    description: 'Liga AFADE Málaga · Juvenil Femenino - GB',
    association: 'AFADE',
  },
  {
    id: 'cat-infantil-fem-afade',
    name: 'Infantil Femenino AFADE (GB)',
    slug: 'infantil-femenino-afade',
    order: 16,
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

const TEAM_BY_ID = new Map(CLUB_TEAMS_META.map((t) => [t.id, t]));
const CATEGORY_BY_ID = new Map(CLUB_CATEGORIES_META.map((c) => [c.id, c]));

export function getClubTeamNameById(teamId: string): string {
  return TEAM_BY_ID.get(teamId)?.name || teamId;
}

export function getClubCategoryByTeamId(teamId: string): Category | undefined {
  const team = TEAM_BY_ID.get(teamId);
  if (!team) return undefined;
  return CATEGORY_BY_ID.get(team.categoryId);
}
