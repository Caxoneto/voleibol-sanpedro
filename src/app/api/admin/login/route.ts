import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSessionToken } from '@/lib/consent-store';
import { getClientIp, adminLoginRateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

function safeTimingCompare(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    if (adminLoginRateLimiter.isRateLimited(clientIp)) {
      const remainingSec = adminLoginRateLimiter.getRemainingSeconds(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos. Espera ${Math.ceil(remainingSec / 60)} minutos antes de reintentar.`,
        },
        { status: 429 }
      );
    }

    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USER;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedUser || !expectedPassword) {
      console.error('[Admin Auth] Variables de entorno ADMIN_USER o ADMIN_PASSWORD no configuradas');
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales de administración no configuradas en el servidor.',
        },
        { status: 500 }
      );
    }

    const isUserValid = safeTimingCompare(username, expectedUser);
    const isPassValid = safeTimingCompare(password, expectedPassword);

    if (!isUserValid || !isPassValid) {
      adminLoginRateLimiter.recordFailedAttempt(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario o contraseña incorrectos.',
        },
        { status: 401 }
      );
    }

    adminLoginRateLimiter.clearAttempts(clientIp);

    const sessionToken = createAdminSessionToken(username);

    const cookieStore = cookies();
    cookieStore.set({
      name: 'cdv_admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return NextResponse.json({
      success: true,
      user: username,
    });
  } catch (err) {
    console.error('[Admin Login] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno en el inicio de sesión.',
      },
      { status: 500 }
    );
  }
}
