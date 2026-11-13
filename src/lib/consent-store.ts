import crypto from 'crypto';
import { queryNeon } from './streaming-store';
import { FAVB_TEAMS, FAVB_PLAYERS } from './favb-data';
import { encryptData, decryptData, generateBlindIndex, maskDni } from './encryption';
import { CLUB_INFO } from './data-store';

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
  consentTravel?: boolean;
  medicalNotes?: string;
  signatureData: string;
  legalVersion: string;
  documentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
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
  verificationToken?: string;
  prefilledData?: DirectConsentPrefill;
  existingConsent?: {
    id: string;
    signedAt: string;
    signerName: string;
    signerDni: string;
    signerRelationship: string;
    consentSocialMedia: boolean;
    consentStreaming: boolean;
    consentPress: boolean;
    consentTravel?: boolean;
    medicalNotes?: string;
  };
}

export interface ConsentSubmissionPayload {
  verificationToken: string;
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
  consentTravel?: boolean;
  medicalNotes?: string;
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
    consent_travel: boolean;
    medical_notes: string | null;
    created_at: string;
  }>(
    `SELECT id, signer_name, signer_dni, signer_relationship, consent_social_media, 
            consent_streaming, consent_press, COALESCE(consent_travel, true) AS consent_travel,
            medical_notes, created_at 
     FROM player_consents WHERE player_id = $1 LIMIT 1;`,
    [playerId]
  );

  const existing = consentRows[0];
  if (existing) {
    return {
      valid: true,
      alreadySigned: true,
      verificationToken: createConsentVerificationToken(censusRecord.player_id),
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
        signerDni: maskDni(existing.signer_dni),
        signerRelationship: existing.signer_relationship,
        consentSocialMedia: existing.consent_social_media,
        consentStreaming: existing.consent_streaming,
        consentPress: existing.consent_press,
        consentTravel: existing.consent_travel,
        medicalNotes: existing.medical_notes || undefined
      }
    };
  }

  return {
    valid: true,
    alreadySigned: false,
    verificationToken: createConsentVerificationToken(censusRecord.player_id),
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
      verificationToken,
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
      consentTravel = true,
      medicalNotes = '',
      signatureData,
      legalVersion = 'v1_2026',
      ipAddress = '',
      userAgent = ''
    } = payload;

    // Validación estricta del token de verificación emitido en el Paso 1
    if (!verificationToken || !verifyConsentVerificationToken(verificationToken, playerId)) {
      return {
        success: false,
        error: 'Sesión de verificación no válida o expirada. Por favor, vuelve al Paso 1 y valida la identidad del deportista.'
      };
    }

    if (!playerId || !signerName || !signerDni || !signatureData) {
      return { success: false, error: 'Faltan campos obligatorios para registrar la autorización.' };
    }

    // Limitación estricta de tamaño de firma para prevenir DoS / consumo excesivo de memoria
    if (!signatureData.startsWith('data:image/') || signatureData.length > 131072) {
      return { success: false, error: 'Firma gráfica no válida o excede el límite permitido (128 KB).' };
    }

    // Límites de longitud defensivos para campos de texto
    if (
      signerName.length > 150 ||
      signerDni.length > 20 ||
      (signerEmail && signerEmail.length > 150) ||
      (signerPhone && signerPhone.length > 30) ||
      (medicalNotes && medicalNotes.length > 500)
    ) {
      return { success: false, error: 'Uno o más campos exceden la longitud máxima permitida.' };
    }

    // Calcular hash SHA-256 de integridad jurídica
    const timestampIso = new Date().toISOString();
    const hashData = `${playerId}|${signerDni}|${consentSocialMedia ? '1' : '0'}|${consentStreaming ? '1' : '0'}|${consentPress ? '1' : '0'}|${consentTravel ? '1' : '0'}|${legalVersion}|${timestampIso}`;
    const documentHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // 1. Insertar o actualizar en player_consents
    const insertRes = await queryNeon<{ id: string }>(
      `INSERT INTO player_consents (
        player_id, player_name, team_id, is_minor,
        signer_type, signer_name, signer_dni, signer_relationship,
        signer_email, signer_phone,
        consent_social_media, consent_streaming, consent_press, consent_travel, medical_notes,
        signature_data, legal_version, document_hash,
        ip_address, user_agent, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20, NOW()
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
        consent_travel = EXCLUDED.consent_travel,
        medical_notes = EXCLUDED.medical_notes,
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
        consentSocialMedia, consentStreaming, consentPress, consentTravel, medicalNotes,
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
    consent_travel: boolean | null;
    medical_notes: string | null;
    document_hash: string | null;
    signature_data: string | null;
  }>(`
    SELECT 
      c.player_id, c.player_name, c.team_id, c.birth_year, c.dni_last5,
      p.id AS consent_id, p.created_at, p.signer_name, p.signer_dni, p.signer_relationship,
      p.signer_phone, p.signer_email, p.consent_social_media, p.consent_streaming, p.consent_press,
      COALESCE(p.consent_travel, true) AS consent_travel, p.medical_notes,
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
      consentTravel: r.consent_travel ?? undefined,
      medicalNotes: r.medical_notes || undefined,
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
 * Obtiene el secreto de firma seguro para sesiones y tokens de verificación.
 * Aplica el principio fail-closed estricto: lanza un error si la variable no está inyectada.
 */
function getAdminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('[Security] ADMIN_SESSION_SECRET no está configurada en las variables de entorno.');
  }
  return secret;
}

