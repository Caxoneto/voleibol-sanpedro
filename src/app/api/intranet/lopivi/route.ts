import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { IntranetForbiddenError, IntranetValidationError } from '@/lib/intranet/rbac';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { recordAuditLog } from '@/lib/intranet/audit';
import { encryptData, decryptDataStrict } from '@/lib/encryption';
import {
  formatMadridDateString,
  formatMadridTime,
  getCurrentMadridYear,
} from '@/lib/date-utils';
import { getClientIp } from '@/lib/rate-limiter';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import {
  LOPIVI_AUTHORITIES,
  LOPIVI_CHANNELS,
  LOPIVI_IMMEDIATE_MEASURES,
  LOPIVI_LOCATIONS,
  LOPIVI_REPORTER_RELATIONS,
  LOPIVI_SITUATION_TYPES,
  LOPIVI_STATUS_LIST,
  type LopiviChannel,
  type LopiviImmediateRisk,
  type LopiviIncidentStatus,
} from '@/lib/lopivi-content';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

const VALID_CHANNELS = new Set<LopiviChannel>(LOPIVI_CHANNELS.map((c) => c.value));
const VALID_RISKS = new Set<LopiviImmediateRisk>(['SI', 'NO', 'NO_DETERMINADO']);
const VALID_STATUSES = new Set<LopiviIncidentStatus>(LOPIVI_STATUS_LIST.map((s) => s.value));
const VALID_RELATIONS = new Set(LOPIVI_REPORTER_RELATIONS);
const VALID_LOCATIONS = new Set(LOPIVI_LOCATIONS);
const VALID_SITUATION_TYPES = new Set(LOPIVI_SITUATION_TYPES);
const VALID_MEASURES = new Set(LOPIVI_IMMEDIATE_MEASURES);
const VALID_AUTHORITIES = new Set(LOPIVI_AUTHORITIES);

interface LopiviDbRow {
  id: string;
  record_code: string;
  channel: LopiviChannel;
  reporter_relationship: string;
  is_anonymous: boolean;
  keep_identity_reserved: boolean;
  reporter_name_enc: string | null;
  reporter_contact_enc: string | null;
  minor_name_enc: string | null;
  minor_age: string | null;
  minor_category: string | null;
  minor_team: string | null;
  incident_date_text: string | null;
  incident_location: string;
  incident_types: string[];
  immediate_risk: LopiviImmediateRisk;
  description_enc: string;
  measures_taken: string[];
  measures_description_enc: string | null;
  authorities_notified: string[];
  authority_notification_date: string | null;
  authority_recipient_enc: string | null;
  authority_reference_enc: string | null;
  follow_up_date: string | null;
  follow_up_measures_enc: string | null;
  follow_up_evolution_enc: string | null;
  follow_up_actions_enc: string | null;
  closed_date: string | null;
  observations_enc: string | null;
  status: LopiviIncidentStatus;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecryptedLopiviIncident {
  id: string;
  recordCode: string;
  channel: LopiviChannel;
  reporterRelationship: string;
  isAnonymous: boolean;
  keepIdentityReserved: boolean;
  reporterName: string;
  reporterContact: string;
  minorName: string;
  minorAge: string;
  minorCategory: string;
  minorTeam: string;
  incidentDateText: string;
  incidentLocation: string;
  incidentTypes: string[];
  immediateRisk: LopiviImmediateRisk;
  description: string;
  measuresTaken: string[];
  measuresDescription: string;
  authoritiesNotified: string[];
  authorityNotificationDate: string;
  authorityRecipient: string;
  authorityReference: string;
  followUpDate: string;
  followUpMeasures: string;
  followUpEvolution: string;
  followUpActions: string;
  closedDate: string;
  observations: string;
  status: LopiviIncidentStatus;
  createdAt: string;
  updatedAt: string;
  receivedDateText: string;
  receivedTimeText: string;
  receivedAtMadrid: string;
  updatedAtMadrid: string;
  decryptionIntegrityWarning: boolean;
}

function isUuid(val: unknown): val is string {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  );
}

