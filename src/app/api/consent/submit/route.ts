import { NextRequest, NextResponse } from 'next/server';
import { submitPlayerConsent, ConsentSubmissionPayload } from '@/lib/consent-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Desconocido';

    const payload: ConsentSubmissionPayload = {
      playerId: body.playerId,
      playerName: body.playerName,
      teamId: body.teamId,
      isMinor: !!body.isMinor,
      dniLast5: body.dniLast5,
      signerType: body.signerType || (body.isMinor ? 'PARENT' : 'SELF_ADULT'),
      signerName: body.signerName,
      signerDni: body.signerDni,
      signerRelationship: body.signerRelationship || (body.isMinor ? 'PADRE' : 'PROPIO_JUGADOR'),
      signerEmail: body.signerEmail,
      signerPhone: body.signerPhone,
      consentSocialMedia: !!body.consentSocialMedia,
      consentStreaming: !!body.consentStreaming,
      consentPress: !!body.consentPress,
      signatureData: body.signatureData,
      legalVersion: 'v1_2026_11',
      ipAddress,
      userAgent
    };

    const result = await submitPlayerConsent(payload);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al guardar la autorización.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      consentId: result.consentId,
      documentHash: result.documentHash,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API Consent Submit] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor al registrar la autorización.',
      },
      { status: 500 }
    );
  }
}
