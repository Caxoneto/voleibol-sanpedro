import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint 2FA desactivado temporalmente por configuración del club.
 * Bloqueado con 403 para impedir activaciones/mutaciones residuales hasta su despliegue definitivo.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'La autenticación en dos pasos (2FA) está desactivada en la configuración actual del club.',
    },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'La autenticación en dos pasos (2FA) está desactivada en la configuración actual del club.',
    },
    { status: 403 }
  );
}
