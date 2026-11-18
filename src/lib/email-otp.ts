import tls from 'tls';
import crypto from 'crypto';
import { CLUB_INFO } from './club-info';
import { CLUB_LOGO_BASE64 } from './club-logo-base64';
import { generateConsentPdf } from './pdf-consent';
import { isStrictEmail, stripCrlf, sanitizeHttpsUrl } from './validators';
import { getOtpPepper, maskDni } from './encryption';
import { queryNeon } from './streaming-store';
import type { SignatureMethod } from './consent-store';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
}

export interface SmtpAttachment {
  filename: string;
  contentBase64: string;
  contentType?: string;
  cid?: string;
  inline?: boolean;
}

export interface BatchEmailMessage {
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: SmtpAttachment[];
}

export interface BatchEmailResult {
  index: number;
  to: string;
  sent: boolean;
  error?: string;
}

export interface OtpChallengeCreationResult {
  challengeId: string;
  code: string;
  expiresAtIso: string;
}

export interface OtpChallengeVerificationResult {
  valid: boolean;
  remainingAttempts?: number;
  error?: string;
}

const CLUB_LOGO_CID = 'club-logo@voleibolsanpedro.es';
const SIGNER_SIGNATURE_CID = 'signer-signature@voleibolsanpedro.es';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH_TLS_POOL = 15;

/**
 * Devuelve el correo destinatario institucional de copia del club.
 */
export function getClubCopyEmail(): string {
  const configured = process.env.CONSENT_CLUB_CC_EMAIL?.trim();
  if (configured && isStrictEmail(configured)) {
    return configured;
  }
  return CLUB_INFO.contactEmail;
}

function getClubLogoBase64Raw(): string {
  return CLUB_LOGO_BASE64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
}

function escapeHtml(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOfficialClubEmailHtml(params: {
  badgeText: string;
  badgeBg?: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
}): string {
  const badgeBg = params.badgeBg || '#fef2f2';
  const badgeColor = params.badgeColor || '#b91c1c';

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 20px 12px; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; color: #111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="background-color: #dc2626; height: 5px; line-height: 5px; font-size: 0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding: 22px 26px 18px 26px; border-bottom: 1px solid #e4e4e7; background-color: #ffffff;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="72" valign="middle" style="padding-right: 14px;">
                <img src="cid:${CLUB_LOGO_CID}" alt="Escudo ${escapeHtml(CLUB_INFO.name)}" width="62" height="42" style="display: block; width: 62px; height: auto; border-radius: 6px; border: 1px solid #e4e4e7; background-color: #ffffff; padding: 2px;" />
              </td>
              <td valign="middle">
                <div style="font-size: 16px; font-weight: bold; color: #111827; letter-spacing: 0.4px; text-transform: uppercase;">
                  ${escapeHtml(CLUB_INFO.name)}
                </div>
                <div style="font-size: 12px; color: #52525b; margin-top: 2px;">
                  ${escapeHtml(params.subtitle)}
                </div>
                <div style="margin-top: 8px;">
                  <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33; font-size: 10px; font-weight: bold; letter-spacing: 0.6px; text-transform: uppercase; padding: 3px 8px; border-radius: 4px;">
                    ${escapeHtml(params.badgeText)}
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 26px; background-color: #ffffff; color: #111827;">
          <h1 style="margin: 0 0 14px 0; font-size: 18px; line-height: 1.3; color: #111827;">
            ${escapeHtml(params.title)}
          </h1>
          ${params.bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 26px; background-color: #f9fafb; border-top: 1px solid #e4e4e7;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="58" valign="top" style="padding-right: 14px;">
                <img src="cid:${CLUB_LOGO_CID}" alt="Escudo Oficial" width="48" height="32" style="display: block; width: 48px; height: auto; border-radius: 5px; border: 1px solid #d4d4d8; background-color: #ffffff; padding: 2px;" />
              </td>
              <td valign="top" style="font-size: 12px; line-height: 1.5; color: #3f3f46;">
                <div style="font-weight: bold; color: #111827; font-size: 13px;">
                  Junta Directiva y Secretaría · ${escapeHtml(CLUB_INFO.name)}
                </div>
                <div style="font-size: 11px; color: #52525b;">
                  CIF: ${escapeHtml(CLUB_INFO.cif)} · Protocolo Marco de Menores (Junta de Andalucía)
                </div>
                <div style="font-size: 11px; color: #52525b; margin-top: 3px;">
                  Sede: ${escapeHtml(CLUB_INFO.venueName)} · ${escapeHtml(CLUB_INFO.officialAddress)}
                </div>
                <div style="font-size: 11px; color: #3f3f46; margin-top: 4px;">
                  Web: <a href="https://voleibolsanpedro.es" style="color: #dc2626; text-decoration: none; font-weight: bold;">voleibolsanpedro.es</a>
                  &nbsp;·&nbsp; Secretaría: <a href="mailto:${escapeHtml(CLUB_INFO.contactEmail)}" style="color: #dc2626; text-decoration: none;">${escapeHtml(CLUB_INFO.contactEmail)}</a>
                  &nbsp;·&nbsp; Tel: ${escapeHtml(CLUB_INFO.contactPhone)}
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e4e4e7; font-size: 10px; line-height: 1.45; color: #71717a;">
            Comunicaciones oficiales generadas desde <strong>${escapeHtml(CLUB_INFO.contactEmail)}</strong>. Información tratada conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD) bajo responsabilidad de ${escapeHtml(CLUB_INFO.name)}.
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

export function getSmtpConfig(): SmtpConfig | null {
  const pass = process.env.SMTP_PASS || process.env.ZOHO_SMTP_PASS || '';
  if (!pass) return null;

  const user = (process.env.SMTP_USER || CLUB_INFO.contactEmail).trim();
  if (!isStrictEmail(user)) return null;

  return {
    host: (process.env.SMTP_HOST || 'smtp.zoho.eu').trim(),
    port: Number(process.env.SMTP_PORT || 465),
    user,
    pass,
    fromName: stripCrlf(CLUB_INFO.name),
  };
}

export function isEmailOtpEnabled(): boolean {
  return getSmtpConfig() !== null;
}

export function isDevConsoleOtpBypassAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NETLIFY !== 'true' &&
    process.env.ALLOW_DEV_CONSOLE_OTP === 'true'
  );
}

export type OtpChallengePurpose = 'SIGN' | 'REVOKE' | 'RECEIPT';

