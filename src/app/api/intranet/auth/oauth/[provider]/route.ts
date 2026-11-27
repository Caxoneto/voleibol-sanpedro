import { NextRequest, NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/intranet/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  _context: { params: { provider: string } }
) {
  const baseUrl = getPublicBaseUrl();
  return NextResponse.redirect(`${baseUrl}/acceso?error=proveedor_no_soportado`);
}
