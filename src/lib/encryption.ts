import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendados para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const HKDF_SALT = Buffer.from('cdvsp-hkdf-v1', 'utf8');

type HkdfPurpose = 'aes-gcm-v1' | 'blind-index-v1' | 'dek-wrap-v1';

function getMasterEncryptionKey(): Buffer {
  const keyHex = process.env.DATA_ENCRYPTION_KEY?.trim() || '';
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      '[Security] DATA_ENCRYPTION_KEY no está configurada o no cumple el formato hexadecimal de 64 caracteres (256 bits).'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function deriveSubkey(purpose: HkdfPurpose): Buffer {
  const masterKey = getMasterEncryptionKey();
  return Buffer.from(
    crypto.hkdfSync('sha256', masterKey, HKDF_SALT, Buffer.from(purpose, 'utf8'), 32)
  );
}

/**
 * Obtiene el secreto dedicado para el sellado de integridad probatoria de consentimientos.
 */
export function getIntegritySecret(): string {
  const secret = process.env.CONSENT_INTEGRITY_SECRET?.trim() || '';
  const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
  if (!secret || (isProd && secret.length < 32)) {
    throw new Error(
      '[Security] CONSENT_INTEGRITY_SECRET no está configurada o no alcanza la entropía mínima requerida.'
    );
  }
  return secret;
}

/**
 * Obtiene el pepper criptográfico dedicado para HMAC de retos OTP.
 */
export function getOtpPepper(): string {
  const pepper = process.env.OTP_PEPPER?.trim() || '';
  const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
  if (!pepper || (isProd && pepper.length < 32)) {
    throw new Error(
      '[Security] OTP_PEPPER no está configurada o no alcanza la entropía mínima requerida.'
    );
  }
  return pepper;
}

/**
 * Cifra un texto confidencial mediante AES-256-GCM con subclave HKDF y AAD opcional.
 * Formato v1: `v1:${ivHex}:${authTagHex}:${encryptedHex}`
 */
export function encryptData(plainText: string, aad?: string): string {
  if (!plainText) return '';
  const key = deriveSubkey('aes-gcm-v1');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descifra un ciphertext devolviendo estado explícito de integridad.
 * Soporta formato versionado `v1:iv:tag:ct` (con AAD) y lectura controlada legacy `iv:tag:ct`.
 * Nunca devuelve texto plano ante formatos corruptos o sin etiqueta de autenticación.
 */
export function decryptDataStrict(
  cipherText: string,
  aad?: string
): { ok: boolean; value: string; legacy?: boolean } {
  if (!cipherText || typeof cipherText !== 'string') {
    return { ok: false, value: '' };
  }

  try {
    const parts = cipherText.split(':');

    if (parts.length === 4 && parts[0] === 'v1') {
      const [, ivHex, authTagHex, encryptedHex] = parts;
      if (
        !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
        !/^[0-9a-fA-F]{32}$/.test(authTagHex) ||
        !/^[0-9a-fA-F]*$/.test(encryptedHex) ||
        encryptedHex.length % 2 !== 0
      ) {
        return { ok: false, value: '' };
      }

      const key = deriveSubkey('aes-gcm-v1');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      if (aad) {
        decipher.setAAD(Buffer.from(aad, 'utf8'));
      }
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return { ok: true, value: decrypted, legacy: false };
    }

    if (parts.length === 3) {
      const [ivHex, authTagHex, encryptedHex] = parts;
      if (
        !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
        !/^[0-9a-fA-F]{32}$/.test(authTagHex) ||
        !/^[0-9a-fA-F]*$/.test(encryptedHex) ||
        encryptedHex.length % 2 !== 0
      ) {
        return { ok: false, value: '' };
      }

      const legacyKey = getMasterEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return { ok: true, value: decrypted, legacy: true };
    }

    return { ok: false, value: '' };
  } catch (err) {
    console.error('[Encryption] Fallo de integridad o descifrado:', err);
    return { ok: false, value: '' };
  }
}

/**
 * Descifra un dato cifrado con AES-256-GCM devolviendo cadena vacía si falla la autenticación.
 */
export function decryptData(cipherText: string, aad?: string): string {
  const res = decryptDataStrict(cipherText, aad);
  return res.ok ? res.value : '';
}

/**
 * Genera un índice ciego (Blind Index / HMAC-SHA256) con subclave HKDF diferenciada.
 */
export function generateBlindIndex(text: string): string {
  if (!text) return '';
  const normalized = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return '';
  const key = deriveSubkey('blind-index-v1');
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Genera el índice ciego con el esquema legacy únicamente para migración controlada de registros previos.
 */
export function generateLegacyBlindIndex(text: string): string {
  if (!text) return '';
  const normalized = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normalized) return '';
  const key = getMasterEncryptionKey();
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Genera una clave de cifrado de datos (DEK) de 256 bits por sujeto para crypto-shredding.
 */
export function generateDek(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Envuelve (cifra) la DEK de un deportista vinculándola criptográficamente a su playerId mediante AAD.
 */
export function wrapDek(dek: Buffer, playerId: string): string {
  if (!Buffer.isBuffer(dek) || dek.length !== 32) {
    throw new Error('[Encryption] DEK inválida para envolver (se requieren 32 bytes).');
  }
  if (!playerId || !playerId.trim()) {
    throw new Error('[Encryption] playerId requerido para AAD de wrapDek.');
  }

  const key = deriveSubkey('dek-wrap-v1');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  cipher.setAAD(Buffer.from(`dek:${playerId.trim()}`, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]).toString('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Desenvuelve la DEK de un deportista validando AAD y AuthTag. Devuelve null si fue destruida o alterada.
 */
export function unwrapDek(wrapped: string, playerId: string): Buffer | null {
  if (!wrapped || typeof wrapped !== 'string' || !playerId || !playerId.trim()) {
    return null;
  }

  try {
    const parts = wrapped.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      return null;
    }

    const [, ivHex, authTagHex, encryptedHex] = parts;
    if (
      !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
      !/^[0-9a-fA-F]{32}$/.test(authTagHex) ||
      !/^[0-9a-fA-F]+$/.test(encryptedHex) ||
      encryptedHex.length % 2 !== 0
    ) {
      return null;
    }

    const key = deriveSubkey('dek-wrap-v1');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'), {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAAD(Buffer.from(`dek:${playerId.trim()}`, 'utf8'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const dek = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return dek.length === 32 ? dek : null;
  } catch (err) {
    console.error('[Encryption] Fallo al desenvolver DEK:', err);
    return null;
  }
}

/**
 * Cifra texto plano con una DEK por sujeto (para filas de auditoría susceptibles de crypto-shredding).
 */
export function encryptWithDek(plainText: string, dek: Buffer, aad?: string): string {
  if (!plainText) return '';
  if (!Buffer.isBuffer(dek) || dek.length !== 32) {
    throw new Error('[Encryption] DEK inválida para cifrado.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `dek1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descifra un dato protegido con DEK por sujeto. Devuelve ok: false si la DEK fue destruida o falló integridad.
 */
export function decryptWithDekStrict(
  cipherText: string,
  dek: Buffer | null,
  aad?: string
): { ok: boolean; value: string } {
  if (!cipherText || typeof cipherText !== 'string' || !dek || !Buffer.isBuffer(dek) || dek.length !== 32) {
    return { ok: false, value: '' };
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4 || parts[0] !== 'dek1') {
      return { ok: false, value: '' };
    }

    const [, ivHex, authTagHex, encryptedHex] = parts;
    if (
      !/^[0-9a-fA-F]{24}$/.test(ivHex) ||
      !/^[0-9a-fA-F]{32}$/.test(authTagHex) ||
      !/^[0-9a-fA-F]*$/.test(encryptedHex) ||
      encryptedHex.length % 2 !== 0
    ) {
      return { ok: false, value: '' };
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, dek, Buffer.from(ivHex, 'hex'), {
      authTagLength: AUTH_TAG_LENGTH,
    });
    if (aad) {
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return { ok: true, value: decrypted };
  } catch {
    return { ok: false, value: '' };
  }
}

/**
 * Enmascara un DNI o NIE para visualización pública conforme a la
 * Disposición Adicional Séptima de la LOPDGDD 3/2018 (ej. "***1234A").
 */
export function maskDni(dni: string): string {
  if (!dni) return '';
  const clean = dni.trim().toUpperCase();
  if (clean.length < 5) return '***';
  return `***${clean.slice(-5)}`;
}
