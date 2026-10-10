/**
 * Mapeo oficial y resolución de escudos e iniciales de clubes federados (FAVB)
 * Las iniciales corresponden exactamente a la nomenclatura oficial que usa favoley.net dentro de cada partido.
 */

export const TEAM_LOGOS_MAP: Record<string, string> = {
  // San Pedro (todas las categorías y variantes)
  'VOLEIBOL SAN PEDRO': '/images/logo.jpg',
  'VOLEIBOL SAN PEDRO ROJO': '/images/logo.jpg',
  'VOLEIBOL SAN PEDRO NEGRO': '/images/logo.jpg',
  'VOLEIBOL SAN PEDRO BLANCO': '/images/logo.jpg',

  // Rivales oficiales descargados de favoley.net
  'ACADEMIA VC ISONDA': '/images/teams/academia-vc-isonda.jpg',
  'CDU ATARFE': '/images/teams/cdu-atarfe.jpg',
  'CV CIUDAD DE MÁLAGA': '/images/teams/cv-ciudad-de-malaga.jpg',
  'C.V. CIUDAD DE MÁLAGA': '/images/teams/c-v-ciudad-de-malaga.jpg',
  'SIERRA ELVIRA': '/images/teams/sierra-elvira.jpg',
  'FUNDACIÓN CAJASOL ANDALUCÍA': '/images/teams/fundacion-cajasol-andalucia.jpg',
  'LAS FLORES SEVILLA': '/images/teams/las-flores-sevilla.jpg',
  'AL-BAYYANA ROQUETAS': '/images/teams/al-bayyana-roquetas.jpg',
  'CORPORE SANO CVSA': '/images/teams/corpore-sano-cvsa.jpg',
  'GRANAVOLEY ESPAGRUAS': '/images/teams/granavoley-espagruas.jpg',
  '3STEVOLEY': '/images/teams/3stevoley.jpg',
  '3STEVOLEY A': '/images/teams/3stevoley-a.jpg',
  '3STEVOLEY AIRZONE': '/images/teams/3stevoley-airzone.jpg',
  '3STEVOLEY B': '/images/teams/3stevoley-b.jpg',
  '3STEVOLEY C': '/images/teams/3stevoley-c.jpg',
  'FUENGIROLA CV': '/images/teams/fuengirola-cv.jpg',
  'FUENGIROLA CV A': '/images/teams/fuengirola-cv-a.jpg',
  'FUENGIROLA CV B': '/images/teams/fuengirola-cv-b.jpg',
  'FUENGIROLA CV D': '/images/teams/fuengirola-cv-d.jpg',
  'UDA BENALMADENA': '/images/teams/uda-benalmadena.jpg',
  'UDA BENALMADENA A': '/images/teams/uda-benalmadena-a.jpg',
  'CARTAMA': '/images/teams/cartama.jpg',
  'CARTAMA AZUL': '/images/teams/cartama-azul.jpg',
  'CARTAMA BLANCO': '/images/teams/cartama-blanco.jpg',
  'INTER PLAYAS': '/images/teams/inter-playas.jpg',
  'INTER PLAYAS A': '/images/teams/inter-playas-a.jpg',
  'INTER PLAYAS B': '/images/teams/inter-playas-b.jpg',
  'INTER PLAYAS C': '/images/teams/inter-playas-c.jpg',
  'LA VEGA': '/images/teams/la-vega.jpg',
  'LA VEGA VOLEY': '/images/teams/la-vega-voley.jpg',
  'NUEVA OLA': '/images/teams/nueva-ola.jpg',
  'NUEVA OLA A': '/images/teams/nueva-ola-a.jpg',
  'ALHAURÍN DE LA TORRE': '/images/teams/alhaurin-de-la-torre.jpg',
  'ALHAURÍN DE LA TORRE A': '/images/teams/alhaurin-de-la-torre-a.jpg',
  'LA CORACHA': '/images/teams/la-coracha.jpg',
  'CEV JUVENIL': '/images/teams/cev-juvenil.jpg',
  'CV PIZARRA LA FUENSANTA': '/images/teams/cv-pizarra-la-fuensanta.jpg',
  'CV PIZARRA LA FUENSANTA AZUL': '/images/teams/cv-pizarra-la-fuensanta-azul.jpg',
  'CV PIZARRA LA FUENSANTA BLANCO': '/images/teams/cv-pizarra-la-fuensanta-blanco.jpg',
  'UNION MALAGUEÑA': '/images/teams/union-malaguena.jpg',
  'CADETE BLANCO': '/images/teams/cadete-blanco.jpg',
  'INFANTIL BLANCO': '/images/teams/infantil-blanco.jpg',
  'SOHO MALAGA': '/images/teams/soho-malaga.jpg',
  'FORVOLEY TORREMOLINOS': '/images/teams/forvoley-torremolinos.jpg',
  'EMV ALH.GRANDE': '/images/teams/emv-alh-grande.jpg',
  'COSTA DEL VOLEY': '/images/teams/costa-del-voley.png',
  'COSTA DEL VOLEY ROSA': '/images/teams/costa-del-voley.png',
  'COSTA DEL VOLEY ROSA (ORO)': '/images/teams/costa-del-voley.png',
  'MIJAS VOLEY AZUL': '/images/teams/mijas-voley.png',
  'AD ASUNCIÓN': '/images/teams/ad-asuncion.png',
  'CLUB NERJA ATLETISMO': '/images/teams/club-nerja.png',
};

