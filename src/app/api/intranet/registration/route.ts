import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  computeAgeInMadrid,
  formatMadridTime,
  parseBirthDateParts,
} from '@/lib/date-utils';
import {
  decryptDataStrict,
  encryptData,
  encryptWithDek,
  generateBlindIndex,
  generateDek,
  maskDni,
  unwrapDek,
  wrapDek,
} from '@/lib/encryption';
import {
  isStrictEmail,
  isValidSpanishDniOrNie,
  stripCrlf,
  validateSignatureDataUrl,
} from '@/lib/validators';
import { computeVerifiableConsentHash } from '@/lib/consent-store';
import {
  createEmailOtpChallenge,
  sendConsentOtpEmail,
  sendConsentReceiptEmail,
  sendSmtpMail,
  verifyEmailOtpChallenge,
} from '@/lib/email-otp';
import { CLUB_CATEGORIES_META, CLUB_INFO, getClubTeamNameById } from '@/lib/club-info';
import {
  CURRENT_SEASON_SEED,
  ROLES_CATALOG,
  evaluateMemberPassword,
  type RoleCode,
} from '@/lib/intranet/catalog';
import {
  getPublicBaseUrl,
  hashIntranetPassword,
  requireIntranetSession,
  verifyIntranetPassword,
} from '@/lib/intranet/auth';
import {
  IntranetForbiddenError,
  IntranetValidationError,
  assertCan,
  can,
  getAuthorizedTeamScope,
} from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { createAthleteEnrollment } from '@/lib/intranet/payments';
import {
  formatProperPersonName,
  matchAthleteCandidatesFromList,
  normalizeNameKey,
  type AthleteMatchCandidateRecord,
} from '@/lib/intranet/athlete-matcher';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRAFT_PLAYER_ID_REGEX = /^reg-[a-f0-9-]{8,20}$/i;
const STAFF_ROLE_SET = new Set<RoleCode>(
  ROLES_CATALOG.filter((r) => r.isStaff).map((r) => r.code)
);
const REUSE_ACCOUNT_ERROR_MSG =
  'Este correo ya dispone de cuenta en el club. Si ya eres tutor/a y estás inscribiendo a otro menor, introduce tu contraseña actual exacta; en caso contrario usa otro correo.';

let regSchemaReady = false;
let regSchemaPromise: Promise<void> | null = null;

async function ensureRegistrationSchema(): Promise<void> {
  if (regSchemaReady) return;
  if (regSchemaPromise) return regSchemaPromise;
  regSchemaPromise = (async () => {
    await queryNeon(
      `ALTER TABLE intranet_registration_requests
       ADD COLUMN IF NOT EXISTS pending_payload_enc TEXT,
       ADD COLUMN IF NOT EXISTS family_group_id UUID;`
    );
    await queryNeon(
      `CREATE INDEX IF NOT EXISTS idx_intranet_reg_req_family_group
       ON intranet_registration_requests (family_group_id);`
    );
    regSchemaReady = true;
  })().finally(() => {
    regSchemaPromise = null;
  });
  return regSchemaPromise;
}

interface StagedRegistrationPayload {
  version: 1;
  athleteId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  fullNorm: string;
  birthDateIso: string;
  birthYear: number;
  isMinor: boolean;
  isMinor14To17: boolean;
  gender: 'MASCULINO' | 'FEMENINO';
  playerDni: string;
  dniBlindIndex: string | null;
  shirtSize: string | null;
  jerseyNumber: number | null;
  medicalAllergies: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  guardianName: string | null;
  guardianDni: string | null;
  guardianRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | null;
  guardianPhone: string | null;
  email: string;
  contactPhoneForConsent: string;
  authoritativeTeamId: string;
  consentId: string;
  consentImage: boolean;
  consentTravel: boolean;
  signerType: 'PARENT' | 'SELF_ADULT';
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerPhone: string;
  signatureData: string;
  legalVersion: string;
  documentHash: string;
  signedAtIso: string;
  challengeId: string;
  verifiedAtIso: string;
  clientIp: string;
  userAgent: string;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return stripCrlf(input).slice(0, maxLen);
}

function normalizePhone(input: unknown): string {
  if (typeof input !== 'string') return '';
  return stripCrlf(input).replace(/[^\d+\s()-]/g, '').trim().slice(0, 30);
}

function hasValidPhoneDigits(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

interface ActiveRegistrationLinkRow {
  id: string;
  token: string;
  category_code: string;
  category_label: string;
  default_team_season_id: string | null;
  season_id: string;
}

interface ValidatedRegistrationStep1 {
  link: ActiveRegistrationLinkRow;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDateIso: string;
  birthYear: number;
  isMinor: boolean;
  isMinor14To17: boolean;
  gender: 'MASCULINO' | 'FEMENINO';
  playerDni: string;
  shirtSize: string | null;
  jerseyNumber: number | null;
  medicalAllergies: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  guardianName: string | null;
  guardianDni: string | null;
  guardianRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | null;
  guardianPhone: string | null;
  selectedProductId: string;
  selectedPricePlanId: string;
  email: string;
  password: string;
  reusableExistingUserId: string | null;
}

async function fetchActiveLinkByToken(token: string): Promise<ActiveRegistrationLinkRow | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;
  const rows = await queryNeon<ActiveRegistrationLinkRow>(
    `SELECT id::text AS id, token, category_code, category_label, default_team_season_id, season_id
     FROM intranet_category_registration_links
     WHERE token = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1;`,
    [cleanToken]
  );
  return rows[0] || null;
}

async function evaluateExistingAccountReuse(params: {
  email: string;
  password: string;
  isMinor: boolean;
}): Promise<{ ok: true; existingUserId: string | null } | { ok: false; status: number; error: string }> {
  const userRows = await queryNeon<{
    id: string;
    password_hash: string | null;
    status: string;
  }>(
    `SELECT id::text AS id, password_hash, status
     FROM intranet_users
     WHERE LOWER(email) = $1
     LIMIT 1;`,
    [params.email]
  );

  const existingUser = userRows[0];
  if (!existingUser) {
    return { ok: true, existingUserId: null };
  }

  if (existingUser.status !== 'ACTIVE') {
    return { ok: false, status: 409, error: REUSE_ACCOUNT_ERROR_MSG };
  }

  const [roleRows, staffRows, ownAthleteRows] = await Promise.all([
    queryNeon<{ role_code: RoleCode }>(
      `SELECT role_code
       FROM intranet_user_roles
       WHERE user_id = $1::uuid
         AND valid_from <= NOW()
         AND (valid_to IS NULL OR valid_to > NOW());`,
      [existingUser.id]
    ),
    queryNeon<{ id: string }>(
      `SELECT id::text AS id
       FROM intranet_team_staff
       WHERE user_id = $1::uuid
         AND valid_from <= NOW()
         AND (valid_to IS NULL OR valid_to > NOW())
       LIMIT 1;`,
      [existingUser.id]
    ),
    queryNeon<{ id: string }>(
      `SELECT id FROM intranet_athletes WHERE user_id = $1::uuid AND status NOT IN ('SHREDDED', 'BAJA') LIMIT 1;`,
      [existingUser.id]
    ),
  ]);

  const hasStaffRole =
    staffRows.length > 0 || roleRows.some((r) => STAFF_ROLE_SET.has(r.role_code));
  if (hasStaffRole) {
    return { ok: false, status: 409, error: REUSE_ACCOUNT_ERROR_MSG };
  }

  if (!verifyIntranetPassword(params.password, existingUser.password_hash)) {
    return { ok: false, status: 409, error: REUSE_ACCOUNT_ERROR_MSG };
  }

  if (!params.isMinor && ownAthleteRows.length > 0) {
    return {
      ok: false,
      status: 409,
      error:
        'Este correo ya está vinculado a una ficha de deportista adulto en el club. Utiliza otro correo electrónico personal.',
    };
  }

  return { ok: true, existingUserId: existingUser.id };
}

async function validateRegistrationStep1(
  body: Record<string, unknown>
): Promise<{ ok: true; data: ValidatedRegistrationStep1 } | { ok: false; status: number; error: string }> {
  const linkToken = typeof body.linkToken === 'string' ? body.linkToken.trim() : '';
  if (!linkToken) {
    return { ok: false, status: 400, error: 'Falta el código de enlace de inscripción de la categoría.' };
  }

  const link = await fetchActiveLinkByToken(linkToken);
  if (!link) {
    return {
      ok: false,
      status: 404,
      error: 'El enlace de inscripción no es válido, está desactivado o ha caducado.',
    };
  }

  const firstName = formatProperPersonName(cleanText(body.firstName, 80));
  const lastName = formatProperPersonName(cleanText(body.lastName, 120));
  if (firstName.length < 2 || lastName.length < 2) {
    return { ok: false, status: 400, error: 'Introduce el nombre y apellidos completos del deportista.' };
  }

  const birthDateRaw = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';
  const birthParts = parseBirthDateParts(birthDateRaw);
  if (!birthParts) {
    return { ok: false, status: 400, error: 'Introduce una fecha de nacimiento válida.' };
  }
  const birthDateIso = `${String(birthParts.year).padStart(4, '0')}-${String(
    birthParts.month
  ).padStart(2, '0')}-${String(birthParts.day).padStart(2, '0')}`;

  const ageEval = computeAgeInMadrid(birthDateIso, birthParts.year);
  if (ageEval.age === null || ageEval.age < 4 || ageEval.age > 95) {
    return { ok: false, status: 400, error: 'La fecha de nacimiento está fuera del rango deportivo admitido.' };
  }

  const genderRaw = typeof body.gender === 'string' ? body.gender.trim().toUpperCase() : '';
  if (genderRaw !== 'MASCULINO' && genderRaw !== 'FEMENINO') {
    return { ok: false, status: 400, error: 'Selecciona el sexo del deportista (Masculino o Femenino).' };
  }
  const gender = genderRaw as 'MASCULINO' | 'FEMENINO';

  const emergencyContactName = formatProperPersonName(cleanText(body.emergencyContactName, 120));
  const emergencyContactPhone = normalizePhone(body.emergencyContactPhone);
  if (emergencyContactName.length < 2 || !hasValidPhoneDigits(emergencyContactPhone)) {
    return {
      ok: false,
      status: 400,
      error: 'El nombre y un teléfono válido de contacto de emergencia son obligatorios.',
    };
  }

  const cleanPlayerDni =
    typeof body.playerDni === 'string'
      ? body.playerDni.trim().toUpperCase().replace(/[\s-]/g, '')
      : '';

  if (ageEval.age >= 14) {
    if (!cleanPlayerDni || !isValidSpanishDniOrNie(cleanPlayerDni)) {
      return {
        ok: false,
        status: 400,
        error:
          'A partir de los 14 años es obligatorio indicar un DNI, NIE o Pasaporte válido del deportista.',
      };
    }
  } else if (cleanPlayerDni && !isValidSpanishDniOrNie(cleanPlayerDni)) {
    return {
      ok: false,
      status: 400,
      error: 'El DNI, NIE o Pasaporte introducido para el deportista no tiene un formato válido.',
    };
  }

  const shirtSize = cleanText(body.shirtSize, 16) || null;
  let jerseyNumber: number | null = null;
  if (
    body.jerseyNumber !== undefined &&
    body.jerseyNumber !== null &&
    String(body.jerseyNumber).trim() !== ''
  ) {
    const parsedNum = Number(body.jerseyNumber);
    if (!Number.isInteger(parsedNum) || parsedNum < 1 || parsedNum > 99) {
      return { ok: false, status: 400, error: 'El dorsal preferido debe ser un número entre 1 y 99.' };
    }
    jerseyNumber = parsedNum;
  }
  const medicalAllergies = cleanText(body.medicalAllergies, 500) || null;

  let guardianName: string | null = null;
  let guardianDni: string | null = null;
  let guardianRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | null = null;
  let guardianPhone: string | null = null;

  if (ageEval.isMinor) {
    guardianName = formatProperPersonName(cleanText(body.guardianName, 150));
    const rawGDni =
      typeof body.guardianDni === 'string'
        ? body.guardianDni.trim().toUpperCase().replace(/[\s-]/g, '')
        : '';
    const relRaw =
      typeof body.guardianRelationship === 'string'
        ? body.guardianRelationship.trim().toUpperCase()
        : '';
    guardianPhone = normalizePhone(body.guardianPhone);

    if (guardianName.length < 3) {
      return {
        ok: false,
        status: 400,
        error: 'Para menores de 18 años es obligatorio indicar el nombre completo del padre, madre o tutor legal.',
      };
    }
    if (!isValidSpanishDniOrNie(rawGDni)) {
      return {
        ok: false,
        status: 400,
        error: 'El DNI, NIE o Pasaporte del padre, madre o tutor legal no es válido.',
      };
    }
    if (cleanPlayerDni && rawGDni === cleanPlayerDni) {
      return {
        ok: false,
        status: 400,
        error:
          'El documento del/de la deportista menor no puede coincidir con el DNI/NIE del padre, madre o tutor/a legal. Si es menor de 14 años y aún no tiene DNI propio, deja en blanco el documento del deportista.',
      };
    }
    if (relRaw !== 'PADRE' && relRaw !== 'MADRE' && relRaw !== 'TUTOR_LEGAL') {
      return {
        ok: false,
        status: 400,
        error: 'Selecciona el parentesco del representante legal (Padre, Madre o Tutor/a Legal).',
      };
    }
    if (!hasValidPhoneDigits(guardianPhone)) {
      return {
        ok: false,
        status: 400,
        error: 'Introduce un teléfono móvil válido del padre, madre o tutor legal.',
      };
    }
    guardianDni = rawGDni;
    guardianRelationship = relRaw as 'PADRE' | 'MADRE' | 'TUTOR_LEGAL';
  }

  const selectedProductId =
    typeof body.selectedProductId === 'string' ? body.selectedProductId.trim() : '';
  const selectedPricePlanId =
    typeof body.selectedPricePlanId === 'string' ? body.selectedPricePlanId.trim() : '';

  if (!UUID_REGEX.test(selectedProductId) || !UUID_REGEX.test(selectedPricePlanId)) {
    return {
      ok: false,
      status: 400,
      error: 'Debes seleccionar una modalidad de pago válida.',
    };
  }

  const planRows = await queryNeon<{ id: string }>(
    `SELECT pp.id::text AS id
     FROM intranet_price_plans pp
     INNER JOIN intranet_products p ON p.id = pp.product_id
     WHERE pp.id = $1::uuid
       AND p.id = $2::uuid
       AND p.season_id = $3
       AND p.is_active = true
       AND pp.is_active = true
     LIMIT 1;`,
    [selectedPricePlanId, selectedProductId, link.season_id]
  );
  if (planRows.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'La modalidad de pago seleccionada no existe o no está activa para esta temporada.',
    };
  }

  const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isStrictEmail(cleanEmail)) {
    return { ok: false, status: 400, error: 'Introduce una dirección de correo electrónico válida.' };
  }

  const password = typeof body.password === 'string' ? body.password : '';
  const pwdEval = evaluateMemberPassword(password);
  if (!pwdEval.valid) {
    return {
      ok: false,
      status: 400,
      error: pwdEval.error || 'La contraseña no cumple los requisitos de seguridad.',
    };
  }

  const reuseCheck = await evaluateExistingAccountReuse({
    email: cleanEmail,
    password,
    isMinor: ageEval.isMinor,
  });
  if (!reuseCheck.ok) {
    return { ok: false, status: reuseCheck.status, error: reuseCheck.error };
  }

  return {
    ok: true,
    data: {
      link,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      birthDateIso,
      birthYear: birthParts.year,
      isMinor: ageEval.isMinor,
      isMinor14To17: ageEval.isMinor14To17,
      gender,
      playerDni: cleanPlayerDni,
      shirtSize,
      jerseyNumber,
      medicalAllergies,
      emergencyContactName,
      emergencyContactPhone,
      guardianName,
      guardianDni,
      guardianRelationship,
      guardianPhone,
      selectedProductId,
      selectedPricePlanId,
      email: cleanEmail,
      password,
      reusableExistingUserId: reuseCheck.existingUserId,
    },
  };
}

interface ValidatedMultiItem {
  v: ValidatedRegistrationStep1;
  dniBlindIndex: string | null;
  matchResult: Awaited<ReturnType<typeof findMatchingAthleteForRegistration>>;
  consentImage: boolean | null;
  consentTravel: boolean | null;
}

async function validateMultiOrSingleRegistration(
  body: Record<string, unknown>,
  options?: { requireConsents?: boolean }
): Promise<
  | { ok: true; items: ValidatedMultiItem[]; isMultiChild: boolean }
  | { ok: false; status: number; error: string }
> {
  const rawChildren = Array.isArray(body.children)
    ? body.children.filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    : [];
  const isMultiChild = rawChildren.length > 1;
  const sourceEntries: Record<string, unknown>[] =
    rawChildren.length > 0
      ? rawChildren.map((child) => ({
          ...child,
          guardianRelationship: body.guardianRelationship ?? child.guardianRelationship,
          guardianName: body.guardianName ?? child.guardianName,
          guardianDni: body.guardianDni ?? child.guardianDni,
          guardianPhone: body.guardianPhone ?? child.guardianPhone,
          email: body.email ?? child.email,
          password: body.password ?? child.password,
        }))
      : [body];

  if (sourceEntries.length > 8) {
    return {
      ok: false,
      status: 400,
      error: 'Máximo 8 deportistas por solicitud familiar conjunta.',
    };
  }

  const items: ValidatedMultiItem[] = [];
  const seenIdentityKeys = new Set<string>();
  const seenChildDnis = new Set<string>();

  for (let i = 0; i < sourceEntries.length; i++) {
    const entry = sourceEntries[i];
    const validation = await validateRegistrationStep1(entry);
    if (!validation.ok) {
      const prefix = sourceEntries.length > 1 ? `Hijo/a ${i + 1}: ` : '';
      return {
        ok: false,
        status: validation.status,
        error: `${prefix}${validation.error}`,
      };
    }

    const v = validation.data;
    if (sourceEntries.length > 1 && !v.isMinor) {
      return {
        ok: false,
        status: 400,
        error: `La solicitud conjunta familiar es únicamente para menores de edad (${v.fullName} ya es mayor de edad y debe inscribirse con su propia cuenta).`,
      };
    }

    const idKey = `${normalizeNameKey(v.fullName)}:${v.birthDateIso}`;
    if (seenIdentityKeys.has(idKey)) {
      return {
        ok: false,
        status: 400,
        error: `Hay un deportista duplicado en la solicitud (${v.fullName}).`,
      };
    }
    seenIdentityKeys.add(idKey);

    if (v.playerDni) {
      if (seenChildDnis.has(v.playerDni)) {
        return {
          ok: false,
          status: 400,
          error: `El DNI/NIE ${v.playerDni} aparece repetido entre varios hijos/as.`,
        };
      }
      seenChildDnis.add(v.playerDni);
    }

    let cImage: boolean | null = null;
    let cTravel: boolean | null = null;
    if (options?.requireConsents) {
      const rawImg =
        typeof entry.consentImage === 'boolean'
          ? entry.consentImage
          : typeof body.consentImage === 'boolean' && sourceEntries.length === 1
            ? body.consentImage
            : null;
      const rawTravel =
        typeof entry.consentTravel === 'boolean'
          ? entry.consentTravel
          : typeof body.consentTravel === 'boolean' && sourceEntries.length === 1
            ? body.consentTravel
            : null;
      if (rawImg === null || rawTravel === null) {
        return {
          ok: false,
          status: 400,
          error: `Debes seleccionar Autorizo o No autorizo en Imágenes Deportivas y Desplazamientos para ${v.fullName}.`,
        };
      }
      cImage = rawImg;
      cTravel = rawTravel;
    }

    const dniBlindIndex = v.playerDni ? generateBlindIndex(v.playerDni) : null;
    const matchResult = await findMatchingAthleteForRegistration({
      dniBlindIndex,
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      birthYear: v.birthYear,
      birthDateIso: v.birthDateIso,
      gender: v.gender,
      categoryCode: v.link.category_code,
      defaultTeamSeasonId: v.link.default_team_season_id,
    });

    if (matchResult.kind === 'CONFLICT') {
      const prefix = sourceEntries.length > 1 ? `Hijo/a ${i + 1} (${v.fullName}): ` : '';
      return {
        ok: false,
        status: 409,
        error: `${prefix}${matchResult.error}`,
      };
    }

    items.push({
      v,
      dniBlindIndex,
      matchResult,
      consentImage: cImage,
      consentTravel: cTravel,
    });
  }

  return { ok: true, items, isMultiChild };
}

