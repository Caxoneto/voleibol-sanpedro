import { queryNeon } from '@/lib/streaming-store';
import { FAVB_PLAYERS } from '@/lib/favb-data';
import { syncFavbRosters } from '@/lib/favb-scraper';
import { encryptData, decryptDataStrict, generateBlindIndex } from '@/lib/encryption';
import { resolveCensusBirthDate } from '@/lib/consent-store';
import { parseBirthDateParts } from '@/lib/date-utils';
import {
  normalizeNameKey,
  matchAthleteCandidatesFromList,
  type AthleteMatchCandidateRecord,
} from './athlete-matcher';
import { INITIAL_TEAM_SEASONS } from './catalog';
import { ensureIntranetSeeded } from './seed-bootstrap';
import { recordAuditLog } from './audit';

export { normalizeNameKey };

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { firstName: 'Deportista', lastName: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return {
    firstName: parts.slice(0, parts.length - 2).join(' '),
    lastName: parts.slice(parts.length - 2).join(' '),
  };
}

function safeDecryptField(cipherText: string | null | undefined, aads: string[]): string | null {
  if (!cipherText || !cipherText.trim()) return null;
  for (const aad of aads) {
    const res = decryptDataStrict(cipherText, aad);
    if (res.ok && res.value) return res.value;
  }
  const legacy = decryptDataStrict(cipherText);
  return legacy.ok && legacy.value ? legacy.value : null;
}

export interface CensusSyncSummary {
  athletesProcessed: number;
  athletesInsertedOrUpdated: number;
  guardiansLinked: number;
  skippedShredded: number;
}

/**
 * Sincroniza de forma no destructiva `FAVB_PLAYERS`, `player_census` y `player_consents`
 * hacia `intranet_athletes`, `intranet_athlete_teams` e `intranet_guardianships`.
 * Respeta el estado `SHREDDED` (Art. 17 RGPD) y el AAD de cifrado.
 */