/**
 * Nomenclatura oficial de iniciales de la FAVB (extraída de portal-marcador-parcial en favoley.net)
 */
export const TEAM_INITIALS_MAP: Record<string, string> = {
  // San Pedro (en favoley.net todos los equipos del club llevan la sigla oficial VSP)
  'VOLEIBOL SAN PEDRO': 'VSP',
  'VOLEIBOL SAN PEDRO ROJO': 'VSP',
  'VOLEIBOL SAN PEDRO NEGRO': 'VSP',
  'VOLEIBOL SAN PEDRO BLANCO': 'VSP',

  // Rivales oficiales según nomenclatura interna de favoley.net
  'ACADEMIA VC ISONDA': 'AVC',
  'CDU ATARFE': 'CDU',
  'CV CIUDAD DE MÁLAGA': 'CDM',
  'C.V. CIUDAD DE MÁLAGA': 'CDM',
  'SIERRA ELVIRA': 'SIE',
  'FUNDACIÓN CAJASOL ANDALUCÍA': 'FCA',
  'LAS FLORES SEVILLA': 'LFS',
  'AL-BAYYANA ROQUETAS': 'ALB',
  'CORPORE SANO CVSA': 'CVS',
  'GRANAVOLEY ESPAGRUAS': 'GRV',
  '3STEVOLEY': '3ST',
  '3STEVOLEY A': '3ST',
  '3STEVOLEY AIRZONE': '3ST',
  '3STEVOLEY B': '3ST',
  '3STEVOLEY C': '3ST',
  'FUENGIROLA CV': 'CVF',
  'FUENGIROLA CV A': 'CVF',
  'FUENGIROLA CV B': 'CVF',
  'FUENGIROLA CV D': 'CVF',
  'UDA BENALMADENA': 'UDA',
  'UDA BENALMADENA A': 'UDA',
  'CARTAMA': 'CAR',
  'CARTAMA AZUL': 'CAR',
  'CARTAMA BLANCO': 'CAR',
  'INTER PLAYAS': 'IPA',
  'INTER PLAYAS A': 'IPA',
  'INTER PLAYAS B': 'IPB',
  'INTER PLAYAS C': 'IPC',
  'LA VEGA': 'LVV',
  'LA VEGA VOLEY': 'LVV',
  'NUEVA OLA': 'OLA',
  'NUEVA OLA A': 'OLA',
  'ALHAURÍN DE LA TORRE': 'ADT',
  'ALHAURÍN DE LA TORRE A': 'ADT',
  'LA CORACHA': 'COR',
  'CEV JUVENIL': 'CEV',
  'CV PIZARRA LA FUENSANTA': 'PIZ',
  'CV PIZARRA LA FUENSANTA AZUL': 'PIA',
  'CV PIZARRA LA FUENSANTA BLANCO': 'PIB',
  'UNION MALAGUEÑA': 'UMA',
  'CADETE BLANCO': 'CBL',
  'INFANTIL BLANCO': 'IBL',
  'SOHO MALAGA': 'SOH',
  'FORVOLEY TORREMOLINOS': 'FVT',
  'EMV ALH.GRANDE': 'EAG',
  'COSTA DEL VOLEY': 'CDV',
  'COSTA DEL VOLEY ROSA': 'CDV',
  'COSTA DEL VOLEY ROSA (ORO)': 'CDV',
  'MIJAS VOLEY AZUL': 'MIV',
  'AD ASUNCIÓN': 'ADA',
  'CLUB NERJA ATLETISMO': 'CNA',
};

/**
 * Devuelve las 3 iniciales oficiales según la nomenclatura de la FAVB (favoley.net)
 */
