import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  hasActivePresident,
  bootstrapPresidentUser,
  createIntranetSession,
  setIntranetSessionCookie,
} from '@/lib/intranet/auth';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

function safeCompare(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Inicializa la cuenta única del rol PRESIDENTE verificando las credenciales de emergencia ADMIN_USER / ADMIN_PASSWORD.
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`intranet-bootstrap:${clientIp}`, 5, 900, 1800);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos en el alta inicial.' },
        { status: 429 }
      );
    }

    if (await hasActivePresident()) {
      return NextResponse.json(
        { success: false, error: 'La cuenta de Presidente ya está configurada en el sistema.' },
        { status: 409 }
      );
    }

    const body = await req.json();
    const adminUser = String(body?.adminUser || '');
    const adminPassword = String(body?.adminPassword || '');
    const expectedUser = process.env.ADMIN_USER?.trim() || '';
    const expectedPass = process.env.ADMIN_PASSWORD?.trim() || '';

    if (!expectedUser || !expectedPass) {
      return NextResponse.json(
        { success: false, error: 'Credenciales maestras del servidor no configuradas.' },
        { status: 500 }
      );
    }

    if (!safeCompare(adminUser, expectedUser) || !safeCompare(adminPassword, expectedPass)) {
      return NextResponse.json(
        { success: false, error: 'Credenciales maestras de autorización incorrectas.' },
        { status: 401 }
      );
    }

    const { userId } = await bootstrapPresidentUser({
      email: String(body?.email || ''),
      name: String(body?.name || ''),
      password: String(body?.password || ''),
      phone: body?.phone ? String(body.phone) : undefined,
      ipAddress: clientIp,
    });

    const { rawToken, expiresAt } = await createIntranetSession({
      userId,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: true,
    });
    setIntranetSessionCookie(rawToken, expiresAt);

    return NextResponse.json({
      success: true,
      requiresTwoFactorSetup: false,
      redirectTo: '/club',
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Bootstrap President');
  }
}
