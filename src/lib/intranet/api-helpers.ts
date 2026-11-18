import { NextResponse } from 'next/server';
import { NeonUnavailableError } from '@/lib/streaming-store';
import {
  IntranetAuthError,
  IntranetForbiddenError,
  IntranetValidationError,
} from './rbac';

const KNOWN_CLIENT_ERROR_PREFIXES = [
  'Correo electrónico no válido',
  'La contraseña del Presidente',
  'Ya existe un Presidente activo',
  'Producto o modalidad de pago no encontrada',
  'El importe del cobro',
  'Es obligatorio indicar el motivo',
  'El cobro no existe',
  'Uno o más cargos',
  'La suma de imputaciones',
];

/**
 * Normaliza errores de dominio, RBAC, autenticación y BD en respuestas JSON seguras
 * sin exponer detalles internos ni mensajes SQL al cliente.
 */
export function handleIntranetApiError(err: unknown, contextLabel: string): NextResponse {
  if (err instanceof IntranetAuthError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
  if (err instanceof IntranetForbiddenError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 403 });
  }
  if (err instanceof IntranetValidationError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
  }
  if (err instanceof NeonUnavailableError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
  }

  console.error(`[${contextLabel}]`, err);

  const rawMsg = err instanceof Error ? err.message : '';
  const isDbError =
    Boolean(err && typeof err === 'object' && 'code' in err) ||
    (err instanceof Error && err.name === 'NeonDbError');

  if (!isDbError && KNOWN_CLIENT_ERROR_PREFIXES.some((prefix) => rawMsg.startsWith(prefix))) {
    return NextResponse.json({ success: false, error: rawMsg }, { status: 400 });
  }

  return NextResponse.json(
    { success: false, error: 'Error interno procesando la solicitud.' },
    { status: 500 }
  );
}
