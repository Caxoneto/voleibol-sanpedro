import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getOAuthProviderConfig,
  getPublicBaseUrl,
  sealOAuthTxCookie,
  type OAuthProviderKey,
} from '@/lib/intranet/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: { provider: string } }
) {
  const providerRaw = context.params.provider?.toLowerCase();
  const baseUrl = getPublicBaseUrl();
  if (providerRaw !== 'google') {
    return NextResponse.redirect(`${baseUrl}/acceso?error=proveedor_no_soportado`);
  }
  const provider: OAuthProviderKey = 'google';
  const cfg = getOAuthProviderConfig(provider);

  if (!cfg.configured) {
    return NextResponse.redirect(`${baseUrl}/acceso?error=oauth_no_configurado_${provider}`);
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const inviteToken = req.nextUrl.searchParams.get('invite') || '';

  const cookieStore = cookies();
  cookieStore.set({
    name: 'cdv_oauth_tx',
    value: sealOAuthTxCookie({ state, codeVerifier, provider, inviteToken }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const authUrl = new URL(cfg.authUrl);
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('redirect_uri', cfg.callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', cfg.scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl.toString());
}
