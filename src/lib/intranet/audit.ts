import { queryNeon } from '@/lib/streaming-store';

export interface AuditLogInput {
  actorUserId?: string | null;
  actorEmail: string;
  action: string;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  action: string;
  module: string;
  targetType: string | null;
  targetId: string | null;
  detailsJson: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Registra un evento en la bitácora persistente de auditoría de la intranet (`intranet_audit_logs`).
 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await queryNeon(
      `INSERT INTO intranet_audit_logs (
         actor_user_id, actor_email, action, module, target_type, target_id, details_json, ip_address
       ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8);`,
      [
        input.actorUserId || null,
        input.actorEmail.trim().toLowerCase() || 'sistema@voleibolsanpedro.es',
        input.action.slice(0, 120),
        input.module.slice(0, 60),
        input.targetType || null,
        input.targetId || null,
        JSON.stringify(input.details || {}),
        input.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[Intranet Audit] Error guardando auditoría:', err);
  }
}

/**
 * Lista eventos recientes de auditoría con filtros opcionales por módulo o actor.
 */
export async function listAuditLogs(filters?: {
  module?: string;
  search?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const limit = Math.min(Math.max(1, Number(filters?.limit || 80)), 250);
  const mod = filters?.module?.trim() || null;
  const search = filters?.search?.trim() ? `%${filters.search.trim().toLowerCase()}%` : null;

  const rows = await queryNeon<{
    id: string;
    actor_user_id: string | null;
    actor_email: string;
    action: string;
    module: string;
    target_type: string | null;
    target_id: string | null;
    details_json: Record<string, unknown>;
    ip_address: string | null;
    created_at: string;
  }>(
    `SELECT
       id::text AS id,
       actor_user_id::text AS actor_user_id,
       actor_email,
       action,
       module,
       target_type,
       target_id,
       COALESCE(details_json, '{}'::jsonb) AS details_json,
       ip_address,
       created_at::text AS created_at
     FROM intranet_audit_logs
     WHERE ($1::text IS NULL OR module = $1)
       AND (
         $2::text IS NULL
         OR LOWER(actor_email) LIKE $2
         OR LOWER(action) LIKE $2
         OR LOWER(COALESCE(target_id, '')) LIKE $2
       )
     ORDER BY created_at DESC
     LIMIT $3;`,
    [mod, search, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    action: r.action,
    module: r.module,
    targetType: r.target_type,
    targetId: r.target_id,
    detailsJson: typeof r.details_json === 'object' && r.details_json ? r.details_json : {},
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
}