export function getTeamInitials(teamName?: string | null): string {
  if (!teamName) return 'FAV';
  const cleanName = teamName.trim().toUpperCase();

  if (TEAM_INITIALS_MAP[cleanName]) {
    return TEAM_INITIALS_MAP[cleanName];
  }

  const norm = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, code] of Object.entries(TEAM_INITIALS_MAP)) {
    const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm === normKey) {
      return code;
    }
  }

  if (norm.includes('SAN PEDRO')) return 'VSP';
  if (norm.includes('ISONDA')) return 'AVC';
  if (norm.includes('COSTA DEL VOLEY')) return 'CDV';
  if (norm.includes('PIZARRA')) {
    if (norm.includes('AZUL')) return 'PIA';
    if (norm.includes('BLANCO')) return 'PIB';
    return 'PIZ';
  }
  if (norm.includes('FUENGIROLA')) return 'CVF';
  if (norm.includes('BENALMADENA')) return 'UDA';
  if (norm.includes('CARTAMA')) return 'CAR';
  if (norm.includes('3STEVOLEY')) return '3ST';
  if (norm.includes('CIUDAD DE MALAGA')) return 'CDM';
  if (norm.includes('ATARFE')) return 'CDU';
  if (norm.includes('CORPORE SANO')) return 'CVS';
  if (norm.includes('GRANAVOLEY')) return 'GRV';
  if (norm.includes('SIERRA ELVIRA')) return 'SIE';
  if (norm.includes('AL-BAYYANA') || norm.includes('ROQUETAS')) return 'ALB';
  if (norm.includes('CAJASOL')) return 'FCA';
  if (norm.includes('FLORES SEVILLA')) return 'LFS';
  if (norm.includes('NUEVA OLA')) return 'OLA';
  if (norm.includes('LA VEGA')) return 'LVV';
  if (norm.includes('ALHAURIN')) return 'ADT';
  if (norm.includes('INTER PLAYAS')) return 'IPA';
  if (norm.includes('MIJAS')) return 'MIV';

  // Fallback automático a 3 letras significativas
  const words = norm
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL'].includes(w));

  if (words.length >= 3) {
    return `${words[0][0]}${words[1][0]}${words[2][0]}`;
  }
  if (words.length === 2) {
    return `${words[0].slice(0, 2)}${words[1][0]}`.slice(0, 3);
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).padEnd(3, 'X');
  }
  return 'FAV';
}

/**
 * Devuelve la ruta relativa al escudo oficial del club
 */
export function getTeamLogo(teamName?: string | null): string {
  if (!teamName) return '/images/logo.jpg';
  const cleanName = teamName.trim();

  // Si es nuestro propio club
  if (cleanName.toUpperCase().includes('SAN PEDRO')) {
    return '/images/logo.jpg';
  }

  // Coincidencia directa
  if (TEAM_LOGOS_MAP[cleanName]) {
    return TEAM_LOGOS_MAP[cleanName];
  }

  // Búsqueda insensible a mayúsculas y acentos
  const norm = cleanName
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [key, path] of Object.entries(TEAM_LOGOS_MAP)) {
    const normKey = key
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (norm === normKey) {
      return path;
    }
  }

  // Búsqueda por palabras clave
  if (norm.includes('ATARFE')) return '/images/teams/cdu-atarfe.jpg';
  if (norm.includes('COSTA DEL VOLEY')) return '/images/teams/costa-del-voley.png';
  if (norm.includes('PIZARRA')) return '/images/teams/cv-pizarra-la-fuensanta.jpg';
  if (norm.includes('FUENGIROLA')) return '/images/teams/fuengirola-cv.jpg';
  if (norm.includes('BENALMADENA')) return '/images/teams/uda-benalmadena.jpg';
  if (norm.includes('CARTAMA')) return '/images/teams/cartama.jpg';
  if (norm.includes('3STEVOLEY')) return '/images/teams/3stevoley.jpg';
  if (norm.includes('CIUDAD DE MALAGA')) return '/images/teams/cv-ciudad-de-malaga.jpg';
  if (norm.includes('AL-BAYYANA') || norm.includes('ROQUETAS')) return '/images/teams/al-bayyana-roquetas.jpg';
  if (norm.includes('CAJASOL')) return '/images/teams/fundacion-cajasol-andalucia.jpg';
  if (norm.includes('FLORES SEVILLA')) return '/images/teams/las-flores-sevilla.jpg';
  if (norm.includes('CORPORE SANO')) return '/images/teams/corpore-sano-cvsa.jpg';
  if (norm.includes('GRANAVOLEY')) return '/images/teams/granavoley-espagruas.jpg';
  if (norm.includes('ISONDA')) return '/images/teams/academia-vc-isonda.jpg';
  if (norm.includes('SIERRA ELVIRA')) return '/images/teams/sierra-elvira.jpg';
  if (norm.includes('ALHAURIN')) return '/images/teams/alhaurin-de-la-torre.jpg';
  if (norm.includes('LA CORACHA')) return '/images/teams/la-coracha.jpg';
  if (norm.includes('LA VEGA')) return '/images/teams/la-vega.jpg';
  if (norm.includes('NUEVA OLA')) return '/images/teams/nueva-ola.jpg';
  if (norm.includes('INTER PLAYAS')) return '/images/teams/inter-playas.jpg';
  if (norm.includes('UNION MALAGUENA')) return '/images/teams/union-malaguena.jpg';
  if (norm.includes('SOHO')) return '/images/teams/soho-malaga.jpg';
  if (norm.includes('TORREMOLINOS') || norm.includes('FORVOLEY')) return '/images/teams/forvoley-torremolinos.jpg';
  if (norm.includes('ALH.GRANDE')) return '/images/teams/emv-alh-grande.jpg';
  if (norm.includes('MIJAS')) return '/images/teams/mijas-voley.png';
  if (norm.includes('ASUNCION')) return '/images/teams/ad-asuncion.png';
  if (norm.includes('NERJA')) return '/images/teams/club-nerja.png';
  if (norm.includes('CEV')) return '/images/teams/cev-juvenil.jpg';

  // Si no coincide con ninguno, escudo de San Pedro o genérico
  return '/images/logo.jpg';
}
