import crypto from 'crypto';
import { queryNeon } from './streaming-store';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

const VALID_IP_REGEX = /^[a-fA-F0-9:.]{3,64}$/;

/**
 * Extrae la IP real del cliente priorizando la cabecera no falsificable de Netlify Edge.
 * Nunca colapsa clientes sin cabecera IP bajo una clave global 'unknown'.
 */
export function getClientIp(request: Request): string {
  const nfIp = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (nfIp && VALID_IP_REGEX.test(nfIp)) {
    return nfIp;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && VALID_IP_REGEX.test(realIp)) {
    return realIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp && VALID_IP_REGEX.test(firstIp)) {
      return firstIp;
    }
  }

  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ua}|${lang}`)
    .digest('hex')
    .slice(0, 16);

  return `anon-${fingerprint}`;
}

async function cleanupExpiredRateLimitsProbabilistic(): Promise<void> {
  if (Math.random() >= 0.02) return;
  try {
    await queryNeon(
      `DELETE FROM rate_limits
       WHERE window_started_at < NOW() - INTERVAL '24 hours'
         AND (blocked_until IS NULL OR blocked_until < NOW());`
    );
  } catch {
    // Limpieza oportunista: no interrumpir la petición principal si coincide con purga
  }
}

async function cleanupExpiredConsumedTokensProbabilistic(): Promise<void> {
  if (Math.random() >= 0.02) return;
  try {
    await queryNeon(
      `DELETE FROM consumed_tokens
       WHERE expires_at < NOW() - INTERVAL '1 hour';`
    );
  } catch {
    // Limpieza oportunista no bloqueante
  }
}

/**
 * Rate limiter distribuido y atómico sobre Neon (tabla `rate_limits`) para endpoints públicos y serverless Lambdas.
 * Incrementa el contador por ventana y bloquea durante `blockSec` al superar `maxAttempts`.
 * Si `options.increment === false`, consulta el estado actual del bucket sin incrementar ni crear fila.
 */
export async function checkNeonRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowSec: number,
  blockSec: number,
  options?: { increment?: boolean }
): Promise<RateLimitResult> {
  const safeKey = bucketKey.slice(0, 180);
  const safeMax = Math.max(1, Math.floor(maxAttempts));
  const safeWin = Math.max(1, Math.floor(windowSec));
  const safeBlock = Math.max(1, Math.floor(blockSec));

  if (options?.increment === false) {
    const rows = await queryNeon<{
      attempts: number;
      is_blocked: boolean;
      retry_after_sec: number | null;
    }>(
      `SELECT
         CASE
           WHEN (blocked_until IS NOT NULL AND blocked_until <= NOW())
             OR (window_started_at + make_interval(secs => $2) <= NOW())
             THEN 0
           ELSE attempts
         END::int AS attempts,
         (blocked_until IS NOT NULL AND blocked_until > NOW()) AS is_blocked,
         GREATEST(0, COALESCE(CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))), 0))::int AS retry_after_sec
       FROM rate_limits
       WHERE bucket_key = $1
       LIMIT 1;`,
      [safeKey, safeWin]
    );

    const row = rows[0];
    if (!row) {
      return { allowed: true, remaining: safeMax, retryAfterSec: 0 };
    }
    const attempts = Number(row.attempts ?? 0);
    const blocked = Boolean(row.is_blocked) || attempts >= safeMax;
    const retryAfterSec = blocked ? Math.max(1, Number(row.retry_after_sec ?? safeBlock)) : 0;
    return {
      allowed: !blocked,
      remaining: Math.max(0, safeMax - attempts),
      retryAfterSec,
    };
  }

  const rows = await queryNeon<{
    attempts: number;
    is_blocked: boolean;
    retry_after_sec: number | null;
  }>(
    `INSERT INTO rate_limits (bucket_key, attempts, window_started_at, blocked_until)
     VALUES ($1, 1, NOW(), NULL)
     ON CONFLICT (bucket_key) DO UPDATE SET
       attempts = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.attempts
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN 1
         ELSE rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.window_started_at
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN NOW()
         ELSE rate_limits.window_started_at
       END,
       blocked_until = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.blocked_until
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN NULL
         WHEN rate_limits.attempts + 1 > $2
           THEN NOW() + make_interval(secs => $4)
         ELSE NULL
       END
     RETURNING
       attempts,
       (blocked_until IS NOT NULL AND blocked_until > NOW()) AS is_blocked,
       GREATEST(0, COALESCE(CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))), 0))::int AS retry_after_sec;`,
    [safeKey, safeMax, safeWin, safeBlock]
  );

  await cleanupExpiredRateLimitsProbabilistic();

  const row = rows[0];
  const attempts = Number(row?.attempts ?? 1);
  const blocked = Boolean(row?.is_blocked) || attempts > safeMax;
  const retryAfterSec = blocked ? Math.max(1, Number(row?.retry_after_sec ?? safeBlock)) : 0;

  return {
    allowed: !blocked,
    remaining: Math.max(0, safeMax - attempts),
    retryAfterSec,
  };
}

/**
 * Comprueba si un bucket está bloqueado actualmente en Neon sin incrementar el contador.
 */
export async function isNeonRateLimited(
  bucketKey: string
): Promise<{ limited: boolean; retryAfterSec: number }> {
  const safeKey = bucketKey.slice(0, 180);
  const rows = await queryNeon<{ retry_after_sec: number }>(
    `SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))))::int AS retry_after_sec
     FROM rate_limits
     WHERE bucket_key = $1
       AND blocked_until IS NOT NULL
       AND blocked_until > NOW()
     LIMIT 1;`,
    [safeKey]
  );

  if (rows.length > 0) {
    return { limited: true, retryAfterSec: Number(rows[0].retry_after_sec || 60) };
  }
  return { limited: false, retryAfterSec: 0 };
}

/**
 * Registra un intento fallido de autenticación/verificación en Neon y activa bloqueo al alcanzar `maxAttempts`.
 */
export async function recordNeonFailedAttempt(
  bucketKey: string,
  maxAttempts: number,
  windowSec: number,
  blockSec: number
): Promise<{ blocked: boolean; retryAfterSec: number }> {
  const safeKey = bucketKey.slice(0, 180);
  const safeMax = Math.max(1, Math.floor(maxAttempts));
  const safeWin = Math.max(1, Math.floor(windowSec));
  const safeBlock = Math.max(1, Math.floor(blockSec));

  const rows = await queryNeon<{
    is_blocked: boolean;
    retry_after_sec: number | null;
  }>(
    `INSERT INTO rate_limits (bucket_key, attempts, window_started_at, blocked_until)
     VALUES ($1, 1, NOW(), CASE WHEN $2 <= 1 THEN NOW() + make_interval(secs => $4) ELSE NULL END)
     ON CONFLICT (bucket_key) DO UPDATE SET
       attempts = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.attempts
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN 1
         ELSE rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.window_started_at
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN NOW()
         ELSE rate_limits.window_started_at
       END,
       blocked_until = CASE
         WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > NOW()
           THEN rate_limits.blocked_until
         WHEN (rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until <= NOW())
           OR (rate_limits.window_started_at + make_interval(secs => $3) <= NOW())
           THEN CASE WHEN $2 <= 1 THEN NOW() + make_interval(secs => $4) ELSE NULL END
         WHEN rate_limits.attempts + 1 >= $2
           THEN NOW() + make_interval(secs => $4)
         ELSE NULL
       END
     RETURNING
       (blocked_until IS NOT NULL AND blocked_until > NOW()) AS is_blocked,
       GREATEST(0, COALESCE(CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))), 0))::int AS retry_after_sec;`,
    [safeKey, safeMax, safeWin, safeBlock]
  );

  await cleanupExpiredRateLimitsProbabilistic();

  const row = rows[0];
  const blocked = Boolean(row?.is_blocked);
  return {
    blocked,
    retryAfterSec: blocked ? Math.max(1, Number(row?.retry_after_sec ?? safeBlock)) : 0,
  };
}

/**
 * Limpia los intentos fallidos de un bucket tras autenticación satisfactoria.
 */
export async function clearNeonRateLimit(bucketKey: string): Promise<void> {
  const safeKey = bucketKey.slice(0, 180);
  await queryNeon(`DELETE FROM rate_limits WHERE bucket_key = $1;`, [safeKey]);
}

/**
 * Registra atómicamente el consumo único de un token (verificationToken, directToken o revocación de sesión admin).
 * Devuelve `true` si es la primera vez que se consume; `false` si ya había sido utilizado/revocado.
 */
export async function consumeTokenOnce(
  jti: string,
  tokenType: string,
  expiresAtIso: string
): Promise<boolean> {
  if (!jti || !tokenType || !expiresAtIso) return false;

  const rows = await queryNeon<{ jti: string }>(
    `INSERT INTO consumed_tokens (jti, token_type, expires_at, consumed_at)
     VALUES ($1, $2, $3::timestamptz, NOW())
     ON CONFLICT (jti) DO NOTHING
     RETURNING jti;`,
    [jti.slice(0, 128), tokenType.slice(0, 64), expiresAtIso]
  );

  await cleanupExpiredConsumedTokensProbabilistic();
  return rows.length === 1;
}

/**
 * Comprueba en Neon si un token identificado por `jti` ha sido consumido o revocado.
 */
export async function isTokenConsumed(jti: string): Promise<boolean> {
  if (!jti) return true;
  const rows = await queryNeon<{ jti: string }>(
    `SELECT jti FROM consumed_tokens WHERE jti = $1 LIMIT 1;`,
    [jti.slice(0, 128)]
  );
  return rows.length > 0;
}

function getAdminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || '';
  const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
  if (!secret || (isProd && secret.length < 32)) {
    throw new Error('[Security] ADMIN_SESSION_SECRET no está configurada o es insuficiente.');
  }
  return secret;
}

/**
 * Emite un token de sesión admin HMAC-SHA256 con identificador único `jti` revocable en logout.
 */
export function createAdminSessionToken(username: string): string {
  const secret = getAdminSessionSecret();
  const iat = Date.now();
  const exp = iat + 24 * 60 * 60 * 1000;
  const payload = {
    user: username,
    jti: crypto.randomUUID(),
    iat,
    exp,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(b64Payload)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifica primero la firma HMAC en tiempo constante antes de parsear el payload JSON.
 */
export function verifyAdminSessionHmac(token: string | null | undefined): {
  valid: boolean;
  user?: string;
  jti?: string;
  exp?: number;
} {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

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
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.user !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      user: payload.user,
      jti: typeof payload.jti === 'string' ? payload.jti : undefined,
      exp: payload.exp,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Verifica firma HMAC, caducidad, presencia de `jti` y no revocación server-side en Neon `consumed_tokens`.
 */
export async function verifyAdminSessionToken(token: string | null | undefined): Promise<boolean> {
  const parsed = verifyAdminSessionHmac(token);
  if (!parsed.valid || !parsed.jti) {
    return false;
  }

  const revoked = await isTokenConsumed(parsed.jti);
  return !revoked;
}
