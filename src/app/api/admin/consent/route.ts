import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminSessionToken,
  getAdminConsentDashboard,
  revokePlayerConsent,
} from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Inicia sesión en el panel de administración.',
        },
        { status: 401 }
      );
    }

    const dashboard = await getAdminConsentDashboard();

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (err) {
    console.error('[Admin Consent GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al recuperar los datos del panel de consentimientos.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado.',
        },
        { status: 401 }
      );
    }

    const { playerId } = await req.json();

    if (!playerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de deportista no proporcionado.',
        },
        { status: 400 }
      );
    }

    const res = await revokePlayerConsent(playerId);

    return NextResponse.json(res);
  } catch (err) {
    console.error('[Admin Consent DELETE] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al revocar la autorización.',
      },
      { status: 500 }
    );
  }
}
