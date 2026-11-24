'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { useClubSession } from '@/components/intranet/ClubShell';
import IntranetModal from '@/components/intranet/IntranetModal';
import { formatDisplayDate, formatMadridTime } from '@/lib/date-utils';
import { getShortTeamLabelInFamily, groupByCategoryFamily } from '@/lib/club-info';
import {
  SIMPLIFIED_PERMISSION_GROUPS,
  getSimplifiedPermissionLabel,
  type PermissionCode,
  type PermissionScope,
  type RoleCode,
  type SimplifiedPermissionGroup,
  type SimplifiedPermissionScope,
} from '@/lib/intranet/catalog';
import { AUDIT_MODULE_OPTIONS, presentAuditLog } from '@/lib/intranet/audit-presenter';

interface StaffRoleItem {
  id: string;
  roleCode: RoleCode;
  teamSeasonId: string | null;
  validFrom: string;
  validTo: string | null;
}

interface StaffTeamAssignment {
  id: string;
  teamSeasonId: string;
  teamName: string;
  staffFunction: 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER';
  validFrom: string;
  validTo: string | null;
}

interface StaffUserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
  roles: StaffRoleItem[];
  teamAssignments: StaffTeamAssignment[];
}

interface PendingInvitation {
  id: string;
  email: string;
  roleCodes: RoleCode[];
  teamSeasonIds: string[];
  metadata: Record<string, unknown>;
  expiresAt: string;
  createdAt: string;
}

interface RolePermissionEntry {
  roleCode: RoleCode;
  permissionCode: PermissionCode;
  scope: PermissionScope;
}

interface OverrideEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permissionCode: PermissionCode;
  effect: 'ALLOW' | 'DENY';
  scope: PermissionScope;
  teamSeasonId: string | null;
  reason: string | null;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  action: string;
  module: string;
  targetType: string | null;
  targetId: string | null;
  detailsJson: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface RoleCatalogItem {
  code: RoleCode;
  name: string;
  description: string;
  isStaff: boolean;
}

interface PermissionCatalogItem {
  code: PermissionCode;
  module: string;
  name: string;
  defaultScope: PermissionScope;
  isPresidentOnly: boolean;
}

interface TeamSeasonItem {
  id: string;
  seasonId: string;
  categoryId: string;
  name: string;
  division: string;
  association: 'FAVB' | 'AFADE';
  gender: 'MASCULINO' | 'FEMENINO';
  isActive: boolean;
  sortOrder: number;
}

interface AuditActorOption {
  email: string;
  name: string | null;
}

interface GovResponse {
  success: boolean;
  isPresident: boolean;
  canManageGovernance: boolean;
  staffUsers: StaffUserRow[];
  pendingInvitations: PendingInvitation[];
  rolePermissions: RolePermissionEntry[];
  overrides: OverrideEntry[];
  auditLogs: AuditLogItem[];
  auditActors?: AuditActorOption[];
  catalog: {
    roles: RoleCatalogItem[];
    permissions: PermissionCatalogItem[];
    permissionGroups?: SimplifiedPermissionGroup[];
    teams: TeamSeasonItem[];
  };
  error?: string;
}

type GovTab = 'staff' | 'matrix' | 'overrides' | 'audit';

const EDITABLE_STAFF_ROLES: RoleCode[] = [
  'DIRECTIVO',
  'COORDINADOR',
  'TESORERIA',
  'SECRETARIA',
  'ENTRENADOR',
  'AYUDANTE',
  'DELEGADO',
];

const STAFF_FUNCTION_LABELS: Record<
  'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER',
  string
> = {
  HEAD_COACH: '1er Entrenador',
  ASSISTANT: 'Ayudante',
  DELEGATE: 'Delegado',
  TRAINER: 'Prep. Físico',
};

const MATRIX_SCOPE_LABELS: Record<SimplifiedPermissionScope, string> = {
  GLOBAL: 'Todo el club',
  EQUIPO: 'Solo sus equipos',
};

const OVERRIDE_SCOPE_LABELS: Record<SimplifiedPermissionScope, string> = {
  GLOBAL: 'Todo el club',
  EQUIPO: 'Equipo',
};

const SIMPLIFIED_GROUP_BY_CODE = new Map<PermissionCode, SimplifiedPermissionGroup>(
  SIMPLIFIED_PERMISSION_GROUPS.flatMap((g) => g.memberCodes.map((code) => [code, g] as const))
);

function formatMadridTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Sin registro';
  return `${formatDisplayDate(iso)} · ${formatMadridTime(iso)}`;
}

