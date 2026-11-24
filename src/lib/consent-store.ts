import crypto from 'crypto';
import { queryNeon } from './streaming-store';
import {
  FAVB_TEAMS,
  FAVB_PLAYERS,
  resolveCanonicalPlayerId,
  LEGACY_DUPLICATE_PLAYER_ID_MAP,
} from './favb-data';
import { getAfadeTeams } from './afade-data';
import { getClubTeamNameById } from './club-info';
import {
  computeAgeInMadrid,
  formatMadridTime,
  parseBirthDateParts,
  parseMadridDateTimeSafe,
} from './date-utils';
import {
  encryptData,
  decryptDataStrict,
  generateBlindIndex,
  getIntegritySecret,
  generateDek,
  wrapDek,
  unwrapDek,
  encryptWithDek,
  maskDni,
} from './encryption';
import {
  normalizeDniLast5,
  isValidDniLast5Format,
  extractYear,
  isValidSpanishDniOrNie,
  isStrictEmail,
  stripCrlf,
  validateSignatureDataUrl,
} from './validators';
import {
  checkNeonRateLimit,
  consumeTokenOnce,
  isTokenConsumed,
  verifyAdminSessionToken,
} from './rate-limiter';
import {
  isEmailOtpEnabled,
  isDevConsoleOtpBypassAllowed,
  hashNormalizedEmail,
  verifyEmailOtpChallenge,
  verifyRecentCompletedOtpChallenge,
  sendConsentReceiptEmail,
  getClubCopyEmail,
} from './email-otp';

export {
  verifyAdminSessionToken,
  normalizeDniLast5,
  isValidDniLast5Format,
  extractYear,
  isValidSpanishDniOrNie,
};

export type SignatureMethod = 'DIGITAL_WEB' | 'OTP_EMAIL' | 'PRESENCIAL';
export type ConsentHashVersion = 'v1' | 'v2' | 'v3';

export interface RosterOptionItem {
  playerId: string;
  displayName: string;
  teamId: string;
  isDemo?: boolean;
}

export interface PlayerCensusRecord {
  playerId: string;
  playerName: string;
  teamId: string;
  birthYear: number | null;
  birthDate?: string | null;
  dniLast5?: string | null;
}

export interface PlayerConsentRecord {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  isMinor: boolean;
  signerType: 'PARENT' | 'SELF_ADULT';
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerEmail: string;
  signerPhone: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  minorSignedAtIso?: string;
  signatureMethod: SignatureMethod;
  signatureData: string;
  legalVersion: string;
  signedAtIso: string;
  documentHash: string;
  hashVersion: ConsentHashVersion;
  keyId: string;
  integrityVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DirectConsentPrefill {
  signerName?: string;
  signerDni?: string;
  signerRelationship?: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerPhone?: string;
  signerEmail?: string;
}

export interface MaskedDirectPrefill {
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
}

export interface VerificationResult {
  valid: boolean;
  statusCode?: number;
  error?: string;
  player?: {
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    birthYear: number | null;
    birthDateVerified?: boolean;
    birthDateUnlockSupported?: boolean;
    isMinor: boolean;
    isMinor14To17: boolean;
    isBoundaryUnverified: boolean;
  };
  alreadySigned?: boolean;
  hasCensusEmail?: boolean;
  maskedContactEmail?: string;
  challengeSupported?: boolean;
  requiresFactorUnlock?: boolean;
  verificationToken?: string;
  actionToken?: string;
  maskedPrefill?: MaskedDirectPrefill;
  existingConsent?: {
    id: string;
    signedAt: string;
    signedAtIso?: string;
    signerName: string;
    signerDni: string;
    signerRelationship: string;
    minorSignerName?: string;
    consentSocialMedia: boolean;
    consentStreaming: boolean;
    consentPress: boolean;
    consentTravel: boolean;
    signatureMethod?: SignatureMethod;
    documentHash?: string;
  };
}

export interface DirectConsentUnlockFactor {
  dniLast5?: string;
  birthDate?: string;
  otpChallengeId?: string;
  otpCode?: string;
  purpose?: 'SIGN' | 'RECEIPT';
}

export interface VerifiedReceiptDetail {
  consentId?: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDate?: string | null;
  isMinor: boolean;
  isMinor14To17?: boolean;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  signatureMethod?: SignatureMethod;
  signatureData?: string;
  documentHash?: string;
  signedAt?: string;
}

export interface DirectConsentUnlockResult {
  valid: boolean;
  statusCode?: number;
  error?: string;
  alreadySigned?: boolean;
  emailOtpVerified?: boolean;
  verificationToken?: string;
  actionToken?: string;
  prefilledData?: DirectConsentPrefill;
  hasCensusEmail?: boolean;
  maskedContactEmail?: string;
  player?: VerificationResult['player'];
  existingConsent?: VerificationResult['existingConsent'];
  receiptDetail?: VerifiedReceiptDetail;
}

export interface ConsentSubmissionPayload {
  verificationToken: string;
  playerId: string;
  playerName?: string;
  teamId?: string;
  isMinor?: boolean;
  signerType?: 'PARENT' | 'SELF_ADULT';
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerEmail?: string;
  signerPhone?: string;
  consentImage?: boolean;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
  patriaPotestadAccepted?: boolean;
  policySummaryAccepted: boolean;
  minorConsentAccepted?: boolean;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  signatureData: string;
  signatureMethod?: SignatureMethod;
  otpChallengeId?: string;
  otpCode?: string;
  legalVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CensusBatchItemInput {
  playerId: string;
  dni?: string;
  birthDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  parentName?: string;
  parentDni?: string;
  parentRelationship?: string;
}

export interface CensusBatchResult {
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface BatchDirectConsentItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  isMinor: boolean;
  isSigned: boolean;
  isShredded: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone: string;
  signerEmail: string;
  directToken: string;
  directUrl: string;
}

export interface AdminConsentPlayerSummary {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDateVerified: boolean;
  dniLast5: string | null;
  hasCensusEmail: boolean;
  maskedContactEmail?: string;
  isMinor: boolean;
  isMinor14To17: boolean;
  signedIsMinor?: boolean;
  signedIsMinor14To17?: boolean;
  isSigned: boolean;
  isShredded: boolean;
  consentId?: string;
  signedAt?: string;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  maskedSignerPhone?: string;
  maskedSignerEmail?: string;
  minorSignerName?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  signatureMethod?: SignatureMethod;
  documentHash?: string;
  hashVersion?: ConsentHashVersion;
  integrityVerified?: boolean;
  isDemo?: boolean;
}

export interface AdminConsentDetail {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  birthDate?: string | null;
  birthDateVerified: boolean;
  dniLast5: string | null;
  censusDni?: string;
  censusParentName?: string;
  censusParentDni?: string;
  censusParentRelationship?: string;
  censusPhone?: string;
  censusEmail?: string;
  isMinor: boolean;
  isMinor14To17: boolean;
  signedIsMinor?: boolean;
  signedIsMinor14To17?: boolean;
  isSigned: boolean;
  isShredded: boolean;
  consentId?: string;
  signedAt?: string;
  signerName?: string;
  signerDni?: string;
  signerRelationship?: string;
  signerPhone?: string;
  signerEmail?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentTravel?: boolean;
  signatureMethod?: SignatureMethod;
  signatureData?: string;
  documentHash?: string;
  hashVersion?: ConsentHashVersion;
  integrityVerified?: boolean;
  isDemo?: boolean;
}

const ALL_CLUB_TEAMS = [...FAVB_TEAMS, ...getAfadeTeams()];
const LEGACY_DUPLICATE_IDS = Object.keys(LEGACY_DUPLICATE_PLAYER_ID_MAP);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDemoPlayersEnabled(): boolean {
  return process.env.ALLOW_DEMO_PLAYERS === 'true';
}

function isDemoPlayerId(playerId?: string | null): boolean {
  if (!playerId) return true;
  const clean = playerId.trim();
  return !clean || clean.startsWith('demo-') || clean === 'p-test-prueba';
}

export function resolvePlayerIdSafe(rawId?: string | null): string | null {
  if (!rawId || typeof rawId !== 'string') return null;
  const trimmed = rawId.trim();
  const allowDemo = isDemoPlayersEnabled();
  if (!allowDemo && isDemoPlayerId(trimmed)) return null;
  const canonical = resolveCanonicalPlayerId(trimmed);
  if (!allowDemo && isDemoPlayerId(canonical)) return null;
  return canonical;
}

export function getTeamNameById(teamId: string): string {
  const fromMeta = getClubTeamNameById(teamId);
  if (fromMeta && fromMeta !== teamId) return fromMeta;
  const found = ALL_CLUB_TEAMS.find((t) => t.id === teamId);
  return found ? found.name : teamId;
}

export function getSignatureMethodLabel(method?: string | null): string {
  if (method === 'OTP_EMAIL') return 'Firma Electrónica Simple (OTP Email + Trazo)';
  if (method === 'PRESENCIAL') return 'Firma Presencial en Papel';
  return 'Firma Electrónica Simple Web';
}

export function maskSignerName(name?: string | null): string {
  if (!name || !name.trim()) return '***';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length <= 2 ? `${parts[0].charAt(0)}***` : `${parts[0].slice(0, 2)}***`;
  }
  return [
    parts[0],
    ...parts.slice(1).map((p) => (p.length <= 1 ? '*' : `${p.charAt(0)}***`)),
  ].join(' ');
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.trim().split('@');
  if (!local || !domain) return '***';
  const visible = local.length <= 2 ? local.charAt(0) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 3) return '***';
  return `***${digits.slice(-3)}`;
}

function getTokenSigningSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || '';
  const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
  if (!secret || (isProd && secret.length < 32)) {
    throw new Error('[Security] ADMIN_SESSION_SECRET no está configurada o no alcanza la entropía mínima.');
  }
  return secret;
}

function decryptField(cipherText: string | null | undefined, playerId: string, column: string): {
  present: boolean;
  ok: boolean;
  value: string;
} {
  if (!cipherText || !cipherText.trim()) {
    return { present: false, ok: true, value: '' };
  }
  const res = decryptDataStrict(cipherText, `${playerId}:${column}`);
  return { present: true, ok: res.ok, value: res.value };
}

/**
 * Resuelve de forma segura y fail-closed la fecha de nacimiento exacta desde el censo,
 * comprobando primero el AAD vigente (`:birth_date_encrypted`) y manteniendo compatibilidad legacy.
 */
export function resolveCensusBirthDate(
  row: {
    player_id: string;
    birth_date?: string | null;
    birth_date_encrypted?: string | null;
  },
  canonicalId?: string
): string | null {
  if (row.birth_date_encrypted && row.birth_date_encrypted.trim()) {
    const primaryId = (canonicalId || row.player_id).trim();
    const withEncryptedAad = decryptDataStrict(
      row.birth_date_encrypted,
      `${primaryId}:birth_date_encrypted`
    );
    if (withEncryptedAad.ok && withEncryptedAad.value) return withEncryptedAad.value;
    if (row.player_id && row.player_id !== primaryId) {
      const altEncryptedAad = decryptDataStrict(
        row.birth_date_encrypted,
        `${row.player_id}:birth_date_encrypted`
      );
      if (altEncryptedAad.ok && altEncryptedAad.value) return altEncryptedAad.value;
    }
    const withLegacyAad = decryptDataStrict(row.birth_date_encrypted, `${primaryId}:birth_date`);
    if (withLegacyAad.ok && withLegacyAad.value) return withLegacyAad.value;
    const legacy = decryptDataStrict(row.birth_date_encrypted);
    if (legacy.ok && legacy.value) return legacy.value;
  }
  if (row.birth_date && row.birth_date.trim()) {
    return row.birth_date.trim();
  }
  return null;
}

function evaluateCensusAge(row: {
  player_id: string;
  birth_year: number | null;
  birth_date: string | null;
  birth_date_encrypted?: string | null;
}): {
  age: number | null;
  isMinor: boolean;
  isMinor14To17: boolean;
  isBoundaryUnverified: boolean;
  resolvedBirthDate: string | null;
} {
  const candidateBd = resolveCensusBirthDate(row);
  const ageEval = computeAgeInMadrid(candidateBd, row.birth_year);
  return {
    ...ageEval,
    resolvedBirthDate: candidateBd,
  };
}

/**
 * Resuelve si el deportista tenía 14–17 años en el momento de la firma.
 * - En registros nuevos (`is_minor_14_to_17` != null), usa la columna persistida (compatible con firma única).
 * - En registros históricos `v1`/`v2` previos sin columna persistida, usa la 2ª firma si existía o recalcula la edad a fecha de firma.
 */
function resolveHistoricalMinor14To17(params: {
  snapshotIsMinor: boolean;
  storedFlag?: boolean | null;
  hasLegacyMinorSignature: boolean;
  resolvedBirthDate: string | null;
  birthYear: number | null;
  signedAtIso?: string | null;
  createdAt?: string | null;
  fallbackCurrentMinor14To17: boolean;
}): boolean {
  if (!params.snapshotIsMinor) return false;
  if (params.storedFlag !== null && params.storedFlag !== undefined) {
    return Boolean(params.storedFlag);
  }
  if (params.hasLegacyMinorSignature) return true;
  const refRaw = params.signedAtIso || params.createdAt;
  if (refRaw) {
    const parsedRef = parseMadridDateTimeSafe(refRaw);
    if (!Number.isNaN(parsedRef.getTime()) && parsedRef.getTime() > 0) {
      return computeAgeInMadrid(params.resolvedBirthDate, params.birthYear, parsedRef).isMinor14To17;
    }
  }
  return params.fallbackCurrentMinor14To17;
}

/**
 * Calcula un HMAC-SHA256 determinista y verificable sobre el snapshot inmutable del consentimiento.
 * - `v3` (actual): usa `CONSENT_INTEGRITY_SECRET` e incluye `isMinor14To17` real + vínculo OTP (`otpChallengeId`, `otpVerifiedAtIso`).
 * - `v2` (histórico): compatibilidad con firmas v2 previas.
 * - `v1` (solo lectura de registros históricos legados): mantiene compatibilidad de verificación.
 */
export function computeVerifiableConsentHash(input: {
  version?: ConsentHashVersion;
  keyId?: string;
  playerId: string;
  playerName: string;
  teamId: string;
  isMinor: boolean;
  isMinor14To17?: boolean;
  otpChallengeId?: string;
  otpVerifiedAtIso?: string;
  signerType: string;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentImage?: boolean;
  consentTravel: boolean;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  signatureMethod: string;
  legalVersion: string;
  signedAtIso: string;
  signatureData: string;
}): string {
  const version: ConsentHashVersion = input.version || 'v3';
  const sigDigest = crypto.createHash('sha256').update(input.signatureData || '').digest('hex');

  if (version === 'v1') {
    const legacySecret =
      input.keyId === 'legacy'
        ? process.env.ADMIN_SESSION_SECRET?.trim() || ''
        : getIntegritySecret();
    if (!legacySecret) {
      throw new Error('[Security] Secreto de verificación v1 no disponible.');
    }
    const consentImage =
      input.consentImage !== undefined
        ? Boolean(input.consentImage)
        : Boolean(input.consentSocialMedia || input.consentStreaming || input.consentPress);
    const canonicalV1 = [
      input.playerId,
      input.playerName.trim(),
      input.teamId,
      input.isMinor ? '1' : '0',
      input.signerType,
      input.signerName.trim(),
      input.signerDni.trim().toUpperCase(),
      input.signerRelationship,
      consentImage ? '1' : '0',
      input.consentTravel ? '1' : '0',
      input.signatureMethod,
      input.legalVersion,
      input.signedAtIso,
      sigDigest,
    ].join('|');

    return crypto.createHmac('sha256', legacySecret).update(canonicalV1).digest('hex');
  }

  const secret = getIntegritySecret();
  const minorSigDigest = input.minorSignatureData
    ? crypto.createHash('sha256').update(input.minorSignatureData).digest('hex')
    : '';
  const effectiveMinor14To17 = Boolean(
    input.isMinor14To17 ?? (input.isMinor && Boolean(input.minorSignerName || input.minorSignatureData))
  );

  if (version === 'v3') {
    const canonicalV3 = [
      'v3',
      input.playerId,
      input.playerName.trim(),
      input.teamId,
      input.isMinor ? '1' : '0',
      Boolean(input.isMinor14To17) ? '1' : '0',
      input.signerType,
      input.signerName.trim(),
      input.signerDni.trim().toUpperCase(),
      input.signerRelationship,
      input.consentSocialMedia ? '1' : '0',
      input.consentStreaming ? '1' : '0',
      input.consentPress ? '1' : '0',
      input.consentTravel ? '1' : '0',
      (input.minorSignerName || '').trim(),
      (input.minorSignerDni || '').trim().toUpperCase(),
      minorSigDigest,
      input.signatureMethod,
      input.legalVersion,
      input.signedAtIso,
      (input.otpChallengeId || '').trim(),
      (input.otpVerifiedAtIso || '').trim(),
      sigDigest,
    ].join('|');
    return crypto.createHmac('sha256', secret).update(canonicalV3).digest('hex');
  }

  const canonicalV2 = [
    'v2',
    input.playerId,
    input.playerName.trim(),
    input.teamId,
    input.isMinor ? '1' : '0',
    effectiveMinor14To17 ? '1' : '0',
    input.signerType,
    input.signerName.trim(),
    input.signerDni.trim().toUpperCase(),
    input.signerRelationship,
    input.consentSocialMedia ? '1' : '0',
    input.consentStreaming ? '1' : '0',
    input.consentPress ? '1' : '0',
    input.consentTravel ? '1' : '0',
    (input.minorSignerName || '').trim(),
    (input.minorSignerDni || '').trim().toUpperCase(),
    minorSigDigest,
    input.signatureMethod,
    input.legalVersion,
    input.signedAtIso,
    sigDigest,
  ].join('|');

  return crypto.createHmac('sha256', secret).update(canonicalV2).digest('hex');
}

/**
 * Verifica matemáticamente en tiempo constante que el registro almacenado no ha sido alterado.
 */
