import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  verifyIntranetPassword,
  createIntranetSession,
  setIntranetSessionCookie,
} from '@/lib/intranet/auth';
import { buildUserAccessContext } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { isStrictEmail } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    const rl = await checkNeonRateLimit(`intranet-login:${clientIp}`, 8, 600, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos fallidos. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const identifier = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const isUsername = /^[a-z0-9._-]{3,64}$/.test(identifier);

    if ((!isStrictEmail(identifier) && !isUsername) || !password) {
      return NextResponse.json(
        { success: false, error: 'Introduce tu correo electrónico (o usuario) y contraseña.' },
        { status: 400 }
      );
    }

    const acctRl = await checkNeonRateLimit(`intranet-login-acct:${identifier}`, 8, 600, 900);
    if (!acctRl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Cuenta temporalmente bloqueada por seguridad. Espera ${Math.ceil(acctRl.retryAfterSec / 60)} minutos.`,
        },
        { status: 429 }
      );
    }

    const rows = await queryNeon<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      password_hash: string | null;
      email_verified: boolean;
      totp_enabled: boolean;
      status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
    }>(
      `SELECT id::text, email, name, phone, password_hash, email_verified, totp_enabled, status
       FROM intranet_users
       WHERE LOWER(email) = $1
          OR ($2::boolean = true AND (LOWER(name) = $1 OR LOWER(SPLIT_PART(email, '@', 1)) = $1))
       ORDER BY CASE WHEN LOWER(email) = $1 THEN 0 WHEN LOWER(name) = $1 THEN 1 ELSE 2 END ASC
       LIMIT 1;`,
      [identifier, !identifier.includes('@')]
    );

    const user = rows[0];
    if (!user || user.status !== 'ACTIVE' || !verifyIntranetPassword(password, user.password_hash)) {
      await recordAuditLog({
        actorEmail: identifier,
        action: 'LOGIN_FAILED',
        module: 'Auth',
        details: { reason: !user ? 'NOT_FOUND' : user.status !== 'ACTIVE' ? 'INACTIVE' : 'BAD_PASSWORD' },
        ipAddress: clientIp,
      });
      return NextResponse.json(
        { success: false, error: 'Credenciales incorrectas o cuenta no activa.' },
        { status: 401 }
      );
    }

    const { rawToken, expiresAt } = await createIntranetSession({
      userId: user.id,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: true,
    });
    setIntranetSessionCookie(rawToken, expiresAt);

    const ctx = await buildUserAccessContext({
      sessionId: 'new',
      twoFactorVerified: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        emailVerified: user.email_verified,
        totpEnabled: false,
        status: user.status,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_PASSWORD',
      module: 'Auth',
      details: { totpRequired: false },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      requiresTwoFactorChallenge: false,
      requiresTwoFactorSetup: false,
      isStaff: ctx.isStaff,
      isMemberPortal: ctx.isMemberPortal,
      redirectTo: ctx.isStaff ? '/club' : '/mi-club',
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Login');
  }
}
