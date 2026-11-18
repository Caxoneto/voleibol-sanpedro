import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { queryNeon } from '@/lib/streaming-store';
import { encryptData, decryptDataStrict } from '@/lib/encryption';
import { checkNeonRateLimit, getClientIp } from '@/lib/rate-limiter';
import {
  requireIntranetSession,
  generateTotpSecret,
  buildTotpOtpauthUri,
  verifyTotpCode,
  generateBackupCodes,
  encryptTotpSecret,
  decryptTotpSecret,
  markSessionTwoFactorVerified,
} from '@/lib/intranet/auth';
import { recordAuditLog } from '@/lib/intranet/audit';
import { handleIntranetApiError } from '@/lib/intranet/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intranet/auth/2fa -> Genera un nuevo secreto TOTP pendiente de confirmación.
 */
export async function GET() {
  try {
    const ctx = await requireIntranetSession({ allowPendingTwoFactor: true });
    if (ctx.user.totpEnabled) {
      return NextResponse.json({
        success: true,
        totpEnabled: true,
        twoFactorVerified: ctx.twoFactorVerified,
      });
    }

    const secret = generateTotpSecret();
    const otpauthUri = buildTotpOtpauthUri(ctx.user.email, secret);
    const encPending = encryptTotpSecret(ctx.user.id, secret);

    await queryNeon(
      `UPDATE intranet_users SET totp_secret_enc = $2, updated_at = NOW() WHERE id = $1::uuid;`,
      [ctx.user.id, encPending]
    );

    return NextResponse.json({
      success: true,
      totpEnabled: false,
      secret,
      otpauthUri,
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet 2FA Setup');
  }
}

/**
 * POST /api/intranet/auth/2fa -> Activa 2FA (action: 'enable') o verifica código TOTP/respaldo (action: 'verify').
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const ctx = await requireIntranetSession({ allowPendingTwoFactor: true });

    const rl = await checkNeonRateLimit(`intranet-2fa:${ctx.user.id}:${clientIp}`, 6, 300, 600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos de 2FA. Espera unos minutos.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const action = body?.action === 'enable' ? 'enable' : 'verify';
    const code = String(body?.code || '').trim().toUpperCase();

    const rows = await queryNeon<{
      totp_secret_enc: string | null;
      totp_enabled: boolean;
      totp_backup_codes_enc: string | null;
    }>(
      `SELECT totp_secret_enc, totp_enabled, totp_backup_codes_enc
       FROM intranet_users WHERE id = $1::uuid LIMIT 1;`,
      [ctx.user.id]
    );

    const row = rows[0];
    const secret = decryptTotpSecret(ctx.user.id, row?.totp_secret_enc || null);
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Primero debes generar la clave TOTP de configuración.' },
        { status: 400 }
      );
    }

    if (action === 'enable') {
      if (!verifyTotpCode(secret, code)) {
        return NextResponse.json(
          { success: false, error: 'El código de 6 dígitos no coincide. Revisa la hora de tu móvil.' },
          { status: 400 }
        );
      }

      const backupCodes = generateBackupCodes();
      const backupEnc = encryptData(JSON.stringify(backupCodes), `totp-backup:${ctx.user.id}`);

      await queryNeon(
        `UPDATE intranet_users
         SET totp_enabled = true, totp_backup_codes_enc = $2, updated_at = NOW()
         WHERE id = $1::uuid;`,
        [ctx.user.id, backupEnc]
      );
      await markSessionTwoFactorVerified(ctx.sessionId);

      await recordAuditLog({
        actorUserId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: 'ENABLE_2FA',
        module: 'Auth',
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        backupCodes,
        redirectTo: ctx.isStaff ? '/club' : '/mi-club',
      });
    }

    // action === 'verify'
    let valid = verifyTotpCode(secret, code);

    // Admitir código de respaldo de un solo uso
    if (!valid && row?.totp_backup_codes_enc && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      const dec = decryptDataStrict(row.totp_backup_codes_enc, `totp-backup:${ctx.user.id}`);
      if (dec.ok && dec.value) {
        const list = JSON.parse(dec.value) as string[];
        const idx = list.findIndex(
          (item) =>
            item.length === code.length &&
            crypto.timingSafeEqual(Buffer.from(item, 'utf8'), Buffer.from(code, 'utf8'))
        );
        if (idx >= 0) {
          valid = true;
          list.splice(idx, 1);
          const reEnc = encryptData(JSON.stringify(list), `totp-backup:${ctx.user.id}`);
          await queryNeon(
            `UPDATE intranet_users SET totp_backup_codes_enc = $2 WHERE id = $1::uuid;`,
            [ctx.user.id, reEnc]
          );
        }
      }
    }

    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Código de autenticación en dos pasos incorrecto.' },
        { status: 401 }
      );
    }

    await markSessionTwoFactorVerified(ctx.sessionId);
    await recordAuditLog({
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: 'VERIFY_2FA',
      module: 'Auth',
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      redirectTo: ctx.isStaff ? '/club' : '/mi-club',
    });
  } catch (err) {
    return handleIntranetApiError(err, 'Intranet 2FA Verify');
  }
}
