import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  inspectInvitationToken,
  hashIntranetPassword,
  createIntranetSession,
  setIntranetSessionCookie,
} from '@/lib/intranet/auth';
import { buildUserAccessContext } from '@/lib/intranet/rbac';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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

    const inv = await inspectInvitationToken(rawToken);
    if (!inv) {
      return NextResponse.json(
        { success: false, error: 'Invitación inválida o caducada.' },
        { status: 404 }
      );
    }

    const cleanEmail = inv.email.trim().toLowerCase();
    const passHash = hashIntranetPassword(password);

    const existingUsers = await queryNeon<{ id: string }>(
      `SELECT id::text AS id FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
      [cleanEmail]
    );

    let userId = existingUsers[0]?.id;
    if (!userId) {
      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_users (email, name, phone, password_hash, email_verified, status)
         VALUES ($1, $2, $3, $4, true, 'ACTIVE')
         RETURNING id::text AS id;`,
        [cleanEmail, name, phone, passHash]
      );
      userId = inserted[0].id;
    } else {
      await queryNeon(
        `UPDATE intranet_users
         SET name = $2, phone = COALESCE($3, phone), password_hash = $4,
             email_verified = true, status = 'ACTIVE', updated_at = NOW()
         WHERE id = $1::uuid;`,
        [userId, name, phone, passHash]
      );
    }

    // Asignar roles incluidos en la invitación (nunca PRESIDENTE por invitación ordinaria)
    for (const roleCode of inv.role_codes) {
      if (roleCode === 'PRESIDENTE') continue;
      if (inv.team_season_ids && inv.team_season_ids.length > 0 && ['ENTRENADOR', 'AYUDANTE', 'DELEGADO'].includes(roleCode)) {
        for (const teamId of inv.team_season_ids) {
          await queryNeon(
            `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id)
             SELECT $1::uuid, $2, $3
             WHERE NOT EXISTS (
               SELECT 1 FROM intranet_user_roles
               WHERE user_id = $1::uuid AND role_code = $2 AND team_season_id = $3 AND valid_to IS NULL
             );`,
            [userId, roleCode, teamId]
          );
          const fn = roleCode === 'ENTRENADOR' ? 'HEAD_COACH' : roleCode === 'AYUDANTE' ? 'ASSISTANT' : 'DELEGATE';
          await queryNeon(
            `INSERT INTO intranet_team_staff (user_id, team_season_id, staff_function)
             VALUES ($1::uuid, $2, $3)
             ON CONFLICT (user_id, team_season_id, staff_function) DO UPDATE SET valid_to = NULL;`,
            [userId, teamId, fn]
          );
        }
      } else {
        await queryNeon(
          `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id)
           SELECT $1::uuid, $2, NULL
           WHERE NOT EXISTS (
             SELECT 1 FROM intranet_user_roles
             WHERE user_id = $1::uuid AND role_code = $2 AND team_season_id IS NULL AND valid_to IS NULL
           );`,
          [userId, roleCode]
        );
      }
    }

    // Vincular deportista o tutela si procede
    if (inv.athlete_id) {
      if (inv.target_type === 'ATHLETE') {
        await queryNeon(
          `UPDATE intranet_athletes SET user_id = $2::uuid, status = 'VERIFICADO', verified_at = NOW(), updated_at = NOW() WHERE id = $1;`,
          [inv.athlete_id, userId]
        );
      } else if (inv.target_type === 'GUARDIAN') {
        await queryNeon(
          `UPDATE intranet_guardianships
           SET guardian_user_id = $2::uuid
           WHERE athlete_id = $1 AND (LOWER(email) = $3 OR guardian_user_id IS NULL);`,
          [inv.athlete_id, userId, cleanEmail]
        );
      }
    }

    await queryNeon(`UPDATE intranet_invitations SET accepted_at = NOW() WHERE id = $1::uuid;`, [inv.id]);

    const { rawToken: sessToken, expiresAt } = await createIntranetSession({
      userId,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: true,
    });
    setIntranetSessionCookie(sessToken, expiresAt);

    const ctx = await buildUserAccessContext({
      sessionId: 'invite',
      twoFactorVerified: true,
      user: {
        id: userId,
        email: cleanEmail,
        name,
        phone,
        emailVerified: true,
        totpEnabled: false,
        status: 'ACTIVE',
      },
    });

    await recordAuditLog({
      actorUserId: userId,
      actorEmail: cleanEmail,
      action: 'ACCEPT_INVITATION',
      module: 'Auth',
      targetType: 'INVITATION',
      targetId: inv.id,
      details: { targetType: inv.target_type, roles: inv.role_codes },
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