function getRegistrationAdminScope(ctx: Awaited<ReturnType<typeof requireIntranetSession>>): {
  allowed: boolean;
  isGlobal: boolean;
  teamIds: string[];
  canApprove: boolean;
} {
  const canApprove =
    ctx.isPresident || can(ctx, 'registration.approve') || can(ctx, 'athlete.edit');
  const canManageLinks = canApprove || can(ctx, 'invitation.send');

  if (!canManageLinks) {
    return { allowed: false, isGlobal: false, teamIds: [], canApprove: false };
  }

  const scopeReg = getAuthorizedTeamScope(ctx, 'registration.approve');
  const scopeEdit = getAuthorizedTeamScope(ctx, 'athlete.edit');
  const scopeInv = getAuthorizedTeamScope(ctx, 'invitation.send');

  const isGlobal =
    ctx.isPresident || scopeReg.isGlobal || scopeEdit.isGlobal || scopeInv.isGlobal;
  const teamIds = Array.from(
    new Set([...scopeReg.teamIds, ...scopeEdit.teamIds, ...scopeInv.teamIds])
  );

  return { allowed: true, isGlobal, teamIds, canApprove };
}

/**
 * Comprueba si un miembro del staff con alcance restringido por equipo puede operar
 * sobre una solicitud (ya sea por el equipo del enlace o por un equipo existente de la ficha unificada).
 */
async function hasScopedRequestAccess(
  adminScope: { teamIds: string[] },
  athleteId: string,
  defaultTeamSeasonId: string | null
): Promise<boolean> {
  if (defaultTeamSeasonId && adminScope.teamIds.includes(defaultTeamSeasonId)) {
    return true;
  }
  const athleteTeamRows = await queryNeon<{ team_season_id: string }>(
    `SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1;`,
    [athleteId]
  );
  return athleteTeamRows.some((r) => adminScope.teamIds.includes(r.team_season_id));
}

type AthleteMatchCandidateInspection =
  | { status: 'SHREDDED' }
  | { status: 'CONFLICT'; error: string }
  | { status: 'REUSABLE'; athleteId: string; existingPrimaryTeamId: string | null };

async function inspectExistingAthleteCandidate(
  candidateId: string,
  submittedEmail?: string | null,
  submittedDniBlindIndex?: string | null
): Promise<AthleteMatchCandidateInspection> {
  const [athRows, guardianUserRows, regReqRows, metaRows] = await Promise.all([
    queryNeon<{
      id: string;
      status: string;
      dni_blind_index: string | null;
      user_id: string | null;
      user_status: string | null;
    }>(
      `SELECT a.id, a.status, a.dni_blind_index, a.user_id::text AS user_id, u.status AS user_status
       FROM intranet_athletes a
       LEFT JOIN intranet_users u ON u.id = a.user_id
       WHERE a.id = $1
       LIMIT 1;`,
      [candidateId]
    ),
    queryNeon<{ user_status: string }>(
      `SELECT u.status AS user_status
       FROM intranet_guardianships g
       INNER JOIN intranet_users u ON u.id = g.guardian_user_id
       WHERE g.athlete_id = $1 AND g.guardian_user_id IS NOT NULL;`,
      [candidateId]
    ),
    queryNeon<{ status: string }>(
      `SELECT status FROM intranet_registration_requests WHERE athlete_id = $1;`,
      [candidateId]
    ),
    queryNeon<{
      consent_status: string | null;
      shredded_at: string | null;
      census_team_id: string | null;
      census_contact_email: string | null;
      census_dni_blind_index: string | null;
      athlete_team_id: string | null;
      has_accepted_invite: boolean;
    }>(
      `SELECT
         (SELECT status FROM player_consents WHERE player_id = $1 LIMIT 1) AS consent_status,
         (SELECT shredded_at::text FROM player_crypto_keys WHERE player_id = $1 LIMIT 1) AS shredded_at,
         (SELECT team_id FROM player_census WHERE player_id = $1 LIMIT 1) AS census_team_id,
         (SELECT contact_email FROM player_census WHERE player_id = $1 LIMIT 1) AS census_contact_email,
         (SELECT dni_blind_index FROM player_census WHERE player_id = $1 LIMIT 1) AS census_dni_blind_index,
         (SELECT team_season_id FROM intranet_athlete_teams WHERE athlete_id = $1 ORDER BY is_primary DESC, team_season_id ASC LIMIT 1) AS athlete_team_id,
         EXISTS(
           SELECT 1 FROM intranet_invitations inv
           WHERE inv.athlete_id = $1 AND inv.accepted_at IS NOT NULL
         ) AS has_accepted_invite;`,
      [candidateId]
    ),
  ]);

  const ath = athRows[0];
  const meta = metaRows[0];
  if (
    ath?.status === 'SHREDDED' ||
    meta?.consent_status === 'SHREDDED' ||
    Boolean(meta?.shredded_at)
  ) {
    return { status: 'SHREDDED' };
  }

  const hasPendingRequest = regReqRows.some((r) => r.status === 'PENDING');
  if (hasPendingRequest) {
    return {
      status: 'CONFLICT',
      error:
        'Ya existe una solicitud de inscripción pendiente de revisión para este/a deportista. Recibirás un correo en cuanto la administración la apruebe.',
    };
  }

  const hasActiveDirectUser = Boolean(ath?.user_id && ath.user_status === 'ACTIVE');
  const hasActiveGuardianUser = guardianUserRows.some((g) => g.user_status === 'ACTIVE');
  const hasActiveAccount = hasActiveDirectUser || hasActiveGuardianUser;
  const hasApprovedRequest = regReqRows.some((r) => r.status === 'APPROVED');
  const isVerifiedAthlete = ath?.status === 'VERIFICADO';
  const hasAcceptedInvite = Boolean(meta?.has_accepted_invite);

  if (hasActiveAccount || isVerifiedAthlete || hasApprovedRequest || hasAcceptedInvite) {
    return {
      status: 'CONFLICT',
      error:
        'Ya existe una ficha activa o verificada para este/a deportista en el club. Inicia sesión en /acceso para entrar en tu zona privada.',
    };
  }

  const existingDniBlind = ath?.dni_blind_index || meta?.census_dni_blind_index || null;
  if (existingDniBlind && submittedDniBlindIndex && existingDniBlind !== submittedDniBlindIndex) {
    return {
      status: 'CONFLICT',
      error:
        'El documento identificativo no coincide con la ficha previa existente en el club. Contacta con Secretaría (info@voleibolsanpedro.es).',
    };
  }

  let existingCensusEmail: string | null = null;
  if (meta?.census_contact_email) {
    const decEmail = decryptDataStrict(meta.census_contact_email, `${candidateId}:contact_email`);
    if (decEmail.ok && decEmail.value) {
      existingCensusEmail = decEmail.value.trim().toLowerCase();
    } else {
      const legacyEmail = decryptDataStrict(meta.census_contact_email);
      if (legacyEmail.ok && legacyEmail.value) {
        existingCensusEmail = legacyEmail.value.trim().toLowerCase();
      }
    }
  }

  const normalizedSubmittedEmail = submittedEmail ? submittedEmail.trim().toLowerCase() : '';
  if (
    existingCensusEmail &&
    normalizedSubmittedEmail &&
    existingCensusEmail !== normalizedSubmittedEmail
  ) {
    return {
      status: 'CONFLICT',
      error:
        'El correo electrónico introducido no coincide con el registrado en la ficha previa del club. Contacta con Secretaría (info@voleibolsanpedro.es).',
    };
  }

  if (
    meta?.consent_status === 'ACTIVE' &&
    (!existingCensusEmail ||
      !normalizedSubmittedEmail ||
      existingCensusEmail !== normalizedSubmittedEmail)
  ) {
    return {
      status: 'CONFLICT',
      error:
        'Esta ficha ya cuenta con autorización RGPD vigente asociada a otro titular. Contacta con Secretaría (info@voleibolsanpedro.es).',
    };
  }

  return {
    status: 'REUSABLE',
    athleteId: candidateId,
    existingPrimaryTeamId: meta?.athlete_team_id || meta?.census_team_id || null,
  };
}

/**
 * Busca una ficha previa en `intranet_athletes` / `player_census` antes de generar un ID `reg-...`:
 * 1) Por `dni_blind_index` (no `SHREDDED` ni `BAJA`).
 * 2) Por normalización Unicode/partículas/compuestos/erratas de 1 letra + compatibilidad de edad y prioridad de equipo/categoría.
 */
async function findMatchingAthleteForRegistration(params: {
  dniBlindIndex: string | null;
  email: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  birthDateIso: string;
  gender: 'MASCULINO' | 'FEMENINO';
  categoryCode: string;
  defaultTeamSeasonId: string | null;
}): Promise<
  | { kind: 'NONE' }
  | { kind: 'CONFLICT'; error: string }
  | { kind: 'REUSE'; athleteId: string; existingPrimaryTeamId: string | null }
> {
  // 1. Coincidencia exacta por DNI Blind Index (no SHREDDED ni BAJA)
  if (params.dniBlindIndex) {
    const [athByDni, censusByDni] = await Promise.all([
      queryNeon<{ id: string }>(
        `SELECT id
         FROM intranet_athletes
         WHERE dni_blind_index = $1
           AND status NOT IN ('SHREDDED', 'BAJA')
           AND COALESCE(is_demo, false) = false
         ORDER BY updated_at DESC
         LIMIT 5;`,
        [params.dniBlindIndex]
      ),
      queryNeon<{ player_id: string }>(
        `SELECT COALESCE(canonical_player_id, player_id) AS player_id
         FROM player_census
         WHERE dni_blind_index = $1
           AND COALESCE(is_demo, false) = false
         LIMIT 5;`,
        [params.dniBlindIndex]
      ),
    ]);

    const dniCandidates = Array.from(
      new Set([...athByDni.map((r) => r.id), ...censusByDni.map((r) => r.player_id)])
    );

    for (const candidateId of dniCandidates) {
      const inspection = await inspectExistingAthleteCandidate(
        candidateId,
        params.email,
        params.dniBlindIndex
      );
      if (inspection.status === 'SHREDDED') continue;
      if (inspection.status === 'CONFLICT') {
        return { kind: 'CONFLICT', error: inspection.error };
      }
      return {
        kind: 'REUSE',
        athleteId: inspection.athleteId,
        existingPrimaryTeamId: inspection.existingPrimaryTeamId,
      };
    }
  }

  // 2. Cargar candidatos activos/pendientes del censo para emparejamiento tolerante a formato y años orientativos FAVB
  const [athCandidates, censusOnlyRows] = await Promise.all([
    queryNeon<{
      id: string;
      first_name: string;
      last_name: string;
      birth_year: number | null;
      birth_date_verified: boolean;
      birth_date_enc: string | null;
      gender: string | null;
      status: string;
      team_ids: string[] | null;
    }>(
      `SELECT
         a.id,
         a.first_name,
         a.last_name,
         a.birth_year,
         a.birth_date_verified,
         CASE WHEN a.birth_date_verified THEN a.birth_date_enc ELSE NULL END AS birth_date_enc,
         a.gender,
         a.status,
         ARRAY_REMOVE(
           ARRAY_AGG(DISTINCT COALESCE(at2.team_season_id, pc.team_id)),
           NULL
         ) || COALESCE(MAX(pc.secondary_team_ids), ARRAY[]::varchar[]) AS team_ids
       FROM intranet_athletes a
       LEFT JOIN intranet_athlete_teams at2 ON at2.athlete_id = a.id
       LEFT JOIN player_census pc ON pc.player_id = a.id
       WHERE a.status NOT IN ('SHREDDED', 'BAJA')
         AND COALESCE(a.is_demo, false) = false
       GROUP BY a.id, a.first_name, a.last_name, a.birth_year, a.birth_date_verified, a.birth_date_enc, a.gender, a.status;`
    ),
    queryNeon<{
      player_id: string;
      player_name: string;
      team_id: string;
      secondary_team_ids: string[] | null;
      birth_year: number | null;
      birth_date_verified: boolean;
      birth_date_encrypted: string | null;
    }>(
      `SELECT
         COALESCE(pc.canonical_player_id, pc.player_id) AS player_id,
         pc.player_name,
         pc.team_id,
         pc.secondary_team_ids,
         pc.birth_year,
         pc.birth_date_verified,
         CASE WHEN pc.birth_date_verified THEN pc.birth_date_encrypted ELSE NULL END AS birth_date_encrypted
       FROM player_census pc
       WHERE COALESCE(pc.is_demo, false) = false
         AND NOT EXISTS (
           SELECT 1 FROM intranet_athletes a
           WHERE a.id = COALESCE(pc.canonical_player_id, pc.player_id)
         );`
    ),
  ]);

  const candidateRecords: AthleteMatchCandidateRecord[] = athCandidates.map((row) => {
    let birthDatePlain: string | null = null;
    if (row.birth_date_verified && row.birth_date_enc) {
      const dec = decryptDataStrict(row.birth_date_enc, `${row.id}:birth_date_enc`);
      if (dec.ok && dec.value) {
        birthDatePlain = dec.value;
      } else {
        const legacy = decryptDataStrict(row.birth_date_enc);
        if (legacy.ok && legacy.value) birthDatePlain = legacy.value;
      }
    }
    return {
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      birthYear: row.birth_year,
      birthDateVerified: Boolean(row.birth_date_verified),
      birthDatePlain,
      gender: row.gender === 'MASCULINO' ? 'MASCULINO' : 'FEMENINO',
      teamIds: Array.from(new Set((row.team_ids || []).filter(Boolean))),
      status: row.status,
    };
  });

  for (const cRow of censusOnlyRows) {
    const clean = String(cRow.player_name || '').trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const parts = clean.split(' ');
    const firstName = parts.length <= 2 ? parts[0] : parts.slice(0, parts.length - 2).join(' ');
    const lastName = parts.length === 1 ? '' : parts.length === 2 ? parts[1] : parts.slice(parts.length - 2).join(' ');
    let birthDatePlain: string | null = null;
    if (cRow.birth_date_verified && cRow.birth_date_encrypted) {
      const dec = decryptDataStrict(cRow.birth_date_encrypted, `${cRow.player_id}:birth_date_encrypted`);
      if (dec.ok && dec.value) birthDatePlain = dec.value;
    }
    candidateRecords.push({
      id: cRow.player_id,
      firstName,
      lastName,
      birthYear: cRow.birth_year,
      birthDateVerified: Boolean(cRow.birth_date_verified),
      birthDatePlain,
      gender: cRow.team_id.includes('-m') && !cRow.team_id.includes('fem') ? 'MASCULINO' : 'FEMENINO',
      teamIds: Array.from(
        new Set([cRow.team_id, ...(cRow.secondary_team_ids || [])].filter(Boolean))
      ),
      status: 'IMPORTADO',
    });
  }

  const outcome = matchAthleteCandidatesFromList(candidateRecords, {
    firstName: params.firstName,
    lastName: params.lastName,
    birthYear: params.birthYear,
    birthDateIso: params.birthDateIso,
    gender: params.gender,
    categoryCode: params.categoryCode,
    defaultTeamSeasonId: params.defaultTeamSeasonId,
  });

  if (outcome.kind !== 'MATCH') {
    return { kind: 'NONE' };
  }

  const inspection = await inspectExistingAthleteCandidate(
    outcome.best.candidate.id,
    params.email,
    params.dniBlindIndex
  );
  if (inspection.status === 'SHREDDED') {
    return { kind: 'NONE' };
  }
  if (inspection.status === 'CONFLICT') {
    return { kind: 'CONFLICT', error: inspection.error };
  }
  return {
    kind: 'REUSE',
    athleteId: inspection.athleteId,
    existingPrimaryTeamId: inspection.existingPrimaryTeamId,
  };
}

function decryptConsentFieldForAudit(
  cipher: string | null,
  playerId: string,
  field: string
): string | null {
  if (!cipher || !cipher.trim()) return null;
  const withAad = decryptDataStrict(cipher, `${playerId}:${field}`);
  if (withAad.ok && withAad.value) return withAad.value;
  const legacy = decryptDataStrict(cipher);
  return legacy.ok && legacy.value ? legacy.value : null;
}

/**
 * Si una ficha previa reutilizada ya tenía un consentimiento ACTIVE antiguo,
 * lo transiciona atómicamente a REVOKED dejando huella en `player_consents_audit`
 * antes de firmar el nuevo consentimiento `v3` con OTP.
 */