export function hashNormalizedEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function computeOtpCodeHash(
  challengeId: string,
  playerId: string,
  emailHash: string,
  code: string,
  purpose?: OtpChallengePurpose
): string {
  const pepper = getOtpPepper();
  const prefix = purpose ? `otp-v2:${purpose}` : 'otp-v1';
  return crypto
    .createHmac('sha256', pepper)
    .update(`${prefix}:${challengeId}:${playerId}:${emailHash}:${code.trim()}`)
    .digest('hex');
}

async function cleanupExpiredOtpChallengesProbabilistic(): Promise<void> {
  if (Math.random() >= 0.03) return;
  try {
    await queryNeon(
      `DELETE FROM otp_challenges
       WHERE expires_at < NOW() - INTERVAL '24 hours';`
    );
  } catch {
    // Purga oportunista no bloqueante
  }
}

/**
 * Crea y persiste en Neon (`otp_challenges`) un reto OTP de 6 dígitos de un solo uso (15 min),
 * ligado criptográficamente a un propósito (`SIGN` | `REVOKE` | `RECEIPT`), invalidando retos activos previos.
 */
export async function createEmailOtpChallenge(params: {
  playerId: string;
  email: string;
  purpose?: OtpChallengePurpose;
}): Promise<OtpChallengeCreationResult> {
  const playerId = params.playerId.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const purpose: OtpChallengePurpose =
    params.purpose === 'REVOKE' || params.purpose === 'RECEIPT' ? params.purpose : 'SIGN';

  if (!playerId || !isStrictEmail(cleanEmail)) {
    throw new Error('Datos inválidos para generar el código OTP.');
  }

  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(100000, 1000000));
  const emailHash = hashNormalizedEmail(cleanEmail);
  const codeHash = computeOtpCodeHash(challengeId, playerId, emailHash, code, purpose);

  const rows = await queryNeon<{ expires_at: string }>(
    `WITH invalidated AS (
       UPDATE otp_challenges
       SET used_at = NOW()
       WHERE player_id = $2
         AND email_hash = $3
         AND used_at IS NULL
     ),
     ins AS (
       INSERT INTO otp_challenges (id, player_id, email_hash, code_hash, attempts, expires_at, purpose)
       VALUES ($1::uuid, $2, $3, $4, 0, NOW() + INTERVAL '15 minutes', $5)
       RETURNING expires_at::text AS expires_at
     )
     SELECT expires_at FROM ins;`,
    [challengeId, playerId, emailHash, codeHash, purpose]
  );

  await cleanupExpiredOtpChallengesProbabilistic();

  const expiresAtIso = rows[0]?.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  return { challengeId, code, expiresAtIso };
}

/**
 * Verifica de forma atómica en Neon (`otp_challenges`) el código de 6 dígitos (máx. 5 intentos, un solo uso),
 * exigiendo coincidencia de propósito (`SIGN` | `REVOKE` | `RECEIPT`) cuando existe en el reto.
 */
export async function verifyEmailOtpChallenge(params: {
  challengeId: string;
  playerId: string;
  email: string;
  code: string;
  purpose?: OtpChallengePurpose;
}): Promise<OtpChallengeVerificationResult & { verifiedAtIso?: string }> {
  const challengeId = String(params.challengeId || '').trim();
  const playerId = String(params.playerId || '').trim();
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanCode = String(params.code || '').trim();
  const expectedPurpose: OtpChallengePurpose =
    params.purpose === 'REVOKE' || params.purpose === 'RECEIPT' ? params.purpose : 'SIGN';

  if (!UUID_REGEX.test(challengeId) || !playerId || !isStrictEmail(cleanEmail) || !/^\d{6}$/.test(cleanCode)) {
    return { valid: false, error: 'Formato de código OTP o reto de verificación no válido.' };
  }

  const emailHash = hashNormalizedEmail(cleanEmail);
  const codeHashV2 = computeOtpCodeHash(challengeId, playerId, emailHash, cleanCode, expectedPurpose);
  const legacyCodeHash = computeOtpCodeHash(challengeId, playerId, emailHash, cleanCode);

  const rows = await queryNeon<{ verified: boolean; attempts: number; verified_at: string | null }>(
    `UPDATE otp_challenges
     SET attempts = attempts + 1,
         used_at = CASE
           WHEN ((purpose IS NOT NULL AND code_hash = $4) OR (purpose IS NULL AND code_hash = $5)) OR attempts + 1 >= 5
           THEN NOW()
           ELSE NULL
         END,
         verified_at = CASE
           WHEN ((purpose IS NOT NULL AND code_hash = $4) OR (purpose IS NULL AND code_hash = $5))
           THEN NOW()
           ELSE verified_at
         END
     WHERE id = $1::uuid
       AND player_id = $2
       AND email_hash = $3
       AND used_at IS NULL
       AND expires_at > NOW()
       AND attempts < 5
       AND (purpose = $6 OR purpose IS NULL)
     RETURNING (verified_at IS NOT NULL) AS verified, attempts, verified_at::text AS verified_at;`,
    [challengeId, playerId, emailHash, codeHashV2, legacyCodeHash, expectedPurpose]
  );

  if (rows.length === 0) {
    return {
      valid: false,
      error: 'El código de verificación ha caducado, ya fue utilizado, no corresponde a esta acción o superó el límite de intentos. Solicita uno nuevo.',
    };
  }

  const row = rows[0];
  if (!row.verified) {
    const remainingAttempts = Math.max(0, 5 - Number(row.attempts || 0));
    return {
      valid: false,
      remainingAttempts,
      error:
        remainingAttempts === 0
          ? 'Has agotado los 5 intentos permitidos para este código OTP. Solicita uno nuevo.'
          : `El código de 6 dígitos introducido es incorrecto. Intentos restantes: ${remainingAttempts}.`,
    };
  }

  return { valid: true, verifiedAtIso: row.verified_at || new Date().toISOString() };
}

/**
 * Confirma que un `challengeId` recién utilizado en el mismo flujo `?directToken=` fue verificado
 * por código real (`verified_at IS NOT NULL`) con el propósito adecuado en los últimos 20 min.
 */
