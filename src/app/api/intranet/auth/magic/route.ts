import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  createMagicLoginToken,
  consumeMagicLoginToken,
  createIntranetSession,
  setIntranetSessionCookie,
  getPublicBaseUrl,
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
    const body = await req.json();
    const action = String(body?.action || 'request').trim();

    if (action === 'consume') {
      const rlConsume = await checkNeonRateLimit(`intranet-magic-consume:${clientIp}`, 12, 600, 600);
      if (!rlConsume.allowed) {
        return NextResponse.json(
          { success: false, error: 'Demasiados intentos de acceso. Espera unos minutos.' },
          { status: 429 }
        );
      }

      const rawToken = String(body?.token || '').trim();
      if (!rawToken || rawToken.length > 256) {
        return NextResponse.json(
          { success: false, error: 'El enlace de acceso no es válido.' },
          { status: 400 }
        );
      }

      const consumed = await consumeMagicLoginToken(rawToken);
      if (!consumed) {
        return NextResponse.json(
          { success: false, error: 'El enlace mágico ha caducado o ya fue utilizado. Solicita uno nuevo.' },
          { status: 400 }
        );
      }

      const rows = await queryNeon<{
        id: string;
        email: string;
        name: string;
        phone: string | null;
        email_verified: boolean;
        totp_enabled: boolean;
        status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
      }>(
        `SELECT id::text, email, name, phone, email_verified, totp_enabled, status
         FROM intranet_users
         WHERE LOWER(email) = $1
         LIMIT 1;`,
        [consumed.email.toLowerCase()]
      );

      const user = rows[0];
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tu cuenta aún no está activada. Utiliza el enlace de invitación recibido por correo.',
          },
          { status: 403 }
        );
      }
      if (user.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            success: false,
            error: 'Tu cuenta está suspendida o inactiva. Contacta con la directiva del club.',
          },
          { status: 403 }
        );
      }

      await queryNeon(`UPDATE intranet_users SET email_verified = true WHERE id = $1::uuid;`, [user.id]);

      const { rawToken: sessToken, expiresAt } = await createIntranetSession({
        userId: user.id,
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent'),
        twoFactorVerified: true,
      });
      setIntranetSessionCookie(sessToken, expiresAt);

      const ctx = await buildUserAccessContext({
        sessionId: 'magic',
        twoFactorVerified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          emailVerified: true,
          totpEnabled: false,
          status: user.status,
        },
      });

      await recordAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_MAGIC_LINK',
        module: 'Auth',
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        isStaff: ctx.isStaff,
        isMemberPortal: ctx.isMemberPortal,
        redirectTo: ctx.isStaff ? '/club' : '/mi-club',
      });
    }

    const rl = await checkNeonRateLimit(`intranet-magic:${clientIp}`, 5, 600, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes de enlace mágico. Inténtalo más tarde.' },
        { status: 429 }
      );
    }

    const email = String(body?.email || '').trim().toLowerCase();
    if (!isStrictEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Introduce un correo electrónico válido.' },
        { status: 400 }
      );
    }

    const acctRl = await checkNeonRateLimit(`intranet-magic-acct:${email}`, 4, 600, 900);
    if (!acctRl.allowed) {
      return NextResponse.json({
        success: true,
        message: 'Si el correo está autorizado en el club, recibirás un enlace directo de acceso en unos segundos.',
      });
    }

    const res = await createMagicLoginToken(email);
    if (!res.sent && res.error) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Si el correo está autorizado en el club, recibirás un enlace directo de acceso en unos segundos.',
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Magic Request');
  }
}

export async function GET(req: NextRequest) {
  const baseUrl = getPublicBaseUrl();
  const rawToken = (req.nextUrl.searchParams.get('token') || '').trim();
  if (!rawToken || rawToken.length > 256) {
    return NextResponse.redirect(`${baseUrl}/acceso?error=enlace_invalido`);
  }
  // Nunca consumir tokens de un solo uso en peticiones GET (protección frente a escáneres de correo/prefetch)
  return NextResponse.redirect(`${baseUrl}/acceso?magic=${encodeURIComponent(rawToken)}`);
}
