import crypto from 'crypto';
import { cookies } from 'next/headers';
import { queryNeon } from '@/lib/streaming-store';
import { encryptData, decryptDataStrict } from '@/lib/encryption';
import { sendSmtpMail } from '@/lib/email-otp';
import { CLUB_INFO } from '@/lib/club-info';
import { isStrictEmail } from '@/lib/validators';
import {
  buildUserAccessContext,
  IntranetAuthError,
  IntranetValidationError,
  type IntranetAccessContext,
  type IntranetSessionUser,
} from './rbac';
import { ensureIntranetSeeded } from './seed-bootstrap';
import { recordAuditLog } from './audit';
import type { RoleCode } from './catalog';

export const INTRANET_SESSION_COOKIE = 'cdv_intranet_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Obtiene el secreto de firma de sesiones de intranet sin fallbacks hardcodeados.
 */
export function getIntranetSessionSecret(): string {
  const secret =
    process.env.INTRANET_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    '';
  if (!secret || secret.length < 32) {
    throw new Error(
      '[Security] INTRANET_SESSION_SECRET o ADMIN_SESSION_SECRET no configurado o insuficiente (>= 32 chars).'
    );
  }
  return secret;
}

/**
 * Hashea una contraseña con `scrypt` (N=16384, r=8, p=1) y sal aleatoria de 16 bytes.
 */
