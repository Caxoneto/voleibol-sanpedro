import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { requireIntranetSession } from '@/lib/intranet/auth';
import {
  assertCan,
  can,
  getAuthorizedTeamScope,
  IntranetForbiddenError,
  type IntranetAccessContext,
} from '@/lib/intranet/rbac';
import {
  INITIAL_TEAM_SEASONS,
  CURRENT_SEASON_SEED,
  type PermissionCode,
} from '@/lib/intranet/catalog';
import {
  syncCensusFromClubSources,
  checkFederationDiscrepancies,
  normalizeNameKey,
} from '@/lib/intranet/census-sync';
import { getTeamPaymentTrafficLight, type PaymentTrafficLight } from '@/lib/intranet/payments';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { recordAuditLog } from '@/lib/intranet/audit';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { encryptData, decryptDataStrict, generateBlindIndex } from '@/lib/encryption';
import { computeAgeInMadrid, parseBirthDateParts } from '@/lib/date-utils';
import { getClientIp } from '@/lib/rate-limiter';
import { isStrictEmail, isValidSpanishDniOrNie, stripCrlf } from '@/lib/validators';
import { isDemoPlayersEnabled } from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

type AthleteStatus = 'IMPORTADO' | 'PENDIENTE_VALIDAR' | 'VERIFICADO' | 'BAJA' | 'SHREDDED';
type RgpdStatus = 'ACTIVE' | 'REVOKED' | 'SHREDDED' | 'PENDING';
type AgeBracket = '<14' | '14-17' | '+18' | null;

const ALLOWED_EDIT_STATUSES = new Set<AthleteStatus>([
  'IMPORTADO',
  'PENDIENTE_VALIDAR',
  'VERIFICADO',
  'BAJA',
]);

function canForAnyTeam(
  ctx: IntranetAccessContext,
  permissionCode: PermissionCode,
  athleteTeamIds: string[]
): boolean {
  if (ctx.isPresident) return true;
  const scope = getAuthorizedTeamScope(ctx, permissionCode);
  if (scope.isGlobal) return true;
  if (scope.teamIds.length === 0) return false;
  return athleteTeamIds.some((tid) => scope.teamIds.includes(tid));
}

function safeDecrypt(cipherText: string | null | undefined, aads: string[]): string | null {
  if (!cipherText || !cipherText.trim()) return null;
  for (const aad of aads) {
    const res = decryptDataStrict(cipherText, aad);
    if (res.ok && res.value) return res.value;
  }
  const legacy = decryptDataStrict(cipherText);
  return legacy.ok && legacy.value ? legacy.value : null;
}

