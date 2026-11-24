export interface VenueMatchLike {
  id: string;
  isClubHome?: boolean;
  homeTeam?: string;
  homeTeamName?: string;
  awayTeam?: string;
  awayTeamName?: string;
  venue?: string | null;
  venueName?: string | null;
  locality?: string | null;
  court?: string | null;
}

export interface VenueResolutionInput {
  venueOverride?: string | null;
  localityOverride?: string | null;
}

export interface ResolvedMatchVenue {
  venueName: string;
  locality: string;
  court: string | null;
  isEstimated: boolean;
}

const PLACEHOLDER_VENUES = new Set([
  'pabellón municipal visitante',
  'pabellon municipal visitante',
  'pabellón visitante',
  'pabellon visitante',
  'sede por confirmar',
  'por confirmar',
  'por definir',
  '',
]);

function normalizeKey(raw?: string | null): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isPlaceholderVenue(venue?: string | null): boolean {
  const norm = normalizeKey(venue);
  if (!norm) return true;
  if (PLACEHOLDER_VENUES.has(norm)) return true;
  return norm.includes('municipal visitante');
}

interface KnownClubVenue {
  keywords: string[];
  venueName: string;
  locality: string;
}

const KNOWN_OPPONENT_VENUES: KnownClubVenue[] = [
  {
    keywords: ['cartama', 'cd cartama', 'cartama blanco', 'cartama a', 'cartama b'],
    venueName: 'Polideportivo Municipal de Cártama',
    locality: 'Cártama',
  },
  {
    keywords: ['linense', 'voleyplaya linense'],
    venueName: 'Pabellón Municipal de La Línea',
    locality: 'La Línea de la Concepción',
  },
  {
    keywords: ['fuengirola'],
    venueName: 'Complejo Polideportivo Municipal Elola',
    locality: 'Fuengirola',
  },
  {
    keywords: ['benalmadena', 'uda benalmadena'],
    venueName: 'Polideportivo Municipal de Arroyo de la Miel',
    locality: 'Benalmádena',
  },
  {
    keywords: ['alhaurin el grande', 'emv alh grande', 'emv alhaurin el grande'],
    venueName: 'Pabellón Municipal de Alhaurín el Grande',
    locality: 'Alhaurín el Grande',
  },
  {
    keywords: ['alhaurin de la torre', 'emv alh'],
    venueName: 'Polideportivo Municipal El Limón',
    locality: 'Alhaurín de la Torre',
  },
  {
    keywords: ['pizarra'],
    venueName: 'Pabellón Municipal Dani Pacheco',
    locality: 'Pizarra',
  },
  {
    keywords: ['costa del voley', 'marbella'],
    venueName: 'Pabellón Antonio Serrano Lima',
    locality: 'Marbella',
  },
  {
    keywords: ['estepona', '3stevoley'],
    venueName: 'Polideportivo Municipal El Carmen',
    locality: 'Estepona',
  },
  {
    keywords: ['mijas'],
    venueName: 'Pabellón Deportivo Las Cañadas',
    locality: 'Mijas',
  },
  {
    keywords: ['forvoley', 'torremolinos'],
    venueName: 'Palacio San Miguel',
    locality: 'Torremolinos',
  },
  {
    keywords: ['inter playas', 'rincon', 'la vega'],
    venueName: 'Pabellón Deportivo Rubén Ruzafa',
    locality: 'Rincón de la Victoria',
  },
  {
    keywords: ['nueva ola'],
    venueName: 'CEIP Tierno Galván / Pabellón Torre de Benagalbón',
    locality: 'Rincón de la Victoria',
  },
  {
    keywords: ['la coracha', 'ciudad de malaga', 'union malaguena', 'cev', 'san jose'],
    venueName: 'Complejo Deportivo / Pabellón Ciudad Jardín',
    locality: 'Málaga',
  },
  {
    keywords: ['nerja'],
    venueName: 'Pabellón Cubierto Municipal Enrique López Cuenca',
    locality: 'Nerja',
  },
  {
    keywords: ['velez', 'axarquia'],
    venueName: 'Polideportivo Fernando Ruiz Hierro',
    locality: 'Vélez-Málaga',
  },
  {
    keywords: ['torre del mar'],
    venueName: 'IES Joaquín Lobato / Pabellón Maestro Salvador Sánchez',
    locality: 'Torre del Mar',
  },
  {
    keywords: ['arroyo de la miel'],
    venueName: 'Polideportivo Municipal de Arroyo de la Miel',
    locality: 'Benalmádena',
  },
];

