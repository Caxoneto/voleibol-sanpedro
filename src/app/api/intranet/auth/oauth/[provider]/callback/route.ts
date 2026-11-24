import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryNeon } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  getOAuthProviderConfig,
  getPublicBaseUrl,
  claimAndApplyInvitation,
  unsealOAuthTxCookie,
  createIntranetSession,
  setIntranetSessionCookie,
  isMemberBlockedByPendingApproval,
  type OAuthProviderKey,
} from '@/lib/intranet/auth';
import { buildUserAccessContext } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: { provider: string } }
) {
  const baseUrl = getPublicBaseUrl();
  const providerRaw = context.params.provider?.toLowerCase();
  if (providerRaw !== 'google') {
    return NextResponse.redirect(`${baseUrl}/acceso?error=proveedor_no_soportado`);
  }
  const provider: OAuthProviderKey = 'google';

  try {
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`intranet-oauth-cb:${clientIp}`, 20, 600, 600);
    if (!rl.allowed) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_error_interno`);
    }

    const code = req.nextUrl.searchParams.get('code') || '';
    const state = req.nextUrl.searchParams.get('state') || '';
    const cookieStore = cookies();
    const txRaw = cookieStore.get('cdv_oauth_tx')?.value;
    cookieStore.delete('cdv_oauth_tx');

    const tx = unsealOAuthTxCookie(txRaw);
    if (!code || !state || !tx) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_estado_invalido`);
    }

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
    const providerAccountId = String(p.sub || '');
    const providerEmail = String(p.email || '').trim().toLowerCase();
    const emailVerified = p.email_verified === true;
    const displayName = String(p.name || providerEmail);

    if (!providerAccountId || !providerEmail || !emailVerified) {
      return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_email_no_verificado`);
    }

    const dbProvider = 'GOOGLE';

    // 1. Buscar cuenta OAuth ya vinculada
    const linked = await queryNeon<{ user_id: string }>(
      `SELECT user_id::text FROM intranet_oauth_accounts WHERE provider = $1 AND provider_account_id = $2 LIMIT 1;`,
      [dbProvider, providerAccountId]
    );
    let userId = linked[0]?.user_id;

    // 2. Si viene con invitación explícita, reclamar y activar atómicamente (incluidos usuarios en estado INVITED)
    if (tx.inviteToken) {
      const claimed = await claimAndApplyInvitation({
        rawToken: tx.inviteToken,
        expectedEmail: providerEmail,
        name: displayName,
      });
      if (claimed) {
        userId = claimed.userId;
      }
    }

    // 3. Si aún no está resuelto, buscar usuario por correo o invitación pendiente por correo (NUNCA registro abierto)
    if (!userId) {
      const byEmail = await queryNeon<{ id: string; status: string }>(
        `SELECT id::text, status FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
        [providerEmail]
      );
      if (byEmail[0]) {
        if (byEmail[0].status === 'INVITED') {
          const claimedByEmail = await claimAndApplyInvitation({
            expectedEmail: providerEmail,
            name: displayName,
          });
          userId = claimedByEmail?.userId || byEmail[0].id;
        } else {
          userId = byEmail[0].id;
        }
      } else {
        const claimedByEmail = await claimAndApplyInvitation({
          expectedEmail: providerEmail,
          name: displayName,
        });
        if (claimedByEmail) {
          userId = claimedByEmail.userId;
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

    const ctx = await buildUserAccessContext({
      sessionId: 'oauth',
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

    const pendingApproval = await isMemberBlockedByPendingApproval(user.id, ctx);
    if (pendingApproval.blocked) {
      await recordAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_BLOCKED_PENDING_APPROVAL',
        module: 'Auth',
        details: {
          method: `OAUTH_${dbProvider}`,
          pendingRequests: pendingApproval.pendingRequests,
          pendingAthletes: pendingApproval.pendingAthletes,
        },
        ipAddress: clientIp,
      });
      return NextResponse.redirect(`${baseUrl}/acceso?error=pendiente_aprobacion`);
    }

    await queryNeon(
      `INSERT INTO intranet_oauth_accounts (user_id, provider, provider_account_id, provider_email)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (provider, provider_account_id) DO NOTHING;`,
      [user.id, dbProvider, providerAccountId, providerEmail]
    );

    const { rawToken, expiresAt } = await createIntranetSession({
      userId: user.id,
      ipAddress: clientIp,
      userAgent: req.headers.get('user-agent'),
      twoFactorVerified: true,
    });
    setIntranetSessionCookie(rawToken, expiresAt);

    await recordAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: `LOGIN_OAUTH_${dbProvider}`,
      module: 'Auth',
      ipAddress: clientIp,
    });

    return NextResponse.redirect(`${baseUrl}${ctx.isStaff ? '/club' : '/mi-club'}`);
  } catch (err) {
    console.error('[Intranet OAuth Callback]', err);
    return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_error_interno`);
  }
}