export function verifyConsentIntegrity(input: {
  version?: ConsentHashVersion;
  keyId?: string;
  playerId: string;
  playerName: string;
  teamId: string;
  isMinor: boolean;
  isMinor14To17?: boolean;
  otpChallengeId?: string;
  otpVerifiedAtIso?: string;
  signerType: string;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentImage?: boolean;
  consentTravel: boolean;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  signatureMethod: string;
  legalVersion: string;
  signedAtIso: string;
  signatureData: string;
  expectedHash: string;
}): boolean {
  if (!input.expectedHash || !input.signedAtIso) return false;
  try {
    const computed = computeVerifiableConsentHash(input);
    const bufA = Buffer.from(computed, 'utf8');
    const bufB = Buffer.from(input.expectedHash, 'utf8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Devuelve la lista pública mínima de deportistas por equipo desde Neon (sin birthYear, sin dni_last5, sin demos).
 */
export async function getRosterOptionsByTeam(teamId: string): Promise<RosterOptionItem[]> {
  const cleanTeamId = teamId.trim();
  if (!cleanTeamId || !ALL_CLUB_TEAMS.some((t) => t.id === cleanTeamId)) {
    return [];
  }

  const secondaryMappedIds = FAVB_PLAYERS.filter(
    (p) => Array.isArray(p.secondaryTeamIds) && p.secondaryTeamIds.includes(cleanTeamId)
  ).map((p) => p.id);

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    is_demo: boolean;
  }>(
    `SELECT player_id, player_name, team_id, COALESCE(is_demo, false) AS is_demo
     FROM player_census
     WHERE (
       team_id = $1
       OR $1 = ANY(COALESCE(secondary_team_ids, ARRAY[]::varchar[]))
       OR player_id = ANY($3::varchar[])
     )
       AND ($4::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
       AND canonical_player_id IS NULL
       AND NOT (player_id = ANY($2::varchar[]))
     ORDER BY COALESCE(is_demo, false) ASC, player_name ASC;`,
    [cleanTeamId, LEGACY_DUPLICATE_IDS, secondaryMappedIds, allowDemo]
  );

  return rows.map((r) => ({
    playerId: r.player_id,
    displayName: r.player_name,
    teamId: r.team_id,
    isDemo: r.is_demo === true || isDemoPlayerId(r.player_id),
  }));
}

/**
 * Emite un token temporal (20 min, alineado con el reto OTP) con `jti` único de un solo uso para el flujo Paso 1 -> Paso 2.
 */
export function createConsentVerificationToken(
  playerId: string,
  options?: {
    directTokenJti?: string;
    directTokenExpIso?: string;
    preVerifiedOtpChallengeId?: string;
    preVerifiedEmailHash?: string;
  }
): string {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    throw new Error('Identificador de deportista no válido.');
  }
  const secret = getTokenSigningSecret();
  const payload = {
    playerId: canonicalId,
    jti: crypto.randomUUID(),
    purpose: 'consent-verification',
    directTokenJti: options?.directTokenJti,
    directTokenExpIso: options?.directTokenExpIso,
    preVerifiedOtpChallengeId: options?.preVerifiedOtpChallengeId,
    preVerifiedEmailHash: options?.preVerifiedEmailHash,
    exp: Date.now() + 20 * 60 * 1000,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`consent-verification-v2:${b64Payload}`)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifica HMAC antes de parsear JSON, caducidad y no consumo previo en Neon (`consumed_tokens`).
 */
export async function verifyAndExtractConsentToken(
  token: string | null | undefined,
  playerId: string
): Promise<{
  valid: boolean;
  jti?: string;
  expIso?: string;
  directTokenJti?: string;
  directTokenExpIso?: string;
  preVerifiedOtpChallengeId?: string;
  preVerifiedEmailHash?: string;
}> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!token || !canonicalId || typeof token !== 'string') {
    return { valid: false };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  try {
    const secret = getTokenSigningSecret();
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`consent-verification-v2:${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.playerId !== canonicalId ||
      payload.purpose !== 'consent-verification' ||
      typeof payload.jti !== 'string' ||
      !payload.jti ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return { valid: false };
    }

    const consumed = await isTokenConsumed(payload.jti);
    if (consumed) return { valid: false };

    if (typeof payload.directTokenJti === 'string' && payload.directTokenJti) {
      const directConsumed = await isTokenConsumed(payload.directTokenJti);
      if (directConsumed) return { valid: false };
    }

    return {
      valid: true,
      jti: payload.jti,
      expIso: new Date(payload.exp).toISOString(),
      directTokenJti: typeof payload.directTokenJti === 'string' ? payload.directTokenJti : undefined,
      directTokenExpIso:
        typeof payload.directTokenExpIso === 'string' ? payload.directTokenExpIso : undefined,
      preVerifiedOtpChallengeId:
        typeof payload.preVerifiedOtpChallengeId === 'string'
          ? payload.preVerifiedOtpChallengeId
          : undefined,
      preVerifiedEmailHash:
        typeof payload.preVerifiedEmailHash === 'string' ? payload.preVerifiedEmailHash : undefined,
    };
  } catch {
    return { valid: false };
  }
}

export async function verifyConsentVerificationToken(
  token: string | null | undefined,
  playerId: string
): Promise<boolean> {
  const res = await verifyAndExtractConsentToken(token, playerId);
  return res.valid;
}

/**
 * Emite un token temporal (15 min) con `purpose: 'consent-action'` para autorizar OTP/acciones
 * de lectura de resguardo o revocación (Art. 7.3 RGPD) cuando ya existe consentimiento ACTIVE.
 */
export function createConsentActionToken(playerId: string): string {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    throw new Error('Identificador de deportista no válido.');
  }
  const secret = getTokenSigningSecret();
  const payload = {
    playerId: canonicalId,
    jti: crypto.randomUUID(),
    purpose: 'consent-action',
    exp: Date.now() + 15 * 60 * 1000,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`consent-action-v1:${b64Payload}`)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifica primero HMAC en tiempo constante antes de parsear JSON, caducidad y no consumo previo en Neon (`consumed_tokens`).
 */
export async function verifyConsentActionToken(
  token: string | null | undefined,
  playerId: string
): Promise<{
  valid: boolean;
  jti?: string;
  expIso?: string;
}> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!token || !canonicalId || typeof token !== 'string') {
    return { valid: false };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  try {
    const secret = getTokenSigningSecret();
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`consent-action-v1:${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.playerId !== canonicalId ||
      payload.purpose !== 'consent-action' ||
      typeof payload.jti !== 'string' ||
      !payload.jti ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return { valid: false };
    }

    const consumed = await isTokenConsumed(payload.jti);
    if (consumed) return { valid: false };

    return {
      valid: true,
      jti: payload.jti,
      expIso: new Date(payload.exp).toISOString(),
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Guard común para rutas /api/admin/*: valida rate-limit en Neon y sesión HMAC revocable en servidor.
 */
export async function authenticateAdminSession(params: {
  token?: string;
  ipAddress: string;
  scope: string;
  maxAttempts?: number;
}): Promise<
  | { ok: true }
  | { ok: false; status: 401 | 429; error: string; retryAfterSec?: number }
> {
  const rate = await checkNeonRateLimit(
    `admin:${params.scope}:${params.ipAddress}`,
    params.maxAttempts ?? 120,
    60,
    60
  );
  if (!rate.allowed) {
    return {
      ok: false,
      status: 429,
      error: `Demasiadas peticiones administrativas. Inténtalo en ${rate.retryAfterSec} s.`,
      retryAfterSec: rate.retryAfterSec,
    };
  }

  const isValid = await verifyAdminSessionToken(params.token);
  if (!isValid) {
    return {
      ok: false,
      status: 401,
      error: 'No autorizado. Inicia sesión en el panel de administración.',
    };
  }

  return { ok: true };
}

/**
 * Obtiene de forma autoritativa nombre y correo censado en Neon para envío de OTP.
 */
export async function getAuthoritativeOtpTarget(playerId: string): Promise<{
  found: boolean;
  playerId?: string;
  playerName?: string;
  contactEmail?: string;
  maskedEmail?: string;
}> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) return { found: false };

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    contact_email: string | null;
    is_demo: boolean;
  }>(
    `SELECT player_id, player_name, contact_email, COALESCE(is_demo, false) AS is_demo
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const row = rows[0];
  if (!row || (!allowDemo && row.is_demo)) return { found: false };

  const emailDec = decryptField(row.contact_email, canonicalId, 'contact_email');
  const cleanEmail = emailDec.ok && isStrictEmail(emailDec.value) ? emailDec.value.trim().toLowerCase() : '';

  return {
    found: true,
    playerId: row.player_id,
    playerName: row.player_name,
    contactEmail: cleanEmail || undefined,
    maskedEmail: cleanEmail ? maskEmail(cleanEmail) : undefined,
  };
}

/**
 * Verifica la identidad del deportista en el Paso 1 directamente contra Neon (fail-closed, sin fallback local).
 */
export async function verifyPlayerIdentity(
  playerId: string,
  birthYearOrDate: string | number,
  dniLast5Input: string
): Promise<VerificationResult> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { valid: false, error: 'Deportista no encontrado en el censo oficial del club.' };
  }

  const rawBirth = String(birthYearOrDate ?? '').trim();
  const inputParsedDate = parseBirthDateParts(rawBirth);
  const inputYear = inputParsedDate?.year ?? extractYear(rawBirth);
  const normDni = normalizeDniLast5(dniLast5Input);

  if (!inputYear) {
    return {
      valid: false,
      error: 'Por favor, introduce una fecha o año de nacimiento válido (ej. 15/04/2008).',
    };
  }

  if (!isValidDniLast5Format(normDni)) {
    return {
      valid: false,
      error: 'Los últimos 4 dígitos y letra del DNI/NIE deben tener el formato válido (ej. 1234A).',
    };
  }

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    birth_date_verified: boolean;
    dni_last5: string | null;
    contact_email: string | null;
    canonical_player_id: string | null;
    is_demo: boolean;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, birth_date_encrypted,
            COALESCE(birth_date_verified, false) AS birth_date_verified,
            dni_last5, contact_email, canonical_player_id, COALESCE(is_demo, false) AS is_demo
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const censusRecord = rows[0];
  if (!censusRecord || (!allowDemo && censusRecord.is_demo)) {
    return {
      valid: false,
      error: 'Deportista no encontrado en el censo oficial del club.',
    };
  }

  const effectivePlayerId = censusRecord.canonical_player_id || censusRecord.player_id;
  const ageEval = evaluateCensusAge({
    player_id: effectivePlayerId,
    birth_year: censusRecord.birth_year,
    birth_date: censusRecord.birth_date,
    birth_date_encrypted: censusRecord.birth_date_encrypted,
  });

  const dbBirthParts = parseBirthDateParts(ageEval.resolvedBirthDate);
  if (dbBirthParts) {
    if (censusRecord.birth_date_verified) {
      if (
        !inputParsedDate ||
        inputParsedDate.year !== dbBirthParts.year ||
        inputParsedDate.month !== dbBirthParts.month ||
        inputParsedDate.day !== dbBirthParts.day
      ) {
        return {
          valid: false,
          error: 'La fecha de nacimiento completa (DD/MM/AAAA) no coincide con la ficha federativa registrada.',
        };
      }
    } else if (inputParsedDate) {
      if (
        inputParsedDate.year !== dbBirthParts.year ||
        inputParsedDate.month !== dbBirthParts.month ||
        inputParsedDate.day !== dbBirthParts.day
      ) {
        return {
          valid: false,
          error: 'La fecha de nacimiento no coincide con la ficha federativa registrada.',
        };
      }
    } else if (dbBirthParts.year !== inputYear) {
      return {
        valid: false,
        error: 'El año de nacimiento no coincide con la ficha federativa registrada.',
      };
    }
  } else if (censusRecord.birth_year) {
    if (censusRecord.birth_year !== inputYear) {
      return {
        valid: false,
        error: 'El año o fecha de nacimiento no coincide con la ficha federativa registrada.',
      };
    }
  } else {
    return {
      valid: false,
      error:
        'La ficha federativa aún no tiene el año o fecha de nacimiento verificada. Contacta con secretaría (info@voleibolsanpedro.es) o utiliza el impreso presencial.',
    };
  }

  // Exigir siempre dni_last5 real en Neon (prohibido bypass por dni_last5 nulo)
  if (!censusRecord.dni_last5 || !isValidDniLast5Format(censusRecord.dni_last5)) {
    return {
      valid: false,
      error:
        'La ficha federativa aún no tiene el DNI/NIE verificado en el censo. Contacta con secretaría (info@voleibolsanpedro.es) o utiliza el impreso presencial.',
    };
  }

  if (normalizeDniLast5(censusRecord.dni_last5) !== normDni) {
    return {
      valid: false,
      error: 'Los últimos 4 dígitos y letra del DNI/NIE no coinciden con la ficha federativa registrada.',
    };
  }

  const emailDec = decryptField(censusRecord.contact_email, effectivePlayerId, 'contact_email');
  const validEmail = emailDec.ok && isStrictEmail(emailDec.value) ? emailDec.value.trim().toLowerCase() : '';
  const hasCensusEmail = Boolean(validEmail);
  const maskedContactEmail = validEmail ? maskEmail(validEmail) : undefined;

  const consentRows = await queryNeon<{
    id: string;
    signer_name: string;
    signer_dni: string;
    signer_relationship: string;
    minor_signer_name: string | null;
    consent_social_media: boolean;
    consent_streaming: boolean;
    consent_press: boolean;
    consent_travel: boolean | null;
    signature_method: string | null;
    signed_at_iso: string | null;
    document_hash: string | null;
    created_at: string;
  }>(
    `SELECT id, signer_name, signer_dni, signer_relationship, minor_signer_name,
            consent_social_media, consent_streaming, consent_press,
            consent_travel, signature_method, signed_at_iso, document_hash, created_at
     FROM player_consents
     WHERE player_id = $1 AND status = 'ACTIVE'
     LIMIT 1;`,
    [effectivePlayerId]
  );

  const playerSummary = {
    id: effectivePlayerId,
    name: censusRecord.player_name,
    teamId: censusRecord.team_id,
    teamName: getTeamNameById(censusRecord.team_id),
    birthYear: censusRecord.birth_year ?? dbBirthParts?.year ?? null,
    isMinor: ageEval.isMinor,
    isMinor14To17: ageEval.isMinor14To17,
    isBoundaryUnverified: ageEval.isBoundaryUnverified,
  };

  const existing = consentRows[0];
  if (existing) {
    const plainDni = decryptField(existing.signer_dni, effectivePlayerId, 'signer_dni');
    // NO se emite verificationToken de escritura cuando ya existe una autorización ACTIVE;
    // se emite actionToken (purpose: 'consent-action') para solicitar OTP de resguardo o revocación.
    return {
      valid: true,
      alreadySigned: true,
      actionToken: createConsentActionToken(effectivePlayerId),
      hasCensusEmail,
      maskedContactEmail,
      challengeSupported: true,
      player: playerSummary,
      existingConsent: {
        id: existing.id,
        signedAt: existing.signed_at_iso || existing.created_at,
        signedAtIso: existing.signed_at_iso || existing.created_at,
        signerName: maskSignerName(existing.signer_name),
        signerDni: plainDni.ok ? maskDni(plainDni.value) : '***',
        signerRelationship: existing.signer_relationship,
        minorSignerName: existing.minor_signer_name ? maskSignerName(existing.minor_signer_name) : undefined,
        consentSocialMedia: existing.consent_social_media === true,
        consentStreaming: existing.consent_streaming === true,
        consentPress: existing.consent_press === true,
        consentTravel: existing.consent_travel === true,
        signatureMethod: (existing.signature_method as SignatureMethod) || 'OTP_EMAIL',
        documentHash: existing.document_hash || undefined,
      },
    };
  }

  return {
    valid: true,
    alreadySigned: false,
    hasCensusEmail,
    maskedContactEmail,
    verificationToken: createConsentVerificationToken(effectivePlayerId),
    player: playerSummary,
  };
}

/**
 * Registra y guarda un consentimiento firmado en Neon mediante UNA sola CTE SQL atómica:
 * - Consume `verificationToken` (y `directToken` si procede) en `consumed_tokens`.
 * - Rechaza sobrescribir registros `'ACTIVE'` (409).
 * - Cifra `player_consents` con HKDF + AAD y `player_consents_audit` con DEK por sujeto (*crypto-shredding*).
 */
export async function submitPlayerConsent(
  payload: ConsentSubmissionPayload
): Promise<{
  success: boolean;
  statusCode?: number;
  consentId?: string;
  documentHash?: string;
  signedAtIso?: string;
  signatureMethod?: SignatureMethod;
  signerEmail?: string;
  birthDate?: string | null;
  receiptEmailSent?: boolean;
  receiptEmailError?: string;
  error?: string;
}> {
  const canonicalId = resolvePlayerIdSafe(payload.playerId);
  if (!canonicalId) {
    return { success: false, statusCode: 404, error: 'Deportista no encontrado en el censo oficial del club.' };
  }

  const tokenCheck = await verifyAndExtractConsentToken(payload.verificationToken, canonicalId);
  if (!tokenCheck.valid || !tokenCheck.jti || !tokenCheck.expIso) {
    return {
      success: false,
      statusCode: 403,
      error: 'Sesión de verificación no válida, expirada o ya utilizada. Vuelve al Paso 1 y valida de nuevo.',
    };
  }

  if (!payload.signerName?.trim() || !payload.signerDni?.trim() || !payload.signatureData) {
    return { success: false, statusCode: 400, error: 'Faltan campos obligatorios para registrar la autorización.' };
  }

  if (!payload.policySummaryAccepted) {
    return {
      success: false,
      statusCode: 400,
      error: 'Debes confirmar la lectura de la información básica de protección de datos (Art. 13 RGPD).',
    };
  }

  const sigValidation = validateSignatureDataUrl(payload.signatureData);
  if (!sigValidation.valid) {
    return { success: false, statusCode: 400, error: sigValidation.error || 'Firma gráfica no válida.' };
  }

  // Determinación autoritativa en servidor desde player_census (fail-closed)
  const allowDemo = isDemoPlayersEnabled();
  const censusRows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    contact_email: string | null;
    canonical_player_id: string | null;
    is_demo: boolean;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, birth_date_encrypted,
            contact_email, canonical_player_id, COALESCE(is_demo, false) AS is_demo
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const censusRecord = censusRows[0];
  if (!censusRecord || (!allowDemo && censusRecord.is_demo)) {
    return { success: false, statusCode: 404, error: 'Deportista no encontrado en el censo oficial del club.' };
  }

  const effectivePlayerId = censusRecord.canonical_player_id || censusRecord.player_id;
  const ageEval = evaluateCensusAge({
    player_id: effectivePlayerId,
    birth_year: censusRecord.birth_year,
    birth_date: censusRecord.birth_date,
    birth_date_encrypted: censusRecord.birth_date_encrypted,
  });

  const authoritativeIsMinor = ageEval.isMinor;
  const authoritativeIsMinor14To17 = ageEval.isMinor14To17;
  const authoritativePlayerName = censusRecord.player_name.trim();
  const authoritativeTeamId = censusRecord.team_id;
  const authoritativeSignerType: 'PARENT' | 'SELF_ADULT' = authoritativeIsMinor ? 'PARENT' : 'SELF_ADULT';
  const authoritativeRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR' = authoritativeIsMinor
    ? payload.signerRelationship
    : 'PROPIO_JUGADOR';

  const cleanDni = payload.signerDni.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!isValidSpanishDniOrNie(cleanDni)) {
    return {
      success: false,
      statusCode: 400,
      error: 'El documento de identidad (DNI, NIE o Pasaporte) del firmante no es válido.',
    };
  }

  if (authoritativeIsMinor) {
    if (!payload.patriaPotestadAccepted) {
      return {
        success: false,
        statusCode: 400,
        error: 'Para menores de edad es obligatorio aceptar la Declaración Responsable de patria potestad o tutela legal.',
      };
    }
    if (!['PADRE', 'MADRE', 'TUTOR_LEGAL'].includes(authoritativeRelationship)) {
      return {
        success: false,
        statusCode: 400,
        error: 'La relación indicada para el representante legal del menor no es válida.',
      };
    }
  }

  let cleanMinorName = '';
  let cleanMinorDni = '';
  let cleanMinorSignature = '';
  if (authoritativeIsMinor14To17 && (payload.minorSignatureData || payload.minorSignerDni || payload.minorConsentAccepted)) {
    if (payload.minorSignerDni && payload.minorSignerDni.trim()) {
      cleanMinorDni = payload.minorSignerDni.trim().toUpperCase().replace(/[\s-]/g, '');
      if (!isValidSpanishDniOrNie(cleanMinorDni)) {
        return {
          success: false,
          statusCode: 400,
          error: 'El DNI/NIE del/de la menor no es válido. Déjalo vacío si aún no dispone de documento propio.',
        };
      }
    }
    if (payload.minorSignatureData && payload.minorSignatureData.trim()) {
      const minorSigValidation = validateSignatureDataUrl(payload.minorSignatureData);
      if (!minorSigValidation.valid) {
        return {
          success: false,
          statusCode: 400,
          error: minorSigValidation.error || 'Firma gráfica del/de la menor no válida.',
        };
      }
      cleanMinorSignature = payload.minorSignatureData.trim();
      cleanMinorName = (payload.minorSignerName || authoritativePlayerName).trim();
      if (cleanMinorName.length > 150) {
        return { success: false, statusCode: 400, error: 'Nombre del/de la menor firmante no válido.' };
      }
    }
  }

  // L-A4: En mayores de edad (+18), el firmante autorizado en web es siempre el propio deportista titular del censo
  const cleanSignerName = authoritativeIsMinor ? payload.signerName.trim() : authoritativePlayerName;
  const cleanSignerPhone = (payload.signerPhone || '').trim();
  const decEmail = decryptField(censusRecord.contact_email, effectivePlayerId, 'contact_email');
  const censusEmail = decEmail.ok && isStrictEmail(decEmail.value) ? decEmail.value.trim().toLowerCase() : '';
  const requestedEmail = (payload.signerEmail || '').trim().toLowerCase();

  if (cleanSignerName.length > 150 || cleanDni.length > 20 || requestedEmail.length > 150 || cleanSignerPhone.length > 30) {
    return { success: false, statusCode: 400, error: 'Uno o más campos exceden la longitud máxima permitida.' };
  }

  let effectiveSignatureMethod: SignatureMethod =
    payload.signatureMethod === 'PRESENCIAL' ? 'PRESENCIAL' : 'OTP_EMAIL';

  let verifiedOtpChallengeId = '';
  let verifiedOtpAtIso = '';

  let authoritativeEmail = requestedEmail;
  if (effectiveSignatureMethod !== 'PRESENCIAL') {
    if (!censusEmail) {
      return {
        success: false,
        statusCode: 400,
        error:
          'No consta correo electrónico en el censo para verificar por OTP. Solicita el alta en secretaría (info@voleibolsanpedro.es) o utiliza el impreso presencial.',
      };
    }

    if (!isEmailOtpEnabled() && !isDevConsoleOtpBypassAllowed()) {
      return {
        success: false,
        statusCode: 503,
        error: 'El servicio de verificación OTP por correo (SMTP) no está disponible temporalmente.',
      };
    }

    if (payload.otpChallengeId && payload.otpCode) {
      const otpCheck = await verifyEmailOtpChallenge({
        challengeId: payload.otpChallengeId,
        playerId: effectivePlayerId,
        email: censusEmail,
        code: payload.otpCode,
        purpose: 'SIGN',
      });
      if (!otpCheck.valid) {
        return {
          success: false,
          statusCode: 400,
          error: otpCheck.error || 'El código OTP de verificación no es válido.',
        };
      }
      verifiedOtpChallengeId = payload.otpChallengeId.trim();
      verifiedOtpAtIso = otpCheck.verifiedAtIso || new Date().toISOString();
    } else if (
      tokenCheck.preVerifiedOtpChallengeId &&
      tokenCheck.preVerifiedEmailHash &&
      tokenCheck.preVerifiedEmailHash === hashNormalizedEmail(censusEmail)
    ) {
      const preRes = await verifyRecentCompletedOtpChallenge({
        challengeId: tokenCheck.preVerifiedOtpChallengeId,
        playerId: effectivePlayerId,
        email: censusEmail,
        purpose: 'SIGN',
      });
      if (!preRes.valid) {
        return {
          success: false,
          statusCode: 400,
          error: 'Tu verificación OTP ha caducado (máx. 15 min). Solicita un nuevo código OTP para confirmar tu firma.',
        };
      }
      verifiedOtpChallengeId = tokenCheck.preVerifiedOtpChallengeId;
      verifiedOtpAtIso = preRes.verifiedAtIso || new Date().toISOString();
    } else {
      return {
        success: false,
        statusCode: 400,
        error: 'Es obligatorio validar el código OTP de 6 dígitos enviado al correo censado.',
      };
    }

    authoritativeEmail = censusEmail;
    effectiveSignatureMethod = 'OTP_EMAIL';
  } else if (authoritativeEmail && !isStrictEmail(authoritativeEmail)) {
    authoritativeEmail = censusEmail;
  }

  // Comprobar si existe consentimiento ACTIVE o ficha SHREDDED (Art. 17) antes de preparar DEK/escritura
  const activeCheckRows = await queryNeon<{ status: string | null; shredded_at: string | null }>(
    `SELECT p.status, k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = $1
     LIMIT 1;`,
    [effectivePlayerId]
  );
  if (activeCheckRows[0]?.status === 'SHREDDED' || Boolean(activeCheckRows[0]?.shredded_at)) {
    return {
      success: false,
      statusCode: 409,
      error:
        'Esta ficha consta suprimida (RGPD Art. 17). No admite nuevas firmas sin rehabilitación administrativa expresa en secretaría (info@voleibolsanpedro.es).',
    };
  }
  if (activeCheckRows[0]?.status === 'ACTIVE') {
    return {
      success: false,
      statusCode: 409,
      error:
        'Ya existe una autorización vigente (ACTIVE) para este deportista. Debes revocarla previamente mediante OTP antes de registrar una nueva.',
    };
  }

  const signedAtIso = new Date().toISOString();
  const legalVersion = payload.legalVersion || 'v5_2026_junta_anexo05_06';
  const hasExplicitUnifiedImage = payload.consentImage !== undefined;
  const cSocial = hasExplicitUnifiedImage
    ? Boolean(payload.consentImage)
    : payload.consentSocialMedia === true;
  const cStreaming = hasExplicitUnifiedImage
    ? Boolean(payload.consentImage)
    : payload.consentStreaming === true;
  const cPress = hasExplicitUnifiedImage
    ? Boolean(payload.consentImage)
    : payload.consentPress === true;
  const cTravel = payload.consentTravel === true;
  const cImageAny = cSocial || cStreaming || cPress;

  const documentHash = computeVerifiableConsentHash({
    version: 'v3',
    keyId: 'integrity-v3',
    playerId: effectivePlayerId,
    playerName: authoritativePlayerName,
    teamId: authoritativeTeamId,
    isMinor: authoritativeIsMinor,
    isMinor14To17: authoritativeIsMinor14To17,
    otpChallengeId: verifiedOtpChallengeId || undefined,
    otpVerifiedAtIso: verifiedOtpAtIso || undefined,
    signerType: authoritativeSignerType,
    signerName: cleanSignerName,
    signerDni: cleanDni,
    signerRelationship: authoritativeRelationship,
    consentSocialMedia: cSocial,
    consentStreaming: cStreaming,
    consentPress: cPress,
    consentTravel: cTravel,
    minorSignerName: cleanMinorName,
    minorSignerDni: cleanMinorDni,
    minorSignatureData: cleanMinorSignature,
    signatureMethod: effectiveSignatureMethod,
    legalVersion,
    signedAtIso,
    signatureData: payload.signatureData.trim(),
  });

  // Cifrado HKDF+AAD para tabla operativa player_consents
  const encDni = encryptData(cleanDni, `${effectivePlayerId}:signer_dni`);
  const encEmail = authoritativeEmail ? encryptData(authoritativeEmail, `${effectivePlayerId}:signer_email`) : '';
  const encPhone = cleanSignerPhone ? encryptData(cleanSignerPhone, `${effectivePlayerId}:signer_phone`) : '';
  const encIp = payload.ipAddress ? encryptData(payload.ipAddress, `${effectivePlayerId}:ip_address`) : '';
  const encSig = encryptData(payload.signatureData.trim(), `${effectivePlayerId}:signature_data`);
  const encMinorDni = cleanMinorDni ? encryptData(cleanMinorDni, `${effectivePlayerId}:minor_signer_dni`) : null;
  const encMinorSig = cleanMinorSignature
    ? encryptData(cleanMinorSignature, `${effectivePlayerId}:minor_signature_data`)
    : null;

  // DEK por interesado para crypto-shredding en la tabla inmutable player_consents_audit
  const existingKeyRows = await queryNeon<{ wrapped_dek: string | null; shredded_at: string | null }>(
    `SELECT wrapped_dek, shredded_at FROM player_crypto_keys WHERE player_id = $1 LIMIT 1;`,
    [effectivePlayerId]
  );
  let subjectDek: Buffer | null = null;
  if (existingKeyRows[0]?.wrapped_dek && !existingKeyRows[0]?.shredded_at) {
    subjectDek = unwrapDek(existingKeyRows[0].wrapped_dek, effectivePlayerId);
  }
  if (!subjectDek) {
    subjectDek = generateDek();
  }
  const wrappedDekForUpsert = wrapDek(subjectDek, effectivePlayerId);

  const auditDni = encryptWithDek(cleanDni, subjectDek, `${effectivePlayerId}:audit:signer_dni`);
  const auditEmail = authoritativeEmail
    ? encryptWithDek(authoritativeEmail, subjectDek, `${effectivePlayerId}:audit:signer_email`)
    : '';
  const auditPhone = cleanSignerPhone
    ? encryptWithDek(cleanSignerPhone, subjectDek, `${effectivePlayerId}:audit:signer_phone`)
    : '';
  const auditIp = payload.ipAddress
    ? encryptWithDek(payload.ipAddress, subjectDek, `${effectivePlayerId}:audit:ip_address`)
    : '';
  const auditSig = encryptWithDek(payload.signatureData.trim(), subjectDek, `${effectivePlayerId}:audit:signature_data`);
  const auditMinorDni = cleanMinorDni
    ? encryptWithDek(cleanMinorDni, subjectDek, `${effectivePlayerId}:audit:minor_signer_dni`)
    : null;
  const auditMinorSig = cleanMinorSignature
    ? encryptWithDek(cleanMinorSignature, subjectDek, `${effectivePlayerId}:audit:minor_signature_data`)
    : null;

  const minorSignedAtIso = cleanMinorSignature ? signedAtIso : null;

  // Única CTE SQL atómica en Neon HTTP /sql (sin TOFU de dni_last5 y sin sobrescribir ACTIVE)
  const cteRows = await queryNeon<{ tok_ok: number; consent_id: string | null }>(
    `WITH tok_consume AS (
       INSERT INTO consumed_tokens (jti, token_type, expires_at, consumed_at)
       SELECT $1::varchar, 'consent-verification', $2::timestamptz, NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM player_consents WHERE player_id = $5::varchar AND status = 'ACTIVE'
       )
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti
     ),
     direct_consume AS (
       INSERT INTO consumed_tokens (jti, token_type, expires_at, consumed_at)
       SELECT $3::varchar, 'direct-consent', COALESCE($4::timestamptz, NOW() + INTERVAL '14 days'), NOW()
       WHERE $3::varchar IS NOT NULL AND $3::varchar <> '' AND EXISTS (SELECT 1 FROM tok_consume)
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti
     ),
     ins_c AS (
       INSERT INTO player_consents (
         player_id, player_name, team_id, is_minor, is_minor_14_to_17,
         signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signed_at_iso, status, revoked_at,
         signature_data, legal_version, document_hash,
         ip_address, user_agent,
         minor_signer_name, minor_signer_dni, minor_signature_data, minor_signed_at_iso,
         hash_version, key_id, policy_summary_accepted,
         otp_challenge_id, otp_verified_at,
         created_at, updated_at
       )
       SELECT
         $5::varchar, $6::varchar, $7::varchar, $8::boolean, $40::boolean,
         $9::varchar, $10::varchar, $11::text, $12::varchar,
         $13::text, $14::text,
         $15::boolean, $16::boolean, $17::boolean, $18::boolean,
         $19::varchar, $20::varchar, 'ACTIVE', NULL,
         $21::text, $22::varchar, $23::varchar,
         $24::text, $25::text,
         $26::varchar, $27::text, $28::text, $29::varchar,
         'v3', 'integrity-v3', $30::boolean,
         NULLIF($41::text, '')::uuid, NULLIF($42::text, '')::timestamptz,
         CAST($20::varchar AS timestamptz), NOW()
       WHERE EXISTS (SELECT 1 FROM tok_consume)
       ON CONFLICT (player_id) DO UPDATE SET
         player_name = EXCLUDED.player_name,
         team_id = EXCLUDED.team_id,
         is_minor = EXCLUDED.is_minor,
         is_minor_14_to_17 = EXCLUDED.is_minor_14_to_17,
         signer_type = EXCLUDED.signer_type,
         signer_name = EXCLUDED.signer_name,
         signer_dni = EXCLUDED.signer_dni,
         signer_relationship = EXCLUDED.signer_relationship,
         signer_email = EXCLUDED.signer_email,
         signer_phone = EXCLUDED.signer_phone,
         consent_social_media = EXCLUDED.consent_social_media,
         consent_streaming = EXCLUDED.consent_streaming,
         consent_press = EXCLUDED.consent_press,
         consent_travel = EXCLUDED.consent_travel,
         signature_method = EXCLUDED.signature_method,
         signed_at_iso = EXCLUDED.signed_at_iso,
         status = 'ACTIVE',
         revoked_at = NULL,
         signature_data = EXCLUDED.signature_data,
         legal_version = EXCLUDED.legal_version,
         document_hash = EXCLUDED.document_hash,
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent,
         minor_signer_name = EXCLUDED.minor_signer_name,
         minor_signer_dni = EXCLUDED.minor_signer_dni,
         minor_signature_data = EXCLUDED.minor_signature_data,
         minor_signed_at_iso = EXCLUDED.minor_signed_at_iso,
         hash_version = EXCLUDED.hash_version,
         key_id = EXCLUDED.key_id,
         policy_summary_accepted = EXCLUDED.policy_summary_accepted,
         otp_challenge_id = EXCLUDED.otp_challenge_id,
         otp_verified_at = EXCLUDED.otp_verified_at,
         updated_at = NOW()
       WHERE player_consents.status <> 'ACTIVE' AND player_consents.status <> 'SHREDDED'
       RETURNING
         id, player_id, player_name, team_id, is_minor, is_minor_14_to_17, signer_type, signer_name,
         signer_relationship, consent_social_media, consent_streaming, consent_press,
         consent_travel, signature_method, legal_version, signed_at_iso,
         document_hash, user_agent, minor_signer_name, minor_signed_at_iso,
         hash_version, key_id, otp_challenge_id, otp_verified_at
     ),
     upsert_key AS (
       INSERT INTO player_crypto_keys (
         player_id, wrapped_dek, key_version, retention_until, shredded_at, created_at, updated_at
       )
       SELECT $5::varchar, $31::text, 1, NOW() + INTERVAL '5 years', NULL, NOW(), NOW()
       FROM ins_c
       ON CONFLICT (player_id) DO UPDATE SET
         wrapped_dek = CASE
           WHEN player_crypto_keys.shredded_at IS NULL AND player_crypto_keys.wrapped_dek IS NOT NULL
             THEN player_crypto_keys.wrapped_dek
           ELSE EXCLUDED.wrapped_dek
         END,
         retention_until = GREATEST(
           COALESCE(player_crypto_keys.retention_until, EXCLUDED.retention_until),
           EXCLUDED.retention_until
         ),
         shredded_at = NULL,
         updated_at = NOW()
       RETURNING player_id
     ),
     ins_audit AS (
       INSERT INTO player_consents_audit (
         consent_id, player_id, player_name, team_id, event_type,
         is_minor, is_minor_14_to_17, signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone, consent_image,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signature_data, legal_version, signed_at_iso,
         document_hash, ip_address, user_agent,
         minor_signer_name, minor_signer_dni, minor_signature_data, minor_signed_at_iso,
         hash_version, key_id, otp_challenge_id, otp_verified_at
       )
       SELECT
         ins_c.id, ins_c.player_id, ins_c.player_name, ins_c.team_id, 'SIGNED',
         ins_c.is_minor, ins_c.is_minor_14_to_17, ins_c.signer_type, ins_c.signer_name, $32::text, ins_c.signer_relationship,
         $33::text, $34::text, $35::boolean,
         ins_c.consent_social_media, ins_c.consent_streaming, ins_c.consent_press, ins_c.consent_travel,
         ins_c.signature_method, $36::text, ins_c.legal_version, ins_c.signed_at_iso,
         ins_c.document_hash, $37::text, ins_c.user_agent,
         ins_c.minor_signer_name, $38::text, $39::text, ins_c.minor_signed_at_iso,
         ins_c.hash_version, ins_c.key_id, ins_c.otp_challenge_id, ins_c.otp_verified_at
       FROM ins_c
       RETURNING audit_id
     )
     SELECT
       (SELECT COUNT(*)::int FROM tok_consume) AS tok_ok,
       (SELECT id::text FROM ins_c LIMIT 1) AS consent_id;`,
    [
      tokenCheck.jti,
      tokenCheck.expIso,
      tokenCheck.directTokenJti || null,
      tokenCheck.directTokenExpIso || null,
      effectivePlayerId,
      authoritativePlayerName,
      authoritativeTeamId,
      authoritativeIsMinor,
      authoritativeSignerType,
      cleanSignerName,
      encDni,
      authoritativeRelationship,
      encEmail,
      encPhone,
      cSocial,
      cStreaming,
      cPress,
      cTravel,
      effectiveSignatureMethod,
      signedAtIso,
      encSig,
      legalVersion,
      documentHash,
      encIp,
      stripCrlf(payload.userAgent || '').slice(0, 250),
      cleanMinorName || null,
      encMinorDni,
      encMinorSig,
      minorSignedAtIso,
      true,
      wrappedDekForUpsert,
      auditDni,
      auditEmail,
      auditPhone,
      cImageAny,
      auditSig,
      auditIp,
      auditMinorDni,
      auditMinorSig,
      authoritativeIsMinor14To17,
      verifiedOtpChallengeId,
      verifiedOtpAtIso,
    ]
  );

  const consentId = cteRows[0]?.consent_id || '';
  if (!consentId) {
    const recheck = await queryNeon<{ status: string }>(
      `SELECT status FROM player_consents WHERE player_id = $1 LIMIT 1;`,
      [effectivePlayerId]
    );
    if (recheck[0]?.status === 'ACTIVE') {
      return {
        success: false,
        statusCode: 409,
        error: 'Ya existe una autorización vigente (ACTIVE) para este deportista.',
      };
    }
    return {
      success: false,
      statusCode: 403,
      error: 'El token de verificación ya ha sido consumido o expiró.',
    };
  }

  const targetReceiptEmail = authoritativeEmail || getClubCopyEmail();
  const signedAtFormatted = `${new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(signedAtIso))} ${formatMadridTime(signedAtIso)}`;

  const receiptRes = await sendConsentReceiptEmail({
    toEmail: targetReceiptEmail,
    playerName: authoritativePlayerName,
    teamName: getTeamNameById(authoritativeTeamId),
    birthYear: censusRecord.birth_year,
    birthDate: ageEval.resolvedBirthDate,
    isMinor: authoritativeIsMinor,
    isMinor14To17: authoritativeIsMinor14To17,
    signerName: cleanSignerName,
    signerDni: cleanDni,
    signerDniMasked: maskDni(cleanDni),
    signerRelationship: authoritativeRelationship,
    signerPhone: cleanSignerPhone,
    minorSignerName: cleanMinorName || undefined,
    minorSignerDni: cleanMinorDni || undefined,
    minorSignatureData: cleanMinorSignature || undefined,
    consentId,
    documentHash,
    signedAtIso,
    signedAtFormatted,
    signatureMethod: effectiveSignatureMethod,
    signatureMethodLabel: getSignatureMethodLabel(effectiveSignatureMethod),
    signatureData: payload.signatureData.trim(),
    consentSocialMedia: cSocial,
    consentStreaming: cStreaming,
    consentPress: cPress,
    consentTravel: cTravel,
  });

  return {
    success: true,
    consentId,
    documentHash,
    signedAtIso,
    signatureMethod: effectiveSignatureMethod,
    signerEmail: authoritativeEmail || undefined,
    birthDate: ageEval.resolvedBirthDate,
    receiptEmailSent: receiptRes.sent,
    receiptEmailError: receiptRes.error,
  };
}

/**
 * Permite al administrador registrar una autorización entregada presencialmente en papel físico.
 */
export async function registerInPersonConsent(params: {
  playerId: string;
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerPhone?: string;
  signerEmail?: string;
  consentSocialMedia?: boolean;
  consentStreaming?: boolean;
  consentPress?: boolean;
  consentImage?: boolean;
  consentTravel: boolean;
  minorConsentAccepted?: boolean;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  statusCode?: number;
  consentId?: string;
  documentHash?: string;
  receiptEmailSent?: boolean;
  receiptEmailError?: string;
  error?: string;
}> {
  const canonicalId = resolvePlayerIdSafe(params.playerId);
  if (!canonicalId) {
    return { success: false, statusCode: 404, error: 'Deportista no encontrado en el censo.' };
  }

  if (params.signatureData && !validateSignatureDataUrl(params.signatureData).valid) {
    return { success: false, statusCode: 400, error: 'Formato de firma PNG/JPEG no válido.' };
  }
  if (params.minorSignatureData && !validateSignatureDataUrl(params.minorSignatureData).valid) {
    return { success: false, statusCode: 400, error: 'Formato de firma del menor PNG/JPEG no válido.' };
  }

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    consent_status: string | null;
    shredded_at: string | null;
  }>(
    `SELECT c.player_id, c.player_name, c.team_id, c.birth_year, c.birth_date, c.birth_date_encrypted,
            p.status AS consent_status, k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = $1
       AND ($2::boolean = true OR (c.player_id NOT LIKE 'demo-%' AND c.player_id <> 'p-test-prueba' AND COALESCE(c.is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const player = rows[0];
  if (!player) {
    return { success: false, statusCode: 404, error: 'Deportista no encontrado en el censo.' };
  }
  if (player.consent_status === 'SHREDDED' || Boolean(player.shredded_at)) {
    return {
      success: false,
      statusCode: 409,
      error:
        'Esta ficha consta suprimida (RGPD Art. 17). No se puede registrar una nueva firma presencial sin rehabilitación administrativa expresa.',
    };
  }

  const ageEval = evaluateCensusAge(player);
  const verificationToken = createConsentVerificationToken(player.player_id);

  // Sello PNG 1x1 válido que representa custodia física en secretaría del club
  const inPersonSealData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const cSocial =
    params.consentSocialMedia !== undefined ? Boolean(params.consentSocialMedia) : Boolean(params.consentImage);
  const cStreaming =
    params.consentStreaming !== undefined ? Boolean(params.consentStreaming) : Boolean(params.consentImage);
  const cPress =
    params.consentPress !== undefined ? Boolean(params.consentPress) : Boolean(params.consentImage);

  return submitPlayerConsent({
    verificationToken,
    playerId: player.player_id,
    playerName: player.player_name,
    teamId: player.team_id,
    isMinor: ageEval.isMinor,
    signerType: ageEval.isMinor ? 'PARENT' : 'SELF_ADULT',
    signerName: params.signerName,
    signerDni: params.signerDni,
    signerRelationship: ageEval.isMinor
      ? params.signerRelationship === 'PROPIO_JUGADOR'
        ? 'TUTOR_LEGAL'
        : params.signerRelationship
      : 'PROPIO_JUGADOR',
    signerEmail: params.signerEmail || '',
    signerPhone: params.signerPhone || '',
    consentImage: cSocial || cStreaming || cPress,
    consentSocialMedia: cSocial,
    consentStreaming: cStreaming,
    consentPress: cPress,
    consentTravel: params.consentTravel === true,
    patriaPotestadAccepted: true,
    policySummaryAccepted: true,
    minorConsentAccepted: Boolean(params.minorConsentAccepted && params.minorSignatureData),
    minorSignerName:
      ageEval.isMinor14To17 && params.minorSignatureData
        ? params.minorSignerName || player.player_name
        : undefined,
    minorSignerDni:
      ageEval.isMinor14To17 && params.minorSignatureData ? params.minorSignerDni : undefined,
    minorSignatureData:
      ageEval.isMinor14To17 && params.minorSignatureData
        ? params.minorSignatureData.trim()
        : undefined,
    signatureData: params.signatureData?.trim() || inPersonSealData,
    signatureMethod: 'PRESENCIAL',
    legalVersion: 'v5_2026_junta_anexo05_06_presencial',
    ipAddress: params.ipAddress || '',
    userAgent: params.userAgent || 'Registro Presencial Admin',
  });
}

async function executeAtomicRevocationCte(playerId: string): Promise<{ success: boolean; error?: string }> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { success: false, error: 'Deportista no válido.' };
  }

  const existingRows = await queryNeon<{
    id: string;
    player_id: string;
    signer_dni: string;
    signer_email: string | null;
    signer_phone: string | null;
    signature_data: string;
    ip_address: string | null;
    minor_signer_dni: string | null;
    minor_signature_data: string | null;
  }>(
    `SELECT id, player_id, signer_dni, signer_email, signer_phone, signature_data, ip_address,
            minor_signer_dni, minor_signature_data
     FROM player_consents
     WHERE player_id = $1 AND status = 'ACTIVE'
     LIMIT 1;`,
    [canonicalId]
  );

  const current = existingRows[0];
  if (!current) {
    return { success: false, error: 'No existe ninguna autorización activa para revocar.' };
  }

  const keyRows = await queryNeon<{ wrapped_dek: string | null; shredded_at: string | null }>(
    `SELECT wrapped_dek, shredded_at FROM player_crypto_keys WHERE player_id = $1 LIMIT 1;`,
    [canonicalId]
  );
  let subjectDek =
    keyRows[0]?.wrapped_dek && !keyRows[0]?.shredded_at
      ? unwrapDek(keyRows[0].wrapped_dek, canonicalId)
      : null;
  if (!subjectDek) {
    subjectDek = generateDek();
  }
  const wrappedDekForUpsert = wrapDek(subjectDek, canonicalId);

  const plainDni = decryptField(current.signer_dni, canonicalId, 'signer_dni');
  const plainEmail = decryptField(current.signer_email, canonicalId, 'signer_email');
  const plainPhone = decryptField(current.signer_phone, canonicalId, 'signer_phone');
  const plainSig = decryptField(current.signature_data, canonicalId, 'signature_data');
  const plainIp = decryptField(current.ip_address, canonicalId, 'ip_address');
  const plainMinorDni = decryptField(current.minor_signer_dni, canonicalId, 'minor_signer_dni');
  const plainMinorSig = decryptField(current.minor_signature_data, canonicalId, 'minor_signature_data');

  const auditDni = encryptWithDek(
    plainDni.ok && plainDni.value ? plainDni.value : '[UNDECRYPTABLE]',
    subjectDek,
    `${canonicalId}:audit:signer_dni`
  );
  const auditEmail =
    plainEmail.ok && plainEmail.value
      ? encryptWithDek(plainEmail.value, subjectDek, `${canonicalId}:audit:signer_email`)
      : '';
  const auditPhone =
    plainPhone.ok && plainPhone.value
      ? encryptWithDek(plainPhone.value, subjectDek, `${canonicalId}:audit:signer_phone`)
      : '';
  const auditSig = encryptWithDek(
    plainSig.ok && plainSig.value ? plainSig.value : '[UNDECRYPTABLE]',
    subjectDek,
    `${canonicalId}:audit:signature_data`
  );
  const auditIp =
    plainIp.ok && plainIp.value
      ? encryptWithDek(plainIp.value, subjectDek, `${canonicalId}:audit:ip_address`)
      : '';
  const auditMinorDni =
    plainMinorDni.ok && plainMinorDni.value
      ? encryptWithDek(plainMinorDni.value, subjectDek, `${canonicalId}:audit:minor_signer_dni`)
      : null;
  const auditMinorSig =
    plainMinorSig.ok && plainMinorSig.value
      ? encryptWithDek(plainMinorSig.value, subjectDek, `${canonicalId}:audit:minor_signature_data`)
      : null;

  const revRows = await queryNeon<{ id: string }>(
    `WITH rev AS (
       UPDATE player_consents
       SET status = 'REVOKED',
           revoked_at = NOW(),
           updated_at = NOW()
       WHERE player_id = $1 AND status = 'ACTIVE'
       RETURNING *
     ),
     upsert_key AS (
       INSERT INTO player_crypto_keys (
         player_id, wrapped_dek, key_version, retention_until, shredded_at, created_at, updated_at
       )
       SELECT $1, $2, 1, NOW() + INTERVAL '5 years', NULL, NOW(), NOW()
       FROM rev
       ON CONFLICT (player_id) DO UPDATE SET
         wrapped_dek = CASE
           WHEN player_crypto_keys.shredded_at IS NULL AND player_crypto_keys.wrapped_dek IS NOT NULL
             THEN player_crypto_keys.wrapped_dek
           ELSE EXCLUDED.wrapped_dek
         END,
         retention_until = GREATEST(
           COALESCE(player_crypto_keys.retention_until, EXCLUDED.retention_until),
           EXCLUDED.retention_until
         ),
         shredded_at = NULL,
         updated_at = NOW()
       RETURNING player_id
     ),
     ins_audit AS (
       INSERT INTO player_consents_audit (
         consent_id, player_id, player_name, team_id, event_type,
         is_minor, signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone, consent_image,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signature_data, legal_version, signed_at_iso,
         document_hash, ip_address, user_agent,
         minor_signer_name, minor_signer_dni, minor_signature_data, minor_signed_at_iso,
         hash_version, key_id
       )
       SELECT
         rev.id, rev.player_id, rev.player_name, rev.team_id, 'REVOKED',
         rev.is_minor, rev.signer_type, rev.signer_name, $3::text, rev.signer_relationship,
         $4::text, $5::text, (rev.consent_social_media OR rev.consent_streaming OR rev.consent_press),
         rev.consent_social_media, rev.consent_streaming, rev.consent_press,
         COALESCE(rev.consent_travel, false),
         rev.signature_method, $6::text, rev.legal_version,
         COALESCE(rev.signed_at_iso, rev.created_at::text),
         rev.document_hash, $7::text, COALESCE(rev.user_agent, ''),
         rev.minor_signer_name, $8::text, $9::text, rev.minor_signed_at_iso,
         rev.hash_version, rev.key_id
       FROM rev
       RETURNING audit_id
     )
     SELECT id::text AS id FROM rev;`,
    [
      canonicalId,
      wrappedDekForUpsert,
      auditDni,
      auditEmail,
      auditPhone,
      auditSig,
      auditIp,
      auditMinorDni,
      auditMinorSig,
    ]
  );

  if (revRows.length === 0) {
    return { success: false, error: 'La autorización ya había sido revocada previamente.' };
  }
  return { success: true };
}

/**
 * Revoca desde administración la autorización activa mediante CTE SQL atómica (sin asientos huérfanos).
 */
export async function revokePlayerConsent(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  return executeAtomicRevocationCte(playerId);
}

/**
 * Canal autoservicio Art. 7.3 RGPD: revoca autorización activa validando OTP enviado al email censado.
 */
export async function revokePlayerConsentByOtp(params: {
  playerId: string;
  otpChallengeId: string;
  otpCode: string;
}): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
  prefilledData?: DirectConsentPrefill;
  hasCensusEmail?: boolean;
  maskedContactEmail?: string;
}> {
  const target = await getAuthoritativeOtpTarget(params.playerId);
  if (!target.found || !target.playerId || !target.contactEmail) {
    return {
      success: false,
      statusCode: 400,
      error: 'No hay un correo electrónico censado asociado a esta ficha. Contacta con info@voleibolsanpedro.es.',
    };
  }

  const otpCheck = await verifyEmailOtpChallenge({
    challengeId: params.otpChallengeId,
    playerId: target.playerId,
    email: target.contactEmail,
    code: params.otpCode,
    purpose: 'REVOKE',
  });
  if (!otpCheck.valid) {
    return {
      success: false,
      statusCode: 400,
      error: otpCheck.error || 'El código OTP no es válido.',
    };
  }

  const rev = await executeAtomicRevocationCte(target.playerId);
  if (!rev.success) {
    return { success: false, statusCode: 409, error: rev.error };
  }

  let prefilledData: DirectConsentPrefill | undefined;
  try {
    const cRows = await queryNeon<{
      player_id: string;
      player_name: string;
      birth_year: number | null;
      birth_date: string | null;
      birth_date_encrypted: string | null;
      dni_encrypted: string | null;
      parent_name: string | null;
      parent_dni: string | null;
      parent_relationship: string | null;
      contact_phone: string | null;
    }>(
      `SELECT player_id, player_name, birth_year, birth_date, birth_date_encrypted,
              dni_encrypted, parent_name, parent_dni, parent_relationship, contact_phone
       FROM player_census
       WHERE player_id = $1
       LIMIT 1;`,
      [target.playerId]
    );
    const cr = cRows[0];
    if (cr) {
      const ageEval = evaluateCensusAge(cr);
      const decDni = decryptField(cr.dni_encrypted, target.playerId, 'dni_encrypted');
      const decParentDni = decryptField(cr.parent_dni, target.playerId, 'parent_dni');
      const decPhone = decryptField(cr.contact_phone, target.playerId, 'contact_phone');
      const relRaw = cr.parent_relationship;
      const validRel: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' =
        relRaw === 'PADRE' || relRaw === 'MADRE' || relRaw === 'TUTOR_LEGAL' ? relRaw : 'MADRE';
      prefilledData = ageEval.isMinor
        ? {
            signerName: cr.parent_name || '',
            signerDni: decParentDni.ok ? decParentDni.value : '',
            signerRelationship: validRel,
            signerPhone: decPhone.ok ? decPhone.value : '',
            signerEmail: target.contactEmail,
          }
        : {
            signerName: cr.player_name,
            signerDni: decDni.ok ? decDni.value : '',
            signerRelationship: 'PROPIO_JUGADOR',
            signerPhone: decPhone.ok ? decPhone.value : '',
            signerEmail: target.contactEmail,
          };
    }
  } catch {
    // Non-blocking: si falla la lectura de prefill no invalida la revocación ya efectuada
  }

  return {
    success: true,
    prefilledData,
    hasCensusEmail: true,
    maskedContactEmail: maskEmail(target.contactEmail),
  };
}

function isMissingRelationOrColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  const msg = 'message' in err ? String((err as { message?: unknown }).message || '') : '';
  return code === '42P01' || code === '42703' || /does not exist/i.test(msg);
}

/**
 * Ejecuta *crypto-shredding* RGPD (Art. 5.1.e / Art. 17) destruyendo la DEK envuelta en `player_crypto_keys`
 * y suprimiendo PII de tablas mutables (censo e intranet) sin violar el trigger append-only `trg_immutable_player_consents_audit`.
 */
export async function shredPlayerCryptoKey(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { success: false, error: 'Identificador de deportista inválido.' };
  }

  await queryNeon(
    `WITH key_shred AS (
       INSERT INTO player_crypto_keys (
         player_id, wrapped_dek, key_version, retention_until, shredded_at, created_at, updated_at
       )
       VALUES ($1, NULL, 1, NOW(), NOW(), NOW(), NOW())
       ON CONFLICT (player_id) DO UPDATE SET
         wrapped_dek = NULL,
         shredded_at = NOW(),
         updated_at = NOW()
       RETURNING player_id
     ),
     consents_purge AS (
       UPDATE player_consents
       SET status = 'SHREDDED',
           signer_name = '[SUPRIMIDO]',
           signer_dni = '',
           signer_email = '',
           signer_phone = '',
           signature_data = '',
           ip_address = '',
           user_agent = '',
           minor_signer_name = NULL,
           minor_signer_dni = NULL,
           minor_signature_data = NULL,
           is_minor_14_to_17 = NULL,
           otp_challenge_id = NULL,
           otp_verified_at = NULL,
           updated_at = NOW()
       WHERE player_id = $1
       RETURNING id
     ),
     otp_purge AS (
       DELETE FROM otp_challenges
       WHERE player_id = $1
     )
     UPDATE player_census
     SET dni_last5 = NULL,
         dni_encrypted = NULL,
         dni_blind_index = NULL,
         birth_date = NULL,
         birth_date_encrypted = NULL,
         birth_date_verified = false,
         parent_name = NULL,
         parent_dni = NULL,
         parent_relationship = NULL,
         contact_phone = NULL,
         contact_email = NULL,
         updated_at = NOW()
     WHERE player_id = $1;`,
    [canonicalId]
  );

  // Purga completa RGPD Art. 17 en tablas de intranet (si el esquema intranet está desplegado)
  try {
    const athRows = await queryNeon<{ user_id: string | null }>(
      `SELECT user_id::text AS user_id
       FROM intranet_athletes
       WHERE id = $1
       LIMIT 1;`,
      [canonicalId]
    );
    const linkedUserId = athRows[0]?.user_id || null;

    await queryNeon(
      `UPDATE intranet_athletes
       SET status = 'SHREDDED',
           first_name = '[SUPRIMIDO]',
           last_name = '',
           full_name_normalized = '',
           birth_year = NULL,
           birth_date_enc = NULL,
           birth_date_verified = false,
           dni_last5 = NULL,
           dni_enc = NULL,
           dni_blind_index = NULL,
           emergency_contact_name = NULL,
           emergency_contact_phone = NULL,
           medical_allergies_enc = NULL,
           user_id = NULL,
           updated_at = NOW()
       WHERE id = $1;`,
      [canonicalId]
    );

    if (linkedUserId) {
      await queryNeon(
        `DELETE FROM intranet_sessions WHERE user_id = $1::uuid;`,
        [linkedUserId]
      );
    }

    await queryNeon(`DELETE FROM intranet_guardianships WHERE athlete_id = $1;`, [canonicalId]);
    await queryNeon(`DELETE FROM intranet_athlete_teams WHERE athlete_id = $1;`, [canonicalId]);

    try {
      await queryNeon(
        `UPDATE intranet_registration_requests
         SET guardian_name = NULL,
             contact_email = '[suprimido]',
             contact_phone = NULL,
             pending_payload_enc = NULL
         WHERE athlete_id = $1;`,
        [canonicalId]
      );
    } catch (regErr) {
      if (!isMissingRelationOrColumnError(regErr)) throw regErr;
      await queryNeon(
        `UPDATE intranet_registration_requests
         SET guardian_name = NULL,
             contact_email = '[suprimido]',
             contact_phone = NULL
         WHERE athlete_id = $1;`,
        [canonicalId]
      ).catch((fallbackErr) => {
        if (!isMissingRelationOrColumnError(fallbackErr)) throw fallbackErr;
      });
    }

    try {
      await queryNeon(
        `UPDATE intranet_enrollments
         SET payer_name = '[SUPRIMIDO RGPD]',
             payer_email = NULL,
             payer_dni_enc = NULL,
             updated_at = NOW()
         WHERE athlete_id = $1;`,
        [canonicalId]
      );
    } catch (enrErr) {
      if (!isMissingRelationOrColumnError(enrErr)) throw enrErr;
      await queryNeon(
        `UPDATE intranet_enrollments
         SET payer_name = '[SUPRIMIDO RGPD]',
             payer_email = NULL,
             payer_dni_enc = NULL
         WHERE athlete_id = $1;`,
        [canonicalId]
      ).catch((fallbackErr) => {
        if (!isMissingRelationOrColumnError(fallbackErr)) throw fallbackErr;
      });
    }
  } catch (err) {
    if (!isMissingRelationOrColumnError(err)) {
      throw err;
    }
  }

  return { success: true };
}

