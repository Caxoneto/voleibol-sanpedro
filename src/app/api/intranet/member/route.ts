import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { getClientIp } from '@/lib/rate-limiter';
import {
  computeAgeInMadrid,
  formatMadridTime,
  parseBirthDateParts,
} from '@/lib/date-utils';
import {
  decryptDataStrict,
  encryptData,
  encryptWithDek,
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
import {
  computeVerifiableConsentHash,
  revokePlayerConsent,
} from '@/lib/consent-store';
import { getClubCopyEmail, sendConsentReceiptEmail } from '@/lib/email-otp';
import { getClubTeamNameById } from '@/lib/club-info';
import { requireIntranetSession } from '@/lib/intranet/auth';
import { IntranetForbiddenError } from '@/lib/intranet/rbac';
import { ensureIntranetSeeded } from '@/lib/intranet/seed-bootstrap';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';
import { refreshOverdueCharges } from '@/lib/intranet/payments';
import { getPaymentMethodLabel } from '@/lib/intranet/pdf-receipt';

export const dynamic = 'force-dynamic';

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function maskPersonName(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Representante legal';
  return parts
    .map((p) => (p.length <= 2 ? p[0] + '*' : p.slice(0, 2) + '***'))
    .join(' ');
}

function safeDecryptBirthDate(enc: string | null, athleteId: string): string | null {
  if (!enc) return null;
  const res = decryptDataStrict(enc, `${athleteId}:birth_date_enc`);
  if (res.ok && res.value) return res.value;
  const fallback = decryptDataStrict(enc);
  return fallback.ok && fallback.value ? fallback.value : null;
}

export async function GET(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const session = await requireIntranetSession();

    const accessibleIds = Array.from(
      new Set([
        ...(session.ownAthleteId ? [session.ownAthleteId] : []),
        ...session.guardianAthleteIds,
      ])
    );

    const requestedAthleteId = req.nextUrl.searchParams.get('athleteId')?.trim() || null;
    if (requestedAthleteId && !accessibleIds.includes(requestedAthleteId)) {
      throw new IntranetForbiddenError(
        'No tienes autorización para acceder a la ficha de este deportista.'
      );
    }

    if (accessibleIds.length === 0) {
      return NextResponse.json({
        success: true,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          phone: session.user.phone,
        },
        selectedAthleteId: null,
        athletes: [],
        bankIban: process.env.CLUB_BANK_IBAN?.trim() || null,
      });
    }

    await refreshOverdueCharges();

    const [athleteRows, teamRows, guardianRows, consentRows, enrollmentRows, chargeRows, paymentRows] =
      await Promise.all([
        queryNeon<{
          id: string;
          first_name: string;
          last_name: string;
          birth_year: number | null;
          birth_date_enc: string | null;
          birth_date_verified: boolean;
          gender: string;
          shirt_size: string | null;
          jersey_number: number | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          status: string;
          verified_at: string | null;
        }>(
          `SELECT
             id, first_name, last_name, birth_year, birth_date_enc, birth_date_verified,
             gender, shirt_size, jersey_number, emergency_contact_name, emergency_contact_phone,
             status, verified_at::text
           FROM intranet_athletes
           WHERE id = ANY($1::text[])
             AND status <> 'SHREDDED'
           ORDER BY last_name ASC, first_name ASC;`,
          [accessibleIds]
        ),
        queryNeon<{
          athlete_id: string;
          team_season_id: string;
          team_name: string;
          division: string;
          is_primary: boolean;
          dorsal: number | null;
          position: string | null;
        }>(
          `SELECT
             at2.athlete_id, at2.team_season_id, ts.name AS team_name,
             ts.division, at2.is_primary, at2.dorsal, at2.position
           FROM intranet_athlete_teams at2
           INNER JOIN intranet_team_seasons ts ON ts.id = at2.team_season_id
           WHERE at2.athlete_id = ANY($1::text[])
           ORDER BY at2.is_primary DESC, ts.sort_order ASC;`,
          [accessibleIds]
        ),
        queryNeon<{
          athlete_id: string;
          full_name: string;
          relationship: string;
          email: string | null;
          phone: string | null;
          guardian_user_id: string | null;
        }>(
          `SELECT athlete_id, full_name, relationship, email, phone, guardian_user_id::text
           FROM intranet_guardianships
           WHERE athlete_id = ANY($1::text[])
           ORDER BY is_primary_payer DESC, created_at ASC;`,
          [accessibleIds]
        ),
        queryNeon<{
          player_id: string;
          status: string;
          consent_social_media: boolean;
          consent_streaming: boolean;
          consent_press: boolean;
          consent_travel: boolean | null;
          signed_at_iso: string | null;
          signer_name: string;
          signer_relationship: string;
          signature_method: string | null;
          document_hash: string;
          created_at: string;
        }>(
          `SELECT
             player_id, status, consent_social_media, consent_streaming, consent_press,
             consent_travel, signed_at_iso, signer_name, signer_relationship,
             signature_method, document_hash, created_at::text
           FROM player_consents
           WHERE player_id = ANY($1::text[]);`,
          [accessibleIds]
        ),
        queryNeon<{
          id: string;
          athlete_id: string;
          product_name: string;
          plan_name: string;
          periodicity: string;
          season_id: string;
          payer_name: string;
          payer_email: string | null;
          payment_reference_code: string;
          status: string;
          created_at: string;
        }>(
          `SELECT
             e.id::text, e.athlete_id, p.name AS product_name, pp.name AS plan_name,
             pp.periodicity, e.season_id, e.payer_name, e.payer_email,
             e.payment_reference_code, e.status, e.created_at::text
           FROM intranet_enrollments e
           INNER JOIN intranet_products p ON p.id = e.product_id
           INNER JOIN intranet_price_plans pp ON pp.id = e.price_plan_id
           WHERE e.athlete_id = ANY($1::text[])
           ORDER BY e.created_at DESC;`,
          [accessibleIds]
        ),
        queryNeon<{
          id: string;
          enrollment_id: string;
          athlete_id: string;
          installment_number: number;
          concept: string;
          due_madrid_date: string;
          base_amount: string;
          discount_amount: string;
          final_amount: string;
          paid_amount: string;
          status: string;
          origin: string;
        }>(
          `SELECT
             id::text, enrollment_id::text, athlete_id, installment_number, concept,
             due_madrid_date, base_amount::text, discount_amount::text,
             final_amount::text, paid_amount::text, status, origin
           FROM intranet_charges
           WHERE athlete_id = ANY($1::text[])
             AND status <> 'ANULADO'
           ORDER BY due_madrid_date ASC, installment_number ASC;`,
          [accessibleIds]
        ),
        queryNeon<{
          id: string;
          athlete_id: string;
          enrollment_id: string | null;
          amount: string;
          method: string;
          paid_madrid_date: string;
          reference: string | null;
          receipt_number: string;
          status: string;
          origin: string;
        }>(
          `SELECT
             id::text, athlete_id, enrollment_id::text, amount::text, method,
             paid_madrid_date, reference, receipt_number, status, origin
           FROM intranet_payments
           WHERE athlete_id = ANY($1::text[])
             AND status = 'COMPLETED'
           ORDER BY paid_madrid_date DESC, created_at DESC;`,
          [accessibleIds]
        ),
      ]);

    const teamsByAthlete = new Map<string, Array<Record<string, unknown>>>();
    for (const t of teamRows) {
      const list = teamsByAthlete.get(t.athlete_id) || [];
      list.push({
        teamSeasonId: t.team_season_id,
        teamName: t.team_name,
        division: t.division,
        isPrimary: t.is_primary,
        dorsal: t.dorsal,
        position: t.position,
      });
      teamsByAthlete.set(t.athlete_id, list);
    }

    const guardianByAthlete = new Map<string, (typeof guardianRows)[0]>();
    for (const g of guardianRows) {
      if (!guardianByAthlete.has(g.athlete_id)) {
        guardianByAthlete.set(g.athlete_id, g);
      }
    }

    const consentByAthlete = new Map(consentRows.map((c) => [c.player_id, c]));

    const athletesPayload = athleteRows.map((a) => {
      const isGuardian = session.guardianAthleteIds.includes(a.id);
      const isOwnAccount = session.ownAthleteId === a.id;
      const birthDatePlain = safeDecryptBirthDate(a.birth_date_enc, a.id);
      const ageEval = computeAgeInMadrid(birthDatePlain, a.birth_year);
      const isOwnMinor = isOwnAccount && !isGuardian && ageEval.isMinor;

      const fullName = `${a.first_name} ${a.last_name}`.trim();
      const teams = teamsByAthlete.get(a.id) || [];
      const guardian = guardianByAthlete.get(a.id);
      const c = consentByAthlete.get(a.id);

      const consentStatus = c
        ? (c.status as 'ACTIVE' | 'REVOKED' | 'SHREDDED')
        : ('PENDING' as const);
      const cSocial = c?.consent_social_media === true;
      const cStreaming = c?.consent_streaming === true;
      const cPress = c?.consent_press === true;
      const cImage = cSocial || cStreaming || cPress;
      const cTravel = c?.consent_travel === true;

      // Pagos en modo solo lectura (sin DNI ni datos privados del tutor si accede menor 14-17)
      const athleteEnrollments = enrollmentRows
        .filter((e) => e.athlete_id === a.id)
        .map((e) => ({
          id: e.id,
          productName: e.product_name,
          planName: e.plan_name,
          periodicity: e.periodicity,
          seasonId: e.season_id,
          payerName: isOwnMinor ? 'Representante legal' : e.payer_name,
          payerEmail: isOwnMinor ? null : e.payer_email,
          paymentReferenceCode: e.payment_reference_code,
          status: e.status,
        }));

      const athleteCharges = chargeRows
        .filter((ch) => ch.athlete_id === a.id)
        .map((ch) => {
          const finalAmt = Number(ch.final_amount);
          const paidAmt = Number(ch.paid_amount);
          const pendingAmt =
            ch.status === 'CONDONADO'
              ? 0
              : roundMoney(Math.max(0, finalAmt - paidAmt));
          return {
            id: ch.id,
            enrollmentId: ch.enrollment_id,
            installmentNumber: ch.installment_number,
            concept: ch.concept,
            dueMadridDate: ch.due_madrid_date,
            baseAmount: Number(ch.base_amount),
            discountAmount: Number(ch.discount_amount),
            finalAmount: finalAmt,
            paidAmount: paidAmt,
            pendingAmount: pendingAmt,
            status: ch.status,
            origin: ch.origin,
          };
        });

      const athletePayments = paymentRows
        .filter((p) => p.athlete_id === a.id)
        .map((p) => ({
          id: p.id,
          enrollmentId: p.enrollment_id,
          amount: Number(p.amount),
          method: p.method,
          methodLabel: getPaymentMethodLabel(p.method),
          paidMadridDate: p.paid_madrid_date,
          reference: p.reference,
          receiptNumber: p.receipt_number,
          origin: p.origin,
          receiptUrl: `/api/intranet/payments/receipt/${p.id}`,
        }));

      const hasOverdue = athleteCharges.some((ch) => ch.status === 'VENCIDO' && ch.pendingAmount > 0);
      const hasPending = athleteCharges.some(
        (ch) => (ch.status === 'PENDIENTE' || ch.status === 'PARCIAL') && ch.pendingAmount > 0
      );
      const statusSummary = hasOverdue
        ? 'Vencido'
        : hasPending
        ? 'Próximo vencimiento'
        : athleteCharges.length > 0
        ? 'Al corriente'
        : 'Sin cuotas registradas';

      let totalFinal = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      for (const ch of athleteCharges) {
        if (ch.status === 'CONDONADO') continue;
        totalFinal = roundMoney(totalFinal + ch.finalAmount);
        totalPaid = roundMoney(totalPaid + ch.paidAmount);
        totalPending = roundMoney(totalPending + ch.pendingAmount);
        if (ch.status === 'VENCIDO') {
          totalOverdue = roundMoney(totalOverdue + ch.pendingAmount);
        }
      }

      return {
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        fullName,
        birthYear: a.birth_year,
        birthDate: birthDatePlain,
        birthDateVerified: a.birth_date_verified,
        ageEvaluation: ageEval,
        gender: a.gender,
        shirtSize: a.shirt_size,
        jerseyNumber: a.jersey_number,
        emergencyContactName: a.emergency_contact_name,
        emergencyContactPhone: a.emergency_contact_phone,
        status: a.status,
        verifiedAt: a.verified_at,
        isOwnAccount,
        isGuardianView: isGuardian,
        teams,
        guardian:
          guardian && !isOwnMinor
            ? {
                fullName: guardian.full_name,
                relationship: guardian.relationship,
                email: guardian.email,
                phone: guardian.phone,
              }
            : null,
        consent: {
          status: consentStatus,
          consentSocialMedia: cSocial,
          consentStreaming: cStreaming,
          consentPress: cPress,
          consentImage: cImage,
          consentTravel: cTravel,
          signedAtIso: c?.signed_at_iso || c?.created_at || null,
          signerName: c
            ? isOwnMinor
              ? maskPersonName(c.signer_name)
              : c.signer_name
            : null,
          signerRelationship: c?.signer_relationship || null,
          signatureMethod: c?.signature_method || null,
          documentHash: c?.document_hash || null,
          canSignInPortal:
            consentStatus !== 'SHREDDED' && (isGuardian || !ageEval.isMinor),
        },
        payments: {
          readOnly: true,
          statusSummary,
          enrollments: athleteEnrollments,
          charges: athleteCharges,
          payments: athletePayments,
          totals: {
            totalFinal,
            totalPaid,
            totalPending,
            totalOverdue,
          },
        },
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone,
      },
      selectedAthleteId: requestedAthleteId || athletesPayload[0]?.id || null,
      athletes: athletesPayload,
      bankIban: process.env.CLUB_BANK_IBAN?.trim() || null,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Member GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureIntranetSeeded();
    const session = await requireIntranetSession();
    const clientIp = getClientIp(req);
    const body = await req.json();
    const action = String(body?.action || '').trim();
    const athleteId = String(body?.athleteId || '').trim();

    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'Identificador de deportista obligatorio.' },
        { status: 400 }
      );
    }

    const isOwner = session.ownAthleteId === athleteId;
    const isGuardian = session.guardianAthleteIds.includes(athleteId);
    if (!isOwner && !isGuardian) {
      throw new IntranetForbiddenError(
        'No tienes autorización para modificar la ficha de este deportista.'
      );
    }

    const athleteRows = await queryNeon<{
      id: string;
      first_name: string;
      last_name: string;
      birth_year: number | null;
      birth_date_enc: string | null;
      status: string;
      primary_team_id: string | null;
    }>(
      `SELECT
         a.id, a.first_name, a.last_name, a.birth_year, a.birth_date_enc, a.status,
         (SELECT at2.team_season_id FROM intranet_athlete_teams at2
          WHERE at2.athlete_id = a.id ORDER BY at2.is_primary DESC LIMIT 1) AS primary_team_id
       FROM intranet_athletes a
       WHERE a.id = $1
       LIMIT 1;`,
      [athleteId]
    );

    const athlete = athleteRows[0];
    if (!athlete) {
      return NextResponse.json({ success: false, error: 'Deportista no encontrado.' }, { status: 404 });
    }
    if (athlete.status === 'SHREDDED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta ficha consta suprimida (Art. 17 RGPD) y no admite modificaciones.',
        },
        { status: 409 }
      );
    }

    const existingBirthDate = safeDecryptBirthDate(athlete.birth_date_enc, athleteId);
    const currentAgeEval = computeAgeInMadrid(existingBirthDate, athlete.birth_year);

    if (action === 'complete_onboarding_profile') {
      if (!isGuardian && currentAgeEval.age !== null && currentAgeEval.age < 14) {
        throw new IntranetForbiddenError(
          'Los menores de 14 años deben completar y verificar su ficha a través de su padre, madre o tutor legal.'
        );
      }

      const emergencyContactName = String(body?.emergencyContactName || '').trim().slice(0, 120);
      const emergencyContactPhone = String(body?.emergencyContactPhone || '').trim().slice(0, 30);
      const phone = body?.phone ? String(body.phone).trim().slice(0, 30) : null;
      const shirtSize = body?.shirtSize ? String(body.shirtSize).trim().slice(0, 16) : null;
      const birthDateRaw = body?.birthDate ? String(body.birthDate).trim() : null;

      if (!emergencyContactName || !emergencyContactPhone) {
        return NextResponse.json(
          {
            success: false,
            error: 'El nombre y teléfono del contacto de emergencia son obligatorios.',
          },
          { status: 400 }
        );
      }

      let bdIso: string | null = null;
      let bdYear: number | null = null;
      let bdEnc: string | null = null;
      if (birthDateRaw) {
        const parts = parseBirthDateParts(birthDateRaw);
        if (!parts) {
          return NextResponse.json(
            {
              success: false,
              error: 'Fecha de nacimiento no válida (usa formato DD/MM/AAAA o AAAA-MM-DD).',
            },
            { status: 400 }
          );
        }
        bdIso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
        bdYear = parts.year;
        const newAgeEval = computeAgeInMadrid(bdIso, bdYear);
        if (!isGuardian && newAgeEval.age !== null && newAgeEval.age < 14) {
          throw new IntranetForbiddenError(
            'Los menores de 14 años deben verificar su ficha a través de su representante legal.'
          );
        }
        bdEnc = encryptData(bdIso, `${athleteId}:birth_date_enc`);
      }

      await queryNeon(
        `UPDATE intranet_athletes
         SET emergency_contact_name = $2,
             emergency_contact_phone = $3,
             shirt_size = COALESCE($4, shirt_size),
             birth_date_enc = COALESCE($5, birth_date_enc),
             birth_year = COALESCE($6, birth_year),
             birth_date_verified = CASE WHEN $5 IS NOT NULL THEN true ELSE birth_date_verified END,
             status = 'VERIFICADO',
             verified_at = COALESCE(verified_at, NOW()),
             updated_at = NOW()
         WHERE id = $1;`,
        [athleteId, emergencyContactName, emergencyContactPhone, shirtSize, bdEnc, bdYear]
      );

      if (phone) {
        await queryNeon(
          `UPDATE intranet_users SET phone = $2, updated_at = NOW() WHERE id = $1::uuid;`,
          [session.user.id, phone]
        );
        if (isGuardian) {
          await queryNeon(
            `UPDATE intranet_guardianships
             SET phone = $2
             WHERE athlete_id = $1 AND guardian_user_id = $3::uuid;`,
            [athleteId, phone, session.user.id]
          );
        }
      }

      if (bdIso && bdYear) {
        const censusEnc = encryptData(bdIso, `${athleteId}:birth_date_encrypted`);
        await queryNeon(
          `UPDATE player_census
           SET birth_year = $2,
               birth_date_encrypted = $3,
               birth_date_verified = true,
               updated_at = NOW()
           WHERE player_id = $1 OR canonical_player_id = $1;`,
          [athleteId, bdYear, censusEnc]
        );
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'COMPLETE_ONBOARDING_PROFILE',
        module: 'Deportistas',
        targetType: 'ATHLETE',
        targetId: athleteId,
        details: {
          shirtSize,
          birthDateProvided: Boolean(bdIso),
          byGuardian: isGuardian,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'record_integrated_consent') {
      if (typeof body?.consentImage !== 'boolean' || typeof body?.consentTravel !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error:
              'Debes seleccionar explícitamente Autorizo o No autorizo en ambas decisiones (Imágenes Deportivas y Desplazamientos).',
          },
          { status: 400 }
        );
      }

      if (body?.policySummaryAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes confirmar la lectura de la información de protección de datos (Art. 13 RGPD).',
          },
          { status: 400 }
        );
      }

      const sigData = String(body?.signatureData || '').trim();
      const sigValidation = validateSignatureDataUrl(sigData);
      if (!sigValidation.valid) {
        return NextResponse.json(
          { success: false, error: sigValidation.error || 'Firma gráfica no válida.' },
          { status: 400 }
        );
      }

      const isMinor = currentAgeEval.isMinor;
      const isMinor14To17 = currentAgeEval.isMinor14To17;

      if (isMinor && !isGuardian) {
        throw new IntranetForbiddenError(
          'Para deportistas menores de 18 años, la autorización RGPD debe firmarla su padre, madre o tutor legal.'
        );
      }

      const authoritativePlayerName = `${athlete.first_name} ${athlete.last_name}`.trim();
      const authoritativeTeamId = athlete.primary_team_id || 'team-sf';
      const signerType: 'PARENT' | 'SELF_ADULT' = isMinor ? 'PARENT' : 'SELF_ADULT';
      const reqRel = String(body?.signerRelationship || '').trim();
      const signerRelationship: 'PADRE' | 'MADRE' | 'TUTOR_LEGAL' | 'PROPIO_JUGADOR' = isMinor
        ? reqRel === 'PADRE' || reqRel === 'MADRE' || reqRel === 'TUTOR_LEGAL'
          ? reqRel
          : 'TUTOR_LEGAL'
        : 'PROPIO_JUGADOR';

      if (isMinor && body?.patriaPotestadAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Para menores de edad es obligatorio aceptar la Declaración Responsable de patria potestad o tutela legal.',
          },
          { status: 400 }
        );
      }

      if (isMinor14To17 && body?.minorConsentAccepted !== true) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Para deportistas de 14 a 17 años debes confirmar que el/la menor ha sido informado/a y presta su asentimiento (Art. 3.1 LO 1/1982).',
          },
          { status: 400 }
        );
      }

      const cleanSignerName = isMinor
        ? String(body?.signerName || session.user.name || '').trim()
        : authoritativePlayerName;
      const cleanDni = String(body?.signerDni || '').trim().toUpperCase().replace(/[\s-]/g, '');
      const cleanPhone = String(body?.signerPhone || session.user.phone || '').trim().slice(0, 30);
      const cleanEmail = session.user.email.trim().toLowerCase();

      if (!cleanSignerName || cleanSignerName.length > 150) {
        return NextResponse.json(
          { success: false, error: 'Nombre del firmante no válido.' },
          { status: 400 }
        );
      }
      if (!isValidSpanishDniOrNie(cleanDni)) {
        return NextResponse.json(
          {
            success: false,
            error: 'El documento de identidad (DNI, NIE o Pasaporte) del firmante no es válido.',
          },
          { status: 400 }
        );
      }

      // Comprobar estado SHREDDED o ACTIVE previo
      const currentConsentRows = await queryNeon<{
        status: string;
        shredded_at: string | null;
      }>(
        `SELECT
           (SELECT status FROM player_consents WHERE player_id = $1 LIMIT 1) AS status,
           (SELECT shredded_at::text FROM player_crypto_keys WHERE player_id = $1 LIMIT 1) AS shredded_at;`,
        [athleteId]
      );

      if (
        currentConsentRows[0]?.status === 'SHREDDED' ||
        Boolean(currentConsentRows[0]?.shredded_at)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Esta ficha consta suprimida (Art. 17 RGPD). Contacta con Secretaría (info@voleibolsanpedro.es).',
          },
          { status: 409 }
        );
      }

      // Si ya existía una autorización ACTIVE, registrar revocación previa en el WORM audit log
      if (currentConsentRows[0]?.status === 'ACTIVE') {
        const revRes = await revokePlayerConsent(athleteId);
        if (!revRes.success) {
          return NextResponse.json(
            {
              success: false,
              error: revRes.error || 'No se pudo actualizar la autorización vigente.',
            },
            { status: 409 }
          );
        }
      }

      const signedAtIso = new Date().toISOString();
      const legalVersion = 'v5_2026_junta_anexo05_06';
      const cImage = body.consentImage === true;
      const cTravel = body.consentTravel === true;

      const documentHash = computeVerifiableConsentHash({
        version: 'v3',
        keyId: 'integrity-v3',
        playerId: athleteId,
        playerName: authoritativePlayerName,
        teamId: authoritativeTeamId,
        isMinor,
        isMinor14To17,
        signerType,
        signerName: cleanSignerName,
        signerDni: cleanDni,
        signerRelationship,
        consentSocialMedia: cImage,
        consentStreaming: cImage,
        consentPress: cImage,
        consentTravel: cTravel,
        signatureMethod: 'DIGITAL_WEB',
        legalVersion,
        signedAtIso,
        signatureData: sigData,
      });

      const encDni = encryptData(cleanDni, `${athleteId}:signer_dni`);
      const encEmail = isStrictEmail(cleanEmail)
        ? encryptData(cleanEmail, `${athleteId}:signer_email`)
        : '';
      const encPhone = cleanPhone ? encryptData(cleanPhone, `${athleteId}:signer_phone`) : '';
      const encIp = clientIp ? encryptData(clientIp, `${athleteId}:ip_address`) : '';
      const encSig = encryptData(sigData, `${athleteId}:signature_data`);
      const userAgent = stripCrlf(req.headers.get('user-agent') || '').slice(0, 250);

      // DEK por sujeto para player_consents_audit (WORM + crypto-shredding)
      const existingKeyRows = await queryNeon<{
        wrapped_dek: string | null;
        shredded_at: string | null;
      }>(
        `SELECT wrapped_dek, shredded_at::text FROM player_crypto_keys WHERE player_id = $1 LIMIT 1;`,
        [athleteId]
      );
      let subjectDek: Buffer | null = null;
      if (existingKeyRows[0]?.wrapped_dek && !existingKeyRows[0]?.shredded_at) {
        subjectDek = unwrapDek(existingKeyRows[0].wrapped_dek, athleteId);
      }
      if (!subjectDek) {
        subjectDek = generateDek();
      }
      const wrappedDekForUpsert = wrapDek(subjectDek, athleteId);

      const auditDni = encryptWithDek(cleanDni, subjectDek, `${athleteId}:audit:signer_dni`);
      const auditEmail = isStrictEmail(cleanEmail)
        ? encryptWithDek(cleanEmail, subjectDek, `${athleteId}:audit:signer_email`)
        : '';
      const auditPhone = cleanPhone
        ? encryptWithDek(cleanPhone, subjectDek, `${athleteId}:audit:signer_phone`)
        : '';
      const auditIp = clientIp
        ? encryptWithDek(clientIp, subjectDek, `${athleteId}:audit:ip_address`)
        : '';
      const auditSig = encryptWithDek(sigData, subjectDek, `${athleteId}:audit:signature_data`);

      const cteRows = await queryNeon<{ consent_id: string | null }>(
        `WITH ins_c AS (
           INSERT INTO player_consents (
             player_id, player_name, team_id, is_minor, is_minor_14_to_17,
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
             $1::varchar, $2::varchar, $3::varchar, $4::boolean, $5::boolean,
             $6::varchar, $7::varchar, $8::text, $9::varchar,
             $10::text, $11::text,
             $12::boolean, $12::boolean, $12::boolean, $13::boolean,
             'DIGITAL_WEB', $14::varchar, 'ACTIVE', NULL,
             $15::text, $16::varchar, $17::varchar,
             $18::text, $19::text,
             'v3', 'integrity-v3', true,
             NULL, NULL,
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
             otp_challenge_id = NULL,
             otp_verified_at = NULL,
             updated_at = NOW()
           WHERE player_consents.status <> 'ACTIVE' AND player_consents.status <> 'SHREDDED'
           RETURNING
             id, player_id, player_name, team_id, is_minor, is_minor_14_to_17, signer_type, signer_name,
             signer_relationship, consent_social_media, consent_streaming, consent_press,
             consent_travel, signature_method, legal_version, signed_at_iso,
             document_hash, user_agent, hash_version, key_id
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
             ins_c.hash_version, ins_c.key_id, NULL, NULL
           FROM ins_c
           RETURNING audit_id
         )
         SELECT (SELECT id::text FROM ins_c LIMIT 1) AS consent_id;`,
        [
          athleteId,
          authoritativePlayerName,
          authoritativeTeamId,
          isMinor,
          isMinor14To17,
          signerType,
          cleanSignerName,
          encDni,
          signerRelationship,
          encEmail,
          encPhone,
          cImage,
          cTravel,
          signedAtIso,
          encSig,
          legalVersion,
          documentHash,
          encIp,
          userAgent,
          wrappedDekForUpsert,
          auditDni,
          auditEmail,
          auditPhone,
          auditSig,
          auditIp,
        ]
      );

      const consentId = cteRows[0]?.consent_id || '';
      if (!consentId) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se pudo registrar la autorización en este momento. Inténtalo de nuevo.',
          },
          { status: 409 }
        );
      }

      const signedAtFormatted = `${new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(signedAtIso))} ${formatMadridTime(signedAtIso)}`;

      let receiptEmailSent = false;
      try {
        const mailRes = await sendConsentReceiptEmail({
          toEmail: isStrictEmail(cleanEmail) ? cleanEmail : getClubCopyEmail(),
          playerName: authoritativePlayerName,
          teamName: getClubTeamNameById(authoritativeTeamId),
          birthYear: athlete.birth_year,
          birthDate: existingBirthDate,
          isMinor,
          isMinor14To17,
          signerName: cleanSignerName,
          signerDni: cleanDni,
          signerDniMasked: maskDni(cleanDni),
          signerRelationship,
          signerPhone: cleanPhone,
          consentId,
          documentHash,
          signedAtIso,
          signedAtFormatted,
          signatureMethod: 'DIGITAL_WEB',
          signatureMethodLabel: 'Firma Digital Autenticada (Zona Familias)',
          signatureData: sigData,
          consentImage: cImage,
          consentSocialMedia: cImage,
          consentStreaming: cImage,
          consentPress: cImage,
          consentTravel: cTravel,
        });
        receiptEmailSent = mailRes.sent;
      } catch {
        // No bloquear si SMTP no está activo
      }

      await recordAuditLog({
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'RECORD_INTEGRATED_CONSENT',
        module: 'Autorizaciones',
        targetType: 'ATHLETE',
        targetId: athleteId,
        details: {
          consentId,
          consentImage: cImage,
          consentTravel: cTravel,
          isMinor,
          isMinor14To17,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        consentId,
        documentHash,
        signedAtIso,
        receiptEmailSent,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida en zona de miembros.' },
      { status: 400 }
    );
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet Member POST');
  }
}
