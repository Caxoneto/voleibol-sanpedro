import { NextRequest, NextResponse } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function addAllowedOrigin(set: Set<string>, rawUrl?: string | null, allowLocalHttp = false): void {
  if (!rawUrl || typeof rawUrl !== 'string') return;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    const isOfficial = host === 'voleibolsanpedro.es' || host === 'www.voleibolsanpedro.es';
    const isNetlify = host.endsWith('.netlify.app');
    const isLocal = allowLocalHttp && (host === 'localhost' || host === '127.0.0.1');

    if (parsed.protocol === 'https:' && (isOfficial || isNetlify)) {
      set.add(parsed.origin);
    } else if (isLocal && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      set.add(parsed.origin);
    }
  } catch {
    // Ignorar URLs no válidas
  }
}

function getAllowedOrigins(req: NextRequest): Set<string> {
  const isProd = process.env.NODE_ENV === 'production';
  const reqHost = req.nextUrl.hostname.toLowerCase();
  const allowLocalHttp = !isProd && (reqHost === 'localhost' || reqHost === '127.0.0.1');

  const allowed = new Set<string>([
    'https://voleibolsanpedro.es',
    'https://www.voleibolsanpedro.es',
  ]);

  addAllowedOrigin(allowed, process.env.NEXT_PUBLIC_SITE_URL, allowLocalHttp);
  addAllowedOrigin(allowed, process.env.URL, allowLocalHttp);
  addAllowedOrigin(allowed, process.env.DEPLOY_PRIME_URL, allowLocalHttp);

  if (reqHost.endsWith('.netlify.app')) {
    allowed.add(`https://${reqHost}`);
  }

  if (allowLocalHttp) {
    allowed.add(req.nextUrl.origin);
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed;
}

function isOriginAllowed(req: NextRequest): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const originHeader = req.headers.get('origin')?.trim();
  const refererHeader = req.headers.get('referer')?.trim();

  if (originHeader === 'null') {
    return false;
  }

  let candidateOrigin: string | null = null;
  if (originHeader) {
    try {
      candidateOrigin = new URL(originHeader).origin;
    } catch {
      return false;
    }
  } else if (refererHeader) {
    try {
      candidateOrigin = new URL(refererHeader).origin;
    } catch {
      return false;
    }
  } else {
    return false;
  }

  const allowed = getAllowedOrigins(req);
  if (allowed.has(candidateOrigin)) {
    return true;
  }

  // En desarrollo local (p. ej. puerto alternativo), permitir localhost/127.0.0.1 sobre http/https
  if (process.env.NODE_ENV !== 'production') {
    try {
      const parsed = new URL(candidateOrigin);
      const h = parsed.hostname.toLowerCase();
      const reqHost = req.nextUrl.hostname.toLowerCase();
      if (
        (reqHost === 'localhost' || reqHost === '127.0.0.1') &&
        (h === 'localhost' || h === '127.0.0.1') &&
        (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

function isSensitiveNoStorePath(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/autorizaciones' ||
    pathname.startsWith('/autorizaciones/') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/consent/')
  );
}

function applySensitiveHeaders(res: NextResponse): void {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(req.method.toUpperCase())) {
    if (!isOriginAllowed(req)) {
      const blockedRes = NextResponse.json(
        {
          success: false,
          error: 'Origen de solicitud no autorizado.',
        },
        { status: 403 }
      );
      applySensitiveHeaders(blockedRes);
      return blockedRes;
    }
  }

  const res = NextResponse.next();

  if (isSensitiveNoStorePath(pathname)) {
    applySensitiveHeaders(res);
  }

  return res;
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/autorizaciones',
    '/autorizaciones/:path*',
    '/api/:path*',
  ],
};