function cleanMultilineText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\0/g, '').replace(/\r\n/g, '\n').trim().slice(0, maxLen);
}

function formatMadridDateEsSlash(dateInput: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(safe);
}

function encryptOptionalField(incidentId: string, field: string, plainText: string): string | null {
  if (!plainText) return null;
  return encryptData(plainText, `lopivi:${incidentId}:${field}`);
}

function decryptLopiviField(
  cipherText: string | null | undefined,
  incidentId: string,
  field: string
): { value: string; integrityFailed: boolean } {
  if (!cipherText || !cipherText.trim()) {
    return { value: '', integrityFailed: false };
  }
  const res = decryptDataStrict(cipherText, `lopivi:${incidentId}:${field}`);
  if (!res.ok) {
    return { value: '', integrityFailed: true };
  }
  return { value: res.value, integrityFailed: false };
}

function mapLopiviRow(row: LopiviDbRow): DecryptedLopiviIncident {
  const f1 = decryptLopiviField(row.reporter_name_enc, row.id, 'reporter_name');
  const f2 = decryptLopiviField(row.reporter_contact_enc, row.id, 'reporter_contact');
  const f3 = decryptLopiviField(row.minor_name_enc, row.id, 'minor_name');
  const f4 = decryptLopiviField(row.description_enc, row.id, 'description');
  const f5 = decryptLopiviField(row.measures_description_enc, row.id, 'measures_description');
  const f6 = decryptLopiviField(row.authority_recipient_enc, row.id, 'authority_recipient');
  const f7 = decryptLopiviField(row.authority_reference_enc, row.id, 'authority_reference');
  const f8 = decryptLopiviField(row.follow_up_measures_enc, row.id, 'follow_up_measures');
  const f9 = decryptLopiviField(row.follow_up_evolution_enc, row.id, 'follow_up_evolution');
  const f10 = decryptLopiviField(row.follow_up_actions_enc, row.id, 'follow_up_actions');
  const f11 = decryptLopiviField(row.observations_enc, row.id, 'observations');

  const decryptionIntegrityWarning = [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11].some(
    (item) => item.integrityFailed
  );

  const receivedDateText = formatMadridDateEsSlash(row.created_at);
  const receivedTimeText = formatMadridTime(row.created_at);
  const receivedAtMadrid = `${receivedDateText} · ${receivedTimeText}`;
  const updatedAtMadrid = `${formatMadridDateEsSlash(row.updated_at)} · ${formatMadridTime(
    row.updated_at
  )}`;

  return {
    id: row.id,
    recordCode: row.record_code,
    channel: row.channel,
    reporterRelationship: row.reporter_relationship,
    isAnonymous: Boolean(row.is_anonymous),
    keepIdentityReserved: Boolean(row.keep_identity_reserved),
    reporterName: f1.value,
    reporterContact: f2.value,
    minorName: f3.value,
    minorAge: row.minor_age || '',
    minorCategory: row.minor_category || '',
    minorTeam: row.minor_team || '',
    incidentDateText: row.incident_date_text || '',
    incidentLocation: row.incident_location,
    incidentTypes: Array.isArray(row.incident_types) ? row.incident_types : [],
    immediateRisk: row.immediate_risk,
    description: f4.integrityFailed
      ? '[Advertencia: fallo de verificación de integridad criptográfica al descifrar]'
      : f4.value,
    measuresTaken: Array.isArray(row.measures_taken) ? row.measures_taken : [],
    measuresDescription: f5.value,
    authoritiesNotified: Array.isArray(row.authorities_notified) ? row.authorities_notified : [],
    authorityNotificationDate: row.authority_notification_date || '',
    authorityRecipient: f6.value,
    authorityReference: f7.value,
    followUpDate: row.follow_up_date || '',
    followUpMeasures: f8.value,
    followUpEvolution: f9.value,
    followUpActions: f10.value,
    closedDate: row.closed_date || '',
    observations: f11.value,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    receivedDateText,
    receivedTimeText,
    receivedAtMadrid,
    updatedAtMadrid,
    decryptionIntegrityWarning,
  };
}