/**
 * Emite un token temporal (15 minutos) firmado con HMAC para garantizar que
 * el envío del consentimiento en el Paso 2 proviene de una verificación válida en el Paso 1.
 */
export function createConsentVerificationToken(playerId: string): string {
  const secret = getAdminSessionSecret();
  const payload = {
    playerId,
    exp: Date.now() + 15 * 60 * 1000, // 15 minutos de validez
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`consent-verification:${playerId}:${b64Payload}`)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Valida el token de verificación en tiempo constante comprobando expiración y coincidencia de deportista.
 */
export function verifyConsentVerificationToken(token: string | null | undefined, playerId: string): boolean {
  if (!token || !playerId) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const secret = getAdminSessionSecret();
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`consent-verification:${playerId}:${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    return payload.playerId === playerId && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Gestión de Sesión Segura de Administrador mediante HMAC con comparación en tiempo constante.
 */
export function createAdminSessionToken(username: string): string {
  const secret = getAdminSessionSecret();
  const payload = {
    user: username,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(b64Payload)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const secret = getAdminSessionSecret();
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(b64Payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Emite un token firmado con HMAC para acceso directo (Magic Link) sin necesidad de DNI ni fecha de nacimiento.
 * Permite adjuntar datos pre-rellenados (tutor, teléfono, DNI) para ahorrar tiempo al declarante.
 * Válido por 30 días para facilitar a los padres o deportistas firmar desde su móvil.
 */
export function createDirectConsentToken(
  playerId: string,
  prefill?: DirectConsentPrefill,
  daysValid = 30
): string {
  const secret = getAdminSessionSecret();
  const payload = {
    playerId,
    prefill: prefill || undefined,
    exp: Date.now() + daysValid * 24 * 60 * 60 * 1000,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`direct-consent:${playerId}:${b64Payload}`)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Valida el token de enlace directo comprobando la firma HMAC en tiempo constante y su expiración.
 * Extrae los datos pre-rellenados si fueron codificados por la administración.
 */
export function verifyDirectConsentToken(token: string | null | undefined): {
  valid: boolean;
  playerId?: string;
  prefill?: DirectConsentPrefill;
  error?: string;
} {
  if (!token) return { valid: false, error: 'Enlace no válido (falta token).' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Formato de enlace directo no válido.' };

  try {
    const secret = getAdminSessionSecret();
    const [b64Payload, signature] = parts;
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    const playerId = payload.playerId;

    if (!playerId || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return { valid: false, error: 'El enlace directo ha caducado. Solicita uno nuevo a la directiva del club.' };
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`direct-consent:${playerId}:${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Firma de seguridad no válida.' };
    }

    return { valid: true, playerId, prefill: payload.prefill };
  } catch {
    return { valid: false, error: 'Error al verificar el enlace directo.' };
  }
}

