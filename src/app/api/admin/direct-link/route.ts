import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminSessionToken,
  createDirectConsentToken,
  getPlayerDataForDirectConsent,
  updatePlayerCensusParentInfo,
  DirectConsentPrefill,
} from '@/lib/consent-store';
import { CLUB_INFO } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Debes iniciar sesión como administrador.',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { playerId, daysValid = 30, customPrefill, saveToCensus } = body;

    if (!playerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere el identificador del deportista.',
        },
        { status: 400 }
      );
    }

    // Si el administrador solicitó guardar los datos de contacto en la ficha permanente del censo
    if (saveToCensus && customPrefill) {
      await updatePlayerCensusParentInfo(playerId, customPrefill);
    }

    const playerResult = await getPlayerDataForDirectConsent(playerId, customPrefill);
    if (!playerResult.valid || !playerResult.player) {
      return NextResponse.json(
        {
          success: false,
          error: playerResult.error || 'Deportista no encontrado.',
        },
        { status: 404 }
      );
    }

    const player = playerResult.player;
    const effectivePrefill: DirectConsentPrefill = {
      ...(playerResult.prefilledData || {}),
      ...(customPrefill || {}),
    };

    const directToken = createDirectConsentToken(playerId, effectivePrefill, daysValid);

    // Determinar la URL base según host de la petición o dominio oficial
    const host = req.headers.get('host') || 'voleibolsanpedro.es';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const directUrl = `${protocol}://${host}/autorizaciones?directToken=${directToken}`;

    // Mensaje adaptado para WhatsApp personalizado con el nombre del destinatario
    let whatsappText = '';
    const recipientName = effectivePrefill.signerName ? `*${effectivePrefill.signerName}*` : 'estimada familia';

    if (player.isMinor) {
      whatsappText = `Hola ${recipientName}, te escribimos desde el ${CLUB_INFO.name}.

Por favor, accede al siguiente enlace oficial para firmar digitalmente las autorizaciones de la temporada 2026/2027 (Cesión de Imagen y Desplazamientos) de *${player.name}* (${player.teamName}):

👉 ${directUrl}

Hemos auto-rellenado los datos de los que disponemos para tu comodidad; solo debes revisarlos y trazar la firma en pantalla. ¡Muchas gracias por tu colaboración!`;
    } else {
      whatsappText = `Hola *${player.name}*, te escribimos desde el ${CLUB_INFO.name}.

Por favor, accede al siguiente enlace oficial para formalizar tus autorizaciones oficiales de la temporada 2026/2027 (${player.teamName}):

👉 ${directUrl}

Tus datos federativos ya están pre-rellenados; solo debes revisarlos y firmar. ¡Muchas gracias!`;
    }

    return NextResponse.json({
      success: true,
      player,
      prefilledData: effectivePrefill,
      directToken,
      directUrl,
      whatsappText,
      expiresInDays: daysValid,
    });
  } catch (err) {
    console.error('[Admin Direct Link POST] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar el enlace directo.',
      },
      { status: 500 }
    );
  }
}
