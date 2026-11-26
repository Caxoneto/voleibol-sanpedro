import {
  CLUB_CATEGORIES_META,
  getCategoryFamilyCode,
  type ClubCategoryFamilyCode,
} from '@/lib/club-info';

const PRE_NFD_CHAR_MAP: Record<string, string> = {
  ł: 'l',
  Ł: 'l',
  ø: 'o',
  Ø: 'o',
  ß: 'ss',
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  Ð: 'd',
  þ: 'th',
  Þ: 'th',
};

const NAME_PARTICLES = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'i',
  'e',
  'da',
  'do',
  'dos',
  'das',
  'van',
  'von',
  'di',
]);

const LOWER_FORMAT_PARTICLES = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'i',
  'da',
  'do',
  'dos',
  'das',
  'van',
  'von',
  'di',
]);

/**
 * Normaliza nombres y apellidos para comparación determinista insensible a
 * mayúsculas, acentos, diéresis, guiones, abreviaturas frecuentes y caracteres
 * europeos no descomponibles en NFD (como `ł` -> `l`, `ø` -> `o`, `ß` -> `ss`).
 */
export function normalizeNameKey(text: string): string {
  let out = String(text || '').trim();
  if (!out) return '';

  // Mapear letras especiales que Unicode NFD no descompone en ASCII base
  out = out.replace(/[łŁøØßæÆœŒđĐðÐþÞ]/g, (ch) => PRE_NFD_CHAR_MAP[ch] ?? ch);

  // Expandir abreviaturas frecuentes españolas antes de retirar puntuación
  out = out
    .replace(/\bm\.?[ªa]\b/gi, 'maria')
    .replace(/\bfco\.?\b/gi, 'francisco');

  // Unir apóstrofos internos entre letras (ej. O'Connor -> OConnor)
  out = out.replace(/([a-zA-ZÀ-ÿ])['’]([a-zA-ZÀ-ÿ])/g, '$1$2');

  return out
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Elimina partículas conectoras ("de", "del", "la", "los", etc.) manteniendo al menos 2 tokens
 * si existen para preservar identidad mínima en nombres cortos.
 */
export function stripNameParticles(norm: string): string {
  const tokens = String(norm || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length <= 2) return tokens.join(' ');
  const filtered = tokens.filter((t) => !NAME_PARTICLES.has(t));
  return filtered.length >= 2 ? filtered.join(' ') : tokens.join(' ');
}

function capitalizeSegment(seg: string): string {
  if (!seg) return '';
  return seg.charAt(0).toLocaleUpperCase('es-ES') + seg.slice(1).toLocaleLowerCase('es-ES');
}

/**
 * Limpia espacios y normaliza la capitalización cuando el texto viene íntegramente
 * en minúsculas o en MAYÚSCULAS (ej. "lucía garcía-morales" -> "Lucía García-Morales"),
 * conservando capitalizaciones mixtas intencionadas ("McMinn", "De la Cruz").
 */
export function formatProperPersonName(raw: string): string {
  const clean = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!clean) return '';

  const lettersOnly = clean.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñŁłØø]/g, '');
  if (!lettersOnly) return clean;

  const isAllLower = lettersOnly === lettersOnly.toLocaleLowerCase('es-ES');
  const isAllUpper = lettersOnly === lettersOnly.toLocaleUpperCase('es-ES');
  if (!isAllLower && !isAllUpper) {
    return clean;
  }

  const words = clean.split(' ');
  return words
    .map((word, idx) => {
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => capitalizeSegment(part))
          .join('-');
      }
      const lower = word.toLocaleLowerCase('es-ES');
      if (idx > 0 && LOWER_FORMAT_PARTICLES.has(lower)) {
        return lower;
      }
      return capitalizeSegment(word);
    })
    .join(' ');
}

/**
 * Evalúa compatibilidad de fecha o año de nacimiento teniendo en cuenta si el dato
 * existente en BBDD está verificado o es una estimación federativa por categoría.
 */
