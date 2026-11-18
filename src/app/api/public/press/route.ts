import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon, NeonUnavailableError } from '@/lib/streaming-store';
import { getClientIp, checkNeonRateLimit } from '@/lib/rate-limiter';
import { isStrictEmail, stripCrlf } from '@/lib/validators';
import { sendClubNotificationEmail } from '@/lib/email-otp';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`public-press:${clientIp}`, 5, 900, 1800);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas solicitudes en poco tiempo. Inténtalo de nuevo en ${Math.ceil(
            rl.retryAfterSec / 60
          )} minutos.`,
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

    // Honeypot anti-spam
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (body.privacyAccepted !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes aceptar expresamente la Política de Privacidad para solicitar acreditación.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const fullName = stripCrlf(body.fullName);
    const mediaOutlet = stripCrlf(body.mediaOutlet);
    const role = stripCrlf(body.role || 'Prensa Escrita / Digital');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = stripCrlf(body.phone);
    const matchId = stripCrlf(body.matchId || 'general').slice(0, 64) || 'general';
    const rawNotes = typeof body.notes === 'string' ? body.notes.replace(/\0/g, '').trim() : '';
    const legalVersion =
      typeof body.legalVersion === 'string' && body.legalVersion.trim()
        ? stripCrlf(body.legalVersion).slice(0, 64)
        : 'v3_2026_rgpd_prensa';

    if (
      !fullName ||
      fullName.length > 120 ||
      !mediaOutlet ||
      mediaOutlet.length > 120 ||
      !role ||
      role.length > 80 ||
      !phone ||
      phone.length < 6 ||
      phone.length > 30 ||
      !isStrictEmail(email) ||
      rawNotes.length > 1500
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Revisa los campos obligatorios: nombre completo, medio, función, teléfono y correo electrónico válido.',
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const id = `acc-${crypto.randomUUID()}`;
    const inserted = await queryNeon<{ id: string }>(
      `INSERT INTO "PressAccreditation" (
         "id", "fullName", "mediaOutlet", "role", "email", "phone",
         "matchId", "notes", "status", "createdAt", "privacyAccepted", "legalVersion"
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW(), $9, $10)
       RETURNING "id";`,
      [id, fullName, mediaOutlet, role, email, phone, matchId, rawNotes || null, true, legalVersion]
    );

    if (inserted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo registrar la acreditación de prensa.' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    let emailNotified = false;
    try {
      const mailRes = await sendClubNotificationEmail({
        subject: `[PRENSA-CDV] Acreditación ${mediaOutlet} · ${fullName}`,
        replyTo: email,
        htmlBody: `
          <p style="font-size: 14px; color: #27272a; margin: 0 0 12px 0;">
            Se ha recibido una nueva solicitud de acreditación de prensa desde el portal del club:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; border-collapse: collapse; background: #f9fafb; border: 1px solid #e4e4e7;">
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">ID Registro</td><td style="padding: 8px 12px; font-weight: bold;">${escapeHtml(id)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Nombre completo</td><td style="padding: 8px 12px; font-weight: bold;">${escapeHtml(fullName)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Medio de comunicación</td><td style="padding: 8px 12px; font-weight: bold;">${escapeHtml(mediaOutlet)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Función / Cobertura</td><td style="padding: 8px 12px;">${escapeHtml(role)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Email</td><td style="padding: 8px 12px;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Teléfono</td><td style="padding: 8px 12px;">${escapeHtml(phone)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b; border-bottom: 1px solid #e4e4e7;">Partido / Evento</td><td style="padding: 8px 12px;">${escapeHtml(matchId)}</td></tr>
            <tr><td style="padding: 8px 12px; color: #52525b;">Notas</td><td style="padding: 8px 12px; white-space: pre-wrap;">${escapeHtml(rawNotes || 'Sin notas adicionales')}</td></tr>
          </table>
          <p style="font-size: 11px; color: #52525b; margin: 12px 0 0 0;">
            Consentimiento RGPD aceptado (${escapeHtml(legalVersion)}).
          </p>
        `,
      });
      emailNotified = Boolean(mailRes?.sent);
    } catch (mailErr) {
      console.warn('[API Public Press] Solicitud guardada, aviso SMTP pendiente:', mailErr);
    }

    return NextResponse.json(
      {
        success: true,
        id,
        emailNotified,
        message: 'Solicitud de acreditación registrada correctamente. Recibirás confirmación desde Secretaría.',
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        { success: false, error: 'Servicio temporalmente no disponible. Inténtalo de nuevo en unos instantes.' },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Public Press POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al registrar la acreditación de prensa.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
