import crypto from 'crypto';
import { queryNeon } from '@/lib/streaming-store';
import { FAVB_PLAYERS } from '@/lib/favb-data';
import { encryptData, decryptDataStrict, generateBlindIndex } from '@/lib/encryption';
import { resolveCensusBirthDate } from '@/lib/consent-store';
import { parseBirthDateParts } from '@/lib/date-utils';
import { INITIAL_TEAM_SEASONS } from './catalog';
import { ensureIntranetSeeded } from './seed-bootstrap';
import { recordAuditLog } from './audit';

export function normalizeNameKey(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  for (const row of existingIntranetRows) {
    if (row.status === 'SHREDDED') shreddedIds.add(row.id);
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
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDIENTE_VALIDAR', $13)
       ON CONFLICT (id) DO UPDATE SET
         first_name = COALESCE(NULLIF(intranet_athletes.first_name, ''), EXCLUDED.first_name),
         last_name = COALESCE(NULLIF(intranet_athletes.last_name, ''), EXCLUDED.last_name),
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

    if (d.primaryTeamId) {
      await queryNeon(
        `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal, position)
         VALUES ($1, $2, true, $3, $4)
         ON CONFLICT (athlete_id, team_season_id) DO UPDATE SET
           dorsal = COALESCE(intranet_athlete_teams.dorsal, EXCLUDED.dorsal),
           position = COALESCE(intranet_athlete_teams.position, EXCLUDED.position);`,
        [d.id, d.primaryTeamId, d.dorsal, d.position]
      );
    }

    for (const secTeamId of Array.from(d.secondaryTeamIds)) {
      await queryNeon(
        `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
         VALUES ($1, $2, false)
         ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
        [d.id, secTeamId]
      );
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

export interface FeelSportsImportRow {
  firstName: string;
  lastName: string;
  dni?: string;
  birthDate?: string;
  teamNameOrId?: string;
  guardianName?: string;
  guardianDni?: string;
  email?: string;
  phone?: string;
  feelsportsId?: string;
}

export interface FeelSportsImportResult {
  created: number;
  enriched: number;
  queuedForDedup: number;
  skippedShredded: number;
}

function resolveTeamIdByFuzzyName(raw?: string): string | null {
  if (!raw) return null;
  const clean = normalizeNameKey(raw);
  const direct = INITIAL_TEAM_SEASONS.find((t) => t.id.toLowerCase() === raw.trim().toLowerCase());
  if (direct) return direct.id;
  const byName = INITIAL_TEAM_SEASONS.find((t) => normalizeNameKey(t.name) === clean);
  if (byName) return byName.id;
  const partial = INITIAL_TEAM_SEASONS.find(
    (t) => clean.includes(normalizeNameKey(t.name)) || normalizeNameKey(t.name).includes(clean)
  );
  return partial?.id || null;
}

/**
 * Importa filas procedentes del CSV de FeelSports con deduplicación automática y cola de revisión.
 */
export async function importFeelSportsRows(
  rows: FeelSportsImportRow[],
  actor: { userId: string; email: string; ipAddress?: string | null }
): Promise<FeelSportsImportResult> {
  await ensureIntranetSeeded();

  const existing = await queryNeon<{
    id: string;
    full_name_normalized: string;
    birth_year: number | null;
    dni_blind_index: string | null;
    status: string;
  }>(`SELECT id, full_name_normalized, birth_year, dni_blind_index, status FROM intranet_athletes;`);

  const byBlindIdx = new Map<string, typeof existing[0]>();
  const byNormName = new Map<string, Array<typeof existing[0]>>();

  for (const a of existing) {
    if (a.dni_blind_index) byBlindIdx.set(a.dni_blind_index, a);
    const list = byNormName.get(a.full_name_normalized) || [];
    list.push(a);
    byNormName.set(a.full_name_normalized, list);
  }

  let created = 0;
  let enriched = 0;
  let queuedForDedup = 0;
  let skippedShredded = 0;

  for (const row of rows) {
    const first = row.firstName.trim();
    const last = row.lastName.trim();
    if (!first && !last) continue;

    const fullNorm = normalizeNameKey(`${first} ${last}`);
    const cleanDni = row.dni?.trim().toUpperCase().replace(/[\s-]/g, '') || '';
    const blindIdx = cleanDni.length >= 6 ? generateBlindIndex(cleanDni) : null;
    const birthParts = parseBirthDateParts(row.birthDate);
    const birthYear = birthParts?.year || null;
    const teamId = resolveTeamIdByFuzzyName(row.teamNameOrId);

    // 1. Coincidencia exacta por DNI Blind Index
    let matched: typeof existing[0] | undefined = blindIdx ? byBlindIdx.get(blindIdx) : undefined;
    let doubtful = false;
    let matchReason = '';

    // 2. Coincidencia por nombre normalizado + año nacimiento
    if (!matched) {
      const nameMatches = byNormName.get(fullNorm) || [];
      if (nameMatches.length === 1) {
        const candidate = nameMatches[0];
        if (birthYear && candidate.birth_year && candidate.birth_year === birthYear) {
          matched = candidate;
        } else {
          doubtful = true;
          matched = candidate;
          matchReason = birthYear
            ? `Mismo nombre ("${first} ${last}") con año distinto o sin verificar`
            : `Mismo nombre ("${first} ${last}") sin DNI ni fecha para confirmar`;
        }
      } else if (nameMatches.length > 1) {
        doubtful = true;
        matched = nameMatches[0];
        matchReason = `Múltiples coincidencias de nombre ("${first} ${last}")`;
      }
    }

    if (matched && matched.status === 'SHREDDED') {
      skippedShredded++;
      continue;
    }

    if (doubtful && matched) {
      await queryNeon(
        `INSERT INTO intranet_dedup_queue (
           source_type, raw_payload_json, candidate_athlete_id, match_reason, status
         ) VALUES ('FEELSPORTS_CSV', $1::jsonb, $2, $3, 'PENDING');`,
        [JSON.stringify(row), matched.id, matchReason]
      );
      queuedForDedup++;
      continue;
    }

    const targetId = matched ? matched.id : `fs-${crypto.randomUUID().slice(0, 12)}`;
    const dniEnc = cleanDni.length >= 6 ? encryptData(cleanDni, `${targetId}:dni_enc`) : null;
    const dniLast5 = cleanDni.length >= 5 ? cleanDni.slice(-5) : null;
    const bdIso = birthParts
      ? `${String(birthParts.year).padStart(4, '0')}-${String(birthParts.month).padStart(2, '0')}-${String(birthParts.day).padStart(2, '0')}`
      : null;
    const bdEnc = bdIso ? encryptData(bdIso, `${targetId}:birth_date_enc`) : null;

    if (matched) {
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
        [targetId, birthYear, bdEnc, dniLast5, dniEnc, blindIdx, row.feelsportsId || null]
      );
      enriched++;
    } else {
      const teamMeta = INITIAL_TEAM_SEASONS.find((t) => t.id === teamId);
      await queryNeon(
        `INSERT INTO intranet_athletes (
           id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
           dni_last5, dni_enc, dni_blind_index, gender, feelsports_id, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'IMPORTADO');`,
        [
          targetId,
          first,
          last,
          fullNorm,
          birthYear,
          bdEnc,
          dniLast5,
          dniEnc,
          blindIdx,
          teamMeta?.gender || 'FEMENINO',
          row.feelsportsId || null,
        ]
      );
      created++;
    }

    if (teamId) {
      await queryNeon(
        `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT (athlete_id, team_season_id) DO NOTHING;`,
        [targetId, teamId]
      );
    }

    if (row.guardianName || row.email || row.phone) {
      const gDniEnc = row.guardianDni
        ? encryptData(row.guardianDni.trim().toUpperCase(), `${targetId}:guardian_dni`)
        : null;
      const gDniIdx = row.guardianDni ? generateBlindIndex(row.guardianDni.trim().toUpperCase()) : null;
      const existingG = await queryNeon<{ id: string }>(
        `SELECT id::text AS id FROM intranet_guardianships WHERE athlete_id = $1 LIMIT 1;`,
        [targetId]
      );
      if (existingG.length === 0) {
        await queryNeon(
          `INSERT INTO intranet_guardianships (
             athlete_id, full_name, dni_enc, dni_blind_index, relationship, email, phone, is_primary_payer
           ) VALUES ($1, $2, $3, $4, 'TUTOR_LEGAL', $5, $6, true);`,
          [
            targetId,
            row.guardianName?.trim() || `${first} ${last}`.trim(),
            gDniEnc,
            gDniIdx,
            row.email?.trim().toLowerCase() || null,
            row.phone?.trim() || null,
          ]
        );
      }
    }
  }

  await recordAuditLog({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: 'IMPORT_FEELSPORTS_CSV',
    module: 'Censo',
    details: { created, enriched, queuedForDedup, skippedShredded },
    ipAddress: actor.ipAddress,
  });

  return { created, enriched, queuedForDedup, skippedShredded };
}