function computeAgeBracket(birthYear: number | null): {
  ageBracket: AgeBracket;
  approxAge: number | null;
} {
  if (!birthYear) return { ageBracket: null, approxAge: null };
  const evalAge = computeAgeInMadrid(null, birthYear);
  if (evalAge.age === null) return { ageBracket: null, approxAge: null };
  const ageBracket: AgeBracket = !evalAge.isMinor
    ? '+18'
    : evalAge.isMinor14To17
      ? '14-17'
      : '<14';
  return { ageBracket, approxAge: evalAge.age };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    assertCan(ctx, 'athlete.view_basic');
    await ensureIntranetSeeded();

    const scope = getAuthorizedTeamScope(ctx, 'athlete.view_basic');
    if (!ctx.isStaff || (!scope.isGlobal && scope.teamIds.length === 0)) {
      throw new IntranetForbiddenError(
        'El acceso al censo del club está restringido al personal autorizado.'
      );
    }

    const teamFilterParam = req.nextUrl.searchParams.get('teamId')?.trim() || null;
    const statusFilterParam = req.nextUrl.searchParams.get('status')?.trim() || null;
    const rgpdFilterParam = req.nextUrl.searchParams.get('rgpdStatus')?.trim() || null;
    const searchParam = req.nextUrl.searchParams.get('search')?.trim().toLowerCase() || null;

    const [teamRows, athleteRows, athleteTeamRows, guardianRows, consentRows, pendingReqRows] = await Promise.all([
      queryNeon<{
        id: string;
        name: string;
        division: string;
        association: string;
        gender: string;
        sort_order: number;
      }>(
        `SELECT id, name, division, association, gender, sort_order
         FROM intranet_team_seasons
         WHERE season_id = $1 AND is_active = true
         ORDER BY sort_order ASC, name ASC;`,
        [CURRENT_SEASON_SEED.id]
      ),
      // NUNCA seleccionamos dni_enc, birth_date_enc ni medical_allergies_enc en el listado general
      queryNeon<{
        id: string;
        first_name: string;
        last_name: string;
        birth_year: number | null;
        birth_date_verified: boolean;
        dni_last5: string | null;
        gender: string;
        favb_license_number: string | null;
        shirt_size: string | null;
        jersey_number: number | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        user_id: string | null;
        status: AthleteStatus;
        is_demo: boolean;
        verified_at: string | null;
        updated_at: string;
      }>(
        `SELECT
           id, first_name, last_name, birth_year, birth_date_verified, dni_last5, gender,
           favb_license_number, shirt_size, jersey_number,
           emergency_contact_name, emergency_contact_phone,
           user_id::text AS user_id, status, is_demo, verified_at::text, updated_at::text
         FROM intranet_athletes
         WHERE status <> 'SHREDDED'
           AND ($1::boolean = true OR (COALESCE(is_demo, false) = false AND id NOT LIKE 'demo-%' AND id <> 'p-test-prueba'))
         ORDER BY last_name ASC, first_name ASC;`,
        [isDemoPlayersEnabled()]
      ),
      queryNeon<{
        athlete_id: string;
        team_season_id: string;
        is_primary: boolean;
        dorsal: number | null;
        position: string | null;
      }>(
        `SELECT athlete_id, team_season_id, is_primary, dorsal, position
         FROM intranet_athlete_teams
         ORDER BY is_primary DESC, team_season_id ASC;`
      ),
      queryNeon<{
        id: string;
        athlete_id: string;
        guardian_user_id: string | null;
        full_name: string;
        relationship: string;
        email: string | null;
        phone: string | null;
        is_primary_payer: boolean;
      }>(
        `SELECT id::text, athlete_id, guardian_user_id::text, full_name, relationship, email, phone, is_primary_payer
         FROM intranet_guardianships
         ORDER BY is_primary_payer DESC, created_at ASC;`
      ),
      queryNeon<{
        player_id: string;
        status: string;
        consent_social_media: boolean;
        consent_streaming: boolean;
        consent_press: boolean;
        consent_travel: boolean;
        signed_at_iso: string | null;
      }>(
        `SELECT player_id, status, consent_social_media, consent_streaming, consent_press, consent_travel, signed_at_iso
         FROM player_consents;`
      ),
      queryNeon<{ athlete_id: string }>(
        `SELECT DISTINCT athlete_id FROM intranet_registration_requests WHERE status = 'PENDING';`
      ),
    ]);
    const pendingReqAthleteIds = new Set(pendingReqRows.map((r) => r.athlete_id));

    const teamMap = new Map(teamRows.map((t) => [t.id, t]));
    const authorizedTeams = scope.isGlobal
      ? teamRows
      : teamRows.filter((t) => scope.teamIds.includes(t.id));

    const teamsByAthlete = new Map<
      string,
      Array<{
        teamSeasonId: string;
        teamName: string;
        isPrimary: boolean;
        dorsal: number | null;
        position: string | null;
      }>
    >();
    for (const rel of athleteTeamRows) {
      const meta = teamMap.get(rel.team_season_id);
      const list = teamsByAthlete.get(rel.athlete_id) || [];
      list.push({
        teamSeasonId: rel.team_season_id,
        teamName: meta?.name || rel.team_season_id,
        isPrimary: rel.is_primary,
        dorsal: rel.dorsal,
        position: rel.position,
      });
      teamsByAthlete.set(rel.athlete_id, list);
    }

    const guardianByAthlete = new Map<string, (typeof guardianRows)[0]>();
    for (const g of guardianRows) {
      if (!guardianByAthlete.has(g.athlete_id)) {
        guardianByAthlete.set(g.athlete_id, g);
      }
    }

    const consentByPlayerId = new Map(consentRows.map((c) => [c.player_id, c]));

    // Filtrar deportistas visibles según ámbito RBAC
    const scopedAthletes = athleteRows.filter((a) => {
      if (scope.isGlobal) return true;
      if (scope.teamIds.length === 0) return false;
      const aTeams = teamsByAthlete.get(a.id) || [];
      return aTeams.some((t) => scope.teamIds.includes(t.teamSeasonId));
    });

    // Semáforo de cuotas (sin importes) solo para deportistas en cuyo ámbito tenga permiso
    const paymentsGlobalView =
      ctx.isPresident ||
      getAuthorizedTeamScope(ctx, 'payments.view').isGlobal ||
      getAuthorizedTeamScope(ctx, 'payments.team_status').isGlobal;
    const paymentsTeamScope = getAuthorizedTeamScope(ctx, 'payments.team_status');

    const trafficLightTargetIds: string[] = [];
    for (const a of scopedAthletes) {
      const aTeamIds = (teamsByAthlete.get(a.id) || []).map((t) => t.teamSeasonId);
      if (
        paymentsGlobalView ||
        (paymentsTeamScope.teamIds.length > 0 &&
          aTeamIds.some((tid) => paymentsTeamScope.teamIds.includes(tid)))
      ) {
        trafficLightTargetIds.push(a.id);
      }
    }

    const trafficLightMap: Record<string, PaymentTrafficLight> =
      trafficLightTargetIds.length > 0
        ? await getTeamPaymentTrafficLight(trafficLightTargetIds)
        : {};

    // Construir registros completos (antes de filtros opcionales de query) para resúmenes de equipo
    const enrichedAll = scopedAthletes.map((a) => {
      const teams = teamsByAthlete.get(a.id) || [];
      const teamIds = teams.map((t) => t.teamSeasonId);
      const guardian = guardianByAthlete.get(a.id) || null;
      const consent = consentByPlayerId.get(a.id) || null;
      const isShredded = a.status === 'SHREDDED' || consent?.status === 'SHREDDED';

      const rgpdStatus: RgpdStatus = isShredded
        ? 'SHREDDED'
        : consent?.status === 'ACTIVE'
          ? 'ACTIVE'
          : consent?.status === 'REVOKED'
            ? 'REVOKED'
            : 'PENDING';

      const { ageBracket, approxAge } = isShredded
        ? { ageBracket: null as AgeBracket, approxAge: null }
        : computeAgeBracket(a.birth_year);

      const allowEmergency = !isShredded && canForAnyTeam(ctx, 'athlete.view_emergency', teamIds);
      const allowConsentStatus =
        can(ctx, 'consent.manage') || canForAnyTeam(ctx, 'consent.view_status', teamIds);
      const allowTrafficLight = Object.prototype.hasOwnProperty.call(trafficLightMap, a.id);

      const effectiveStatus: AthleteStatus = isShredded
        ? 'SHREDDED'
        : a.status === 'PENDIENTE_VALIDAR' && !pendingReqAthleteIds.has(a.id)
          ? 'IMPORTADO'
          : a.status;

      return {
        id: a.id,
        firstName: isShredded ? '[SUPRIMIDO]' : a.first_name,
        lastName: isShredded ? '' : a.last_name,
        fullName: isShredded ? '[SUPRIMIDO]' : `${a.first_name} ${a.last_name}`.trim(),
        birthYear: isShredded ? null : a.birth_year,
        birthDateVerified: isShredded ? false : a.birth_date_verified,
        ageBracket,
        approxAge,
        dniLast5: isShredded ? null : a.dni_last5,
        gender: a.gender,
        favbLicenseNumber: isShredded ? null : a.favb_license_number,
        shirtSize: isShredded ? null : a.shirt_size,
        jerseyNumber: isShredded ? null : a.jersey_number,
        status: effectiveStatus,
        isDemo: a.is_demo,
        verifiedAt: a.verified_at,
        updatedAt: a.updated_at,
        teams,
        primaryTeamId: teams.find((t) => t.isPrimary)?.teamSeasonId || teams[0]?.teamSeasonId || null,
        rgpdStatus,
        rgpdSignedAt: consent?.signed_at_iso || null,
        consentFlags:
          allowConsentStatus && consent && !isShredded
            ? {
                socialMedia: consent.consent_social_media,
                streaming: consent.consent_streaming,
                press: consent.consent_press,
                travel: consent.consent_travel,
              }
            : null,
        paymentTrafficLight: allowTrafficLight ? trafficLightMap[a.id] : null,
        guardianName: isShredded ? null : guardian?.full_name || null,
        guardianRelationship: isShredded ? null : guardian?.relationship || null,
        guardianPhone: allowEmergency ? guardian?.phone || null : null,
        guardianEmail: allowEmergency ? guardian?.email || null : null,
        hasGuardianEmail: !isShredded && Boolean(guardian?.email),
        emergencyContactName: allowEmergency ? a.emergency_contact_name : null,
        emergencyContactPhone: allowEmergency ? a.emergency_contact_phone : null,
        hasGuardianAccount: !isShredded && Boolean(guardian?.guardian_user_id),
        hasAthleteAccount: !isShredded && Boolean(a.user_id),
        canEditRow:
          !isShredded &&
          canForAnyTeam(ctx, 'athlete.edit', teamIds),
      };
    });

    // Resumen de progreso por equipo autorizado
    const teamSummaries = authorizedTeams.map((team) => {
      const members = enrichedAll.filter(
        (a) =>
          a.status !== 'SHREDDED' &&
          a.status !== 'BAJA' &&
          a.teams.some((t) => t.teamSeasonId === team.id)
      );
      const verificados = members.filter((m) => m.status === 'VERIFICADO').length;
      const conRgpd = members.filter((m) => m.rgpdStatus === 'ACTIVE').length;
      const pendientesCuenta = members.filter(
        (m) => !m.hasGuardianAccount && !m.hasAthleteAccount
      ).length;
      return {
        teamId: team.id,
        teamName: team.name,
        division: team.division,
        association: team.association,
        total: members.length,
        verificados,
        conRgpd,
        pendientesCuenta,
      };
    });

    // Aplicar filtros opcionales de query (siempre excluyendo SHREDDED)
    const filteredAthletes = enrichedAll.filter((a) => {
      if (a.status === 'SHREDDED') {
        return false;
      }
      if (teamFilterParam && !a.teams.some((t) => t.teamSeasonId === teamFilterParam)) {
        return false;
      }
      if (statusFilterParam && a.status !== statusFilterParam) {
        return false;
      }
      if (rgpdFilterParam && a.rgpdStatus !== rgpdFilterParam) {
        return false;
      }
      if (searchParam) {
        const hay = `${a.fullName} ${a.guardianName || ''} ${a.dniLast5 || ''} ${a.favbLicenseNumber || ''}`.toLowerCase();
        if (!hay.includes(searchParam)) return false;
      }
      return true;
    });

    return NextResponse.json({
      success: true,
      season: CURRENT_SEASON_SEED,
      athletes: filteredAthletes,
      teamSummaries,
      teams: authorizedTeams.map((t) => ({
        id: t.id,
        name: t.name,
        division: t.division,
        association: t.association,
        gender: t.gender,
      })),
      permissions: {
        isPresident: ctx.isPresident,
        canImport: can(ctx, 'athlete.import'),
        canEdit: can(ctx, 'athlete.edit'),
        canDeactivate: can(ctx, 'athlete.deactivate'),
        canViewEmergency: can(ctx, 'athlete.view_emergency'),
        canViewSensitive:
          ctx.isStaff &&
          (can(ctx, 'athlete.view_sensitive') ||
            can(ctx, 'athlete.edit') ||
            can(ctx, 'athlete.view_emergency') ||
            can(ctx, 'athlete.view_basic')),
        canViewTrafficLight:
          paymentsGlobalView || paymentsTeamScope.teamIds.length > 0,
      },
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Census GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    await ensureIntranetSeeded();
    const clientIp = getClientIp(req);

    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (!action) {
      return NextResponse.json({ success: false, error: 'Acción no indicada.' }, { status: 400 });
    }

    // 1. Sincronizar fuentes del club (legado) / Comprobar discrepancias FAVB sin mutar BBDD
    if (action === 'sync_sources') {
      assertCan(ctx, 'athlete.import');
      const summary = await syncCensusFromClubSources({
        userId: ctx.user.id,
        email: ctx.user.email,
        ipAddress: clientIp,
      });
      return NextResponse.json({ success: true, summary });
    }

    if (action === 'check_federation_discrepancies') {
      if (!ctx.isStaff || (!can(ctx, 'athlete.edit') && !can(ctx, 'athlete.import'))) {
        assertCan(ctx, 'athlete.edit');
      }
      const scopeEdit = getAuthorizedTeamScope(ctx, 'athlete.edit');
      const allowedTeamIds = ctx.isPresident || scopeEdit.isGlobal ? null : scopeEdit.teamIds;
      const report = await checkFederationDiscrepancies({
        allowedTeamIds,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          ipAddress: clientIp,
        },
      });
      return NextResponse.json({ success: true, report });
    }

    if (action === 'resolve_federation_discrepancy') {
      assertCan(ctx, 'athlete.edit');
      const editScope = getAuthorizedTeamScope(ctx, 'athlete.edit');
      const athleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : '';
      if (!athleteId) {
        return NextResponse.json({ success: false, error: 'athleteId obligatorio.' }, { status: 400 });
      }

      const [athRows, relRows] = await Promise.all([
        queryNeon<{ id: string; status: AthleteStatus; jersey_number: number | null }>(
          `SELECT id, status, jersey_number FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
          [athleteId]
        ),
        queryNeon<{ team_season_id: string }>(
          `SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1;`,
          [athleteId]
        ),
      ]);
      const athlete = athRows[0];
      if (!athlete || athlete.status === 'SHREDDED') {
        return NextResponse.json({ success: false, error: 'Deportista no disponible.' }, { status: 404 });
      }
      if (!editScope.isGlobal) {
        const hasAccess = relRows.some((r) => editScope.teamIds.includes(r.team_season_id));
        if (!hasAccess) {
          throw new IntranetForbiddenError('No tienes permiso para modificar esta ficha.');
        }
      }

      const validTeamSet = new Set(INITIAL_TEAM_SEASONS.map((t) => t.id));
      const addTeamIdsRaw = Array.isArray(body.addTeamIds)
        ? body.addTeamIds.filter((x): x is string => typeof x === 'string' && validTeamSet.has(x.trim()))
        : [];
      const addTeamIds = Array.from(new Set(addTeamIdsRaw)).filter(
        (tid) => editScope.isGlobal || editScope.teamIds.includes(tid)
      );

      let applyDorsal: number | null = null;
      if (body.applyDorsal !== undefined && body.applyDorsal !== null) {
        const n = Number(body.applyDorsal);
        if (Number.isInteger(n) && n >= 1 && n <= 99) {
          applyDorsal = n;
        }
      }

      if (applyDorsal !== null) {
        await queryNeon(
          `UPDATE intranet_athletes
           SET jersey_number = $2,
               updated_at = NOW()
           WHERE id = $1;`,
          [athleteId, applyDorsal]
        );
        await queryNeon(
          `UPDATE intranet_athlete_teams
           SET dorsal = $2
           WHERE athlete_id = $1 AND is_primary = true;`,
          [athleteId, applyDorsal]
        );
      }

      const hasPrimary = relRows.length > 0;
      for (let i = 0; i < addTeamIds.length; i++) {
        const tid = addTeamIds[i];
        const isPrimary = !hasPrimary && i === 0;
        await queryNeon(
          `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
          [athleteId, tid, isPrimary, isPrimary ? applyDorsal ?? athlete.jersey_number : null]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'RESOLVE_FAVB_DISCREPANCY',
        module: 'Censo',
        targetType: 'ATHLETE',
        targetId: athleteId,
        details: { applyDorsal, addTeamIds },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, athleteId, applyDorsal, addTeamIds });
    }

    // 2. Ver datos sensibles auditados (DNI completo, fecha exacta, alergias médicas)
    if (action === 'view_sensitive') {
      const staffSensitivePerms: PermissionCode[] = [
        'athlete.view_sensitive',
        'athlete.edit',
        'athlete.view_emergency',
        'athlete.view_basic',
      ];
      if (!ctx.isStaff || !staffSensitivePerms.some((p) => can(ctx, p))) {
        assertCan(ctx, 'athlete.view_sensitive');
      }
      const athleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : '';
      if (!athleteId) {
        return NextResponse.json({ success: false, error: 'athleteId obligatorio.' }, { status: 400 });
      }

      const [athleteRows, teamRelRows, guardianRows] = await Promise.all([
        queryNeon<{
          id: string;
          first_name: string;
          last_name: string;
          birth_year: number | null;
          birth_date_enc: string | null;
          dni_enc: string | null;
          dni_last5: string | null;
          medical_allergies_enc: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          status: AthleteStatus;
        }>(
          `SELECT id, first_name, last_name, birth_year, birth_date_enc, dni_enc, dni_last5,
                  medical_allergies_enc, emergency_contact_name, emergency_contact_phone, status
           FROM intranet_athletes
           WHERE id = $1
           LIMIT 1;`,
          [athleteId]
        ),
        queryNeon<{ team_season_id: string }>(
          `SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1;`,
          [athleteId]
        ),
        queryNeon<{ dni_enc: string | null; full_name: string }>(
          `SELECT dni_enc, full_name FROM intranet_guardianships WHERE athlete_id = $1 ORDER BY is_primary_payer DESC, created_at ASC LIMIT 1;`,
          [athleteId]
        ),
      ]);

      const athlete = athleteRows[0];
      if (!athlete) {
        return NextResponse.json({ success: false, error: 'Deportista no encontrado.' }, { status: 404 });
      }

      const allowedScopes = staffSensitivePerms
        .filter((p) => can(ctx, p))
        .map((p) => getAuthorizedTeamScope(ctx, p));
      const isGlobalSensitive =
        ctx.isPresident || allowedScopes.some((s) => s.isGlobal);
      const allowedSensitiveTeams = new Set<string>(
        allowedScopes.flatMap((s) => s.teamIds)
      );
      if (!isGlobalSensitive) {
        const hasTeamAccess = teamRelRows.some((r) => allowedSensitiveTeams.has(r.team_season_id));
        if (!hasTeamAccess) {
          throw new IntranetForbiddenError('No tienes permiso para ver datos sensibles de este equipo.');
        }
      }

      if (athlete.status === 'SHREDDED') {
        return NextResponse.json(
          { success: false, error: 'Ficha suprimida conforme al Art. 17 RGPD.' },
          { status: 409 }
        );
      }

      const dni = safeDecrypt(athlete.dni_enc, [
        `${athlete.id}:dni_enc`,
        `${athlete.id}:dni_encrypted`,
      ]);
      const birthDate = safeDecrypt(athlete.birth_date_enc, [
        `${athlete.id}:birth_date_enc`,
        `${athlete.id}:birth_date_encrypted`,
      ]);
      const medicalAllergies = safeDecrypt(athlete.medical_allergies_enc, [
        `${athlete.id}:medical_allergies_enc`,
      ]);
      const guardianDni = guardianRows[0]
        ? safeDecrypt(guardianRows[0].dni_enc, [`${athlete.id}:guardian_dni`])
        : null;

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'VIEW_SENSITIVE_ATHLETE',
        module: 'Censo',
        targetType: 'ATHLETE',
        targetId: athlete.id,
        details: {
          athleteName: `${athlete.first_name} ${athlete.last_name}`.trim(),
          fieldsAccessed: ['dni', 'birth_date', 'medical_allergies', 'guardian_dni'],
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        sensitive: {
          athleteId: athlete.id,
          fullName: `${athlete.first_name} ${athlete.last_name}`.trim(),
          dni,
          dniLast5: athlete.dni_last5,
          birthDate,
          birthYear: athlete.birth_year,
          medicalAllergies,
          emergencyContactName: athlete.emergency_contact_name,
          emergencyContactPhone: athlete.emergency_contact_phone,
          guardianDni,
        },
      });
    }

    // 3. Crear o editar ficha de deportista
    if (action === 'create_or_update_athlete') {
      assertCan(ctx, 'athlete.edit');
      const editScope = getAuthorizedTeamScope(ctx, 'athlete.edit');

      const requestedId = typeof body.athleteId === 'string' ? body.athleteId.trim() : '';
      const isCreate = !requestedId;
      const athleteId = requestedId || `ath-${crypto.randomUUID().slice(0, 12)}`;

      const firstName = stripCrlf(typeof body.firstName === 'string' ? body.firstName : '').slice(0, 80);
      const lastName = stripCrlf(typeof body.lastName === 'string' ? body.lastName : '').slice(0, 100);
      if (!firstName) {
        return NextResponse.json(
          { success: false, error: 'El nombre del deportista es obligatorio.' },
          { status: 400 }
        );
      }

      const primaryTeamId =
        typeof body.primaryTeamId === 'string' && body.primaryTeamId.trim()
          ? body.primaryTeamId.trim()
          : null;
      const secondaryTeamIdsRaw = Array.isArray(body.secondaryTeamIds)
        ? body.secondaryTeamIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      const validTeamSet = new Set(INITIAL_TEAM_SEASONS.map((t) => t.id));
      if (primaryTeamId && !validTeamSet.has(primaryTeamId)) {
        return NextResponse.json({ success: false, error: 'Equipo principal no válido.' }, { status: 400 });
      }
      const secondaryTeamIds = Array.from(
        new Set(secondaryTeamIdsRaw.filter((tid) => validTeamSet.has(tid) && tid !== primaryTeamId))
      );

      let existingRow: {
        id: string;
        status: AthleteStatus;
        birth_year: number | null;
        birth_date_enc: string | null;
        birth_date_verified: boolean;
        dni_last5: string | null;
        dni_enc: string | null;
        dni_blind_index: string | null;
        medical_allergies_enc: string | null;
      } | null = null;
      let existingTeamRows: Array<{ team_season_id: string; is_primary: boolean }> = [];

      if (!isCreate) {
        const [existingRows, loadedTeamRows] = await Promise.all([
          queryNeon<{
            id: string;
            status: AthleteStatus;
            birth_year: number | null;
            birth_date_enc: string | null;
            birth_date_verified: boolean;
            dni_last5: string | null;
            dni_enc: string | null;
            dni_blind_index: string | null;
            medical_allergies_enc: string | null;
          }>(
            `SELECT id, status, birth_year, birth_date_enc, birth_date_verified,
                    dni_last5, dni_enc, dni_blind_index, medical_allergies_enc
             FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
            [athleteId]
          ),
          queryNeon<{ team_season_id: string; is_primary: boolean }>(
            `SELECT team_season_id, is_primary FROM intranet_athlete_teams WHERE athlete_id = $1;`,
            [athleteId]
          ),
        ]);

        existingRow = existingRows[0] || null;
        existingTeamRows = loadedTeamRows;
        if (!existingRow) {
          return NextResponse.json({ success: false, error: 'Deportista no encontrado.' }, { status: 404 });
        }
        if (existingRow.status === 'SHREDDED') {
          return NextResponse.json(
            { success: false, error: 'Ficha suprimida (SHREDDED). No puede editarse.' },
            { status: 409 }
          );
        }
        if (!editScope.isGlobal) {
          if (existingTeamRows.length === 0) {
            throw new IntranetForbiddenError(
              'Se requiere permiso global para asignar un deportista sin equipo previo.'
            );
          }
          const hasExistingTeamAccess = existingTeamRows.some((r) =>
            editScope.teamIds.includes(r.team_season_id)
          );
          if (!hasExistingTeamAccess) {
            throw new IntranetForbiddenError('No tienes permiso para editar deportistas de este equipo.');
          }
        }
      }

      if (!editScope.isGlobal) {
        const existingTeamSet = new Set(existingTeamRows.map((r) => r.team_season_id));
        const existingPrimaryId = existingTeamRows.find((r) => r.is_primary)?.team_season_id || null;

        if (isCreate) {
          const targetTeams = [primaryTeamId, ...secondaryTeamIds].filter((x): x is string => Boolean(x));
          if (targetTeams.length === 0 || targetTeams.some((tid) => !editScope.teamIds.includes(tid))) {
            throw new IntranetForbiddenError('No tienes permiso para asignar equipos fuera de tu ámbito.');
          }
        } else {
          if (
            primaryTeamId &&
            !editScope.teamIds.includes(primaryTeamId) &&
            primaryTeamId !== existingPrimaryId
          ) {
            throw new IntranetForbiddenError('No tienes permiso para asignar equipos fuera de tu ámbito.');
          }
          const newForbiddenSecondary = secondaryTeamIds.some(
            (tid) => !editScope.teamIds.includes(tid) && !existingTeamSet.has(tid)
          );
          if (newForbiddenSecondary) {
            throw new IntranetForbiddenError('No tienes permiso para asignar equipos fuera de tu ámbito.');
          }
        }
      }

      // Validar y cifrar fecha de nacimiento
      let birthYear: number | null =
        typeof body.birthYear === 'number' && Number.isInteger(body.birthYear) && body.birthYear >= 1930 && body.birthYear <= 2030
          ? body.birthYear
          : existingRow?.birth_year ?? null;
      let birthDateEnc = existingRow?.birth_date_enc ?? null;
      let birthDateVerified = existingRow?.birth_date_verified ?? false;

      if (typeof body.birthDate === 'string' && body.birthDate.trim()) {
        const parts = parseBirthDateParts(body.birthDate.trim());
        if (!parts) {
          return NextResponse.json(
            { success: false, error: 'Fecha de nacimiento no válida (usa YYYY-MM-DD o DD/MM/YYYY).' },
            { status: 400 }
          );
        }
        const bdIso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
        birthYear = parts.year;
        birthDateEnc = encryptData(bdIso, `${athleteId}:birth_date_enc`);
        birthDateVerified = true;
      }

      // Validar y cifrar DNI
      let dniEnc = existingRow?.dni_enc ?? null;
      let dniBlindIndex = existingRow?.dni_blind_index ?? null;
      let dniLast5 = existingRow?.dni_last5 ?? null;

      if (body.clearDni === true) {
        dniEnc = null;
        dniBlindIndex = null;
        dniLast5 = null;
      } else if (typeof body.dni === 'string' && body.dni.trim()) {
        const cleanDni = body.dni.trim().toUpperCase().replace(/[\s-]/g, '');
        if (!isValidSpanishDniOrNie(cleanDni)) {
          return NextResponse.json(
            { success: false, error: 'DNI/NIE o pasaporte no válido.' },
            { status: 400 }
          );
        }
        dniEnc = encryptData(cleanDni, `${athleteId}:dni_enc`);
        dniBlindIndex = generateBlindIndex(cleanDni);
        dniLast5 = cleanDni.slice(-5);
      }

      // Validar y cifrar alergias médicas
      let medicalAllergiesEnc = existingRow?.medical_allergies_enc ?? null;
      if (body.clearMedicalAllergies === true) {
        medicalAllergiesEnc = null;
      } else if (typeof body.medicalAllergies === 'string' && body.medicalAllergies.trim()) {
        medicalAllergiesEnc = encryptData(
          stripCrlf(body.medicalAllergies).slice(0, 500),
          `${athleteId}:medical_allergies_enc`
        );
      }

      const rawStatus = typeof body.status === 'string' ? (body.status.trim() as AthleteStatus) : null;
      const nextStatus: AthleteStatus =
        rawStatus && ALLOWED_EDIT_STATUSES.has(rawStatus)
          ? rawStatus
          : existingRow?.status || 'PENDIENTE_VALIDAR';

      const teamMeta = primaryTeamId ? INITIAL_TEAM_SEASONS.find((t) => t.id === primaryTeamId) : null;
      const gender =
        body.gender === 'MASCULINO' || body.gender === 'FEMENINO'
          ? body.gender
          : teamMeta?.gender || 'FEMENINO';

      const favbLicense =
        typeof body.favbLicenseNumber === 'string' ? stripCrlf(body.favbLicenseNumber).slice(0, 60) || null : null;
      const shirtSize =
        typeof body.shirtSize === 'string' ? stripCrlf(body.shirtSize).slice(0, 20) || null : null;
      const jerseyNumber =
        typeof body.jerseyNumber === 'number' && Number.isInteger(body.jerseyNumber) && body.jerseyNumber >= 0 && body.jerseyNumber <= 999
          ? body.jerseyNumber
          : null;
      const emergencyContactName =
        typeof body.emergencyContactName === 'string'
          ? stripCrlf(body.emergencyContactName).slice(0, 120) || null
          : null;
      const emergencyContactPhone =
        typeof body.emergencyContactPhone === 'string'
          ? stripCrlf(body.emergencyContactPhone).slice(0, 40) || null
          : null;
      const fullNorm = normalizeNameKey(`${firstName} ${lastName}`);

      // Validar tutor si viene en payload
      const guardianObj =
        body.guardian && typeof body.guardian === 'object'
          ? (body.guardian as Record<string, unknown>)
          : null;
      let guardianPayload: {
        fullName: string;
        dniEnc: string | null;
        dniBlindIndex: string | null;
        relationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL';
        email: string | null;
        phone: string | null;
      } | null = null;

      if (guardianObj) {
        const gName = stripCrlf(typeof guardianObj.fullName === 'string' ? guardianObj.fullName : '').slice(0, 120);
        const gEmailRaw = typeof guardianObj.email === 'string' ? guardianObj.email.trim().toLowerCase() : '';
        const gPhone = stripCrlf(typeof guardianObj.phone === 'string' ? guardianObj.phone : '').slice(0, 40) || null;
        const gDniRaw = typeof guardianObj.dni === 'string' ? guardianObj.dni.trim().toUpperCase().replace(/[\s-]/g, '') : '';
        const gRel =
          guardianObj.relationship === 'PADRE' || guardianObj.relationship === 'MADRE'
            ? guardianObj.relationship
            : 'TUTOR_LEGAL';

        if (gEmailRaw && !isStrictEmail(gEmailRaw)) {
          return NextResponse.json(
            { success: false, error: 'El correo electrónico del tutor no es válido.' },
            { status: 400 }
          );
        }
        if (gDniRaw && !isValidSpanishDniOrNie(gDniRaw)) {
          return NextResponse.json(
            { success: false, error: 'El DNI/NIE del tutor no es válido.' },
            { status: 400 }
          );
        }

        if (gName || gEmailRaw || gPhone || gDniRaw) {
          guardianPayload = {
            fullName: gName || 'Tutor legal por confirmar',
            dniEnc: gDniRaw ? encryptData(gDniRaw, `${athleteId}:guardian_dni`) : null,
            dniBlindIndex: gDniRaw ? generateBlindIndex(gDniRaw) : null,
            relationship: gRel,
            email: gEmailRaw || null,
            phone: gPhone,
          };
        }
      }

      if (isCreate) {
        await queryNeon(
          `INSERT INTO intranet_athletes (
             id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
             birth_date_verified, dni_last5, dni_enc, dni_blind_index, gender,
             favb_license_number, shirt_size, jersey_number,
             emergency_contact_name, emergency_contact_phone, medical_allergies_enc,
             status, verified_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
             CASE WHEN $18 = 'VERIFICADO' THEN NOW() ELSE NULL END
           );`,
          [
            athleteId,
            firstName,
            lastName,
            fullNorm,
            birthYear,
            birthDateEnc,
            birthDateVerified,
            dniLast5,
            dniEnc,
            dniBlindIndex,
            gender,
            favbLicense,
            shirtSize,
            jerseyNumber,
            emergencyContactName,
            emergencyContactPhone,
            medicalAllergiesEnc,
            nextStatus,
          ]
        );
      } else {
        await queryNeon(
          `UPDATE intranet_athletes
           SET first_name = $2,
               last_name = $3,
               full_name_normalized = $4,
               birth_year = $5,
               birth_date_enc = $6,
               birth_date_verified = $7,
               dni_last5 = $8,
               dni_enc = $9,
               dni_blind_index = $10,
               gender = $11,
               favb_license_number = $12,
               shirt_size = $13,
               jersey_number = $14,
               emergency_contact_name = $15,
               emergency_contact_phone = $16,
               medical_allergies_enc = $17,
               status = $18,
               verified_at = CASE WHEN $18 = 'VERIFICADO' AND verified_at IS NULL THEN NOW() ELSE verified_at END,
               updated_at = NOW()
           WHERE id = $1;`,
          [
            athleteId,
            firstName,
            lastName,
            fullNorm,
            birthYear,
            birthDateEnc,
            birthDateVerified,
            dniLast5,
            dniEnc,
            dniBlindIndex,
            gender,
            favbLicense,
            shirtSize,
            jerseyNumber,
            emergencyContactName,
            emergencyContactPhone,
            medicalAllergiesEnc,
            nextStatus,
          ]
        );
      }

      // Actualizar equipos si se han enviado en el payload
      if ('primaryTeamId' in body || 'secondaryTeamIds' in body) {
        if (editScope.isGlobal) {
          await queryNeon(`DELETE FROM intranet_athlete_teams WHERE athlete_id = $1;`, [athleteId]);
          if (primaryTeamId) {
            await queryNeon(
              `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal)
               VALUES ($1, $2, true, $3)
               ON CONFLICT (athlete_id, team_season_id) DO UPDATE SET is_primary = true, dorsal = EXCLUDED.dorsal;`,
              [athleteId, primaryTeamId, jerseyNumber]
            );
          }
          for (const secId of secondaryTeamIds) {
            await queryNeon(
              `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
               VALUES ($1, $2, false)
               ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
              [athleteId, secId]
            );
          }
        } else {
          // Conservar intactos los equipos fuera del ámbito del editor y actualizar solo los propios
          await queryNeon(
            `DELETE FROM intranet_athlete_teams
             WHERE athlete_id = $1
               AND team_season_id = ANY($2::text[]);`,
            [athleteId, editScope.teamIds]
          );

          const managedPrimaryId =
            primaryTeamId && editScope.teamIds.includes(primaryTeamId) ? primaryTeamId : null;
          const managedSecondaryIds = secondaryTeamIds.filter((tid) =>
            editScope.teamIds.includes(tid)
          );

          if (managedPrimaryId) {
            await queryNeon(
              `UPDATE intranet_athlete_teams
               SET is_primary = false
               WHERE athlete_id = $1 AND team_season_id <> $2;`,
              [athleteId, managedPrimaryId]
            );
            await queryNeon(
              `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal)
               VALUES ($1, $2, true, $3)
               ON CONFLICT (athlete_id, team_season_id) DO UPDATE SET is_primary = true, dorsal = EXCLUDED.dorsal;`,
              [athleteId, managedPrimaryId, jerseyNumber]
            );
          }

          for (const secId of managedSecondaryIds) {
            await queryNeon(
              `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
               VALUES ($1, $2, false)
               ON CONFLICT (athlete_id, team_season_id) DO UPDATE SET is_primary = false;`,
              [athleteId, secId]
            );
          }

          const remainingTeams = await queryNeon<{ team_season_id: string; is_primary: boolean }>(
            `SELECT team_season_id, is_primary
             FROM intranet_athlete_teams
             WHERE athlete_id = $1
             ORDER BY is_primary DESC, team_season_id ASC;`,
            [athleteId]
          );
          if (remainingTeams.length > 0 && !remainingTeams.some((r) => r.is_primary)) {
            await queryNeon(
              `UPDATE intranet_athlete_teams
               SET is_primary = true
               WHERE athlete_id = $1 AND team_season_id = $2;`,
              [athleteId, remainingTeams[0].team_season_id]
            );
          }
        }
      }

      // Upsert tutor principal
      if (guardianPayload) {
        const existingG = await queryNeon<{ id: string }>(
          `SELECT id::text AS id FROM intranet_guardianships WHERE athlete_id = $1 ORDER BY is_primary_payer DESC, created_at ASC LIMIT 1;`,
          [athleteId]
        );
        if (existingG[0]) {
          await queryNeon(
            `UPDATE intranet_guardianships
             SET full_name = $2,
                 dni_enc = COALESCE($3, dni_enc),
                 dni_blind_index = COALESCE($4, dni_blind_index),
                 relationship = $5,
                 email = $6,
                 phone = $7
             WHERE id = $1::uuid;`,
            [
              existingG[0].id,
              guardianPayload.fullName,
              guardianPayload.dniEnc,
              guardianPayload.dniBlindIndex,
              guardianPayload.relationship,
              guardianPayload.email,
              guardianPayload.phone,
            ]
          );
        } else {
          await queryNeon(
            `INSERT INTO intranet_guardianships (
               athlete_id, full_name, dni_enc, dni_blind_index, relationship, email, phone, is_primary_payer
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
            [
              athleteId,
              guardianPayload.fullName,
              guardianPayload.dniEnc,
              guardianPayload.dniBlindIndex,
              guardianPayload.relationship,
              guardianPayload.email,
              guardianPayload.phone,
            ]
          );
        }
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: isCreate ? 'CREATE_ATHLETE' : 'UPDATE_ATHLETE',
        module: 'Censo',
        targetType: 'ATHLETE',
        targetId: athleteId,
        details: {
          fullName: `${firstName} ${lastName}`.trim(),
          status: nextStatus,
          primaryTeamId,
          secondaryTeamIds,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, athleteId });
    }

    // 4. Dar de baja a un deportista
    if (action === 'deactivate_athlete') {
      assertCan(ctx, 'athlete.deactivate');
      const athleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : '';
      if (!athleteId) {
        return NextResponse.json({ success: false, error: 'athleteId obligatorio.' }, { status: 400 });
      }

      const [existingRows, teamRelRows] = await Promise.all([
        queryNeon<{ id: string; first_name: string; last_name: string; status: AthleteStatus }>(
          `SELECT id, first_name, last_name, status FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
          [athleteId]
        ),
        queryNeon<{ team_season_id: string }>(
          `SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1;`,
          [athleteId]
        ),
      ]);

      const athlete = existingRows[0];
      if (!athlete) {
        return NextResponse.json({ success: false, error: 'Deportista no encontrado.' }, { status: 404 });
      }
      if (athlete.status === 'SHREDDED') {
        return NextResponse.json(
          { success: false, error: 'La ficha ya fue suprimida (SHREDDED).' },
          { status: 409 }
        );
      }

      const deactScope = getAuthorizedTeamScope(ctx, 'athlete.deactivate');
      if (!deactScope.isGlobal) {
        const hasTeamAccess = teamRelRows.some((r) => deactScope.teamIds.includes(r.team_season_id));
        if (!hasTeamAccess) {
          throw new IntranetForbiddenError('No tienes permiso para dar de baja en este equipo.');
        }
      }

      await queryNeon(
        `UPDATE intranet_athletes SET status = 'BAJA', updated_at = NOW() WHERE id = $1;`,
        [athleteId]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'DEACTIVATE_ATHLETE',
        module: 'Censo',
        targetType: 'ATHLETE',
        targetId: athleteId,
        details: {
          athleteName: `${athlete.first_name} ${athlete.last_name}`.trim(),
          reason: typeof body.reason === 'string' ? stripCrlf(body.reason).slice(0, 200) : undefined,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, athleteId });
    }

    return NextResponse.json({ success: false, error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Census POST');
  }
}
