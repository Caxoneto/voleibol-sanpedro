import { queryNeon } from '@/lib/streaming-store';
import {
  type RoleCode,
  type PermissionCode,
  type PermissionScope,
  PERMISSIONS_CATALOG,
  ROLES_CATALOG,
} from './catalog';

export class IntranetAuthError extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Sesión no válida o caducada.') {
    super(message);
    this.name = 'IntranetAuthError';
  }
}

export class IntranetForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message = 'No tienes permisos suficientes para realizar esta acción.') {
    super(message);
    this.name = 'IntranetForbiddenError';
  }
}

export interface UserRoleAssignment {
  id: string;
  roleCode: RoleCode;
  teamSeasonId: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface TeamStaffAssignment {
  id: string;
  teamSeasonId: string;
  staffFunction: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
}

export interface PermissionOverrideRecord {
  id: string;
  permissionCode: PermissionCode;
  effect: 'ALLOW' | 'DENY';
  scope: PermissionScope;
  teamSeasonId: string | null;
  reason: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface EffectivePermissionGrant {
  code: PermissionCode;
  scope: PermissionScope;
  teamSeasonIds: string[];
  source: 'PRESIDENT' | 'ROLE' | 'OVERRIDE';
}

export interface IntranetSessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export interface IntranetAccessContext {
  sessionId: string;
  twoFactorVerified: boolean;
  user: IntranetSessionUser;
  isPresident: boolean;
  isStaff: boolean;
  isMemberPortal: boolean;
  requiresTwoFactorSetup: boolean;
  requiresTwoFactorChallenge: boolean;
  roles: UserRoleAssignment[];
  staffAssignments: TeamStaffAssignment[];
  staffTeamIds: string[];
  overrides: PermissionOverrideRecord[];
  ownAthleteId: string | null;
  guardianAthleteIds: string[];
  effectivePermissions: Record<string, EffectivePermissionGrant>;
}

const PERMISSION_META_MAP = new Map(PERMISSIONS_CATALOG.map((p) => [p.code, p]));
const STAFF_ROLE_SET = new Set<RoleCode>(
  ROLES_CATALOG.filter((r) => r.isStaff).map((r) => r.code)
);

/**
 * Carga y resuelve todo el contexto de autorización RBAC del usuario desde Neon:
 * roles vigentes, asignaciones a equipos (`intranet_team_staff`), overrides (`ALLOW`/`DENY`)
 * y vínculos con fichas de deportista (`ownAthleteId`, `guardianAthleteIds`).
 */
export async function buildUserAccessContext(params: {
  sessionId: string;
  twoFactorVerified: boolean;
  user: IntranetSessionUser;
}): Promise<IntranetAccessContext> {
  const { user, sessionId, twoFactorVerified } = params;

  const [roleRows, staffRows, overrideRows, rolePermRows, ownAthleteRows, guardianRows] =
    await Promise.all([
      queryNeon<{
        id: string;
        role_code: RoleCode;
        team_season_id: string | null;
        valid_from: string;
        valid_to: string | null;
      }>(
        `SELECT id::text, role_code, team_season_id, valid_from::text, valid_to::text
         FROM intranet_user_roles
         WHERE user_id = $1::uuid
           AND valid_from <= NOW()
           AND (valid_to IS NULL OR valid_to > NOW());`,
        [user.id]
      ),
      queryNeon<{
        id: string;
        team_season_id: string;
        staff_function: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
      }>(
        `SELECT id::text, team_season_id, staff_function
         FROM intranet_team_staff
         WHERE user_id = $1::uuid
           AND valid_from <= NOW()
           AND (valid_to IS NULL OR valid_to > NOW());`,
        [user.id]
      ),
      queryNeon<{
        id: string;
        permission_code: PermissionCode;
        effect: 'ALLOW' | 'DENY';
        scope: PermissionScope;
        team_season_id: string | null;
        reason: string | null;
        valid_from: string;
        valid_to: string | null;
      }>(
        `SELECT id::text, permission_code, effect, scope, team_season_id, reason,
                valid_from::text, valid_to::text
         FROM intranet_permission_overrides
         WHERE user_id = $1::uuid
           AND valid_from <= NOW()
           AND (valid_to IS NULL OR valid_to > NOW());`,
        [user.id]
      ),
      queryNeon<{
        role_code: RoleCode;
        permission_code: PermissionCode;
        scope: PermissionScope;
      }>(
        `SELECT rp.role_code, rp.permission_code, rp.scope
         FROM intranet_role_permissions rp
         INNER JOIN intranet_user_roles ur ON ur.role_code = rp.role_code
         WHERE ur.user_id = $1::uuid
           AND ur.valid_from <= NOW()
           AND (ur.valid_to IS NULL OR ur.valid_to > NOW());`,
        [user.id]
      ),
      queryNeon<{ id: string }>(
        `SELECT id FROM intranet_athletes WHERE user_id = $1::uuid AND status <> 'SHREDDED' LIMIT 1;`,
        [user.id]
      ),
      queryNeon<{ athlete_id: string }>(
        `SELECT g.athlete_id
         FROM intranet_guardianships g
         INNER JOIN intranet_athletes a ON a.id = g.athlete_id
         WHERE g.guardian_user_id = $1::uuid
           AND a.status <> 'SHREDDED';`,
        [user.id]
      ),
    ]);

  const roles: UserRoleAssignment[] = roleRows.map((r) => ({
    id: r.id,
    roleCode: r.role_code,
    teamSeasonId: r.team_season_id,
    validFrom: r.valid_from,
    validTo: r.valid_to,
  }));

  const staffAssignments: TeamStaffAssignment[] = staffRows.map((s) => ({
    id: s.id,
    teamSeasonId: s.team_season_id,
    staffFunction: s.staff_function,
  }));

  const teamIdSet = new Set<string>();
  for (const s of staffAssignments) {
    teamIdSet.add(s.teamSeasonId);
  }
  for (const r of roles) {
    if (r.teamSeasonId) teamIdSet.add(r.teamSeasonId);
  }
  const staffTeamIds = Array.from(teamIdSet);

  const overrides: PermissionOverrideRecord[] = overrideRows.map((o) => ({
    id: o.id,
    permissionCode: o.permission_code,
    effect: o.effect,
    scope: o.scope,
    teamSeasonId: o.team_season_id,
    reason: o.reason,
    validFrom: o.valid_from,
    validTo: o.valid_to,
  }));

  const isPresident = roles.some((r) => r.roleCode === 'PRESIDENTE');
  const isStaff = roles.some((r) => STAFF_ROLE_SET.has(r.roleCode)) || staffAssignments.length > 0;
  const ownAthleteId = ownAthleteRows[0]?.id || null;
  const guardianAthleteIds = guardianRows.map((g) => g.athlete_id);
  const isMemberPortal =
    roles.some((r) => r.roleCode === 'TUTOR' || r.roleCode === 'JUGADOR') ||
    ownAthleteId !== null ||
    guardianAthleteIds.length > 0;

  // Verificación 2FA desactivada por decisión del club
  const requiresTwoFactorSetup = false;
  const requiresTwoFactorChallenge = false;

  // Resolver catálogo efectivo de permisos
  const effectivePermissions: Record<string, EffectivePermissionGrant> = {};

  if (isPresident) {
    for (const perm of PERMISSIONS_CATALOG) {
      effectivePermissions[perm.code] = {
        code: perm.code,
        scope: 'GLOBAL',
        teamSeasonIds: [],
        source: 'PRESIDENT',
      };
    }
  } else {
    // 1. Permisos heredados de roles activos
    for (const rp of rolePermRows) {
      const meta = PERMISSION_META_MAP.get(rp.permission_code);
      if (!meta || meta.isPresidentOnly) continue;

      const matchingRoleTeams = roles
        .filter((r) => r.roleCode === rp.role_code && r.teamSeasonId)
        .map((r) => r.teamSeasonId as string);
      const scopedTeams = Array.from(new Set([...staffTeamIds, ...matchingRoleTeams]));

      const existing = effectivePermissions[rp.permission_code];
      if (!existing) {
        effectivePermissions[rp.permission_code] = {
          code: rp.permission_code,
          scope: rp.scope,
          teamSeasonIds: rp.scope === 'EQUIPO' ? scopedTeams : [],
          source: 'ROLE',
        };
      } else {
        if (rp.scope === 'GLOBAL') {
          existing.scope = 'GLOBAL';
          existing.teamSeasonIds = [];
        } else if (rp.scope === 'EQUIPO' && existing.scope !== 'GLOBAL') {
          existing.scope = 'EQUIPO';
          existing.teamSeasonIds = Array.from(new Set([...existing.teamSeasonIds, ...scopedTeams]));
        }
      }
    }

    // 2. Aplicar overrides ALLOW
    for (const ov of overrides) {
      if (ov.effect !== 'ALLOW') continue;
      const meta = PERMISSION_META_MAP.get(ov.permissionCode);
      if (!meta || meta.isPresidentOnly) continue;

      const existing = effectivePermissions[ov.permissionCode];
      const ovTeams = ov.teamSeasonId ? [ov.teamSeasonId] : staffTeamIds;
      if (!existing) {
        effectivePermissions[ov.permissionCode] = {
          code: ov.permissionCode,
          scope: ov.scope,
          teamSeasonIds: ov.scope === 'EQUIPO' ? ovTeams : [],
          source: 'OVERRIDE',
        };
      } else if (ov.scope === 'GLOBAL') {
        existing.scope = 'GLOBAL';
        existing.teamSeasonIds = [];
      } else if (ov.scope === 'EQUIPO' && existing.scope !== 'GLOBAL') {
        existing.scope = 'EQUIPO';
        existing.teamSeasonIds = Array.from(new Set([...existing.teamSeasonIds, ...ovTeams]));
      }
    }

    // 3. Aplicar overrides DENY (prevalecen sobre cualquier rol o ALLOW)
    for (const ov of overrides) {
      if (ov.effect !== 'DENY') continue;
      const existing = effectivePermissions[ov.permissionCode];
      if (!existing) continue;

      if (ov.scope === 'GLOBAL' || !ov.teamSeasonId) {
        delete effectivePermissions[ov.permissionCode];
      } else if (ov.teamSeasonId && existing.scope === 'EQUIPO') {
        existing.teamSeasonIds = existing.teamSeasonIds.filter((tid) => tid !== ov.teamSeasonId);
        if (existing.teamSeasonIds.length === 0) {
          delete effectivePermissions[ov.permissionCode];
        }
      }
    }
  }

  return {
    sessionId,
    twoFactorVerified,
    user,
    isPresident,
    isStaff,
    isMemberPortal,
    requiresTwoFactorSetup,
    requiresTwoFactorChallenge,
    roles,
    staffAssignments,
    staffTeamIds,
    overrides,
    ownAthleteId,
    guardianAthleteIds,
    effectivePermissions,
  };
}

/**
 * Evalúa si el usuario tiene el permiso indicado para un ámbito concreto.
 */
export function can(
  ctx: IntranetAccessContext,
  permissionCode: PermissionCode,
  options?: {
    teamSeasonId?: string | null;
    targetUserId?: string | null;
    athleteId?: string | null;
  }
): boolean {
  if (ctx.user.status !== 'ACTIVE') return false;
  if (ctx.isPresident) return true;

  const meta = PERMISSION_META_MAP.get(permissionCode);
  if (!meta || meta.isPresidentOnly) return false;

  // Comprobar denegaciones explícitas granulares primero
  for (const ov of ctx.overrides) {
    if (ov.effect !== 'DENY' || ov.permissionCode !== permissionCode) continue;
    if (ov.scope === 'GLOBAL' || !ov.teamSeasonId) return false;
    if (options?.teamSeasonId && ov.teamSeasonId === options.teamSeasonId) return false;
  }

  const grant = ctx.effectivePermissions[permissionCode];
  if (!grant) return false;

  if (grant.scope === 'GLOBAL') return true;

  if (grant.scope === 'EQUIPO') {
    if (options?.teamSeasonId) {
      return grant.teamSeasonIds.includes(options.teamSeasonId);
    }
    return grant.teamSeasonIds.length > 0;
  }

  if (grant.scope === 'PROPIO') {
    if (options?.targetUserId) {
      return options.targetUserId === ctx.user.id;
    }
    if (options?.athleteId) {
      return (
        ctx.ownAthleteId === options.athleteId ||
        ctx.guardianAthleteIds.includes(options.athleteId)
      );
    }
    return true;
  }

  return false;
}

/**
 * Exige autorización en servidor y lanza `IntranetForbiddenError` (403) si no se cumple.
 */
export function assertCan(
  ctx: IntranetAccessContext,
  permissionCode: PermissionCode,
  options?: {
    teamSeasonId?: string | null;
    targetUserId?: string | null;
    athleteId?: string | null;
  }
): void {
  if (!can(ctx, permissionCode, options)) {
    throw new IntranetForbiddenError(
      `No tienes permiso (${permissionCode}) para realizar esta operación.`
    );
  }
}

/**
 * Devuelve null si tiene acceso global, o el conjunto de `team_season_id` autorizados.
 */
export function getAuthorizedTeamScope(
  ctx: IntranetAccessContext,
  permissionCode: PermissionCode
): { isGlobal: boolean; teamIds: string[] } {
  if (ctx.isPresident) {
    return { isGlobal: true, teamIds: [] };
  }
  const grant = ctx.effectivePermissions[permissionCode];
  if (!grant) {
    return { isGlobal: false, teamIds: [] };
  }
  if (grant.scope === 'GLOBAL') {
    return { isGlobal: true, teamIds: [] };
  }
  if (grant.scope === 'EQUIPO') {
    return { isGlobal: false, teamIds: grant.teamSeasonIds };
  }
  return { isGlobal: false, teamIds: [] };
}
