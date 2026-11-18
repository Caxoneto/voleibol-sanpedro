import { NextResponse } from 'next/server';
import { revokeCurrentIntranetSession } from '@/lib/intranet/auth';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await revokeCurrentIntranetSession();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Logout');
  }
}