export function hashIntranetPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt:16384:8:1:${salt}:${derived}`;
}

/**
 * Verifica una contraseña contra el hash `scrypt` en tiempo constante.
 */
export function verifyIntranetPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash) return false;
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expectedHex = parts[5];
    if (!salt || !expectedHex || !Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
      return false;
    }
    const derived = crypto.scryptSync(password, salt, 64, { N, r, p });
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

export function hashOpaqueToken(rawToken: string): string {
  return crypto
    .createHmac('sha256', getIntranetSessionSecret())
    .update(rawToken.trim())
    .digest('hex');
}

// ==========================================
// TOTP 2FA (RFC 6238) PURO CON NODE CRYPTO
// ==========================================

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function buildTotpOtpauthUri(email: string, secretBase32: string): string {
  const issuer = 'CDV San Pedro';
  const label = encodeURIComponent(`${issuer}:${email.trim().toLowerCase()}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function computeTotpAtStep(secretBase32: string, stepCounter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(stepCounter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secretBase32: string, rawCode: string): boolean {
  const code = String(rawCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 1; delta++) {
    const expected = computeTotpAtStep(secretBase32, currentStep + delta);
    if (crypto.timingSafeEqual(Buffer.from(code, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return true;
    }
  }
  return false;
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
  }
  return codes;
}

export function encryptTotpSecret(userId: string, secretBase32: string): string {
  return encryptData(secretBase32, `totp-secret:${userId}`);
}

export function decryptTotpSecret(userId: string, cipherText: string | null): string | null {
  if (!cipherText) return null;
  const res = decryptDataStrict(cipherText, `totp-secret:${userId}`);
  return res.ok ? res.value : null;
}

// ==========================================
// SESIONES EN BASE DE DATOS Y COOKIES
// ==========================================

export async function createIntranetSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  twoFactorVerified?: boolean;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await queryNeon(
    `INSERT INTO intranet_sessions (
       token_hash, user_id, ip_address, user_agent, two_factor_verified, expires_at
     ) VALUES ($1, $2::uuid, $3, $4, $5, $6::timestamptz);`,
    [
      tokenHash,
      params.userId,
      params.ipAddress || null,
      params.userAgent ? params.userAgent.slice(0, 300) : null,
      params.twoFactorVerified ?? true,
      expiresAt.toISOString(),
    ]
  );

  await queryNeon(
    `UPDATE intranet_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1::uuid;`,
    [params.userId]
  );

  return { rawToken, expiresAt };
}

export function setIntranetSessionCookie(rawToken: string, expiresAt: Date): void {
  const cookieStore = cookies();
  cookieStore.set({
    name: INTRANET_SESSION_COOKIE,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearIntranetSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set({
    name: INTRANET_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Obtiene el contexto de acceso actual validando sesión persistente y RBAC contra Neon.
 */
export async function getIntranetSession(): Promise<IntranetAccessContext | null> {
  await ensureIntranetSeeded();

  const cookieStore = cookies();
  const rawToken = cookieStore.get(INTRANET_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashOpaqueToken(rawToken);
  const rows = await queryNeon<{
    session_id: string;
    two_factor_verified: boolean;
    user_id: string;
    email: string;
    name: string;
    phone: string | null;
    email_verified: boolean;
    totp_enabled: boolean;
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  }>(
    `SELECT
       s.id::text AS session_id,
       s.two_factor_verified,
       u.id::text AS user_id,
       u.email,
       u.name,
       u.phone,
       u.email_verified,
       u.totp_enabled,
       u.status
     FROM intranet_sessions s
     INNER JOIN intranet_users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.status = 'ACTIVE'
     LIMIT 1;`,
    [tokenHash]
  );

  const row = rows[0];
  if (!row) return null;

  const user: IntranetSessionUser = {
    id: row.user_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    emailVerified: row.email_verified,
    totpEnabled: row.totp_enabled,
    status: row.status,
  };

  return buildUserAccessContext({
    sessionId: row.session_id,
    twoFactorVerified: row.two_factor_verified,
    user,
  });
}

/**
 * Exige una sesión activa y verificada.
 */
export async function requireIntranetSession(_options?: {
  allowPendingTwoFactor?: boolean;
}): Promise<IntranetAccessContext> {
  const ctx = await getIntranetSession();
  if (!ctx) {
    throw new IntranetAuthError('Debes iniciar sesión para acceder.');
  }
  return ctx;
}

export async function revokeCurrentIntranetSession(): Promise<void> {
  const cookieStore = cookies();
  const rawToken = cookieStore.get(INTRANET_SESSION_COOKIE)?.value;
  if (rawToken) {
    const tokenHash = hashOpaqueToken(rawToken);
    await queryNeon(
      `UPDATE intranet_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL;`,
      [tokenHash]
    );
  }
  clearIntranetSessionCookie();
}

export async function markSessionTwoFactorVerified(sessionId: string): Promise<void> {
  await queryNeon(
    `UPDATE intranet_sessions SET two_factor_verified = true WHERE id = $1::uuid;`,
    [sessionId]
  );
}

// ==========================================
// INVITACIONES Y ENLACES MÁGICOS
// ==========================================

export function getPublicBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.URL?.trim() ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export async function createIntranetInvitation(params: {
  email: string;
  targetType: 'STAFF' | 'GUARDIAN' | 'ATHLETE';
  roleCodes: RoleCode[];
  teamSeasonIds?: string[];
  athleteId?: string | null;
  metadata?: Record<string, unknown>;
  invitedByUserId?: string | null;
  expiresDays?: number;
  sendEmail?: boolean;
  recipientName?: string;
}): Promise<{ id: string; rawToken: string; inviteUrl: string; emailSent: boolean; emailError?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!isStrictEmail(cleanEmail)) {
    throw new Error('Correo electrónico no válido para la invitación.');
  }

  const rawToken = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashOpaqueToken(rawToken);
  const days = Math.min(Math.max(1, params.expiresDays ?? 14), 30);

  const rows = await queryNeon<{ id: string }>(
    `INSERT INTO intranet_invitations (
       token_hash, email, target_type, role_codes, team_season_ids, athlete_id,
       metadata_json, invited_by, expires_at
     ) VALUES ($1, $2, $3, $4::text[], $5::text[], $6, $7::jsonb, $8::uuid, NOW() + ($9 || ' days')::interval)
     RETURNING id::text AS id;`,
    [
      tokenHash,
      cleanEmail,
      params.targetType,
      params.roleCodes,
      params.teamSeasonIds || [],
      params.athleteId || null,
      JSON.stringify(params.metadata || {}),
      params.invitedByUserId || null,
      String(days),
    ]
  );

  const invitePath =
    params.targetType === 'STAFF'
      ? `/acceso?invite=${encodeURIComponent(rawToken)}`
      : `/mi-club/onboarding?invite=${encodeURIComponent(rawToken)}`;
  const inviteUrl = `${getPublicBaseUrl()}${invitePath}`;

  let emailSent = false;
  let emailError: string | undefined;

  if (params.sendEmail !== false) {
    const safeName = (params.recipientName || cleanEmail).replace(/[\r\n]/g, '').trim().slice(0, 80);
    const title =
      params.targetType === 'STAFF'
        ? 'Invitación al área interna de Staff'
        : 'Invitación a la Zona de Deportistas y Familias';
    const smtpRes = await sendSmtpMail({
      to: cleanEmail,
      subject: `[CDV San Pedro] ${title}`,
      text: [
        `${CLUB_INFO.name} · Acceso a la plataforma oficial`,
        ``,
        `Hola ${safeName},`,
        `Se ha generado tu invitación personal de acceso (${params.targetType === 'STAFF' ? 'Cuerpo Técnico / Directiva' : 'Familias / Deportistas'}).`,
        ``,
        `Completa tu activación en el siguiente enlace (válido durante ${days} días):`,
        inviteUrl,
        ``,
        `Si tienes dudas, escribe a ${CLUB_INFO.contactEmail}.`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
          <div style="background: #d90429; padding: 18px 24px; color: #ffffff;">
            <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)}</div>
            <h2 style="margin: 4px 0 0 0; font-size: 20px;">${escapeHtml(title)}</h2>
          </div>
          <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
            <p>Hola <strong>${escapeHtml(safeName)}</strong>,</p>
            <p>Has recibido una invitación personal para activar tu cuenta en la plataforma del club (<strong>voleibolsanpedro.es</strong>).</p>
            <p style="margin: 24px 0; text-align: center;">
              <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                Activar mi acceso ahora
              </a>
            </p>
            <p style="font-size: 12px; color: #52525b;">Este enlace personal es de un solo uso y caduca en ${days} días. Si el botón no funciona, copia esta dirección:<br/><span style="word-break: break-all;">${escapeHtml(inviteUrl)}</span></p>
          </div>
        </div>
      `,
    });
    emailSent = smtpRes.sent;
    emailError = smtpRes.error;
  }

  return {
    id: rows[0]?.id || '',
    rawToken,
    inviteUrl,
    emailSent,
    emailError,
  };
}

export async function inspectInvitationToken(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const rows = await queryNeon<{
    id: string;
    email: string;
    target_type: 'STAFF' | 'GUARDIAN' | 'ATHLETE';
    role_codes: RoleCode[];
    team_season_ids: string[];
    athlete_id: string | null;
    metadata_json: Record<string, unknown>;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }>(
    `SELECT id::text, email, target_type, role_codes, team_season_ids, athlete_id,
            COALESCE(metadata_json, '{}'::jsonb) AS metadata_json,
            expires_at::text, accepted_at::text, revoked_at::text
     FROM intranet_invitations
     WHERE token_hash = $1
     LIMIT 1;`,
    [tokenHash]
  );

  const inv = rows[0];
  if (!inv || inv.revoked_at || inv.accepted_at || new Date(inv.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return inv;
}

export interface ClaimedInvitationResult {
  invitationId: string;
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  targetType: 'STAFF' | 'GUARDIAN' | 'ATHLETE';
  roleCodes: RoleCode[];
}

/**
 * Reclama de forma atómica una invitación (por token o correo pendiente de usuario INVITED),
 * activa la cuenta, asigna roles/equipos y vincula ficha deportiva o tutela legal.
 */
export async function claimAndApplyInvitation(params: {
  rawToken?: string;
  expectedEmail?: string;
  name?: string;
  phone?: string | null;
  passwordHash?: string | null;
  revokeExistingSessions?: boolean;
}): Promise<ClaimedInvitationResult | null> {
  const cleanExpectedEmail = params.expectedEmail?.trim().toLowerCase() || null;

  type ClaimedRow = {
    id: string;
    email: string;
    target_type: 'STAFF' | 'GUARDIAN' | 'ATHLETE';
    role_codes: RoleCode[];
    team_season_ids: string[];
    athlete_id: string | null;
    metadata_json: Record<string, unknown>;
  };

  let claimedRows: ClaimedRow[] = [];

  if (params.rawToken) {
    const tokenHash = hashOpaqueToken(params.rawToken);
    claimedRows = await queryNeon<ClaimedRow>(
      `UPDATE intranet_invitations inv
       SET accepted_at = NOW()
       WHERE inv.token_hash = $1
         AND inv.accepted_at IS NULL
         AND inv.revoked_at IS NULL
         AND inv.expires_at > NOW()
         AND ($2::text IS NULL OR LOWER(inv.email) = $2)
         AND NOT EXISTS (
           SELECT 1 FROM intranet_users u
           WHERE LOWER(u.email) = LOWER(inv.email) AND u.status = 'SUSPENDED'
         )
       RETURNING inv.id::text, inv.email, inv.target_type, inv.role_codes,
                 inv.team_season_ids, inv.athlete_id,
                 COALESCE(inv.metadata_json, '{}'::jsonb) AS metadata_json;`,
      [tokenHash, cleanExpectedEmail]
    );
  } else if (cleanExpectedEmail) {
    claimedRows = await queryNeon<ClaimedRow>(
      `UPDATE intranet_invitations inv
       SET accepted_at = NOW()
       WHERE inv.id = (
         SELECT id
         FROM intranet_invitations
         WHERE LOWER(email) = $1
           AND accepted_at IS NULL
           AND revoked_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1
       )
       AND NOT EXISTS (
         SELECT 1 FROM intranet_users u
         WHERE LOWER(u.email) = LOWER(inv.email) AND u.status = 'SUSPENDED'
       )
       RETURNING inv.id::text, inv.email, inv.target_type, inv.role_codes,
                 inv.team_season_ids, inv.athlete_id,
                 COALESCE(inv.metadata_json, '{}'::jsonb) AS metadata_json;`,
      [cleanExpectedEmail]
    );
  }

  const inv = claimedRows[0];
  if (!inv) {
    return null;
  }

  const cleanEmail = inv.email.trim().toLowerCase();
  const metaName =
    typeof inv.metadata_json?.invitedName === 'string'
      ? inv.metadata_json.invitedName.trim()
      : typeof inv.metadata_json?.guardianName === 'string'
      ? inv.metadata_json.guardianName.trim()
      : typeof inv.metadata_json?.athleteName === 'string'
      ? inv.metadata_json.athleteName.trim()
      : '';
  const finalName = (params.name?.trim() || metaName || cleanEmail).slice(0, 140);
  const cleanPhone = params.phone?.trim() || null;

  const existingUsers = await queryNeon<{
    id: string;
    name: string;
    phone: string | null;
    status: string;
  }>(
    `SELECT id::text AS id, name, phone, status FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
    [cleanEmail]
  );

  let userId = existingUsers[0]?.id;
  let storedName = existingUsers[0]?.name || finalName;
  let storedPhone = existingUsers[0]?.phone || cleanPhone;

  if (!userId) {
    const inserted = await queryNeon<{ id: string }>(
      `INSERT INTO intranet_users (email, name, phone, password_hash, email_verified, status)
       VALUES ($1, $2, $3, $4, true, 'ACTIVE')
       RETURNING id::text AS id;`,
      [cleanEmail, finalName, cleanPhone, params.passwordHash || null]
    );
    userId = inserted[0].id;
    storedName = finalName;
    storedPhone = cleanPhone;
  } else {
    if (existingUsers[0].status === 'SUSPENDED') {
      throw new IntranetValidationError('La cuenta asociada está suspendida.', 403);
    }
    const updatedUser = await queryNeon<{ name: string; phone: string | null }>(
      `UPDATE intranet_users
       SET name = COALESCE(NULLIF($2, ''), name),
           phone = COALESCE($3, phone),
           password_hash = COALESCE($4, password_hash),
           email_verified = true,
           status = 'ACTIVE',
           updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING name, phone;`,
      [userId, params.name?.trim() || '', cleanPhone, params.passwordHash || null]
    );
    storedName = updatedUser[0]?.name || storedName;
    storedPhone = updatedUser[0]?.phone || storedPhone;

    if (params.passwordHash && params.revokeExistingSessions !== false) {
      await queryNeon(
        `UPDATE intranet_sessions SET revoked_at = NOW() WHERE user_id = $1::uuid AND revoked_at IS NULL;`,
        [userId]
      );
    }
  }

  for (const roleCode of inv.role_codes || []) {
    if (roleCode === 'PRESIDENTE') continue;
    if (
      inv.team_season_ids &&
      inv.team_season_ids.length > 0 &&
      ['ENTRENADOR', 'AYUDANTE', 'DELEGADO'].includes(roleCode)
    ) {
      for (const teamId of inv.team_season_ids) {
        await queryNeon(
          `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id)
           SELECT $1::uuid, $2, $3
           WHERE NOT EXISTS (
             SELECT 1 FROM intranet_user_roles
             WHERE user_id = $1::uuid AND role_code = $2 AND team_season_id = $3 AND valid_to IS NULL
           );`,
          [userId, roleCode, teamId]
        );
        const fn =
          roleCode === 'ENTRENADOR'
            ? 'HEAD_COACH'
            : roleCode === 'AYUDANTE'
            ? 'ASSISTANT'
            : 'DELEGATE';
        await queryNeon(
          `INSERT INTO intranet_team_staff (user_id, team_season_id, staff_function)
           VALUES ($1::uuid, $2, $3)
           ON CONFLICT (user_id, team_season_id, staff_function) DO UPDATE SET valid_to = NULL;`,
          [userId, teamId, fn]
        );
      }
    } else {
      await queryNeon(
        `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id)
         SELECT $1::uuid, $2, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM intranet_user_roles
           WHERE user_id = $1::uuid AND role_code = $2 AND team_season_id IS NULL AND valid_to IS NULL
         );`,
        [userId, roleCode]
      );
    }
  }

  if (inv.athlete_id) {
    if (inv.target_type === 'ATHLETE') {
      await queryNeon(
        `UPDATE intranet_athletes
         SET user_id = $2::uuid,
             status = CASE WHEN status = 'SHREDDED' THEN status ELSE 'VERIFICADO' END,
             verified_at = COALESCE(verified_at, NOW()),
             updated_at = NOW()
         WHERE id = $1 AND status <> 'SHREDDED';`,
        [inv.athlete_id, userId]
      );
    } else if (inv.target_type === 'GUARDIAN') {
      const updatedG = await queryNeon<{ id: string }>(
        `UPDATE intranet_guardianships
         SET guardian_user_id = $2::uuid
         WHERE athlete_id = $1 AND (LOWER(email) = $3 OR guardian_user_id IS NULL)
         RETURNING id::text AS id;`,
        [inv.athlete_id, userId, cleanEmail]
      );
      if (updatedG.length === 0) {
        await queryNeon(
          `INSERT INTO intranet_guardianships (
             athlete_id, guardian_user_id, full_name, relationship, email, phone, is_primary_payer
           )
           SELECT $1, $2::uuid, $3, 'TUTOR_LEGAL', $4, $5, true
           WHERE NOT EXISTS (
             SELECT 1 FROM intranet_guardianships
             WHERE athlete_id = $1 AND guardian_user_id = $2::uuid
           );`,
          [inv.athlete_id, userId, storedName, cleanEmail, storedPhone]
        );
      }
    }
  }

  return {
    invitationId: inv.id,
    userId,
    email: cleanEmail,
    name: storedName,
    phone: storedPhone,
    targetType: inv.target_type,
    roleCodes: inv.role_codes,
  };
}

export async function createMagicLoginToken(email: string): Promise<{
  sent: boolean;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isStrictEmail(cleanEmail)) {
    return { sent: false, error: 'Introduce un correo electrónico válido.' };
  }

  // Solo enviar si existe usuario ACTIVE o invitación vigente (anti-enumeración en respuesta pública)
  const users = await queryNeon<{ id: string; name: string; status: string }>(
    `SELECT id::text, name, status FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
    [cleanEmail]
  );
  const existingUser = users[0];

  if (!existingUser || existingUser.status !== 'ACTIVE') {
    const invites = await queryNeon<{ id: string }>(
      `SELECT id::text FROM intranet_invitations
       WHERE LOWER(email) = $1 AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > NOW()
       LIMIT 1;`,
      [cleanEmail]
    );
    if (invites.length === 0) {
      // Responder con éxito genérico para no filtrar qué emails existen
      return { sent: true };
    }
  }

  const rawToken = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashOpaqueToken(rawToken);

  await queryNeon(
    `INSERT INTO intranet_auth_tokens (token_hash, user_id, email, purpose, expires_at)
     VALUES ($1, $2::uuid, $3, 'MAGIC_LOGIN', NOW() + INTERVAL '15 minutes');`,
    [tokenHash, existingUser?.id || null, cleanEmail]
  );

  const magicUrl = `${getPublicBaseUrl()}/acceso?magic=${encodeURIComponent(rawToken)}`;
  const mailRes = await sendSmtpMail({
    to: cleanEmail,
    subject: `[CDV San Pedro] Enlace directo de acceso`,
    text: [
      `${CLUB_INFO.name}`,
      ``,
      `Usa este enlace de un solo uso para iniciar sesión (caduca en 15 minutos):`,
      magicUrl,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 10px; padding: 24px;">
        <h2 style="margin-top: 0; color: #18181b;">Enlace de acceso rápido</h2>
        <p style="font-size: 14px; color: #3f3f46;">Pulsa el botón para entrar en tu cuenta del <strong>${escapeHtml(CLUB_INFO.name)}</strong>. Caduca en 15 minutos y es de un solo uso.</p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${escapeHtml(magicUrl)}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Entrar al portal</a>
        </p>
      </div>
    `,
  });

  return { sent: mailRes.sent, error: mailRes.error };
}

export async function consumeMagicLoginToken(rawToken: string): Promise<{
  email: string;
  userId: string | null;
} | null> {
  const tokenHash = hashOpaqueToken(rawToken);
  const rows = await queryNeon<{ email: string; user_id: string | null }>(
    `UPDATE intranet_auth_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND purpose = 'MAGIC_LOGIN'
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING email, user_id::text;`,
    [tokenHash]
  );
  if (rows.length === 0) return null;
  return { email: rows[0].email, userId: rows[0].user_id };
}

// ==========================================
// OAUTH2 (GOOGLE OIDC)
// ==========================================

export type OAuthProviderKey = 'google';

export function getOAuthProviderConfig(provider: OAuthProviderKey) {
  const callbackUrl = `${getPublicBaseUrl()}/api/intranet/auth/oauth/${provider}/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    callbackUrl,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'openid email profile',
  };
}

/**
 * Comprueba si una cuenta no-staff sigue bloqueada por tener solicitudes de inscripción
 * pendientes de validación administrativa o fichas sin verificar (sin invitación aceptada).
 */
export async function isMemberBlockedByPendingApproval(
  userId: string,
  ctx: IntranetAccessContext
): Promise<{ blocked: boolean; pendingRequests: number; pendingAthletes: number }> {
  if (ctx.isStaff) {
    return { blocked: false, pendingRequests: 0, pendingAthletes: 0 };
  }

  const linkedAthleteIds = Array.from(
    new Set([...(ctx.ownAthleteId ? [ctx.ownAthleteId] : []), ...ctx.guardianAthleteIds])
  );

  const [athleteStatusRows, regReqRows] = await Promise.all([
    linkedAthleteIds.length > 0
      ? queryNeon<{ id: string; status: string; has_accepted_invite: boolean }>(
          `SELECT
             a.id,
             a.status,
             EXISTS (
               SELECT 1 FROM intranet_invitations inv
               WHERE inv.athlete_id = a.id AND inv.accepted_at IS NOT NULL
             ) AS has_accepted_invite
           FROM intranet_athletes a
           WHERE a.id = ANY($1::text[])
             AND a.status <> 'SHREDDED';`,
          [linkedAthleteIds]
        )
      : Promise.resolve([]),
    queryNeon<{ id: string; status: string }>(
      `SELECT id::text AS id, status
       FROM intranet_registration_requests
       WHERE user_id = $1::uuid
          OR ($2::int > 0 AND athlete_id = ANY($3::text[]));`,
      [userId, linkedAthleteIds.length, linkedAthleteIds]
    ),
  ]);

  const hasVerifiedAthlete = athleteStatusRows.some((a) => a.status === 'VERIFICADO');
  const pendingRequests = regReqRows.filter((r) => r.status === 'PENDING').length;
  const pendingAthletes = athleteStatusRows.filter(
    (a) => a.status === 'PENDIENTE_VALIDAR' && !a.has_accepted_invite
  ).length;

  // Si existen solicitudes de inscripción (pendientes, aprobadas o rechazadas),
  // permitimos entrar a /mi-club para consultar el estado y subsanar en caso necesario.
  return {
    blocked: !hasVerifiedAthlete && regReqRows.length === 0 && pendingAthletes > 0,
    pendingRequests,
    pendingAthletes,
  };
}

export function sealOAuthTxCookie(payload: {
  state: string;
  codeVerifier: string;
  provider: OAuthProviderKey;
  inviteToken?: string;
}): string {
  return encryptData(JSON.stringify(payload), 'intranet:oauth_tx');
}

export function unsealOAuthTxCookie(cipherText: string | undefined): {
  state: string;
  codeVerifier: string;
  provider: string;
  inviteToken?: string;
} | null {
  if (!cipherText) return null;
  const dec = decryptDataStrict(cipherText, 'intranet:oauth_tx');
  if (!dec.ok || !dec.value) return null;
  try {
    return JSON.parse(dec.value);
  } catch {
    return null;
  }
}

// ==========================================
// BOOTSTRAP DEL PRESIDENTE INICIAL
// ==========================================

export async function hasActivePresident(): Promise<boolean> {
  await ensureIntranetSeeded();
  const rows = await queryNeon<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt
     FROM intranet_user_roles ur
     INNER JOIN intranet_users u ON u.id = ur.user_id
     WHERE ur.role_code = 'PRESIDENTE'
       AND ur.valid_to IS NULL
       AND u.status = 'ACTIVE';`
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

export async function bootstrapPresidentUser(params: {
  email: string;
  name: string;
  password: string;
  phone?: string;
  ipAddress?: string;
}): Promise<{ userId: string }> {
  await ensureIntranetSeeded();
  const cleanEmail = params.email.trim().toLowerCase();
  if (!isStrictEmail(cleanEmail)) {
    throw new Error('Correo electrónico no válido.');
  }
  if (!params.password || params.password.length < 10) {
    throw new Error('La contraseña del Presidente debe tener al menos 10 caracteres.');
  }

  const already = await hasActivePresident();
  if (already) {
    throw new Error('Ya existe un Presidente activo en la base de datos.');
  }

  const passHash = hashIntranetPassword(params.password);
  const existingUsers = await queryNeon<{ id: string }>(
    `SELECT id::text AS id FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
    [cleanEmail]
  );

  let userId = existingUsers[0]?.id;
  if (!userId) {
    const inserted = await queryNeon<{ id: string }>(
      `INSERT INTO intranet_users (email, name, phone, password_hash, email_verified, status)
       VALUES ($1, $2, $3, $4, true, 'ACTIVE')
       RETURNING id::text AS id;`,
      [cleanEmail, params.name.trim(), params.phone?.trim() || null, passHash]
    );
    userId = inserted[0].id;
  } else {
    await queryNeon(
      `UPDATE intranet_users
       SET name = $2, phone = COALESCE($3, phone), password_hash = $4,
           email_verified = true, status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1::uuid;`,
      [userId, params.name.trim(), params.phone?.trim() || null, passHash]
    );
  }

  await queryNeon(
    `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id, granted_by)
     VALUES ($1::uuid, 'PRESIDENTE', NULL, $1::uuid);`,
    [userId]
  );

  await recordAuditLog({
    actorUserId: userId,
    actorEmail: cleanEmail,
    action: 'BOOTSTRAP_PRESIDENT',
    module: 'Gobernanza',
    targetType: 'USER',
    targetId: userId,
    details: { name: params.name.trim() },
    ipAddress: params.ipAddress,
  });

  return { userId };
}
