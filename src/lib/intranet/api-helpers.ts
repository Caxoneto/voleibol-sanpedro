import { NextResponse } from 'next/server';
import { NeonUnavailableError } from '@/lib/streaming-store';
import { IntranetAuthError, IntranetForbiddenError } from './rbac';

/**
 * Normaliza errores de dominio, RBAC, autenticación y BD en respuestas JSON seguras.
 */
export function handleIntranetApiError(err: unknown, contextLabel: string): NextResponse {
  if (err instanceof IntranetAuthError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
  if (err instanceof IntranetForbiddenError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 403 });
  }
  if (err instanceof NeonUnavailableError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
  }
  const msg = err instanceof Error ? err.message : 'Error interno procesando la solicitud.';
  console.error(`[${contextLabel}]`, err);
  const status = msg.toLowerCase().includes('no encontrado') || msg.toLowerCase().includes('no válido') ? 400 : 500;
  return NextResponse.json({ success: false, error: msg }, { status });
}