/**
 * Panel admin de consentimientos:
 * - Incluye equipos FAVB y AFADE sin registros demo ni duplicados.
 * - Verifica integridad HMAC usando el snapshot inmutable de `player_consents` (p.*).
 * - Marca `integrityVerified: false` explícito si falla descifrado o firma.
 * - NO expone `signatureData` ni PII completa en claro en el listado masivo (usar `getAdminConsentDetail`).
 */
export async function getAdminConsentDashboard(): Promise<{
  stats: {
    totalPlayers: number;
    totalSigned: number;
    totalPending: number;
    percentSigned: number;
    imageAllowed: number;
    imageDenied: number;
    travelAllowed: number;
    socialAllowed: number;
    streamingAllowed: number;
    streamingDenied: number;
    pressAllowed: number;
    integrityAlerts: number;
  };
  teams: Array<{
    teamId: string;
    teamName: string;
    total: number;
    signed: number;
    pending: number;
    percent: number;
  }>;
  players: AdminConsentPlayerSummary[];
}> {
  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    birth_date_verified: boolean;
    dni_last5: string | null;
    contact_email: string | null;
    is_demo: boolean;
    consent_id: string | null;
    consent_status: string | null;
    p_player_name: string | null;
    p_team_id: string | null;
    p_is_minor: boolean | null;
    p_is_minor_14_to_17: boolean | null;
    otp_challenge_id: string | null;
    otp_verified_at: string | null;
    created_at: string | null;
    signed_at_iso: string | null;
    signer_type: string | null;
    signer_name: string | null;
    signer_dni: string | null;
    signer_relationship: string | null;
    signer_phone: string | null;
    signer_email: string | null;
    minor_signer_name: string | null;
    minor_signer_dni: string | null;
    minor_signature_data: string | null;
    consent_social_media: boolean | null;
    consent_streaming: boolean | null;
    consent_press: boolean | null;
    consent_travel: boolean | null;
    signature_method: string | null;
    legal_version: string | null;
    document_hash: string | null;
    hash_version: string | null;
    key_id: string | null;
    signature_data: string | null;
    shredded_at: string | null;
  }>(
    `SELECT
       c.player_id, c.player_name, c.team_id, c.birth_year, c.birth_date, c.birth_date_encrypted,
       COALESCE(c.birth_date_verified, false) AS birth_date_verified,
       c.dni_last5, c.contact_email, COALESCE(c.is_demo, false) AS is_demo,
       p.id::text AS consent_id, p.status AS consent_status,
       p.player_name AS p_player_name, p.team_id AS p_team_id, p.is_minor AS p_is_minor,
       p.is_minor_14_to_17 AS p_is_minor_14_to_17,
       p.otp_challenge_id::text AS otp_challenge_id, p.otp_verified_at::text AS otp_verified_at,
       p.created_at::text AS created_at, p.signed_at_iso, p.signer_type,
       p.signer_name, p.signer_dni, p.signer_relationship,
       p.signer_phone, p.signer_email,
       p.minor_signer_name, p.minor_signer_dni, p.minor_signature_data,
       p.consent_social_media, p.consent_streaming, p.consent_press, p.consent_travel,
       p.signature_method, p.legal_version, p.document_hash,
       COALESCE(p.hash_version, 'v1') AS hash_version,
       COALESCE(p.key_id, 'legacy') AS key_id,
       p.signature_data,
       k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE ($2::boolean = true OR (c.player_id NOT LIKE 'demo-%' AND c.player_id <> 'p-test-prueba' AND COALESCE(c.is_demo, false) = false))
       AND c.canonical_player_id IS NULL
       AND NOT (c.player_id = ANY($1::varchar[]))
     ORDER BY COALESCE(c.is_demo, false) ASC, c.team_id ASC, c.player_name ASC;`,
    [LEGACY_DUPLICATE_IDS, allowDemo]
  );

  let totalSigned = 0;
  let imageAllowed = 0;
  let imageDenied = 0;
  let travelAllowedCount = 0;
  let socialAllowed = 0;
  let streamingAllowed = 0;
  let streamingDenied = 0;
  let pressAllowed = 0;
  let integrityAlerts = 0;

  const teamMap: Record<string, { total: number; signed: number }> = {};
  ALL_CLUB_TEAMS.forEach((t) => {
    teamMap[t.id] = { total: 0, signed: 0 };
  });

  const players: AdminConsentPlayerSummary[] = rows.map((r) => {
    const isShredded = Boolean(r.shredded_at) || r.consent_status === 'SHREDDED';
    const isSigned = Boolean(r.consent_id) && r.consent_status === 'ACTIVE' && !isShredded;

    const ageEval = evaluateCensusAge({
      player_id: r.player_id,
      birth_year: r.birth_year,
      birth_date: r.birth_date,
      birth_date_encrypted: r.birth_date_encrypted,
    });

    const censusEmailDec = decryptField(r.contact_email, r.player_id, 'contact_email');
    const validCensusEmail =
      censusEmailDec.ok && isStrictEmail(censusEmailDec.value) ? censusEmailDec.value.trim() : '';

    let maskedDniOut: string | undefined;
    let maskedPhoneOut: string | undefined;
    let maskedEmailOut: string | undefined;
    let integrityVerified: boolean | undefined;
    let signedMinor14To17: boolean | undefined;

    if (isSigned) {
      totalSigned++;
      const dniDec = decryptField(r.signer_dni, r.player_id, 'signer_dni');
      const phoneDec = decryptField(r.signer_phone, r.player_id, 'signer_phone');
      const emailDec = decryptField(r.signer_email, r.player_id, 'signer_email');
      const sigDec = decryptField(r.signature_data, r.player_id, 'signature_data');
      const minorDniDec = decryptField(r.minor_signer_dni, r.player_id, 'minor_signer_dni');
      const minorSigDec = decryptField(r.minor_signature_data, r.player_id, 'minor_signature_data');

      maskedDniOut = dniDec.ok && dniDec.value ? maskDni(dniDec.value) : '***';
      maskedPhoneOut = phoneDec.ok && phoneDec.value ? maskPhone(phoneDec.value) : undefined;
      maskedEmailOut = emailDec.ok && emailDec.value ? maskEmail(emailDec.value) : undefined;

      const cSocial = r.consent_social_media === true;
      const cStreaming = r.consent_streaming === true;
      const cPress = r.consent_press === true;
      const cTravel = r.consent_travel === true;
      const imgAny = cSocial || cStreaming || cPress;

      if (imgAny) imageAllowed++;
      else imageDenied++;
      if (cTravel) travelAllowedCount++;
      if (cSocial) socialAllowed++;
      if (cStreaming) streamingAllowed++;
      else streamingDenied++;
      if (cPress) pressAllowed++;

      const decryptSucceeded =
        dniDec.ok &&
        Boolean(dniDec.value) &&
        sigDec.ok &&
        Boolean(sigDec.value) &&
        (!minorDniDec.present || minorDniDec.ok) &&
        (!minorSigDec.present || minorSigDec.ok);

      const dashSnapshotIsMinor = Boolean(r.p_is_minor);
      signedMinor14To17 = resolveHistoricalMinor14To17({
        snapshotIsMinor: dashSnapshotIsMinor,
        storedFlag: r.p_is_minor_14_to_17,
        hasLegacyMinorSignature: Boolean(minorSigDec.present || r.minor_signer_name),
        resolvedBirthDate: ageEval.resolvedBirthDate,
        birthYear: r.birth_year,
        signedAtIso: r.signed_at_iso,
        createdAt: r.created_at,
        fallbackCurrentMinor14To17: ageEval.isMinor14To17,
      });

      if (!decryptSucceeded || !r.document_hash || !r.signed_at_iso) {
        integrityVerified = false;
      } else {
        const snapshotIsMinor = Boolean(r.p_is_minor);
        const hashVersion: ConsentHashVersion =
          r.hash_version === 'v3' ? 'v3' : r.hash_version === 'v2' ? 'v2' : 'v1';
        const hashIsMinor14To17 =
          hashVersion === 'v3'
            ? Boolean(snapshotIsMinor && r.p_is_minor_14_to_17)
            : Boolean(snapshotIsMinor && (minorSigDec.present || r.minor_signer_name));

        integrityVerified = verifyConsentIntegrity({
          version: hashVersion,
          keyId: r.key_id || 'legacy',
          playerId: r.player_id,
          playerName: r.p_player_name || r.player_name,
          teamId: r.p_team_id || r.team_id,
          isMinor: snapshotIsMinor,
          isMinor14To17: hashIsMinor14To17,
          otpChallengeId: r.otp_challenge_id || undefined,
          otpVerifiedAtIso: r.otp_verified_at || undefined,
          signerType: r.signer_type || (snapshotIsMinor ? 'PARENT' : 'SELF_ADULT'),
          signerName: r.signer_name || '',
          signerDni: dniDec.value,
          signerRelationship: r.signer_relationship || '',
          consentSocialMedia: cSocial,
          consentStreaming: cStreaming,
          consentPress: cPress,
          consentTravel: cTravel,
          minorSignerName: r.minor_signer_name || '',
          minorSignerDni: minorDniDec.value || '',
          minorSignatureData: minorSigDec.value || '',
          signatureMethod: r.signature_method || 'DIGITAL_WEB',
          legalVersion: r.legal_version || 'v1_2026',
          signedAtIso: r.signed_at_iso,
          signatureData: sigDec.value,
          expectedHash: r.document_hash,
        });
      }

      if (integrityVerified === false) {
        integrityAlerts++;
      }
    }

    if (!teamMap[r.team_id]) {
      teamMap[r.team_id] = { total: 0, signed: 0 };
    }
    teamMap[r.team_id].total++;
    if (isSigned) teamMap[r.team_id].signed++;

    return {
      playerId: r.player_id,
      playerName: r.player_name,
      teamId: r.team_id,
      teamName: getTeamNameById(r.team_id),
      birthYear: r.birth_year,
      birthDateVerified: r.birth_date_verified,
      dniLast5: r.dni_last5,
      hasCensusEmail: Boolean(validCensusEmail),
      maskedContactEmail: validCensusEmail ? maskEmail(validCensusEmail) : undefined,
      isMinor: ageEval.isMinor,
      isMinor14To17: ageEval.isMinor14To17,
      signedIsMinor: isSigned ? Boolean(r.p_is_minor) : undefined,
      signedIsMinor14To17: isSigned ? signedMinor14To17 : undefined,
      isSigned,
      isShredded,
      consentId: isSigned ? r.consent_id || undefined : undefined,
      signedAt: isSigned ? r.signed_at_iso || r.created_at || undefined : undefined,
      signerName: isSigned ? r.signer_name || undefined : undefined,
      signerDni: maskedDniOut,
      signerRelationship: isSigned ? r.signer_relationship || undefined : undefined,
      maskedSignerPhone: maskedPhoneOut,
      maskedSignerEmail: maskedEmailOut,
      minorSignerName: isSigned ? r.minor_signer_name || undefined : undefined,
      consentSocialMedia: isSigned ? r.consent_social_media === true : undefined,
      consentStreaming: isSigned ? r.consent_streaming === true : undefined,
      consentPress: isSigned ? r.consent_press === true : undefined,
      consentTravel: isSigned ? r.consent_travel === true : undefined,
      signatureMethod: isSigned
        ? ((r.signature_method as SignatureMethod) || 'OTP_EMAIL')
        : undefined,
      documentHash: isSigned ? r.document_hash || undefined : undefined,
      hashVersion: isSigned
        ? (r.hash_version === 'v3' ? 'v3' : r.hash_version === 'v2' ? 'v2' : 'v1')
        : undefined,
      integrityVerified,
      isDemo: r.is_demo === true || isDemoPlayerId(r.player_id),
    };
  });

  const totalPlayers = players.length;
  const totalPending = totalPlayers - totalSigned;
  const percentSigned = totalPlayers > 0 ? Math.round((totalSigned / totalPlayers) * 100) : 0;

  const teams = ALL_CLUB_TEAMS.map((t) => {
    const counts = teamMap[t.id] || { total: 0, signed: 0 };
    const pending = counts.total - counts.signed;
    const percent = counts.total > 0 ? Math.round((counts.signed / counts.total) * 100) : 0;
    return {
      teamId: t.id,
      teamName: t.name,
      total: counts.total,
      signed: counts.signed,
      pending,
      percent,
    };
  });

  return {
    stats: {
      totalPlayers,
      totalSigned,
      totalPending,
      percentSigned,
      imageAllowed,
      imageDenied,
      travelAllowed: travelAllowedCount,
      socialAllowed,
      streamingAllowed,
      streamingDenied,
      pressAllowed,
      integrityAlerts,
    },
    teams,
    players,
  };
}