async function archivePriorActiveConsentBeforeReSign(
  targetPlayerId: string,
  subjectDek: Buffer,
  wrappedDek: string
): Promise<void> {
  const existing = await queryNeon<{
    id: string;
    signer_dni: string;
    signer_email: string | null;
    signer_phone: string | null;
    signature_data: string;
    ip_address: string | null;
    minor_signer_dni: string | null;
    minor_signature_data: string | null;
  }>(
    `SELECT id, signer_dni, signer_email, signer_phone, signature_data, ip_address,
            minor_signer_dni, minor_signature_data
     FROM player_consents
     WHERE player_id = $1 AND status = 'ACTIVE'
     LIMIT 1;`,
    [targetPlayerId]
  );

  const current = existing[0];
  if (!current) return;

  const plainDni = decryptConsentFieldForAudit(current.signer_dni, targetPlayerId, 'signer_dni');
  const plainEmail = decryptConsentFieldForAudit(current.signer_email, targetPlayerId, 'signer_email');
  const plainPhone = decryptConsentFieldForAudit(current.signer_phone, targetPlayerId, 'signer_phone');
  const plainSig = decryptConsentFieldForAudit(current.signature_data, targetPlayerId, 'signature_data');
  const plainIp = decryptConsentFieldForAudit(current.ip_address, targetPlayerId, 'ip_address');
  const plainMinorDni = decryptConsentFieldForAudit(current.minor_signer_dni, targetPlayerId, 'minor_signer_dni');
  const plainMinorSig = decryptConsentFieldForAudit(current.minor_signature_data, targetPlayerId, 'minor_signature_data');

  const auditDni = encryptWithDek(
    plainDni || '[UNDECRYPTABLE]',
    subjectDek,
    `${targetPlayerId}:audit:signer_dni`
  );
  const auditEmail = plainEmail
    ? encryptWithDek(plainEmail, subjectDek, `${targetPlayerId}:audit:signer_email`)
    : '';
  const auditPhone = plainPhone
    ? encryptWithDek(plainPhone, subjectDek, `${targetPlayerId}:audit:signer_phone`)
    : '';
  const auditSig = encryptWithDek(
    plainSig || '[UNDECRYPTABLE]',
    subjectDek,
    `${targetPlayerId}:audit:signature_data`
  );
  const auditIp = plainIp
    ? encryptWithDek(plainIp, subjectDek, `${targetPlayerId}:audit:ip_address`)
    : '';
  const auditMinorDni = plainMinorDni
    ? encryptWithDek(plainMinorDni, subjectDek, `${targetPlayerId}:audit:minor_signer_dni`)
    : null;
  const auditMinorSig = plainMinorSig
    ? encryptWithDek(plainMinorSig, subjectDek, `${targetPlayerId}:audit:minor_signature_data`)
    : null;

  await queryNeon(
    `WITH rev AS (
       UPDATE player_consents
       SET status = 'REVOKED',
           revoked_at = NOW(),
           updated_at = NOW()
       WHERE player_id = $1 AND status = 'ACTIVE'
       RETURNING *
     ),
     upsert_key AS (
       INSERT INTO player_crypto_keys (
         player_id, wrapped_dek, key_version, retention_until, shredded_at, created_at, updated_at
       )
       SELECT $1, $2, 1, NOW() + INTERVAL '5 years', NULL, NOW(), NOW()
       FROM rev
       ON CONFLICT (player_id) DO UPDATE SET
         wrapped_dek = CASE
           WHEN player_crypto_keys.shredded_at IS NULL AND player_crypto_keys.wrapped_dek IS NOT NULL
             THEN player_crypto_keys.wrapped_dek
           ELSE EXCLUDED.wrapped_dek
         END,
         retention_until = GREATEST(
           COALESCE(player_crypto_keys.retention_until, EXCLUDED.retention_until),
           EXCLUDED.retention_until
         ),
         shredded_at = NULL,
         updated_at = NOW()
       RETURNING player_id
     ),
     ins_audit AS (
       INSERT INTO player_consents_audit (
         consent_id, player_id, player_name, team_id, event_type,
         is_minor, is_minor_14_to_17, signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone, consent_image,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signature_data, legal_version, signed_at_iso,
         document_hash, ip_address, user_agent,
         minor_signer_name, minor_signer_dni, minor_signature_data, minor_signed_at_iso,
         hash_version, key_id, otp_challenge_id, otp_verified_at
       )
       SELECT
         rev.id, rev.player_id, rev.player_name, rev.team_id, 'REVOKED',
         rev.is_minor, rev.is_minor_14_to_17, rev.signer_type, rev.signer_name, $3::text, rev.signer_relationship,
         $4::text, $5::text, (rev.consent_social_media OR rev.consent_streaming OR rev.consent_press),
         rev.consent_social_media, rev.consent_streaming, rev.consent_press,
         COALESCE(rev.consent_travel, false),
         rev.signature_method, $6::text, rev.legal_version,
         COALESCE(rev.signed_at_iso, rev.created_at::text),
         rev.document_hash, $7::text, COALESCE(rev.user_agent, ''),
         rev.minor_signer_name, $8::text, $9::text, rev.minor_signed_at_iso,
         rev.hash_version, rev.key_id, rev.otp_challenge_id, rev.otp_verified_at
       FROM rev
       RETURNING audit_id
     )
     SELECT id::text AS id FROM rev;`,
    [
      targetPlayerId,
      wrappedDek,
      auditDni,
      auditEmail,
      auditPhone,
      auditSig,
      auditIp,
      auditMinorDni,
      auditMinorSig,
    ]
  );
}

async function persistSignedConsentV3(params: {
  targetPlayerId: string;
  playerName: string;
  authoritativeTeamId: string;
  isMinor: boolean;
  isMinor14To17: boolean;
  signerType: 'PARENT' | 'SELF_ADULT';
  signerName: string;
  signerDni: string;
  signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
  signerEmail: string;
  signerPhone: string;
  consentImage: boolean;
  consentTravel: boolean;
  signedAtIso: string;
  legalVersion: string;
  documentHash: string;
  signatureData: string;
  clientIp: string | null;
  userAgent: string;
  challengeId: string;
  verifiedAtIso: string;
  archivePriorActive?: boolean;
  preferredConsentId?: string;
}): Promise<string> {
  const { targetPlayerId } = params;
  const encDni = encryptData(params.signerDni, `${targetPlayerId}:signer_dni`);
  const encEmail = encryptData(params.signerEmail, `${targetPlayerId}:signer_email`);
  const encPhone = params.signerPhone
    ? encryptData(params.signerPhone, `${targetPlayerId}:signer_phone`)
    : '';
  const encIp = params.clientIp
    ? encryptData(params.clientIp, `${targetPlayerId}:ip_address`)
    : '';
  const encSig = encryptData(params.signatureData, `${targetPlayerId}:signature_data`);

  const existingKeyRows = await queryNeon<{ wrapped_dek: string | null; shredded_at: string | null }>(
    `SELECT wrapped_dek, shredded_at::text AS shredded_at
     FROM player_crypto_keys
     WHERE player_id = $1
     LIMIT 1;`,
    [targetPlayerId]
  );
  if (existingKeyRows[0]?.shredded_at) {
    throw new IntranetValidationError(
      'Esta ficha consta suprimida (Art. 17 RGPD) y no admite autorizaciones.',
      409
    );
  }
  let subjectDek: Buffer | null = null;
  if (existingKeyRows[0]?.wrapped_dek && !existingKeyRows[0]?.shredded_at) {
    subjectDek = unwrapDek(existingKeyRows[0].wrapped_dek, targetPlayerId);
  }
  if (!subjectDek) {
    subjectDek = generateDek();
  }
  const wrappedDek = wrapDek(subjectDek, targetPlayerId);

  if (params.archivePriorActive) {
    await archivePriorActiveConsentBeforeReSign(targetPlayerId, subjectDek, wrappedDek);
  }

  const auditDni = encryptWithDek(params.signerDni, subjectDek, `${targetPlayerId}:audit:signer_dni`);
  const auditEmail = encryptWithDek(
    params.signerEmail,
    subjectDek,
    `${targetPlayerId}:audit:signer_email`
  );
  const auditPhone = params.signerPhone
    ? encryptWithDek(params.signerPhone, subjectDek, `${targetPlayerId}:audit:signer_phone`)
    : '';
  const auditIp = params.clientIp
    ? encryptWithDek(params.clientIp, subjectDek, `${targetPlayerId}:audit:ip_address`)
    : '';
  const auditSig = encryptWithDek(
    params.signatureData,
    subjectDek,
    `${targetPlayerId}:audit:signature_data`
  );

  const cteRows = await queryNeon<{ consent_id: string | null }>(
    `WITH ins_c AS (
       INSERT INTO player_consents (
         id, player_id, player_name, team_id, is_minor, is_minor_14_to_17,
         signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signed_at_iso, status, revoked_at,
         signature_data, legal_version, document_hash,
         ip_address, user_agent,
         hash_version, key_id, policy_summary_accepted,
         otp_challenge_id, otp_verified_at,
         created_at, updated_at
       )
       VALUES (
         COALESCE($28::uuid, gen_random_uuid()),
         $1::varchar, $2::varchar, $3::varchar, $4::boolean, $5::boolean,
         $6::varchar, $7::varchar, $8::text, $9::varchar,
         $10::text, $11::text,
         $12::boolean, $12::boolean, $12::boolean, $13::boolean,
         'OTP_EMAIL', $14::varchar, 'ACTIVE', NULL,
         $15::text, $16::varchar, $17::varchar,
         $18::text, $19::text,
         'v3', 'integrity-v3', true,
         $26::uuid, CAST($27::text AS timestamptz),
         CAST($14::varchar AS timestamptz), NOW()
       )
       ON CONFLICT (player_id) DO UPDATE SET
         player_name = EXCLUDED.player_name,
         team_id = EXCLUDED.team_id,
         is_minor = EXCLUDED.is_minor,
         is_minor_14_to_17 = EXCLUDED.is_minor_14_to_17,
         signer_type = EXCLUDED.signer_type,
         signer_name = EXCLUDED.signer_name,
         signer_dni = EXCLUDED.signer_dni,
         signer_relationship = EXCLUDED.signer_relationship,
         signer_email = EXCLUDED.signer_email,
         signer_phone = EXCLUDED.signer_phone,
         consent_social_media = EXCLUDED.consent_social_media,
         consent_streaming = EXCLUDED.consent_streaming,
         consent_press = EXCLUDED.consent_press,
         consent_travel = EXCLUDED.consent_travel,
         signature_method = EXCLUDED.signature_method,
         signed_at_iso = EXCLUDED.signed_at_iso,
         status = 'ACTIVE',
         revoked_at = NULL,
         signature_data = EXCLUDED.signature_data,
         legal_version = EXCLUDED.legal_version,
         document_hash = EXCLUDED.document_hash,
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent,
         minor_signer_name = NULL,
         minor_signer_dni = NULL,
         minor_signature_data = NULL,
         minor_signed_at_iso = NULL,
         hash_version = EXCLUDED.hash_version,
         key_id = EXCLUDED.key_id,
         policy_summary_accepted = EXCLUDED.policy_summary_accepted,
         otp_challenge_id = EXCLUDED.otp_challenge_id,
         otp_verified_at = EXCLUDED.otp_verified_at,
         updated_at = NOW()
       WHERE player_consents.status <> 'ACTIVE' AND player_consents.status <> 'SHREDDED'
       RETURNING
         id, player_id, player_name, team_id, is_minor, is_minor_14_to_17, signer_type, signer_name,
         signer_relationship, consent_social_media, consent_streaming, consent_press,
         consent_travel, signature_method, legal_version, signed_at_iso,
         document_hash, user_agent, hash_version, key_id, otp_challenge_id, otp_verified_at
     ),
     upsert_key AS (
       INSERT INTO player_crypto_keys (
         player_id, wrapped_dek, key_version, retention_until, shredded_at, created_at, updated_at
       )
       SELECT $1::varchar, $20::text, 1, NOW() + INTERVAL '5 years', NULL, NOW(), NOW()
       FROM ins_c
       ON CONFLICT (player_id) DO UPDATE SET
         wrapped_dek = CASE
           WHEN player_crypto_keys.shredded_at IS NULL AND player_crypto_keys.wrapped_dek IS NOT NULL
             THEN player_crypto_keys.wrapped_dek
           ELSE EXCLUDED.wrapped_dek
         END,
         retention_until = GREATEST(
           COALESCE(player_crypto_keys.retention_until, EXCLUDED.retention_until),
           EXCLUDED.retention_until
         ),
         shredded_at = NULL,
         updated_at = NOW()
       RETURNING player_id
     ),
     ins_audit AS (
       INSERT INTO player_consents_audit (
         consent_id, player_id, player_name, team_id, event_type,
         is_minor, is_minor_14_to_17, signer_type, signer_name, signer_dni, signer_relationship,
         signer_email, signer_phone, consent_image,
         consent_social_media, consent_streaming, consent_press, consent_travel,
         signature_method, signature_data, legal_version, signed_at_iso,
         document_hash, ip_address, user_agent,
         hash_version, key_id, otp_challenge_id, otp_verified_at
       )
       SELECT
         ins_c.id, ins_c.player_id, ins_c.player_name, ins_c.team_id, 'SIGNED',
         ins_c.is_minor, ins_c.is_minor_14_to_17, ins_c.signer_type, ins_c.signer_name, $21::text, ins_c.signer_relationship,
         $22::text, $23::text, $12::boolean,
         ins_c.consent_social_media, ins_c.consent_streaming, ins_c.consent_press, ins_c.consent_travel,
         ins_c.signature_method, $24::text, ins_c.legal_version, ins_c.signed_at_iso,
         ins_c.document_hash, $25::text, ins_c.user_agent,
         ins_c.hash_version, ins_c.key_id, ins_c.otp_challenge_id, ins_c.otp_verified_at
       FROM ins_c
       RETURNING audit_id
     )
     SELECT (SELECT id::text FROM ins_c LIMIT 1) AS consent_id;`,
    [
      targetPlayerId,
      params.playerName,
      params.authoritativeTeamId,
      params.isMinor,
      params.isMinor14To17,
      params.signerType,
      params.signerName,
      encDni,
      params.signerRelationship,
      encEmail,
      encPhone,
      params.consentImage,
      params.consentTravel,
      params.signedAtIso,
      encSig,
      params.legalVersion,
      params.documentHash,
      encIp,
      params.userAgent,
      wrappedDek,
      auditDni,
      auditEmail,
      auditPhone,
      auditSig,
      auditIp,
      params.challengeId,
      params.verifiedAtIso,
      params.preferredConsentId || null,
    ]
  );

  const consentId = cteRows[0]?.consent_id || '';
  if (!consentId) {
    throw new IntranetValidationError(
      'No se pudo registrar la autorización RGPD. Inténtalo de nuevo.',
      409
    );
  }
  return consentId;
}

