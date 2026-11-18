import { NextResponse } from 'next/server';
import {
  getIntranetSession,
  hasActivePresident,
  getOAuthProviderConfig,
} from '@/lib/intranet/auth';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [session, presidentExists] = await Promise.all([
      getIntranetSession(),
      hasActivePresident(),
    ]);

    const googleCfg = getOAuthProviderConfig('google');
    const msCfg = getOAuthProviderConfig('microsoft');

    return NextResponse.json({
      success: true,
      authenticated: Boolean(session),
      presidentExists,
      oauth: {
        google: googleCfg.configured,
        microsoft: msCfg.configured,
      },
      session: session
        ? {
            user: session.user,
            isPresident: session.isPresident,
            isStaff: session.isStaff,
            isMemberPortal: session.isMemberPortal,
            requiresTwoFactorSetup: session.requiresTwoFactorSetup,
            requiresTwoFactorChallenge: session.requiresTwoFactorChallenge,
            twoFactorVerified: session.twoFactorVerified,
            roles: session.roles,
            staffAssignments: session.staffAssignments,
            staffTeamIds: session.staffTeamIds,
            ownAthleteId: session.ownAthleteId,
            guardianAthleteIds: session.guardianAthleteIds,
            effectivePermissions: Object.keys(session.effectivePermissions),
          }
        : null,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Auth Me');
  }
}