export default function ClubGobiernoPage() {
  const { session, hasPermission } = useClubSession();
  const canViewAuditOnly = !session.isPresident && hasPermission('audit.view');
  const hasAccess = session.isPresident || hasPermission('audit.view');

  const [activeTab, setActiveTab] = useState<GovTab>(
    session.isPresident ? 'staff' : 'audit'
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [govData, setGovData] = useState<GovResponse | null>(null);

  // Búsqueda y filtros
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('ALL');
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditSearchInput, setAuditSearchInput] = useState('');
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});

  // Modal Invitar Staff
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRoles, setInviteRoles] = useState<RoleCode[]>(['ENTRENADOR']);
  const [inviteTeams, setInviteTeams] = useState<string[]>([]);
  const [inviteSendEmail, setInviteSendEmail] = useState(true);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [createdInviteBanner, setCreatedInviteBanner] = useState<{
    email: string;
    inviteUrl: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Modal Asignar Equipos
  const [teamsModalUser, setTeamsModalUser] = useState<StaffUserRow | null>(null);
  const [teamDraftMap, setTeamDraftMap] = useState<
    Record<string, 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER'>
  >({});
  const [defaultStaffFn, setDefaultStaffFn] = useState<
    'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER'
  >('HEAD_COACH');
  const [teamsValidFrom, setTeamsValidFrom] = useState('');
  const [teamsValidTo, setTeamsValidTo] = useState('');
  const [teamsSaving, setTeamsSaving] = useState(false);

  // Modal Cambiar Roles
  const [rolesModalUser, setRolesModalUser] = useState<StaffUserRow | null>(null);
  const [rolesDraft, setRolesDraft] = useState<RoleCode[]>([]);
  const [rolesSaving, setRolesSaving] = useState(false);

  // Matriz móvil / estado de guardado por celda
  const [mobileMatrixRole, setMobileMatrixRole] = useState<RoleCode>('COORDINADOR');
  const [matrixBusyCell, setMatrixBusyCell] = useState<string | null>(null);

  // Excepción Individual (modal)
  const defaultOverrideGroup = SIMPLIFIED_PERMISSION_GROUPS[0];
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [ovUserId, setOvUserId] = useState('');
  const [ovGroupId, setOvGroupId] = useState<string>(defaultOverrideGroup?.id || '');
  const [ovEffect, setOvEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [ovScope, setOvScope] = useState<SimplifiedPermissionScope>(
    defaultOverrideGroup?.defaultScope || 'EQUIPO'
  );
  const [ovTeamId, setOvTeamId] = useState('');
  const [ovValidTo, setOvValidTo] = useState('');
  const [ovReason, setOvReason] = useState('');
  const [ovSubmitting, setOvSubmitting] = useState(false);

  // Transferencia de Presidencia (modal único)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'form' | 'confirm'>('form');
  const [transferSuccessorId, setTransferSuccessorId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferPhrase, setTransferPhrase] = useState('');
  const [transferCheck, setTransferCheck] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const initialLoadedRef = useRef(false);

  const fetchGovData = useCallback(
    async (opts?: { auditModule?: string; auditSearch?: string; auditActor?: string }) => {
      setErrorMsg(null);
      try {
        const params = new URLSearchParams();
        if (opts?.auditModule) params.set('auditModule', opts.auditModule);
        if (opts?.auditSearch) params.set('auditSearch', opts.auditSearch);
        if (opts?.auditActor) params.set('auditActor', opts.auditActor);
        const qs = params.toString();
        const res = await fetch(`/api/intranet/gov${qs ? `?${qs}` : ''}`, {
          cache: 'no-store',
        });
        const data = (await res.json()) as GovResponse;
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo cargar el panel de gobierno.');
        }
        setGovData(data);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Error de conexión cargando datos.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!hasAccess || initialLoadedRef.current) return;
    initialLoadedRef.current = true;
    fetchGovData();
  }, [hasAccess, fetchGovData]);

  const roleNameMap = useMemo(() => {
    const map = new Map<RoleCode, string>();
    for (const r of govData?.catalog.roles || []) {
      map.set(r.code, r.name);
    }
    return map;
  }, [govData]);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of govData?.catalog.teams || []) {
      map.set(t.id, t.name);
    }
    return map;
  }, [govData]);

  const rolePermMap = useMemo(() => {
    const map = new Map<string, PermissionScope>();
    for (const rp of govData?.rolePermissions || []) {
      map.set(`${rp.roleCode}:${rp.permissionCode}`, rp.scope);
    }
    return map;
  }, [govData]);

  const permissionGroups = useMemo(
    () => govData?.catalog.permissionGroups || SIMPLIFIED_PERMISSION_GROUPS,
    [govData]
  );

  const simplifiedGroupsByModule = useMemo(() => {
    const grouped = new Map<string, SimplifiedPermissionGroup[]>();
    for (const g of permissionGroups) {
      const list = grouped.get(g.module) || [];
      list.push(g);
      grouped.set(g.module, list);
    }
    return Array.from(grouped.entries());
  }, [permissionGroups]);

  const selectedOverrideGroup = useMemo(
    () => permissionGroups.find((g) => g.id === ovGroupId) || permissionGroups[0],
    [permissionGroups, ovGroupId]
  );

  const groupedOverrides = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        overrideIds: string[];
        userId: string;
        userName: string;
        permissionLabel: string;
        effect: 'ALLOW' | 'DENY';
        scope: PermissionScope;
        teamSeasonId: string | null;
        reason: string | null;
        validTo: string | null;
      }
    >();

    for (const ov of govData?.overrides || []) {
      const grp = SIMPLIFIED_GROUP_BY_CODE.get(ov.permissionCode);
      const groupKey = grp?.id || ov.permissionCode;
      const compositeKey = [
        ov.userId,
        groupKey,
        ov.effect,
        ov.scope,
        ov.teamSeasonId || '',
        ov.reason || '',
        ov.validTo || '',
      ].join('|');

      const existing = map.get(compositeKey);
      if (existing) {
        existing.overrideIds.push(ov.id);
      } else {
        map.set(compositeKey, {
          key: compositeKey,
          overrideIds: [ov.id],
          userId: ov.userId,
          userName: ov.userName,
          permissionLabel: grp?.name || getSimplifiedPermissionLabel(ov.permissionCode),
          effect: ov.effect,
          scope: ov.scope,
          teamSeasonId: ov.teamSeasonId,
          reason: ov.reason,
          validTo: ov.validTo,
        });
      }
    }

    return Array.from(map.values());
  }, [govData]);

  const actorNameByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of govData?.staffUsers || []) {
      if (u.email && u.name) map.set(u.email.trim().toLowerCase(), u.name);
    }
    for (const a of govData?.auditActors || []) {
      if (a.email && a.name) map.set(a.email.trim().toLowerCase(), a.name);
    }
    return map;
  }, [govData]);

  const filteredStaff = useMemo(() => {
    const list = govData?.staffUsers || [];
    const q = staffSearch.trim().toLowerCase();
    return list.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.teamAssignments.some((ta) => ta.teamName.toLowerCase().includes(q));
      const matchesRole =
        staffRoleFilter === 'ALL' ||
        u.roles.some((r) => r.roleCode === staffRoleFilter);
      return matchesQuery && matchesRole;
    });
  }, [govData, staffSearch, staffRoleFilter]);

  const eligibleSuccessors = useMemo(() => {
    return (govData?.staffUsers || []).filter(
      (u) =>
        u.id !== session.user.id &&
        u.status === 'ACTIVE' &&
        u.roles.some((r) => r.roleCode !== 'TUTOR' && r.roleCode !== 'JUGADOR')
    );
  }, [govData, session.user.id]);

  async function postGovAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/intranet/gov', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo completar la operación.');
    }
    return data;
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inviteSubmitting) return;
    setInviteSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const res = await postGovAction({
        action: 'invite_staff',
        name: inviteName,
        email: inviteEmail,
        phone: invitePhone || null,
        roleCodes: inviteRoles,
        teamSeasonIds: inviteTeams,
        sendEmail: inviteSendEmail,
      });
      setCreatedInviteBanner({
        email: inviteEmail.trim().toLowerCase(),
        inviteUrl: res.inviteUrl,
        emailSent: Boolean(res.emailSent),
        emailError: res.emailError,
      });
      setInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRoles(['ENTRENADOR']);
      setInviteTeams([]);
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error invitando staff.');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleCopyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setErrorMsg('No se pudo copiar automáticamente al portapapeles.');
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setErrorMsg(null);
    try {
      await postGovAction({ action: 'revoke_invitation', invitationId });
      setFeedbackMsg('Invitación revocada correctamente.');
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error revocando invitación.');
    }
  }

  async function handleToggleStatus(user: StaffUserRow) {
    const nextStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await postGovAction({
        action: 'toggle_user_status',
        userId: user.id,
        status: nextStatus,
      });
      setFeedbackMsg(
        nextStatus === 'SUSPENDED'
          ? `Cuenta de ${user.name} suspendida.`
          : `Cuenta de ${user.name} reactivada.`
      );
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error actualizando estado.');
    }
  }

  function openInviteModal() {
    setErrorMsg(null);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteRoles(['ENTRENADOR']);
    setInviteTeams([]);
    setInviteSendEmail(true);
    setInviteModalOpen(true);
  }

  function openAssignTeamsModal(user: StaffUserRow) {
    const map: Record<string, 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER'> = {};
    for (const ta of user.teamAssignments) {
      map[ta.teamSeasonId] = ta.staffFunction;
    }
    setErrorMsg(null);
    setTeamsModalUser(user);
    setTeamDraftMap(map);
    setTeamsValidFrom('');
    setTeamsValidTo('');
  }

  async function handleSaveTeams(e: React.FormEvent) {
    e.preventDefault();
    if (!teamsModalUser || teamsSaving) return;
    setTeamsSaving(true);
    setErrorMsg(null);
    try {
      const assignments = Object.entries(teamDraftMap).map(([teamSeasonId, staffFunction]) => ({
        teamSeasonId,
        staffFunction,
        validFrom: teamsValidFrom || null,
        validTo: teamsValidTo || null,
      }));
      await postGovAction({
        action: 'assign_staff_teams',
        userId: teamsModalUser.id,
        assignments,
      });
      setFeedbackMsg(`Equipos actualizados para ${teamsModalUser.name}.`);
      setTeamsModalUser(null);
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando asignación de equipos.');
    } finally {
      setTeamsSaving(false);
    }
  }

  function openRolesModal(user: StaffUserRow) {
    const current = Array.from(
      new Set(
        user.roles
          .map((r) => r.roleCode)
          .filter((code) => code !== 'PRESIDENTE')
      )
    );
    setErrorMsg(null);
    setRolesModalUser(user);
    setRolesDraft(current.length > 0 ? current : ['ENTRENADOR']);
  }

  async function handleSaveRoles(e: React.FormEvent) {
    e.preventDefault();
    if (!rolesModalUser || rolesSaving) return;
    setRolesSaving(true);
    setErrorMsg(null);
    try {
      await postGovAction({
        action: 'set_user_roles',
        userId: rolesModalUser.id,
        roleCodes: rolesDraft,
      });
      setFeedbackMsg(`Roles actualizados para ${rolesModalUser.name}.`);
      setRolesModalUser(null);
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando roles.');
    } finally {
      setRolesSaving(false);
    }
  }

  async function handleToggleMatrixPermission(
    roleCode: RoleCode,
    group: SimplifiedPermissionGroup,
    enabled: boolean,
    scope: SimplifiedPermissionScope
  ) {
    const cellKey = `${roleCode}:${group.id}`;
    setMatrixBusyCell(cellKey);
    setErrorMsg(null);
    try {
      await postGovAction({
        action: 'toggle_role_permission',
        roleCode,
        permissionGroupId: group.id,
        enabled,
        scope,
      });
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error modificando permiso de rol.');
    } finally {
      setMatrixBusyCell(null);
    }
  }

  function handleSelectOverrideGroup(nextGroupId: string) {
    setOvGroupId(nextGroupId);
    const group = permissionGroups.find((g) => g.id === nextGroupId);
    if (!group) return;
    if (!group.allowedScopes.includes(ovScope)) {
      setOvScope(group.defaultScope);
      if (group.defaultScope === 'GLOBAL') setOvTeamId('');
    }
  }

  function openOverrideModal() {
    const firstGroup = permissionGroups[0];
    setErrorMsg(null);
    setOvUserId('');
    setOvGroupId(firstGroup?.id || '');
    setOvEffect('ALLOW');
    setOvScope(firstGroup?.defaultScope || 'EQUIPO');
    setOvTeamId('');
    setOvValidTo('');
    setOvReason('');
    setOverrideModalOpen(true);
  }

  async function handleCreateOverride(e: React.FormEvent) {
    e.preventDefault();
    if (ovSubmitting) return;
    setOvSubmitting(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await postGovAction({
        action: 'upsert_override',
        userId: ovUserId,
        permissionGroupId: ovGroupId,
        effect: ovEffect,
        scope: ovScope,
        teamSeasonId: ovScope === 'EQUIPO' ? ovTeamId : null,
        validToDate: ovValidTo || null,
        reason: ovReason,
      });
      setOverrideModalOpen(false);
      setFeedbackMsg('Excepción individual registrada correctamente.');
      setOvReason('');
      setOvValidTo('');
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando excepción.');
    } finally {
      setOvSubmitting(false);
    }
  }

  async function handleRevokeOverride(overrideIds: string[]) {
    setErrorMsg(null);
    try {
      await postGovAction({ action: 'revoke_override', overrideIds });
      setFeedbackMsg('Excepción revocada.');
      await fetchGovData({
        auditModule: auditModuleFilter,
        auditSearch: auditSearchInput,
        auditActor: auditActorFilter,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error revocando excepción.');
    }
  }

  function openTransferModal() {
    setErrorMsg(null);
    setTransferSuccessorId('');
    setTransferPassword('');
    setTransferPhrase('');
    setTransferCheck(false);
    setTransferStep('form');
    setTransferModalOpen(true);
  }

  async function handleTransferPresidency() {
    if (transferSubmitting) return;
    setTransferSubmitting(true);
    setErrorMsg(null);
    try {
      await postGovAction({
        action: 'transfer_presidency',
        currentPassword: transferPassword,
        successorUserId: transferSuccessorId,
      });
      setTransferModalOpen(false);
      window.location.href = '/club';
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo completar el traspaso.');
      setTransferStep('form');
    } finally {
      setTransferSubmitting(false);
    }
  }

  if (!hasAccess) {
    return (
      <div className="bg-surface-container border border-white/10 p-6 sm:p-8 text-center shadow-[4px_4px_0px_0px_#0e0e0e]">
        <Lock className="w-10 h-10 text-primary-container mx-auto mb-3" aria-hidden="true" />
        <h1 className="font-headline-md text-xl uppercase text-on-surface mb-2">
          Área Reservada a Presidencia
        </h1>
        <p className="text-sm text-tertiary max-w-md mx-auto">
          No dispones de permisos de Gobernanza ni de Auditoría para consultar este módulo.
        </p>
      </div>
    );
  }

  if (loading && !govData) {
    return (
      <div className="bg-surface-container border border-white/10 p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-primary-container animate-spin" aria-hidden="true" />
        <p className="text-xs font-label-md uppercase tracking-wider text-tertiary">
          Cargando panel de gobierno y auditoría...
        </p>
      </div>
    );
  }

  const tabs: Array<{ id: GovTab; label: string; visible: boolean }> = [
    { id: 'staff', label: 'Staff y Equipos', visible: session.isPresident },
    { id: 'matrix', label: 'Permisos por Rol', visible: session.isPresident },
    { id: 'overrides', label: 'Excepciones', visible: session.isPresident },
    { id: 'audit', label: 'Auditoría', visible: true },
  ];

  const activeUsersCount = (govData?.staffUsers || []).filter((u) => u.status === 'ACTIVE').length;

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* Cabecera */}
      <header className="bg-surface-container border border-white/10 p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0e0e0e]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-primary-container shrink-0" aria-hidden="true" />
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                {canViewAuditOnly ? 'Auditoría del Club' : 'Gobernanza del Presidente'}
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              {canViewAuditOnly ? 'Bitácora de Auditoría' : 'Gobierno del Club y Permisos'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {session.isPresident && (
              <button
                type="button"
                onClick={openTransferModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-low hover:bg-error-container/30 border border-error/35 text-xs font-label-md uppercase font-bold text-error cursor-pointer transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Traspasar Presidencia</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                fetchGovData({
                  auditModule: auditModuleFilter,
                  auditSearch: auditSearchInput,
                  auditActor: auditActorFilter,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Actualizar</span>
            </button>
            {session.isPresident && (
              <button
                type="button"
                onClick={openInviteModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[3px_3px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Invitar staff</span>
              </button>
            )}
          </div>
        </div>

        {/* KPIs rápidos */}
        {session.isPresident && govData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Staff Activo
              </p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-0.5">
                {activeUsersCount}
                <span className="text-xs text-tertiary font-normal ml-1">
                  / {govData.staffUsers.length}
                </span>
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Invitaciones Pendientes
              </p>
              <p className="font-headline text-2xl font-bold text-amber-400 mt-0.5">
                {govData.pendingInvitations.length}
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Excepciones Activas
              </p>
              <p className="font-headline text-2xl font-bold text-primary mt-0.5">
                {govData.overrides.length}
              </p>
            </div>
            <div className="bg-surface-container-low border border-white/5 p-3">
              <p className="text-[10px] font-label-sm uppercase tracking-wider text-tertiary">
                Logs Recientes
              </p>
              <p className="font-headline text-2xl font-bold text-emerald-400 mt-0.5">
                {govData.auditLogs.length}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="bg-error-container/40 border border-error/40 text-error px-4 py-3 text-xs sm:text-sm flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-error hover:text-white cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
            aria-label="Cerrar confirmación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {createdInviteBanner && (
        <div className="bg-surface-container-high border-2 border-primary-container p-4 space-y-2 shadow-[4px_4px_0px_0px_#0e0e0e]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-label-md uppercase font-bold text-primary">
                Invitación generada para {createdInviteBanner.email}
              </p>
              <p className="text-xs text-tertiary mt-0.5">
                {createdInviteBanner.emailSent
                  ? 'Correo enviado por SMTP correctamente. También puedes copiar el enlace directo:'
                  : `No se pudo enviar automáticamente por SMTP (${createdInviteBanner.emailError || 'sin SMTP configurado'}). Copia y entrega este enlace personalmente:`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreatedInviteBanner(null)}
              className="text-tertiary hover:text-white cursor-pointer"
              aria-label="Ocultar enlace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              aria-label="Enlace de invitación generado"
              value={createdInviteBanner.inviteUrl}
              className="flex-1 min-w-0 bg-surface-container-lowest border border-white/15 px-3 py-2 text-xs text-on-surface font-mono"
            />
            <button
              type="button"
              onClick={() => handleCopyInviteUrl(createdInviteBanner.inviteUrl)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shrink-0 cursor-pointer"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Copiado' : 'Copiar enlace'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pestañas */}
      <nav
        aria-label="Secciones de gobierno"
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-white/10"
      >
        {tabs
          .filter((t) => t.visible)
          .map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2.5 text-xs font-label-md uppercase tracking-wider font-bold whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-primary-container text-white border-primary-container shadow-[3px_3px_0px_0px_#0e0e0e]'
                    : 'bg-surface-container text-tertiary border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                {t.label}
              </button>
            );
          })}
      </nav>

      {/* PESTAÑA 1: STAFF Y EQUIPOS */}
      {activeTab === 'staff' && session.isPresident && govData && (
        <section className="space-y-5">
          {/* Invitaciones pendientes */}
          {govData.pendingInvitations.length > 0 && (
            <div className="bg-surface-container border border-amber-500/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <h2 className="font-headline-sm text-sm uppercase tracking-wider text-amber-300">
                  Invitaciones de Staff Pendientes ({govData.pendingInvitations.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {govData.pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-surface-container-low border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-on-surface truncate">
                        {String(inv.metadata?.invitedName || inv.email)}
                      </p>
                      <p className="text-xs text-tertiary truncate">{inv.email}</p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {inv.roleCodes.map((rc) => (
                          <span
                            key={rc}
                            className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-primary-container/20 text-primary border border-primary-container/40"
                          >
                            {roleNameMap.get(rc) || rc}
                          </span>
                        ))}
                        {inv.teamSeasonIds.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-surface-container-high text-tertiary border border-white/10">
                            {inv.teamSeasonIds.length} equipo(s)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-tertiary">
                        Caduca: {formatMadridTimestamp(inv.expiresAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvitation(inv.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-error-container/30 hover:bg-error-container/60 border border-error/30 text-error text-xs font-bold uppercase cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Revocar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros de Staff */}
          <div className="bg-surface-container border border-white/10 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search
                className="w-4 h-4 text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                aria-label="Buscar miembro del staff por nombre, correo o equipo"
                placeholder="Buscar por nombre, correo o equipo..."
                className="w-full bg-surface-container-low border border-white/15 pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-tertiary/60"
              />
            </div>
            <select
              value={staffRoleFilter}
              onChange={(e) => setStaffRoleFilter(e.target.value)}
              aria-label="Filtrar por rol"
              className="bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface sm:w-56"
            >
              <option value="ALL">Todos los roles</option>
              {govData.catalog.roles
                .filter((r) => r.isStaff)
                .map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Listado de Staff */}
          <div className="space-y-3">
            <h2 className="sr-only">Listado de miembros del Staff</h2>
            {filteredStaff.length === 0 ? (
              <div className="bg-surface-container border border-white/10 p-8 text-center text-sm text-tertiary">
                No hay miembros de staff que coincidan con el filtro actual.
              </div>
            ) : (
              filteredStaff.map((u) => {
                const isPresUser = u.roles.some((r) => r.roleCode === 'PRESIDENTE');
                const isSelf = u.id === session.user.id;
                const uniqueRoleCodes = Array.from(new Set(u.roles.map((r) => r.roleCode)));

                return (
                  <article
                    key={u.id}
                    className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface mr-1">
                            {u.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : u.status === 'INVITED'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                : 'bg-error-container/50 text-error border-error/40'
                            }`}
                          >
                            {u.status === 'ACTIVE'
                              ? 'Activo'
                              : u.status === 'INVITED'
                              ? 'Invitado'
                              : 'Suspendido'}
                          </span>
                          {uniqueRoleCodes.length === 0 ? (
                            <span className="px-2 py-0.5 text-[10px] text-tertiary italic border border-white/10">
                              Sin roles
                            </span>
                          ) : (
                            uniqueRoleCodes.map((code) => (
                              <span
                                key={code}
                                className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border ${
                                  code === 'PRESIDENTE'
                                    ? 'bg-primary-container text-white border-primary-container'
                                    : 'bg-primary-container/15 text-primary border-primary-container/35'
                                }`}
                              >
                                {roleNameMap.get(code) || code}
                              </span>
                            ))
                          )}
                        </div>

                        <p className="text-xs text-tertiary break-all">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ''} · Último acceso:{' '}
                          <span className="text-on-surface/85">
                            {formatMadridTimestamp(u.lastLoginAt)}
                          </span>
                        </p>
                      </div>

                      {/* Acciones rápidas */}
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openAssignTeamsModal(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          <span>Asignar equipos</span>
                        </button>
                        {!isPresUser && (
                          <button
                            type="button"
                            onClick={() => openRolesModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/15 text-xs font-label-md uppercase font-bold text-on-surface cursor-pointer"
                          >
                            <UserCog className="w-3.5 h-3.5 text-tertiary" aria-hidden="true" />
                            <span>Roles</span>
                          </button>
                        )}
                        {!isSelf && !isPresUser && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-label-md uppercase font-bold cursor-pointer ${
                              u.status === 'SUSPENDED'
                                ? 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-error-container/30 hover:bg-error-container/60 border-error/35 text-error'
                            }`}
                          >
                            {u.status === 'SUSPENDED' ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Reactivar</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Suspender</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Equipos asignados (desplegable compacto) */}
                    <details className="group pt-2 border-t border-white/5">
                      <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-label-sm uppercase tracking-wider text-tertiary hover:text-on-surface select-none">
                        <ChevronRight
                          className="w-3.5 h-3.5 text-primary transition-transform group-open:rotate-90 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Equipos asignados ({u.teamAssignments.length})</span>
                      </summary>
                      <div className="mt-2">
                        {u.teamAssignments.length === 0 ? (
                          <p className="text-xs text-tertiary/70">
                            Ningún equipo asignado directamente.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.teamAssignments.map((ta) => (
                              <span
                                key={ta.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-white/10 text-xs text-on-surface"
                              >
                                <span className="font-bold">{ta.teamName}</span>
                                <span className="text-[10px] uppercase text-primary font-semibold">
                                  · {STAFF_FUNCTION_LABELS[ta.staffFunction]}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* PESTAÑA 2: MATRIZ DE PERMISOS POR ROL */}
      {activeTab === 'matrix' && session.isPresident && govData && (
        <section className="space-y-4">
          <div className="bg-surface-container border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-headline-sm text-base uppercase text-on-surface">
              Matriz RBAC por Módulo y Rol
            </h2>
            {/* Selector de rol en móvil/tablet */}
            <div className="lg:hidden">
              <label htmlFor="gov-mobile-matrix-role" className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                Rol a editar
              </label>
              <select
                id="gov-mobile-matrix-role"
                value={mobileMatrixRole}
                onChange={(e) => setMobileMatrixRole(e.target.value as RoleCode)}
                className="w-full bg-surface-container-low border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {EDITABLE_STAFF_ROLES.map((rc) => (
                  <option key={rc} value={rc}>
                    {roleNameMap.get(rc) || rc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vista móvil (< lg) por rol seleccionado */}
          <div className="lg:hidden space-y-4">
            {simplifiedGroupsByModule.map(([modName, groups]) => (
              <div key={modName} className="bg-surface-container border border-white/10 p-3 space-y-2.5">
                <h3 className="font-label-md text-xs uppercase tracking-widest text-primary font-bold border-b border-white/10 pb-2">
                  {modName}
                </h3>
                {groups.map((grp) => {
                  const cellKey = `${mobileMatrixRole}:${grp.id}`;
                  const rawScope = rolePermMap.get(`${mobileMatrixRole}:${grp.primaryCode}`);
                  const isEnabled = Boolean(rawScope);
                  const activeScope: SimplifiedPermissionScope =
                    rawScope && grp.allowedScopes.includes(rawScope as SimplifiedPermissionScope)
                      ? (rawScope as SimplifiedPermissionScope)
                      : grp.defaultScope;
                  const isBusy = matrixBusyCell === cellKey;
                  const globalOnly = grp.allowedScopes.length === 1 && grp.allowedScopes[0] === 'GLOBAL';

                  return (
                    <div
                      key={grp.id}
                      className="bg-surface-container-low border border-white/5 p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface">{grp.name}</p>
                          <p className="text-[11px] text-tertiary">{grp.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleToggleMatrixPermission(
                              mobileMatrixRole,
                              grp,
                              !isEnabled,
                              activeScope
                            )
                          }
                          className={`px-2.5 py-1 text-[10px] uppercase font-bold border shrink-0 cursor-pointer ${
                            isEnabled
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                              : 'bg-surface-container-high text-tertiary border-white/15'
                          }`}
                        >
                          {isBusy ? '...' : isEnabled ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                      {isEnabled && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase text-tertiary">Alcance:</span>
                          {globalOnly ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-surface-container border border-white/10 text-on-surface/85">
                              Todo el club
                            </span>
                          ) : (
                            grp.allowedScopes.map((sc) => (
                              <button
                                key={sc}
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleToggleMatrixPermission(mobileMatrixRole, grp, true, sc)
                                }
                                className={`px-2 py-0.5 text-[10px] font-bold border cursor-pointer ${
                                  activeScope === sc
                                    ? 'bg-primary-container text-white border-primary-container'
                                    : 'bg-surface-container text-tertiary border-white/10'
                                }`}
                              >
                                {MATRIX_SCOPE_LABELS[sc]}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Vista Desktop (>= lg) matriz completa */}
          <div className="hidden lg:block space-y-5">
            {simplifiedGroupsByModule.map(([modName, groups]) => (
              <div
                key={modName}
                className="bg-surface-container border border-white/10 overflow-x-auto"
              >
                <div className="px-4 py-2.5 bg-surface-container-low border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-label-md text-xs uppercase tracking-widest text-primary font-bold">
                    Módulo · {modName}
                  </h3>
                  <span className="text-[11px] text-tertiary">{groups.length} permisos</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-tertiary bg-surface-container-lowest/40">
                      <th className="py-2.5 px-3 min-w-[260px]">Permiso</th>
                      {EDITABLE_STAFF_ROLES.map((rc) => (
                        <th key={rc} className="py-2.5 px-2 text-center min-w-[120px]">
                          {roleNameMap.get(rc) || rc}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {groups.map((grp) => (
                      <tr key={grp.id} className="hover:bg-surface-container-low/60">
                        <td className="py-2.5 px-3">
                          <p className="text-xs font-bold text-on-surface">{grp.name}</p>
                          <p className="text-[11px] text-tertiary">{grp.description}</p>
                        </td>
                        {EDITABLE_STAFF_ROLES.map((rc) => {
                          const cellKey = `${rc}:${grp.id}`;
                          const rawScope = rolePermMap.get(`${rc}:${grp.primaryCode}`);
                          const isEnabled = Boolean(rawScope);
                          const activeScope: SimplifiedPermissionScope =
                            rawScope && grp.allowedScopes.includes(rawScope as SimplifiedPermissionScope)
                              ? (rawScope as SimplifiedPermissionScope)
                              : grp.defaultScope;
                          const isBusy = matrixBusyCell === cellKey;
                          const globalOnly = grp.allowedScopes.length === 1 && grp.allowedScopes[0] === 'GLOBAL';

                          return (
                            <td key={rc} className="py-2 px-1.5 text-center align-middle">
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleToggleMatrixPermission(
                                      rc,
                                      grp,
                                      !isEnabled,
                                      activeScope
                                    )
                                  }
                                  className={`w-full max-w-[112px] px-2 py-1 text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                                    isEnabled
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                                      : 'bg-surface-container-low text-tertiary/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {isBusy ? '...' : isEnabled ? 'Sí' : 'No'}
                                </button>
                                {isEnabled &&
                                  (globalOnly ? (
                                    <span className="w-full max-w-[112px] px-1.5 py-0.5 text-[10px] text-tertiary border border-white/10 bg-surface-container-lowest/60">
                                      Todo el club
                                    </span>
                                  ) : (
                                    <select
                                      value={activeScope}
                                      disabled={isBusy}
                                      onChange={(e) =>
                                        handleToggleMatrixPermission(
                                          rc,
                                          grp,
                                          true,
                                          e.target.value as SimplifiedPermissionScope
                                        )
                                      }
                                      aria-label={`Alcance de ${grp.name} para ${rc}`}
                                      className="w-full max-w-[112px] bg-surface-container-lowest border border-white/15 px-1 py-0.5 text-[10px] text-on-surface"
                                    >
                                      {grp.allowedScopes.includes('EQUIPO') && (
                                        <option value="EQUIPO">Solo sus equipos</option>
                                      )}
                                      {grp.allowedScopes.includes('GLOBAL') && (
                                        <option value="GLOBAL">Todo el club</option>
                                      )}
                                    </select>
                                  ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PESTAÑA 3: EXCEPCIONES INDIVIDUALES */}
      {activeTab === 'overrides' && session.isPresident && govData && (
        <section className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="font-headline-sm text-sm uppercase tracking-wider text-on-surface">
              Excepciones Vigentes ({groupedOverrides.length})
            </h2>
            <button
              type="button"
              onClick={openOverrideModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold shadow-[2px_2px_0px_0px_#0e0e0e] cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Nueva excepción</span>
            </button>
          </div>

          {groupedOverrides.length === 0 ? (
            <p className="text-sm text-tertiary py-6 text-center">
              No hay excepciones individuales activas en este momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {groupedOverrides.map((ov) => {
                const scopeLabel =
                  ov.scope === 'GLOBAL'
                    ? 'Todo el club'
                    : ov.scope === 'EQUIPO'
                    ? 'Equipo'
                    : 'Todo el club';
                return (
                  <div
                    key={ov.key}
                    className="bg-surface-container-low border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                            ov.effect === 'ALLOW'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-error-container/60 text-error border-error/40'
                          }`}
                        >
                          {ov.effect === 'ALLOW' ? 'Conceder' : 'Denegar'}
                        </span>
                        <span className="text-sm font-bold text-on-surface">
                          {ov.userName}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-surface-container-high text-tertiary border border-white/10">
                          {scopeLabel}
                          {ov.teamSeasonId
                            ? ` · ${teamNameMap.get(ov.teamSeasonId) || ov.teamSeasonId}`
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-semibold">
                        {ov.permissionLabel}
                      </p>
                      {ov.reason && (
                        <p className="text-xs text-tertiary">{ov.reason}</p>
                      )}
                      <p className="text-[11px] text-tertiary/80">
                        Caducidad:{' '}
                        {ov.validTo ? formatMadridTimestamp(ov.validTo) : 'Permanente hasta revocar'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeOverride(ov.overrideIds)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-error-container/30 hover:bg-error-container/60 border border-error/35 text-error text-xs font-bold uppercase cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Revocar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA 4: AUDITORÍA */}
      {activeTab === 'audit' && govData && (
        <section className="bg-surface-container border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <h2 className="font-headline-sm text-base uppercase text-on-surface">
              Registro de Auditoría
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchGovData({
                  auditModule: auditModuleFilter,
                  auditSearch: auditSearchInput,
                  auditActor: auditActorFilter,
                });
              }}
              className="flex flex-col sm:flex-row flex-wrap gap-2"
            >
              <select
                value={auditModuleFilter}
                onChange={(e) => {
                  const nextMod = e.target.value;
                  setAuditModuleFilter(nextMod);
                  fetchGovData({
                    auditModule: nextMod,
                    auditSearch: auditSearchInput,
                    auditActor: auditActorFilter,
                  });
                }}
                aria-label="Filtrar módulo de auditoría"
                className="bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
              >
                {AUDIT_MODULE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'ALL'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={auditActorFilter}
                onChange={(e) => {
                  const nextActor = e.target.value;
                  setAuditActorFilter(nextActor);
                  fetchGovData({
                    auditModule: auditModuleFilter,
                    auditSearch: auditSearchInput,
                    auditActor: nextActor,
                  });
                }}
                aria-label="Persona de staff"
                className="bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
              >
                <option value="">Persona de staff (todas)</option>
                {(govData.auditActors || []).map((act) => (
                  <option key={act.email} value={act.email}>
                    {act.name ? `${act.name} (${act.email})` : act.email}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={auditSearchInput}
                onChange={(e) => setAuditSearchInput(e.target.value)}
                aria-label="Buscar en registro de auditoría"
                placeholder="Buscar acción, correo o ID..."
                className="bg-surface-container-low border border-white/15 px-3 py-2 text-xs text-on-surface"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer shrink-0"
              >
                Filtrar
              </button>
            </form>
          </div>

          {govData.auditLogs.length === 0 ? (
            <p className="text-sm text-tertiary py-8 text-center">
              No se encontraron eventos de auditoría con los filtros aplicados.
            </p>
          ) : (
            <div className="space-y-2">
              {govData.auditLogs.map((log) => {
                const presented = presentAuditLog({
                  action: log.action,
                  module: log.module,
                  actorEmail: log.actorEmail,
                  targetType: log.targetType,
                  targetId: log.targetId,
                  detailsJson: log.detailsJson,
                });
                const actorName = actorNameByEmail.get(log.actorEmail.trim().toLowerCase());
                const actorDisplay = actorName
                  ? `${actorName} (${log.actorEmail})`
                  : log.actorEmail;
                const isExpanded = Boolean(expandedAuditIds[log.id]);

                return (
                  <div
                    key={log.id}
                    className="bg-surface-container-low border border-white/5 p-3.5 text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-primary-container/20 text-primary border border-primary-container/35">
                            {presented.moduleLabel}
                          </span>
                          <span className="text-[11px] text-tertiary">
                            Realizado por{' '}
                            <strong className="text-on-surface/90">{actorDisplay}</strong>
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-on-surface">
                          {presented.summary}
                        </p>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 text-[11px] text-tertiary">
                        <p className="text-on-surface/85">{formatMadridTimestamp(log.createdAt)}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAuditIds((prev) => ({
                              ...prev,
                              [log.id]: !prev[log.id],
                            }))
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1 px-2 py-0.5 border border-white/15 bg-surface-container text-[10px] uppercase font-bold text-tertiary hover:text-white cursor-pointer"
                        >
                          <ChevronRight
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90 text-primary' : ''}`}
                            aria-hidden="true"
                          />
                          <span>{isExpanded ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}</span>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/10 pt-2 text-[11px] font-mono text-tertiary/90 space-y-1 break-all">
                        <div>
                          <span className="text-zinc-500">Acción:</span> {log.action}
                          {log.targetType ? ` · Tipo: ${log.targetType}` : ''}
                          {log.targetId ? ` · ID: ${log.targetId}` : ''}
                          {log.ipAddress ? ` · IP: ${log.ipAddress}` : ''}
                        </div>
                        {Object.keys(log.detailsJson).length > 0 && (
                          <pre className="whitespace-pre-wrap rounded bg-surface-container-lowest p-2 text-[10px] text-zinc-300 overflow-x-auto">
                            {JSON.stringify(log.detailsJson, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* MODAL: NUEVA EXCEPCIÓN INDIVIDUAL */}
      <IntranetModal
        isOpen={overrideModalOpen && session.isPresident && Boolean(govData)}
        onClose={() => setOverrideModalOpen(false)}
        title="Nueva Excepción Individual"
        subtitle="Concede o deniega un permiso concreto por encima del rol"
        size="md"
      >
        {govData && (
          <form onSubmit={handleCreateOverride} className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="gov-ov-user" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Usuario del staff
              </label>
              <select
                id="gov-ov-user"
                required
                value={ovUserId}
                onChange={(e) => setOvUserId(e.target.value)}
                className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                <option value="">Selecciona un miembro...</option>
                {govData.staffUsers
                  .filter((u) => !u.roles.some((r) => r.roleCode === 'PRESIDENTE'))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="gov-ov-group" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Permiso
              </label>
              <select
                id="gov-ov-group"
                required
                value={ovGroupId}
                onChange={(e) => handleSelectOverrideGroup(e.target.value)}
                className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
              >
                {permissionGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    [{g.module}] {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="gov-ov-effect" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Efecto
                </label>
                <select
                  id="gov-ov-effect"
                  value={ovEffect}
                  onChange={(e) => setOvEffect(e.target.value as 'ALLOW' | 'DENY')}
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  <option value="ALLOW">Conceder</option>
                  <option value="DENY">Denegar</option>
                </select>
              </div>
              <div>
                <label htmlFor="gov-ov-scope" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Ámbito
                </label>
                <select
                  id="gov-ov-scope"
                  value={ovScope}
                  onChange={(e) => setOvScope(e.target.value as SimplifiedPermissionScope)}
                  disabled={
                    selectedOverrideGroup && selectedOverrideGroup.allowedScopes.length === 1
                  }
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface disabled:opacity-80"
                >
                  {(selectedOverrideGroup?.allowedScopes || ['GLOBAL']).map((sc) => (
                    <option key={sc} value={sc}>
                      {OVERRIDE_SCOPE_LABELS[sc]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {ovScope === 'EQUIPO' && (
              <div>
                <label htmlFor="gov-ov-team" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Equipo afectado
                </label>
                <select
                  id="gov-ov-team"
                  required
                  value={ovTeamId}
                  onChange={(e) => setOvTeamId(e.target.value)}
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">Selecciona equipo...</option>
                  {groupByCategoryFamily(
                    govData.catalog.teams,
                    (t) => `${t.id} ${t.name}`
                  ).map(({ family, items: familyTeams }) => (
                    <optgroup key={family.code} label={family.label}>
                      {familyTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getShortTeamLabelInFamily(t.name, family.code)} ({t.association})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="gov-ov-valid-to" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Caducidad opcional (hora fin de día Madrid)
              </label>
              <input
                id="gov-ov-valid-to"
                type="date"
                value={ovValidTo}
                onChange={(e) => setOvValidTo(e.target.value)}
                className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <div>
              <label htmlFor="gov-ov-reason" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Motivo / Justificación
              </label>
              <textarea
                id="gov-ov-reason"
                required
                rows={3}
                value={ovReason}
                onChange={(e) => setOvReason(e.target.value)}
                placeholder="Ej. Sustitución temporal en Juvenil Rojo durante viaje..."
                className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={ovSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
              >
                {ovSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Guardar excepción</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: INVITAR STAFF */}
      <IntranetModal
        isOpen={inviteModalOpen && Boolean(govData)}
        onClose={() => setInviteModalOpen(false)}
        title="Invitar Miembro del Staff"
        size="lg"
      >
        {govData && (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="gov-inv-name" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Nombre completo *
                </label>
                <input
                  id="gov-inv-name"
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. Laura García"
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
              <div>
                <label htmlFor="gov-inv-email" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Correo electrónico *
                </label>
                <input
                  id="gov-inv-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="entrenador@voleibolsanpedro.es"
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>
            </div>

            <div>
              <label htmlFor="gov-inv-phone" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                Teléfono (opcional)
              </label>
              <input
                id="gov-inv-phone"
                type="tel"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
              />
            </div>

            <div>
              <p className="block text-[11px] uppercase font-bold text-tertiary mb-2">
                Roles de Staff (selección múltiple) *
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EDITABLE_STAFF_ROLES.map((rc) => {
                  const checked = inviteRoles.includes(rc);
                  return (
                    <label
                      key={rc}
                      className={`flex items-center gap-2 px-3 py-2 border text-xs cursor-pointer ${
                        checked
                          ? 'bg-primary-container/20 border-primary-container text-white font-bold'
                          : 'bg-surface-container border-white/10 text-tertiary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteRoles((prev) => [...prev, rc]);
                          } else {
                            setInviteRoles((prev) => prev.filter((item) => item !== rc));
                          }
                        }}
                        className="accent-[#d90429]"
                      />
                      <span className="truncate">{roleNameMap.get(rc) || rc}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase font-bold text-tertiary">
                  Equipos asignados ({inviteTeams.length} seleccionados)
                </p>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInviteTeams(govData.catalog.teams.map((t) => t.id))}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteTeams([])}
                    className="text-tertiary hover:underline cursor-pointer"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto bg-surface-container border border-white/10 p-2.5">
                {govData.catalog.teams.map((t) => {
                  const checked = inviteTeams.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-xs text-on-surface py-1 px-1.5 hover:bg-surface-container-high cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteTeams((prev) => [...prev, t.id]);
                          } else {
                            setInviteTeams((prev) => prev.filter((id) => id !== t.id));
                          }
                        }}
                        className="accent-[#d90429]"
                      />
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] text-tertiary ml-auto shrink-0">
                        {t.association}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={inviteSendEmail}
                onChange={(e) => setInviteSendEmail(e.target.checked)}
                className="accent-[#d90429]"
              />
              <span>Enviar correo electrónico de invitación automáticamente (SMTP)</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={inviteSubmitting || inviteRoles.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
              >
                {inviteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Crear invitación</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: ASIGNAR EQUIPOS */}
      <IntranetModal
        isOpen={Boolean(teamsModalUser) && Boolean(govData)}
        onClose={() => setTeamsModalUser(null)}
        title={teamsModalUser ? `Asignar Equipos · ${teamsModalUser.name}` : 'Asignar Equipos'}
        subtitle="Selecciona los equipos y la función en cada plantilla"
        size="lg"
      >
        {teamsModalUser && govData && (
          <form onSubmit={handleSaveTeams} className="space-y-4">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container border border-white/10 p-3">
              <div>
                <label htmlFor="gov-teams-default-fn" className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                  Función por defecto al marcar
                </label>
                <select
                  id="gov-teams-default-fn"
                  value={defaultStaffFn}
                  onChange={(e) =>
                    setDefaultStaffFn(
                      e.target.value as 'HEAD_COACH' | 'ASSISTANT' | 'DELEGATE' | 'TRAINER'
                    )
                  }
                  className="w-full bg-surface-container-highest border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                >
                  <option value="HEAD_COACH">1er Entrenador</option>
                  <option value="ASSISTANT">Ayudante</option>
                  <option value="DELEGATE">Delegado</option>
                  <option value="TRAINER">Prep. Físico</option>
                </select>
              </div>
              <div>
                <label htmlFor="gov-teams-valid-from" className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                  Vigencia desde (opcional)
                </label>
                <input
                  id="gov-teams-valid-from"
                  type="date"
                  value={teamsValidFrom}
                  onChange={(e) => setTeamsValidFrom(e.target.value)}
                  className="w-full bg-surface-container-highest border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                />
              </div>
              <div>
                <label htmlFor="gov-teams-valid-to" className="block text-[10px] uppercase font-bold text-tertiary mb-1">
                  Vigencia hasta (opcional)
                </label>
                <input
                  id="gov-teams-valid-to"
                  type="date"
                  value={teamsValidTo}
                  onChange={(e) => setTeamsValidTo(e.target.value)}
                  className="w-full bg-surface-container-highest border border-white/15 px-2.5 py-1.5 text-xs text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {groupByCategoryFamily(
                govData.catalog.teams,
                (t) => `${t.id} ${t.name}`
              ).map(({ family, items: familyTeams }) => {
                const assignedCount = familyTeams.filter((t) => Boolean(teamDraftMap[t.id])).length;
                return (
                  <details
                    key={family.code}
                    open={assignedCount > 0 || family.code === 'SENIOR'}
                    className="group border border-white/10 bg-surface-container/60 overflow-hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                      <span>{family.label}</span>
                      <span className="flex items-center gap-2 text-[10px] font-mono text-tertiary">
                        {assignedCount > 0 && (
                          <span className="bg-primary-container/25 border border-primary-container/50 text-primary px-1.5 py-0.5 font-bold">
                            {assignedCount} asig.
                          </span>
                        )}
                        <span>{familyTeams.length} eq.</span>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="space-y-1.5 p-2 border-t border-white/10">
                      {familyTeams.map((t) => {
                        const assignedFn = teamDraftMap[t.id];
                        const isChecked = Boolean(assignedFn);
                        return (
                          <div
                            key={t.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 border ${
                              isChecked
                                ? 'bg-primary-container/10 border-primary-container/40'
                                : 'bg-surface-container border-white/5'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 text-xs text-on-surface cursor-pointer min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setTeamDraftMap((prev) => {
                                    const next = { ...prev };
                                    if (e.target.checked) {
                                      next[t.id] = defaultStaffFn;
                                    } else {
                                      delete next[t.id];
                                    }
                                    return next;
                                  });
                                }}
                                className="accent-[#d90429]"
                              />
                              <span className="font-bold truncate">
                                {getShortTeamLabelInFamily(t.name, family.code)}
                              </span>
                              <span className="text-[10px] text-tertiary shrink-0">
                                {t.association}
                              </span>
                            </label>

                            {isChecked && (
                              <select
                                value={assignedFn}
                                onChange={(e) =>
                                  setTeamDraftMap((prev) => ({
                                    ...prev,
                                    [t.id]: e.target.value as
                                      | 'HEAD_COACH'
                                      | 'ASSISTANT'
                                      | 'DELEGATE'
                                      | 'TRAINER',
                                  }))
                                }
                                aria-label={`Función en ${t.name}`}
                                className="bg-surface-container-highest border border-white/15 px-2 py-1 text-xs text-on-surface sm:w-44"
                              >
                                <option value="HEAD_COACH">1er Entrenador</option>
                                <option value="ASSISTANT">Ayudante</option>
                                <option value="DELEGATE">Delegado</option>
                                <option value="TRAINER">Prep. Físico</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTeamsModalUser(null)}
                className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={teamsSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
              >
                {teamsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar equipos ({Object.keys(teamDraftMap).length})</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL: CAMBIAR ROLES */}
      <IntranetModal
        isOpen={Boolean(rolesModalUser)}
        onClose={() => setRolesModalUser(null)}
        title={rolesModalUser ? `Roles · ${rolesModalUser.name}` : 'Roles'}
        size="sm"
      >
        {rolesModalUser && (
          <form onSubmit={handleSaveRoles} className="space-y-3">
            {errorMsg && (
              <div
                role="alert"
                className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              {EDITABLE_STAFF_ROLES.map((rc) => {
                const checked = rolesDraft.includes(rc);
                return (
                  <label
                    key={rc}
                    className={`flex items-center gap-2.5 p-2.5 border text-xs cursor-pointer ${
                      checked
                        ? 'bg-primary-container/20 border-primary-container text-white font-bold'
                        : 'bg-surface-container border-white/10 text-tertiary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRolesDraft((prev) => [...prev, rc]);
                        } else {
                          setRolesDraft((prev) => prev.filter((item) => item !== rc));
                        }
                      }}
                      className="accent-[#d90429]"
                    />
                    <span>{roleNameMap.get(rc) || rc}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRolesModalUser(null)}
                className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={rolesSaving || rolesDraft.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
              >
                {rolesSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Guardar roles</span>
              </button>
            </div>
          </form>
        )}
      </IntranetModal>

      {/* MODAL ÚNICO: TRASPASO DE PRESIDENCIA */}
      <IntranetModal
        isOpen={transferModalOpen && session.isPresident}
        onClose={() => {
          if (!transferSubmitting) setTransferModalOpen(false);
        }}
        title="Traspasar Presidencia"
        subtitle="Autoridad máxima del club · Tu cuenta pasará automáticamente a Directivo"
        size="md"
        accent="rose"
      >
        <div className="space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="bg-error-container/40 border border-error/40 text-error px-3 py-2.5 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {transferStep === 'form' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="gov-transfer-successor" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Sucesor designado (staff activo)
                </label>
                <select
                  id="gov-transfer-successor"
                  value={transferSuccessorId}
                  onChange={(e) => setTransferSuccessorId(e.target.value)}
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">Selecciona sucesor elegible...</option>
                  {eligibleSuccessors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {eligibleSuccessors.length === 0 && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    No hay otros miembros del staff en estado activo disponibles todavía.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="gov-transfer-pass" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Tu contraseña actual de Presidente
                </label>
                <input
                  id="gov-transfer-pass"
                  type="password"
                  value={transferPassword}
                  onChange={(e) => setTransferPassword(e.target.value)}
                  placeholder="Introduce tu contraseña actual"
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface"
                />
              </div>

              <div>
                <label htmlFor="gov-transfer-phrase" className="block text-[11px] uppercase font-bold text-tertiary mb-1">
                  Escribe exactamente: TRANSFERIR PRESIDENCIA
                </label>
                <input
                  id="gov-transfer-phrase"
                  type="text"
                  value={transferPhrase}
                  onChange={(e) => setTransferPhrase(e.target.value)}
                  placeholder="TRANSFERIR PRESIDENCIA"
                  className="w-full bg-surface-container-highest border border-white/15 px-3 py-2 text-sm text-on-surface font-mono"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-on-surface cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={transferCheck}
                  onChange={(e) => setTransferCheck(e.target.checked)}
                  className="mt-0.5 accent-[#d90429]"
                />
                <span>
                  Confirmo que cedo el rol de Presidente de forma inmediata e irreversible sin
                  intervención del sucesor.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    !transferSuccessorId ||
                    !transferPassword ||
                    !transferCheck ||
                    transferPhrase.trim() !== 'TRANSFERIR PRESIDENCIA'
                  }
                  onClick={() => {
                    setErrorMsg(null);
                    setTransferStep('confirm');
                  }}
                  className="px-5 py-2 bg-error-container hover:bg-red-800 text-white border border-error/50 text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Iniciar Traspaso de Presidencia
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-rose-950/50 border border-error/50 space-y-2">
                <div className="flex items-center gap-2 text-error">
                  <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="font-headline text-base uppercase font-bold">
                    Confirmación Final de Traspaso
                  </span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed">
                  Vas a transferir inmediatamente la Presidencia del C.D. Voleibol San Pedro a{' '}
                  <strong>
                    {eligibleSuccessors.find((u) => u.id === transferSuccessorId)?.name}
                  </strong>
                  . Al confirmar, perderás el rol de Presidente y pasarás a Directivo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={transferSubmitting}
                  onClick={() => setTransferStep('form')}
                  className="px-4 py-2 border border-white/15 text-xs uppercase font-bold text-tertiary hover:text-white cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={transferSubmitting}
                  onClick={handleTransferPresidency}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-error-container hover:bg-red-800 border border-error text-white text-xs font-label-md uppercase font-bold cursor-pointer disabled:opacity-50"
                >
                  {transferSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Traspaso</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </IntranetModal>
    </div>
  );
}
