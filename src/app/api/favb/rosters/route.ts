import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncFavbRosters } from '@/lib/favb-scraper';
import { FAVB_PLAYERS, resolveCanonicalPlayerId } from '@/lib/favb-data';
import { CLUB_INFO, formatPlayerNameWithInitials } from '@/lib/club-info';
import { resolveCensusBirthDate } from '@/lib/consent-store';
import { queryNeon, NeonUnavailableError } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp, verifyAdminSessionToken } from '@/lib/rate-limiter';
import type { Player, Staff, StaffRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface IntranetTeamStaffRow {
  team_season_id: string;
  staff_function: string;
  user_id: string;
  name: string;
  email: string;
}

const DEMO_STAFF_EMAILS = new Set([
  'entrenador.senior@voleibolsanpedro.es',
  'entrenador.cadete@voleibolsanpedro.es',
]);

function isDemoStaffAccount(row: { name?: string | null; email?: string | null }): boolean {
  const email = String(row.email || '').trim().toLowerCase();
  const name = String(row.name || '').trim();
  if (!name || !email) return true;
  if (email.endsWith('@e2e-test.voleibolsanpedro.local')) return true;
  if (DEMO_STAFF_EMAILS.has(email)) return true;
  if (/\((Entrenador|Coordinadora|Secretar[íi]a|Tesorer[íi]a|Delegado)/i.test(name)) return true;
  return false;
}

interface CensusPrivacyRow {
  player_id: string;
  canonical_player_id: string | null;
  player_name: string;
  team_id: string;
  birth_year: number | null;
  birth_date: string | null;
  birth_date_encrypted: string | null;
  is_demo: boolean;
}

interface ConsentPrivacyRow {
  player_id: string;
  player_name: string;
  status: string;
  consent_social_media: boolean;
  is_minor: boolean;
}

export type PublicSanitizedPlayer = Omit<Player, 'birthYear' | 'heightCm'> & {
  displayName: string;
  isAnonymized?: boolean;
};

function normalizeNameKey(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBirthDateFromRow(row: CensusPrivacyRow, canonicalId: string): string | null {
  return resolveCensusBirthDate(row, canonicalId);
}

export async function GET(req: NextRequest) {
  const noStoreHeaders = {
    'Cache-Control': 'private, no-store, must-revalidate',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };

  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`favb-rosters:${clientIp}`, 60, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas consultas de plantillas. Espera unos segundos.' },
        {
          status: 429,
          headers: { ...noStoreHeaders, 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos de privacidad temporalmente no disponible. No se pueden mostrar plantillas.',
        },
        { status: 503, headers: noStoreHeaders }
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const requestedForce = searchParams.get('force') === 'true';
  const rawTeamId = searchParams.get('teamId') || undefined;
  const teamId = rawTeamId && /^[a-zA-Z0-9_-]{1,64}$/.test(rawTeamId) ? rawTeamId : undefined;

  let isAdmin = false;
  if (requestedForce) {
    const token = cookies().get('cdv_admin_session')?.value;
    if (token) {
      try {
        isAdmin = await verifyAdminSessionToken(token);
      } catch {
        isAdmin = false;
      }
    }
  }
  const force = requestedForce && isAdmin;

  try {
    // 1. Consulta obligatoria fail-closed en Neon antes de exponer plantillas públicas
    const [censusRows, consentRows, intranetStaffRows, allActiveUsersRows, result] = await Promise.all([
      queryNeon<CensusPrivacyRow>(
        `SELECT player_id, canonical_player_id, player_name, team_id,
                birth_year, birth_date, birth_date_encrypted, COALESCE(is_demo, false) AS is_demo
         FROM player_census;`
      ),
      queryNeon<ConsentPrivacyRow>(
        `SELECT player_id, player_name, status, consent_social_media, is_minor
         FROM player_consents
         ORDER BY (CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END), updated_at DESC;`
      ),
      queryNeon<IntranetTeamStaffRow>(
        `SELECT ts.team_season_id, ts.staff_function, u.id::text AS user_id, u.name, u.email
         FROM intranet_team_staff ts
         INNER JOIN intranet_users u ON u.id = ts.user_id
         WHERE ts.valid_to IS NULL
           AND u.status = 'ACTIVE'
           AND ts.staff_function IN ('HEAD_COACH', 'ASSISTANT')
         ORDER BY CASE WHEN ts.staff_function = 'HEAD_COACH' THEN 0 ELSE 1 END, u.name ASC;`
      ).catch(() => [] as IntranetTeamStaffRow[]),
      queryNeon<{ id: string; name: string; email: string }>(
        `SELECT u.id::text AS id, u.name, u.email
         FROM intranet_users u
         WHERE u.status = 'ACTIVE'
           AND EXISTS (
             SELECT 1 FROM intranet_user_roles ur
             WHERE ur.user_id = u.id
               AND ur.role_code IN ('PRESIDENTE', 'DIRECTOR_DEPORTIVO', 'ENTRENADOR', 'COORDINADOR')
           );`
      ).catch(() => [] as Array<{ id: string; name: string; email: string }>),
      syncFavbRosters(force, teamId),
    ]);

    // Índices canónicos para cruzar censo y consentimientos
    const canonicalInfoById = new Map<
      string,
      { isDemo: boolean }
    >();
    const canonicalIdByName = new Map<string, string>();

    for (const p of FAVB_PLAYERS) {
      const nKey = normalizeNameKey(`${p.firstName} ${p.lastName}`);
      if (nKey) canonicalIdByName.set(nKey, p.id);
    }

    for (const row of censusRows) {
      const canonicalId = resolveCanonicalPlayerId(row.canonical_player_id || row.player_id);
      resolveBirthDateFromRow(row, canonicalId);

      const prev = canonicalInfoById.get(canonicalId);
      const isDemo =
        Boolean(row.is_demo) ||
        row.player_id.startsWith('demo-') ||
        row.player_id === 'p-test-prueba' ||
        Boolean(prev?.isDemo);

      canonicalInfoById.set(canonicalId, { isDemo });

      const nKey = normalizeNameKey(row.player_name);
      if (nKey && !canonicalIdByName.has(nKey)) {
        canonicalIdByName.set(nKey, canonicalId);
      }
    }

    const consentByCanonicalId = new Map<string, ConsentPrivacyRow>();
    const consentByName = new Map<string, ConsentPrivacyRow>();

    for (const c of consentRows) {
      const canonicalId = resolveCanonicalPlayerId(c.player_id);
      const prev = consentByCanonicalId.get(canonicalId);
      if (!prev) {
        consentByCanonicalId.set(canonicalId, c);
      } else if (
        prev.player_id !== c.player_id &&
        prev.status === 'ACTIVE' &&
        prev.consent_social_media &&
        (c.status !== 'ACTIVE' || !c.consent_social_media)
      ) {
        // Si colisionan dos IDs distintos (legado y canónico), priorizar denegación/revocación por precaución
        consentByCanonicalId.set(canonicalId, c);
      }
      const nKey = normalizeNameKey(c.player_name);
      if (nKey && !consentByName.has(nKey)) {
        consentByName.set(nKey, c);
      }
    }

    const sourcePlayers = teamId
      ? result.players.filter((p) => p.teamId === teamId)
      : result.players;

    const sanitizedPlayers: PublicSanitizedPlayer[] = [];

    for (const p of sourcePlayers) {
      if (p.id.startsWith('demo-') || p.id === 'p-test-prueba') {
        continue;
      }

      const isSlotPlaceholder = p.firstName === 'Jugador' || p.firstName === 'Jugadora';
      if (isSlotPlaceholder) {
        const { birthYear: _by, heightCm: _hc, ...rest } = p;
        sanitizedPlayers.push({
          ...rest,
          photoUrl: '/images/player-placeholder.svg',
          displayName: `${p.firstName} ${p.lastName}`.trim(),
        });
        continue;
      }

      const fullName = `${p.firstName} ${p.lastName}`.trim();
      const nameKey = normalizeNameKey(fullName);
      const canonicalId = resolveCanonicalPlayerId(
        canonicalIdByName.get(nameKey) || p.id
      );

      const censusInfo = canonicalInfoById.get(canonicalId);
      if (censusInfo?.isDemo) {
        continue;
      }

      const consent =
        consentByCanonicalId.get(canonicalId) ||
        consentByCanonicalId.get(p.id) ||
        consentByName.get(nameKey);

      const hasExplicitDenialOrRevocation = Boolean(
        consent && (consent.status !== 'ACTIVE' || consent.consent_social_media === false)
      );
      const hasActiveSocialConsent = Boolean(
        consent && consent.status === 'ACTIVE' && consent.consent_social_media === true
      );

      const canShowPhoto = hasActiveSocialConsent && !hasExplicitDenialOrRevocation;

      const { birthYear: _by, heightCm: _hc, ...rest } = p;
      const formattedName = formatPlayerNameWithInitials(p.firstName, p.lastName);

      sanitizedPlayers.push({
        ...rest,
        id: canonicalId,
        firstName: formattedName.firstName || p.firstName,
        lastName: formattedName.lastInitials,
        displayName: formattedName.displayName || `${p.firstName} ${p.lastName}`.trim(),
        photoUrl: canShowPhoto ? p.photoUrl || '/images/player-placeholder.svg' : '/images/player-placeholder.svg',
        isAnonymized: false,
      });
    }

    const baseStaff = teamId
      ? result.staff.filter((s) => s.teamId === teamId)
      : result.staff;

    // Resolver nombres completos reales de entrenadores desde intranet_team_staff y usuarios activos de cuerpo técnico
    const realIntranetStaff = intranetStaffRows.filter((r) => !isDemoStaffAccount(r));
    const activeCoachUsers = allActiveUsersRows.filter((r) => !isDemoStaffAccount(r));

    const intranetByTeam = new Map<string, IntranetTeamStaffRow[]>();
    for (const row of realIntranetStaff) {
      if (teamId && row.team_season_id !== teamId) continue;
      const list = intranetByTeam.get(row.team_season_id) || [];
      list.push(row);
      intranetByTeam.set(row.team_season_id, list);
    }

    const resolveSingleTokenCoach = (rawName: string, tId: string): string => {
      const clean = String(rawName || '').trim();
      const tokens = clean.split(/\s+/).filter(Boolean);
      if (tokens.length > 1) return clean;
      const tokenKey = normalizeNameKey(clean);
      if (!tokenKey) return clean;

      // 1) Coincidencia con el presidente si su apellido coincide inequívocamente
      const presName = String(CLUB_INFO.president || '').trim();
      const presKey = normalizeNameKey(presName);
      if (tokenKey === 'ALCANTARA' || (presKey && presKey.split(' ').includes(tokenKey))) {
        return 'Carlos Alberto Alcántara González';
      }

      // 2) Coincidencia en entrenadores asignados al equipo en intranet_team_staff
      const teamMatches = (intranetByTeam.get(tId) || []).filter((r) =>
        normalizeNameKey(r.name).split(' ').includes(tokenKey)
      );
      if (teamMatches.length === 1) {
        return teamMatches[0].name.trim();
      }

      // 3) Coincidencia inequívoca única entre entrenadores/dirección activos del club
      const globalMatches = activeCoachUsers.filter((u) =>
        normalizeNameKey(u.name).split(' ').includes(tokenKey)
      );
      if (globalMatches.length === 1) {
        return globalMatches[0].name.trim();
      }
      return clean;
    };

    const mergedStaffByTeam = new Map<string, Map<string, Staff>>();
    const ensureTeamStaffMap = (tId: string) => {
      let m = mergedStaffByTeam.get(tId);
      if (!m) {
        m = new Map<string, Staff>();
        mergedStaffByTeam.set(tId, m);
      }
      return m;
    };

    // Primero incorporamos entrenadores reales asignados en intranet_team_staff (prioridad máxima)
    for (const [tId, rows] of Array.from(intranetByTeam.entries())) {
      const tMap = ensureTeamStaffMap(tId);
      for (const r of rows) {
        const fullName = r.name.trim();
        const key = normalizeNameKey(fullName);
        if (!key || tMap.has(key)) continue;
        const mappedRole: StaffRole =
          r.staff_function === 'HEAD_COACH' ? 'HEAD_COACH' : 'ASSISTANT';
        tMap.set(key, {
          id: `st-intranet-${tId}-${r.user_id}`,
          teamId: tId,
          name: fullName,
          role: mappedRole,
          photoUrl: '/images/staff-placeholder.svg',
        });
      }
    }

    // Luego fusionamos FAVB/scraper resolviendo apellidos sueltos sin duplicar nombres completos ya cargados
    for (const st of baseStaff) {
      const tMap = ensureTeamStaffMap(st.teamId);
      const resolvedName = resolveSingleTokenCoach(st.name, st.teamId);
      const resolvedKey = normalizeNameKey(resolvedName);
      if (!resolvedKey) continue;

      const resolvedTokens = resolvedKey.split(' ').filter(Boolean);
      const isCoveredByFullName = Array.from(tMap.keys()).some((existingKey) => {
        if (existingKey === resolvedKey) return true;
        if (resolvedTokens.length === 1) {
          return existingKey.split(' ').includes(resolvedTokens[0]);
        }
        return false;
      });
      if (isCoveredByFullName) continue;

      tMap.set(resolvedKey, {
        ...st,
        name: resolvedName,
      });
    }

    const filteredStaff: Staff[] = [];
    for (const tMap of Array.from(mergedStaffByTeam.values())) {
      const list = Array.from(tMap.values()).sort((a, b) => {
        if (a.role === b.role) return a.name.localeCompare(b.name, 'es');
        return a.role === 'HEAD_COACH' ? -1 : 1;
      });
      filteredStaff.push(...list);
    }

    return NextResponse.json(
      {
        success: result.success,
        players: sanitizedPlayers,
        staff: filteredStaff,
        lastSync: result.lastSync.toISOString(),
        fromCache: result.fromCache,
        source: 'Federación Andaluza de Voleibol (favoley.net)',
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos de privacidad temporalmente no disponible. No se pueden mostrar plantillas.',
        },
        { status: 503, headers: noStoreHeaders }
      );
    }

    console.error('[API /api/favb/rosters] Error al sincronizar plantillas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo obtener de forma segura el listado oficial de plantillas.',
      },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