/**
 * Carga bajo demanda (para modal de detalle o generación PDF admin) los datos completos descifrados
 * de un único deportista, evitando exponer todas las firmas y DNIs en `getAdminConsentDashboard`.
 */
export async function getAdminConsentDetail(playerId: string): Promise<AdminConsentDetail | null> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) return null;

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    birth_date_verified: boolean;
    dni_last5: string | null;
    dni_encrypted: string | null;
    parent_name: string | null;
    parent_dni: string | null;
    parent_relationship: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    consent_id: string | null;
    consent_status: string | null;
    p_player_name: string | null;
    p_team_id: string | null;
    p_is_minor: boolean | null;
    p_is_minor_14_to_17: boolean | null;
    otp_challenge_id: string | null;
    otp_verified_at: string | null;
    created_at: string | null;
    signed_at_iso: string | null;
    signer_type: string | null;
    signer_name: string | null;
    signer_dni: string | null;
    signer_relationship: string | null;
    signer_phone: string | null;
    signer_email: string | null;
    minor_signer_name: string | null;
    minor_signer_dni: string | null;
    minor_signature_data: string | null;
    consent_social_media: boolean | null;
    consent_streaming: boolean | null;
    consent_press: boolean | null;
    consent_travel: boolean | null;
    signature_method: string | null;
    legal_version: string | null;
    document_hash: string | null;
    hash_version: string | null;
    key_id: string | null;
    signature_data: string | null;
    shredded_at: string | null;
  }>(
    `SELECT
       c.player_id, c.player_name, c.team_id, c.birth_year, c.birth_date, c.birth_date_encrypted,
       COALESCE(c.birth_date_verified, false) AS birth_date_verified,
       c.dni_last5, c.dni_encrypted, c.parent_name, c.parent_dni, c.parent_relationship,
       c.contact_phone, c.contact_email,
       p.id::text AS consent_id, p.status AS consent_status,
       p.player_name AS p_player_name, p.team_id AS p_team_id, p.is_minor AS p_is_minor,
       p.is_minor_14_to_17 AS p_is_minor_14_to_17,
       p.otp_challenge_id::text AS otp_challenge_id, p.otp_verified_at::text AS otp_verified_at,
       p.created_at::text AS created_at, p.signed_at_iso, p.signer_type,
       p.signer_name, p.signer_dni, p.signer_relationship, p.signer_phone, p.signer_email,
       p.minor_signer_name, p.minor_signer_dni, p.minor_signature_data,
       p.consent_social_media, p.consent_streaming, p.consent_press, p.consent_travel,
       p.signature_method, p.legal_version, p.document_hash,
       COALESCE(p.hash_version, 'v1') AS hash_version,
       COALESCE(p.key_id, 'legacy') AS key_id,
       p.signature_data,
       k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = $1
       AND ($2::boolean = true OR (c.player_id NOT LIKE 'demo-%' AND c.player_id <> 'p-test-prueba' AND COALESCE(c.is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const r = rows[0];
  if (!r) return null;

  const isShredded = Boolean(r.shredded_at) || r.consent_status === 'SHREDDED';
  const isSigned = Boolean(r.consent_id) && r.consent_status === 'ACTIVE' && !isShredded;
  const ageEval = evaluateCensusAge(r);

  const censusDniDec = decryptField(r.dni_encrypted, r.player_id, 'dni_encrypted');
  const censusParentDniDec = decryptField(r.parent_dni, r.player_id, 'parent_dni');
  const censusPhoneDec = decryptField(r.contact_phone, r.player_id, 'contact_phone');
  const censusEmailDec = decryptField(r.contact_email, r.player_id, 'contact_email');

  if (!isSigned) {
    return {
      playerId: r.player_id,
      playerName: r.player_name,
      teamId: r.team_id,
      teamName: getTeamNameById(r.team_id),
      birthYear: r.birth_year,
      birthDate: ageEval.resolvedBirthDate,
      birthDateVerified: r.birth_date_verified,
      dniLast5: r.dni_last5,
      censusDni: censusDniDec.ok ? censusDniDec.value || undefined : undefined,
      censusParentName: r.parent_name || undefined,
      censusParentDni: censusParentDniDec.ok ? censusParentDniDec.value || undefined : undefined,
      censusParentRelationship: r.parent_relationship || undefined,
      censusPhone: censusPhoneDec.ok ? censusPhoneDec.value || undefined : undefined,
      censusEmail: censusEmailDec.ok ? censusEmailDec.value || undefined : undefined,
      isMinor: ageEval.isMinor,
      isMinor14To17: ageEval.isMinor14To17,
      isSigned: false,
      isShredded,
    };
  }

  const dniDec = decryptField(r.signer_dni, r.player_id, 'signer_dni');
  const phoneDec = decryptField(r.signer_phone, r.player_id, 'signer_phone');
  const emailDec = decryptField(r.signer_email, r.player_id, 'signer_email');
  const sigDec = decryptField(r.signature_data, r.player_id, 'signature_data');
  const minorDniDec = decryptField(r.minor_signer_dni, r.player_id, 'minor_signer_dni');
  const minorSigDec = decryptField(r.minor_signature_data, r.player_id, 'minor_signature_data');

  const cSocial = r.consent_social_media === true;
  const cStreaming = r.consent_streaming === true;
  const cPress = r.consent_press === true;
  const cTravel = r.consent_travel === true;

  const decryptOk =
    dniDec.ok &&
    Boolean(dniDec.value) &&
    sigDec.ok &&
    Boolean(sigDec.value) &&
    (!minorDniDec.present || minorDniDec.ok) &&
    (!minorSigDec.present || minorSigDec.ok);

  const snapshotIsMinor = Boolean(r.p_is_minor);
  const hashVersion: ConsentHashVersion =
    r.hash_version === 'v3' ? 'v3' : r.hash_version === 'v2' ? 'v2' : 'v1';
  const hashIsMinor14To17 =
    hashVersion === 'v3'
      ? Boolean(snapshotIsMinor && r.p_is_minor_14_to_17)
      : Boolean(snapshotIsMinor && (minorSigDec.present || r.minor_signer_name));
  const snapshotIsMinor14To17 = resolveHistoricalMinor14To17({
    snapshotIsMinor,
    storedFlag: r.p_is_minor_14_to_17,
    hasLegacyMinorSignature: Boolean(minorSigDec.present || r.minor_signer_name),
    resolvedBirthDate: ageEval.resolvedBirthDate,
    birthYear: r.birth_year,
    signedAtIso: r.signed_at_iso,
    createdAt: r.created_at,
    fallbackCurrentMinor14To17: ageEval.isMinor14To17,
  });

  const integrityVerified =
    decryptOk && Boolean(r.document_hash) && Boolean(r.signed_at_iso)
      ? verifyConsentIntegrity({
          version: hashVersion,
          keyId: r.key_id || 'legacy',
          playerId: r.player_id,
          playerName: r.p_player_name || r.player_name,
          teamId: r.p_team_id || r.team_id,
          isMinor: snapshotIsMinor,
          isMinor14To17: hashIsMinor14To17,
          otpChallengeId: r.otp_challenge_id || undefined,
          otpVerifiedAtIso: r.otp_verified_at || undefined,
          signerType: r.signer_type || (snapshotIsMinor ? 'PARENT' : 'SELF_ADULT'),
          signerName: r.signer_name || '',
          signerDni: dniDec.value,
          signerRelationship: r.signer_relationship || '',
          consentSocialMedia: cSocial,
          consentStreaming: cStreaming,
          consentPress: cPress,
          consentTravel: cTravel,
          minorSignerName: r.minor_signer_name || '',
          minorSignerDni: minorDniDec.value || '',
          minorSignatureData: minorSigDec.value || '',
          signatureMethod: r.signature_method || 'DIGITAL_WEB',
          legalVersion: r.legal_version || 'v1_2026',
          signedAtIso: r.signed_at_iso!,
          signatureData: sigDec.value,
          expectedHash: r.document_hash!,
        })
      : false;

  return {
    playerId: r.player_id,
    playerName: r.player_name,
    teamId: r.team_id,
    teamName: getTeamNameById(r.team_id),
    birthYear: r.birth_year,
    birthDate: ageEval.resolvedBirthDate,
    birthDateVerified: r.birth_date_verified,
    dniLast5: r.dni_last5,
    censusDni: censusDniDec.ok ? censusDniDec.value || undefined : undefined,
    censusParentName: r.parent_name || undefined,
    censusParentDni: censusParentDniDec.ok ? censusParentDniDec.value || undefined : undefined,
    censusParentRelationship: r.parent_relationship || undefined,
    censusPhone: censusPhoneDec.ok ? censusPhoneDec.value || undefined : undefined,
    censusEmail: censusEmailDec.ok ? censusEmailDec.value || undefined : undefined,
    isMinor: ageEval.isMinor,
    isMinor14To17: ageEval.isMinor14To17,
    signedIsMinor: snapshotIsMinor,
    signedIsMinor14To17: snapshotIsMinor14To17,
    isSigned: true,
    isShredded: false,
    consentId: r.consent_id || undefined,
    signedAt: r.signed_at_iso || r.created_at || undefined,
    signerName: r.signer_name || undefined,
    signerDni: dniDec.ok ? dniDec.value : undefined,
    signerRelationship: r.signer_relationship || undefined,
    signerPhone: phoneDec.ok ? phoneDec.value || undefined : undefined,
    signerEmail: emailDec.ok ? emailDec.value || undefined : undefined,
    minorSignerName: r.minor_signer_name || undefined,
    minorSignerDni: minorDniDec.ok ? minorDniDec.value || undefined : undefined,
    minorSignatureData: minorSigDec.ok ? minorSigDec.value || undefined : undefined,
    consentSocialMedia: cSocial,
    consentStreaming: cStreaming,
    consentPress: cPress,
    consentTravel: cTravel,
    signatureMethod: (r.signature_method as SignatureMethod) || 'OTP_EMAIL',
    signatureData: sigDec.ok ? sigDec.value : undefined,
    documentHash: r.document_hash || undefined,
    hashVersion,
    integrityVerified,
  };
}

/**
 * Actualiza DNI/NIE/Pasaporte (>=6 chars cifrado con AAD) y fecha de nacimiento exacta en censo.
 */
export async function updatePlayerCensusDni(
  playerId: string,
  dniInput: string,
  birthDateInput?: string
): Promise<{ success: boolean; error?: string }> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { success: false, error: 'Deportista no válido.' };
  }

  const cleanDoc = dniInput ? dniInput.trim().toUpperCase().replace(/[\s-]/g, '') : '';
  let last5: string | null = null;
  let dniEncrypted: string | null = null;
  let dniBlindIndex: string | null = null;

  if (cleanDoc) {
    if (cleanDoc.length >= 6) {
      if (!isValidSpanishDniOrNie(cleanDoc)) {
        return {
          success: false,
          error: 'El documento completo (DNI, NIE o Pasaporte de 6–12 caracteres) no es válido.',
        };
      }
      last5 = cleanDoc.slice(-5);
      dniEncrypted = encryptData(cleanDoc, `${canonicalId}:dni_encrypted`);
      dniBlindIndex = generateBlindIndex(cleanDoc);
    } else {
      const norm = normalizeDniLast5(cleanDoc);
      if (!isValidDniLast5Format(norm)) {
        return { success: false, error: 'El fragmento debe tener formato válido (ej. 1234A).' };
      }
      last5 = norm;
    }
  }

  let birthYear: number | null = null;
  let birthDateEncrypted: string | null = null;
  let birthDateVerified = false;
  if (birthDateInput && birthDateInput.trim()) {
    const parts = parseBirthDateParts(birthDateInput);
    if (!parts) {
      return { success: false, error: 'La fecha de nacimiento debe tener formato YYYY-MM-DD o DD/MM/AAAA válido.' };
    }
    const isoBd = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    birthYear = parts.year;
    birthDateEncrypted = encryptData(isoBd, `${canonicalId}:birth_date_encrypted`);
    birthDateVerified = true;
  }

  if (!last5 && !birthDateEncrypted) {
    return { success: false, error: 'No se han proporcionado datos válidos para actualizar.' };
  }

  const allowDemo = isDemoPlayersEnabled();
  const res = await queryNeon<{ player_id: string }>(
    `UPDATE player_census
     SET dni_last5 = COALESCE($1::varchar, dni_last5),
         dni_encrypted = CASE
           WHEN $2::varchar IS NOT NULL THEN $2::varchar
           WHEN $1::varchar IS NOT NULL AND $1::varchar <> COALESCE(dni_last5, '') THEN NULL
           ELSE dni_encrypted
         END,
         dni_blind_index = CASE
           WHEN $3::varchar IS NOT NULL THEN $3::varchar
           WHEN $1::varchar IS NOT NULL AND $1::varchar <> COALESCE(dni_last5, '') THEN NULL
           ELSE dni_blind_index
         END,
         birth_year = COALESCE($4::int, birth_year),
         birth_date = CASE WHEN $5::varchar IS NOT NULL THEN NULL ELSE birth_date END,
         birth_date_encrypted = COALESCE($5::varchar, birth_date_encrypted),
         birth_date_verified = CASE WHEN $6::boolean THEN true ELSE birth_date_verified END,
         updated_at = NOW()
     WHERE player_id = $7::varchar
       AND ($8::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     RETURNING player_id;`,
    [last5, dniEncrypted, dniBlindIndex, birthYear, birthDateEncrypted, birthDateVerified, canonicalId, allowDemo]
  );

  if (res.length === 0) {
    return { success: false, error: 'Deportista no encontrado en el censo.' };
  }
  return { success: true };
}

/**
 * Actualiza los datos de tutor/contacto en el censo cifrando con HKDF+AAD y manteniendo sincronizados
 * `dni_last5` y `dni_blind_index` cuando el documento pertenece al propio deportista adulto.
 */
export async function updatePlayerCensusParentInfo(
  playerId: string,
  data: DirectConsentPrefill
): Promise<{ success: boolean; error?: string }> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { success: false, error: 'Deportista no válido.' };
  }

  const allowDemo = isDemoPlayersEnabled();
  const targetRows = await queryNeon<{
    player_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
  }>(
    `SELECT player_id, birth_year, birth_date, birth_date_encrypted
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );
  const censusRow = targetRows[0];
  if (!censusRow) {
    return { success: false, error: 'Deportista no encontrado en el censo.' };
  }

  const ageEval = evaluateCensusAge(censusRow);
  const isMinor = ageEval.isMinor;

  if (data.signerRelationship !== undefined) {
    const validRels = ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'];
    if (!validRels.includes(data.signerRelationship)) {
      return { success: false, error: 'Relación con el deportista no válida.' };
    }
    if (isMinor && data.signerRelationship === 'PROPIO_JUGADOR') {
      return {
        success: false,
        error: 'Para deportistas menores de edad, el firmante debe ser Padre, Madre o Tutor/a Legal.',
      };
    }
  }

  const hasNameUpdate = data.signerName !== undefined;
  const cleanName = hasNameUpdate ? stripCrlf(data.signerName || '').trim() : '';
  if (cleanName.length > 150) {
    return { success: false, error: 'El nombre del firmante supera los 150 caracteres.' };
  }

  const hasDniUpdate = data.signerDni !== undefined;
  const cleanDni = hasDniUpdate ? data.signerDni!.trim().toUpperCase().replace(/[\s-]/g, '') : '';
  // U-C1: Si el campo llega vacío desde un formulario compartido/admin sin modificación explícita, no destruir dni_last5 existente
  const hasEffectiveDniUpdate = hasDniUpdate && cleanDni.length > 0;
  if (cleanDni.length > 20) {
    return { success: false, error: 'El documento de identidad supera los 20 caracteres.' };
  }
  if (cleanDni && !isValidSpanishDniOrNie(cleanDni)) {
    return { success: false, error: 'El DNI/NIE/Pasaporte introducido no es válido.' };
  }

  const hasPhoneUpdate = data.signerPhone !== undefined;
  const cleanPhone = hasPhoneUpdate ? stripCrlf(data.signerPhone || '').trim() : '';
  if (cleanPhone.length > 30) {
    return { success: false, error: 'El teléfono supera los 30 caracteres.' };
  }

  const hasEmailUpdate = data.signerEmail !== undefined;
  const cleanEmail = hasEmailUpdate ? stripCrlf(data.signerEmail || '').trim().toLowerCase() : '';
  if (cleanEmail.length > 150) {
    return { success: false, error: 'El correo electrónico supera los 150 caracteres.' };
  }
  if (cleanEmail && !isStrictEmail(cleanEmail)) {
    return { success: false, error: 'La dirección de correo electrónico no es válida.' };
  }

  const isAdultSelf = !isMinor;
  const hasRelUpdate = isAdultSelf || data.signerRelationship !== undefined;
  const effectiveRel = isAdultSelf
    ? 'PROPIO_JUGADOR'
    : (data.signerRelationship as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | undefined) || null;

  const encParentDni =
    hasEffectiveDniUpdate && !isAdultSelf
      ? encryptData(cleanDni, `${canonicalId}:parent_dni`)
      : null;
  const encPlayerDni =
    hasEffectiveDniUpdate && isAdultSelf
      ? encryptData(cleanDni, `${canonicalId}:dni_encrypted`)
      : null;
  const syncLast5 = hasEffectiveDniUpdate && isAdultSelf ? cleanDni.slice(-5) : null;
  const syncBlindIndex =
    hasEffectiveDniUpdate && isAdultSelf ? generateBlindIndex(cleanDni) : null;

  const encPhone = hasPhoneUpdate
    ? cleanPhone
      ? encryptData(cleanPhone, `${canonicalId}:contact_phone`)
      : null
    : null;
  const encEmail = hasEmailUpdate
    ? cleanEmail
      ? encryptData(cleanEmail, `${canonicalId}:contact_email`)
      : null
    : null;

  const rows = await queryNeon<{ player_id: string }>(
    `UPDATE player_census
     SET parent_name = CASE
           WHEN $12::boolean THEN parent_name
           WHEN $1::boolean THEN NULLIF($2::varchar, '')
           ELSE parent_name
         END,
         parent_dni = CASE
           WHEN NOT $12::boolean AND $3::boolean THEN $4::text
           ELSE parent_dni
         END,
         dni_encrypted = CASE
           WHEN $12::boolean AND $3::boolean THEN $5::varchar
           ELSE dni_encrypted
         END,
         dni_last5 = CASE
           WHEN $12::boolean AND $3::boolean THEN $6::varchar
           ELSE dni_last5
         END,
         dni_blind_index = CASE
           WHEN $12::boolean AND $3::boolean THEN $7::varchar
           ELSE dni_blind_index
         END,
         parent_relationship = CASE
           WHEN $8::boolean THEN $9::varchar
           ELSE parent_relationship
         END,
         contact_phone = CASE
           WHEN $10::boolean THEN $11::text
           ELSE contact_phone
         END,
         contact_email = CASE
           WHEN $13::boolean THEN $14::text
           ELSE contact_email
         END,
         updated_at = NOW()
     WHERE player_id = $15::varchar
       AND ($16::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     RETURNING player_id;`,
    [
      hasNameUpdate,
      cleanName,
      hasEffectiveDniUpdate,
      encParentDni,
      encPlayerDni,
      syncLast5,
      syncBlindIndex,
      hasRelUpdate,
      effectiveRel,
      hasPhoneUpdate,
      encPhone,
      isAdultSelf,
      hasEmailUpdate,
      encEmail,
      canonicalId,
      allowDemo,
    ]
  );

  if (rows.length === 0) {
    return { success: false, error: 'Deportista no encontrado en el censo.' };
  }
  return { success: true };
}

