import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import { isStrictEmail } from '@/lib/validators';
import { madridLocalToUtcIso } from '@/lib/date-utils';
import {
  requireIntranetSession,
  createIntranetInvitation,
  verifyIntranetPassword,
} from '@/lib/intranet/auth';
import { assertCan, can, IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { listAuditLogs, recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import {
  PERMISSIONS_CATALOG,
  ROLES_CATALOG,
  type PermissionCode,
  type PermissionScope,
  type RoleCode,
} from '@/lib/intranet/catalog';

export const dynamic = 'force-dynamic';

const VALID_ROLE_CODES = new Set<RoleCode>(ROLES_CATALOG.map((r) => r.code));
const VALID_STAFF_ROLES = new Set<RoleCode>(
  ROLES_CATALOG.filter((r) => r.isStaff && r.code !== 'PRESIDENTE').map((r) => r.code)
);
const PERMISSION_META_MAP = new Map(PERMISSIONS_CATALOG.map((p) => [p.code, p]));
const VALID_SCOPES = new Set<PermissionScope>(['GLOBAL', 'EQUIPO', 'PROPIO']);
const VALID_STAFF_FUNCTIONS = new Set(['HEAD_COACH', 'ASSISTANT', 'DELEGATE', 'TRAINER']);

function isUuid(val: unknown): val is string {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  );
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    if (!ctx.isPresident && !can(ctx, 'audit.view')) {
      throw new IntranetForbiddenError('Acceso restringido a Presidencia o Auditoría.');
    }

    await ensureIntranetSeeded();

    const sp = req.nextUrl.searchParams;
    const auditModule = sp.get('auditModule')?.trim() || undefined;
    const auditSearch = sp.get('auditSearch')?.trim() || undefined;
    const auditLimit = Math.min(Math.max(10, Number(sp.get('auditLimit') || 80)), 250);

    const auditLogs = await listAuditLogs({
      module: auditModule,
      search: auditSearch,
      limit: auditLimit,
    });

    // Si solo tiene audit.view (no es Presidente), limitar la respuesta a auditoría por mínimo privilegio
    if (!ctx.isPresident) {
      return NextResponse.json({
        success: true,
        isPresident: false,
        canManageGovernance: false,
        staffUsers: [],
        pendingInvitations: [],
        rolePermissions: [],
        overrides: [],
        auditLogs,
        catalog: {
          roles: ROLES_CATALOG,
          permissions: PERMISSIONS_CATALOG,
          teams: [],
        },
      });
    }

    const [
      userRows,
      userRoleRows,
      teamStaffRows,
      invitationRows,
      rolePermRows,
      overrideRows,
      teamRows,
    ] = await Promise.all([
      queryNeon<{
        id: string;
        email: string;
        name: string;
        phone: string | null;
        email_verified: boolean;
        totp_enabled: boolean;
        status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
        last_login_at: string | null;
        created_at: string;
      }>(
        `SELECT u.id::text AS id, u.email, u.name, u.phone, u.email_verified,
                u.totp_enabled, u.status, u.last_login_at::text, u.created_at::text
         FROM intranet_users u
         WHERE EXISTS (
           SELECT 1 FROM intranet_user_roles ur
           WHERE ur.user_id = u.id
             AND ur.role_code IN ('PRESIDENTE','DIRECTIVO','COORDINADOR','TESORERIA','SECRETARIA','ENTRENADOR','AYUDANTE','DELEGADO')
         )
         OR EXISTS (SELECT 1 FROM intranet_team_staff ts WHERE ts.user_id = u.id)
         OR EXISTS (SELECT 1 FROM intranet_invitations inv WHERE LOWER(inv.email) = LOWER(u.email) AND inv.target_type = 'STAFF')
         ORDER BY u.created_at ASC;`
      ),
      queryNeon<{
        id: string;
        user_id: string;
        role_code: RoleCode;
        team_season_id: string | null;
        valid_from: string;
        valid_to: string | null;
      }>(
        `SELECT id::text, user_id::text, role_code, team_season_id,
                valid_from::text, valid_to::text
         FROM intranet_user_roles
         WHERE valid_from <= NOW()
           AND (valid_to IS NULL OR valid_to > NOW())
         ORDER BY created_at ASC;`
      ),
      queryNeon<{
        id: string;
        user_id: string;
        team_season_id: string;
        staff_function: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
        valid_from: string;
        valid_to: string | null;
        team_name: string;
      }>(
        `SELECT ts.id::text, ts.user_id::text, ts.team_season_id, ts.staff_function,
                ts.valid_from::text, ts.valid_to::text, t.name AS team_name
         FROM intranet_team_staff ts
         INNER JOIN intranet_team_seasons t ON t.id = ts.team_season_id
         WHERE ts.valid_from <= NOW()
           AND (ts.valid_to IS NULL OR ts.valid_to > NOW())
         ORDER BY t.sort_order ASC, t.name ASC;`
      ),
      queryNeon<{
        id: string;
        email: string;
        role_codes: RoleCode[];
        team_season_ids: string[];
        metadata_json: Record<string, unknown>;
        expires_at: string;
        created_at: string;
      }>(
        `SELECT id::text, email, role_codes, team_season_ids,
                COALESCE(metadata_json, '{}'::jsonb) AS metadata_json,
                expires_at::text, created_at::text
         FROM intranet_invitations
         WHERE target_type = 'STAFF'
           AND accepted_at IS NULL
           AND revoked_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC;`
      ),
      queryNeon<{
        role_code: RoleCode;
        permission_code: PermissionCode;
        scope: PermissionScope;
      }>(
        `SELECT role_code, permission_code, scope
         FROM intranet_role_permissions
         ORDER BY role_code, permission_code;`
      ),
      queryNeon<{
        id: string;
        user_id: string;
        user_name: string;
        user_email: string;
        permission_code: PermissionCode;
        effect: 'ALLOW' | 'DENY';
        scope: PermissionScope;
        team_season_id: string | null;
        reason: string | null;
        valid_from: string;
        valid_to: string | null;
        created_at: string;
      }>(
        `SELECT o.id::text, o.user_id::text, u.name AS user_name, u.email AS user_email,
                o.permission_code, o.effect, o.scope, o.team_season_id, o.reason,
                o.valid_from::text, o.valid_to::text, o.created_at::text
         FROM intranet_permission_overrides o
         INNER JOIN intranet_users u ON u.id = o.user_id
         WHERE (o.valid_to IS NULL OR o.valid_to > NOW())
         ORDER BY o.created_at DESC;`
      ),
      queryNeon<{
        id: string;
        season_id: string;
        category_id: string;
        name: string;
        division: string;
        association: 'FAVB' | 'AFADE';
        gender: 'MASCULINO' | 'FEMENINO';
        is_active: boolean;
        sort_order: number;
      }>(
        `SELECT t.id, t.season_id, t.category_id, t.name, t.division, t.association,
                t.gender, t.is_active, t.sort_order
         FROM intranet_team_seasons t
         INNER JOIN intranet_seasons s ON s.id = t.season_id
         WHERE s.is_current = true
         ORDER BY t.sort_order ASC, t.name ASC;`
      ),
    ]);

    const rolesByUser = new Map<string, Array<{
      id: string;
      roleCode: RoleCode;
      teamSeasonId: string | null;
      validFrom: string;
      validTo: string | null;
    }>>();
    for (const r of userRoleRows) {
      const list = rolesByUser.get(r.user_id) || [];
      list.push({
        id: r.id,
        roleCode: r.role_code,
        teamSeasonId: r.team_season_id,
        validFrom: r.valid_from,
        validTo: r.valid_to,
      });
      rolesByUser.set(r.user_id, list);
    }

    const teamsByUser = new Map<string, Array<{
      id: string;
      teamSeasonId: string;
      teamName: string;
      staffFunction: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
      validFrom: string;
      validTo: string | null;
    }>>();
    for (const ts of teamStaffRows) {
      const list = teamsByUser.get(ts.user_id) || [];
      list.push({
        id: ts.id,
        teamSeasonId: ts.team_season_id,
        teamName: ts.team_name,
        staffFunction: ts.staff_function,
        validFrom: ts.valid_from,
        validTo: ts.valid_to,
      });
      teamsByUser.set(ts.user_id, list);
    }

    const staffUsers = userRows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      emailVerified: u.email_verified,
      totpEnabled: u.totp_enabled,
      status: u.status,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      roles: rolesByUser.get(u.id) || [],
      teamAssignments: teamsByUser.get(u.id) || [],
    }));

    return NextResponse.json({
      success: true,
      isPresident: true,
      canManageGovernance: true,
      staffUsers,
      pendingInvitations: invitationRows.map((inv) => ({
        id: inv.id,
        email: inv.email,
        roleCodes: inv.role_codes,
        teamSeasonIds: inv.team_season_ids,
        metadata: inv.metadata_json,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      })),
      rolePermissions: rolePermRows.map((rp) => ({
        roleCode: rp.role_code,
        permissionCode: rp.permission_code,
        scope: rp.scope,
      })),
      overrides: overrideRows.map((o) => ({
        id: o.id,
        userId: o.user_id,
        userName: o.user_name,
        userEmail: o.user_email,
        permissionCode: o.permission_code,
        effect: o.effect,
        scope: o.scope,
        teamSeasonId: o.team_season_id,
        reason: o.reason,
        validFrom: o.valid_from,
        validTo: o.valid_to,
        createdAt: o.created_at,
      })),
      auditLogs,
      catalog: {
        roles: ROLES_CATALOG,
        permissions: PERMISSIONS_CATALOG,
        teams: teamRows.map((t) => ({
          id: t.id,
          seasonId: t.season_id,
          categoryId: t.category_id,
          name: t.name,
          division: t.division,
          association: t.association,
          gender: t.gender,
          isActive: t.is_active,
          sortOrder: t.sort_order,
        })),
      },
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Gov GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    const body = await req.json();
    const action = String(body?.action || '').trim();

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Acción no especificada.' },
        { status: 400 }
      );
    }

    // 1. Invitar miembro del staff
    if (action === 'invite_staff') {
      assertCan(ctx, 'staff.manage');

      const email = String(body?.email || '').trim().toLowerCase();
      const name = String(body?.name || '').trim();
      const phone = body?.phone ? String(body.phone).trim() : null;
      const rawRoles = Array.isArray(body?.roleCodes) ? body.roleCodes : [];
      const rawTeams = Array.isArray(body?.teamSeasonIds) ? body.teamSeasonIds : [];
      const sendEmail = body?.sendEmail !== false;

      if (!isStrictEmail(email) || name.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Correo electrónico o nombre no válido.' },
          { status: 400 }
        );
      }

      const roleCodes = Array.from(
        new Set<RoleCode>(
          rawRoles.map((r: unknown) => String(r) as RoleCode).filter((r: RoleCode) => VALID_STAFF_ROLES.has(r))
        )
      );
      if (roleCodes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Selecciona al menos un rol de staff válido (no Presidente).' },
          { status: 400 }
        );
      }

      const teamSeasonIds = Array.from(
        new Set<string>(rawTeams.map((t: unknown) => String(t).trim()).filter(Boolean))
      );

      const existing = await queryNeon<{ id: string; status: string }>(
        `SELECT id::text, status FROM intranet_users WHERE LOWER(email) = $1 LIMIT 1;`,
        [email]
      );

      let userId = existing[0]?.id;
      if (!userId) {
        const inserted = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_users (email, name, phone, status)
           VALUES ($1, $2, $3, 'INVITED')
           RETURNING id::text AS id;`,
          [email, name, phone]
        );
        userId = inserted[0].id;
      } else if (existing[0].status === 'SUSPENDED') {
        return NextResponse.json(
          { success: false, error: 'El usuario existe pero está suspendido. Reactívalo antes de invitarlo.' },
          { status: 409 }
        );
      }

      // Revocar invitaciones STAFF previas sin aceptar para evitar acumulación de enlaces viejos
      await queryNeon(
        `UPDATE intranet_invitations
         SET revoked_at = NOW()
         WHERE LOWER(email) = $1 AND target_type = 'STAFF' AND accepted_at IS NULL AND revoked_at IS NULL;`,
        [email]
      );

      const inv = await createIntranetInvitation({
        email,
        targetType: 'STAFF',
        roleCodes,
        teamSeasonIds,
        invitedByUserId: ctx.user.id,
        recipientName: name,
        sendEmail,
        metadata: { invitedName: name, phone },
      });

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'INVITE_STAFF',
        module: 'Gobernanza',
        targetType: 'INVITATION',
        targetId: inv.id,
        details: { email, name, roleCodes, teamSeasonIds, emailSent: inv.emailSent },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        invitationId: inv.id,
        userId,
        inviteUrl: inv.inviteUrl,
        emailSent: inv.emailSent,
        emailError: inv.emailError,
      });
    }

    // 1b. Revocar invitación pendiente
    if (action === 'revoke_invitation') {
      assertCan(ctx, 'staff.manage');
      const invitationId = String(body?.invitationId || '').trim();
      if (!isUuid(invitationId)) {
        return NextResponse.json({ success: false, error: 'ID de invitación no válido.' }, { status: 400 });
      }
      const rows = await queryNeon<{ id: string; email: string }>(
        `UPDATE intranet_invitations
         SET revoked_at = NOW()
         WHERE id = $1::uuid AND target_type = 'STAFF' AND accepted_at IS NULL AND revoked_at IS NULL
         RETURNING id::text, email;`,
        [invitationId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Invitación no encontrada o ya procesada.' }, { status: 404 });
      }
      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REVOKE_STAFF_INVITATION',
        module: 'Gobernanza',
        targetType: 'INVITATION',
        targetId: invitationId,
        details: { email: rows[0].email },
        ipAddress: clientIp,
      });
      return NextResponse.json({ success: true });
    }

    // 2. Activar / suspender usuario staff
    if (action === 'toggle_user_status') {
      assertCan(ctx, 'staff.manage');

      const targetUserId = String(body?.userId || '').trim();
      const nextStatus = String(body?.status || '').trim();

      if (!isUuid(targetUserId) || (nextStatus !== 'ACTIVE' && nextStatus !== 'SUSPENDED')) {
        return NextResponse.json(
          { success: false, error: 'Usuario o estado destino no válido.' },
          { status: 400 }
        );
      }

      if (targetUserId === ctx.user.id && nextStatus === 'SUSPENDED') {
        return NextResponse.json(
          { success: false, error: 'No puedes suspender tu propia cuenta de Presidente.' },
          { status: 400 }
        );
      }

      const presCheck = await queryNeon<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt
         FROM intranet_user_roles
         WHERE user_id = $1::uuid AND role_code = 'PRESIDENTE' AND valid_to IS NULL;`,
        [targetUserId]
      );
      if (Number(presCheck[0]?.cnt || 0) > 0 && nextStatus === 'SUSPENDED') {
        return NextResponse.json(
          { success: false, error: 'No se puede suspender al Presidente activo.' },
          { status: 400 }
        );
      }

      const updated = await queryNeon<{ id: string; email: string; status: string }>(
        `UPDATE intranet_users
         SET status = $2, updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id::text, email, status;`,
        [targetUserId, nextStatus]
      );
      if (updated.length === 0) {
        return NextResponse.json({ success: false, error: 'Usuario no encontrado.' }, { status: 404 });
      }

      if (nextStatus === 'SUSPENDED') {
        await queryNeon(
          `UPDATE intranet_sessions SET revoked_at = NOW() WHERE user_id = $1::uuid AND revoked_at IS NULL;`,
          [targetUserId]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: nextStatus === 'SUSPENDED' ? 'SUSPEND_STAFF' : 'ACTIVATE_STAFF',
        module: 'Gobernanza',
        targetType: 'USER',
        targetId: targetUserId,
        details: { email: updated[0].email, nextStatus },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, status: updated[0].status });
    }

    // 3. Asignar equipos múltiples a staff (intranet_team_staff)
    if (action === 'assign_staff_teams') {
      assertCan(ctx, 'team.assign_staff');

      const targetUserId = String(body?.userId || '').trim();
      if (!isUuid(targetUserId)) {
        return NextResponse.json({ success: false, error: 'ID de usuario no válido.' }, { status: 400 });
      }

      const rawAssignments = Array.isArray(body?.assignments) ? body.assignments : null;
      const fallbackTeamIds = Array.isArray(body?.teamSeasonIds) ? body.teamSeasonIds : [];
      const fallbackFn = String(body?.staffFunction || 'HEAD_COACH').trim();

      const normalized: Array<{
        teamSeasonId: string;
        staffFunction: string;
        validFromIso: string | null;
        validToIso: string | null;
      }> = [];

      if (rawAssignments) {
        for (const item of rawAssignments) {
          const teamSeasonId = String(item?.teamSeasonId || '').trim();
          const staffFunction = String(item?.staffFunction || 'HEAD_COACH').trim();
          if (!teamSeasonId || !VALID_STAFF_FUNCTIONS.has(staffFunction)) continue;
          const vf = item?.validFrom ? String(item.validFrom).trim() : '';
          const vt = item?.validTo ? String(item.validTo).trim() : '';
          normalized.push({
            teamSeasonId,
            staffFunction,
            validFromIso: /^\d{4}-\d{2}-\d{2}$/.test(vf) ? madridLocalToUtcIso(vf, '00:00') : null,
            validToIso: /^\d{4}-\d{2}-\d{2}$/.test(vt) ? madridLocalToUtcIso(vt, '23:59') : null,
          });
        }
      } else {
        const fn = VALID_STAFF_FUNCTIONS.has(fallbackFn) ? fallbackFn : 'HEAD_COACH';
        const vf = body?.validFrom ? String(body.validFrom).trim() : '';
        const vt = body?.validTo ? String(body.validTo).trim() : '';
        const validFromIso = /^\d{4}-\d{2}-\d{2}$/.test(vf) ? madridLocalToUtcIso(vf, '00:00') : null;
        const validToIso = /^\d{4}-\d{2}-\d{2}$/.test(vt) ? madridLocalToUtcIso(vt, '23:59') : null;
        for (const tid of fallbackTeamIds) {
          const teamSeasonId = String(tid || '').trim();
          if (teamSeasonId) {
            normalized.push({ teamSeasonId, staffFunction: fn, validFromIso, validToIso });
          }
        }
      }

      // Caducar asignaciones vigentes previas antes de aplicar el conjunto nuevo
      await queryNeon(
        `UPDATE intranet_team_staff
         SET valid_to = NOW()
         WHERE user_id = $1::uuid AND (valid_to IS NULL OR valid_to > NOW());`,
        [targetUserId]
      );

      for (const a of normalized) {
        await queryNeon(
          `INSERT INTO intranet_team_staff (
             user_id, team_season_id, staff_function, valid_from, valid_to, assigned_by
           ) VALUES (
             $1::uuid, $2, $3,
             COALESCE($4::timestamptz, NOW()),
             $5::timestamptz,
             $6::uuid
           )
           ON CONFLICT (user_id, team_season_id, staff_function) DO UPDATE SET
             valid_from = COALESCE(EXCLUDED.valid_from, NOW()),
             valid_to = EXCLUDED.valid_to,
             assigned_by = EXCLUDED.assigned_by;`,
          [
            targetUserId,
            a.teamSeasonId,
            a.staffFunction,
            a.validFromIso,
            a.validToIso,
            ctx.user.id,
          ]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'ASSIGN_STAFF_TEAMS',
        module: 'Gobernanza',
        targetType: 'USER',
        targetId: targetUserId,
        details: { count: normalized.length, assignments: normalized },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, count: normalized.length });
    }

    // 4. Actualizar roles de un usuario (nunca PRESIDENTE)
    if (action === 'set_user_roles') {
      assertCan(ctx, 'permissions.manage');

      const targetUserId = String(body?.userId || '').trim();
      const rawRoles = Array.isArray(body?.roleCodes) ? body.roleCodes : [];

      if (!isUuid(targetUserId)) {
        return NextResponse.json({ success: false, error: 'ID de usuario no válido.' }, { status: 400 });
      }

      if (rawRoles.includes('PRESIDENTE')) {
        return NextResponse.json(
          { success: false, error: 'El rol PRESIDENTE solo puede asignarse mediante Traspaso de Presidencia.' },
          { status: 400 }
        );
      }

      const roleCodes = Array.from(
        new Set<RoleCode>(
          rawRoles
            .map((r: unknown) => String(r) as RoleCode)
            .filter((r: RoleCode) => VALID_ROLE_CODES.has(r) && r !== 'PRESIDENTE')
        )
      );

      if (roleCodes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'El usuario debe conservar al menos un rol válido.' },
          { status: 400 }
        );
      }

      await queryNeon(
        `UPDATE intranet_user_roles
         SET valid_to = NOW()
         WHERE user_id = $1::uuid
           AND role_code <> 'PRESIDENTE'
           AND (valid_to IS NULL OR valid_to > NOW());`,
        [targetUserId]
      );

      for (const roleCode of roleCodes) {
        await queryNeon(
          `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id, granted_by)
           VALUES ($1::uuid, $2, NULL, $3::uuid);`,
          [targetUserId, roleCode, ctx.user.id]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'SET_USER_ROLES',
        module: 'Gobernanza',
        targetType: 'USER',
        targetId: targetUserId,
        details: { roleCodes },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, roleCodes });
    }

    // 5. Activar, desactivar o cambiar ámbito en la matriz de rol
    if (action === 'toggle_role_permission') {
      assertCan(ctx, 'permissions.manage');

      const roleCode = String(body?.roleCode || '').trim() as RoleCode;
      const permissionCode = String(body?.permissionCode || '').trim() as PermissionCode;
      const enabled = Boolean(body?.enabled);

      if (!VALID_ROLE_CODES.has(roleCode) || roleCode === 'PRESIDENTE') {
        return NextResponse.json(
          { success: false, error: 'No se puede modificar este rol.' },
          { status: 400 }
        );
      }

      const permMeta = PERMISSION_META_MAP.get(permissionCode);
      if (!permMeta || permMeta.isPresidentOnly) {
        return NextResponse.json(
          { success: false, error: 'Permiso no válido o exclusivo de Presidencia.' },
          { status: 400 }
        );
      }

      const requestedScope = String(body?.scope || permMeta.defaultScope).trim() as PermissionScope;
      const scope: PermissionScope = VALID_SCOPES.has(requestedScope)
        ? requestedScope
        : permMeta.defaultScope;

      if (!enabled) {
        await queryNeon(
          `DELETE FROM intranet_role_permissions WHERE role_code = $1 AND permission_code = $2;`,
          [roleCode, permissionCode]
        );
      } else {
        await queryNeon(
          `INSERT INTO intranet_role_permissions (role_code, permission_code, scope)
           VALUES ($1, $2, $3)
           ON CONFLICT (role_code, permission_code) DO UPDATE SET scope = EXCLUDED.scope;`,
          [roleCode, permissionCode, scope]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'TOGGLE_ROLE_PERMISSION',
        module: 'Gobernanza',
        targetType: 'ROLE_PERMISSION',
        targetId: `${roleCode}:${permissionCode}`,
        details: { roleCode, permissionCode, enabled, scope },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, roleCode, permissionCode, enabled, scope });
    }

    // 6. Crear excepción individual ALLOW/DENY
    if (action === 'upsert_override') {
      assertCan(ctx, 'permissions.manage');

      const targetUserId = String(body?.userId || '').trim();
      const permissionCode = String(body?.permissionCode || '').trim() as PermissionCode;
      const effect = String(body?.effect || '').trim();
      const scope = String(body?.scope || 'GLOBAL').trim() as PermissionScope;
      const teamSeasonId = body?.teamSeasonId ? String(body.teamSeasonId).trim() : null;
      const reason = String(body?.reason || '').trim();
      const validToDate = body?.validToDate ? String(body.validToDate).trim() : '';

      const permMeta = PERMISSION_META_MAP.get(permissionCode);
      if (!isUuid(targetUserId) || !permMeta) {
        return NextResponse.json({ success: false, error: 'Usuario o permiso no válido.' }, { status: 400 });
      }
      if (permMeta.isPresidentOnly) {
        return NextResponse.json(
          { success: false, error: 'Los permisos exclusivos de Presidencia no admiten excepciones.' },
          { status: 400 }
        );
      }
      if (effect !== 'ALLOW' && effect !== 'DENY') {
        return NextResponse.json({ success: false, error: 'Efecto debe ser ALLOW o DENY.' }, { status: 400 });
      }
      if (!VALID_SCOPES.has(scope)) {
        return NextResponse.json({ success: false, error: 'Ámbito no válido.' }, { status: 400 });
      }
      if (scope === 'EQUIPO' && !teamSeasonId) {
        return NextResponse.json(
          { success: false, error: 'Indica el equipo para una excepción de ámbito EQUIPO.' },
          { status: 400 }
        );
      }
      if (reason.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Indica un motivo de al menos 3 caracteres.' },
          { status: 400 }
        );
      }

      let validToIso: string | null = null;
      if (validToDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validToDate)) {
          return NextResponse.json({ success: false, error: 'Fecha de caducidad no válida.' }, { status: 400 });
        }
        validToIso = madridLocalToUtcIso(validToDate, '23:59');
      }

      const inserted = await queryNeon<{ id: string }>(
        `INSERT INTO intranet_permission_overrides (
           user_id, permission_code, effect, scope, team_season_id, reason, valid_to, granted_by
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::timestamptz, $8::uuid)
         RETURNING id::text AS id;`,
        [
          targetUserId,
          permissionCode,
          effect,
          scope,
          scope === 'EQUIPO' ? teamSeasonId : null,
          reason.slice(0, 300),
          validToIso,
          ctx.user.id,
        ]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_PERMISSION_OVERRIDE',
        module: 'Gobernanza',
        targetType: 'OVERRIDE',
        targetId: inserted[0]?.id || null,
        details: {
          targetUserId,
          permissionCode,
          effect,
          scope,
          teamSeasonId: scope === 'EQUIPO' ? teamSeasonId : null,
          reason,
          validTo: validToIso,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, overrideId: inserted[0]?.id });
    }

    // 7. Revocar excepción
    if (action === 'revoke_override') {
      assertCan(ctx, 'permissions.manage');

      const overrideId = String(body?.overrideId || '').trim();
      if (!isUuid(overrideId)) {
        return NextResponse.json({ success: false, error: 'ID de excepción no válido.' }, { status: 400 });
      }

      const rows = await queryNeon<{ id: string; user_id: string; permission_code: string }>(
        `UPDATE intranet_permission_overrides
         SET valid_to = NOW()
         WHERE id = $1::uuid AND (valid_to IS NULL OR valid_to > NOW())
         RETURNING id::text, user_id::text, permission_code;`,
        [overrideId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Excepción no encontrada o ya caducada.' }, { status: 404 });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REVOKE_PERMISSION_OVERRIDE',
        module: 'Gobernanza',
        targetType: 'OVERRIDE',
        targetId: overrideId,
        details: { targetUserId: rows[0].user_id, permissionCode: rows[0].permission_code },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    // 8. Transferencia de Presidencia
    if (action === 'transfer_presidency') {
      assertCan(ctx, 'presidency.transfer');
      if (!ctx.isPresident) {
        throw new IntranetForbiddenError('Solo el Presidente activo puede transferir la presidencia.');
      }

      const currentPassword = String(body?.currentPassword || '');
      const successorUserId = String(body?.successorUserId || '').trim();

      if (!currentPassword || !isUuid(successorUserId)) {
        return NextResponse.json(
          { success: false, error: 'Debes indicar tu contraseña actual y seleccionar un sucesor válido.' },
          { status: 400 }
        );
      }

      if (successorUserId === ctx.user.id) {
        return NextResponse.json(
          { success: false, error: 'El sucesor debe ser otra persona distinta a ti.' },
          { status: 400 }
        );
      }

      const currentRows = await queryNeon<{ password_hash: string | null }>(
        `SELECT password_hash FROM intranet_users WHERE id = $1::uuid LIMIT 1;`,
        [ctx.user.id]
      );
      if (!verifyIntranetPassword(currentPassword, currentRows[0]?.password_hash)) {
        await recordAuditLog({
          actorUserId: ctx.user.id,
          actorEmail: ctx.user.email,
          action: 'TRANSFER_PRESIDENCY_FAILED',
          module: 'Gobernanza',
          targetType: 'USER',
          targetId: successorUserId,
          details: { reason: 'BAD_PASSWORD' },
          ipAddress: clientIp,
        });
        return NextResponse.json(
          { success: false, error: 'La contraseña actual del Presidente es incorrecta.' },
          { status: 401 }
        );
      }

      const successorRows = await queryNeon<{
        id: string;
        email: string;
        name: string;
        status: string;
        totp_enabled: boolean;
      }>(
        `SELECT id::text, email, name, status, totp_enabled
         FROM intranet_users
         WHERE id = $1::uuid
         LIMIT 1;`,
        [successorUserId]
      );
      const successor = successorRows[0];
      if (!successor || successor.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            success: false,
            error:
              'El sucesor debe ser un miembro del staff en estado ACTIVE.',
          },
          { status: 400 }
        );
      }

      // 1) Revocar rol PRESIDENTE del actual
      await queryNeon(
        `UPDATE intranet_user_roles
         SET valid_to = NOW()
         WHERE user_id = $1::uuid
           AND role_code = 'PRESIDENTE'
           AND valid_to IS NULL;`,
        [ctx.user.id]
      );

      // 2) Asignar DIRECTIVO al presidente saliente si no lo tenía
      await queryNeon(
        `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id, granted_by)
         SELECT $1::uuid, 'DIRECTIVO', NULL, $1::uuid
         WHERE NOT EXISTS (
           SELECT 1 FROM intranet_user_roles
           WHERE user_id = $1::uuid AND role_code = 'DIRECTIVO' AND team_season_id IS NULL AND valid_to IS NULL
         );`,
        [ctx.user.id]
      );

      // 3) Asignar PRESIDENTE al sucesor
      await queryNeon(
        `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id, granted_by)
         SELECT $2::uuid, 'PRESIDENTE', NULL, $1::uuid
         WHERE NOT EXISTS (
           SELECT 1 FROM intranet_user_roles
           WHERE user_id = $2::uuid AND role_code = 'PRESIDENTE' AND team_season_id IS NULL AND valid_to IS NULL
         );`,
        [ctx.user.id, successor.id]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'TRANSFER_PRESIDENCY',
        module: 'Gobernanza',
        targetType: 'USER',
        targetId: successor.id,
        details: {
          previousPresidentId: ctx.user.id,
          previousPresidentEmail: ctx.user.email,
          newPresidentId: successor.id,
          newPresidentEmail: successor.email,
          newPresidentName: successor.name,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        transferredTo: {
          id: successor.id,
          name: successor.name,
          email: successor.email,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `Acción no reconocida: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Gov POST');
  }
}
