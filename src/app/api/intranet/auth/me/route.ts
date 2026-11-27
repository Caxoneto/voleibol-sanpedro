import { NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { can } from '@/lib/intranet/rbac';
import {
  getIntranetSession,
  hasActivePresident,
} from '@/lib/intranet/auth';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [session, presidentExists] = await Promise.all([
      getIntranetSession(),
      hasActivePresident(),
    ]);

    const staffEffectivePermissions = session
      ? Object.values(session.effectivePermissions)
          .filter((g) => g.scope !== 'PROPIO' || g.code === 'substitution.request')
          .map((g) => g.code)
      : [];
    const effectivePermissionScopes = session
      ? Object.fromEntries(
          Object.values(session.effectivePermissions).map((g) => [g.code, g.scope])
        )
      : {};

    let pendingRegistrationsCount = 0;
    let pendingLopiviCount = 0;
    if (session) {
      const canSeeReg =
        session.isPresident ||
        can(session, 'registration.approve') ||
        can(session, 'athlete.edit');
      const [regCntRows, lopiviCntRows] = await Promise.all([
        canSeeReg
          ? queryNeon<{ cnt: number }>(
              `SELECT COUNT(*)::int AS cnt FROM intranet_registration_requests WHERE status = 'PENDING';`
            ).catch(() => [{ cnt: 0 }])
          : Promise.resolve([{ cnt: 0 }]),
        session.isPresident
          ? queryNeon<{ cnt: number }>(
              `SELECT COUNT(*)::int AS cnt FROM intranet_lopivi_incidents WHERE status IN ('RECIBIDA', 'EN_VALORACION');`
            ).catch(() => [{ cnt: 0 }])
          : Promise.resolve([{ cnt: 0 }]),
      ]);
      pendingRegistrationsCount = Number(regCntRows[0]?.cnt || 0);
      pendingLopiviCount = Number(lopiviCntRows[0]?.cnt || 0);
    }

    return NextResponse.json({
      success: true,
      authenticated: Boolean(session),
      presidentExists,
      oauth: {
        google: false,
        microsoft: false,
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
            effectivePermissions: staffEffectivePermissions,
            staffEffectivePermissions,
            effectivePermissionScopes,
            pendingRegistrationsCount,
            pendingLopiviCount,
          }
        : null,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Auth Me');
  }
}