/**
 * Actualización masiva de censo en una única consulta SQL `UNNEST` (máx. 200 registros).
 */
export async function upsertCensusBatch(
  items: CensusBatchItemInput[]
): Promise<CensusBatchResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, updatedCount: 0, skippedCount: 0, errors: ['Lista vacía de registros.'] };
  }
  if (items.length > 200) {
    return { success: false, updatedCount: 0, skippedCount: items.length, errors: ['Máximo 200 registros por lote.'] };
  }

  const playerIds: string[] = [];
  const dniLast5s: Array<string | null> = [];
  const dniEncrypteds: Array<string | null> = [];
  const dniBlindIndexes: Array<string | null> = [];
  const birthYears: Array<number | null> = [];
  const birthDatesEnc: Array<string | null> = [];
  const birthDateVerifieds: boolean[] = [];
  const parentNames: Array<string | null> = [];
  const parentDnis: Array<string | null> = [];
  const parentRels: Array<string | null> = [];
  const contactPhones: Array<string | null> = [];
  const contactEmails: Array<string | null> = [];

  const errors: string[] = [];
  let skippedCount = 0;

  for (const item of items) {
    const canonicalId = resolvePlayerIdSafe(item.playerId);
    if (!canonicalId) {
      skippedCount++;
      errors.push(`ID inválido o demo omitido: ${item.playerId || '(vacío)'}`);
      continue;
    }

    let last5: string | null = null;
    let dniEnc: string | null = null;
    let dniIdx: string | null = null;
    if (item.dni && item.dni.trim()) {
      const cleanDoc = item.dni.trim().toUpperCase().replace(/[\s-]/g, '');
      if (cleanDoc.length >= 6) {
        if (!isValidSpanishDniOrNie(cleanDoc)) {
          skippedCount++;
          errors.push(`DNI/NIE/Pasaporte no válido para ${canonicalId}`);
          continue;
        }
        last5 = cleanDoc.slice(-5);
        dniEnc = encryptData(cleanDoc, `${canonicalId}:dni_encrypted`);
        dniIdx = generateBlindIndex(cleanDoc);
      } else {
        const norm = normalizeDniLast5(cleanDoc);
        if (!isValidDniLast5Format(norm)) {
          skippedCount++;
          errors.push(`Formato últimos 5 DNI no válido para ${canonicalId}`);
          continue;
        }
        last5 = norm;
      }
    }

    let bYear: number | null = null;
    let bDateEnc: string | null = null;
    let bVerified = false;
    if (item.birthDate && item.birthDate.trim()) {
      const parts = parseBirthDateParts(item.birthDate);
      if (!parts) {
        skippedCount++;
        errors.push(`Fecha de nacimiento no válida para ${canonicalId}`);
        continue;
      }
      const isoBd = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      bYear = parts.year;
      bDateEnc = encryptData(isoBd, `${canonicalId}:birth_date_encrypted`);
      bVerified = true;
    }

    let emailEnc: string | null = null;
    if (item.contactEmail && item.contactEmail.trim()) {
      const cleanEmail = item.contactEmail.trim().toLowerCase();
      if (!isStrictEmail(cleanEmail)) {
        skippedCount++;
        errors.push(`Email no válido para ${canonicalId}`);
        continue;
      }
      emailEnc = encryptData(cleanEmail, `${canonicalId}:contact_email`);
    }

    let pDniEnc: string | null = null;
    if (item.parentDni && item.parentDni.trim()) {
      const cleanPDni = item.parentDni.trim().toUpperCase().replace(/[\s-]/g, '');
      if (!isValidSpanishDniOrNie(cleanPDni)) {
        skippedCount++;
        errors.push(`DNI de tutor no válido para ${canonicalId}`);
        continue;
      }
      pDniEnc = encryptData(cleanPDni, `${canonicalId}:parent_dni`);
    }

    const phoneEnc =
      item.contactPhone && item.contactPhone.trim()
        ? encryptData(item.contactPhone.trim(), `${canonicalId}:contact_phone`)
        : null;

    const relClean =
      item.parentRelationship && ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'].includes(item.parentRelationship)
        ? item.parentRelationship
        : null;

    playerIds.push(canonicalId);
    dniLast5s.push(last5);
    dniEncrypteds.push(dniEnc);
    dniBlindIndexes.push(dniIdx);
    birthYears.push(bYear);
    birthDatesEnc.push(bDateEnc);
    birthDateVerifieds.push(bVerified);
    parentNames.push(item.parentName?.trim() || null);
    parentDnis.push(pDniEnc);
    parentRels.push(relClean);
    contactPhones.push(phoneEnc);
    contactEmails.push(emailEnc);
  }

  if (playerIds.length === 0) {
    return { success: false, updatedCount: 0, skippedCount, errors };
  }

  const updatedRows = await queryNeon<{ player_id: string }>(
    `UPDATE player_census AS c
     SET dni_last5 = COALESCE(u.dni_last5, c.dni_last5),
         dni_encrypted = COALESCE(u.dni_encrypted, c.dni_encrypted),
         dni_blind_index = COALESCE(u.dni_blind_index, c.dni_blind_index),
         birth_year = COALESCE(u.birth_year, c.birth_year),
         birth_date = CASE WHEN u.birth_date_encrypted IS NOT NULL THEN NULL ELSE c.birth_date END,
         birth_date_encrypted = COALESCE(u.birth_date_encrypted, c.birth_date_encrypted),
         birth_date_verified = CASE WHEN u.birth_date_verified THEN true ELSE c.birth_date_verified END,
         parent_name = COALESCE(u.parent_name, c.parent_name),
         parent_dni = COALESCE(u.parent_dni, c.parent_dni),
         parent_relationship = COALESCE(u.parent_relationship, c.parent_relationship),
         contact_phone = COALESCE(u.contact_phone, c.contact_phone),
         contact_email = COALESCE(u.contact_email, c.contact_email),
         updated_at = NOW()
     FROM UNNEST(
       $1::varchar[],
       $2::varchar[],
       $3::varchar[],
       $4::varchar[],
       $5::int[],
       $6::varchar[],
       $7::boolean[],
       $8::varchar[],
       $9::text[],
       $10::varchar[],
       $11::text[],
       $12::text[]
     ) AS u(
       player_id, dni_last5, dni_encrypted, dni_blind_index,
       birth_year, birth_date_encrypted, birth_date_verified,
       parent_name, parent_dni, parent_relationship, contact_phone, contact_email
     )
     WHERE c.player_id = u.player_id
       AND ($13::boolean = true OR (c.player_id NOT LIKE 'demo-%' AND c.player_id <> 'p-test-prueba' AND COALESCE(c.is_demo, false) = false))
     RETURNING c.player_id;`,
    [
      playerIds,
      dniLast5s,
      dniEncrypteds,
      dniBlindIndexes,
      birthYears,
      birthDatesEnc,
      birthDateVerifieds,
      parentNames,
      parentDnis,
      parentRels,
      contactPhones,
      contactEmails,
      isDemoPlayersEnabled(),
    ]
  );

  return {
    success: true,
    updatedCount: updatedRows.length,
    skippedCount: skippedCount + Math.max(0, playerIds.length - updatedRows.length),
    errors,
  };
}

