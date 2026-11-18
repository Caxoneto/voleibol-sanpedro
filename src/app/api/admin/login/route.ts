import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createAdminSessionToken,
  getClientIp,
  isNeonRateLimited,
  recordNeonFailedAttempt,
  clearNeonRateLimit,
} from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SEC = 10 * 60;
const LOGIN_BLOCK_SEC = 10 * 60;
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

function safeTimingCompare(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const bucketKey = `admin-login:${clientIp}`;

    const rateStatus = await isNeonRateLimited(bucketKey);
    if (rateStatus.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos. Espera ${Math.ceil(rateStatus.retryAfterSec / 60)} minutos antes de reintentar.`,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rateStatus.retryAfterSec),
          },
        }
      );
    }

    let body: { username?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de solicitud JSON no válido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { username, password } = body;
    const expectedUser = process.env.ADMIN_USER;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedUser || !expectedPassword) {
      console.error('[Admin Auth] Variables de entorno ADMIN_USER o ADMIN_PASSWORD no configuradas');
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales de administración no configuradas en el servidor.',
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const isUserValid = safeTimingCompare(username, expectedUser);
    const isPassValid = safeTimingCompare(password, expectedPassword);

    if (!isUserValid || !isPassValid) {
      const failRes = await recordNeonFailedAttempt(
        bucketKey,
        MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_WINDOW_SEC,
        LOGIN_BLOCK_SEC
      );
      return NextResponse.json(
        {
          success: false,
          error: failRes.blocked
            ? `Demasiados intentos fallidos. Espera ${Math.ceil(failRes.retryAfterSec / 60)} minutos antes de reintentar.`
            : 'Usuario o contraseña incorrectos.',
        },
        {
          status: failRes.blocked ? 429 : 401,
          headers: failRes.blocked
            ? { ...NO_STORE_HEADERS, 'Retry-After': String(failRes.retryAfterSec) }
            : NO_STORE_HEADERS,
        }
      );
    }

    await clearNeonRateLimit(bucketKey);

    const safeUsername = String(username);
    const sessionToken = createAdminSessionToken(safeUsername);

    const cookieStore = cookies();
    cookieStore.set({
      name: 'cdv_admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json(
      {
        success: true,
        user: safeUsername,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Servicio de autenticación temporalmente no disponible (base de datos).',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[Admin Login] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno en el inicio de sesión.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