function sanitizeStringArrayWithCustomPrefix(
  rawList: unknown,
  allowedExact: Set<string>,
  customPrefix?: string
): string[] {
  if (!Array.isArray(rawList)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of rawList) {
    const clean = stripCrlf(item).slice(0, 180);
    if (!clean || seen.has(clean)) continue;
    const isAllowed =
      allowedExact.has(clean) ||
      (customPrefix ? clean.toLowerCase().startsWith(customPrefix.toLowerCase()) : false);
    if (isAllowed) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

const SELECT_LOPIVI_COLUMNS = `
  id::text AS id,
  record_code,
  channel,
  reporter_relationship,
  is_anonymous,
  keep_identity_reserved,
  reporter_name_enc,
  reporter_contact_enc,
  minor_name_enc,
  minor_age,
  minor_category,
  minor_team,
  incident_date_text,
  incident_location,
  incident_types,
  immediate_risk,
  description_enc,
  measures_taken,
  measures_description_enc,
  authorities_notified,
  authority_notification_date,
  authority_recipient_enc,
  authority_reference_enc,
  follow_up_date,
  follow_up_measures_enc,
  follow_up_evolution_enc,
  follow_up_actions_enc,
  closed_date,
  observations_enc,
  status,
  created_by_user_id::text AS created_by_user_id,
  updated_by_user_id::text AS updated_by_user_id,
  created_at::text AS created_at,
  updated_at::text AS updated_at
`;

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    if (!ctx.isPresident) {
      throw new IntranetForbiddenError(
        'El Registro Confidencial LOPIVI es de acceso exclusivo para el Presidente / Delegado de Protección de Menores.'
      );
    }

    const rows = await queryNeon<LopiviDbRow>(
      `SELECT ${SELECT_LOPIVI_COLUMNS}
       FROM intranet_lopivi_incidents
       ORDER BY (CASE WHEN immediate_risk = 'SI' AND status <> 'CERRADA' THEN 0 ELSE 1 END) ASC, created_at DESC;`
    );

    const incidents = rows.map(mapLopiviRow);

    const byStatus: Record<LopiviIncidentStatus, number> = {
      RECIBIDA: 0,
      EN_VALORACION: 0,
      MEDIDAS_ADOPTADAS: 0,
      DERIVADA_AUTORIDADES: 0,
      EN_SEGUIMIENTO: 0,
      CERRADA: 0,
    };

    let immediateRiskActive = 0;
    let openCount = 0;

    for (const item of incidents) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      if (item.status !== 'CERRADA') {
        openCount += 1;
        if (item.immediateRisk === 'SI') {
          immediateRiskActive += 1;
        }
      }
    }

    await recordAuditLog({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: 'VIEW_LOPIVI_INCIDENTS_REGISTRY',
      module: 'LOPIVI',
      targetType: 'LOPIVI_REGISTRY',
      targetId: null,
      ipAddress: getClientIp(req),
      details: {
        totalRecords: incidents.length,
        openCount,
        immediateRiskActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        incidents,
        stats: {
          total: incidents.length,
          open: openCount,
          immediateRiskActive,
          byStatus,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'API Intranet LOPIVI GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireIntranetSession();
    if (!ctx.isPresident) {
      throw new IntranetForbiddenError(
        'El Registro Confidencial LOPIVI es de acceso exclusivo para el Presidente / Delegado de Protección de Menores.'
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new IntranetValidationError('Cuerpo JSON no válido.', 400);
    }

    const action = stripCrlf(body.action);
    const clientIp = getClientIp(req);

    if (action === 'create_manual_incident') {
      const channel = stripCrlf(body.channel).toUpperCase() as LopiviChannel;
      if (!VALID_CHANNELS.has(channel)) {
        throw new IntranetValidationError('Selecciona un medio de comunicación válido.', 400);
      }

      const rawRelation = stripCrlf(body.reporterRelationship);
      const rawRelationOther = stripCrlf(body.reporterRelationshipOther);
      const isValidRel =
        VALID_RELATIONS.has(rawRelation) || rawRelation.toLowerCase().startsWith('otra:');
      if (!rawRelation || !isValidRel) {
        throw new IntranetValidationError('Indica la relación con el club de quien comunica.', 400);
      }
      const reporterRelationship =
        rawRelation === 'Otra' && rawRelationOther
          ? `Otra: ${rawRelationOther.slice(0, 90)}`
          : rawRelation.slice(0, 120);

      const isAnonymous = body.isAnonymous === true;
      const keepIdentityReserved =
        typeof body.keepIdentityReserved === 'boolean' ? body.keepIdentityReserved : true;

      let reporterName = '';
      let reporterContact = '';
      if (!isAnonymous) {
        reporterName = stripCrlf(body.reporterName).slice(0, 140);
        reporterContact = stripCrlf(body.reporterContact).slice(0, 150);
        if (reporterContact && reporterContact.includes('@')) {
          if (!isStrictEmail(reporterContact)) {
            throw new IntranetValidationError(
              'El correo electrónico de contacto no tiene un formato válido.',
              400
            );
          }
          reporterContact = reporterContact.toLowerCase();
        }
      }

      const minorName = stripCrlf(body.minorName).slice(0, 140);
      const minorAge = stripCrlf(body.minorAge).slice(0, 40);
      const minorCategory = stripCrlf(body.minorCategory).slice(0, 80);
      const minorTeam = stripCrlf(body.minorTeam).slice(0, 100);

      const incidentDateText = stripCrlf(body.incidentDateText).slice(0, 120);
      const rawLocation = stripCrlf(body.incidentLocation);
      const rawLocationOther = stripCrlf(body.incidentLocationOther);
      const isValidLoc =
        VALID_LOCATIONS.has(rawLocation) || rawLocation.toLowerCase().startsWith('otro:');
      if (!rawLocation || !isValidLoc) {
        throw new IntranetValidationError('Indica el lugar donde ocurrieron los hechos.', 400);
      }
      const incidentLocation =
        rawLocation === 'Otro' && rawLocationOther
          ? `Otro: ${rawLocationOther.slice(0, 90)}`
          : rawLocation.slice(0, 120);

      const incidentTypes = sanitizeStringArrayWithCustomPrefix(
        body.incidentTypes,
        VALID_SITUATION_TYPES
      );
      if (incidentTypes.length === 0) {
        throw new IntranetValidationError(
          'Selecciona al menos un tipo de situación comunicada.',
          400
        );
      }

      const immediateRisk = stripCrlf(body.immediateRisk).toUpperCase() as LopiviImmediateRisk;
      if (!VALID_RISKS.has(immediateRisk)) {
        throw new IntranetValidationError(
          'Selecciona el nivel de riesgo inmediato para el menor.',
          400
        );
      }

      const description = cleanMultilineText(body.description, 4000);
      if (description.length < 10) {
        throw new IntranetValidationError(
          'La descripción objetiva de los hechos debe tener al menos 10 caracteres.',
          400
        );
      }

      const measuresTaken = sanitizeStringArrayWithCustomPrefix(
        body.measuresTaken,
        VALID_MEASURES,
        'Otras medidas:'
      );
      const measuresDescription = cleanMultilineText(body.measuresDescription, 4000);
      const observations = cleanMultilineText(body.observations, 4000);

      const requestedStatus = stripCrlf(body.status).toUpperCase() as LopiviIncidentStatus;
      const initialStatus: LopiviIncidentStatus = VALID_STATUSES.has(requestedStatus)
        ? requestedStatus
        : measuresTaken.length > 0
        ? 'MEDIDAS_ADOPTADAS'
        : 'RECIBIDA';

      const incidentId = crypto.randomUUID();
      const yearMadrid = getCurrentMadridYear();
      const recordCode = `LOPIVI-${yearMadrid}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const inserted = await queryNeon<LopiviDbRow>(
        `INSERT INTO intranet_lopivi_incidents (
           id,
           record_code,
           channel,
           reporter_relationship,
           is_anonymous,
           keep_identity_reserved,
           reporter_name_enc,
           reporter_contact_enc,
           minor_name_enc,
           minor_age,
           minor_category,
           minor_team,
           incident_date_text,
           incident_location,
           incident_types,
           immediate_risk,
           description_enc,
           measures_taken,
           measures_description_enc,
           observations_enc,
           status,
           created_by_user_id,
           updated_by_user_id
         ) VALUES (
           $1::uuid,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           $13,
           $14,
           $15::text[],
           $16,
           $17,
           $18::text[],
           $19,
           $20,
           $21,
           $22::uuid,
           $22::uuid
         )
         RETURNING ${SELECT_LOPIVI_COLUMNS};`,
        [
          incidentId,
          recordCode,
          channel,
          reporterRelationship,
          isAnonymous,
          keepIdentityReserved,
          encryptOptionalField(incidentId, 'reporter_name', reporterName),
          encryptOptionalField(incidentId, 'reporter_contact', reporterContact),
          encryptOptionalField(incidentId, 'minor_name', minorName),
          minorAge || null,
          minorCategory || null,
          minorTeam || null,
          incidentDateText || null,
          incidentLocation,
          incidentTypes,
          immediateRisk,
          encryptData(description, `lopivi:${incidentId}:description`),
          measuresTaken,
          encryptOptionalField(incidentId, 'measures_description', measuresDescription),
          encryptOptionalField(incidentId, 'observations', observations),
          initialStatus,
          ctx.user.id,
        ]
      );

      if (inserted.length === 0) {
        throw new Error('No se pudo insertar el expediente LOPIVI.');
      }

      const incident = mapLopiviRow(inserted[0]);

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'CREATE_MANUAL_LOPIVI_INCIDENT',
        module: 'LOPIVI',
        targetType: 'LOPIVI_INCIDENT',
        targetId: incident.id,
        ipAddress: clientIp,
        details: {
          recordCode: incident.recordCode,
          channel: incident.channel,
          immediateRisk: incident.immediateRisk,
          status: incident.status,
          isAnonymous: incident.isAnonymous,
        },
      });

      return NextResponse.json(
        { success: true, incident },
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'update_incident_management') {
      const incidentId = stripCrlf(body.incidentId);
      if (!isUuid(incidentId)) {
        throw new IntranetValidationError('Identificador de expediente LOPIVI no válido.', 400);
      }

      const existingRows = await queryNeon<{
        id: string;
        record_code: string;
        status: LopiviIncidentStatus;
      }>(
        `SELECT id::text AS id, record_code, status
         FROM intranet_lopivi_incidents
         WHERE id = $1::uuid
         LIMIT 1;`,
        [incidentId]
      );

      const existing = existingRows[0];
      if (!existing) {
        throw new IntranetValidationError('El expediente LOPIVI indicado no existe.', 404);
      }

      const status = stripCrlf(body.status).toUpperCase() as LopiviIncidentStatus;
      if (!VALID_STATUSES.has(status)) {
        throw new IntranetValidationError('Estado del expediente no válido.', 400);
      }

      const immediateRisk = stripCrlf(body.immediateRisk).toUpperCase() as LopiviImmediateRisk;
      if (!VALID_RISKS.has(immediateRisk)) {
        throw new IntranetValidationError('Valor de riesgo inmediato no válido.', 400);
      }

      const measuresTaken = sanitizeStringArrayWithCustomPrefix(
        body.measuresTaken,
        VALID_MEASURES,
        'Otras medidas:'
      );
      const measuresDescription = cleanMultilineText(body.measuresDescription, 4000);

      const authoritiesNotified = sanitizeStringArrayWithCustomPrefix(
        body.authoritiesNotified,
        VALID_AUTHORITIES,
        'Otros:'
      );
      const authorityNotificationDate = stripCrlf(body.authorityNotificationDate).slice(0, 60);
      const authorityRecipient = stripCrlf(body.authorityRecipient).slice(0, 220);
      const authorityReference = stripCrlf(body.authorityReference).slice(0, 140);

      const followUpDate = stripCrlf(body.followUpDate).slice(0, 60);
      const followUpMeasures = cleanMultilineText(body.followUpMeasures, 4000);
      const followUpEvolution = cleanMultilineText(body.followUpEvolution, 4000);
      const followUpActions = cleanMultilineText(body.followUpActions, 4000);

      let closedDate = stripCrlf(body.closedDate).slice(0, 60);
      if (status === 'CERRADA' && !closedDate) {
        closedDate = formatMadridDateEsSlash(new Date());
      }

      const observations = cleanMultilineText(body.observations, 4000);

      const updatedRows = await queryNeon<LopiviDbRow>(
        `UPDATE intranet_lopivi_incidents
         SET
           status = $2,
           immediate_risk = $3,
           measures_taken = $4::text[],
           measures_description_enc = $5,
           authorities_notified = $6::text[],
           authority_notification_date = $7,
           authority_recipient_enc = $8,
           authority_reference_enc = $9,
           follow_up_date = $10,
           follow_up_measures_enc = $11,
           follow_up_evolution_enc = $12,
           follow_up_actions_enc = $13,
           closed_date = $14,
           observations_enc = $15,
           updated_by_user_id = $16::uuid,
           updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING ${SELECT_LOPIVI_COLUMNS};`,
        [
          incidentId,
          status,
          immediateRisk,
          measuresTaken,
          encryptOptionalField(incidentId, 'measures_description', measuresDescription),
          authoritiesNotified,
          authorityNotificationDate || null,
          encryptOptionalField(incidentId, 'authority_recipient', authorityRecipient),
          encryptOptionalField(incidentId, 'authority_reference', authorityReference),
          followUpDate || null,
          encryptOptionalField(incidentId, 'follow_up_measures', followUpMeasures),
          encryptOptionalField(incidentId, 'follow_up_evolution', followUpEvolution),
          encryptOptionalField(incidentId, 'follow_up_actions', followUpActions),
          closedDate || null,
          encryptOptionalField(incidentId, 'observations', observations),
          ctx.user.id,
        ]
      );

      if (updatedRows.length === 0) {
        throw new Error('No se pudo actualizar el expediente LOPIVI.');
      }

      const incident = mapLopiviRow(updatedRows[0]);

      // Auditoría estricta sin volcar texto libre ni identidades sensibles
      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'UPDATE_LOPIVI_INCIDENT',
        module: 'LOPIVI',
        targetType: 'LOPIVI_INCIDENT',
        targetId: incident.id,
        ipAddress: clientIp,
        details: {
          recordCode: existing.record_code,
          previousStatus: existing.status,
          newStatus: status,
          immediateRisk,
          measuresCount: measuresTaken.length,
          authoritiesCount: authoritiesNotified.length,
          hasClosedDate: Boolean(closedDate),
        },
      });

      return NextResponse.json({ success: true, incident }, { headers: NO_STORE_HEADERS });
    }

    throw new IntranetValidationError('Acción no reconocida para el registro LOPIVI.', 400);
  } catch (err) {
    return handleIntranetApiError(err, 'API Intranet LOPIVI POST');
  }
}
