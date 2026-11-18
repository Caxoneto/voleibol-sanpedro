import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { requireIntranetSession, createIntranetInvitation } from '@/lib/intranet/auth';
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
  type RoleCode,
} from '@/lib/intranet/catalog';
import {
  syncCensusFromClubSources,
  importFeelSportsRows,
  normalizeNameKey,
  type FeelSportsImportRow,
} from '@/lib/intranet/census-sync';
import { getTeamPaymentTrafficLight, type PaymentTrafficLight } from '@/lib/intranet/payments';
import { parseCsv } from '@/lib/intranet/csv-utils';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { recordAuditLog } from '@/lib/intranet/audit';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { encryptData, decryptDataStrict, generateBlindIndex } from '@/lib/encryption';
import { computeAgeInMadrid, parseBirthDateParts } from '@/lib/date-utils';
import { getClientIp } from '@/lib/rate-limiter';
import { isStrictEmail, isValidSpanishDniOrNie, stripCrlf } from '@/lib/validators';

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

function resolveTeamIdByNameOrId(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const direct = INITIAL_TEAM_SEASONS.find((t) => t.id.toLowerCase() === raw.trim().toLowerCase());
  if (direct) return direct.id;
  const clean = normalizeNameKey(raw);
  const byName = INITIAL_TEAM_SEASONS.find((t) => normalizeNameKey(t.name) === clean);
  if (byName) return byName.id;
  const partial = INITIAL_TEAM_SEASONS.find(
    (t) => clean.includes(normalizeNameKey(t.name)) || normalizeNameKey(t.name).includes(clean)
  );
  return partial?.id || null;
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

function parseCsvRowsToFeelSports(csvText: string): FeelSportsImportRow[] {
  const matrix = parseCsv(csvText);
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((h) => normalizeNameKey(h));

  const findIdx = (candidates: string[]): number =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxFirst = findIdx(['nombre', 'first name', 'firstname']);
  const idxLast = findIdx(['apellidos', 'apellido', 'last name', 'lastname']);
  const idxFull = findIdx(['nombre completo', 'deportista', 'jugador', 'jugadora']);
  const idxDni = findIdx(['dni', 'nie', 'documento', 'nif']);
  const idxBirth = findIdx(['fecha nacimiento', 'nacimiento', 'birth', 'fnac']);
  const idxEmail = findIdx(['email', 'correo', 'e mail']);
  const idxPhone = findIdx(['telefono', 'movil', 'phone', 'tlf']);
  const idxTeam = findIdx(['equipo', 'categoria', 'team']);
  const idxGuardian = findIdx(['tutor', 'padre', 'madre', 'guardian', 'responsable']);
  const idxGuardianDni = findIdx(['dni tutor', 'nif tutor', 'guardian dni']);
  const idxFsId = findIdx(['feelsports', 'id externo', 'external id']);

  const rows: FeelSportsImportRow[] = [];
  for (const cols of matrix.slice(1)) {
    let firstName = idxFirst >= 0 ? (cols[idxFirst] || '').trim() : '';
    let lastName = idxLast >= 0 ? (cols[idxLast] || '').trim() : '';
    if (!firstName && !lastName && idxFull >= 0) {
      const full = (cols[idxFull] || '').trim().replace(/\s+/g, ' ');
      const parts = full.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }
    if (!firstName && !lastName) continue;

    rows.push({
      firstName,
      lastName,
      dni: idxDni >= 0 ? (cols[idxDni] || '').trim() || undefined : undefined,
      birthDate: idxBirth >= 0 ? (cols[idxBirth] || '').trim() || undefined : undefined,
      email: idxEmail >= 0 ? (cols[idxEmail] || '').trim() || undefined : undefined,
      phone: idxPhone >= 0 ? (cols[idxPhone] || '').trim() || undefined : undefined,
      teamNameOrId: idxTeam >= 0 ? (cols[idxTeam] || '').trim() || undefined : undefined,
      guardianName: idxGuardian >= 0 ? (cols[idxGuardian] || '').trim() || undefined : undefined,
      guardianDni: idxGuardianDni >= 0 ? (cols[idxGuardianDni] || '').trim() || undefined : undefined,
      feelsportsId: idxFsId >= 0 ? (cols[idxFsId] || '').trim() || undefined : undefined,
    });
  }
  return rows;
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
    const includeDemoParam = req.nextUrl.searchParams.get('includeDemo') === '1';
    const canIncludeDemo = ctx.isPresident || can(ctx, 'athlete.edit');
    const allowDemo =
      process.env.ALLOW_DEMO_PLAYERS === 'true' || (includeDemoParam && canIncludeDemo);

    const teamFilterParam = req.nextUrl.searchParams.get('teamId')?.trim() || null;
    const statusFilterParam = req.nextUrl.searchParams.get('status')?.trim() || null;
    const rgpdFilterParam = req.nextUrl.searchParams.get('rgpdStatus')?.trim() || null;
    const searchParam = req.nextUrl.searchParams.get('search')?.trim().toLowerCase() || null;

    const [teamRows, athleteRows, athleteTeamRows, guardianRows, consentRows] = await Promise.all([
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
        feelsports_id: string | null;
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
           favb_license_number, feelsports_id, shirt_size, jersey_number,
           emergency_contact_name, emergency_contact_phone,
           user_id::text AS user_id, status, is_demo, verified_at::text, updated_at::text
         FROM intranet_athletes
         WHERE ($1::boolean = true OR is_demo = false)
         ORDER BY last_name ASC, first_name ASC;`,
        [allowDemo]
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
    ]);

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
        feelsportsId: isShredded ? null : a.feelsports_id,
        shirtSize: isShredded ? null : a.shirt_size,
        jerseyNumber: isShredded ? null : a.jersey_number,
        status: (isShredded ? 'SHREDDED' : a.status) as AthleteStatus,
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
        canInvite:
          !isShredded &&
          a.status !== 'BAJA' &&
          canForAnyTeam(ctx, 'invitation.send', teamIds),
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

    // Aplicar filtros opcionales de query
    const filteredAthletes = enrichedAll.filter((a) => {
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

    // Cola de deduplicación solo si tiene athlete.import
    let dedupQueue: Array<{
      id: string;
      sourceType: string;
      matchReason: string;
      status: string;
      createdAt: string;
      payload: FeelSportsImportRow;
      candidate: {
        id: string;
        fullName: string;
        birthYear: number | null;
        dniLast5: string | null;
        status: string;
        teams: string[];
      } | null;
    }> = [];

    if (can(ctx, 'athlete.import')) {
      const qRows = await queryNeon<{
        id: string;
        source_type: string;
        raw_payload_json: unknown;
        candidate_athlete_id: string | null;
        match_reason: string;
        status: string;
        created_at: string;
      }>(
        `SELECT id::text, source_type, raw_payload_json, candidate_athlete_id, match_reason, status, created_at::text
         FROM intranet_dedup_queue
         WHERE status = 'PENDING'
         ORDER BY created_at DESC;`
      );

      const athleteById = new Map(enrichedAll.map((a) => [a.id, a]));
      dedupQueue = qRows.map((q) => {
        const payload =
          typeof q.raw_payload_json === 'string'
            ? (JSON.parse(q.raw_payload_json) as FeelSportsImportRow)
            : (q.raw_payload_json as FeelSportsImportRow);
        const cand = q.candidate_athlete_id ? athleteById.get(q.candidate_athlete_id) : undefined;
        return {
          id: q.id,
          sourceType: q.source_type,
          matchReason: q.match_reason,
          status: q.status,
          createdAt: q.created_at,
          payload,
          candidate: cand
            ? {
                id: cand.id,
                fullName: cand.fullName,
                birthYear: cand.birthYear,
                dniLast5: cand.dniLast5,
                status: cand.status,
                teams: cand.teams.map((t) => t.teamName),
              }
            : null,
        };
      });
    }

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
      dedupQueue,
      permissions: {
        isPresident: ctx.isPresident,
        canImport: can(ctx, 'athlete.import'),
        canEdit: can(ctx, 'athlete.edit'),
        canDeactivate: can(ctx, 'athlete.deactivate'),
        canViewEmergency: can(ctx, 'athlete.view_emergency'),
        canViewSensitive: can(ctx, 'athlete.view_sensitive'),
        canSendInvitation: can(ctx, 'invitation.send'),
        canViewTrafficLight:
          paymentsGlobalView || paymentsTeamScope.teamIds.length > 0,
        canIncludeDemo,
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

    // 1. Sincronizar fuentes del club (FAVB + player_census + player_consents)
    if (action === 'sync_sources') {
      assertCan(ctx, 'athlete.import');
      const summary = await syncCensusFromClubSources({
        userId: ctx.user.id,
        email: ctx.user.email,
        ipAddress: clientIp,
      });
      return NextResponse.json({ success: true, summary });
    }

    // 2. Ver datos sensibles auditados (DNI completo, fecha exacta, alergias médicas)
    if (action === 'view_sensitive') {
      assertCan(ctx, 'athlete.view_sensitive');
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

      const sensitiveScope = getAuthorizedTeamScope(ctx, 'athlete.view_sensitive');
      if (!sensitiveScope.isGlobal) {
        const hasTeamAccess = teamRelRows.some((r) => sensitiveScope.teamIds.includes(r.team_season_id));
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

      if (!editScope.isGlobal) {
        const targetTeams = [primaryTeamId, ...secondaryTeamIds].filter((x): x is string => Boolean(x));
        if (targetTeams.some((tid) => !editScope.teamIds.includes(tid))) {
          throw new IntranetForbiddenError('No tienes permiso para asignar equipos fuera de tu ámbito.');
        }
      }

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

      if (!isCreate) {
        const [existingRows, existingTeamRows] = await Promise.all([
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
          queryNeon<{ team_season_id: string }>(
            `SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1;`,
            [athleteId]
          ),
        ]);

        existingRow = existingRows[0] || null;
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
          const hasExistingTeamAccess =
            existingTeamRows.length === 0
              ? Boolean(primaryTeamId && editScope.teamIds.includes(primaryTeamId))
              : existingTeamRows.some((r) => editScope.teamIds.includes(r.team_season_id));
          if (!hasExistingTeamAccess) {
            throw new IntranetForbiddenError('No tienes permiso para editar deportistas de este equipo.');
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

    // 5. Importar CSV de FeelSports
    if (action === 'import_feelsports_csv') {
      assertCan(ctx, 'athlete.import');

      let parsedRows: FeelSportsImportRow[] = [];
      if (Array.isArray(body.rows) && body.rows.length > 0) {
        parsedRows = body.rows
          .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
          .map((r) => ({
            firstName: stripCrlf(String(r.firstName || '')).slice(0, 80),
            lastName: stripCrlf(String(r.lastName || '')).slice(0, 100),
            dni: typeof r.dni === 'string' ? stripCrlf(r.dni).slice(0, 24) : undefined,
            birthDate: typeof r.birthDate === 'string' ? stripCrlf(r.birthDate).slice(0, 20) : undefined,
            teamNameOrId: typeof r.teamNameOrId === 'string' ? stripCrlf(r.teamNameOrId).slice(0, 100) : undefined,
            guardianName: typeof r.guardianName === 'string' ? stripCrlf(r.guardianName).slice(0, 120) : undefined,
            guardianDni: typeof r.guardianDni === 'string' ? stripCrlf(r.guardianDni).slice(0, 24) : undefined,
            email: typeof r.email === 'string' ? r.email.trim().toLowerCase().slice(0, 150) : undefined,
            phone: typeof r.phone === 'string' ? stripCrlf(r.phone).slice(0, 40) : undefined,
            feelsportsId: typeof r.feelsportsId === 'string' ? stripCrlf(r.feelsportsId).slice(0, 60) : undefined,
          }))
          .filter((r) => Boolean(r.firstName || r.lastName));
      } else if (typeof body.csvText === 'string' && body.csvText.trim()) {
        parsedRows = parseCsvRowsToFeelSports(body.csvText);
      }

      if (parsedRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No se encontraron filas válidas para importar.' },
          { status: 400 }
        );
      }
      if (parsedRows.length > 1000) {
        return NextResponse.json(
          { success: false, error: 'Límite máximo de 1.000 filas por importación.' },
          { status: 400 }
        );
      }

      const result = await importFeelSportsRows(parsedRows, {
        userId: ctx.user.id,
        email: ctx.user.email,
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, result });
    }

    // 6. Resolver elemento en cola de deduplicación
    if (action === 'resolve_dedup') {
      assertCan(ctx, 'athlete.import');
      const queueId = typeof body.queueId === 'string' ? body.queueId.trim() : '';
      const resolution = typeof body.resolution === 'string' ? body.resolution.trim() : '';

      if (!queueId || !['MERGE', 'CREATE_NEW', 'DISCARD'].includes(resolution)) {
        return NextResponse.json(
          { success: false, error: 'queueId o resolution no válido (MERGE | CREATE_NEW | DISCARD).' },
          { status: 400 }
        );
      }

      const qRows = await queryNeon<{
        id: string;
        raw_payload_json: unknown;
        candidate_athlete_id: string | null;
        status: string;
      }>(
        `SELECT id::text, raw_payload_json, candidate_athlete_id, status
         FROM intranet_dedup_queue
         WHERE id = $1::uuid AND status = 'PENDING'
         LIMIT 1;`,
        [queueId]
      );

      const qItem = qRows[0];
      if (!qItem) {
        return NextResponse.json(
          { success: false, error: 'Elemento de cola no encontrado o ya resuelto.' },
          { status: 404 }
        );
      }

      const payload = (
        typeof qItem.raw_payload_json === 'string'
          ? JSON.parse(qItem.raw_payload_json)
          : qItem.raw_payload_json
      ) as FeelSportsImportRow;

      let resolvedAthleteId: string | null = null;

      if (resolution === 'MERGE') {
        const targetId =
          (typeof body.targetAthleteId === 'string' && body.targetAthleteId.trim()) ||
          qItem.candidate_athlete_id;
        if (!targetId) {
          return NextResponse.json(
            { success: false, error: 'No hay deportista candidato para fusionar.' },
            { status: 400 }
          );
        }

        const targetRows = await queryNeon<{ id: string; status: string }>(
          `SELECT id, status FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
          [targetId]
        );
        if (!targetRows[0]) {
          return NextResponse.json({ success: false, error: 'Deportista candidato no encontrado.' }, { status: 404 });
        }
        if (targetRows[0].status === 'SHREDDED') {
          return NextResponse.json(
            { success: false, error: 'El deportista candidato está suprimido (SHREDDED).' },
            { status: 409 }
          );
        }

        const cleanDni = payload.dni?.trim().toUpperCase().replace(/[\s-]/g, '') || '';
        const blindIdx = cleanDni.length >= 6 ? generateBlindIndex(cleanDni) : null;
        const dniEnc = cleanDni.length >= 6 ? encryptData(cleanDni, `${targetId}:dni_enc`) : null;
        const dniLast5 = cleanDni.length >= 5 ? cleanDni.slice(-5) : null;
        const birthParts = parseBirthDateParts(payload.birthDate);
        const birthYear = birthParts?.year || null;
        const bdIso = birthParts
          ? `${String(birthParts.year).padStart(4, '0')}-${String(birthParts.month).padStart(2, '0')}-${String(birthParts.day).padStart(2, '0')}`
          : null;
        const bdEnc = bdIso ? encryptData(bdIso, `${targetId}:birth_date_enc`) : null;
        const teamId = resolveTeamIdByNameOrId(payload.teamNameOrId);

        await queryNeon(
          `UPDATE intranet_athletes
           SET birth_year = COALESCE(birth_year, $2),
               birth_date_enc = COALESCE(birth_date_enc, $3),
               dni_last5 = COALESCE(dni_last5, $4),
               dni_enc = COALESCE(dni_enc, $5),
               dni_blind_index = COALESCE(dni_blind_index, $6),
               feelsports_id = COALESCE(feelsports_id, $7),
               updated_at = NOW()
           WHERE id = $1;`,
          [targetId, birthYear, bdEnc, dniLast5, dniEnc, blindIdx, payload.feelsportsId || null]
        );

        if (teamId) {
          await queryNeon(
            `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
             VALUES ($1, $2, false)
             ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
            [targetId, teamId]
          );
        }

        if (payload.guardianName || payload.email || payload.phone) {
          const existingG = await queryNeon<{ id: string }>(
            `SELECT id::text AS id FROM intranet_guardianships WHERE athlete_id = $1 LIMIT 1;`,
            [targetId]
          );
          if (existingG.length === 0) {
            const gDniEnc = payload.guardianDni
              ? encryptData(payload.guardianDni.trim().toUpperCase(), `${targetId}:guardian_dni`)
              : null;
            const gDniIdx = payload.guardianDni
              ? generateBlindIndex(payload.guardianDni.trim().toUpperCase())
              : null;
            await queryNeon(
              `INSERT INTO intranet_guardianships (
                 athlete_id, full_name, dni_enc, dni_blind_index, relationship, email, phone, is_primary_payer
               ) VALUES ($1, $2, $3, $4, 'TUTOR_LEGAL', $5, $6, true);`,
              [
                targetId,
                payload.guardianName?.trim() || `${payload.firstName} ${payload.lastName}`.trim(),
                gDniEnc,
                gDniIdx,
                payload.email?.trim().toLowerCase() || null,
                payload.phone?.trim() || null,
              ]
            );
          }
        }

        await queryNeon(
          `UPDATE intranet_dedup_queue
           SET status = 'MERGED', resolved_by = $2::uuid, resolved_at = NOW()
           WHERE id = $1::uuid;`,
          [queueId, ctx.user.id]
        );
        resolvedAthleteId = targetId;
      } else if (resolution === 'CREATE_NEW') {
        const newId = `fs-${crypto.randomUUID().slice(0, 12)}`;
        const first = (payload.firstName || '').trim() || 'Deportista';
        const last = (payload.lastName || '').trim();
        const fullNorm = normalizeNameKey(`${first} ${last}`);
        const cleanDni = payload.dni?.trim().toUpperCase().replace(/[\s-]/g, '') || '';
        const blindIdx = cleanDni.length >= 6 ? generateBlindIndex(cleanDni) : null;
        const dniEnc = cleanDni.length >= 6 ? encryptData(cleanDni, `${newId}:dni_enc`) : null;
        const dniLast5 = cleanDni.length >= 5 ? cleanDni.slice(-5) : null;
        const birthParts = parseBirthDateParts(payload.birthDate);
        const birthYear = birthParts?.year || null;
        const bdIso = birthParts
          ? `${String(birthParts.year).padStart(4, '0')}-${String(birthParts.month).padStart(2, '0')}-${String(birthParts.day).padStart(2, '0')}`
          : null;
        const bdEnc = bdIso ? encryptData(bdIso, `${newId}:birth_date_enc`) : null;
        const teamId = resolveTeamIdByNameOrId(payload.teamNameOrId);
        const teamMeta = teamId ? INITIAL_TEAM_SEASONS.find((t) => t.id === teamId) : null;

        await queryNeon(
          `INSERT INTO intranet_athletes (
             id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
             dni_last5, dni_enc, dni_blind_index, gender, feelsports_id, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'IMPORTADO');`,
          [
            newId,
            first,
            last,
            fullNorm,
            birthYear,
            bdEnc,
            dniLast5,
            dniEnc,
            blindIdx,
            teamMeta?.gender || 'FEMENINO',
            payload.feelsportsId || null,
          ]
        );

        if (teamId) {
          await queryNeon(
            `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
             VALUES ($1, $2, true)
             ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
            [newId, teamId]
          );
        }

        if (payload.guardianName || payload.email || payload.phone) {
          const gDniEnc = payload.guardianDni
            ? encryptData(payload.guardianDni.trim().toUpperCase(), `${newId}:guardian_dni`)
            : null;
          const gDniIdx = payload.guardianDni
            ? generateBlindIndex(payload.guardianDni.trim().toUpperCase())
            : null;
          await queryNeon(
            `INSERT INTO intranet_guardianships (
               athlete_id, full_name, dni_enc, dni_blind_index, relationship, email, phone, is_primary_payer
             ) VALUES ($1, $2, $3, $4, 'TUTOR_LEGAL', $5, $6, true);`,
            [
              newId,
              payload.guardianName?.trim() || `${first} ${last}`.trim(),
              gDniEnc,
              gDniIdx,
              payload.email?.trim().toLowerCase() || null,
              payload.phone?.trim() || null,
            ]
          );
        }

        await queryNeon(
          `UPDATE intranet_dedup_queue
           SET status = 'CREATED_NEW', resolved_by = $2::uuid, resolved_at = NOW()
           WHERE id = $1::uuid;`,
          [queueId, ctx.user.id]
        );
        resolvedAthleteId = newId;
      } else {
        await queryNeon(
          `UPDATE intranet_dedup_queue
           SET status = 'DISCARDED', resolved_by = $2::uuid, resolved_at = NOW()
           WHERE id = $1::uuid;`,
          [queueId, ctx.user.id]
        );
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'RESOLVE_DEDUP_QUEUE',
        module: 'Censo',
        targetType: 'DEDUP_QUEUE',
        targetId: queueId,
        details: { resolution, resolvedAthleteId },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, resolution, resolvedAthleteId });
    }

    // 7. Enviar invitaciones de onboarding (individual o masiva por equipo)
    if (action === 'send_invitations') {
      assertCan(ctx, 'invitation.send');
      const invScope = getAuthorizedTeamScope(ctx, 'invitation.send');

      const athleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : null;
      const teamSeasonId = typeof body.teamSeasonId === 'string' ? body.teamSeasonId.trim() : null;
      const sendEmail = body.sendEmail !== false;
      const requestedTargetType =
        body.targetType === 'GUARDIAN' || body.targetType === 'ATHLETE' ? body.targetType : 'AUTO';
      const emailOverride =
        typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null;

      if (!athleteId && !teamSeasonId) {
        return NextResponse.json(
          { success: false, error: 'Indica athleteId o teamSeasonId para enviar invitaciones.' },
          { status: 400 }
        );
      }

      if (teamSeasonId && !invScope.isGlobal && !invScope.teamIds.includes(teamSeasonId)) {
        throw new IntranetForbiddenError('No tienes permiso para enviar invitaciones en este equipo.');
      }

      if (emailOverride && !isStrictEmail(emailOverride)) {
        return NextResponse.json(
          { success: false, error: 'El correo electrónico indicado no es válido.' },
          { status: 400 }
        );
      }

      type TargetAthleteRow = {
        id: string;
        first_name: string;
        last_name: string;
        birth_year: number | null;
        birth_date_enc: string | null;
        user_id: string | null;
        status: AthleteStatus;
      };

      let targetAthletes: TargetAthleteRow[] = [];
      if (athleteId) {
        targetAthletes = await queryNeon<TargetAthleteRow>(
          `SELECT id, first_name, last_name, birth_year, birth_date_enc, user_id::text, status
           FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
          [athleteId]
        );
        if (targetAthletes.length === 0) {
          return NextResponse.json({ success: false, error: 'Deportista no encontrado.' }, { status: 404 });
        }
      } else if (teamSeasonId) {
        targetAthletes = await queryNeon<TargetAthleteRow>(
          `SELECT a.id, a.first_name, a.last_name, a.birth_year, a.birth_date_enc, a.user_id::text, a.status
           FROM intranet_athletes a
           INNER JOIN intranet_athlete_teams at ON at.athlete_id = a.id
           WHERE at.team_season_id = $1
             AND a.status NOT IN ('BAJA', 'SHREDDED')
             AND a.is_demo = false
           ORDER BY a.last_name ASC, a.first_name ASC;`,
          [teamSeasonId]
        );
      }

      const targetIds = targetAthletes.map((a) => a.id);
      const [allTeamRels, allGuardians] = targetIds.length
        ? await Promise.all([
            queryNeon<{ athlete_id: string; team_season_id: string }>(
              `SELECT athlete_id, team_season_id FROM intranet_athlete_teams WHERE athlete_id = ANY($1::text[]);`,
              [targetIds]
            ),
            queryNeon<{
              athlete_id: string;
              guardian_user_id: string | null;
              full_name: string;
              email: string | null;
            }>(
              `SELECT athlete_id, guardian_user_id::text, full_name, email
               FROM intranet_guardianships
               WHERE athlete_id = ANY($1::text[])
               ORDER BY is_primary_payer DESC, created_at ASC;`,
              [targetIds]
            ),
          ])
        : [[], []];

      const teamsMap = new Map<string, string[]>();
      for (const r of allTeamRels) {
        const list = teamsMap.get(r.athlete_id) || [];
        list.push(r.team_season_id);
        teamsMap.set(r.athlete_id, list);
      }

      const guardianMap = new Map<string, (typeof allGuardians)[0]>();
      for (const g of allGuardians) {
        if (!guardianMap.has(g.athlete_id)) guardianMap.set(g.athlete_id, g);
      }

      const onlyPending = Boolean(teamSeasonId && body.onlyPending !== false);

      const results: Array<{
        athleteId: string;
        athleteName: string;
        targetType: 'GUARDIAN' | 'ATHLETE';
        email: string;
        inviteUrl: string;
        emailSent: boolean;
        emailError?: string;
      }> = [];
      const skipped: Array<{ athleteId: string; athleteName: string; reason: string }> = [];

      for (const ath of targetAthletes) {
        const fullName = `${ath.first_name} ${ath.last_name}`.trim();
        const athTeams = teamsMap.get(ath.id) || [];

        if (athleteId && !invScope.isGlobal) {
          const allowed = athTeams.some((tid) => invScope.teamIds.includes(tid));
          if (!allowed) {
            throw new IntranetForbiddenError('No tienes permiso para invitar a este deportista.');
          }
        }

        if (ath.status === 'SHREDDED') {
          if (athleteId) {
            return NextResponse.json(
              { success: false, error: 'Ficha suprimida (SHREDDED).' },
              { status: 409 }
            );
          }
          skipped.push({ athleteId: ath.id, athleteName: fullName, reason: 'Ficha suprimida' });
          continue;
        }
        if (ath.status === 'BAJA') {
          if (athleteId) {
            return NextResponse.json(
              { success: false, error: 'El deportista está dado de baja.' },
              { status: 400 }
            );
          }
          skipped.push({ athleteId: ath.id, athleteName: fullName, reason: 'Deportista de baja' });
          continue;
        }

        const guardian = guardianMap.get(ath.id) || null;
        if (onlyPending && (ath.user_id || guardian?.guardian_user_id)) {
          skipped.push({ athleteId: ath.id, athleteName: fullName, reason: 'Ya dispone de cuenta activada' });
          continue;
        }

        const bdPlain = safeDecrypt(ath.birth_date_enc, [
          `${ath.id}:birth_date_enc`,
          `${ath.id}:birth_date_encrypted`,
        ]);
        const ageEval = computeAgeInMadrid(bdPlain, ath.birth_year);

        let finalTargetType: 'GUARDIAN' | 'ATHLETE';
        if (requestedTargetType === 'ATHLETE') {
          if (ageEval.isMinor && !ageEval.isMinor14To17) {
            if (athleteId) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Menores de 14 años deben activar cuenta mediante su tutor legal.',
                },
                { status: 400 }
              );
            }
            finalTargetType = 'GUARDIAN';
          } else {
            finalTargetType = 'ATHLETE';
          }
        } else if (requestedTargetType === 'GUARDIAN') {
          finalTargetType = 'GUARDIAN';
        } else {
          // AUTO: <18 -> GUARDIAN, >=18 -> ATHLETE
          finalTargetType = ageEval.isMinor ? 'GUARDIAN' : 'ATHLETE';
        }

        const roleCodes: RoleCode[] = finalTargetType === 'GUARDIAN' ? ['TUTOR'] : ['JUGADOR'];
        const targetEmail = (emailOverride || guardian?.email || '').trim().toLowerCase();

        if (!targetEmail || !isStrictEmail(targetEmail)) {
          if (athleteId) {
            return NextResponse.json(
              {
                success: false,
                error: 'No hay un correo electrónico válido registrado para enviar la invitación.',
              },
              { status: 400 }
            );
          }
          skipped.push({ athleteId: ath.id, athleteName: fullName, reason: 'Sin correo electrónico válido' });
          continue;
        }

        const inv = await createIntranetInvitation({
          email: targetEmail,
          targetType: finalTargetType,
          roleCodes,
          teamSeasonIds: athTeams,
          athleteId: ath.id,
          metadata: {
            athleteName: fullName,
            guardianName: guardian?.full_name || null,
          },
          invitedByUserId: ctx.user.id,
          expiresDays: 14,
          sendEmail,
          recipientName:
            finalTargetType === 'GUARDIAN' ? guardian?.full_name || fullName : fullName,
        });

        results.push({
          athleteId: ath.id,
          athleteName: fullName,
          targetType: finalTargetType,
          email: targetEmail,
          inviteUrl: inv.inviteUrl,
          emailSent: inv.emailSent,
          emailError: inv.emailError,
        });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: athleteId ? 'SEND_CENSUS_INVITATION' : 'SEND_BATCH_CENSUS_INVITATIONS',
        module: 'Censo',
        targetType: athleteId ? 'ATHLETE' : 'TEAM',
        targetId: athleteId || teamSeasonId,
        details: {
          generated: results.length,
          emailed: results.filter((r) => r.emailSent).length,
          skipped: skipped.length,
          sendEmail,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        results,
        skipped,
      });
    }

    return NextResponse.json({ success: false, error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Census POST');
  }
}