function matchKnownClub(teamName: string): { venueName: string; locality: string } | null {
  const norm = normalizeKey(teamName);
  if (!norm) return null;
  for (const entry of KNOWN_OPPONENT_VENUES) {
    for (const kw of entry.keywords) {
      if (norm.includes(kw)) {
        return { venueName: entry.venueName, locality: entry.locality };
      }
    }
  }
  return null;
}

/**
 * Resuelve la sede y localidad reales de un partido evitando placeholders genéricos:
 * 1) Override manual en `intranet_match_schedules`
 * 2) Sede/localidad real del propio partido (ej. `sports_cache` de favoley.net o AFADE)
 * 3) Cruce con otros partidos en casa del mismo rival dentro de `allMatches`
 * 4) Diccionario oficial de clubes rivales andaluces/malagueños
 */
export function resolveMatchVenue(
  match: VenueMatchLike,
  allMatches: VenueMatchLike[] = [],
  override?: VenueResolutionInput | null
): ResolvedMatchVenue {
  const manualVenue = String(override?.venueOverride || '').trim();
  const manualLocality = String(override?.localityOverride || '').trim();
  const rawVenue = String(match.venueName || match.venue || '').trim();
  const rawLocality = String(match.locality || '').trim();

  if (match.isClubHome) {
    const homeVenue = manualVenue || (!isPlaceholderVenue(rawVenue) ? rawVenue : 'Pabellón Polideportivo Sergio Scariolo');
    const homeLocality = manualLocality || rawLocality || 'San Pedro Alcántara';
    return {
      venueName: homeVenue,
      locality: homeLocality,
      court: match.court || null,
      isEstimated: false,
    };
  }

  if (manualVenue) {
    return {
      venueName: manualVenue,
      locality: manualLocality || rawLocality || 'Por confirmar',
      court: match.court || null,
      isEstimated: false,
    };
  }

  if (!isPlaceholderVenue(rawVenue)) {
    return {
      venueName: rawVenue,
      locality: manualLocality || rawLocality || matchKnownClub(match.homeTeamName || match.homeTeam || '')?.locality || '',
      court: match.court || null,
      isEstimated: false,
    };
  }

  const hostTeam = String(match.homeTeamName || match.homeTeam || '').trim();
  const normHost = normalizeKey(hostTeam);

  if (normHost && allMatches.length > 0) {
    for (const candidate of allMatches) {
      if (candidate.isClubHome) continue;
      const candHost = normalizeKey(candidate.homeTeamName || candidate.homeTeam || '');
      const candVenue = String(candidate.venueName || candidate.venue || '').trim();
      if (candHost && candHost === normHost && !isPlaceholderVenue(candVenue)) {
        return {
          venueName: candVenue,
          locality: manualLocality || String(candidate.locality || '').trim() || rawLocality || '',
          court: match.court || candidate.court || null,
          isEstimated: true,
        };
      }
    }
  }

  const known = matchKnownClub(hostTeam);
  if (known) {
    return {
      venueName: known.venueName,
      locality: manualLocality || rawLocality || known.locality,
      court: match.court || null,
      isEstimated: true,
    };
  }

  return {
    venueName: hostTeam ? `Pista del club local (${hostTeam})` : 'Sede por confirmar',
    locality: manualLocality || rawLocality || 'Por confirmar',
    court: match.court || null,
    isEstimated: true,
  };
}
