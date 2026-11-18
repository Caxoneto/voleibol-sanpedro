import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  consumeTokenOnce,
  verifyAdminSessionHmac,
} from '@/lib/rate-limiter';
import { NeonUnavailableError } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
};

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get('cdv_admin_session')?.value;

  try {
    if (token) {
      const parsed = verifyAdminSessionHmac(token);
      if (parsed.valid && parsed.jti && parsed.exp) {
        await consumeTokenOnce(
          parsed.jti,
          'admin_session',
          new Date(parsed.exp).toISOString()
        );
      }
    }

    cookieStore.delete('cdv_admin_session');

    return NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada y revocada correctamente.',
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    cookieStore.delete('cdv_admin_session');

    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cookie eliminada, pero no se pudo registrar la revocación en base de datos.',
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    console.error('[Admin Logout] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al cerrar la sesión.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