/**
 * Emite un enlace directo (14 días por defecto, único uso al firmar) cifrando siempre `encPrefill` con AAD.
 */
export function createDirectConsentToken(
  playerId: string,
  prefill?: DirectConsentPrefill,
  daysValid = 14
): string {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    throw new Error('Identificador de deportista no válido para enlace directo.');
  }
  const secret = getTokenSigningSecret();
  const safeDays = Math.min(14, Math.max(1, Math.floor(daysValid || 14)));
  const encryptedPrefill = encryptData(
    JSON.stringify(prefill || {}),
    `${canonicalId}:direct_prefill`
  );
  const payload = {
    playerId: canonicalId,
    jti: crypto.randomUUID(),
    encPrefill: encryptedPrefill,
    exp: Date.now() + safeDays * 24 * 60 * 60 * 1000,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`direct-consent-v2:${b64Payload}`)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifica HMAC antes de parsear JSON, rechaza tokens sin `encPrefill` y valida no consumo previo en Neon.
 */
export async function verifyDirectConsentToken(token: string | null | undefined): Promise<{
  valid: boolean;
  playerId?: string;
  jti?: string;
  expIso?: string;
  prefill?: DirectConsentPrefill;
  error?: string;
}> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Enlace no válido (falta token).' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Formato de enlace directo no válido.' };
  }

  try {
    const secret = getTokenSigningSecret();
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`direct-consent-v2:${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Firma de seguridad del enlace directo no válida.' };
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    const canonicalId = resolvePlayerIdSafe(payload?.playerId);
    if (
      !canonicalId ||
      typeof payload.jti !== 'string' ||
      !payload.jti ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now() ||
      typeof payload.encPrefill !== 'string' ||
      !payload.encPrefill
    ) {
      return {
        valid: false,
        error: 'El enlace directo ha caducado o no es válido. Solicita uno nuevo a secretaría.',
      };
    }

    const decPrefill = decryptDataStrict(payload.encPrefill, `${canonicalId}:direct_prefill`);
    if (!decPrefill.ok) {
      return { valid: false, error: 'No se pudo verificar la integridad del enlace directo.' };
    }

    const consumed = await isTokenConsumed(payload.jti);
    if (consumed) {
      return {
        valid: false,
        error: 'Este enlace directo ya fue utilizado. Si necesitas consultar o revocar, accede desde Identificación.',
      };
    }

    const parsedPrefill = JSON.parse(decPrefill.value) as DirectConsentPrefill;
    return {
      valid: true,
      playerId: canonicalId,
      jti: payload.jti,
      expIso: new Date(payload.exp).toISOString(),
      prefill: parsedPrefill,
    };
  } catch {
    return { valid: false, error: 'Error al verificar el enlace directo.' };
  }
}

/**
 * Devuelve únicamente metadatos no sensibles y valores enmascarados al abrir un enlace directo
 * (NUNCA devuelve DNI/email/teléfono en claro ni `verificationToken` de escritura antes del 2º factor).
 */
export async function getPlayerDataForDirectConsent(
  playerId: string,
  tokenPrefill?: DirectConsentPrefill
): Promise<VerificationResult> {
  const canonicalId = resolvePlayerIdSafe(playerId);
  if (!canonicalId) {
    return { valid: false, error: 'Deportista no encontrado en el censo oficial del club.' };
  }

  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    birth_date_verified: boolean;
    dni_last5: string | null;
    dni_encrypted: string | null;
    parent_name: string | null;
    parent_dni: string | null;
    parent_relationship: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    is_demo: boolean;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, birth_date_encrypted,
            COALESCE(birth_date_verified, false) AS birth_date_verified,
            dni_last5, dni_encrypted, parent_name, parent_dni, parent_relationship,
            contact_phone, contact_email, COALESCE(is_demo, false) AS is_demo
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const censusRecord = rows[0];
  if (!censusRecord || (!allowDemo && censusRecord.is_demo)) {
    return { valid: false, error: 'Deportista no encontrado en el censo oficial del club.' };
  }

  const ageEval = evaluateCensusAge(censusRecord);
  const decDni = decryptField(censusRecord.dni_encrypted, canonicalId, 'dni_encrypted');
  const decParentDni = decryptField(censusRecord.parent_dni, canonicalId, 'parent_dni');
  const decPhone = decryptField(censusRecord.contact_phone, canonicalId, 'contact_phone');
  const decEmail = decryptField(censusRecord.contact_email, canonicalId, 'contact_email');

  const validEmail = decEmail.ok && isStrictEmail(decEmail.value) ? decEmail.value.trim().toLowerCase() : '';

  const consentRows = await queryNeon<{
    id: string;
    status: string;
    signer_name: string;
    signer_dni: string;
    signer_relationship: string;
    minor_signer_name: string | null;
    signer_phone: string | null;
    signer_email: string | null;
    consent_social_media: boolean;
    consent_streaming: boolean;
    consent_press: boolean;
    consent_travel: boolean | null;
    signature_method: string | null;
    signed_at_iso: string | null;
    document_hash: string | null;
    created_at: string;
    shredded_at: string | null;
  }>(
    `SELECT p.id, p.status, p.signer_name, p.signer_dni, p.signer_relationship, p.minor_signer_name,
            p.signer_phone, p.signer_email,
            p.consent_social_media, p.consent_streaming, p.consent_press, p.consent_travel,
            p.signature_method, p.signed_at_iso, p.document_hash, p.created_at::text AS created_at,
            k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = $1
     LIMIT 1;`,
    [canonicalId]
  );

  const consentMeta = consentRows[0];
  if (consentMeta?.status === 'SHREDDED' || Boolean(consentMeta?.shredded_at)) {
    return {
      valid: false,
      error: 'Esta ficha consta suprimida (RGPD Art. 17). Contacta con secretaría (info@voleibolsanpedro.es).',
    };
  }
  const existing = consentMeta?.status === 'ACTIVE' ? consentMeta : undefined;
  const existingDni = existing ? decryptField(existing.signer_dni, canonicalId, 'signer_dni') : null;
  const existingPhone = existing ? decryptField(existing.signer_phone, canonicalId, 'signer_phone') : null;
  const existingEmail = existing ? decryptField(existing.signer_email, canonicalId, 'signer_email') : null;

  const rawPrefillName = ageEval.isMinor
    ? censusRecord.parent_name || existing?.signer_name || tokenPrefill?.signerName || ''
    : censusRecord.player_name || tokenPrefill?.signerName || '';
  const rawPrefillDni = ageEval.isMinor
    ? (decParentDni.ok ? decParentDni.value : '') ||
      (existingDni?.ok ? existingDni.value : '') ||
      tokenPrefill?.signerDni ||
      ''
    : (decDni.ok ? decDni.value : '') ||
      (existingDni?.ok ? existingDni.value : '') ||
      tokenPrefill?.signerDni ||
      censusRecord.dni_last5 ||
      '';
  const rawPrefillPhone =
    (decPhone.ok ? decPhone.value : '') ||
    (existingPhone?.ok ? existingPhone.value : '') ||
    tokenPrefill?.signerPhone ||
    '';
  const rawPrefillEmail =
    validEmail ||
    (existingEmail?.ok ? existingEmail.value : '') ||
    tokenPrefill?.signerEmail ||
    '';

  const maskedPrefill: MaskedDirectPrefill = {
    signerName: rawPrefillName ? maskSignerName(rawPrefillName) : undefined,
    signerRelationship: ageEval.isMinor
      ? censusRecord.parent_relationship || existing?.signer_relationship || tokenPrefill?.signerRelationship || 'MADRE'
      : 'PROPIO_JUGADOR',
    signerEmail: rawPrefillEmail ? maskEmail(rawPrefillEmail) : undefined,
  };

  const hasFullBirthDate = Boolean(parseBirthDateParts(ageEval.resolvedBirthDate));
  const playerSummary = {
    id: censusRecord.player_id,
    name: censusRecord.player_name,
    teamId: censusRecord.team_id,
    teamName: getTeamNameById(censusRecord.team_id),
    birthYear: null,
    birthDateVerified: Boolean(censusRecord.birth_date_verified),
    birthDateUnlockSupported: hasFullBirthDate,
    isMinor: ageEval.isMinor,
    isMinor14To17: ageEval.isMinor14To17,
    isBoundaryUnverified: ageEval.isBoundaryUnverified,
  };

  if (existing) {
    return {
      valid: true,
      alreadySigned: true,
      requiresFactorUnlock: true,
      hasCensusEmail: Boolean(validEmail),
      maskedContactEmail: validEmail ? maskEmail(validEmail) : undefined,
      challengeSupported: Boolean(validEmail),
      maskedPrefill,
      player: playerSummary,
      existingConsent: {
        id: existing.id,
        signedAt: existing.signed_at_iso || existing.created_at,
        signedAtIso: existing.signed_at_iso || existing.created_at,
        signerName: maskSignerName(existing.signer_name),
        signerDni: existingDni?.ok ? maskDni(existingDni.value) : '***',
        signerRelationship: existing.signer_relationship,
        minorSignerName: existing.minor_signer_name ? maskSignerName(existing.minor_signer_name) : undefined,
        consentSocialMedia: existing.consent_social_media === true,
        consentStreaming: existing.consent_streaming === true,
        consentPress: existing.consent_press === true,
        consentTravel: existing.consent_travel === true,
        signatureMethod: (existing.signature_method as SignatureMethod) || 'OTP_EMAIL',
        documentHash: existing.document_hash || undefined,
      },
    };
  }

  return {
    valid: true,
    alreadySigned: false,
    requiresFactorUnlock: true,
    hasCensusEmail: Boolean(validEmail),
    maskedContactEmail: validEmail ? maskEmail(validEmail) : undefined,
    maskedPrefill,
    player: playerSummary,
  };
}

/**
 * Desbloquea el acceso directo tras validar un 2º factor contra Neon (últimos 5 chars de DNI,
 * fecha de nacimiento exacta o reto OTP al correo censado).
 */
export async function unlockDirectConsentWithFactor(
  directToken: string,
  factor: DirectConsentUnlockFactor
): Promise<DirectConsentUnlockResult> {
  const tokenRes = await verifyDirectConsentToken(directToken);
  if (!tokenRes.valid || !tokenRes.playerId || !tokenRes.jti || !tokenRes.expIso) {
    return { valid: false, statusCode: 400, error: tokenRes.error || 'Enlace directo no válido.' };
  }

  const canonicalId = tokenRes.playerId;
  const allowDemo = isDemoPlayersEnabled();
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    birth_date_verified: boolean;
    dni_last5: string | null;
    dni_encrypted: string | null;
    parent_name: string | null;
    parent_dni: string | null;
    parent_relationship: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, birth_date_encrypted,
            COALESCE(birth_date_verified, false) AS birth_date_verified,
            dni_last5, dni_encrypted, parent_name, parent_dni, parent_relationship,
            contact_phone, contact_email
     FROM player_census
     WHERE player_id = $1
       AND ($2::boolean = true OR (player_id NOT LIKE 'demo-%' AND player_id <> 'p-test-prueba' AND COALESCE(is_demo, false) = false))
     LIMIT 1;`,
    [canonicalId, allowDemo]
  );

  const c = rows[0];
  if (!c) {
    return { valid: false, statusCode: 404, error: 'Deportista no encontrado en el censo.' };
  }

  const ageEval = evaluateCensusAge(c);
  const decDni = decryptField(c.dni_encrypted, canonicalId, 'dni_encrypted');
  const decParentDni = decryptField(c.parent_dni, canonicalId, 'parent_dni');
  const decPhone = decryptField(c.contact_phone, canonicalId, 'contact_phone');
  const decEmail = decryptField(c.contact_email, canonicalId, 'contact_email');
  const validEmail = decEmail.ok && isStrictEmail(decEmail.value) ? decEmail.value.trim().toLowerCase() : '';

  const consentRows = await queryNeon<{
    id: string | null;
    status: string | null;
    signer_name: string | null;
    signer_dni: string | null;
    signer_relationship: string | null;
    minor_signer_name: string | null;
    signer_phone: string | null;
    signer_email: string | null;
    consent_social_media: boolean | null;
    consent_streaming: boolean | null;
    consent_press: boolean | null;
    consent_travel: boolean | null;
    signature_method: string | null;
    signed_at_iso: string | null;
    document_hash: string | null;
    created_at: string | null;
    shredded_at: string | null;
  }>(
    `SELECT p.id::text AS id, p.status, p.signer_name, p.signer_dni, p.signer_relationship, p.minor_signer_name,
            p.signer_phone, p.signer_email,
            p.consent_social_media, p.consent_streaming, p.consent_press, p.consent_travel,
            p.signature_method, p.signed_at_iso, p.document_hash, p.created_at::text AS created_at,
            k.shredded_at::text AS shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = $1
     LIMIT 1;`,
    [canonicalId]
  );
  const consentMeta = consentRows[0];
  if (consentMeta?.status === 'SHREDDED' || Boolean(consentMeta?.shredded_at)) {
    return {
      valid: false,
      statusCode: 409,
      error: 'Esta ficha consta suprimida (RGPD Art. 17). Contacta con secretaría (info@voleibolsanpedro.es).',
    };
  }
  const existing =
    consentMeta?.id && consentMeta?.status === 'ACTIVE'
      ? {
          id: consentMeta.id,
          signer_name: consentMeta.signer_name || '',
          signer_dni: consentMeta.signer_dni || '',
          signer_relationship: consentMeta.signer_relationship || '',
          minor_signer_name: consentMeta.minor_signer_name,
          signer_phone: consentMeta.signer_phone,
          signer_email: consentMeta.signer_email,
          consent_social_media: Boolean(consentMeta.consent_social_media),
          consent_streaming: Boolean(consentMeta.consent_streaming),
          consent_press: Boolean(consentMeta.consent_press),
          consent_travel: consentMeta.consent_travel,
          signature_method: consentMeta.signature_method,
          signed_at_iso: consentMeta.signed_at_iso,
          document_hash: consentMeta.document_hash,
          created_at: consentMeta.created_at || '',
        }
      : undefined;
  const existingDni = existing ? decryptField(existing.signer_dni, canonicalId, 'signer_dni') : null;

  if (!validEmail) {
    return {
      valid: false,
      statusCode: 400,
      error:
        'Esta ficha aún no dispone de un correo electrónico validado en el censo para verificar el acceso mediante código OTP.',
    };
  }

  const requestedPurpose: 'SIGN' | 'RECEIPT' = factor.purpose === 'RECEIPT' ? 'RECEIPT' : 'SIGN';
  if (existing && requestedPurpose !== 'RECEIPT') {
    return {
      valid: false,
      statusCode: 409,
      error:
        'Este deportista ya dispone de una autorización oficial vigente. Elige Consultar Resguardo PDF o Revocar autorización.',
    };
  }
  if (!existing && requestedPurpose === 'RECEIPT') {
    return {
      valid: false,
      statusCode: 404,
      error: 'No existe ninguna autorización activa para descargar su resguardo oficial.',
    };
  }

  if (!factor.otpChallengeId || !factor.otpCode || !UUID_REGEX.test(factor.otpChallengeId)) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Introduce el código OTP de 6 dígitos enviado a tu correo electrónico para continuar.',
    };
  }

  const otpRes = await verifyEmailOtpChallenge({
    challengeId: factor.otpChallengeId,
    playerId: canonicalId,
    email: validEmail,
    code: factor.otpCode,
    purpose: requestedPurpose,
  });

  if (!otpRes.valid) {
    return {
      valid: false,
      statusCode: 403,
      error: otpRes.error || 'El código OTP introducido no es correcto o ha caducado.',
    };
  }

  const dbBd = parseBirthDateParts(ageEval.resolvedBirthDate);
  const playerSummary = {
    id: c.player_id,
    name: c.player_name,
    teamId: c.team_id,
    teamName: getTeamNameById(c.team_id),
    birthYear: c.birth_year ?? dbBd?.year ?? null,
    birthDateVerified: Boolean(c.birth_date_verified),
    birthDateUnlockSupported: Boolean(dbBd),
    isMinor: ageEval.isMinor,
    isMinor14To17: ageEval.isMinor14To17,
    isBoundaryUnverified: ageEval.isBoundaryUnverified,
  };

  if (existing) {
    const fullDetail = await getAdminConsentDetail(canonicalId).catch(() => null);
    const receiptDetail: VerifiedReceiptDetail | undefined = fullDetail?.isSigned
      ? {
          consentId: fullDetail.consentId,
          playerId: fullDetail.playerId,
          playerName: fullDetail.playerName,
          teamId: fullDetail.teamId,
          teamName: fullDetail.teamName,
          birthYear: fullDetail.birthYear,
          birthDate: fullDetail.birthDate,
          isMinor: fullDetail.signedIsMinor ?? fullDetail.isMinor,
          isMinor14To17: fullDetail.signedIsMinor14To17 ?? false,
          signerName: fullDetail.signerName,
          signerDni: fullDetail.signerDni,
          signerRelationship: fullDetail.signerRelationship,
          signerPhone: fullDetail.signerPhone,
          signerEmail: fullDetail.signerEmail,
          minorSignerName: fullDetail.minorSignerName,
          minorSignerDni: fullDetail.minorSignerDni,
          minorSignatureData: fullDetail.minorSignatureData,
          consentSocialMedia: fullDetail.consentSocialMedia === true,
          consentStreaming: fullDetail.consentStreaming === true,
          consentPress: fullDetail.consentPress === true,
          consentTravel: fullDetail.consentTravel === true,
          signatureMethod: fullDetail.signatureMethod,
          signatureData: fullDetail.signatureData,
          documentHash: fullDetail.documentHash,
          signedAt: fullDetail.signedAt,
        }
      : undefined;

    return {
      valid: true,
      alreadySigned: true,
      emailOtpVerified: true,
      actionToken: createConsentActionToken(canonicalId),
      hasCensusEmail: Boolean(validEmail),
      maskedContactEmail: validEmail ? maskEmail(validEmail) : undefined,
      player: playerSummary,
      receiptDetail,
      existingConsent: {
        id: existing.id,
        signedAt: existing.signed_at_iso || existing.created_at,
        signedAtIso: existing.signed_at_iso || existing.created_at,
        signerName: maskSignerName(existing.signer_name),
        signerDni: existingDni?.ok ? maskDni(existingDni.value) : '***',
        signerRelationship: existing.signer_relationship,
        minorSignerName: existing.minor_signer_name ? maskSignerName(existing.minor_signer_name) : undefined,
        consentSocialMedia: existing.consent_social_media === true,
        consentStreaming: existing.consent_streaming === true,
        consentPress: existing.consent_press === true,
        consentTravel: existing.consent_travel === true,
        signatureMethod: (existing.signature_method as SignatureMethod) || 'OTP_EMAIL',
        documentHash: existing.document_hash || undefined,
      },
    };
  }

  const tokenPrefill = tokenRes.prefill;
  const prefilledData: DirectConsentPrefill = ageEval.isMinor
    ? {
        signerName: c.parent_name || tokenPrefill?.signerName || '',
        signerDni: (decParentDni.ok ? decParentDni.value : '') || tokenPrefill?.signerDni || '',
        signerRelationship: (c.parent_relationship ||
          tokenPrefill?.signerRelationship ||
          'MADRE') as DirectConsentPrefill['signerRelationship'],
        signerPhone: (decPhone.ok ? decPhone.value : '') || tokenPrefill?.signerPhone || '',
        signerEmail: validEmail || tokenPrefill?.signerEmail || '',
      }
    : {
        signerName: c.player_name || tokenPrefill?.signerName || '',
        signerDni: (decDni.ok ? decDni.value : '') || tokenPrefill?.signerDni || '',
        signerRelationship: 'PROPIO_JUGADOR',
        signerPhone: (decPhone.ok ? decPhone.value : '') || tokenPrefill?.signerPhone || '',
        signerEmail: validEmail || tokenPrefill?.signerEmail || '',
      };

  const verificationToken = createConsentVerificationToken(canonicalId, {
    directTokenJti: tokenRes.jti,
    directTokenExpIso: tokenRes.expIso,
    preVerifiedOtpChallengeId: factor.otpChallengeId.trim(),
    preVerifiedEmailHash: hashNormalizedEmail(validEmail),
  });

  return {
    valid: true,
    alreadySigned: false,
    emailOtpVerified: true,
    verificationToken,
    prefilledData,
    hasCensusEmail: Boolean(validEmail),
    maskedContactEmail: validEmail ? maskEmail(validEmail) : undefined,
    player: playerSummary,
  };
}

