import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import {
  getOAuthProviderConfig,
  getPublicBaseUrl,
  inspectInvitationToken,
  createIntranetSession,
  setIntranetSessionCookie,
  type OAuthProviderKey,
} from '@/lib/intranet/auth';
import { buildUserAccessContext } from '@/lib/intranet/rbac';
import { recordAuditLog } from '@/lib/intranet/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: { provider: string } }
) {
  const baseUrl = getPublicBaseUrl();
  const providerRaw = context.params.provider?.toLowerCase();
  if (providerRaw !== 'google' && providerRaw !== 'microsoft') {
    return NextResponse.redirect(`${baseUrl}/acceso?error=proveedor_no_soportado`);
  }
  const provider: OAuthProviderKey = providerRaw;

  try {
    const code = req.nextUrl.searchParams.get('code') || '';
    const state = req.nextUrl.searchParams.get('state') || '';
    const cookieStore = cookies();
    const txRaw = cookieStore.get('cdv_oauth_tx')?.value;
    cookieStore.delete('cdv_oauth_tx');

    if (!code || !state || !txRaw) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_estado_invalido`);
    }

    const tx = JSON.parse(txRaw) as {
      state: string;
      codeVerifier: string;
      provider: string;
      inviteToken?: string;
    };
    if (tx.state !== state || tx.provider !== provider) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_csrf`);
    }

    const cfg = getOAuthProviderConfig(provider);
    if (!cfg.configured) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_no_configurado_${provider}`);
    }

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: cfg.callbackUrl,
        grant_type: 'authorization_code',
        code_verifier: tx.codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_token_fallido`);
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_sin_token`);
    }

    let providerAccountId = '';
    let providerEmail = '';
    let emailVerified = false;
    let displayName = '';

    if (provider === 'google') {
      const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (!profileRes.ok) {
        return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_perfil_fallido`);
      }
      const p = (await profileRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };
      providerAccountId = String(p.sub || '');
      providerEmail = String(p.email || '').trim().toLowerCase();
      emailVerified = Boolean(p.email_verified);
      displayName = String(p.name || providerEmail);
    } else {
      const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (!profileRes.ok) {
        return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_perfil_fallido`);
      }
      const p = (await profileRes.json()) as {
        id?: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      };
      providerAccountId = String(p.id || '');
      providerEmail = String(p.mail || p.userPrincipalName || '').trim().toLowerCase();
      emailVerified = Boolean(providerEmail);
      displayName = String(p.displayName || providerEmail);
    }

    if (!providerAccountId || !providerEmail || !emailVerified) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_email_no_verificado`);
    }

    const dbProvider = provider === 'google' ? 'GOOGLE' : 'MICROSOFT';

    // 1. Buscar cuenta OAuth ya vinculada
    const linked = await queryNeon<{ user_id: string }>(
      `SELECT user_id::text FROM intranet_oauth_accounts WHERE provider = $1 AND provider_account_id = $2 LIMIT 1;`,
      [dbProvider, providerAccountId]
    );
    let userId = linked[0]?.user_id;

    // 2. Si no está vinculada, buscar usuario existente por email o invitación activa (NUNCA registro abierto)
    if (!userId) {
      const byEmail = await queryNeon<{ id: string; status: string }>(
        `SELECT id::text, status FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
        [providerEmail]
      );
      if (byEmail[0]) {
        userId = byEmail[0].id;
      } else if (tx.inviteToken) {
        const inv = await inspectInvitationToken(tx.inviteToken);
        if (inv && inv.email.toLowerCase() === providerEmail) {
          const ins = await queryNeon<{ id: string }>(
            `INSERT INTO intranet_users (email, name, email_verified, status)
             VALUES ($1, $2, true, 'ACTIVE') RETURNING id::text AS id;`,
            [providerEmail, displayName]
          );
          userId = ins[0].id;
          for (const rc of inv.role_codes) {
            if (rc === 'PRESIDENTE') continue;
            await queryNeon(
              `INSERT INTO intranet_user_roles (user_id, role_code) VALUES ($1::uuid, $2);`,
              [userId, rc]
            );
          }
          await queryNeon(`UPDATE intranet_invitations SET accepted_at = NOW() WHERE id = $1::uuid;`, [inv.id]);
        }
      }
    }

    if (!userId) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=cuenta_no_invitada`);
    }

    const uRows = await queryNeon<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      totp_enabled: boolean;
      status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
    }>(
      `SELECT id::text, email, name, phone, totp_enabled, status FROM intranet_users WHERE id = $1::uuid LIMIT 1;`,
      [userId]
    );
    const user = uRows[0];
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.redirect(`${baseUrl}/acceso?error=cuenta_inactiva`);
    }

    await queryNeon(
      `INSERT INTO intranet_oauth_accounts (user_id, provider, provider_account_id, provider_email)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (provider, provider_account_id) DO NOTHING;`,
      [user.id, dbProvider, providerAccountId, providerEmail]
    );

    const clientIp = getClientIp(req);
    const { rawToken, expiresAt } = await createIntranetSession({
      userId: user.id,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: !user.totp_enabled,
    });
    setIntranetSessionCookie(rawToken, expiresAt);

    const ctx = await buildUserAccessContext({
      sessionId: 'oauth',
      twoFactorVerified: !user.totp_enabled,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        emailVerified: true,
        totpEnabled: user.totp_enabled,
        status: user.status,
      },
    });

    await recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: `LOGIN_OAUTH_${dbProvider}`,
      module: 'Auth',
      ipAddress: clientIp,
    });

    if (ctx.requiresTwoFactorChallenge || ctx.requiresTwoFactorSetup) {
      return NextResponse.redirect(`${baseUrl}/acceso?step=2fa`);
    }
    return NextResponse.redirect(`${baseUrl}${ctx.isStaff ? '/club' : '/mi-club'}`);
  } catch (err) {
    console.error('[Intranet OAuth Callback]', err);
    return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_error_interno`);
  }
}