export function isBirthYearCompatible(params: {
  candidateBirthYear: number | null;
  candidateVerified: boolean;
  candidateDecryptedBirthDate?: string | null;
  candidateFamilyCode: ClubCategoryFamilyCode | null;
  inputBirthYear: number;
  inputBirthDateIso: string;
  seasonStartYear?: number;
}): boolean {
  if (params.candidateVerified) {
    if (params.candidateDecryptedBirthDate) {
      return params.candidateDecryptedBirthDate === params.inputBirthDateIso;
    }
    if (params.candidateBirthYear !== null) {
      return params.candidateBirthYear === params.inputBirthYear;
    }
    return true;
  }

  if (params.candidateBirthYear === null) {
    return true;
  }

  const seasonStart = params.seasonStartYear ?? 2026;
  if (params.candidateFamilyCode === 'SENIOR') {
    // En equipos Senior, FAVB no publica edad y se siembra año orientativo: cualquier
    // deportista nacido en edad competitiva Senior/Juvenil/Cadete promocionado es compatible.
    return params.inputBirthYear <= seasonStart - 14;
  }

  return Math.abs(params.candidateBirthYear - params.inputBirthYear) <= 3;
}

/**
 * Distancia de Damerau-Levenshtein restringida (incluye transposiciones adyacentes de 1 paso).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (a === b) return 0;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + cost);
      }
      dp[i][j] = val;
    }
  }
  return dp[m][n];
}

function areWordTokenPrefixes(tokensA: string[], tokensB: string[]): boolean {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;
  return shorter.every((tok, idx) => longer[idx] === tok);
}

export interface NameSimilarityResult {
  matched: boolean;
  tier: 0 | 1 | 2 | 3;
  score: number;
}

/**
 * Calcula la similitud entre nombre+apellidos introducidos y un candidato en BBDD:
 * - Tier 1 (100): coincidencia normalizada exacta, sin espacios (guiones/compuestos) o sin partículas.
 * - Tier 2 (92): apellidos iguales con nombre compuesto truncado, o 1 apellido FAVB igual al 1er apellido introducido.
 * - Tier 3 (85): mismo número de tokens con 1 única errata Damerau-Levenshtein=1 en palabra >=5 chars.
 */
export function scoreNameSimilarity(
  inputFirst: string,
  inputLast: string,
  candFirst: string,
  candLast: string
): NameSimilarityResult {
  const inFull = normalizeNameKey(`${inputFirst} ${inputLast}`);
  const caFull = normalizeNameKey(`${candFirst} ${candLast}`);
  if (!inFull || !caFull) {
    return { matched: false, tier: 0, score: 0 };
  }

  const inCompact = inFull.replace(/\s+/g, '');
  const caCompact = caFull.replace(/\s+/g, '');
  const inNoParticles = stripNameParticles(inFull);
  const caNoParticles = stripNameParticles(caFull);

  if (
    inFull === caFull ||
    inCompact === caCompact ||
    inNoParticles === caNoParticles ||
    inNoParticles.replace(/\s+/g, '') === caNoParticles.replace(/\s+/g, '')
  ) {
    return { matched: true, tier: 1, score: 100 };
  }

  const inFirstNorm = stripNameParticles(normalizeNameKey(inputFirst));
  const inLastNorm = stripNameParticles(normalizeNameKey(inputLast));
  const caFirstNorm = stripNameParticles(normalizeNameKey(candFirst));
  const caLastNorm = stripNameParticles(normalizeNameKey(candLast));

  const inFirstTokens = inFirstNorm.split(' ').filter(Boolean);
  const inLastTokens = inLastNorm.split(' ').filter(Boolean);
  const caFirstTokens = caFirstNorm.split(' ').filter(Boolean);
  const caLastTokens = caLastNorm.split(' ').filter(Boolean);

  if (inFirstTokens.length === 0 || caFirstTokens.length === 0) {
    return { matched: false, tier: 0, score: 0 };
  }

  // Tier 2A: Apellidos idénticos (con o sin partículas/espacios) + nombre compuesto vs simple (prefijo de palabra)
  const surnamesExact =
    Boolean(inLastNorm && caLastNorm) &&
    (inLastNorm === caLastNorm ||
      inLastNorm.replace(/\s+/g, '') === caLastNorm.replace(/\s+/g, ''));

  if (surnamesExact && areWordTokenPrefixes(inFirstTokens, caFirstTokens)) {
    return { matched: true, tier: 2, score: 92 };
  }

  // Tier 2B: Ficha FAVB con 1 solo apellido vs usuario con 2 apellidos (o viceversa)
  if (
    inLastTokens.length >= 1 &&
    caLastTokens.length >= 1 &&
    inLastTokens[0] === caLastTokens[0] &&
    (inLastTokens.length === 1 || caLastTokens.length === 1) &&
    inLastTokens.length !== caLastTokens.length &&
    areWordTokenPrefixes(inFirstTokens, caFirstTokens)
  ) {
    return { matched: true, tier: 2, score: 92 };
  }

  // Tier 2C: Si una de las partes tiene nombre+apellidos juntos de manera asimétrica en tokens, comparar tokens globales
  const inAll = [...inFirstTokens, ...inLastTokens];
  const caAll = [...caFirstTokens, ...caLastTokens];

  // Tier 3: Mismo número de tokens (>=2) y exactamente 1 token de longitud >=5 con distancia DL === 1
  if (inAll.length >= 2 && inAll.length === caAll.length) {
    let diffCount = 0;
    let diffIdx = -1;
    for (let i = 0; i < inAll.length; i++) {
      if (inAll[i] !== caAll[i]) {
        diffCount++;
        diffIdx = i;
      }
    }
    if (diffCount === 1 && diffIdx >= 0) {
      const tokA = inAll[diffIdx];
      const tokB = caAll[diffIdx];
      if (Math.max(tokA.length, tokB.length) >= 5 && damerauLevenshtein(tokA, tokB) === 1) {
        const sameInitial = inAll[0][0] === caAll[0][0];
        const surnamesClean = diffIdx < inFirstTokens.length && surnamesExact;
        if (sameInitial || surnamesClean) {
          return { matched: true, tier: 3, score: 85 };
        }
      }
    }
  }

  return { matched: false, tier: 0, score: 0 };
}

