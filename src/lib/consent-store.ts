import crypto from 'crypto';
import { queryNeon } from './streaming-store';
import { FAVB_TEAMS, FAVB_PLAYERS } from './favb-data';
import { encryptData, generateBlindIndex } from './encryption';

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
  signatureData: string;
  legalVersion: string;
  documentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  player?: {
    id: string;
    name: string;
    teamId: string;
    teamName: string;
    birthYear: number;
    isMinor: boolean;
  };
  alreadySigned?: boolean;
  existingConsent?: {
    id: string;
    signedAt: string;
    signerName: string;
    signerDni: string;
    signerRelationship: string;
    consentSocialMedia: boolean;
    consentStreaming: boolean;
    consentPress: boolean;
  };
}

export interface ConsentSubmissionPayload {
  playerId: string;
  playerName: string;
  teamId: string;
  isMinor: boolean;
  dniLast5: string;
  signerType: 'PARENT' | 'SELF_ADULT';
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerEmail: string;
  signerPhone: string;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  signatureData: string;
  legalVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Normaliza los últimos 4 dígitos y letra del DNI/NIE (ej: "1234-A" -> "1234A")
 */
export function normalizeDniLast5(input: string): string {
  if (!input) return '';
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Valida si un formato de DNI/NIE de 5 caracteres es correcto (4 dígitos + 1 letra)
 */
export function isValidDniLast5Format(input: string): boolean {
  const norm = normalizeDniLast5(input);
  return /^[0-9]{4}[A-Z]$/.test(norm);
}

/**
 * Extrae el año a partir de un año (ej. 2008) o una fecha (ej. 15/04/2008 o 2008-04-15)
 */
export function extractYear(input: string | number): number | null {
  if (typeof input === 'number') return input;
  if (!input) return null;
  const str = String(input).trim();
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Valida un DNI o NIE español completo (formato + letra de control oficial)
 */
export function isValidSpanishDniOrNie(input: string): boolean {
  if (!input) return false;
  let str = input.replace(/[\s-]/g, '').toUpperCase();
  
  // DNI: 8 dígitos + 1 letra
  const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
  // NIE: X, Y o Z + 7 dígitos + 1 letra
  const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
  
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
  
  if (dniRegex.test(str)) {
    const num = parseInt(str.substring(0, 8), 10);
    const letra = str.charAt(8);
    return letras.charAt(num % 23) === letra;
  }
  
  if (nieRegex.test(str)) {
    let niePrefix = '0';
    if (str.startsWith('Y')) niePrefix = '1';
    if (str.startsWith('Z')) niePrefix = '2';
    
    const num = parseInt(niePrefix + str.substring(1, 8), 10);
    const letra = str.charAt(8);
    return letras.charAt(num % 23) === letra;
  }
  
  return false;
}

/**
 * Obtiene el nombre del equipo a partir de su ID
 */
export function getTeamNameById(teamId: string): string {
  const team = FAVB_TEAMS.find(t => t.id === teamId);
  return team ? team.name : teamId;
}

/**
 * Verifica la identidad del deportista usando:
 * 1. Año / fecha de nacimiento
 * 2. Últimos 4 dígitos y letra del DNI/NIE de su ficha federativa
 */
export async function verifyPlayerIdentity(
  playerId: string,
  birthYearOrDate: string | number,
  dniLast5Input: string
): Promise<VerificationResult> {
  const inputYear = extractYear(birthYearOrDate);
  const normDni = normalizeDniLast5(dniLast5Input);

  if (!inputYear) {
    return {
      valid: false,
      error: 'Por favor, introduce un año o fecha de nacimiento válido (ej. 2008 o 15/04/2008).'
    };
  }

  if (!isValidDniLast5Format(normDni)) {
    return {
      valid: false,
      error: 'Los últimos 4 dígitos y letra del DNI/NIE deben tener el formato: 4 números y 1 letra (ej. 1234A).'
    };
  }

  // 1. Buscar en player_census en Neon
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    dni_last5: string | null;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, dni_last5 
     FROM player_census WHERE player_id = $1 LIMIT 1;`,
    [playerId]
  );

  let censusRecord = rows[0];

  // Si no está en BD, buscar en la lista estática FAVB_PLAYERS
  if (!censusRecord) {
    const staticPlayer = FAVB_PLAYERS.find(p => p.id === playerId);
    if (!staticPlayer) {
      return {
        valid: false,
        error: 'Deportista no encontrado en el censo oficial del club.'
      };
    }
    censusRecord = {
      player_id: staticPlayer.id,
      player_name: `${staticPlayer.firstName} ${staticPlayer.lastName}`.trim(),
      team_id: staticPlayer.teamId,
      birth_year: staticPlayer.birthYear || null,
      birth_date: null,
      dni_last5: null
    };
  }

  // 2. Comprobar año de nacimiento
  if (censusRecord.birth_year && censusRecord.birth_year !== inputYear) {
    return {
      valid: false,
      error: 'El año o fecha de nacimiento no coincide con la ficha federativa registrada.'
    };
  }

  // 3. Comprobar últimos 4 dígitos y letra del DNI/NIE si ya están registrados en el censo
  if (censusRecord.dni_last5) {
    const registeredNorm = normalizeDniLast5(censusRecord.dni_last5);
    if (registeredNorm !== normDni) {
      return {
        valid: false,
        error: 'Los últimos 4 dígitos y letra del DNI/NIE no coinciden con la ficha federativa registrada.'
      };
    }
  }

  // Comprobar si es menor de 18 años (nacidos en 2009 o posterior para la temporada actual 2026/2027)
  const currentYear = 2026;
  const isMinor = (censusRecord.birth_year || inputYear) > (currentYear - 18);

  // 4. Comprobar si ya existe consentimiento firmado
  const consentRows = await queryNeon<{
    id: string;
    signer_name: string;
    signer_dni: string;
    signer_relationship: string;
    consent_social_media: boolean;
    consent_streaming: boolean;
    consent_press: boolean;
    created_at: string;
  }>(
    `SELECT id, signer_name, signer_dni, signer_relationship, consent_social_media, 
            consent_streaming, consent_press, created_at 
     FROM player_consents WHERE player_id = $1 LIMIT 1;`,
    [playerId]
  );

  const existing = consentRows[0];
  if (existing) {
    return {
      valid: true,
      alreadySigned: true,
      player: {
        id: censusRecord.player_id,
        name: censusRecord.player_name,
        teamId: censusRecord.team_id,
        teamName: getTeamNameById(censusRecord.team_id),
        birthYear: censusRecord.birth_year || inputYear,
        isMinor
      },
      existingConsent: {
        id: existing.id,
        signedAt: existing.created_at,
        signerName: existing.signer_name,
        signerDni: existing.signer_dni,
        signerRelationship: existing.signer_relationship,
        consentSocialMedia: existing.consent_social_media,
        consentStreaming: existing.consent_streaming,
        consentPress: existing.consent_press
      }
    };
  }

  return {
    valid: true,
    alreadySigned: false,
    player: {
      id: censusRecord.player_id,
      name: censusRecord.player_name,
      teamId: censusRecord.team_id,
      teamName: getTeamNameById(censusRecord.team_id),
      birthYear: censusRecord.birth_year || inputYear,
      isMinor
    }
  };
}

/**
 * Registra y guarda un nuevo consentimiento firmado con evidencias legales
 */
export async function submitPlayerConsent(
  payload: ConsentSubmissionPayload
): Promise<{ success: boolean; consentId?: string; documentHash?: string; error?: string }> {
  try {
    const {
      playerId,
      playerName,
      teamId,
      isMinor,
      dniLast5,
      signerType,
      signerName,
      signerDni,
      signerRelationship,
      signerEmail,
      signerPhone,
      consentSocialMedia,
      consentStreaming,
      consentPress,
      signatureData,
      legalVersion = 'v1_2026',
      ipAddress = '',
      userAgent = ''
    } = payload;

    if (!playerId || !signerName || !signerDni || !signatureData) {
      return { success: false, error: 'Faltan campos obligatorios para registrar la autorización.' };
    }

    if (!signatureData.startsWith('data:image/')) {
      return { success: false, error: 'Firma gráfica no válida.' };
    }

    // Calcular hash SHA-256 de integridad jurídica
    const timestampIso = new Date().toISOString();
    const hashData = `${playerId}|${signerDni}|${consentSocialMedia ? '1' : '0'}|${consentStreaming ? '1' : '0'}|${consentPress ? '1' : '0'}|${legalVersion}|${timestampIso}`;
    const documentHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // 1. Insertar o actualizar en player_consents
    const insertRes = await queryNeon<{ id: string }>(
      `INSERT INTO player_consents (
        player_id, player_name, team_id, is_minor,
        signer_type, signer_name, signer_dni, signer_relationship,
        signer_email, signer_phone,
        consent_social_media, consent_streaming, consent_press,
        signature_data, legal_version, document_hash,
        ip_address, user_agent, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10,
        $11, $12, $13,
        $14, $15, $16,
        $17, $18, NOW()
      )
      ON CONFLICT (player_id) DO UPDATE SET
        signer_type = EXCLUDED.signer_type,
        signer_name = EXCLUDED.signer_name,
        signer_dni = EXCLUDED.signer_dni,
        signer_relationship = EXCLUDED.signer_relationship,
        signer_email = EXCLUDED.signer_email,
        signer_phone = EXCLUDED.signer_phone,
        consent_social_media = EXCLUDED.consent_social_media,
        consent_streaming = EXCLUDED.consent_streaming,
        consent_press = EXCLUDED.consent_press,
        signature_data = EXCLUDED.signature_data,
        legal_version = EXCLUDED.legal_version,
        document_hash = EXCLUDED.document_hash,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
      RETURNING id;`,
      [
        playerId, playerName, teamId, isMinor,
        signerType, signerName, signerDni, signerRelationship,
        signerEmail, signerPhone,
        consentSocialMedia, consentStreaming, consentPress,
        signatureData, legalVersion, documentHash,
        ipAddress, userAgent
      ]
    );

    const consentId = insertRes[0]?.id || '';

    // 2. Si el censo no tenía registrado el DNI/NIE de este jugador, vincular los últimos 4 dígitos y letra
    const normDni = normalizeDniLast5(dniLast5);
    if (isValidDniLast5Format(normDni)) {
      await queryNeon(
        `UPDATE player_census 
         SET dni_last5 = $1, updated_at = NOW() 
         WHERE player_id = $2 AND (dni_last5 IS NULL OR dni_last5 = '');`,
        [normDni, playerId]
      );
    }

    return {
      success: true,
      consentId,
      documentHash
    };
  } catch (err) {
    console.error('[ConsentStore] Error submitting player consent:', err);
    return { success: false, error: 'Error guardando en la base de datos' };
  }
}

/**
 * Obtiene los datos del panel de control de administración de consentimientos
 */
export async function getAdminConsentDashboard(): Promise<{
  stats: {
    totalPlayers: number;
    totalSigned: number;
    totalPending: number;
    percentSigned: number;
    socialAllowed: number;
    streamingAllowed: number;
    streamingDenied: number;
    pressAllowed: number;
  };
  teams: Array<{
    teamId: string;
    teamName: string;
    total: number;
    signed: number;
    pending: number;
    percent: number;
  }>;
  players: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    birthYear: number | null;
    dniLast5: string | null;
    isMinor: boolean;
    isSigned: boolean;
    consentId?: string;
    signedAt?: string;
    signerName?: string;
    signerDni?: string;
    signerRelationship?: string;
    signerPhone?: string;
    signerEmail?: string;
    consentSocialMedia?: boolean;
    consentStreaming?: boolean;
    consentPress?: boolean;
    documentHash?: string;
    signatureData?: string;
  }>;
}> {
  // Consulta de censo unida con consentimientos
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    dni_last5: string | null;
    consent_id: string | null;
    created_at: string | null;
    signer_name: string | null;
    signer_dni: string | null;
    signer_relationship: string | null;
    signer_phone: string | null;
    signer_email: string | null;
    consent_social_media: boolean | null;
    consent_streaming: boolean | null;
    consent_press: boolean | null;
    document_hash: string | null;
    signature_data: string | null;
  }>(`
    SELECT 
      c.player_id, c.player_name, c.team_id, c.birth_year, c.dni_last5,
      p.id AS consent_id, p.created_at, p.signer_name, p.signer_dni, p.signer_relationship,
      p.signer_phone, p.signer_email, p.consent_social_media, p.consent_streaming, p.consent_press,
      p.document_hash, p.signature_data
    FROM player_census c
    LEFT JOIN player_consents p ON c.player_id = p.player_id
    ORDER BY c.team_id ASC, c.player_name ASC;
  `);

  const currentYear = 2026;
  let totalSigned = 0;
  let socialAllowed = 0;
  let streamingAllowed = 0;
  let streamingDenied = 0;
  let pressAllowed = 0;

  const teamMap: Record<string, { total: number; signed: number }> = {};
  FAVB_TEAMS.forEach(t => {
    teamMap[t.id] = { total: 0, signed: 0 };
  });

  const players = rows.map(r => {
    const isSigned = !!r.consent_id;
    const isMinor = (r.birth_year || 2008) > (currentYear - 18);

    if (isSigned) {
      totalSigned++;
      if (r.consent_social_media) socialAllowed++;
      if (r.consent_streaming) streamingAllowed++;
      else streamingDenied++;
      if (r.consent_press) pressAllowed++;
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
      dniLast5: r.dni_last5,
      isMinor,
      isSigned,
      consentId: r.consent_id || undefined,
      signedAt: r.created_at || undefined,
      signerName: r.signer_name || undefined,
      signerDni: r.signer_dni || undefined,
      signerRelationship: r.signer_relationship || undefined,
      signerPhone: r.signer_phone || undefined,
      signerEmail: r.signer_email || undefined,
      consentSocialMedia: r.consent_social_media ?? undefined,
      consentStreaming: r.consent_streaming ?? undefined,
      consentPress: r.consent_press ?? undefined,
      documentHash: r.document_hash || undefined,
      signatureData: r.signature_data || undefined
    };
  });

  const totalPlayers = players.length;
  const totalPending = totalPlayers - totalSigned;
  const percentSigned = totalPlayers > 0 ? Math.round((totalSigned / totalPlayers) * 100) : 0;

  const teams = FAVB_TEAMS.map(t => {
    const counts = teamMap[t.id] || { total: 0, signed: 0 };
    const pending = counts.total - counts.signed;
    const percent = counts.total > 0 ? Math.round((counts.signed / counts.total) * 100) : 0;
    return {
      teamId: t.id,
      teamName: t.name,
      total: counts.total,
      signed: counts.signed,
      pending,
      percent
    };
  });

  return {
    stats: {
      totalPlayers,
      totalSigned,
      totalPending,
      percentSigned,
      socialAllowed,
      streamingAllowed,
      streamingDenied,
      pressAllowed
    },
    teams,
    players
  };
}

/**
 * Actualiza los datos censales de un deportista cifrando los datos confidenciales (DNI y fecha)
 * conforme al Art. 32 del RGPD y Disposición Adicional 7ª de la LOPDGDD.
 */
export async function updatePlayerCensusDni(
  playerId: string,
  dniInput: string,
  birthDateInput?: string
): Promise<{ success: boolean; error?: string }> {
  const norm = normalizeDniLast5(dniInput);
  const cleanFullDni = dniInput ? dniInput.trim().toUpperCase().replace(/[\s-]/g, '') : '';
  const isFullDni = cleanFullDni.length >= 8;

  const last5 = cleanFullDni.length > 5 ? cleanFullDni.slice(-5) : norm;

  if (last5 && !isValidDniLast5Format(last5)) {
    return { success: false, error: 'El formato debe ser de 4 números y 1 letra (ej. 1234A)' };
  }

  const dniEncrypted = isFullDni ? encryptData(cleanFullDni) : null;
  const dniBlindIndex = cleanFullDni ? generateBlindIndex(cleanFullDni) : null;
  const birthDateEncrypted = birthDateInput ? encryptData(birthDateInput) : null;

  await queryNeon(
    `UPDATE player_census 
     SET dni_last5 = COALESCE($1, dni_last5),
         dni_encrypted = COALESCE($2, dni_encrypted),
         dni_blind_index = COALESCE($3, dni_blind_index),
         birth_date_encrypted = COALESCE($4, birth_date_encrypted),
         updated_at = NOW() 
     WHERE player_id = $5;`,
    [last5 || null, dniEncrypted, dniBlindIndex, birthDateEncrypted, playerId]
  );

  return { success: true };
}

/**
 * Revoca o elimina la autorización de un jugador si un tutor lo solicita
 */
export async function revokePlayerConsent(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  await queryNeon(
    `DELETE FROM player_consents WHERE player_id = $1;`,
    [playerId]
  );
  return { success: true };
}

/**
 * Gestión de Sesión Segura de Administrador mediante HMAC
 */
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'cdv-super-secure-session-key-fallback-2026';

export function createAdminSessionToken(username: string): string {
  const payload = {
    user: username,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(b64Payload)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [b64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(b64Payload)
    .digest('base64url');

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    return payload.exp && payload.exp > Date.now();
  } catch {
    return false;
  }
}
