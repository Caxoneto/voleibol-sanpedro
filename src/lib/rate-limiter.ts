/**
 * Utilidades de control de tasa (Rate Limiting) y extracción de IP para mitigar
 * ataques de fuerza bruta en endpoints de autenticación y verificación.
 */

export interface RateLimiterOptions {
  windowMs: number;
  maxAttempts: number;
}

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

export class MemoryRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private windowMs: number;
  private maxAttempts: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxAttempts = options.maxAttempts;
  }

  /**
   * Comprueba si una clave (IP o identificador) ha superado el límite de intentos permitidos.
   */
  public isRateLimited(key: string): boolean {
    const record = this.attempts.get(key);
    if (!record) return false;

    const now = Date.now();
    if (now - record.firstAttemptAt > this.windowMs) {
      this.attempts.delete(key);
      return false;
    }

    return record.count >= this.maxAttempts;
  }

  /**
   * Registra un intento fallido para la clave especificada.
   */
  public recordFailedAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttemptAt: now });
    } else {
      record.count += 1;
    }
  }

  /**
   * Limpia el registro de intentos tras un intento exitoso.
   */
  public clearAttempts(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Devuelve los segundos restantes de bloqueo.
   */
  public getRemainingSeconds(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    const elapsed = Date.now() - record.firstAttemptAt;
    const remaining = Math.max(0, this.windowMs - elapsed);
    return Math.ceil(remaining / 1000);
  }
}

/**
 * Obtiene la dirección IP del cliente priorizando cabeceras de Netlify y proxies seguros.
 */
export function getClientIp(request: Request): string {
  // Cabecera específica y segura de Netlify Edge
  const nfIp = request.headers.get('x-nf-client-connection-ip');
  if (nfIp) return nfIp.trim();

  // Cabecera estándar de proxy inverso
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Instancia preconfigurada para el login de administración (5 intentos fallidos en 10 min).
 */
export const adminLoginRateLimiter = new MemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
});

/**
 * Instancia preconfigurada para la verificación de deportistas (10 intentos fallidos en 10 min).
 */
export const consentVerifyRateLimiter = new MemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 10,
});