export async function verifyRecentCompletedOtpChallenge(params: {
  challengeId: string;
  playerId: string;
  email: string;
  purpose?: OtpChallengePurpose;
}): Promise<{ valid: boolean; verifiedAtIso?: string }> {
  const challengeId = String(params.challengeId || '').trim();
  const playerId = String(params.playerId || '').trim();
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const expectedPurpose: OtpChallengePurpose =
    params.purpose === 'REVOKE' || params.purpose === 'RECEIPT' ? params.purpose : 'SIGN';
  if (!UUID_REGEX.test(challengeId) || !playerId || !isStrictEmail(cleanEmail)) {
    return { valid: false };
  }

  const emailHash = hashNormalizedEmail(cleanEmail);
  const rows = await queryNeon<{ id: string; verified_at: string | null }>(
    `SELECT id::text AS id, COALESCE(verified_at, used_at)::text AS verified_at
     FROM otp_challenges
     WHERE id = $1::uuid
       AND player_id = $2
       AND email_hash = $3
       AND used_at IS NOT NULL
       AND (verified_at IS NOT NULL OR (purpose IS NULL AND attempts BETWEEN 1 AND 5))
       AND (purpose = $4 OR purpose IS NULL)
       AND used_at > NOW() - INTERVAL '20 minutes'
     LIMIT 1;`,
    [challengeId, playerId, emailHash, expectedPurpose]
  );
  if (rows.length === 0) return { valid: false };
  return { valid: true, verifiedAtIso: rows[0].verified_at || undefined };
}

function wrapBase64(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  return clean.replace(/(.{76})/g, '$1\r\n');
}

function dotStuffSmtpLine(line: string): string {
  return line.startsWith('.') ? `.${line}` : line;
}