export async function syncCensusFromClubSources(actor?: {
  userId?: string | null;
  email: string;
  ipAddress?: string | null;
}): Promise<CensusSyncSummary> {
  await ensureIntranetSeeded();

  const [censusRows, consentRows, existingIntranetRows] = await Promise.all([
    queryNeon<{
      player_id: string;
      player_name: string;
      team_id: string;
      birth_year: number | null;
      birth_date: string | null;
      birth_date_encrypted: string | null;
      birth_date_verified: boolean;
      dni_last5: string | null;
      dni_encrypted: string | null;
      dni_blind_index: string | null;
      parent_name: string | null;
      parent_dni: string | null;
      parent_relationship: string | null;
      contact_phone: string | null;
      contact_email: string | null;
      canonical_player_id: string | null;
      secondary_team_ids: string[] | null;
      is_demo: boolean;
    }>(`SELECT * FROM player_census;`),
    queryNeon<{
      player_id: string;
      player_name: string;
      team_id: string;
      signer_type: string;
      signer_name: string;
      signer_dni: string;
      signer_relationship: string;
      signer_email: string;
      signer_phone: string;
      status: string;
    }>(
      `SELECT player_id, player_name, team_id, signer_type, signer_name, signer_dni,
              signer_relationship, signer_email, signer_phone, status
       FROM player_consents;`
    ),
    queryNeon<{ id: string; status: string }>(`SELECT id, status FROM intranet_athletes;`),
  ]);

  const validTeamIds = new Set(INITIAL_TEAM_SEASONS.map((t) => t.id));
  const shreddedIds = new Set<string>();
  const verifiedAthleteIds = new Set<string>();
  for (const row of existingIntranetRows) {
    if (row.status === 'SHREDDED') shreddedIds.add(row.id);
    if (row.status === 'VERIFICADO') verifiedAthleteIds.add(row.id);
  }
  for (const c of consentRows) {
    if (c.status === 'SHREDDED') shreddedIds.add(c.player_id);
  }

  const consentByPlayerId = new Map(consentRows.map((c) => [c.player_id, c]));
  const favbById = new Map(FAVB_PLAYERS.map((p) => [p.id, p]));

  type MergedDraft = {
    id: string;
    firstName: string;
    lastName: string;
    birthYear: number | null;
    birthDatePlain: string | null;
    birthDateVerified: boolean;
    dniLast5: string | null;
    dniPlain: string | null;
    dniBlindIndex: string | null;
    gender: 'MASCULINO' | 'FEMENINO';
    isDemo: boolean;
    primaryTeamId: string | null;
    secondaryTeamIds: Set<string>;
    dorsal: number | null;
    position: string | null;
    guardian: {
      fullName: string;
      dniPlain: string | null;
      relationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL';
      email: string | null;
      phone: string | null;
    } | null;
  };

  const drafts = new Map<string, MergedDraft>();

  const ensureDraft = (id: string, fullName: string, teamId?: string): MergedDraft => {
    let d = drafts.get(id);
    if (!d) {
      const split = splitFullName(fullName);
      const teamMeta = INITIAL_TEAM_SEASONS.find((t) => t.id === teamId);
      d = {
        id,
        firstName: split.firstName,
        lastName: split.lastName,
        birthYear: null,
        birthDatePlain: null,
        birthDateVerified: false,
        dniLast5: null,
        dniPlain: null,
        dniBlindIndex: null,
        gender: teamMeta?.gender || 'FEMENINO',
        isDemo: id.startsWith('demo-') || id === 'p-test-prueba',
        primaryTeamId: teamId && validTeamIds.has(teamId) ? teamId : null,
        secondaryTeamIds: new Set<string>(),
        dorsal: null,
        position: null,
        guardian: null,
      };
      drafts.set(id, d);
    }
    return d;
  };

  // 1. Sembrar desde FAVB_PLAYERS
  for (const p of FAVB_PLAYERS) {
    const d = ensureDraft(p.id, `${p.firstName} ${p.lastName}`.trim(), p.teamId);
    d.firstName = p.firstName.trim();
    d.lastName = p.lastName.trim();
    d.birthYear = p.birthYear || d.birthYear;
    d.dorsal = p.number || d.dorsal;
    d.position = p.position || d.position;
    if (p.secondaryTeamIds) {
      for (const secId of p.secondaryTeamIds) {
        if (validTeamIds.has(secId) && secId !== d.primaryTeamId) {
          d.secondaryTeamIds.add(secId);
        }
      }
    }
    if (p.otherTeamCallUps) {
      for (const extra of p.otherTeamCallUps) {
        if (validTeamIds.has(extra.teamId) && extra.teamId !== d.primaryTeamId) {
          d.secondaryTeamIds.add(extra.teamId);
        }
      }
    }
  }

  // 2. Enriquecer desde player_census
  for (const row of censusRows) {
    const canonicalId = (row.canonical_player_id || row.player_id).trim();
    const favbMatch = favbById.get(canonicalId) || favbById.get(row.player_id);
    const d = ensureDraft(canonicalId, row.player_name, row.team_id);

    if (favbMatch) {
      d.firstName = favbMatch.firstName.trim();
      d.lastName = favbMatch.lastName.trim();
    }
    if (row.is_demo) d.isDemo = true;
    if (row.birth_year) d.birthYear = row.birth_year;
    if (row.birth_date_verified) d.birthDateVerified = true;

    const birthDatePlain = resolveCensusBirthDate(row, canonicalId);
    if (birthDatePlain) {
      d.birthDatePlain = birthDatePlain;
      const parts = parseBirthDateParts(birthDatePlain);
      if (parts) d.birthYear = parts.year;
    }

    if (row.dni_last5) d.dniLast5 = row.dni_last5;
    if (row.dni_blind_index) d.dniBlindIndex = row.dni_blind_index;

    const dniPlain = safeDecryptField(row.dni_encrypted, [
      `${canonicalId}:dni_encrypted`,
      `${row.player_id}:dni_encrypted`,
    ]);
    if (dniPlain) {
      d.dniPlain = dniPlain;
      d.dniBlindIndex = d.dniBlindIndex || generateBlindIndex(dniPlain);
    }

    if (validTeamIds.has(row.team_id)) {
      if (!d.primaryTeamId) d.primaryTeamId = row.team_id;
      else if (d.primaryTeamId !== row.team_id) d.secondaryTeamIds.add(row.team_id);
    }
    if (Array.isArray(row.secondary_team_ids)) {
      for (const secId of row.secondary_team_ids) {
        if (validTeamIds.has(secId) && secId !== d.primaryTeamId) {
          d.secondaryTeamIds.add(secId);
        }
      }
    }

    const contactEmail = safeDecryptField(row.contact_email, [
      `${canonicalId}:contact_email`,
      `${row.player_id}:contact_email`,
    ]);
    const contactPhone = safeDecryptField(row.contact_phone, [
      `${canonicalId}:contact_phone`,
      `${row.player_id}:contact_phone`,
    ]);
    const parentDni = safeDecryptField(row.parent_dni, [
      `${canonicalId}:parent_dni`,
      `${row.player_id}:parent_dni`,
    ]);

    if (row.parent_name || contactEmail || contactPhone) {
      const rel =
        row.parent_relationship === 'PADRE' || row.parent_relationship === 'MADRE'
          ? row.parent_relationship
          : 'TUTOR_LEGAL';
      d.guardian = {
        fullName: row.parent_name?.trim() || 'Tutor legal por confirmar',
        dniPlain: parentDni,
        relationship: rel,
        email: contactEmail?.trim().toLowerCase() || null,
        phone: contactPhone?.trim() || null,
      };
    }
  }

  // 3. Enriquecer tutores desde player_consents activos
  for (const [playerId, c] of Array.from(consentByPlayerId.entries())) {
    if (c.status === 'SHREDDED') continue;
    const d = drafts.get(playerId);
    if (!d) continue;
    if (c.signer_type === 'PARENT') {
      const signerEmail = safeDecryptField(c.signer_email, [`${playerId}:signer_email`]);
      const signerPhone = safeDecryptField(c.signer_phone, [`${playerId}:signer_phone`]);
      const signerDni = safeDecryptField(c.signer_dni, [`${playerId}:signer_dni`]);
      const rel =
        c.signer_relationship === 'PADRE' || c.signer_relationship === 'MADRE'
          ? c.signer_relationship
          : 'TUTOR_LEGAL';
      d.guardian = {
        fullName: c.signer_name || d.guardian?.fullName || 'Tutor legal',
        dniPlain: signerDni || d.guardian?.dniPlain || null,
        relationship: rel,
        email: signerEmail?.trim().toLowerCase() || d.guardian?.email || null,
        phone: signerPhone?.trim() || d.guardian?.phone || null,
      };
    }
  }

  let upserted = 0;
  let guardiansLinked = 0;
  let skippedShredded = 0;

  for (const d of Array.from(drafts.values())) {
    if (shreddedIds.has(d.id)) {
      await queryNeon(
        `INSERT INTO intranet_athletes (
           id, first_name, last_name, full_name_normalized, gender, status, is_demo
         ) VALUES ($1, '[SUPRIMIDO]', '', 'suprimido', $2, 'SHREDDED', $3)
         ON CONFLICT (id) DO UPDATE SET status = 'SHREDDED', dni_enc = NULL, dni_blind_index = NULL, birth_date_enc = NULL, medical_allergies_enc = NULL;`,
        [d.id, d.gender, d.isDemo]
      );
      skippedShredded++;
      continue;
    }

    const fullNorm = normalizeNameKey(`${d.firstName} ${d.lastName}`);
    const birthDateEnc = d.birthDatePlain ? encryptData(d.birthDatePlain, `${d.id}:birth_date_enc`) : null;
    const dniEnc = d.dniPlain ? encryptData(d.dniPlain, `${d.id}:dni_enc`) : null;

    await queryNeon(
      `INSERT INTO intranet_athletes (
         id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
         birth_date_verified, dni_last5, dni_enc, dni_blind_index, gender, jersey_number,
         status, is_demo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'IMPORTADO', $13)
       ON CONFLICT (id) DO UPDATE SET
         first_name = COALESCE(NULLIF(intranet_athletes.first_name, ''), EXCLUDED.first_name),
         last_name = COALESCE(NULLIF(intranet_athletes.last_name, ''), EXCLUDED.last_name),
         full_name_normalized = CASE
           WHEN intranet_athletes.status = 'VERIFICADO' THEN intranet_athletes.full_name_normalized
           ELSE EXCLUDED.full_name_normalized
         END,
         birth_year = COALESCE(intranet_athletes.birth_year, EXCLUDED.birth_year),
         birth_date_enc = COALESCE(intranet_athletes.birth_date_enc, EXCLUDED.birth_date_enc),
         birth_date_verified = intranet_athletes.birth_date_verified OR EXCLUDED.birth_date_verified,
         dni_last5 = COALESCE(intranet_athletes.dni_last5, EXCLUDED.dni_last5),
         dni_enc = COALESCE(intranet_athletes.dni_enc, EXCLUDED.dni_enc),
         dni_blind_index = COALESCE(intranet_athletes.dni_blind_index, EXCLUDED.dni_blind_index),
         jersey_number = COALESCE(intranet_athletes.jersey_number, EXCLUDED.jersey_number),
         updated_at = NOW();`,
      [
        d.id,
        d.firstName,
        d.lastName,
        fullNorm,
        d.birthYear,
        birthDateEnc,
        d.birthDateVerified,
        d.dniLast5,
        dniEnc,
        d.dniBlindIndex,
        d.gender,
        d.dorsal,
        d.isDemo,
      ]
    );
    upserted++;

    if (d.primaryTeamId && !verifiedAthleteIds.has(d.id)) {
      await queryNeon(
        `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal, position)
         VALUES ($1, $2, true, $3, $4)
         ON CONFLICT (athlete_id, team_season_id) DO UPDATE SET
           dorsal = COALESCE(intranet_athlete_teams.dorsal, EXCLUDED.dorsal),
           position = COALESCE(intranet_athlete_teams.position, EXCLUDED.position);`,
        [d.id, d.primaryTeamId, d.dorsal, d.position]
      );
    }

    if (!verifiedAthleteIds.has(d.id)) {
      for (const secTeamId of Array.from(d.secondaryTeamIds)) {
        await queryNeon(
          `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
           VALUES ($1, $2, false)
           ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
          [d.id, secTeamId]
        );
      }
    }

    if (d.guardian) {
      const existingG = await queryNeon<{ id: string }>(
        `SELECT id::text AS id FROM intranet_guardianships WHERE athlete_id = $1 LIMIT 1;`,
        [d.id]
      );
      if (existingG.length === 0) {
        const gDniEnc = d.guardian.dniPlain
          ? encryptData(d.guardian.dniPlain, `${d.id}:guardian_dni`)
          : null;
        const gDniBlind = d.guardian.dniPlain ? generateBlindIndex(d.guardian.dniPlain) : null;
        await queryNeon(
          `INSERT INTO intranet_guardianships (
             athlete_id, full_name, dni_enc, dni_blind_index, relationship, email, phone, is_primary_payer
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, true);`,
          [
            d.id,
            d.guardian.fullName,
            gDniEnc,
            gDniBlind,
            d.guardian.relationship,
            d.guardian.email,
            d.guardian.phone,
          ]
        );
        guardiansLinked++;
      }
    }
  }

  if (actor) {
    await recordAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: 'SYNC_CENSUS_SOURCES',
      module: 'Censo',
      details: { upserted, guardiansLinked, skippedShredded },
      ipAddress: actor.ipAddress,
    });
  }

  return {
    athletesProcessed: drafts.size,
    athletesInsertedOrUpdated: upserted,
    guardiansLinked,
    skippedShredded,
  };
}

export interface FederationDiscrepancyMissingItem {
  favbId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  teamId: string;
  teamName: string;
  dorsal: number | null;
  birthYear: number | null;
  registrationUrl: string | null;
}

export interface FederationDiscrepancyMismatchItem {
  athleteId: string;
  clubFullName: string;
  favbFullName: string;
  clubStatus: string;
  missingTeamIds: string[];
  missingTeamNames: string[];
  dorsalDiff: { clubDorsal: number | null; favbDorsal: number } | null;
  nameDiff: { clubName: string; favbName: string } | null;
}

export interface FederationOnlyInClubItem {
  athleteId: string;
  fullName: string;
  teamNames: string[];
  status: string;
}

export interface FederationDiscrepancyReport {
  checkedAtIso: string;
  favbPlayersCount: number;
  clubAthletesCount: number;
  missingInClub: FederationDiscrepancyMissingItem[];
  discrepancies: FederationDiscrepancyMismatchItem[];
  onlyInClub: FederationOnlyInClubItem[];
}

/**
 * Compara en modo SOLO LECTURA el censo actual del club frente a las actas/rosters FAVB
 * sin crear ni eliminar deportistas automáticamente.
 */
export async function checkFederationDiscrepancies(params?: {
  allowedTeamIds?: string[] | null;
  actor?: { userId?: string | null; email: string; ipAddress?: string | null };
}): Promise<FederationDiscrepancyReport> {
  await ensureIntranetSeeded();

  const teamAllowSet =
    params?.allowedTeamIds && params.allowedTeamIds.length > 0
      ? new Set(params.allowedTeamIds)
      : null;

  const [favbSnapshot, athRows, teamRelRows, regLinkRows] = await Promise.all([
    syncFavbRosters(false),
    queryNeon<{
      id: string;
      first_name: string;
      last_name: string;
      birth_year: number | null;
      birth_date_verified: boolean;
      gender: string | null;
      jersey_number: number | null;
      status: string;
    }>(
      `SELECT id, first_name, last_name, birth_year, birth_date_verified, gender, jersey_number, status
       FROM intranet_athletes
       WHERE status NOT IN ('BAJA', 'SHREDDED')
         AND COALESCE(is_demo, false) = false
       ORDER BY last_name ASC, first_name ASC;`
    ),
    queryNeon<{ athlete_id: string; team_season_id: string }>(
      `SELECT athlete_id, team_season_id FROM intranet_athlete_teams;`
    ),
    queryNeon<{
      token: string;
      category_code: string;
      default_team_season_id: string | null;
    }>(
      `SELECT token, category_code, default_team_season_id
       FROM intranet_category_registration_links
       WHERE is_active = true;`
    ),
  ]);

  const teamNameMap = new Map(INITIAL_TEAM_SEASONS.map((t) => [t.id, t.name]));
  const teamCategoryMap = new Map(INITIAL_TEAM_SEASONS.map((t) => [t.id, t.categoryId]));
  const teamGenderMap = new Map(INITIAL_TEAM_SEASONS.map((t) => [t.id, t.gender]));

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://voleibolsanpedro.es')
  ).replace(/\/+$/, '');
  const linkByTeam = new Map<string, string>();
  const linkByCategory = new Map<string, string>();
  for (const l of regLinkRows) {
    const url = `${baseUrl}/inscripcion?cat=${encodeURIComponent(l.token)}`;
    if (l.default_team_season_id && !linkByTeam.has(l.default_team_season_id)) {
      linkByTeam.set(l.default_team_season_id, url);
    }
    if (!linkByCategory.has(l.category_code)) {
      linkByCategory.set(l.category_code, url);
    }
  }

  const clubTeamsByAth = new Map<string, string[]>();
  for (const rel of teamRelRows) {
    const list = clubTeamsByAth.get(rel.athlete_id) || [];
    list.push(rel.team_season_id);
    clubTeamsByAth.set(rel.athlete_id, list);
  }

  const scopedClubAths = athRows.filter((a) => {
    if (!teamAllowSet) return true;
    const tids = clubTeamsByAth.get(a.id) || [];
    return tids.some((tid) => teamAllowSet.has(tid));
  });

  const clubById = new Map(scopedClubAths.map((a) => [a.id, a]));
  const clubPool: AthleteMatchCandidateRecord[] = scopedClubAths.map((a) => ({
    id: a.id,
    firstName: a.first_name || '',
    lastName: a.last_name || '',
    birthYear: a.birth_year,
    birthDateVerified: Boolean(a.birth_date_verified),
    birthDatePlain: null,
    gender: a.gender === 'MASCULINO' ? 'MASCULINO' : 'FEMENINO',
    teamIds: clubTeamsByAth.get(a.id) || [],
    status: a.status,
  }));

  // Agrupar entradas FAVB reales por identidad normalizada (o id canónico si coincide)
  type FedGrouped = {
    favbId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    birthYear: number | null;
    primaryTeamId: string;
    teamIds: Set<string>;
    dorsal: number | null;
  };
  const fedGroups = new Map<string, FedGrouped>();

  for (const fp of favbSnapshot.players || []) {
    if (!fp.id || fp.id.startsWith('demo-') || fp.id === 'p-test-prueba') continue;
    if (teamAllowSet && !teamAllowSet.has(fp.teamId)) continue;
    const fullName = `${fp.firstName || ''} ${fp.lastName || ''}`.trim();
    const norm = normalizeNameKey(fullName);
    if (!norm) continue;
    const key = clubById.has(fp.id) ? `id:${fp.id}` : `name:${norm}`;
    let g = fedGroups.get(key);
    if (!g) {
      g = {
        favbId: fp.id,
        firstName: fp.firstName.trim(),
        lastName: fp.lastName.trim(),
        fullName,
        birthYear: fp.birthYear && fp.birthYear > 1940 ? fp.birthYear : null,
        primaryTeamId: fp.teamId,
        teamIds: new Set<string>(),
        dorsal: fp.number && fp.number > 0 ? fp.number : null,
      };
      fedGroups.set(key, g);
    }
    if (fp.teamId) g.teamIds.add(fp.teamId);
    if (!g.dorsal && fp.number && fp.number > 0) g.dorsal = fp.number;
  }

  const matchedClubIds = new Set<string>();
  const missingInClub: FederationDiscrepancyMissingItem[] = [];
  const discrepancies: FederationDiscrepancyMismatchItem[] = [];

  for (const fed of Array.from(fedGroups.values())) {
    let matchedAth = clubById.get(fed.favbId) || null;
    if (!matchedAth) {
      const gender = teamGenderMap.get(fed.primaryTeamId) || 'FEMENINO';
      const catId = teamCategoryMap.get(fed.primaryTeamId) || fed.primaryTeamId;
      const m = matchAthleteCandidatesFromList(clubPool, {
        firstName: fed.firstName,
        lastName: fed.lastName,
        birthYear: fed.birthYear || 2010,
        birthDateIso: `${fed.birthYear || 2010}-06-15`,
        gender,
        categoryCode: catId,
        defaultTeamSeasonId: fed.primaryTeamId,
      });
      if (m.kind === 'MATCH') {
        matchedAth = clubById.get(m.best.candidate.id) || null;
      }
    }

    if (!matchedAth) {
      const catId = teamCategoryMap.get(fed.primaryTeamId) || '';
      missingInClub.push({
        favbId: fed.favbId,
        firstName: fed.firstName,
        lastName: fed.lastName,
        fullName: fed.fullName,
        teamId: fed.primaryTeamId,
        teamName: teamNameMap.get(fed.primaryTeamId) || fed.primaryTeamId,
        dorsal: fed.dorsal,
        birthYear: fed.birthYear,
        registrationUrl: linkByTeam.get(fed.primaryTeamId) || linkByCategory.get(catId) || null,
      });
      continue;
    }

    matchedClubIds.add(matchedAth.id);
    const clubTeams = new Set(clubTeamsByAth.get(matchedAth.id) || []);
    const missingTeamIds = Array.from(fed.teamIds).filter(
      (tid) => tid && !clubTeams.has(tid) && teamNameMap.has(tid)
    );
    const missingTeamNames = missingTeamIds.map((tid) => teamNameMap.get(tid) || tid);
    const dorsalDiff =
      fed.dorsal && matchedAth.jersey_number !== fed.dorsal
        ? { clubDorsal: matchedAth.jersey_number, favbDorsal: fed.dorsal }
        : null;
    const clubFullName = `${matchedAth.first_name} ${matchedAth.last_name}`.trim();
    const nameDiff =
      normalizeNameKey(clubFullName) !== normalizeNameKey(fed.fullName)
        ? { clubName: clubFullName, favbName: fed.fullName }
        : null;

    if (missingTeamIds.length > 0 || dorsalDiff || nameDiff) {
      discrepancies.push({
        athleteId: matchedAth.id,
        clubFullName,
        favbFullName: fed.fullName,
        clubStatus: matchedAth.status,
        missingTeamIds,
        missingTeamNames,
        dorsalDiff,
        nameDiff,
      });
    }
  }

  const onlyInClub: FederationOnlyInClubItem[] = scopedClubAths
    .filter((a) => !matchedClubIds.has(a.id))
    .map((a) => ({
      athleteId: a.id,
      fullName: `${a.first_name} ${a.last_name}`.trim(),
      teamNames: (clubTeamsByAth.get(a.id) || []).map((tid) => teamNameMap.get(tid) || tid),
      status: a.status,
    }));

  if (params?.actor) {
    await recordAuditLog({
      actorUserId: params.actor.userId,
      actorEmail: params.actor.email,
      action: 'CHECK_FAVB_DISCREPANCIES',
      module: 'Censo',
      details: {
        favbPlayersCount: fedGroups.size,
        clubAthletesCount: scopedClubAths.length,
        missingInClubCount: missingInClub.length,
        discrepanciesCount: discrepancies.length,
      },
      ipAddress: params.actor.ipAddress,
    });
  }

  return {
    checkedAtIso: new Date().toISOString(),
    favbPlayersCount: fedGroups.size,
    clubAthletesCount: scopedClubAths.length,
    missingInClub,
    discrepancies,
    onlyInClub,
  };
}
