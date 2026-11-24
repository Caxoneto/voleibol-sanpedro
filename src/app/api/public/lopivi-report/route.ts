import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon, NeonUnavailableError } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import { encryptData } from '@/lib/encryption';
import { sendSmtpMail } from '@/lib/email-otp';
import {
  formatMadridDateString,
  formatMadridTime,
  getCurrentMadridYear,
} from '@/lib/date-utils';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { recordAuditLog } from '@/lib/intranet/audit';
import {
  LOPIVI_DELEGATE,
  LOPIVI_IMMEDIATE_RISK_OPTIONS,
  LOPIVI_LOCATIONS,
  LOPIVI_REPORTER_RELATIONS,
  LOPIVI_SITUATION_TYPES,
  type LopiviImmediateRisk,
} from '@/lib/lopivi-content';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

const VALID_RISKS = new Set<LopiviImmediateRisk>(['SI', 'NO', 'NO_DETERMINADO']);
const VALID_RELATIONS = new Set(LOPIVI_REPORTER_RELATIONS);
const VALID_LOCATIONS = new Set(LOPIVI_LOCATIONS);
const VALID_SITUATION_TYPES = new Set(LOPIVI_SITUATION_TYPES);

function cleanMultilineText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLen);
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveDelegateAlertEmail(): string {
  const candidates = [
    process.env.LOPIVI_DELEGATE_EMAIL?.trim(),
    process.env.CONSENT_CLUB_CC_EMAIL?.trim(),
    LOPIVI_DELEGATE.email,
  ];
  for (const c of candidates) {
    if (c && isStrictEmail(c)) {
      return c;
    }
  }
  return LOPIVI_DELEGATE.email;
}