function buildMimeMessagePayload(
  cfg: SmtpConfig,
  options: BatchEmailMessage
): { to: string; cc?: string; recipients: string[]; dataPayload: string } {
  const toClean = options.to.trim();
  const ccClean = options.cc?.trim() || '';
  const replyToClean = options.replyTo?.trim() || '';

  if (!isStrictEmail(toClean)) {
    throw new Error('Dirección de correo destinataria no válida.');
  }
  if (ccClean && !isStrictEmail(ccClean)) {
    throw new Error('Dirección de correo en copia (CC) no válida.');
  }
  if (replyToClean && !isStrictEmail(replyToClean)) {
    throw new Error('Dirección Reply-To no válida.');
  }

  const recipients = [toClean];
  if (ccClean && ccClean.toLowerCase() !== toClean.toLowerCase()) {
    recipients.push(ccClean);
  }

  const safeSubject = stripCrlf(options.subject).slice(0, 220) || 'Comunicación Oficial CDV San Pedro';
  const safeFromName = stripCrlf(cfg.fromName);

  const mixedBoundary = `----=_Mixed_${crypto.randomBytes(8).toString('hex')}`;
  const relatedBoundary = `----=_Related_${crypto.randomBytes(8).toString('hex')}`;
  const altBoundary = `----=_Alt_${crypto.randomBytes(8).toString('hex')}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(safeSubject, 'utf8').toString('base64')}?=`;
  const encodedFromName = `=?UTF-8?B?${Buffer.from(safeFromName, 'utf8').toString('base64')}?=`;
  const msgId = `<${crypto.randomUUID()}@voleibolsanpedro.es>`;
  const dateHeader = new Date().toUTCString();

  const allAttachments: SmtpAttachment[] = [
    {
      filename: 'escudo-cdv-sanpedro.jpg',
      contentBase64: getClubLogoBase64Raw(),
      contentType: 'image/jpeg',
      cid: CLUB_LOGO_CID,
      inline: true,
    },
    ...(options.attachments || []),
  ];
  const inlineAttachments = allAttachments.filter((a) => a.inline || a.cid);
  const regularAttachments = allAttachments.filter((a) => !a.inline && !a.cid);

  const headers = [
    `Date: ${dateHeader}`,
    `From: "${encodedFromName}" <${cfg.user}>`,
    `To: <${toClean}>`,
  ];
  if (ccClean && ccClean.toLowerCase() !== toClean.toLowerCase()) {
    headers.push(`Cc: <${ccClean}>`);
  }
  if (replyToClean) {
    headers.push(`Reply-To: <${replyToClean}>`);
  }
  headers.push(
    `Message-ID: ${msgId}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`
  );

  const sanitizeMimeParam = (val: string) => stripCrlf(val).replace(/["\\]/g, '_');

  const buildRelatedLines = (): string[] => {
    const lines = [
      `--${relatedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      `--${altBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrapBase64(Buffer.from(options.text, 'utf8').toString('base64')),
      ``,
      `--${altBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrapBase64(Buffer.from(options.html, 'utf8').toString('base64')),
      ``,
      `--${altBoundary}--`,
    ];

    for (const att of inlineAttachments) {
      const cType = sanitizeMimeParam(att.contentType || 'image/png');
      const fName = sanitizeMimeParam(att.filename || 'adjunto.png');
      const cid = sanitizeMimeParam(att.cid || `${fName}@voleibolsanpedro.es`);
      lines.push(
        ``,
        `--${relatedBoundary}`,
        `Content-Type: ${cType}; name="${fName}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-ID: <${cid}>`,
        `Content-Disposition: inline; filename="${fName}"`,
        ``,
        wrapBase64(att.contentBase64)
      );
    }

    lines.push(``, `--${relatedBoundary}--`);
    return lines;
  };

  const bodyLines: string[] = [];
  if (regularAttachments.length > 0) {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
    bodyLines.push(
      `--${mixedBoundary}`,
      `Content-Type: multipart/related; type="multipart/alternative"; boundary="${relatedBoundary}"`,
      ``,
      ...buildRelatedLines()
    );

    for (const att of regularAttachments) {
      const cType = sanitizeMimeParam(att.contentType || 'application/pdf');
      const fName = sanitizeMimeParam(att.filename || 'documento.pdf');
      bodyLines.push(
        ``,
        `--${mixedBoundary}`,
        `Content-Type: ${cType}; name="${fName}"`,
        `Content-Disposition: attachment; filename="${fName}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        wrapBase64(att.contentBase64)
      );
    }

    bodyLines.push(``, `--${mixedBoundary}--`);
  } else {
    headers.push(`Content-Type: multipart/related; type="multipart/alternative"; boundary="${relatedBoundary}"`);
    bodyLines.push(...buildRelatedLines());
  }

  const rawLines = [...headers, ``, ...bodyLines].join('\r\n').split('\r\n');
  const stuffed = rawLines.map(dotStuffSmtpLine);
  stuffed.push('.');

  return {
    to: toClean,
    cc: ccClean || undefined,
    recipients,
    dataPayload: stuffed.join('\r\n'),
  };
}

/**
 * Envía un lote acotado de correos (máx. 15) reutilizando una única sesión SMTP sobre TLS implícito
 * (`RSET` entre mensajes) y esperando confirmación `221` tras `QUIT`.
 */
export async function sendBatchEmailsWithTlsPool(
  messages: BatchEmailMessage[]
): Promise<BatchEmailResult[]> {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const cfg = getSmtpConfig();
  if (!cfg) {
    return messages.map((m, idx) => ({
      index: idx,
      to: m.to,
      sent: false,
      error: 'Servidor de correo SMTP (Zoho) pendiente de configurar en variables de entorno (SMTP_PASS).',
    }));
  }

  if (messages.length > MAX_BATCH_TLS_POOL) {
    const results: BatchEmailResult[] = [];
    for (let offset = 0; offset < messages.length; offset += MAX_BATCH_TLS_POOL) {
      const chunk = messages.slice(offset, offset + MAX_BATCH_TLS_POOL);
      const chunkRes = await sendBatchEmailsWithTlsPool(chunk);
      for (const r of chunkRes) {
        results.push({ ...r, index: offset + r.index });
      }
    }
    return results;
  }

  const results: BatchEmailResult[] = messages.map((m, idx) => ({
    index: idx,
    to: m.to,
    sent: false,
    error: 'No procesado',
  }));

  const prepared: Array<{ index: number; recipients: string[]; dataPayload: string } | null> =
    messages.map((m, idx) => {
      try {
        const built = buildMimeMessagePayload(cfg, m);
        results[idx].to = built.to;
        return { index: idx, recipients: built.recipients, dataPayload: built.dataPayload };
      } catch (err) {
        results[idx].sent = false;
        results[idx].error = err instanceof Error ? err.message : 'Correo inválido.';
        return null;
      }
    });

  const validQueue = prepared.filter(
    (item): item is { index: number; recipients: string[]; dataPayload: string } => item !== null
  );

  if (validQueue.length === 0) {
    return results;
  }

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: cfg.host,
        port: cfg.port,
        servername: cfg.host,
        rejectUnauthorized: true,
      },
      () => {
        // TLS handshake establecido
      }
    );

    socket.setTimeout(15000);
    let buffer = '';
    let phase: 'GREETING' | 'EHLO' | 'AUTH' | 'AUTH_USER' | 'AUTH_PASS' | 'MAIL_FROM' | 'RCPT_TO' | 'DATA_CMD' | 'DATA_BODY' | 'RSET' | 'QUIT' = 'GREETING';
    let qIdx = 0;
    let rcptIdx = 0;
    let settled = false;
    let quitTimer: NodeJS.Timeout | null = null;

    const finalize = () => {
      if (settled) return;
      settled = true;
      if (quitTimer) {
        clearTimeout(quitTimer);
        quitTimer = null;
      }
      try {
        socket.end();
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(results);
    };

    const sendLine = (line: string) => {
      socket.write(`${line}\r\n`);
    };

    const beginNextMessageOrQuit = () => {
      qIdx += 1;
      if (qIdx < validQueue.length) {
        phase = 'RSET';
        sendLine('RSET');
      } else {
        phase = 'QUIT';
        sendLine('QUIT');
        quitTimer = setTimeout(() => finalize(), 1500);
      }
    };

    const markRemainingError = (errMsg: string) => {
      for (let i = qIdx; i < validQueue.length; i++) {
        const target = validQueue[i];
        if (!results[target.index].sent) {
          results[target.index].error = errMsg;
        }
      }
      finalize();
    };

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        if (line.length >= 4 && line[3] === '-') continue;
        const code = parseInt(line.slice(0, 3), 10);
        if (Number.isNaN(code)) continue;

        if (phase === 'QUIT') {
          if (code === 221 || code >= 200) {
            finalize();
            return;
          }
          continue;
        }

        if (code >= 400) {
          const errMsg = `Error SMTP (${code}): ${line}`;
          if (phase === 'GREETING' || phase === 'EHLO' || phase === 'AUTH' || phase === 'AUTH_USER' || phase === 'AUTH_PASS') {
            markRemainingError(errMsg);
            return;
          }
          const currentItem = validQueue[qIdx];
          if (currentItem) {
            results[currentItem.index].sent = false;
            results[currentItem.index].error = errMsg;
          }
          beginNextMessageOrQuit();
          continue;
        }

        if (phase === 'GREETING' && code === 220) {
          phase = 'EHLO';
          sendLine('EHLO voleibolsanpedro.es');
        } else if (phase === 'EHLO' && code === 250) {
          phase = 'AUTH';
          sendLine('AUTH LOGIN');
        } else if (phase === 'AUTH' && code === 334) {
          phase = 'AUTH_USER';
          sendLine(Buffer.from(cfg.user, 'utf8').toString('base64'));
        } else if (phase === 'AUTH_USER' && code === 334) {
          phase = 'AUTH_PASS';
          sendLine(Buffer.from(cfg.pass, 'utf8').toString('base64'));
        } else if (phase === 'AUTH_PASS' && code === 235) {
          phase = 'MAIL_FROM';
          sendLine(`MAIL FROM:<${cfg.user}>`);
        } else if (phase === 'RSET' && code === 250) {
          phase = 'MAIL_FROM';
          sendLine(`MAIL FROM:<${cfg.user}>`);
        } else if (phase === 'MAIL_FROM' && code === 250) {
          phase = 'RCPT_TO';
          rcptIdx = 0;
          sendLine(`RCPT TO:<${validQueue[qIdx].recipients[rcptIdx]}>`);
        } else if (phase === 'RCPT_TO' && code === 250) {
          rcptIdx += 1;
          if (rcptIdx < validQueue[qIdx].recipients.length) {
            sendLine(`RCPT TO:<${validQueue[qIdx].recipients[rcptIdx]}>`);
          } else {
            phase = 'DATA_CMD';
            sendLine('DATA');
          }
        } else if (phase === 'DATA_CMD' && code === 354) {
          phase = 'DATA_BODY';
          sendLine(validQueue[qIdx].dataPayload);
        } else if (phase === 'DATA_BODY' && code === 250) {
          const currentItem = validQueue[qIdx];
          results[currentItem.index].sent = true;
          results[currentItem.index].error = undefined;
          beginNextMessageOrQuit();
        }
      }
    });

    socket.on('timeout', () => markRemainingError('Tiempo de espera agotado conectando con Zoho SMTP.'));
    socket.on('error', (err) => markRemainingError(`Error de red SMTP: ${err.message}`));
    socket.on('close', () => finalize());
  });
}

/**
 * Cliente SMTP sobre TLS implícito (puerto 465, Zoho Mail) con validación estricta de destinatarios,
 * sanitización CRLF, soporte de CC/Reply-To, adjuntos PDF y espera de cierre 221.
 */
export async function sendSmtpMail(options: BatchEmailMessage): Promise<{ sent: boolean; error?: string }> {
  const res = await sendBatchEmailsWithTlsPool([options]);
  return {
    sent: Boolean(res[0]?.sent),
    error: res[0]?.error,
  };
}

/**
 * Envía el correo con el código OTP de 6 dígitos al correo censado del firmante (validez: 15 minutos).
 * Nunca expone el código OTP en el Subject para evitar fugas en notificaciones de pantalla bloqueada.
 */
export async function sendConsentOtpEmail(params: {
  toEmail: string;
  playerName: string;
  otpCode: string;
  purpose?: 'SIGN' | 'REVOKE' | 'RECEIPT';
}): Promise<{ sent: boolean; error?: string }> {
  const safePlayerName = stripCrlf(params.playerName || 'Deportista').slice(0, 100);
  const actionDesc =
    params.purpose === 'REVOKE'
      ? 'revocar la autorización oficial'
      : params.purpose === 'RECEIPT'
      ? 'descargar el resguardo oficial firmado en PDF'
      : 'confirmar la firma de la autorización oficial';

  const subject = `[OTP-CDV] Código de verificación de identidad · ${safePlayerName}`;
  const text = [
    `${CLUB_INFO.name.toUpperCase()} · PORTAL OFICIAL DE AUTORIZACIONES`,
    ``,
    `Tu código de seguridad (OTP) para ${actionDesc} de ${safePlayerName} es:`,
    ``,
    `    ${params.otpCode}`,
    ``,
    `Este código es válido durante 15 minutos y admite un máximo de 5 intentos.`,
    ``,
    `Junta Directiva y Secretaría · ${CLUB_INFO.name}`,
    `CIF ${CLUB_INFO.cif} · ${CLUB_INFO.officialAddress}`,
    `Web: https://voleibolsanpedro.es · Email: ${CLUB_INFO.contactEmail}`,
  ].join('\n');

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.55; color: #27272a; margin: 0 0 12px 0;">
      Hola,
    </p>
    <p style="font-size: 14px; line-height: 1.55; color: #27272a; margin: 0 0 18px 0;">
      Introduce el siguiente código de verificación de 6 dígitos en el portal oficial para <strong>${escapeHtml(actionDesc)}</strong> de <strong>${escapeHtml(safePlayerName)}</strong>:
    </p>
    <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #991b1b; margin-bottom: 6px;">
        Código de Verificación (OTP)
      </div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">
        ${escapeHtml(params.otpCode)}
      </div>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #52525b; margin: 0;">
      Código generado desde <strong>${escapeHtml(CLUB_INFO.contactEmail)}</strong> con validez de <strong>15 minutos</strong> (máximo 5 intentos). Si no has solicitado esta operación, ignora este mensaje.
    </p>
  `;

  const html = buildOfficialClubEmailHtml({
    badgeText: 'Verificación de Identidad (OTP)',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    title: 'Código de Seguridad para Confirmar tu Trámite',
    subtitle: 'Portal Oficial de Autorizaciones · RGPD / Junta de Andalucía',
    bodyHtml,
  });

  if (!isEmailOtpEnabled() && isDevConsoleOtpBypassAllowed()) {
    console.warn(`[DEV-OTP-CONSOLE] Player="${safePlayerName}" Email="${params.toEmail}" Code="${params.otpCode}"`);
    return { sent: true };
  }

  return sendSmtpMail({
    to: params.toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Envía el correo justificante con el Documento PDF Oficial Firmado adjunto al firmante y copia al club.
 * Propaga el resultado real de entrega sin silenciar errores.
 */
export async function sendConsentReceiptEmail(params: {
  toEmail: string;
  playerName: string;
  teamName: string;
  birthYear?: number | null;
  birthDate?: string | null;
  isMinor: boolean;
  isMinor14To17?: boolean;
  signerName: string;
  signerDni: string;
  signerDniMasked: string;
  signerRelationship: string;
  signerPhone?: string;
  minorSignerName?: string;
  minorSignerDni?: string;
  minorSignatureData?: string;
  consentId: string;
  documentHash: string;
  signedAtIso: string;
  signedAtFormatted: string;
  signatureMethod: SignatureMethod;
  signatureMethodLabel: string;
  signatureData?: string;
  consentImage?: boolean;
  consentSocialMedia: boolean;
  consentStreaming: boolean;
  consentPress: boolean;
  consentTravel: boolean;
}): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailOtpEnabled()) {
    if (isDevConsoleOtpBypassAllowed()) {
      console.warn(`[DEV-RECEIPT-CONSOLE] Consentimiento=${params.consentId} To=${params.toEmail}`);
      return { sent: true };
    }
    return {
      sent: false,
      error: 'Servidor SMTP no configurado; el justificante PDF debe descargarse desde el portal.',
    };
  }

  const safePlayerName = stripCrlf(params.playerName).slice(0, 100);
  const safeTeamName = stripCrlf(params.teamName).slice(0, 80);
  const safeRef = (params.consentId || 'REG').slice(0, 8).toUpperCase();
  const maskedDniDisplay = params.signerDniMasked || maskDni(params.signerDni);

  const consentImage =
    params.consentImage !== undefined
      ? params.consentImage === true
      : Boolean(params.consentSocialMedia || params.consentStreaming || params.consentPress);
  const hasMixedLegacyImage =
    params.consentImage === undefined &&
    (params.consentSocialMedia !== params.consentStreaming ||
      params.consentStreaming !== params.consentPress);
  const hasLegacyMinorCoSignature = Boolean(
    params.isMinor14To17 && params.minorSignerName && params.minorSignatureData
  );

  const yesNo = (val: boolean) => (val ? 'SI' : 'NO');
  const subject = `[AUTORIZACION-CDV] [${safeTeamName}] ${safePlayerName} | IMG:${yesNo(consentImage)} VIAJ:${yesNo(params.consentTravel)} | Ref:${safeRef}`;

  const attachments: SmtpAttachment[] = [];
  let hasInlineSignature = false;

  if (params.signatureData && params.signatureData.startsWith('data:image/')) {
    const sigMatch = params.signatureData.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
    if (sigMatch && sigMatch[2] && sigMatch[2].length > 160 && params.signatureMethod !== 'PRESENCIAL') {
      hasInlineSignature = true;
      const ext = sigMatch[1].includes('png') ? 'png' : 'jpg';
      attachments.push({
        filename: `firma-autorizacion.${ext}`,
        contentType: sigMatch[1],
        contentBase64: sigMatch[2],
        cid: SIGNER_SIGNATURE_CID,
        inline: true,
      });
    }
  }

  try {
    const doc = generateConsentPdf({
      consentId: params.consentId,
      playerName: params.playerName,
      teamName: params.teamName,
      birthYear: params.birthYear,
      birthDate: params.birthDate,
      isMinor: params.isMinor,
      isMinor14To17: params.isMinor14To17,
      signerName: params.signerName,
      signerDni: params.signerDni,
      signerRelationship: params.signerRelationship,
      signerPhone: params.signerPhone,
      signerEmail: params.toEmail,
      minorSignerName: params.minorSignerName,
      minorSignerDni: params.minorSignerDni,
      minorSignatureData: params.minorSignatureData,
      consentImage,
      consentSocialMedia: params.consentSocialMedia,
      consentStreaming: params.consentStreaming,
      consentPress: params.consentPress,
      consentTravel: params.consentTravel,
      signatureMethod: params.signatureMethod,
      signatureData: params.signatureData,
      documentHash: params.documentHash,
      signedAt: params.signedAtIso,
    });
    const safeName = params.playerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const pdfBase64 = Buffer.from(doc.output('arraybuffer')).toString('base64');
    attachments.push({
      filename: `autorizacion_oficial_${safeName}.pdf`,
      contentBase64: pdfBase64,
      contentType: 'application/pdf',
    });
  } catch (err) {
    console.error('[EmailOTP] Error generando adjunto PDF:', err);
  }

  const uuidDisplay = params.consentId || 'Registrado en custodia';
  const yesNoLabel = (v: boolean) => (v ? 'SÍ AUTORIZADO' : 'NO AUTORIZADO');

  const isInPerson = params.signatureMethod === 'PRESENCIAL';
  const methodSummaryLine = isInPerson
    ? `Método de firma: ${params.signatureMethodLabel} · Hoja manuscrita custodiada en Secretaría con sellado HMAC-SHA256`
    : `Método de firma: ${params.signatureMethodLabel} · Conforme al Art. 3.10 y Art. 25.1 del Reglamento (UE) 910/2014 (eIDAS)`;

  const text = [
    `CONFIRMACIÓN Y DOCUMENTO OFICIAL FIRMADO · ${CLUB_INFO.name.toUpperCase()}`,
    ``,
    `Se adjunta en formato PDF el documento oficial de autorizaciones deportivas firmado y registrado correctamente.`,
    ``,
    `Deportista: ${safePlayerName}`,
    `Equipo / Categoría: ${safeTeamName}`,
    `Firmante: ${params.signerName} (${params.signerRelationship} · DNI: ${maskedDniDisplay})`,
    ...(hasLegacyMinorCoSignature
      ? [`Co-consentimiento menor (14-17 años): ${params.minorSignerName}`]
      : []),
    `Fecha y hora (Madrid): ${params.signedAtFormatted}`,
    methodSummaryLine,
    ...(hasMixedLegacyImage
      ? [
          `1. Web y RRSS del Club: ${yesNoLabel(params.consentSocialMedia)}`,
          `2. Retransmisiones / Streaming: ${yesNoLabel(params.consentStreaming)}`,
          `3. Prensa y Medios: ${yesNoLabel(params.consentPress)}`,
          `4. Desplazamientos Oficiales: ${yesNoLabel(params.consentTravel)}`,
        ]
      : [
          `1. Cesión de Imágenes Deportivas: ${yesNoLabel(consentImage)}`,
          `2. Desplazamientos y Viajes Oficiales: ${yesNoLabel(params.consentTravel)}`,
        ]),
    `ID Registro (UUID): ${uuidDisplay}`,
    `Huella Criptográfica HMAC-SHA256: ${params.documentHash}`,
    ``,
    `Puedes ejercitar tus derechos RGPD o revocar esta autorización en cualquier momento desde el portal oficial o escribiendo a ${CLUB_INFO.contactEmail}.`,
    ``,
    `Junta Directiva y Secretaría · SAN PEDRO C.D VOLEIBOL (${CLUB_INFO.name})`,
    `CIF ${CLUB_INFO.cif} · ${CLUB_INFO.officialAddress}`,
    `Web: https://voleibolsanpedro.es`,
  ].join('\n');

  const signatureBlockHtml = hasInlineSignature
    ? `
      <div style="margin: 18px 0; padding: 14px; background-color: #f9fafb; border: 1px solid #e4e4e7; border-radius: 10px;">
        <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; color: #3f3f46; margin-bottom: 10px;">
          Firma Electrónica Simple (verificación OTP al correo censado + trazo manuscrito + sellado de integridad HMAC-SHA256) conforme al Art. 3.10 y Art. 25.1 del Reglamento (UE) 910/2014 (eIDAS)
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="220" valign="middle" style="padding-right: 14px;">
              <div style="background-color: #ffffff; border: 1px solid #d4d4d8; border-radius: 8px; padding: 8px; text-align: center;">
                <img src="cid:${SIGNER_SIGNATURE_CID}" alt="Firma de ${escapeHtml(params.signerName)}" style="max-width: 195px; max-height: 75px; display: block; margin: 0 auto; height: auto;" />
              </div>
            </td>
            <td valign="middle" style="font-size: 12px; color: #3f3f46; line-height: 1.5;">
              <div><strong style="color: #111827;">${escapeHtml(params.signerName)}</strong></div>
              <div>DNI/NIE: <span style="font-family: monospace; color: #111827;">${escapeHtml(maskedDniDisplay)}</span> · ${escapeHtml(params.signerRelationship)}</div>
              <div>Método: <strong>${escapeHtml(params.signatureMethodLabel)}</strong></div>
              <div style="font-size: 11px; color: #059669; font-weight: bold; margin-top: 4px;">
                ✓ Sellado criptográfico validado
              </div>
            </td>
          </tr>
        </table>
      </div>
    `
    : `
      <div style="margin: 18px 0; padding: 12px 14px; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; font-size: 12px; color: #92400e;">
        <strong>Registro de Firma Presencial:</strong> Documento manuscrito custodiado en Secretaría del Club tras entrega presencial por ${escapeHtml(params.signerName)} (DNI: ${escapeHtml(maskedDniDisplay)}), con registro digital sellado internamente mediante HMAC-SHA256.
      </div>
    `;

  const rowDecisionHtml = (label: string, allowed: boolean) => `
    <tr>
      <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">${escapeHtml(label)}:</td>
      <td style="padding: 9px 12px; font-weight: bold; color: ${allowed ? '#059669' : '#dc2626'}; border-bottom: 1px solid #e4e4e7;">
        ${allowed ? '✓ SÍ AUTORIZADO' : '✕ NO AUTORIZADO'}
      </td>
    </tr>
  `;

  const bodyHtml = `
    <p style="font-size: 14px; color: #27272a; line-height: 1.55; margin: 0 0 14px 0;">
      Se ha completado y custodiado oficialmente el registro de autorizaciones de la <strong>Temporada 2026/2027</strong>.
      <strong>Encontrarás adjunto a este correo el documento oficial firmado en formato PDF</strong> con todos los apartados y evidencias legales.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; border-collapse: collapse; margin: 16px 0; background-color: #f9fafb; border: 1px solid #e4e4e7; border-radius: 8px;">
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7; width: 42%;">Deportista:</td>
        <td style="padding: 9px 12px; font-weight: bold; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(safePlayerName)}</td>
      </tr>
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Equipo / Categoría:</td>
        <td style="padding: 9px 12px; font-weight: bold; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(safeTeamName)}</td>
      </tr>
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Firmante:</td>
        <td style="padding: 9px 12px; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(params.signerName)} (${escapeHtml(params.signerRelationship)} · DNI: ${escapeHtml(maskedDniDisplay)})</td>
      </tr>
      ${
        hasLegacyMinorCoSignature
          ? `<tr>
               <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Co-consentimiento menor (14-17):</td>
               <td style="padding: 9px 12px; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(params.minorSignerName || '')}</td>
             </tr>`
          : ''
      }
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Fecha y Hora:</td>
        <td style="padding: 9px 12px; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(params.signedAtFormatted)} (Europe/Madrid)</td>
      </tr>
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Método de Firma:</td>
        <td style="padding: 9px 12px; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(params.signatureMethodLabel)}</td>
      </tr>
      ${
        hasMixedLegacyImage
          ? `
            ${rowDecisionHtml('1. Web y Redes del Club', params.consentSocialMedia)}
            ${rowDecisionHtml('2. Retransmisiones / Streaming', params.consentStreaming)}
            ${rowDecisionHtml('3. Prensa y Medios', params.consentPress)}
            ${rowDecisionHtml('4. Desplazamientos Oficiales', params.consentTravel)}
          `
          : `
            ${rowDecisionHtml('1. Cesión de Imágenes Deportivas', consentImage)}
            ${rowDecisionHtml('2. Desplazamientos y Viajes Oficiales', params.consentTravel)}
          `
      }
      <tr>
        <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">ID Registro (UUID):</td>
        <td style="padding: 9px 12px; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(uuidDisplay)}</td>
      </tr>
      <tr>
        <td style="padding: 9px 12px; color: #52525b;">Huella HMAC-SHA256:</td>
        <td style="padding: 9px 12px; font-family: 'Courier New', Courier, monospace; font-size: 10px; word-break: break-all; color: #3f3f46;">${escapeHtml(params.documentHash)}</td>
      </tr>
    </table>

    ${signatureBlockHtml}

    <div style="padding: 12px 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; font-size: 12px; color: #065f46; line-height: 1.5;">
      <strong>Archivo adjunto:</strong> Hemos adjuntado el documento oficial en PDF firmado. Conserva este correo como justificante ante cualquier trámite o requerimiento.
    </div>
    <p style="font-size: 12px; color: #52525b; margin: 14px 0 0 0; line-height: 1.5;">
      Puedes revocar esta autorización en cualquier momento desde el portal de autorizaciones o escribiendo a <a href="mailto:${escapeHtml(CLUB_INFO.contactEmail)}" style="color: #dc2626; font-weight: bold; text-decoration: none;">${escapeHtml(CLUB_INFO.contactEmail)}</a>.
    </p>
  `;

  const html = buildOfficialClubEmailHtml({
    badgeText: 'Justificante Oficial Registrado',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857',
    title: 'Autorización Oficial Firmada y Custodiada',
    subtitle: 'Resguardo Oficial · Temporada 2026/2027',
    bodyHtml,
  });

  const clubCopy = getClubCopyEmail();
  const targetTo = isStrictEmail(params.toEmail) ? params.toEmail.trim() : clubCopy;

  return sendSmtpMail({
    to: targetTo,
    cc: clubCopy,
    subject,
    text,
    html,
    attachments,
  });
}

/**
 * Construye el mensaje de invitación con enlace directo (listo para envío único o en lote pooled TLS).
 */
export function buildConsentInvitationEmailMessage(params: {
  toEmail: string;
  playerName: string;
  teamName: string;
  isMinor: boolean;
  signerName?: string;
  directUrl: string;
}): BatchEmailMessage {
  const safePlayerName = stripCrlf(params.playerName).slice(0, 100);
  const safeTeamName = stripCrlf(params.teamName).slice(0, 80);
  const safeSignerName = params.signerName ? stripCrlf(params.signerName).slice(0, 100) : '';
  const safeDirectUrl =
    process.env.NODE_ENV === 'development' && params.directUrl.startsWith('http://localhost')
      ? params.directUrl
      : sanitizeHttpsUrl(params.directUrl, 'https://voleibolsanpedro.es/autorizaciones');

  const greeting = safeSignerName ? `Hola ${safeSignerName}` : `Estimada familia / deportista`;
  const subject = `[TRAMITE-CDV] [${safeTeamName}] Trámite Oficial de Autorizaciones 2026/2027 · ${safePlayerName}`;

  const text = [
    `${CLUB_INFO.name.toUpperCase()} · TRÁMITE OFICIAL DE AUTORIZACIONES (TEMPORADA 2026/2027)`,
    ``,
    `${greeting}:`,
    ``,
    `En cumplimiento del Protocolo Marco de Protección de Menores de la Junta de Andalucía (Orden 18/11/2024), la normativa FAVB/AFADE y el RGPD/LOPDGDD, necesitamos registrar la declaración oficial sobre:`,
    `  1. Tratamiento y difusión de imágenes deportivas para promoción no lucrativa del Club.`,
    `  2. Autorización familiar para desplazamientos y viajes deportivos oficiales.`,
    ``,
    `PASOS PARA COMPLETARLO:`,
    `1. Accede a tu enlace directo personal (válido 14 días):`,
    `   ${safeDirectUrl}`,
    `2. Pulsa "Continuar" para recibir y validar un código de seguridad (OTP de 6 dígitos) en este mismo correo electrónico censado (${CLUB_INFO.contactEmail}) y verificar así tu identidad.`,
    `3. Marca tu decisión expresa ("Autorizo" o "No autorizo") en cada apartado y traza tu firma en pantalla${params.isMinor ? ' (firma única del padre, madre o tutor/a legal; entre 14 y 17 años con conocimiento y asentimiento del deportista)' : ''}. Al registrar la firma se enviará el resguardo oficial PDF a tu correo.`,
    ``,
    `Junta Directiva y Secretaría · SAN PEDRO C.D VOLEIBOL (${CLUB_INFO.name})`,
    `CIF: ${CLUB_INFO.cif} · ${CLUB_INFO.officialAddress}`,
    `Web: https://voleibolsanpedro.es · Secretaría: ${CLUB_INFO.contactEmail}`,
  ].join('\n');

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.55; color: #111827; margin: 0 0 12px 0;">
      <strong>${escapeHtml(greeting)}:</strong>
    </p>
    <p style="font-size: 13px; color: #3f3f46; line-height: 1.6; margin: 0 0 12px 0;">
      En cumplimiento del Protocolo Marco de Protección de Menores de la Junta de Andalucía, la normativa FAVB/AFADE y el RGPD/LOPDGDD, debemos registrar el documento oficial de <strong>${escapeHtml(safePlayerName)}</strong> (<em>${escapeHtml(safeTeamName)}</em>) relativo a:
    </p>
    <ul style="font-size: 13px; color: #18181b; line-height: 1.6; margin: 0 0 12px 0; padding-left: 20px;">
      <li><strong>Tratamiento y difusión de imágenes deportivas:</strong> fotos y vídeos exclusivamente deportivos para web oficial, redes sociales institucionales, retransmisiones deportivas, memorias, cartelería y prensa deportiva sin ánimo de lucro (prohibido uso comercial o cesión a patrocinadores).</li>
      <li><strong>Desplazamientos y viajes deportivos oficiales:</strong> traslado en transportes oficiales del Club para competiciones FAVB/AFADE, concentraciones y torneos.</li>
    </ul>
    <p style="font-size: 13px; color: #3f3f46; line-height: 1.6; margin: 0 0 16px 0;">
      Este trámite debe formalizarse en todo caso, <strong>tanto si deseas autorizar como si deseas no autorizar (denegar)</strong> cualquiera de los apartados.
    </p>
    <div style="background-color: #f9fafb; border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; margin: 18px 0;">
      <strong style="color: #111827; font-size: 13px; display: block; margin-bottom: 10px;">
        PASOS PARA COMPLETAR EL PROCESO:
      </strong>
      <ol style="font-size: 12px; color: #3f3f46; line-height: 1.65; margin: 0; padding-left: 18px;">
        <li style="margin-bottom: 6px;">Pulsa el botón inferior para abrir tu <strong>enlace personal de acceso</strong> (caduca en 14 días y se consume al completar la firma).</li>
        <li style="margin-bottom: 6px;">Pulsa <strong>Continuar</strong> y valida el <strong>código de verificación OTP de 6 dígitos</strong> enviado a este mismo correo electrónico censado (verificación única de identidad antes de mostrar tus datos).</li>
        <li>Marca tu decisión (<strong>Autorizo</strong> o <strong>No autorizo</strong>) en cada apartado y traza tu firma en pantalla${params.isMinor ? ' (firma única del padre, madre o tutor/a legal; entre 14 y 17 años con conocimiento y asentimiento del deportista)' : ''}. Recibirás el resguardo oficial en PDF al finalizar.</li>
      </ol>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(safeDirectUrl)}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: bold; font-size: 13px; text-decoration: none; padding: 14px 26px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        Acceder al Portal Oficial y Firmar
      </a>
    </div>
    <p style="font-size: 11px; color: #52525b; word-break: break-all; margin: 0;">
      Si el botón no abre directamente, copia y pega este enlace en tu navegador:<br/>
      <a href="${escapeHtml(safeDirectUrl)}" style="color: #dc2626;">${escapeHtml(safeDirectUrl)}</a>
    </p>
  `;

  const html = buildOfficialClubEmailHtml({
    badgeText: 'Trámite Oficial de Temporada',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    title: `Solicitud de Autorizaciones · ${safePlayerName}`,
    subtitle: 'Trámite Oficial de Autorizaciones · Temporada 2026/2027',
    bodyHtml,
  });

  return {
    to: params.toEmail.trim(),
    subject,
    text,
    html,
  };
}

/**
 * Envía por correo electrónico una invitación individual de autorización.
 */
export async function sendConsentInvitationEmail(params: {
  toEmail: string;
  playerName: string;
  teamName: string;
  isMinor: boolean;
  signerName?: string;
  directUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const msg = buildConsentInvitationEmailMessage(params);
  return sendSmtpMail(msg);
}

/**
 * Envía notificaciones institucionales al buzón oficial del club (uso en /api/public/sponsor y /api/public/press).
 */
export async function sendClubNotificationEmail(params: {
  subject: string;
  htmlBody: string;
  textBody?: string;
  title?: string;
  badgeText?: string;
  replyTo?: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailOtpEnabled()) {
    return { sent: false, error: 'Servidor SMTP no configurado.' };
  }

  const targetClubEmail = getClubCopyEmail();
  const safeSubject = stripCrlf(params.subject).slice(0, 200);
  const replyTo = params.replyTo?.trim();
  if (replyTo && !isStrictEmail(replyTo)) {
    return { sent: false, error: 'Dirección de respuesta (Reply-To) inválida.' };
  }

  const html = buildOfficialClubEmailHtml({
    badgeText: params.badgeText || 'Notificación Web Oficial',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    title: params.title || safeSubject,
    subtitle: 'Portal Oficial Web · Notificación Institucional',
    bodyHtml: params.htmlBody,
  });

  const text =
    params.textBody ||
    params.htmlBody
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return sendSmtpMail({
    to: targetClubEmail,
    replyTo: replyTo || undefined,
    subject: safeSubject,
    html,
    text,
  });
}
