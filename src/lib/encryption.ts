import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendados para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const keyHex = process.env.DATA_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('[Security] DATA_ENCRYPTION_KEY no está configurada en las variables de entorno.');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Cifra un texto confidencial (DNI, fecha de nacimiento exacta, teléfono) mediante AES-256-GCM.
 * Devuelve una cadena con formato: `${ivHex}:${authTagHex}:${encryptedHex}`
 */
export function encryptData(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descifra un dato cifrado con AES-256-GCM comprobando la autenticidad del AuthTag.
 */
export function decryptData(cipherText: string): string {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // Si no tiene el formato de 3 partes, devolver el valor tal cual por retrocompatibilidad
    return cipherText;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Encryption] Fallo de integridad o descifrado:', err);
    return '';
  }
}

/**
 * Genera un índice ciego (Blind Index / HMAC-SHA256) para permitir búsquedas exactas en base de datos
 * sin necesidad de descifrar los datos ni almacenarlos en texto plano.
 */
export function generateBlindIndex(text: string): string {
  if (!text) return '';
  const normalized = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
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
