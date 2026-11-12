import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSessionToken } from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USER;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedUser || !expectedPassword) {
      console.error('[Admin Auth] Variables de entorno ADMIN_USER o ADMIN_PASSWORD no configuradas');
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales de administración no configuradas en el servidor.',
        },
        { status: 500 }
      );
    }

    if (username !== expectedUser || password !== expectedPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario o contraseña incorrectos.',
        },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken(username);

    const cookieStore = cookies();
    cookieStore.set({
      name: 'cdv_admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return NextResponse.json({
      success: true,
      user: username,
    });
  } catch (err) {
    console.error('[Admin Login] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno en el inicio de sesión.',
      },
      { status: 500 }
    );
  }
}