/**
 * Obtiene un lote de enlaces directos para secretaría (máx. 14 días de validez, cifrando prefill).
 */
export async function getBatchDirectConsentData(
  playerIds: string[],
  baseUrl: string,
  daysValid = 14
): Promise<BatchDirectConsentItem[]> {
  if (!Array.isArray(playerIds) || playerIds.length === 0) return [];

  const canonicalIds = Array.from(
    new Set(
      playerIds
        .map((id) => resolvePlayerIdSafe(id))
        .filter((id): id is string => Boolean(id))
    )
  );
  if (canonicalIds.length === 0) return [];

  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    birth_date_encrypted: string | null;
    dni_encrypted: string | null;
    parent_name: string | null;
    parent_dni: string | null;
    parent_relationship: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    consent_id: string | null;
    consent_status: string | null;
    c_signer_name: string | null;
    c_signer_dni: string | null;
    c_signer_relationship: string | null;
    c_signer_phone: string | null;
    c_signer_email: string | null;
    key_shredded_at: string | null;
  }>(
    `SELECT c.player_id, c.player_name, c.team_id, c.birth_year, c.birth_date, c.birth_date_encrypted,
            c.dni_encrypted, c.parent_name, c.parent_dni, c.parent_relationship, c.contact_phone, c.contact_email,
            p.id::text AS consent_id, p.status AS consent_status,
            p.signer_name AS c_signer_name, p.signer_dni AS c_signer_dni,
            p.signer_relationship AS c_signer_relationship, p.signer_phone AS c_signer_phone,
            p.signer_email AS c_signer_email,
            k.shredded_at::text AS key_shredded_at
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     LEFT JOIN player_crypto_keys k ON c.player_id = k.player_id
     WHERE c.player_id = ANY($1::varchar[])
       AND ($2::boolean = true OR (c.player_id NOT LIKE 'demo-%' AND c.player_id <> 'p-test-prueba' AND COALESCE(c.is_demo, false) = false))
     ORDER BY c.team_id ASC, c.player_name ASC;`,
    [canonicalIds, isDemoPlayersEnabled()]
  );

  const items: BatchDirectConsentItem[] = [];
  const safeBaseUrl = baseUrl.replace(/\/+$/, '');

  for (const r of rows) {
    const isActiveConsent = Boolean(r.consent_id) && r.consent_status === 'ACTIVE' && !r.key_shredded_at;
    const isShredded = r.consent_status === 'SHREDDED' || Boolean(r.key_shredded_at);
    const ageEval = evaluateCensusAge(r);
    const teamName = getTeamNameById(r.team_id);

    const decParentDni = decryptField(r.parent_dni, r.player_id, 'parent_dni');
    const decPlayerDni = decryptField(r.dni_encrypted, r.player_id, 'dni_encrypted');
    const decPhone = decryptField(r.contact_phone, r.player_id, 'contact_phone');
    const decEmail = decryptField(r.contact_email, r.player_id, 'contact_email');
    // No reutilizar PII de consentimientos REVOKED ni SHREDDED si falta el dato en censo
    const decCSignerDni = isActiveConsent
      ? decryptField(r.c_signer_dni, r.player_id, 'signer_dni')
      : { ok: false, value: '' };
    const decCSignerPhone = isActiveConsent
      ? decryptField(r.c_signer_phone, r.player_id, 'signer_phone')
      : { ok: false, value: '' };
    const decCSignerEmail = isActiveConsent
      ? decryptField(r.c_signer_email, r.player_id, 'signer_email')
      : { ok: false, value: '' };

    const signerPhone = (decPhone.ok ? decPhone.value : '') || (decCSignerPhone.ok ? decCSignerPhone.value : '') || '';
    const signerEmail = (decEmail.ok ? decEmail.value : '') || (decCSignerEmail.ok ? decCSignerEmail.value : '') || '';

    let signerName = '';
    let signerDni = '';
    let signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR' = ageEval.isMinor
      ? 'MADRE'
      : 'PROPIO_JUGADOR';

    if (ageEval.isMinor) {
      signerName = r.parent_name || (isActiveConsent ? r.c_signer_name : '') || '';
      signerDni = (decParentDni.ok ? decParentDni.value : '') || (decCSignerDni.ok ? decCSignerDni.value : '') || '';
      const relCandidate = r.parent_relationship || (isActiveConsent ? r.c_signer_relationship : '') || 'MADRE';
      signerRelationship = ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'].includes(relCandidate)
        ? (relCandidate as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR')
        : 'MADRE';
    } else {
      signerName = r.player_name;
      signerRelationship = 'PROPIO_JUGADOR';
      signerDni = (decPlayerDni.ok ? decPlayerDni.value : '') || (decCSignerDni.ok ? decCSignerDni.value : '') || '';
    }

    const prefill: DirectConsentPrefill = {
      signerName: signerName || undefined,
      signerDni: signerDni || undefined,
      signerRelationship,
      signerPhone: signerPhone || undefined,
      signerEmail: signerEmail || undefined,
    };

    const directToken = isShredded ? '' : createDirectConsentToken(r.player_id, prefill, daysValid);
    const directUrl = isShredded
      ? ''
      : `${safeBaseUrl}/autorizaciones?directToken=${encodeURIComponent(directToken)}`;

    items.push({
      playerId: r.player_id,
      playerName: r.player_name,
      teamId: r.team_id,
      teamName,
      birthYear: r.birth_year,
      isMinor: ageEval.isMinor,
      isSigned: isActiveConsent,
      isShredded,
      signerName,
      signerDni,
      signerRelationship,
      signerPhone,
      signerEmail,
      directToken,
      directUrl,
    });
  }

  return items;
}