/**
 * Obtiene los datos del deportista mediante Enlace Directo (sin solicitar fecha ni DNI).
 * Pre-rellena automáticamente todos los datos conocidos del deportista o del tutor legal
 * para ahorrar tiempo al firmante. Emite inmediatamente un token de verificación seguro para el Paso 2.
 */
export async function getPlayerDataForDirectConsent(
  playerId: string,
  tokenPrefill?: DirectConsentPrefill
): Promise<VerificationResult> {
  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    birth_date: string | null;
    dni_last5: string | null;
    dni_encrypted: string | null;
    parent_name?: string | null;
    parent_dni?: string | null;
    parent_relationship?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
  }>(
    `SELECT player_id, player_name, team_id, birth_year, birth_date, dni_last5, dni_encrypted,
            parent_name, parent_dni, parent_relationship, contact_phone, contact_email
     FROM player_census WHERE player_id = $1 LIMIT 1;`,
    [playerId]
  );

  let censusRecord = rows[0];

  if (!censusRecord) {
    const staticPlayer = FAVB_PLAYERS.find((p) => p.id === playerId);
    if (!staticPlayer) {
      return {
        valid: false,
        error: 'Deportista no encontrado en el censo oficial del club.',
      };
    }
    censusRecord = {
      player_id: staticPlayer.id,
      player_name: `${staticPlayer.firstName} ${staticPlayer.lastName}`.trim(),
      team_id: staticPlayer.teamId,
      birth_year: staticPlayer.birthYear || null,
      birth_date: null,
      dni_last5: null,
      dni_encrypted: null,
    };
  }

  const currentYear = 2026;
  const isMinor = (censusRecord.birth_year || 2010) > currentYear - 18;

  // Descifrar DNI si está disponible de forma segura
  let decryptedDni = '';
  if (censusRecord.dni_encrypted) {
    try {
      decryptedDni = decryptData(censusRecord.dni_encrypted);
    } catch {
      decryptedDni = '';
    }
  }

  // Comprobar si ya existe consentimiento firmado
  const consentRows = await queryNeon<{
    id: string;
    signer_name: string;
    signer_dni: string;
    signer_relationship: string;
    signer_phone: string | null;
    signer_email: string | null;
    consent_social_media: boolean;
    consent_streaming: boolean;
    consent_press: boolean;
    consent_travel: boolean;
    medical_notes: string | null;
    created_at: string;
  }>(
    `SELECT id, signer_name, signer_dni, signer_relationship, signer_phone, signer_email,
            consent_social_media, consent_streaming, consent_press, 
            COALESCE(consent_travel, true) AS consent_travel,
            medical_notes, created_at 
     FROM player_consents WHERE player_id = $1 LIMIT 1;`,
    [playerId]
  );

  const existing = consentRows[0];

  // Construir datos pre-rellenados basados en lo que ya sabemos y disponemos
  let prefilledData: DirectConsentPrefill;
  if (!isMinor) {
    // Mayor de edad (+18): El firmante es el propio deportista
    prefilledData = {
      signerName: tokenPrefill?.signerName || censusRecord.player_name,
      signerDni: tokenPrefill?.signerDni || decryptedDni || censusRecord.dni_last5 || '',
      signerRelationship: 'PROPIO_JUGADOR',
      signerPhone: tokenPrefill?.signerPhone || censusRecord.contact_phone || '',
      signerEmail: tokenPrefill?.signerEmail || censusRecord.contact_email || '',
    };
  } else {
    // Menor de edad: Datos del padre/madre/tutor legal
    prefilledData = {
      signerName: tokenPrefill?.signerName || existing?.signer_name || censusRecord.parent_name || '',
      signerDni: tokenPrefill?.signerDni || existing?.signer_dni || censusRecord.parent_dni || '',
      signerRelationship: (tokenPrefill?.signerRelationship || existing?.signer_relationship || censusRecord.parent_relationship || 'MADRE') as any,
      signerPhone: tokenPrefill?.signerPhone || existing?.signer_phone || censusRecord.contact_phone || '',
      signerEmail: tokenPrefill?.signerEmail || existing?.signer_email || censusRecord.contact_email || '',
    };
  }

  if (existing) {
    return {
      valid: true,
      alreadySigned: true,
      verificationToken: createConsentVerificationToken(censusRecord.player_id),
      prefilledData,
      player: {
        id: censusRecord.player_id,
        name: censusRecord.player_name,
        teamId: censusRecord.team_id,
        teamName: getTeamNameById(censusRecord.team_id),
        birthYear: censusRecord.birth_year || 2010,
        isMinor,
      },
      existingConsent: {
        id: existing.id,
        signedAt: existing.created_at,
        signerName: existing.signer_name,
        signerDni: maskDni(existing.signer_dni),
        signerRelationship: existing.signer_relationship,
        consentSocialMedia: existing.consent_social_media,
        consentStreaming: existing.consent_streaming,
        consentPress: existing.consent_press,
        consentTravel: existing.consent_travel,
        medicalNotes: existing.medical_notes || undefined,
      },
    };
  }

  return {
    valid: true,
    alreadySigned: false,
    verificationToken: createConsentVerificationToken(censusRecord.player_id),
    prefilledData,
    player: {
      id: censusRecord.player_id,
      name: censusRecord.player_name,
      teamId: censusRecord.team_id,
      teamName: getTeamNameById(censusRecord.team_id),
      birthYear: censusRecord.birth_year || 2010,
      isMinor,
    },
  };
}