export interface AthleteMatchCandidateRecord {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  birthDateVerified: boolean;
  birthDatePlain?: string | null;
  gender: 'MASCULINO' | 'FEMENINO';
  teamIds: string[];
  status: string;
}

export interface RankedAthleteMatch {
  candidate: AthleteMatchCandidateRecord;
  tier: 1 | 2 | 3;
  priority: 'A' | 'B' | 'C';
  score: number;
}

export type AthleteListMatchOutcome =
  | { kind: 'NONE'; reason: 'NO_CANDIDATE' | 'AMBIGUOUS' }
  | { kind: 'MATCH'; best: RankedAthleteMatch };

function resolveCategoryDefaultTeamId(categoryCode: string): string | null {
  const cat = CLUB_CATEGORIES_META.find((c) => c.id === categoryCode);
  if (!cat) return null;
  // Mapear slugs/IDs estándar "cat-*" -> "team-*"
  if (categoryCode === 'cat-senior-fem') return 'team-sf';
  if (categoryCode === 'cat-senior-masc') return 'team-sm';
  if (categoryCode === 'cat-juvenil-masc') return 'team-jm';
  if (categoryCode === 'cat-juvenil-fem-rojo') return 'team-jf-rojo';
  if (categoryCode === 'cat-juvenil-fem-negro') return 'team-jf-negro';
  if (categoryCode === 'cat-cadete-masc') return 'team-cm';
  if (categoryCode === 'cat-cadete-fem-rojo') return 'team-cf-rojo';
  if (categoryCode === 'cat-cadete-fem-negro') return 'team-cf-negro';
  if (categoryCode === 'cat-infantil-masc') return 'team-im';
  if (categoryCode === 'cat-infantil-fem-rojo') return 'team-if-rojo';
  if (categoryCode === 'cat-infantil-fem-negro') return 'team-if-negro';
  if (categoryCode === 'cat-infantil-fem-blanco') return 'team-if-blanco';
  if (categoryCode === 'cat-infantil-fem-gris') return 'team-if-gris';
  if (categoryCode === 'cat-alevin-masc-rojo') return 'team-am-rojo';
  if (categoryCode === 'cat-alevin-masc-negro') return 'team-am-negro';
  if (categoryCode === 'cat-alevin-fem-rojo') return 'team-af-rojo';
  if (categoryCode === 'cat-alevin-fem-negro') return 'team-af-negro';
  if (categoryCode === 'cat-alevin-fem-azul') return 'team-af-azul';
  if (categoryCode === 'cat-alevin-fem-rosa') return 'team-af-rosa';
  if (categoryCode === 'cat-alevin-fem-verde') return 'team-af-verde';
  if (categoryCode === 'cat-alevin-fem-blanco') return 'team-af-blanco';
  if (categoryCode === 'cat-alevin-fem-gris') return 'team-af-gris';
  if (categoryCode === 'cat-benjamin-masc') return 'team-bm';
  if (categoryCode === 'cat-benjamin-fem-rojo') return 'team-bf-rojo';
  if (categoryCode === 'cat-benjamin-fem-negro') return 'team-bf-negro';
  if (categoryCode.endsWith('-afade')) return cat.id.replace(/^cat-/, 'team-');
  return null;
}