function formatMadridDateEsSlash(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`lopivi-report:${clientIp}`, 6, 900, 1800);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Se ha alcanzado temporalmente el límite de envíos desde esta conexión. Inténtalo de nuevo en ${Math.ceil(
            rl.retryAfterSec / 60
          )} minutos o contacta directamente por teléfono al ${LOPIVI_DELEGATE.phone}.`,
        },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const now = new Date();
    const yearMadrid = getCurrentMadridYear(now);
    const receivedDateIso = formatMadridDateString(now);
    const receivedDateText = formatMadridDateEsSlash(now);
    const receivedTimeText = formatMadridTime(now);
    const receivedAtMadrid = `${receivedDateIso} ${receivedTimeText} (Europe/Madrid)`;

    // Honeypot anti-bots: responde 200 falso sin guardar ni enviar correo
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      const decoyCode = `LOPIVI-${yearMadrid}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      return NextResponse.json(
        {
          success: true,
          recordCode: decoyCode,
          receivedAtMadrid,
          receivedDateText,
          receivedTimeText,
          summary: {
            recordCode: decoyCode,
            channel: 'CANAL_WEB',
            status: 'RECIBIDA',
            immediateRisk: 'NO_DETERMINADO',
            receivedDateText,
            receivedTimeText,
          },
        },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    // 1. Validación de relación con el club
    const rawRelation = stripCrlf(body.reporterRelationship);
    const rawRelationOther = stripCrlf(body.reporterRelationshipOther);
    if (!rawRelation || !VALID_RELATIONS.has(rawRelation)) {
      return NextResponse.json(
        { success: false, error: 'Selecciona tu relación con el club.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    const reporterRelationship =
      rawRelation === 'Otra' && rawRelationOther
        ? `Otra: ${rawRelationOther.slice(0, 90)}`
        : rawRelation;

    // 2. Identidad y reserva del comunicante
    const isAnonymous = body.isAnonymous === true;
    const keepIdentityReserved =
      typeof body.keepIdentityReserved === 'boolean' ? body.keepIdentityReserved : true;

    let reporterName = '';
    let reporterContact = '';
    if (!isAnonymous) {
      reporterName = stripCrlf(body.reporterName).slice(0, 140);
      reporterContact = stripCrlf(body.reporterContact).slice(0, 150);

      if (reporterContact) {
        if (reporterContact.includes('@')) {
          if (!isStrictEmail(reporterContact)) {
            return NextResponse.json(
              {
                success: false,
                error: 'El correo electrónico de contacto introducido no tiene un formato válido.',
              },
              { status: 400, headers: NO_STORE_HEADERS }
            );
          }
          reporterContact = reporterContact.toLowerCase();
        } else if (reporterContact.length < 6 || reporterContact.length > 60) {
          return NextResponse.json(
            {
              success: false,
              error: 'El teléfono o medio de contacto debe tener entre 6 y 60 caracteres.',
            },
            { status: 400, headers: NO_STORE_HEADERS }
          );
        }
      }
    }

    // 3. Datos opcionales del menor afectado
    const minorName = stripCrlf(body.minorName).slice(0, 140);
    const minorAge = stripCrlf(body.minorAge).slice(0, 40);
    const minorCategory = stripCrlf(body.minorCategory).slice(0, 80);
    const minorTeam = stripCrlf(body.minorTeam).slice(0, 100);

    // 4. Datos de la incidencia
    const incidentDateText = stripCrlf(body.incidentDateText).slice(0, 120);
    const rawLocation = stripCrlf(body.incidentLocation);
    const rawLocationOther = stripCrlf(body.incidentLocationOther);
    if (!rawLocation || !VALID_LOCATIONS.has(rawLocation)) {
      return NextResponse.json(
        { success: false, error: 'Selecciona el lugar o ámbito donde ocurrieron los hechos.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    const incidentLocation =
      rawLocation === 'Otro' && rawLocationOther
        ? `Otro: ${rawLocationOther.slice(0, 90)}`
        : rawLocation;

    const rawTypes = Array.isArray(body.incidentTypes) ? body.incidentTypes : [];
    const incidentTypes = Array.from(
      new Set(
        rawTypes
          .map((t) => stripCrlf(t))
          .filter((t) => VALID_SITUATION_TYPES.has(t))
      )
    );
    if (incidentTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Selecciona al menos un tipo de situación comunicada.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const immediateRiskRaw = stripCrlf(body.immediateRisk).toUpperCase() as LopiviImmediateRisk;
    if (!VALID_RISKS.has(immediateRiskRaw)) {
      return NextResponse.json(
        { success: false, error: 'Indica si existe riesgo inmediato para el menor.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const description = cleanMultilineText(body.description, 4000);
    if (description.length < 15 || description.length > 4000) {
      return NextResponse.json(
        {
          success: false,
          error:
            'La descripción objetiva de los hechos es obligatoria (mínimo 15 y máximo 4.000 caracteres).',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // 5. Generación de UUID, código de registro y cifrado AES-256-GCM con AAD por campo
    const incidentId = crypto.randomUUID();
    const recordCode = `LOPIVI-${yearMadrid}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const reporterNameEnc = reporterName
      ? encryptData(reporterName, `lopivi:${incidentId}:reporter_name`)
      : null;
    const reporterContactEnc = reporterContact
      ? encryptData(reporterContact, `lopivi:${incidentId}:reporter_contact`)
      : null;
    const minorNameEnc = minorName
      ? encryptData(minorName, `lopivi:${incidentId}:minor_name`)
      : null;
    const descriptionEnc = encryptData(description, `lopivi:${incidentId}:description`);

    const insertedRows = await queryNeon<{ id: string; created_at: string }>(
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
         status
       ) VALUES (
         $1::uuid,
         $2,
         'CANAL_WEB',
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
         $14::text[],
         $15,
         $16,
         'RECIBIDA'
       )
       RETURNING id::text AS id, created_at::text AS created_at;`,
      [
        incidentId,
        recordCode,
        reporterRelationship,
        isAnonymous,
        keepIdentityReserved,
        reporterNameEnc,
        reporterContactEnc,
        minorNameEnc,
        minorAge || null,
        minorCategory || null,
        minorTeam || null,
        incidentDateText || null,
        incidentLocation,
        incidentTypes,
        immediateRiskRaw,
        descriptionEnc,
      ]
    );

    if (insertedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo registrar la comunicación en la base de datos.' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const dbCreatedAt = insertedRows[0]?.created_at
      ? new Date(insertedRows[0].created_at)
      : now;
    const finalDateText = formatMadridDateEsSlash(dbCreatedAt);
    const finalTimeText = formatMadridTime(dbCreatedAt);
    const finalReceivedAtMadrid = `${formatMadridDateString(dbCreatedAt)} ${finalTimeText} (Europe/Madrid)`;

    // Auditoría sin PII ni relato de hechos
    await recordAuditLog({
      actorUserId: null,
      actorEmail: 'canal-publico@voleibolsanpedro.es',
      action: 'RECEIVE_PUBLIC_LOPIVI_REPORT',
      module: 'LOPIVI',
      targetType: 'LOPIVI_INCIDENT',
      targetId: incidentId,
      ipAddress: clientIp,
      details: {
        recordCode,
        channel: 'CANAL_WEB',
        immediateRisk: immediateRiskRaw,
        isAnonymous,
        incidentTypesCount: incidentTypes.length,
      },
    });

    // 6. Alerta confidencial al Delegado (PROHIBIDO incluir nombre del menor, denunciante o relato)
    const delegateEmail = resolveDelegateAlertEmail();
    const riskMeta = LOPIVI_IMMEDIATE_RISK_OPTIONS.find((r) => r.value === immediateRiskRaw);
    const riskLabel = riskMeta ? `${immediateRiskRaw} (${riskMeta.label})` : immediateRiskRaw;
    const approxCategory = minorCategory || 'No especificada';
    const secureIntranetUrl = 'https://voleibolsanpedro.es/club/proteccion-menor';

    let delegateNotified = false;
    try {
      const mailRes = await sendSmtpMail({
        to: delegateEmail,
        subject: `[LOPIVI-CDV] ${immediateRiskRaw === 'SI' ? 'AVISO URGENTE · ' : ''}Nueva comunicación registrada (${recordCode})`,
        text: [
          `CLUB DEPORTIVO VOLEIBOL SAN PEDRO · CANAL CONFIDENCIAL LOPIVI`,
          ``,
          `Se ha recibido una nueva comunicación en el Canal de Protección del Menor.`,
          `Por estricta confidencialidad, este aviso no incluye identidades ni descripción de los hechos.`,
          ``,
          `- Código de registro: ${recordCode}`,
          `- Fecha y hora (Europe/Madrid): ${finalReceivedAtMadrid}`,
          `- Riesgo inmediato indicado: ${riskLabel}`,
          `- Categoría aproximada: ${approxCategory}`,
          ``,
          `Accede con tu sesión cifrada de Presidencia / Delegado de Protección de Menores para su lectura segura:`,
          secureIntranetUrl,
          ``,
          `Prohibida su difusión por WhatsApp o canales ordinarios del club.`,
        ].join('\n'),
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden;">
            <div style="background: ${immediateRiskRaw === 'SI' ? '#b91c1c' : '#18181b'}; color: #ffffff; padding: 18px 24px;">
              <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">
                ${escapeHtml(LOPIVI_DELEGATE.clubName)} · Protocolo LOPIVI
              </div>
              <h2 style="margin: 4px 0 0 0; font-size: 18px;">
                Nueva comunicación confidencial · ${escapeHtml(recordCode)}
              </h2>
            </div>
            <div style="padding: 22px 24px; color: #18181b; font-size: 14px; line-height: 1.55;">
              <p style="margin: 0 0 14px 0;">
                Se ha registrado una nueva comunicación en el <strong>Canal Confidencial de Protección del Menor</strong>.
                Por protección de datos y confidencialidad reforzada, este correo no contiene identidades ni el relato de los hechos.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; font-size: 13px; background: #f9fafb; border: 1px solid #e4e4e7; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Código de registro</td>
                  <td style="padding: 9px 12px; font-weight: bold; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(recordCode)}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Recepción (Europe/Madrid)</td>
                  <td style="padding: 9px 12px; color: #111827; border-bottom: 1px solid #e4e4e7;">${escapeHtml(finalReceivedAtMadrid)}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Riesgo inmediato indicado</td>
                  <td style="padding: 9px 12px; font-weight: bold; color: ${immediateRiskRaw === 'SI' ? '#b91c1c' : '#111827'}; border-bottom: 1px solid #e4e4e7;">${escapeHtml(riskLabel)}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 12px; color: #52525b;">Categoría aproximada</td>
                  <td style="padding: 9px 12px; color: #111827;">${escapeHtml(approxCategory)}</td>
                </tr>
              </table>
              <p style="margin: 0 0 18px 0; text-align: center;">
                <a href="${secureIntranetUrl}" style="display: inline-block; background: #d90429; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 6px;">
                  Abrir Registro Confidencial Cifrado
                </a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 12px;">
                Acceso exclusivo para el Delegado de Protección de Menores (${escapeHtml(LOPIVI_DELEGATE.name)}). Prohibida su difusión por WhatsApp o canales ordinarios.
              </p>
            </div>
          </div>
        `,
      });
      delegateNotified = mailRes.sent;
    } catch (mailErr) {
      console.warn('[API LOPIVI Report] Registro guardado; aviso SMTP pendiente:', mailErr);
    }

    return NextResponse.json(
      {
        success: true,
        recordCode,
        receivedAtMadrid: finalReceivedAtMadrid,
        receivedDateText: finalDateText,
        receivedTimeText: finalTimeText,
        delegateNotified,
        summary: {
          recordCode,
          channel: 'CANAL_WEB',
          status: 'RECIBIDA',
          immediateRisk: immediateRiskRaw,
          incidentLocation,
          incidentTypes,
          reporterRelationship,
          isAnonymous,
          keepIdentityReserved,
          receivedDateText: finalDateText,
          receivedTimeText: finalTimeText,
        },
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Public LOPIVI Report] Error inesperado:', err);
    return NextResponse.json(
      {
        success: false,
        error:
          'No se pudo procesar la comunicación en este momento. Si es urgente, contacta directamente con el Delegado de Protección o llama al 112.',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
