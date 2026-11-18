import { NextRequest, NextResponse } from 'next/server';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  inspectInvitationToken,
  claimAndApplyInvitation,
  hashIntranetPassword,
  createIntranetSession,
  setIntranetSessionCookie,
} from '@/lib/intranet/auth';
import { buildUserAccessContext } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`intranet-invite-inspect:${clientIp}`, 25, 600, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas consultas de invitación. Espera unos minutos.' },
        { status: 429 }
      );
    }

    const token = req.nextUrl.searchParams.get('invite') || '';
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token no indicado.' }, { status: 400 });
    }
    const inv = await inspectInvitationToken(token);
    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'La invitación no es válida, ya fue usada o ha caducado.' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      invitation: {
        id: inv.id,
        email: inv.email,
        targetType: inv.target_type,
        roleCodes: inv.role_codes,
        teamSeasonIds: inv.team_season_ids,
        athleteId: inv.athlete_id,
        metadata: inv.metadata_json,
        expiresAt: inv.expires_at,
      },
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Invite Inspect');
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`intranet-invite:${clientIp}`, 10, 600, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos. Espera unos minutos.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawToken = String(body?.token || '').trim();
    const name = String(body?.name || '').trim();
    const phone = body?.phone ? String(body.phone).trim() : null;
    const password = String(body?.password || '');

    if (!rawToken || !name || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Indica tu nombre completo y una contraseña de al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    const passHash = hashIntranetPassword(password);
    const claimed = await claimAndApplyInvitation({
      rawToken,
      name,
      phone,
      passwordHash: passHash,
      revokeExistingSessions: true,
    });

    if (!claimed) {
      return NextResponse.json(
        { success: false, error: 'Invitación inválida, caducada o cuenta suspendida.' },
        { status: 404 }
      );
    }

    const { rawToken: sessToken, expiresAt } = await createIntranetSession({
      userId: claimed.userId,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: true,
    });
    setIntranetSessionCookie(sessToken, expiresAt);

    const ctx = await buildUserAccessContext({
      sessionId: 'invite',
      twoFactorVerified: true,
      user: {
        id: claimed.userId,
        email: claimed.email,
        name: claimed.name,
        phone: claimed.phone,
        emailVerified: true,
        totpEnabled: false,
        status: 'ACTIVE',
      },
    });

    await recordAuditLog({
      actorUserId: claimed.userId,
      actorEmail: claimed.email,
      action: 'ACCEPT_INVITATION',
      module: 'Auth',
      targetType: 'INVITATION',
      targetId: claimed.invitationId,
      details: { targetType: claimed.targetType, roles: claimed.roleCodes },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      requiresTwoFactorSetup: false,
      redirectTo: ctx.isStaff ? '/club' : '/mi-club',
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Invite Accept');
  }
}