/**
 * Actualiza los datos de tutor y contacto en la ficha del censo para que queden persistidos
 */
export async function updatePlayerCensusParentInfo(
  playerId: string,
  data: DirectConsentPrefill
): Promise<{ success: boolean; error?: string }> {
  try {
    await queryNeon(
      `UPDATE player_census 
       SET parent_name = COALESCE($1, parent_name),
           parent_dni = COALESCE($2, parent_dni),
           parent_relationship = COALESCE($3, parent_relationship),
           contact_phone = COALESCE($4, contact_phone),
           contact_email = COALESCE($5, contact_email),
           updated_at = NOW()
       WHERE player_id = $6;`,
      [
        data.signerName || null,
        data.signerDni || null,
        data.signerRelationship || null,
        data.signerPhone || null,
        data.signerEmail || null,
        playerId,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error('[ConsentStore] Error updating parent info:', err);
    return { success: false, error: 'Error al actualizar los datos en el censo' };
  }
}

export interface BatchDirectConsentItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  birthYear: number | null;
  isMinor: boolean;
  isSigned: boolean;
  signerName: string;
  signerDni: string;
  signerRelationship: string;
  signerPhone: string;
  signerEmail: string;
  directToken: string;
  directUrl: string;
  whatsappText: string;
  whatsappUrl: string;
}

/**
 * Generación masiva o por lotes de Enlaces Directos Oficiales con tokens HMAC y datos pre-rellenados.
 * Permite seleccionar un conjunto de deportistas o un equipo completo y genera instantáneamente
 * los enlaces individuales, mensajes de WhatsApp y resúmenes para exportación a Excel / CSV.
 */
export async function getBatchDirectConsentData(
  playerIds: string[],
  baseUrl: string,
  daysValid = 30
): Promise<BatchDirectConsentItem[]> {
  if (!playerIds || playerIds.length === 0) return [];

  const rows = await queryNeon<{
    player_id: string;
    player_name: string;
    team_id: string;
    birth_year: number | null;
    dni_last5: string | null;
    dni_encrypted: string | null;
    parent_name?: string | null;
    parent_dni?: string | null;
    parent_relationship?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    consent_id?: string | null;
    c_signer_name?: string | null;
    c_signer_dni?: string | null;
    c_signer_relationship?: string | null;
    c_signer_phone?: string | null;
    c_signer_email?: string | null;
  }>(
    `SELECT c.player_id, c.player_name, c.team_id, c.birth_year, c.dni_last5, c.dni_encrypted,
            c.parent_name, c.parent_dni, c.parent_relationship, c.contact_phone, c.contact_email,
            p.id AS consent_id, p.signer_name AS c_signer_name, p.signer_dni AS c_signer_dni,
            p.signer_relationship AS c_signer_relationship, p.signer_phone AS c_signer_phone,
            p.signer_email AS c_signer_email
     FROM player_census c
     LEFT JOIN player_consents p ON c.player_id = p.player_id
     WHERE c.player_id = ANY($1)
     ORDER BY c.team_id ASC, c.player_name ASC;`,
    [playerIds]
  );

  const currentYear = 2026;
  const items: BatchDirectConsentItem[] = [];

  for (const r of rows) {
    const isMinor = (r.birth_year || 2008) > currentYear - 18;
    const teamName = getTeamNameById(r.team_id);

    let signerName = '';
    let signerDni = '';
    let signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR' = isMinor ? 'MADRE' : 'PROPIO_JUGADOR';
    let signerPhone = r.contact_phone || r.c_signer_phone || '';
    let signerEmail = r.contact_email || r.c_signer_email || '';

    if (isMinor) {
      signerName = r.c_signer_name || r.parent_name || '';
      signerDni = r.c_signer_dni || r.parent_dni || '';
      const relCandidate = r.c_signer_relationship || r.parent_relationship || 'MADRE';
      if (['PADRE', 'MADRE', 'TUTOR_LEGAL', 'PROPIO_JUGADOR'].includes(relCandidate)) {
        signerRelationship = relCandidate as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
      } else {
        signerRelationship = 'MADRE';
      }
    } else {
      signerName = r.player_name;
      signerRelationship = 'PROPIO_JUGADOR';
      if (r.c_signer_dni) {
        signerDni = r.c_signer_dni;
      } else if (r.dni_encrypted) {
        const decrypted = decryptData(r.dni_encrypted);
        if (decrypted) signerDni = decrypted;
      }
    }

    const prefill: DirectConsentPrefill = {
      signerName: signerName || undefined,
      signerDni: signerDni || undefined,
      signerRelationship: signerRelationship || undefined,
      signerPhone: signerPhone || undefined,
      signerEmail: signerEmail || undefined,
    };

    const directToken = createDirectConsentToken(r.player_id, prefill, daysValid);
    const directUrl = `${baseUrl}/autorizaciones?directToken=${directToken}`;

    // Mensaje de WhatsApp personalizado adaptado al deportista o familia
    let whatsappText = '';
    const recipientGreeting = signerName ? `*${signerName}*` : 'estimada familia';

    if (isMinor) {
      whatsappText = `Hola ${recipientGreeting}, te escribimos desde el ${CLUB_INFO.name}.\n\nPor favor, accede al siguiente enlace oficial para firmar digitalmente las autorizaciones de la temporada 2026/2027 (Cesión de Imagen y Desplazamientos) de *${r.player_name}* (${teamName}):\n\n👉 ${directUrl}\n\nHemos auto-rellenado los datos de los que disponemos para tu comodidad; solo debes revisarlos y trazar la firma en pantalla. ¡Muchas gracias por tu colaboración!`;
    } else {
      whatsappText = `Hola *${r.player_name}*, te escribimos desde el ${CLUB_INFO.name}.\n\nPor favor, accede al siguiente enlace oficial para formalizar tus autorizaciones oficiales de la temporada 2026/2027 (${teamName}):\n\n👉 ${directUrl}\n\nTus datos federativos ya están pre-rellenados; solo debes revisarlos y firmar. ¡Muchas gracias!`;
    }

    // URL de WhatsApp con teléfono directo si está disponible
    const cleanDigits = signerPhone.replace(/\D/g, '');
    const phoneParam = cleanDigits.length >= 9 ? (cleanDigits.startsWith('34') ? cleanDigits : `34${cleanDigits}`) : '';
    const whatsappUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    items.push({
      playerId: r.player_id,
      playerName: r.player_name,
      teamId: r.team_id,
      teamName,
      birthYear: r.birth_year,
      isMinor,
      isSigned: !!r.consent_id,
      signerName,
      signerDni,
      signerRelationship,
      signerPhone,
      signerEmail,
      directToken,
      directUrl,
      whatsappText,
      whatsappUrl,
    });
  }

  return items;
}
