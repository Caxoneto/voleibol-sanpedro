import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminSessionToken,
  updatePlayerCensusDni,
  normalizeDniLast5,
  isValidDniLast5Format,
} from '@/lib/consent-store';
import { encryptData, generateBlindIndex } from '@/lib/encryption';
import { queryNeon } from '@/lib/streaming-store';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado.',
        },
        { status: 401 }
      );
    }

    const { playerId, dniLast5 } = await req.json();

    if (!playerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de deportista no proporcionado.',
        },
        { status: 400 }
      );
    }

    const res = await updatePlayerCensusDni(playerId, dniLast5 || '');

    if (!res.success) {
      return NextResponse.json(res, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ficha federativa actualizada correctamente.',
    });
  } catch (err) {
    console.error('[Admin Census PATCH] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el censo.',
      },
      { status: 500 }
    );
  }
}

/**
 * Carga masiva de DNIs (por ejemplo pegando texto CSV o filas: "Nombre/Dorsal, DNI")
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cdv_admin_session')?.value;

    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado.',
        },
        { status: 401 }
      );
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere una lista de registros a actualizar.',
        },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const { playerId, dni, birthDate } = item;
      if (!playerId || !dni) continue;

      const cleanDni = dni.trim().toUpperCase().replace(/[\s-]/g, '');
      const norm = normalizeDniLast5(cleanDni);
      const isFullDni = cleanDni.length >= 8;
      const last5 = cleanDni.length > 5 ? cleanDni.slice(-5) : norm;

      if (isValidDniLast5Format(last5)) {
        const dniEncrypted = isFullDni ? encryptData(cleanDni) : null;
        const dniBlindIndex = cleanDni ? generateBlindIndex(cleanDni) : null;
        const birthDateEncrypted = birthDate ? encryptData(birthDate) : null;

        await queryNeon(
          `UPDATE player_census 
           SET dni_last5 = $1,
               dni_encrypted = COALESCE($2, dni_encrypted),
               dni_blind_index = COALESCE($3, dni_blind_index),
               birth_date_encrypted = COALESCE($4, birth_date_encrypted),
               updated_at = NOW() 
           WHERE player_id = $5;`,
          [last5, dniEncrypted, dniBlindIndex, birthDateEncrypted, playerId]
        );
        updatedCount++;
      } else {
        errors.push(`Formato no válido para ${playerId}: ${dni}`);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      errors,
    });
  } catch (err) {
    console.error('[Admin Census POST bulk] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la actualización masiva.',
      },
      { status: 500 }
    );
  }
}