/**
 * Empareja los datos introducidos en el Paso 1 contra el conjunto de deportistas existentes en BBDD
 * aplicando prioridades de equipo/categoría y reglas anti-falsos-positivos.
 */
export function matchAthleteCandidatesFromList(
  candidates: AthleteMatchCandidateRecord[],
  input: {
    firstName: string;
    lastName: string;
    birthYear: number;
    birthDateIso: string;
    gender: 'MASCULINO' | 'FEMENINO';
    categoryCode: string;
    defaultTeamSeasonId: string | null;
    seasonStartYear?: number;
  }
): AthleteListMatchOutcome {
  const targetFamily = getCategoryFamilyCode(input.defaultTeamSeasonId || input.categoryCode);
  const directTargetIds = new Set<string>();
  if (input.defaultTeamSeasonId) directTargetIds.add(input.defaultTeamSeasonId);
  if (input.categoryCode) directTargetIds.add(input.categoryCode);
  const catDefaultTeam = resolveCategoryDefaultTeamId(input.categoryCode);
  if (catDefaultTeam) directTargetIds.add(catDefaultTeam);

  const ranked: RankedAthleteMatch[] = [];

  for (const cand of candidates) {
    if (cand.status === 'SHREDDED' || cand.status === 'BAJA') continue;

    const sim = scoreNameSimilarity(input.firstName, input.lastName, cand.firstName, cand.lastName);
    if (!sim.matched || sim.tier === 0) continue;

    const candTeams = cand.teamIds.filter(Boolean);
    const matchesDirectTeam = candTeams.some((tid) => directTargetIds.has(tid));
    const matchesSameFamilyAndGender =
      cand.gender === input.gender &&
      candTeams.some((tid) => getCategoryFamilyCode(tid) === targetFamily);
    const matchesSameGenderClub = cand.gender === input.gender;

    let priority: 'A' | 'B' | 'C' | null = null;
    let priorityBonus = 0;

    if (matchesDirectTeam) {
      priority = 'A';
      priorityBonus = 6;
    } else if (matchesSameFamilyAndGender) {
      priority = 'B';
      priorityBonus = 3;
    } else if (matchesSameGenderClub && sim.tier === 1) {
      // Otra categoría del club: solo coincidencia exacta Tier 1 para jugadoras que suben de categoría
      priority = 'C';
      priorityBonus = 0;
    }

    if (!priority) continue;

    const candFamilyCode = candTeams[0] ? getCategoryFamilyCode(candTeams[0]) : targetFamily;
    const birthOk = isBirthYearCompatible({
      candidateBirthYear: cand.birthYear,
      candidateVerified: cand.birthDateVerified,
      candidateDecryptedBirthDate: cand.birthDatePlain,
      candidateFamilyCode: priority === 'B' ? targetFamily : candFamilyCode,
      inputBirthYear: input.birthYear,
      inputBirthDateIso: input.birthDateIso,
      seasonStartYear: input.seasonStartYear,
    });
    if (!birthOk) continue;

    ranked.push({
      candidate: cand,
      tier: sim.tier,
      priority,
      score: sim.score + priorityBonus,
    });
  }

  if (ranked.length === 0) {
    return { kind: 'NONE', reason: 'NO_CANDIDATE' };
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tier - b.tier;
  });

  const best = ranked[0];
  const samePrioritySecond = ranked.find(
    (item, idx) => idx > 0 && item.candidate.id !== best.candidate.id && item.priority === best.priority
  );

  if (samePrioritySecond) {
    if (best.tier >= 2 && best.score - samePrioritySecond.score < 5) {
      return { kind: 'NONE', reason: 'AMBIGUOUS' };
    }
    if (best.tier === 1 && samePrioritySecond.tier === 1 && samePrioritySecond.score === best.score) {
      return { kind: 'NONE', reason: 'AMBIGUOUS' };
    }
  }

  return { kind: 'MATCH', best };
}