export async function GET(req: NextRequest) {
  try {
    await ensureIntranetSeeded();

    if (req.nextUrl.searchParams.has('token')) {
      const clientIp = getClientIp(req);
      const rl = await checkNeonRateLimit(`reg-public-get:${clientIp}`, 45, 300, 300);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiadas consultas de inscripción. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
          },
          {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfterSec) },
          }
        );
      }

      const token = req.nextUrl.searchParams.get('token')?.trim() || '';
      const link = await fetchActiveLinkByToken(token);
      if (!link) {
        return NextResponse.json(
          { success: false, error: 'Enlace de inscripción no válido o desactivado.' },
          { status: 404 }
        );
      }

      const [planRows, availableCatRows] = await Promise.all([
        queryNeon<{
          plan_id: string;
          product_id: string;
          product_name: string;
          product_type: string;
          plan_name: string;
          periodicity: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
          total_amount: string;
          installments_count: number;
          due_day: number;
          description: string | null;
        }>(
          `SELECT
             pp.id::text AS plan_id,
             p.id::text AS product_id,
             p.name AS product_name,
             p.product_type,
             pp.name AS plan_name,
             pp.periodicity,
             pp.total_amount::text AS total_amount,
             pp.installments_count,
             pp.due_day,
             p.description
           FROM intranet_price_plans pp
           INNER JOIN intranet_products p ON p.id = pp.product_id
           WHERE p.season_id = $1
             AND p.is_active = true
             AND pp.is_active = true
           ORDER BY pp.periodicity, pp.total_amount ASC;`,
          [link.season_id]
        ),
        queryNeon<{
          id: string;
          token: string;
          category_code: string;
          category_label: string;
          default_team_season_id: string | null;
        }>(
          `SELECT id::text AS id, token, category_code, category_label, default_team_season_id
           FROM intranet_category_registration_links
           WHERE season_id = $1
             AND is_active = true
             AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY category_label ASC;`,
          [link.season_id]
        ),
      ]);

      return NextResponse.json({
        success: true,
        link: {
          id: link.id,
          token: link.token,
          categoryCode: link.category_code,
          categoryLabel: link.category_label,
          defaultTeamSeasonId: link.default_team_season_id,
          seasonId: link.season_id,
        },
        availableCategories: availableCatRows.map((c) => ({
          id: c.id,
          token: c.token,
          categoryCode: c.category_code,
          categoryLabel: c.category_label,
          defaultTeamSeasonId: c.default_team_season_id,
        })),
        paymentPlans: planRows.map((p) => ({
          planId: p.plan_id,
          productId: p.product_id,
          productName: p.product_name,
          productType: p.product_type,
          planName: p.plan_name,
          periodicity: p.periodicity,
          totalAmount: Number(p.total_amount),
          installmentsCount: p.installments_count,
          dueDay: p.due_day,
          description: p.description,
        })),
      });
    }

    // Modo administrativo
    const ctx = await requireIntranetSession();
    const adminScope = getRegistrationAdminScope(ctx);
    if (!adminScope.allowed) {
      assertCan(ctx, 'registration.approve');
    }
    await ensureRegistrationSchema();

    const [linkRows, requestRows, assignedTeamRows, teamRows, planRows, discountRows, siblingAthleteRows] =
      await Promise.all([
        queryNeon<{
          id: string;
          token: string;
          category_code: string;
          category_label: string;
          default_team_season_id: string | null;
          default_team_name: string | null;
          season_id: string;
          is_active: boolean;
          submissions_count: number;
          expires_at: string | null;
          created_at: string;
        }>(
          `SELECT
             l.id::text AS id,
             l.token,
             l.category_code,
             l.category_label,
             l.default_team_season_id,
             ts.name AS default_team_name,
             l.season_id,
             l.is_active,
             l.submissions_count,
             l.expires_at::text AS expires_at,
             l.created_at::text AS created_at
           FROM intranet_category_registration_links l
           LEFT JOIN intranet_team_seasons ts ON ts.id = l.default_team_season_id
           ORDER BY l.season_id DESC, l.category_label ASC;`
        ),
        queryNeon<{
          id: string;
          athlete_id: string;
          user_id: string;
          link_id: string | null;
          default_team_season_id: string | null;
          category_code: string;
          category_label: string;
          selected_product_id: string | null;
          selected_product_name: string | null;
          selected_price_plan_id: string | null;
          selected_plan_name: string | null;
          selected_plan_periodicity: string | null;
          selected_plan_amount: string | null;
          is_minor: boolean;
          guardian_name: string | null;
          contact_email: string;
          contact_phone: string | null;
          consent_image: boolean;
          consent_travel: boolean;
          consent_document_hash: string | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          assigned_team_ids: string[];
          enrollment_id: string | null;
          admin_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          first_name: string | null;
          last_name: string | null;
          birth_year: number | null;
          gender: string | null;
          dni_last5: string | null;
          shirt_size: string | null;
          jersey_number: number | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          athlete_status: string | null;
          consent_id: string | null;
          consent_status: string | null;
          consent_signed_at: string | null;
          guardian_relationship: string | null;
          pending_payload_enc: string | null;
          family_group_id: string | null;
        }>(
          `SELECT
             r.id::text AS id,
             r.athlete_id,
             r.user_id::text AS user_id,
             r.link_id::text AS link_id,
             l.default_team_season_id,
             r.category_code,
             r.category_label,
             r.selected_product_id::text AS selected_product_id,
             p.name AS selected_product_name,
             r.selected_price_plan_id::text AS selected_price_plan_id,
             pp.name AS selected_plan_name,
             pp.periodicity AS selected_plan_periodicity,
             pp.total_amount::text AS selected_plan_amount,
             r.is_minor,
             r.guardian_name,
             r.contact_email,
             r.contact_phone,
             r.consent_image,
             r.consent_travel,
             r.consent_document_hash,
             r.status,
             COALESCE(r.assigned_team_ids, '{}'::text[]) AS assigned_team_ids,
             r.enrollment_id::text AS enrollment_id,
             r.admin_notes,
             r.reviewed_by::text AS reviewed_by,
             r.reviewed_at::text AS reviewed_at,
             r.created_at::text AS created_at,
             a.first_name,
             a.last_name,
             a.birth_year,
             a.gender,
             a.dni_last5,
             a.shirt_size,
             a.jersey_number,
             a.emergency_contact_name,
             a.emergency_contact_phone,
             a.status AS athlete_status,
             pc.id::text AS consent_id,
             pc.status AS consent_status,
             pc.signed_at_iso AS consent_signed_at,
             g.relationship AS guardian_relationship,
             r.pending_payload_enc,
             r.family_group_id::text AS family_group_id
           FROM intranet_registration_requests r
           INNER JOIN intranet_users u ON u.id = r.user_id
           LEFT JOIN intranet_athletes a ON a.id = r.athlete_id
           LEFT JOIN intranet_category_registration_links l ON l.id = r.link_id
           LEFT JOIN intranet_products p ON p.id = r.selected_product_id
           LEFT JOIN intranet_price_plans pp ON pp.id = r.selected_price_plan_id
           LEFT JOIN player_consents pc ON pc.player_id = r.athlete_id
           LEFT JOIN LATERAL (
             SELECT relationship
             FROM intranet_guardianships g2
             WHERE g2.athlete_id = r.athlete_id
             ORDER BY g2.is_primary_payer DESC, g2.created_at ASC
             LIMIT 1
           ) g ON true
           WHERE COALESCE(a.status, 'PENDIENTE_VALIDAR') <> 'SHREDDED'
           ORDER BY CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END, r.created_at DESC;`
        ),
        queryNeon<{
          athlete_id: string;
          team_season_id: string;
          team_name: string;
          is_primary: boolean;
          dorsal: number | null;
          position: string | null;
        }>(
          `SELECT
             at2.athlete_id,
             at2.team_season_id,
             ts.name AS team_name,
             at2.is_primary,
             at2.dorsal,
             at2.position
           FROM intranet_athlete_teams at2
           INNER JOIN intranet_team_seasons ts ON ts.id = at2.team_season_id
           WHERE at2.athlete_id IN (SELECT athlete_id FROM intranet_registration_requests)
           ORDER BY at2.is_primary DESC, ts.sort_order ASC;`
        ),
        queryNeon<{
          id: string;
          category_id: string;
          name: string;
          division: string;
          association: string;
          gender: string;
          sort_order: number;
        }>(
          `SELECT id, category_id, name, division, association, gender, sort_order
           FROM intranet_team_seasons
           WHERE season_id = $1 AND is_active = true
           ORDER BY sort_order ASC, name ASC;`,
          [CURRENT_SEASON_SEED.id]
        ),
        queryNeon<{
          plan_id: string;
          product_id: string;
          product_name: string;
          product_type: string;
          plan_name: string;
          periodicity: string;
          total_amount: string;
          installments_count: number;
          due_day: number;
          description: string | null;
        }>(
          `SELECT
             pp.id::text AS plan_id,
             p.id::text AS product_id,
             p.name AS product_name,
             p.product_type,
             pp.name AS plan_name,
             pp.periodicity,
             pp.total_amount::text AS total_amount,
             pp.installments_count,
             pp.due_day,
             p.description
           FROM intranet_price_plans pp
           INNER JOIN intranet_products p ON p.id = pp.product_id
           WHERE p.season_id = $1
             AND p.is_active = true
             AND pp.is_active = true
           ORDER BY pp.periodicity, pp.total_amount ASC;`,
          [CURRENT_SEASON_SEED.id]
        ),
        queryNeon<{
          id: string;
          name: string;
          kind: string;
          value_type: 'PERCENTAGE' | 'FIXED';
          value: string;
          stackable: boolean;
          max_discount_amount: string | null;
          requires_reason: boolean;
        }>(
          `SELECT id::text AS id, name, kind, value_type, value::text AS value,
                  stackable, max_discount_amount::text AS max_discount_amount, requires_reason
           FROM intranet_discount_rules
           WHERE season_id = $1 AND is_active = true
           ORDER BY name ASC;`,
          [CURRENT_SEASON_SEED.id]
        ),
        queryNeon<{
          id: string;
          first_name: string;
          last_name: string;
          birth_year: number | null;
          team_name: string | null;
          guardian_name: string | null;
          guardian_email: string | null;
        }>(
          `SELECT
             a.id,
             a.first_name,
             a.last_name,
             a.birth_year,
             t.team_name,
             g.full_name AS guardian_name,
             COALESCE(g.email, u.email) AS guardian_email
           FROM intranet_athletes a
           LEFT JOIN intranet_users u ON u.id = a.user_id
           LEFT JOIN LATERAL (
             SELECT ts.name AS team_name
             FROM intranet_athlete_teams at2
             INNER JOIN intranet_team_seasons ts ON ts.id = at2.team_season_id
             WHERE at2.athlete_id = a.id
             ORDER BY at2.is_primary DESC, ts.sort_order ASC
             LIMIT 1
           ) t ON true
           LEFT JOIN LATERAL (
             SELECT g2.full_name, g2.email
             FROM intranet_guardianships g2
             WHERE g2.athlete_id = a.id
             ORDER BY g2.is_primary_payer DESC, g2.created_at ASC
             LIMIT 1
           ) g ON true
           WHERE a.status NOT IN ('SHREDDED', 'BAJA')
             AND COALESCE(a.is_demo, false) = false
             AND a.id NOT LIKE 'demo-%'
             AND a.id <> 'p-test-prueba'
           ORDER BY a.last_name ASC, a.first_name ASC;`
        ),
      ]);

    const siblingCandidateMap = new Map<
      string,
      {
        athleteId: string;
        fullName: string;
        birthYear: number | null;
        teamOrCategory: string | null;
        guardianEmail: string | null;
        guardianName: string | null;
        pendingStatus: string | null;
      }
    >();
    for (const sa of siblingAthleteRows) {
      siblingCandidateMap.set(sa.id, {
        athleteId: sa.id,
        fullName: `${sa.first_name} ${sa.last_name}`.trim(),
        birthYear: sa.birth_year,
        teamOrCategory: sa.team_name,
        guardianEmail: sa.guardian_email,
        guardianName: sa.guardian_name,
        pendingStatus: null,
      });
    }

    const assignedTeamsMap = new Map<
      string,
      Array<{
        teamSeasonId: string;
        teamName: string;
        isPrimary: boolean;
        dorsal: number | null;
        position: string | null;
      }>
    >();
    for (const atRow of assignedTeamRows) {
      const list = assignedTeamsMap.get(atRow.athlete_id) || [];
      list.push({
        teamSeasonId: atRow.team_season_id,
        teamName: atRow.team_name,
        isPrimary: atRow.is_primary,
        dorsal: atRow.dorsal,
        position: atRow.position,
      });
      assignedTeamsMap.set(atRow.athlete_id, list);
    }

    const baseUrl = getPublicBaseUrl();
    const scopedLinks = adminScope.isGlobal
      ? linkRows
      : linkRows.filter(
          (l) => l.default_team_season_id && adminScope.teamIds.includes(l.default_team_season_id)
        );

    const scopedRequests = adminScope.isGlobal
      ? requestRows
      : requestRows.filter((r) => {
          const athTeams = assignedTeamsMap.get(r.athlete_id)?.map((t) => t.teamSeasonId) || [];
          return (
            (r.default_team_season_id && adminScope.teamIds.includes(r.default_team_season_id)) ||
            athTeams.some((tid) => adminScope.teamIds.includes(tid)) ||
            r.assigned_team_ids.some((tid) => adminScope.teamIds.includes(tid))
          );
        });

    const scopedTeams = adminScope.isGlobal
      ? teamRows
      : teamRows.filter((t) => adminScope.teamIds.includes(t.id));

    const pendingCount = scopedRequests.filter((r) => r.status === 'PENDING').length;

    return NextResponse.json({
      success: true,
      canApprove: adminScope.canApprove,
      links: scopedLinks.map((l) => ({
        id: l.id,
        token: l.token,
        categoryCode: l.category_code,
        categoryLabel: l.category_label,
        defaultTeamSeasonId: l.default_team_season_id,
        defaultTeamName: l.default_team_name,
        seasonId: l.season_id,
        isActive: l.is_active,
        submissionsCount: l.submissions_count,
        expiresAt: l.expires_at,
        createdAt: l.created_at,
        registrationPath: `/inscripcion?cat=${encodeURIComponent(l.token)}`,
        registrationUrl: `${baseUrl}/inscripcion?cat=${encodeURIComponent(l.token)}`,
      })),
      requests: scopedRequests.map((r) => {
        let staged: Partial<StagedRegistrationPayload> | null = null;
        if (r.status === 'PENDING' && r.pending_payload_enc) {
          const dec = decryptDataStrict(r.pending_payload_enc, `reg_pending:${r.athlete_id}`);
          if (dec.ok && dec.value) {
            try {
              staged = JSON.parse(dec.value) as Partial<StagedRegistrationPayload>;
            } catch {
              staged = null;
            }
          }
        }

        const firstName = staged?.firstName || r.first_name || '';
        const lastName = staged?.lastName || r.last_name || '';
        const fullName = staged?.fullName || `${firstName} ${lastName}`.trim();
        const dniMasked = staged?.playerDni
          ? `***${staged.playerDni.slice(-5)}`
          : r.dni_last5
          ? `***${r.dni_last5}`
          : null;

        return {
          id: r.id,
          athleteId: r.athlete_id,
          userId: r.user_id,
          linkId: r.link_id,
          defaultTeamSeasonId: r.default_team_season_id,
          categoryCode: r.category_code,
          categoryLabel: r.category_label,
          athleteFirstName: firstName,
          athleteLastName: lastName,
          athleteFullName: fullName,
          birthYear: staged?.birthYear ?? r.birth_year,
          gender: staged?.gender || r.gender || 'FEMENINO',
          dniMasked,
          shirtSize: staged?.shirtSize ?? r.shirt_size,
          jerseyNumber: staged?.jerseyNumber ?? r.jersey_number,
          emergencyContactName: staged?.emergencyContactName ?? r.emergency_contact_name,
          emergencyContactPhone: staged?.emergencyContactPhone ?? r.emergency_contact_phone,
          athleteStatus: r.athlete_status || 'PENDIENTE_VALIDAR',
          selectedProductId: r.selected_product_id,
          selectedProductName: r.selected_product_name,
          selectedPricePlanId: r.selected_price_plan_id,
          selectedPlanName: r.selected_plan_name,
          selectedPlanPeriodicity: r.selected_plan_periodicity,
          selectedPlanAmount: r.selected_plan_amount ? Number(r.selected_plan_amount) : null,
          isMinor: typeof staged?.isMinor === 'boolean' ? staged.isMinor : r.is_minor,
          guardianName: staged?.guardianName ?? r.guardian_name,
          guardianRelationship: staged?.guardianRelationship ?? r.guardian_relationship,
          contactEmail: staged?.email || r.contact_email,
          contactPhone: staged?.contactPhoneForConsent || r.contact_phone,
          consentImage:
            typeof staged?.consentImage === 'boolean' ? staged.consentImage : r.consent_image,
          consentTravel:
            typeof staged?.consentTravel === 'boolean' ? staged.consentTravel : r.consent_travel,
          consentDocumentHash: staged?.documentHash || r.consent_document_hash,
          consentId: staged?.consentId || r.consent_id,
          isConsentSigned: Boolean(
            staged?.documentHash ||
              (r.consent_document_hash && r.consent_status !== 'REVOKED') ||
              r.consent_status === 'ACTIVE'
          ),
          consentStatus:
            r.consent_status === 'REVOKED'
              ? 'Revocado'
              : staged?.documentHash ||
                  (r.consent_document_hash && r.consent_status !== 'REVOKED') ||
                  r.consent_status === 'ACTIVE'
                ? 'Firmado'
                : 'No firmado',
          consentSignedAt: staged?.signedAtIso || r.consent_signed_at,
          assignedTeamIds: r.assigned_team_ids,
          athleteTeams: assignedTeamsMap.get(r.athlete_id) || [],
          status: r.status,
          enrollmentId: r.enrollment_id,
          adminNotes: r.admin_notes,
          reviewedBy: r.reviewed_by,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at,
          familyGroupId: r.family_group_id,
        };
      }),
      siblingCandidates: Array.from(siblingCandidateMap.values()).concat(
        requestRows
          .filter((r) => r.status === 'PENDING' && !siblingCandidateMap.has(r.athlete_id))
          .map((r) => ({
            athleteId: r.athlete_id,
            fullName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.athlete_id,
            birthYear: r.birth_year,
            teamOrCategory: r.category_label,
            guardianEmail: r.contact_email,
            guardianName: r.guardian_name,
            pendingStatus: r.status,
          }))
      ),
      teams: scopedTeams.map((t) => ({
        id: t.id,
        categoryId: t.category_id,
        name: t.name,
        division: t.division,
        association: t.association,
        gender: t.gender,
      })),
      paymentPlans: planRows.map((p) => ({
        planId: p.plan_id,
        productId: p.product_id,
        productName: p.product_name,
        productType: p.product_type,
        planName: p.plan_name,
        periodicity: p.periodicity,
        totalAmount: Number(p.total_amount),
        installmentsCount: p.installments_count,
        dueDay: p.due_day,
        description: p.description,
      })),
      discountRules: discountRows.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        valueType: d.value_type,
        value: Number(d.value),
        stackable: d.stackable,
        maxDiscountAmount: d.max_discount_amount ? Number(d.max_discount_amount) : null,
        requiresReason: d.requires_reason,
      })),
      pendingCount,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Registration GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    await ensureRegistrationSchema();
    const clientIp = getClientIp(req);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400 }
      );
    }

    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    // =====================================================================
    // 0. FLUJO PÚBLICO: VALIDAR PASO 1 Y COMPROBAR UNIFICACIÓN EN BBDD
    // =====================================================================
    if (action === 'validate_step1') {
      const rl = await checkNeonRateLimit(`reg-step1:${clientIp}`, 30, 300, 300);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiadas verificaciones seguidas. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
          },
          { status: 429 }
        );
      }

      const multiCheck = await validateMultiOrSingleRegistration(body);
      if (!multiCheck.ok) {
        return NextResponse.json(
          { success: false, error: multiCheck.error },
          { status: multiCheck.status }
        );
      }

      const matchedChildren = multiCheck.items.map((item) => ({
        fullName: item.v.fullName,
        matchedExistingRoster: item.matchResult.kind === 'REUSE',
      }));

      return NextResponse.json({
        success: true,
        matchedExistingRoster: matchedChildren.some((m) => m.matchedExistingRoster),
        matchedChildren,
      });
    }

    // =====================================================================
    // 1. FLUJO PÚBLICO: ENVIAR OTP PARA FIRMA DE AUTO-REGISTRO
    // =====================================================================
    if (action === 'send_otp') {
      const rl = await checkNeonRateLimit(`reg-otp:${clientIp}`, 10, 600, 900);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiadas solicitudes de código OTP. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
          },
          { status: 429 }
        );
      }

      const multiCheck = await validateMultiOrSingleRegistration(body);
      if (!multiCheck.ok) {
        return NextResponse.json(
          { success: false, error: multiCheck.error },
          { status: multiCheck.status }
        );
      }

      const firstItem = multiCheck.items[0].v;
      const incomingPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
      const draftPlayerId = DRAFT_PLAYER_ID_REGEX.test(incomingPlayerId)
        ? incomingPlayerId
        : `reg-${crypto.randomUUID().slice(0, 12)}`;

      const otp = await createEmailOtpChallenge({
        playerId: draftPlayerId,
        email: firstItem.email,
        purpose: 'SIGN',
      });

      const namesSummary =
        multiCheck.items.length > 1
          ? `${multiCheck.items.map((x) => x.v.fullName).join(', ')}`
          : firstItem.fullName;

      const sendRes = await sendConsentOtpEmail({
        toEmail: firstItem.email,
        playerName: namesSummary,
        otpCode: otp.code,
        purpose: 'SIGN',
      });

      return NextResponse.json({
        success: true,
        challengeId: otp.challengeId,
        playerId: draftPlayerId,
        emailSent: sendRes.sent,
        emailError: sendRes.sent ? undefined : sendRes.error,
        expiresAtIso: otp.expiresAtIso,
      });
    }

    // =====================================================================
    // 2. FLUJO PÚBLICO: COMPLETAR INSCRIPCIÓN, FIRMA Y SOLICITUD (1 O VARIOS HIJOS)
    // =====================================================================
    if (action === 'complete_registration') {
      const rl = await checkNeonRateLimit(`reg-complete:${clientIp}`, 10, 600, 900);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Demasiados intentos de registro. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
          },
          { status: 429 }
        );
      }

      const multiCheck = await validateMultiOrSingleRegistration(body, { requireConsents: true });
      if (!multiCheck.ok) {
        return NextResponse.json(
          { success: false, error: multiCheck.error },
          { status: multiCheck.status }
        );
      }

      const anyMinor = multiCheck.items.some((x) => x.v.isMinor);
      const anyMinor14To17 = multiCheck.items.some((x) => x.v.isMinor14To17);

      if (body.policySummaryAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes confirmar la lectura de la información básica de protección de datos (Art. 13 RGPD).',
          },
          { status: 400 }
        );
      }
      if (body.conductCodeAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes aceptar el Código de Conducta y Protección al Menor del club.',
          },
          { status: 400 }
        );
      }
      if (anyMinor && body.patriaPotestadAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Para menores de edad es obligatorio confirmar la declaración responsable de patria potestad o tutela legal.',
          },
          { status: 400 }
        );
      }
      if (anyMinor14To17 && body.minorConsentAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Para deportistas de 14 a 17 años debes confirmar que el/la menor ha sido informado/a y presta su asentimiento (Art. 3.1 LO 1/1982).',
          },
          { status: 400 }
        );
      }

      const sigData = typeof body.signatureData === 'string' ? body.signatureData.trim() : '';
      const sigValidation = validateSignatureDataUrl(sigData);
      if (!sigValidation.valid) {
        return NextResponse.json(
          { success: false, error: sigValidation.error || 'Firma manuscrita no válida.' },
          { status: 400 }
        );
      }

      const draftPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
      const otpCode = typeof body.otpCode === 'string' ? body.otpCode.trim() : '';

      if (!DRAFT_PLAYER_ID_REGEX.test(draftPlayerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Identificador temporal de inscripción no válido. Solicita de nuevo el código OTP.',
          },
          { status: 400 }
        );
      }

      const existingAthCheck = await queryNeon<{ id: string }>(
        `SELECT id FROM intranet_athletes WHERE id = $1 LIMIT 1;`,
        [draftPlayerId]
      );
      if (existingAthCheck.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Esta inscripción ya ha sido registrada previamente.',
          },
          { status: 409 }
        );
      }

      const lead = multiCheck.items[0].v;
      const otpCheck = await verifyEmailOtpChallenge({
        challengeId,
        playerId: draftPlayerId,
        email: lead.email,
        code: otpCode,
        purpose: 'SIGN',
      });
      if (!otpCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: otpCheck.error || 'El código OTP introducido no es válido o ha caducado.',
          },
          { status: 400 }
        );
      }

      const verifiedAtIso = otpCheck.verifiedAtIso || new Date().toISOString();

      // 1. Crear o reutilizar una única cuenta de acceso (TUTOR o JUGADOR)
      const userName = lead.isMinor ? lead.guardianName! : lead.fullName;
      const userPhone = lead.isMinor ? lead.guardianPhone : lead.emergencyContactPhone;
      const assignedRoleCode: RoleCode = lead.isMinor || multiCheck.isMultiChild ? 'TUTOR' : 'JUGADOR';

      let userId = lead.reusableExistingUserId;
      if (!userId) {
        const passHash = hashIntranetPassword(lead.password);
        const insertedUser = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_users (email, name, phone, password_hash, email_verified, status)
           VALUES ($1, $2, $3, $4, true, 'ACTIVE')
           RETURNING id::text AS id;`,
          [lead.email, userName, userPhone, passHash]
        );
        userId = insertedUser[0].id;
      } else {
        await queryNeon(
          `UPDATE intranet_users
           SET email_verified = true,
               phone = COALESCE(NULLIF(phone, ''), $2),
               updated_at = NOW()
           WHERE id = $1::uuid;`,
          [userId, userPhone]
        );
      }

      await queryNeon(
        `INSERT INTO intranet_user_roles (user_id, role_code, team_season_id)
         SELECT $1::uuid, $2, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM intranet_user_roles
           WHERE user_id = $1::uuid AND role_code = $2 AND team_season_id IS NULL AND valid_to IS NULL
         );`,
        [userId, assignedRoleCode]
      );

      // Resolver o crear familyGroupId para solicitudes con varios hijos (o tutor que añade hijo con pendiente previo)
      let familyGroupId: string | null = null;
      const priorPendingRows = await queryNeon<{ id: string; family_group_id: string | null }>(
        `SELECT id::text AS id, family_group_id::text AS family_group_id
         FROM intranet_registration_requests
         WHERE user_id = $1::uuid AND status = 'PENDING';`,
        [userId]
      );
      const existingFamilyId = priorPendingRows.find((r) => Boolean(r.family_group_id))?.family_group_id || null;
      if (existingFamilyId) {
        familyGroupId = existingFamilyId;
      } else if (multiCheck.items.length > 1 || priorPendingRows.length > 0) {
        familyGroupId = crypto.randomUUID();
      }
      if (familyGroupId && priorPendingRows.length > 0) {
        await queryNeon(
          `UPDATE intranet_registration_requests
           SET family_group_id = $2::uuid
           WHERE user_id = $1::uuid AND status = 'PENDING' AND family_group_id IS NULL;`,
          [userId, familyGroupId]
        );
      }

      const signedAtIso = new Date().toISOString();
      const legalVersion = 'v5_2026_junta_anexo05_06';
      const userAgent = stripCrlf(req.headers.get('user-agent') || '').slice(0, 250);

      const createdRequestIds: string[] = [];
      const createdReceipts: Array<{
        consentId: string;
        playerId: string;
        playerName: string;
        teamId: string;
        teamName: string;
        birthYear: number;
        birthDate: string;
        isMinor: boolean;
        isMinor14To17: boolean;
        signerName: string;
        signerDni: string;
        signerRelationship: string;
        signerPhone: string;
        signerEmail: string;
        consentSocialMedia: boolean;
        consentStreaming: boolean;
        consentPress: boolean;
        consentTravel: boolean;
        signatureMethod: 'OTP_EMAIL';
        signatureData: string;
        documentHash: string;
        signedAt: string;
      }> = [];
      const emailItemsMeta: Array<{
        fullName: string;
        categoryLabel: string;
        planSummary: string;
        imgLabel: string;
        travelLabel: string;
        requestId: string;
      }> = [];

      const planIdsToFetch = Array.from(
        new Set(multiCheck.items.map((x) => x.v.selectedPricePlanId).filter(Boolean))
      );
      const planMetaMap = new Map<string, string>();
      if (planIdsToFetch.length > 0) {
        const planMetaRows = await queryNeon<{
          plan_id: string;
          product_name: string;
          plan_name: string;
          total_amount: string;
        }>(
          `SELECT pp.id::text AS plan_id, p.name AS product_name, pp.name AS plan_name, pp.total_amount::text AS total_amount
           FROM intranet_price_plans pp
           INNER JOIN intranet_products p ON p.id = pp.product_id
           WHERE pp.id = ANY($1::uuid[]);`,
          [planIdsToFetch]
        );
        for (const pm of planMetaRows) {
          planMetaMap.set(
            pm.plan_id,
            `${pm.product_name} · ${pm.plan_name} (${Number(pm.total_amount).toFixed(2)} €)`
          );
        }
      }

      for (let idx = 0; idx < multiCheck.items.length; idx++) {
        const item = multiCheck.items[idx];
        const v = item.v;
        const dniBlindIndex = item.dniBlindIndex;
        const matchResult = item.matchResult;
        const isReusedAthlete = matchResult.kind === 'REUSE';
        const childDraftId = idx === 0 ? draftPlayerId : `reg-${crypto.randomUUID().slice(0, 12)}`;
        const targetPlayerId = isReusedAthlete ? matchResult.athleteId : childDraftId;
        const fullNorm = normalizeNameKey(v.fullName);

        const authoritativeTeamId =
          v.link.default_team_season_id ||
          (isReusedAthlete ? matchResult.existingPrimaryTeamId : null) ||
          v.link.category_code;
        const contactPhoneForConsent = v.isMinor ? v.guardianPhone! : v.emergencyContactPhone;
        const cImage = item.consentImage === true;
        const cTravel = item.consentTravel === true;
        const signerType: 'PARENT' | 'SELF_ADULT' = v.isMinor ? 'PARENT' : 'SELF_ADULT';
        const signerName = v.isMinor ? v.guardianName! : v.fullName;
        const signerDni = v.isMinor ? v.guardianDni! : v.playerDni;
        const signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR' = v.isMinor
          ? v.guardianRelationship!
          : 'PROPIO_JUGADOR';
        const signerPhone = contactPhoneForConsent;

        const documentHash = computeVerifiableConsentHash({
          version: 'v3',
          keyId: 'integrity-v3',
          playerId: targetPlayerId,
          playerName: v.fullName,
          teamId: authoritativeTeamId,
          isMinor: v.isMinor,
          isMinor14To17: v.isMinor14To17,
          otpChallengeId: challengeId,
          otpVerifiedAtIso: verifiedAtIso,
          signerType,
          signerName,
          signerDni,
          signerRelationship,
          consentSocialMedia: cImage,
          consentStreaming: cImage,
          consentPress: cImage,
          consentTravel: cTravel,
          signatureMethod: 'OTP_EMAIL',
          legalVersion,
          signedAtIso,
          signatureData: sigData,
        });

        let consentId: string;
        let pendingPayloadEnc: string | null = null;

        if (isReusedAthlete) {
          consentId = crypto.randomUUID();
          const stagedPayload: StagedRegistrationPayload = {
            version: 1,
            athleteId: targetPlayerId,
            userId,
            firstName: v.firstName,
            lastName: v.lastName,
            fullName: v.fullName,
            fullNorm,
            birthDateIso: v.birthDateIso,
            birthYear: v.birthYear,
            isMinor: v.isMinor,
            isMinor14To17: v.isMinor14To17,
            gender: v.gender,
            playerDni: v.playerDni,
            dniBlindIndex,
            shirtSize: v.shirtSize,
            jerseyNumber: v.jerseyNumber,
            medicalAllergies: v.medicalAllergies,
            emergencyContactName: v.emergencyContactName,
            emergencyContactPhone: v.emergencyContactPhone,
            guardianName: v.guardianName,
            guardianDni: v.guardianDni,
            guardianRelationship: v.guardianRelationship,
            guardianPhone: v.guardianPhone,
            email: v.email,
            contactPhoneForConsent,
            authoritativeTeamId,
            consentId,
            consentImage: cImage,
            consentTravel: cTravel,
            signerType,
            signerName,
            signerDni,
            signerRelationship,
            signerPhone,
            signatureData: sigData,
            legalVersion,
            documentHash,
            signedAtIso,
            challengeId,
            verifiedAtIso,
            clientIp: clientIp || '',
            userAgent,
          };
          pendingPayloadEnc = encryptData(
            JSON.stringify(stagedPayload),
            `reg_pending:${targetPlayerId}`
          );
        } else {
          const birthDateEnc = encryptData(v.birthDateIso, `${targetPlayerId}:birth_date_enc`);
          const dniEnc = v.playerDni ? encryptData(v.playerDni, `${targetPlayerId}:dni_enc`) : null;
          const dniLast5 = v.playerDni ? v.playerDni.slice(-5) : null;
          const medicalAllergiesEnc = v.medicalAllergies
            ? encryptData(v.medicalAllergies, `${targetPlayerId}:medical_allergies_enc`)
            : null;

          await queryNeon(
            `INSERT INTO intranet_athletes (
               id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
               birth_date_verified, dni_last5, dni_enc, dni_blind_index, gender,
               shirt_size, jersey_number, emergency_contact_name, emergency_contact_phone,
               medical_allergies_enc, user_id, status, is_demo
             ) VALUES (
               $1, $2, $3, $4, $5, $6,
               true, $7, $8, $9, $10,
               $11, $12, $13, $14,
               $15, $16::uuid, 'PENDIENTE_VALIDAR', false
             )
             ON CONFLICT (id) DO UPDATE SET
               first_name = EXCLUDED.first_name,
               last_name = EXCLUDED.last_name,
               full_name_normalized = EXCLUDED.full_name_normalized,
               birth_year = EXCLUDED.birth_year,
               birth_date_enc = EXCLUDED.birth_date_enc,
               birth_date_verified = true,
               dni_last5 = COALESCE(EXCLUDED.dni_last5, intranet_athletes.dni_last5),
               dni_enc = COALESCE(EXCLUDED.dni_enc, intranet_athletes.dni_enc),
               dni_blind_index = COALESCE(EXCLUDED.dni_blind_index, intranet_athletes.dni_blind_index),
               gender = EXCLUDED.gender,
               shirt_size = COALESCE(EXCLUDED.shirt_size, intranet_athletes.shirt_size),
               jersey_number = COALESCE(EXCLUDED.jersey_number, intranet_athletes.jersey_number),
               emergency_contact_name = EXCLUDED.emergency_contact_name,
               emergency_contact_phone = EXCLUDED.emergency_contact_phone,
               medical_allergies_enc = COALESCE(EXCLUDED.medical_allergies_enc, intranet_athletes.medical_allergies_enc),
               user_id = COALESCE(EXCLUDED.user_id, intranet_athletes.user_id),
               status = 'PENDIENTE_VALIDAR',
               is_demo = false,
               updated_at = NOW();`,
            [
              targetPlayerId,
              v.firstName,
              v.lastName,
              fullNorm,
              v.birthYear,
              birthDateEnc,
              dniLast5,
              dniEnc,
              dniBlindIndex,
              v.gender,
              v.shirtSize,
              v.jerseyNumber,
              v.emergencyContactName,
              v.emergencyContactPhone,
              medicalAllergiesEnc,
              v.isMinor ? null : userId,
            ]
          );

          const censusBirthEnc = encryptData(v.birthDateIso, `${targetPlayerId}:birth_date_encrypted`);
          const censusDniEnc = v.playerDni
            ? encryptData(v.playerDni, `${targetPlayerId}:dni_encrypted`)
            : null;
          const censusLast5 = v.playerDni
            ? v.playerDni.slice(-5)
            : v.isMinor && v.guardianDni
              ? v.guardianDni.slice(-5)
              : null;
          const censusParentDniEnc =
            v.isMinor && v.guardianDni
              ? encryptData(v.guardianDni, `${targetPlayerId}:parent_dni`)
              : null;
          const censusEmailEnc = encryptData(v.email, `${targetPlayerId}:contact_email`);
          const censusPhoneEnc = encryptData(contactPhoneForConsent, `${targetPlayerId}:contact_phone`);

          await queryNeon(
            `INSERT INTO player_census (
               player_id, player_name, team_id, birth_year, birth_date_encrypted,
               birth_date_verified, dni_last5, dni_encrypted, dni_blind_index,
               parent_name, parent_dni, parent_relationship, contact_phone, contact_email, is_demo
             ) VALUES (
               $1, $2, $3, $4, $5,
               true, $6, $7, $8,
               $9, $10, $11, $12, $13, false
             )
             ON CONFLICT (player_id) DO UPDATE SET
               player_name = EXCLUDED.player_name,
               team_id = EXCLUDED.team_id,
               birth_year = EXCLUDED.birth_year,
               birth_date_encrypted = EXCLUDED.birth_date_encrypted,
               birth_date_verified = true,
               dni_last5 = COALESCE(EXCLUDED.dni_last5, player_census.dni_last5),
               dni_encrypted = COALESCE(EXCLUDED.dni_encrypted, player_census.dni_encrypted),
               dni_blind_index = COALESCE(EXCLUDED.dni_blind_index, player_census.dni_blind_index),
               parent_name = COALESCE(EXCLUDED.parent_name, player_census.parent_name),
               parent_dni = COALESCE(EXCLUDED.parent_dni, player_census.parent_dni),
               parent_relationship = COALESCE(EXCLUDED.parent_relationship, player_census.parent_relationship),
               contact_phone = EXCLUDED.contact_phone,
               contact_email = EXCLUDED.contact_email,
               updated_at = NOW();`,
            [
              targetPlayerId,
              v.fullName,
              authoritativeTeamId,
              v.birthYear,
              censusBirthEnc,
              censusLast5,
              censusDniEnc,
              dniBlindIndex,
              v.isMinor ? v.guardianName : null,
              censusParentDniEnc,
              v.isMinor ? v.guardianRelationship : 'PROPIO_JUGADOR',
              censusPhoneEnc,
              censusEmailEnc,
            ]
          );

          if (v.isMinor && v.guardianName && v.guardianDni && v.guardianRelationship) {
            const guardianDniEnc = encryptData(v.guardianDni, `${targetPlayerId}:guardian_dni`);
            const guardianDniBlind = generateBlindIndex(v.guardianDni);
            const existingGuardianship = await queryNeon<{ id: string }>(
              `SELECT id::text AS id
               FROM intranet_guardianships
               WHERE athlete_id = $1
                 AND (guardian_user_id IS NULL OR guardian_user_id = $2::uuid)
               ORDER BY is_primary_payer DESC, created_at ASC
               LIMIT 1;`,
              [targetPlayerId, userId]
            );
            if (existingGuardianship[0]) {
              await queryNeon(
                `UPDATE intranet_guardianships
                 SET guardian_user_id = $2::uuid,
                     full_name = $3,
                     dni_enc = $4,
                     dni_blind_index = $5,
                     relationship = $6,
                     email = $7,
                     phone = $8,
                     is_primary_payer = true
                 WHERE id = $1::uuid;`,
                [
                  existingGuardianship[0].id,
                  userId,
                  v.guardianName,
                  guardianDniEnc,
                  guardianDniBlind,
                  v.guardianRelationship,
                  v.email,
                  v.guardianPhone,
                ]
              );
            } else {
              await queryNeon(
                `INSERT INTO intranet_guardianships (
                   athlete_id, guardian_user_id, full_name, dni_enc, dni_blind_index,
                   relationship, email, phone, is_primary_payer
                 ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, true);`,
                [
                  targetPlayerId,
                  userId,
                  v.guardianName,
                  guardianDniEnc,
                  guardianDniBlind,
                  v.guardianRelationship,
                  v.email,
                  v.guardianPhone,
                ]
              );
            }
          }

          consentId = await persistSignedConsentV3({
            targetPlayerId,
            playerName: v.fullName,
            authoritativeTeamId,
            isMinor: v.isMinor,
            isMinor14To17: v.isMinor14To17,
            signerType,
            signerName,
            signerDni,
            signerRelationship,
            signerEmail: v.email,
            signerPhone,
            consentImage: cImage,
            consentTravel: cTravel,
            signedAtIso,
            legalVersion,
            documentHash,
            signatureData: sigData,
            clientIp,
            userAgent,
            challengeId,
            verifiedAtIso,
            archivePriorActive: false,
          });
        }

        const reqInsertRows = await queryNeon<{ id: string }>(
          `INSERT INTO intranet_registration_requests (
             athlete_id, user_id, link_id, category_code, category_label,
             selected_product_id, selected_price_plan_id, is_minor, guardian_name,
             contact_email, contact_phone, consent_image, consent_travel,
             consent_document_hash, status, pending_payload_enc, family_group_id
           ) VALUES (
             $1, $2::uuid, $3::uuid, $4, $5,
             $6::uuid, $7::uuid, $8, $9,
             $10, $11, $12, $13,
             $14, 'PENDING', $15, $16::uuid
           )
           RETURNING id::text AS id;`,
          [
            targetPlayerId,
            userId,
            v.link.id,
            v.link.category_code,
            v.link.category_label,
            v.selectedProductId,
            v.selectedPricePlanId,
            v.isMinor,
            v.isMinor ? v.guardianName : null,
            v.email,
            signerPhone,
            cImage,
            cTravel,
            documentHash,
            pendingPayloadEnc,
            familyGroupId,
          ]
        );
        const requestId = reqInsertRows[0]?.id || '';
        createdRequestIds.push(requestId);

        await queryNeon(
          `UPDATE intranet_category_registration_links
           SET submissions_count = submissions_count + 1
           WHERE id = $1::uuid;`,
          [v.link.id]
        );

        await recordAuditLog({
          actorUserId: userId,
          actorEmail: v.email,
          action: 'SELF_REGISTER_ATHLETE',
          module: 'Inscripciones',
          targetType: 'REGISTRATION_REQUEST',
          targetId: requestId || targetPlayerId,
          details: {
            athleteId: targetPlayerId,
            familyGroupId,
            reusedExistingAthlete: isReusedAthlete,
            categoryCode: v.link.category_code,
            categoryLabel: v.link.category_label,
            isMinor: v.isMinor,
            consentImage: cImage,
            consentTravel: cTravel,
            selectedProductId: v.selectedProductId,
            selectedPricePlanId: v.selectedPricePlanId,
          },
          ipAddress: clientIp,
        });

        createdReceipts.push({
          consentId,
          playerId: targetPlayerId,
          playerName: v.fullName,
          teamId: authoritativeTeamId,
          teamName: v.link.category_label,
          birthYear: v.birthYear,
          birthDate: v.birthDateIso,
          isMinor: v.isMinor,
          isMinor14To17: v.isMinor14To17,
          signerName,
          signerDni,
          signerRelationship,
          signerPhone,
          signerEmail: v.email,
          consentSocialMedia: cImage,
          consentStreaming: cImage,
          consentPress: cImage,
          consentTravel: cTravel,
          signatureMethod: 'OTP_EMAIL',
          signatureData: sigData,
          documentHash,
          signedAt: signedAtIso,
        });

        emailItemsMeta.push({
          fullName: v.fullName,
          categoryLabel: v.link.category_label,
          planSummary: planMetaMap.get(v.selectedPricePlanId) || 'Según modalidad seleccionada',
          imgLabel: cImage ? 'Autorizo' : 'No autorizo',
          travelLabel: cTravel ? 'Autorizo' : 'No autorizo',
          requestId,
        });
      }

      const baseUrl = getPublicBaseUrl();
      const accessUrl = `${baseUrl}/acceso`;

      let receiptEmailSent = false;
      try {
        const recipientName = (lead.isMinor ? lead.guardianName : lead.fullName) || lead.fullName;
        const isFamily = emailItemsMeta.length > 1;
        const subjectLine = isFamily
          ? `[CDV San Pedro] Solicitud familiar de inscripción recibida (${emailItemsMeta.length} deportistas)`
          : `[CDV San Pedro] Solicitud de inscripción recibida (pendiente de revisión) · ${emailItemsMeta[0].fullName}`;

        const listText = emailItemsMeta
          .map(
            (m, i) =>
              `${isFamily ? `${i + 1}. ` : ''}${stripCrlf(m.fullName)} · ${m.categoryLabel}\n` +
              `   - Cuota elegida: ${m.planSummary}\n` +
              `   - Imágenes Deportivas: ${m.imgLabel} · Desplazamientos: ${m.travelLabel}`
          )
          .join('\n');

        const listHtml = emailItemsMeta
          .map(
            (m) => `
              <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 14px; margin: 10px 0; font-size: 13px;">
                <div style="font-weight: 700; color: #18181b;">${escapeHtml(m.fullName)} · ${escapeHtml(m.categoryLabel)}</div>
                <div style="margin-top: 4px;"><strong>Cuota elegida:</strong> ${escapeHtml(m.planSummary)}</div>
                <div style="margin-top: 4px;"><strong>Imágenes Deportivas:</strong> ${escapeHtml(m.imgLabel)} · <strong>Desplazamientos:</strong> ${escapeHtml(m.travelLabel)}</div>
                ${m.requestId ? `<div style="margin-top: 4px; color: #52525b;"><strong>Referencia:</strong> <code>${escapeHtml(m.requestId)}</code></div>` : ''}
              </div>
            `
          )
          .join('');

        const submissionMail = await sendSmtpMail({
          to: lead.email,
          subject: subjectLine,
          text: [
            `${CLUB_INFO.name} · Acuse de Recibo de Inscripción`,
            ``,
            `Hola ${stripCrlf(recipientName)},`,
            isFamily
              ? `Hemos recibido correctamente tu solicitud familiar con ${emailItemsMeta.length} deportistas y su firma electrónica RGPD:`
              : `Hemos recibido correctamente la solicitud de inscripción de ${stripCrlf(emailItemsMeta[0].fullName)} y tu firma electrónica RGPD.`,
            ``,
            listText,
            ``,
            `Estado actual: PENDIENTE DE REVISIÓN POR EL CLUB.`,
            `Ya puedes consultar el estado de ${isFamily ? 'todos los hijos/as' : 'tu solicitud'} iniciando sesión con tu cuenta en ${accessUrl} (/mi-club).`,
            `En cuanto Secretaría tome una decisión sobre cada ficha, recibirás un correo confirmando el alta (con su resguardo oficial PDF) o, si hubiera algún dato a corregir, indicándote el motivo para subsanarlo.`,
          ].join('\n'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
              <div style="background: #18181b; padding: 18px 24px; color: #ffffff; border-bottom: 4px solid #d90429;">
                <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85;">${escapeHtml(CLUB_INFO.name)}</div>
                <h2 style="margin: 4px 0 0 0; font-size: 20px;">${isFamily ? `Solicitud Familiar Recibida (${emailItemsMeta.length} deportistas)` : 'Solicitud de Inscripción Recibida'}</h2>
              </div>
              <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
                <p>Hola <strong>${escapeHtml(recipientName)}</strong>,</p>
                <p>Confirmamos que hemos recibido correctamente ${isFamily ? 'las solicitudes de inscripción agrupadas bajo tu cuenta familiar' : `la solicitud de inscripción de <strong>${escapeHtml(emailItemsMeta[0].fullName)}</strong>`} junto con la verificación OTP y las autorizaciones RGPD:</p>
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 14px 0; color: #92400e;">
                  <strong>Estado actual:</strong> Pendiente de revisión y validación por el personal del club. Puedes consultar el seguimiento en cualquier momento entrando en <a href="${escapeHtml(accessUrl)}" style="color: #92400e; font-weight: bold;">Mi Club (/acceso)</a>.
                </div>
                ${listHtml}
                <p>El equipo del club revisará cada deportista individualmente y recibirás confirmación por correo al aprobar o si es necesario subsanar algún dato.</p>
                <p style="font-size: 12px; color: #52525b; margin-top: 16px;">
                  Secretaría · <a href="mailto:${escapeHtml(CLUB_INFO.contactEmail)}" style="color: #d90429;">${escapeHtml(CLUB_INFO.contactEmail)}</a>
                </p>
              </div>
            </div>
          `,
        });
        receiptEmailSent = submissionMail.sent;
      } catch {
        // No bloquear el alta si SMTP falla puntualmente
      }

      return NextResponse.json({
        success: true,
        familyGroupId,
        requestId: createdRequestIds[0] || '',
        requestIds: createdRequestIds,
        receiptEmailSent,
        receipt: createdReceipts[0] || null,
        receipts: createdReceipts,
      });
    }

    // =====================================================================
    // 3. ACCIONES ADMINISTRATIVAS AUTENTICADAS
    // =====================================================================
    const ctx = await requireIntranetSession();
    const adminScope = getRegistrationAdminScope(ctx);
    if (!adminScope.allowed) {
      assertCan(ctx, 'registration.approve');
    }

    if (action === 'create_link') {
      let categoryCode = typeof body.categoryCode === 'string' ? body.categoryCode.trim() : '';
      let categoryLabel = cleanText(body.categoryLabel, 120);
      const defaultTeamSeasonId =
        typeof body.defaultTeamSeasonId === 'string' && body.defaultTeamSeasonId.trim()
          ? body.defaultTeamSeasonId.trim()
          : null;
      const seasonId =
        typeof body.seasonId === 'string' && body.seasonId.trim()
          ? body.seasonId.trim()
          : CURRENT_SEASON_SEED.id;

      if (defaultTeamSeasonId) {
        if (!adminScope.isGlobal && !adminScope.teamIds.includes(defaultTeamSeasonId)) {
          throw new IntranetForbiddenError(
            'No tienes permiso para crear enlaces de inscripción para este equipo.'
          );
        }
        const teamRows = await queryNeon<{ id: string; category_id: string; name: string }>(
          `SELECT id, category_id, name FROM intranet_team_seasons WHERE id = $1 LIMIT 1;`,
          [defaultTeamSeasonId]
        );
        if (!teamRows[0]) {
          return NextResponse.json(
            { success: false, error: 'El equipo seleccionado no existe.' },
            { status: 400 }
          );
        }
        if (!categoryCode) categoryCode = teamRows[0].category_id;
        if (!categoryLabel) categoryLabel = teamRows[0].name;
      } else if (!adminScope.isGlobal) {
        throw new IntranetForbiddenError(
          'Debes vincular el enlace a uno de tus equipos autorizados.'
        );
      }

      if (!categoryCode) {
        return NextResponse.json(
          { success: false, error: 'Indica la categoría o el equipo para el enlace.' },
          { status: 400 }
        );
      }
      if (!categoryLabel) {
        const catMeta = CLUB_CATEGORIES_META.find((c) => c.id === categoryCode);
        categoryLabel = catMeta?.name || categoryCode;
      }

      let expiresAt: string | null = null;
      if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
        const parsedExp = new Date(body.expiresAt.trim());
        if (Number.isNaN(parsedExp.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Fecha de caducidad del enlace no válida.' },
            { status: 400 }
          );
        }
        expiresAt = parsedExp.toISOString();
      }

      const slugPart =
        categoryCode
          .replace(/^cat-/, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 28) || 'cat';
      const token = `${slugPart}-${crypto.randomBytes(16).toString('base64url')}`;

      const inserted = await queryNeon<{
        id: string;
        token: string;
        category_code: string;
        category_label: string;
        default_team_season_id: string | null;
        season_id: string;
        is_active: boolean;
        submissions_count: number;
        expires_at: string | null;
        created_at: string;
      }>(
        `INSERT INTO intranet_category_registration_links (
           token, category_code, category_label, default_team_season_id, season_id,
           is_active, created_by, expires_at
         ) VALUES ($1, $2, $3, $4, $5, true, $6::uuid, $7::timestamptz)
         RETURNING id::text AS id, token, category_code, category_label, default_team_season_id,
                   season_id, is_active, submissions_count, expires_at::text AS expires_at,
                   created_at::text AS created_at;`,
        [token, categoryCode, categoryLabel, defaultTeamSeasonId, seasonId, ctx.user.id, expiresAt]
      );

      const link = inserted[0];
      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_REGISTRATION_LINK',
        module: 'Inscripciones',
        targetType: 'REGISTRATION_LINK',
        targetId: link.id,
        details: { token: link.token, categoryCode, categoryLabel, defaultTeamSeasonId },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        link: {
          id: link.id,
          token: link.token,
          categoryCode: link.category_code,
          categoryLabel: link.category_label,
          defaultTeamSeasonId: link.default_team_season_id,
          seasonId: link.season_id,
          isActive: link.is_active,
          submissionsCount: link.submissions_count,
          expiresAt: link.expires_at,
          createdAt: link.created_at,
          registrationPath: `/inscripcion?cat=${encodeURIComponent(link.token)}`,
          registrationUrl: `${getPublicBaseUrl()}/inscripcion?cat=${encodeURIComponent(link.token)}`,
        },
      });
    }

    if (action === 'toggle_link') {
      const linkId = typeof body.linkId === 'string' ? body.linkId.trim() : '';
      if (!UUID_REGEX.test(linkId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de enlace no válido.' },
          { status: 400 }
        );
      }

      const existingRows = await queryNeon<{
        id: string;
        default_team_season_id: string | null;
        is_active: boolean;
      }>(
        `SELECT id::text AS id, default_team_season_id, is_active
         FROM intranet_category_registration_links WHERE id = $1::uuid LIMIT 1;`,
        [linkId]
      );
      if (!existingRows[0]) {
        return NextResponse.json({ success: false, error: 'Enlace no encontrado.' }, { status: 404 });
      }
      if (
        !adminScope.isGlobal &&
        (!existingRows[0].default_team_season_id ||
          !adminScope.teamIds.includes(existingRows[0].default_team_season_id))
      ) {
        throw new IntranetForbiddenError('No tienes permiso para modificar este enlace.');
      }

      const nextActive =
        typeof body.isActive === 'boolean' ? body.isActive : !existingRows[0].is_active;

      await queryNeon(
        `UPDATE intranet_category_registration_links SET is_active = $2 WHERE id = $1::uuid;`,
        [linkId, nextActive]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'TOGGLE_REGISTRATION_LINK',
        module: 'Inscripciones',
        targetType: 'REGISTRATION_LINK',
        targetId: linkId,
        details: { isActive: nextActive },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, isActive: nextActive });
    }

    if (action === 'regenerate_link') {
      const linkId = typeof body.linkId === 'string' ? body.linkId.trim() : '';
      if (!UUID_REGEX.test(linkId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de enlace no válido.' },
          { status: 400 }
        );
      }

      const existingRows = await queryNeon<{
        id: string;
        category_code: string;
        default_team_season_id: string | null;
      }>(
        `SELECT id::text AS id, category_code, default_team_season_id
         FROM intranet_category_registration_links WHERE id = $1::uuid LIMIT 1;`,
        [linkId]
      );
      if (!existingRows[0]) {
        return NextResponse.json({ success: false, error: 'Enlace no encontrado.' }, { status: 404 });
      }
      if (
        !adminScope.isGlobal &&
        (!existingRows[0].default_team_season_id ||
          !adminScope.teamIds.includes(existingRows[0].default_team_season_id))
      ) {
        throw new IntranetForbiddenError('No tienes permiso para regenerar este enlace.');
      }

      const slugPart =
        existingRows[0].category_code
          .replace(/^cat-/, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 28) || 'cat';
      const newToken = `${slugPart}-${crypto.randomBytes(16).toString('base64url')}`;

      await queryNeon(
        `UPDATE intranet_category_registration_links
         SET token = $2, is_active = true
         WHERE id = $1::uuid;`,
        [linkId, newToken]
      );

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REGENERATE_REGISTRATION_LINK',
        module: 'Inscripciones',
        targetType: 'REGISTRATION_LINK',
        targetId: linkId,
        details: { newToken },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        token: newToken,
        registrationPath: `/inscripcion?cat=${encodeURIComponent(newToken)}`,
        registrationUrl: `${getPublicBaseUrl()}/inscripcion?cat=${encodeURIComponent(newToken)}`,
      });
    }

    if (action === 'approve_registration') {
      if (!adminScope.canApprove) {
        assertCan(ctx, 'registration.approve');
      }

      const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
      if (!UUID_REGEX.test(requestId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de solicitud no válido.' },
          { status: 400 }
        );
      }

      const rawTeamIds = Array.isArray(body.teamSeasonIds) ? body.teamSeasonIds : [];
      const uniqueTeamIds = Array.from(
        new Set(
          rawTeamIds
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );
      if (uniqueTeamIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Debes asignar al menos un equipo al deportista para aprobar la solicitud.' },
          { status: 400 }
        );
      }

      const discountRuleIds = Array.isArray(body.discountRuleIds)
        ? body.discountRuleIds
            .filter((id): id is string => typeof id === 'string' && UUID_REGEX.test(id.trim()))
            .map((id) => id.trim())
        : undefined;
      const siblingAthleteIds = Array.isArray(body.siblingAthleteIds)
        ? body.siblingAthleteIds
            .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
            .map((id) => id.trim())
        : undefined;
      if (discountRuleIds && discountRuleIds.length > 0) {
        assertCan(ctx, 'discounts.apply');
      }

      const foundTeams = await queryNeon<{ id: string; name: string }>(
        `SELECT id, name FROM intranet_team_seasons WHERE id = ANY($1::text[]) AND is_active = true;`,
        [uniqueTeamIds]
      );
      if (foundTeams.length !== uniqueTeamIds.length) {
        return NextResponse.json(
          { success: false, error: 'Uno o más equipos seleccionados no existen o no están activos.' },
          { status: 400 }
        );
      }

      const hasGlobalApprove =
        ctx.isPresident ||
        getAuthorizedTeamScope(ctx, 'registration.approve').isGlobal ||
        getAuthorizedTeamScope(ctx, 'athlete.edit').isGlobal;
      if (!hasGlobalApprove) {
        for (const tid of uniqueTeamIds) {
          if (
            !can(ctx, 'registration.approve', { teamSeasonId: tid }) &&
            !can(ctx, 'athlete.edit', { teamSeasonId: tid })
          ) {
            assertCan(ctx, 'athlete.edit', { teamSeasonId: tid });
          }
        }
      }

      const reqRows = await queryNeon<{
        id: string;
        athlete_id: string;
        user_id: string;
        status: string;
        is_minor: boolean;
        guardian_name: string | null;
        contact_email: string;
        selected_product_id: string | null;
        selected_price_plan_id: string | null;
        season_id: string | null;
        default_team_season_id: string | null;
        pending_payload_enc: string | null;
        first_name: string | null;
        last_name: string | null;
        athlete_status: string | null;
        athlete_dni_enc: string | null;
        guardian_dni_enc: string | null;
        user_name: string;
      }>(
        `SELECT
           r.id::text AS id,
           r.athlete_id,
           r.user_id::text AS user_id,
           r.status,
           r.is_minor,
           r.guardian_name,
           r.contact_email,
           r.selected_product_id::text AS selected_product_id,
           r.selected_price_plan_id::text AS selected_price_plan_id,
           l.season_id,
           l.default_team_season_id,
           r.pending_payload_enc,
           a.first_name,
           a.last_name,
           a.status AS athlete_status,
           a.dni_enc AS athlete_dni_enc,
           g.dni_enc AS guardian_dni_enc,
           u.name AS user_name
         FROM intranet_registration_requests r
         INNER JOIN intranet_users u ON u.id = r.user_id
         LEFT JOIN intranet_athletes a ON a.id = r.athlete_id
         LEFT JOIN intranet_category_registration_links l ON l.id = r.link_id
         LEFT JOIN LATERAL (
           SELECT dni_enc
           FROM intranet_guardianships g2
           WHERE g2.athlete_id = r.athlete_id
           ORDER BY g2.is_primary_payer DESC, g2.created_at ASC
           LIMIT 1
         ) g ON true
         WHERE r.id = $1::uuid
         LIMIT 1;`,
        [requestId]
      );

      const reqRow = reqRows[0];
      if (!reqRow) {
        return NextResponse.json(
          { success: false, error: 'Solicitud de inscripción no encontrada.' },
          { status: 404 }
        );
      }
      if (!hasGlobalApprove) {
        const canAccessReq = await hasScopedRequestAccess(
          adminScope,
          reqRow.athlete_id,
          reqRow.default_team_season_id
        );
        if (!canAccessReq) {
          throw new IntranetForbiddenError(
            'No tienes permiso para aprobar solicitudes de este equipo o categoría.'
          );
        }
      }
      if (reqRow.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Esta solicitud ya fue revisada anteriormente.' },
          { status: 409 }
        );
      }
      if (reqRow.athlete_status === 'SHREDDED') {
        return NextResponse.json(
          { success: false, error: 'La ficha del deportista consta suprimida (Art. 17 RGPD).' },
          { status: 409 }
        );
      }

      const primaryTeamId =
        typeof body.primaryTeamId === 'string' && uniqueTeamIds.includes(body.primaryTeamId.trim())
          ? body.primaryTeamId.trim()
          : uniqueTeamIds[0];

      let dorsal: number | null = null;
      if (body.dorsal !== undefined && body.dorsal !== null && String(body.dorsal).trim() !== '') {
        const parsedDorsal = Number(body.dorsal);
        if (!Number.isInteger(parsedDorsal) || parsedDorsal < 1 || parsedDorsal > 99) {
          return NextResponse.json(
            { success: false, error: 'El dorsal debe ser un número entero entre 1 y 99.' },
            { status: 400 }
          );
        }
        dorsal = parsedDorsal;
      }
      const adminNotes = cleanText(body.adminNotes, 500) || null;
      const editedFirstRaw = cleanText(body.firstName, 80);
      const editedLastRaw = cleanText(body.lastName, 100);
      const editedShirtSize = cleanText(body.shirtSize, 20) || null;
      const secondaryTeamIds = uniqueTeamIds.filter((tid) => tid !== primaryTeamId);

      // Si existe carga diferida (reutilización de ficha pendiente de aprobación), descifrar antes de mutar
      let staged: StagedRegistrationPayload | null = null;
      if (reqRow.pending_payload_enc) {
        const decStaged = decryptDataStrict(
          reqRow.pending_payload_enc,
          `reg_pending:${reqRow.athlete_id}`
        );
        if (!decStaged.ok || !decStaged.value) {
          throw new IntranetValidationError(
            'No se pudo descifrar la carga pendiente de la solicitud de inscripción.',
            409
          );
        }
        try {
          staged = JSON.parse(decStaged.value) as StagedRegistrationPayload;
        } catch {
          throw new IntranetValidationError(
            'Los datos pendientes de la solicitud de inscripción tienen un formato inválido.',
            409
          );
        }
      }

      const finalFirstName = formatProperPersonName(
        editedFirstRaw || staged?.firstName || reqRow.first_name || 'Deportista'
      );
      const finalLastName = formatProperPersonName(
        editedLastRaw || staged?.lastName || reqRow.last_name || ''
      );
      const finalFullName = `${finalFirstName} ${finalLastName}`.trim();
      const finalFullNorm = normalizeNameKey(finalFullName);

      // Asignación limpia de equipos en intranet_athlete_teams
      await queryNeon(`DELETE FROM intranet_athlete_teams WHERE athlete_id = $1;`, [reqRow.athlete_id]);
      for (const tid of uniqueTeamIds) {
        const isPrimary = tid === primaryTeamId;
        await queryNeon(
          `INSERT INTO intranet_athlete_teams (athlete_id, team_season_id, is_primary, dorsal, position)
           VALUES ($1, $2, $3, $4, NULL);`,
          [reqRow.athlete_id, tid, isPrimary, isPrimary ? dorsal : null]
        );
      }

      if (staged) {
        // Materializar ficha propuesta en intranet_athletes, player_census, tutelas y player_consents
        const birthDateEnc = encryptData(
          staged.birthDateIso,
          `${reqRow.athlete_id}:birth_date_enc`
        );
        const dniEnc = staged.playerDni
          ? encryptData(staged.playerDni, `${reqRow.athlete_id}:dni_enc`)
          : null;
        const dniLast5 = staged.playerDni ? staged.playerDni.slice(-5) : null;
        const medicalAllergiesEnc = staged.medicalAllergies
          ? encryptData(staged.medicalAllergies, `${reqRow.athlete_id}:medical_allergies_enc`)
          : null;
        const finalShirtSize = editedShirtSize || staged.shirtSize;
        const finalJerseyNumber = dorsal ?? staged.jerseyNumber;

        await queryNeon(
          `INSERT INTO intranet_athletes (
             id, first_name, last_name, full_name_normalized, birth_year, birth_date_enc,
             birth_date_verified, dni_last5, dni_enc, dni_blind_index, gender,
             shirt_size, jersey_number, emergency_contact_name, emergency_contact_phone,
             medical_allergies_enc, user_id, status, is_demo, verified_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6,
             true, $7, $8, $9, $10,
             $11, $12, $13, $14,
             $15, $16::uuid, 'VERIFICADO', false, NOW()
           )
           ON CONFLICT (id) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             full_name_normalized = EXCLUDED.full_name_normalized,
             birth_year = EXCLUDED.birth_year,
             birth_date_enc = EXCLUDED.birth_date_enc,
             birth_date_verified = true,
             dni_last5 = COALESCE(EXCLUDED.dni_last5, intranet_athletes.dni_last5),
             dni_enc = COALESCE(EXCLUDED.dni_enc, intranet_athletes.dni_enc),
             dni_blind_index = COALESCE(EXCLUDED.dni_blind_index, intranet_athletes.dni_blind_index),
             gender = EXCLUDED.gender,
             shirt_size = COALESCE(EXCLUDED.shirt_size, intranet_athletes.shirt_size),
             jersey_number = COALESCE(EXCLUDED.jersey_number, intranet_athletes.jersey_number),
             emergency_contact_name = EXCLUDED.emergency_contact_name,
             emergency_contact_phone = EXCLUDED.emergency_contact_phone,
             medical_allergies_enc = COALESCE(EXCLUDED.medical_allergies_enc, intranet_athletes.medical_allergies_enc),
             user_id = COALESCE(EXCLUDED.user_id, intranet_athletes.user_id),
             status = 'VERIFICADO',
             verified_at = COALESCE(intranet_athletes.verified_at, NOW()),
             is_demo = false,
             updated_at = NOW();`,
          [
            reqRow.athlete_id,
            finalFirstName,
            finalLastName,
            finalFullNorm,
            staged.birthYear,
            birthDateEnc,
            dniLast5,
            dniEnc,
            staged.dniBlindIndex,
            staged.gender,
            finalShirtSize,
            finalJerseyNumber,
            staged.emergencyContactName,
            staged.emergencyContactPhone,
            medicalAllergiesEnc,
            staged.isMinor ? null : reqRow.user_id,
          ]
        );

        const censusBirthEnc = encryptData(
          staged.birthDateIso,
          `${reqRow.athlete_id}:birth_date_encrypted`
        );
        const censusDniEnc = staged.playerDni
          ? encryptData(staged.playerDni, `${reqRow.athlete_id}:dni_encrypted`)
          : null;
        const censusLast5 = staged.playerDni
          ? staged.playerDni.slice(-5)
          : staged.isMinor && staged.guardianDni
          ? staged.guardianDni.slice(-5)
          : null;
        const censusParentDniEnc =
          staged.isMinor && staged.guardianDni
            ? encryptData(staged.guardianDni, `${reqRow.athlete_id}:parent_dni`)
            : null;
        const censusEmailEnc = encryptData(staged.email, `${reqRow.athlete_id}:contact_email`);
        const censusPhoneEnc = encryptData(
          staged.contactPhoneForConsent,
          `${reqRow.athlete_id}:contact_phone`
        );

        await queryNeon(
          `INSERT INTO player_census (
             player_id, player_name, team_id, secondary_team_ids, birth_year, birth_date_encrypted,
             birth_date_verified, dni_last5, dni_encrypted, dni_blind_index,
             parent_name, parent_dni, parent_relationship, contact_phone, contact_email, is_demo
           ) VALUES (
             $1, $2, $3, $4::varchar[], $5, $6,
             true, $7, $8, $9,
             $10, $11, $12, $13, $14, false
           )
           ON CONFLICT (player_id) DO UPDATE SET
             player_name = EXCLUDED.player_name,
             team_id = EXCLUDED.team_id,
             secondary_team_ids = EXCLUDED.secondary_team_ids,
             birth_year = EXCLUDED.birth_year,
             birth_date_encrypted = EXCLUDED.birth_date_encrypted,
             birth_date_verified = true,
             dni_last5 = COALESCE(EXCLUDED.dni_last5, player_census.dni_last5),
             dni_encrypted = COALESCE(EXCLUDED.dni_encrypted, player_census.dni_encrypted),
             dni_blind_index = COALESCE(EXCLUDED.dni_blind_index, player_census.dni_blind_index),
             parent_name = COALESCE(EXCLUDED.parent_name, player_census.parent_name),
             parent_dni = COALESCE(EXCLUDED.parent_dni, player_census.parent_dni),
             parent_relationship = COALESCE(EXCLUDED.parent_relationship, player_census.parent_relationship),
             contact_phone = EXCLUDED.contact_phone,
             contact_email = EXCLUDED.contact_email,
             updated_at = NOW();`,
          [
            reqRow.athlete_id,
            finalFullName,
            primaryTeamId,
            secondaryTeamIds,
            staged.birthYear,
            censusBirthEnc,
            censusLast5,
            censusDniEnc,
            staged.dniBlindIndex,
            staged.isMinor ? staged.guardianName : null,
            censusParentDniEnc,
            staged.isMinor ? staged.guardianRelationship : 'PROPIO_JUGADOR',
            censusPhoneEnc,
            censusEmailEnc,
          ]
        );

        if (
          staged.isMinor &&
          staged.guardianName &&
          staged.guardianDni &&
          staged.guardianRelationship
        ) {
          const guardianDniEnc = encryptData(
            staged.guardianDni,
            `${reqRow.athlete_id}:guardian_dni`
          );
          const guardianDniBlind = generateBlindIndex(staged.guardianDni);
          const existingGuardianship = await queryNeon<{ id: string }>(
            `SELECT id::text AS id
             FROM intranet_guardianships
             WHERE athlete_id = $1
               AND (guardian_user_id IS NULL OR guardian_user_id = $2::uuid)
             ORDER BY is_primary_payer DESC, created_at ASC
             LIMIT 1;`,
            [reqRow.athlete_id, reqRow.user_id]
          );
          if (existingGuardianship[0]) {
            await queryNeon(
              `UPDATE intranet_guardianships
               SET guardian_user_id = $2::uuid,
                   full_name = $3,
                   dni_enc = $4,
                   dni_blind_index = $5,
                   relationship = $6,
                   email = $7,
                   phone = $8,
                   is_primary_payer = true
               WHERE id = $1::uuid;`,
              [
                existingGuardianship[0].id,
                reqRow.user_id,
                staged.guardianName,
                guardianDniEnc,
                guardianDniBlind,
                staged.guardianRelationship,
                staged.email,
                staged.guardianPhone,
              ]
            );
          } else {
            await queryNeon(
              `INSERT INTO intranet_guardianships (
                 athlete_id, guardian_user_id, full_name, dni_enc, dni_blind_index,
                 relationship, email, phone, is_primary_payer
               ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, true);`,
              [
                reqRow.athlete_id,
                reqRow.user_id,
                staged.guardianName,
                guardianDniEnc,
                guardianDniBlind,
                staged.guardianRelationship,
                staged.email,
                staged.guardianPhone,
              ]
            );
          }
        }

        const finalConsentId = await persistSignedConsentV3({
          targetPlayerId: reqRow.athlete_id,
          playerName: staged.fullName,
          authoritativeTeamId: staged.authoritativeTeamId,
          isMinor: staged.isMinor,
          isMinor14To17: staged.isMinor14To17,
          signerType: staged.signerType,
          signerName: staged.signerName,
          signerDni: staged.signerDni,
          signerRelationship: staged.signerRelationship,
          signerEmail: staged.email,
          signerPhone: staged.signerPhone,
          consentImage: staged.consentImage,
          consentTravel: staged.consentTravel,
          signedAtIso: staged.signedAtIso,
          legalVersion: staged.legalVersion,
          documentHash: staged.documentHash,
          signatureData: staged.signatureData,
          clientIp: staged.clientIp || null,
          userAgent: staged.userAgent,
          challengeId: staged.challengeId,
          verifiedAtIso: staged.verifiedAtIso,
          archivePriorActive: true,
          preferredConsentId: staged.consentId,
        });

        try {
          const signedAtFormatted = `${new Intl.DateTimeFormat('es-ES', {
            timeZone: 'Europe/Madrid',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(new Date(staged.signedAtIso))} ${formatMadridTime(staged.signedAtIso)}`;

          await sendConsentReceiptEmail({
            toEmail: staged.email,
            playerName: staged.fullName,
            teamName: getClubTeamNameById(staged.authoritativeTeamId),
            birthYear: staged.birthYear,
            birthDate: staged.birthDateIso,
            isMinor: staged.isMinor,
            isMinor14To17: staged.isMinor14To17,
            signerName: staged.signerName,
            signerDni: staged.signerDni,
            signerDniMasked: maskDni(staged.signerDni),
            signerRelationship: staged.signerRelationship,
            signerPhone: staged.signerPhone,
            consentId: finalConsentId,
            documentHash: staged.documentHash,
            signedAtIso: staged.signedAtIso,
            signedAtFormatted,
            signatureMethod: 'OTP_EMAIL',
            signatureMethodLabel: 'Firma Electrónica Simple (OTP Email + Trazo)',
            signatureData: staged.signatureData,
            consentImage: staged.consentImage,
            consentSocialMedia: staged.consentImage,
            consentStreaming: staged.consentImage,
            consentPress: staged.consentImage,
            consentTravel: staged.consentTravel,
          });
        } catch {
          // No bloquear aprobación administrativa si falla SMTP del resguardo
        }
      } else {
        // Activar ficha en intranet_athletes y actualizar censo (SIN tocar player_consents.player_name/team_id por HMAC v3)
        await queryNeon(
          `UPDATE intranet_athletes
           SET first_name = $2,
               last_name = $3,
               full_name_normalized = $4,
               shirt_size = COALESCE($5, shirt_size),
               status = 'VERIFICADO',
               verified_at = COALESCE(verified_at, NOW()),
               jersey_number = COALESCE($6, jersey_number),
               updated_at = NOW()
           WHERE id = $1;`,
          [reqRow.athlete_id, finalFirstName, finalLastName, finalFullNorm, editedShirtSize, dorsal]
        );

        await queryNeon(
          `UPDATE player_census
           SET player_name = $2,
               team_id = $3,
               secondary_team_ids = $4::varchar[],
               updated_at = NOW()
           WHERE player_id = $1;`,
          [reqRow.athlete_id, finalFullName, primaryTeamId, secondaryTeamIds]
        );

        try {
          const consentRows = await queryNeon<{
            id: string;
            player_name: string;
            is_minor: boolean;
            is_minor_14_to_17: boolean;
            signer_name: string;
            signer_dni: string;
            signer_relationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR';
            signer_phone: string | null;
            consent_social_media: boolean;
            consent_streaming: boolean;
            consent_press: boolean;
            consent_travel: boolean;
            signature_data: string;
            document_hash: string;
            signed_at_iso: string;
          }>(
            `SELECT id::text AS id, player_name, is_minor, is_minor_14_to_17,
                    signer_name, signer_dni, signer_relationship, signer_phone,
                    consent_social_media, consent_streaming, consent_press, consent_travel,
                    signature_data, document_hash, signed_at_iso
             FROM player_consents
             WHERE player_id = $1 AND status = 'ACTIVE'
             LIMIT 1;`,
            [reqRow.athlete_id]
          );
          const cr = consentRows[0];
          if (cr) {
            const decDni = decryptDataStrict(cr.signer_dni, `${reqRow.athlete_id}:signer_dni`);
            const decSig = decryptDataStrict(cr.signature_data, `${reqRow.athlete_id}:signature_data`);
            const decPhone = cr.signer_phone
              ? decryptDataStrict(cr.signer_phone, `${reqRow.athlete_id}:signer_phone`)
              : { ok: true, value: '' };
            if (decDni.ok && decSig.ok) {
              const signedAtFormatted = `${new Intl.DateTimeFormat('es-ES', {
                timeZone: 'Europe/Madrid',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date(cr.signed_at_iso))} ${formatMadridTime(cr.signed_at_iso)}`;

              await sendConsentReceiptEmail({
                toEmail: reqRow.contact_email,
                playerName: cr.player_name,
                teamName: getClubTeamNameById(primaryTeamId),
                isMinor: cr.is_minor,
                isMinor14To17: cr.is_minor_14_to_17,
                signerName: cr.signer_name,
                signerDni: decDni.value,
                signerDniMasked: maskDni(decDni.value),
                signerRelationship: cr.signer_relationship,
                signerPhone: decPhone.ok ? decPhone.value : '',
                consentId: cr.id,
                documentHash: cr.document_hash,
                signedAtIso: cr.signed_at_iso,
                signedAtFormatted,
                signatureMethod: 'OTP_EMAIL',
                signatureMethodLabel: 'Firma Electrónica Simple (OTP Email + Trazo)',
                signatureData: decSig.value,
                consentImage: Boolean(cr.consent_social_media || cr.consent_streaming || cr.consent_press),
                consentSocialMedia: cr.consent_social_media,
                consentStreaming: cr.consent_streaming,
                consentPress: cr.consent_press,
                consentTravel: cr.consent_travel,
              });
            }
          }
        } catch {
          // No bloquear aprobación si falla SMTP del resguardo
        }
      }

      const effFirstName = finalFirstName;
      const effLastName = finalLastName;
      const effIsMinor = staged ? staged.isMinor : reqRow.is_minor;
      const effGuardianName = staged ? staged.guardianName : reqRow.guardian_name;
      const effContactEmail = staged ? staged.email : reqRow.contact_email;

      // Resolver modalidad de pago (prevalece SIEMPRE la elegida/modificada por el staff)
      let effPricePlanId =
        typeof body.pricePlanId === 'string' && UUID_REGEX.test(body.pricePlanId.trim())
          ? body.pricePlanId.trim()
          : reqRow.selected_price_plan_id;
      let effProductId: string | null = null;
      if (effPricePlanId) {
        const ppRows = await queryNeon<{ product_id: string }>(
          `SELECT product_id::text AS product_id FROM intranet_price_plans WHERE id = $1::uuid LIMIT 1;`,
          [effPricePlanId]
        );
        effProductId = ppRows[0]?.product_id || null;
      }
      if (!effProductId) {
        effProductId =
          typeof body.productId === 'string' && UUID_REGEX.test(body.productId.trim())
            ? body.productId.trim()
            : reqRow.selected_product_id;
      }

      const seasonId = reqRow.season_id || CURRENT_SEASON_SEED.id;
      let enrollmentId: string | null = null;
      let paymentReferenceCode: string | null = null;
      let confirmedPlanSummary: string | null = null;

      if (effProductId && effPricePlanId) {
        const existingEnrRows = await queryNeon<{
          id: string;
          product_id: string;
          price_plan_id: string;
          payment_reference_code: string;
        }>(
          `SELECT id::text AS id, product_id::text AS product_id, price_plan_id::text AS price_plan_id, payment_reference_code
           FROM intranet_enrollments
           WHERE athlete_id = $1 AND season_id = $2 AND status = 'ACTIVE'
           ORDER BY created_at DESC
           LIMIT 1;`,
          [reqRow.athlete_id, seasonId]
        );

        let shouldCreateEnrollment = true;
        if (existingEnrRows[0]) {
          const ex = existingEnrRows[0];
          const [paidCountRows, chargePaidRows] = await Promise.all([
            queryNeon<{ cnt: number }>(
              `SELECT COUNT(*)::int AS cnt FROM intranet_payments WHERE athlete_id = $1 AND status <> 'VOID';`,
              [reqRow.athlete_id]
            ),
            queryNeon<{ paid_sum: string }>(
              `SELECT COALESCE(SUM(paid_amount), 0)::text AS paid_sum FROM intranet_charges WHERE enrollment_id = $1::uuid;`,
              [ex.id]
            ),
          ]);
          const hasPayments =
            Number(paidCountRows[0]?.cnt || 0) > 0 || Number(chargePaidRows[0]?.paid_sum || 0) > 0;
          const matchesPlanAndDiscounts =
            ex.product_id === effProductId &&
            ex.price_plan_id === effPricePlanId &&
            (discountRuleIds?.length ?? 0) === 0;

          if (matchesPlanAndDiscounts) {
            enrollmentId = ex.id;
            paymentReferenceCode = ex.payment_reference_code;
            shouldCreateEnrollment = false;
          } else if (!hasPayments) {
            await queryNeon(`DELETE FROM intranet_applied_discounts WHERE enrollment_id = $1::uuid;`, [ex.id]);
            await queryNeon(`DELETE FROM intranet_charges WHERE enrollment_id = $1::uuid;`, [ex.id]);
            await queryNeon(`DELETE FROM intranet_enrollments WHERE id = $1::uuid;`, [ex.id]);
          } else {
            throw new IntranetValidationError(
              'Ya existen pagos abonados sobre la matrícula actual; no es posible sustituir la modalidad desde la aprobación.',
              409
            );
          }
        }

        if (shouldCreateEnrollment) {
          const payerName = effIsMinor
            ? effGuardianName || reqRow.user_name
            : finalFullName;

          let payerDniPlain: string | undefined;
          if (staged) {
            payerDniPlain = staged.isMinor
              ? staged.guardianDni || undefined
              : staged.playerDni || undefined;
          } else if (reqRow.is_minor && reqRow.guardian_dni_enc) {
            const dec = decryptDataStrict(
              reqRow.guardian_dni_enc,
              `${reqRow.athlete_id}:guardian_dni`
            );
            if (dec.ok && dec.value) payerDniPlain = dec.value;
          } else if (!reqRow.is_minor && reqRow.athlete_dni_enc) {
            const dec = decryptDataStrict(
              reqRow.athlete_dni_enc,
              `${reqRow.athlete_id}:dni_enc`
            );
            if (dec.ok && dec.value) payerDniPlain = dec.value;
          }

          const startMonthRaw = Number(body.startMonth);
          const startMonth =
            Number.isInteger(startMonthRaw) && startMonthRaw >= 1 && startMonthRaw <= 12
              ? startMonthRaw
              : undefined;

          const enr = await createAthleteEnrollment({
            athleteId: reqRow.athlete_id,
            productId: effProductId,
            pricePlanId: effPricePlanId,
            seasonId,
            payerName,
            payerEmail: effContactEmail,
            payerDni: payerDniPlain,
            payerUserId: reqRow.user_id,
            discountRuleIds,
            siblingAthleteIds,
            startMonth,
            notes: adminNotes || 'Inscripción online aprobada',
            actor: {
              userId: ctx.user.id,
              email: ctx.user.email,
              ipAddress: clientIp,
            },
          });
          enrollmentId = enr.enrollmentId;
          paymentReferenceCode = enr.paymentReferenceCode;
        }

        if (enrollmentId) {
          const [enrMetaRows, discMetaRows] = await Promise.all([
            queryNeon<{
              product_name: string;
              plan_name: string;
              installments_count: number;
              final_total: string;
              disc_total: string;
            }>(
              `SELECT
                 p.name AS product_name,
                 pp.name AS plan_name,
                 pp.installments_count,
                 COALESCE((SELECT SUM(c.final_amount) FROM intranet_charges c WHERE c.enrollment_id = e.id), pp.total_amount)::text AS final_total,
                 COALESCE((SELECT SUM(c.discount_amount) FROM intranet_charges c WHERE c.enrollment_id = e.id), 0)::text AS disc_total
               FROM intranet_enrollments e
               INNER JOIN intranet_products p ON p.id = e.product_id
               INNER JOIN intranet_price_plans pp ON pp.id = e.price_plan_id
               WHERE e.id = $1::uuid
               LIMIT 1;`,
              [enrollmentId]
            ),
            queryNeon<{ label: string; computed_amount: string; reason: string | null }>(
              `SELECT label, computed_amount::text AS computed_amount, reason
               FROM intranet_applied_discounts
               WHERE enrollment_id = $1::uuid
               ORDER BY created_at ASC;`,
              [enrollmentId]
            ),
          ]);
          if (enrMetaRows[0]) {
            const m = enrMetaRows[0];
            const netAmt = Number(m.final_total).toFixed(2);
            const discAmt = Number(m.disc_total);
            const discDetails =
              discMetaRows.length > 0
                ? discMetaRows
                    .map(
                      (d) =>
                        `${d.label}: -${Number(d.computed_amount).toFixed(2)} €${d.reason ? ` (${d.reason})` : ''}`
                    )
                    .join('; ')
                : discAmt > 0
                  ? `desc. aplicado: -${discAmt.toFixed(2)} €`
                  : null;
            confirmedPlanSummary = `${m.product_name} · ${m.plan_name} (${netAmt} € en ${m.installments_count} plazo${m.installments_count === 1 ? '' : 's'}${discDetails ? ` · ${discDetails}` : ''})`;
          }
        }
      }

      await queryNeon(
        `UPDATE intranet_registration_requests
         SET status = 'APPROVED',
             assigned_team_ids = $2::text[],
             enrollment_id = $3::uuid,
             admin_notes = $4,
             reviewed_by = $5::uuid,
             reviewed_at = NOW(),
             pending_payload_enc = NULL,
             selected_product_id = COALESCE($6::uuid, selected_product_id),
             selected_price_plan_id = COALESCE($7::uuid, selected_price_plan_id)
         WHERE id = $1::uuid;`,
        [requestId, uniqueTeamIds, enrollmentId, adminNotes, ctx.user.id, effProductId, effPricePlanId]
      );

      const athleteFullName = finalFullName;
      const teamNameMap = new Map(foundTeams.map((t) => [t.id, t.name]));
      const assignedTeamNames = uniqueTeamIds
        .map((tid) => teamNameMap.get(tid) || getClubTeamNameById(tid))
        .join(', ');
      const primaryTeamNameDisplay = teamNameMap.get(primaryTeamId) || getClubTeamNameById(primaryTeamId);
      const sportDetailsParts: string[] = [];
      if (dorsal !== null) sportDetailsParts.push(`Dorsal #${dorsal}`);
      if (editedShirtSize || staged?.shirtSize) {
        sportDetailsParts.push(`Talla: ${editedShirtSize || staged?.shirtSize}`);
      }
      const sportDetailsText = sportDetailsParts.length > 0 ? sportDetailsParts.join(' · ') : null;
      const baseUrl = getPublicBaseUrl();
      const accessUrl = `${baseUrl}/acceso`;
      const memberPortalUrl = `${baseUrl}/mi-club`;

      let emailSent = false;
      let emailError: string | undefined;
      try {
        if (!isStrictEmail(effContactEmail)) {
          emailError = 'Correo electrónico de contacto no válido.';
        } else {
          const recipientName = effIsMinor
            ? effGuardianName || reqRow.user_name
            : athleteFullName;
          const mailRes = await sendSmtpMail({
            to: effContactEmail,
            subject: `[CDV San Pedro] Inscripción aprobada y acceso activado · ${athleteFullName}`,
            text: [
              `${CLUB_INFO.name} · Confirmación de Alta Deportiva`,
              ``,
              `Hola ${stripCrlf(recipientName)},`,
              `Tu solicitud de inscripción para ${stripCrlf(athleteFullName)} ha sido aprobada y verificada por la administración del club.`,
              ``,
              `Equipo(s) asignado(s): ${assignedTeamNames} (Principal: ${primaryTeamNameDisplay})`,
              ...(sportDetailsText ? [`Datos deportivos confirmados: ${sportDetailsText}`] : []),
              ...(confirmedPlanSummary ? [`Cuota confirmada: ${confirmedPlanSummary}`] : []),
              ...(paymentReferenceCode
                ? [`Código de referencia de cuota: ${paymentReferenceCode}`]
                : []),
              ``,
              `Ya puedes acceder con tu correo y contraseña a través de:`,
              `- Acceso: ${accessUrl}`,
              `- Zona privada (Mi Club): ${memberPortalUrl}`,
              ``,
              `En tu zona privada (/mi-club) podrás consultar:`,
              `  * Equipo asignado y ficha deportiva`,
              `  * Horarios de entrenamientos, pistas y partidos`,
              `  * Registro de asistencia`,
              `  * Pagos, cuotas pendientes y recibos PDF`,
              `  * Autorizaciones RGPD y resguardo oficial`,
              ``,
              `Si necesitas ayuda, escríbenos a ${CLUB_INFO.contactEmail}.`,
            ].join('\n'),
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
                <div style="background: #d90429; padding: 18px 24px; color: #ffffff;">
                  <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)}</div>
                  <h2 style="margin: 4px 0 0 0; font-size: 20px;">¡Inscripción Aprobada y Acceso Activado!</h2>
                </div>
                <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
                  <p>Hola <strong>${escapeHtml(recipientName)}</strong>,</p>
                  <p>Nos complace informarte de que tu solicitud de inscripción para <strong>${escapeHtml(athleteFullName)}</strong> ha sido revisada y aprobada por la administración del club con la siguiente configuración definitiva:</p>
                  <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
                    <div><strong>Equipo(s) asignado(s):</strong> ${escapeHtml(assignedTeamNames)} <span style="color:#52525b;">(Principal: ${escapeHtml(primaryTeamNameDisplay)})</span></div>
                    ${
                      sportDetailsText
                        ? `<div style="margin-top: 6px;"><strong>Datos deportivos:</strong> ${escapeHtml(sportDetailsText)}</div>`
                        : ''
                    }
                    ${
                      confirmedPlanSummary
                        ? `<div style="margin-top: 6px;"><strong>Cuota confirmada:</strong> ${escapeHtml(confirmedPlanSummary)}</div>`
                        : ''
                    }
                    ${
                      paymentReferenceCode
                        ? `<div style="margin-top: 6px;"><strong>Referencia de cuota:</strong> <code>${escapeHtml(paymentReferenceCode)}</code></div>`
                        : ''
                    }
                  </div>
                  <p>Ya puedes iniciar sesión en <strong>/acceso</strong> para entrar directamente en tu zona privada <strong>Mi Club</strong> (<strong>/mi-club</strong>), donde podrás consultar:</p>
                  <ul style="margin: 8px 0 18px 0; padding-left: 20px; color: #27272a;">
                    <li><strong>Equipo:</strong> tu plantilla y datos deportivos asignados.</li>
                    <li><strong>Horarios:</strong> sesiones de entrenamiento semanales, pistas y partidos.</li>
                    <li><strong>Asistencia:</strong> seguimiento de asistencias registradas.</li>
                    <li><strong>Pagos:</strong> estado de tus cuotas, vencimientos y recibos PDF.</li>
                    <li><strong>Autorizaciones:</strong> resguardo oficial RGPD firmado y estado vigente.</li>
                  </ul>
                  <p style="margin: 22px 0; text-align: center;">
                    <a href="${escapeHtml(accessUrl)}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                      Iniciar sesión y entrar a Mi Club
                    </a>
                  </p>
                  <p style="font-size: 12px; color: #52525b;">
                    Enlace de acceso: <a href="${escapeHtml(accessUrl)}" style="color: #d90429;">${escapeHtml(accessUrl)}</a><br/>
                    Zona privada directa tras iniciar sesión: <a href="${escapeHtml(memberPortalUrl)}" style="color: #d90429;">${escapeHtml(memberPortalUrl)}</a>
                  </p>
                </div>
              </div>
            `,
          });
          emailSent = mailRes.sent;
          emailError = mailRes.error;
          if (!mailRes.sent) {
            console.error('[approve_registration] Error enviando correo de aprobación:', mailRes.error);
          }
        }
      } catch (mailErr) {
        console.error('[approve_registration] Excepción enviando correo de aprobación:', mailErr);
        emailError = mailErr instanceof Error ? mailErr.message : 'Error SMTP enviando correo.';
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'APPROVE_REGISTRATION',
        module: 'Inscripciones',
        targetType: 'REGISTRATION_REQUEST',
        targetId: requestId,
        details: {
          athleteId: reqRow.athlete_id,
          athleteName: athleteFullName,
          assignedTeamIds: uniqueTeamIds,
          primaryTeamId,
          enrollmentId,
          dorsal,
          siblingAthleteIds,
          emailSent,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        enrollmentId,
        paymentReferenceCode,
        assignedTeamIds: uniqueTeamIds,
        emailSent,
        emailError,
      });
    }

    if (action === 'reject_registration') {
      if (!adminScope.canApprove) {
        assertCan(ctx, 'registration.approve');
      }

      const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
      if (!UUID_REGEX.test(requestId)) {
        return NextResponse.json(
          { success: false, error: 'Identificador de solicitud no válido.' },
          { status: 400 }
        );
      }

      const reqRows = await queryNeon<{
        id: string;
        athlete_id: string;
        status: string;
        is_minor: boolean;
        guardian_name: string | null;
        contact_email: string;
        category_label: string;
        pending_payload_enc: string | null;
        default_team_season_id: string | null;
        link_token: string | null;
        link_is_active: boolean | null;
        athlete_status: string | null;
        first_name: string | null;
        last_name: string | null;
        user_name: string;
      }>(
        `SELECT
           r.id::text AS id,
           r.athlete_id,
           r.status,
           r.is_minor,
           r.guardian_name,
           r.contact_email,
           r.category_label,
           r.pending_payload_enc,
           l.default_team_season_id,
           l.token AS link_token,
           l.is_active AS link_is_active,
           a.status AS athlete_status,
           a.first_name,
           a.last_name,
           u.name AS user_name
         FROM intranet_registration_requests r
         INNER JOIN intranet_users u ON u.id = r.user_id
         LEFT JOIN intranet_category_registration_links l ON l.id = r.link_id
         LEFT JOIN intranet_athletes a ON a.id = r.athlete_id
         WHERE r.id = $1::uuid
         LIMIT 1;`,
        [requestId]
      );
      if (!reqRows[0]) {
        return NextResponse.json(
          { success: false, error: 'Solicitud de inscripción no encontrada.' },
          { status: 404 }
        );
      }
      if (reqRows[0].status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Esta solicitud ya fue revisada anteriormente.' },
          { status: 409 }
        );
      }

      const hasGlobalApprove =
        ctx.isPresident ||
        getAuthorizedTeamScope(ctx, 'registration.approve').isGlobal ||
        getAuthorizedTeamScope(ctx, 'athlete.edit').isGlobal;
      if (!hasGlobalApprove) {
        const canAccessReq = await hasScopedRequestAccess(
          adminScope,
          reqRows[0].athlete_id,
          reqRows[0].default_team_season_id
        );
        if (!canAccessReq) {
          throw new IntranetForbiddenError('No tienes permiso para rechazar esta solicitud.');
        }
      }

      let stagedRejectMeta: Partial<StagedRegistrationPayload> | null = null;
      if (reqRows[0].pending_payload_enc) {
        const decPending = decryptDataStrict(
          reqRows[0].pending_payload_enc,
          `reg_pending:${reqRows[0].athlete_id}`
        );
        if (decPending.ok && decPending.value) {
          try {
            stagedRejectMeta = JSON.parse(decPending.value) as Partial<StagedRegistrationPayload>;
          } catch {
            stagedRejectMeta = null;
          }
        }
      }

      const rejAthleteName =
        stagedRejectMeta?.fullName ||
        `${reqRows[0].first_name || ''} ${reqRows[0].last_name || ''}`.trim() ||
        reqRows[0].user_name;
      const rejIsMinor = stagedRejectMeta?.isMinor ?? reqRows[0].is_minor;
      const rejGuardianName = stagedRejectMeta?.guardianName || reqRows[0].guardian_name;
      const rejRecipientName = rejIsMinor ? rejGuardianName || reqRows[0].user_name : rejAthleteName;
      const rejContactEmail = stagedRejectMeta?.email || reqRows[0].contact_email;

      const adminNotes = cleanText(body.adminNotes, 500) || null;
      await queryNeon(
        `UPDATE intranet_registration_requests
         SET status = 'REJECTED',
             admin_notes = $2,
             reviewed_by = $3::uuid,
             reviewed_at = NOW(),
             pending_payload_enc = NULL
         WHERE id = $1::uuid;`,
        [requestId, adminNotes, ctx.user.id]
      );

      // Si es una ficha nueva no verificada (!pending_payload_enc), liberar cuenta/consentimiento para permitir nueva inscripción
      if (!reqRows[0].pending_payload_enc && reqRows[0].athlete_status !== 'VERIFICADO') {
        const otherReqs = await queryNeon<{ id: string }>(
          `SELECT id::text AS id
           FROM intranet_registration_requests
           WHERE athlete_id = $1
             AND id <> $2::uuid
             AND status IN ('PENDING', 'APPROVED')
           LIMIT 1;`,
          [reqRows[0].athlete_id, requestId]
        );

        if (otherReqs.length === 0) {
          await queryNeon(
            `UPDATE intranet_athletes
             SET status = 'BAJA',
                 user_id = NULL,
                 updated_at = NOW()
             WHERE id = $1 AND status NOT IN ('VERIFICADO', 'SHREDDED');`,
            [reqRows[0].athlete_id]
          );
          await queryNeon(
            `UPDATE intranet_guardianships
             SET guardian_user_id = NULL
             WHERE athlete_id = $1;`,
            [reqRows[0].athlete_id]
          );

          const keyRows = await queryNeon<{ wrapped_dek: string | null; shredded_at: string | null }>(
            `SELECT wrapped_dek, shredded_at::text AS shredded_at
             FROM player_crypto_keys
             WHERE player_id = $1
             LIMIT 1;`,
            [reqRows[0].athlete_id]
          );
          if (!keyRows[0]?.shredded_at) {
            let subjectDek =
              keyRows[0]?.wrapped_dek
                ? unwrapDek(keyRows[0].wrapped_dek, reqRows[0].athlete_id)
                : null;
            if (!subjectDek) {
              subjectDek = generateDek();
            }
            const wrappedDek = wrapDek(subjectDek, reqRows[0].athlete_id);
            await archivePriorActiveConsentBeforeReSign(
              reqRows[0].athlete_id,
              subjectDek,
              wrappedDek
            );
          }
        }
      } else if (reqRows[0].pending_payload_enc && reqRows[0].athlete_status === 'PENDIENTE_VALIDAR') {
        const otherReqs = await queryNeon<{ id: string }>(
          `SELECT id::text AS id
           FROM intranet_registration_requests
           WHERE athlete_id = $1
             AND id <> $2::uuid
             AND status IN ('PENDING', 'APPROVED')
           LIMIT 1;`,
          [reqRows[0].athlete_id, requestId]
        );
        if (otherReqs.length === 0) {
          await queryNeon(
            `UPDATE intranet_athletes
             SET status = 'IMPORTADO',
                 updated_at = NOW()
             WHERE id = $1
               AND status = 'PENDIENTE_VALIDAR'
               AND user_id IS NULL
               AND NOT EXISTS (
                 SELECT 1 FROM intranet_guardianships g
                 WHERE g.athlete_id = $1 AND g.guardian_user_id IS NOT NULL
               );`,
            [reqRows[0].athlete_id]
          );
        }
      }

      const reasonDisplay =
        adminNotes || 'Es necesario revisar y corregir los datos aportados en la solicitud.';
      const baseUrl = getPublicBaseUrl();
      const retryUrl =
        reqRows[0].link_token && reqRows[0].link_is_active
          ? `${baseUrl}/inscripcion?cat=${encodeURIComponent(reqRows[0].link_token)}`
          : `${baseUrl}/inscripcion`;

      let emailSent = false;
      let emailError: string | undefined;
      try {
        if (!isStrictEmail(rejContactEmail)) {
          emailError = 'Correo electrónico de contacto no válido.';
        } else {
          const mailRes = await sendSmtpMail({
            to: rejContactEmail,
            subject: `[CDV San Pedro] Solicitud de inscripción rechazada · Motivo y subsanación · ${rejAthleteName}`,
            text: [
              `${CLUB_INFO.name} · Resolución de Solicitud de Inscripción`,
              ``,
              `Hola ${stripCrlf(rejRecipientName)},`,
              `La solicitud de inscripción para ${stripCrlf(rejAthleteName)} (${reqRows[0].category_label}) ha sido rechazada tras la revisión administrativa.`,
              ``,
              `MOTIVO INDICADO POR LA ADMINISTRACIÓN DEL CLUB:`,
              `${stripCrlf(reasonDisplay)}`,
              ``,
              `¿ES UN DATO SUBSANABLE? CÓMO CORREGIRLO:`,
              `Tu borrador anterior ha quedado anulado para evitar duplicidades. Si se trata de un error subsanable (por ejemplo DNI incorrecto, fecha de nacimiento, datos del tutor o categoría equivocada), puedes volver a enviar la inscripción inmediatamente utilizando tu mismo correo (${rejContactEmail}) y tu misma contraseña:`,
              `${retryUrl}`,
              ``,
              `Si crees que existe un error o necesitas otro enlace de categoría, escribe a ${CLUB_INFO.contactEmail}.`,
            ].join('\n'),
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden;">
                <div style="background: #9f1239; padding: 18px 24px; color: #ffffff;">
                  <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">${escapeHtml(CLUB_INFO.name)}</div>
                  <h2 style="margin: 4px 0 0 0; font-size: 20px;">Solicitud de Inscripción No Validada</h2>
                </div>
                <div style="padding: 24px; color: #18181b; font-size: 14px; line-height: 1.6;">
                  <p>Hola <strong>${escapeHtml(rejRecipientName)}</strong>,</p>
                  <p>Tras revisar la solicitud de inscripción de <strong>${escapeHtml(rejAthleteName)}</strong> (<em>${escapeHtml(reqRows[0].category_label)}</em>), no ha podido aprobarse en su estado actual.</p>
                  <div style="background: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
                    <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; color: #9f1239; margin-bottom: 4px;">
                      Motivo indicado por la administración del club
                    </div>
                    <div style="color: #881337; font-weight: 600;">${escapeHtml(reasonDisplay)}</div>
                  </div>
                  <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
                    <div style="font-weight: bold; color: #18181b; margin-bottom: 6px;">¿Es un error subsanable? Cómo volver a enviarla</div>
                    <p style="margin: 0; color: #3f3f46;">
                      Hemos liberado esta solicitud para que no genere bloqueos ni duplicados. Si el motivo es subsanable, puedes entrar de nuevo en el formulario y volver a completarlo <strong>usando tu mismo correo (<code>${escapeHtml(rejContactEmail)}</code>) y tu misma contraseña</strong> con los datos corregidos.
                    </p>
                  </div>
                  <p style="margin: 22px 0; text-align: center;">
                    <a href="${escapeHtml(retryUrl)}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                      Volver al formulario y corregir datos
                    </a>
                  </p>
                  <p style="font-size: 12px; color: #52525b;">
                    Enlace directo: <a href="${escapeHtml(retryUrl)}" style="color: #d90429;">${escapeHtml(retryUrl)}</a><br/>
                    Si necesitas asistencia o un enlace de otra categoría, escribe a <a href="mailto:${escapeHtml(CLUB_INFO.contactEmail)}" style="color: #d90429;">${escapeHtml(CLUB_INFO.contactEmail)}</a>.
                  </p>
                </div>
              </div>
            `,
          });
          emailSent = mailRes.sent;
          emailError = mailRes.error;
        }
      } catch (mailErr) {
        emailError = mailErr instanceof Error ? mailErr.message : 'Error SMTP enviando correo de rechazo.';
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'REJECT_REGISTRATION',
        module: 'Inscripciones',
        targetType: 'REGISTRATION_REQUEST',
        targetId: requestId,
        details: { athleteId: reqRows[0].athlete_id, adminNotes, emailSent },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true, emailSent, emailError });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida en el registro de inscripciones.' },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Registration POST');
  }
}
