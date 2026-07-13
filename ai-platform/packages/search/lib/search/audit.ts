// ============================================================
// Search audit logging
// ============================================================

import { db } from "@/lib/db";

export async function logSearchAudit(
  workspaceId: string,
  userId: string,
  action: "search" | "index" | "reindex" | "delete",
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await db.query(
    `INSERT INTO search_audit_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [workspaceId, userId, action, entityType ?? null, entityId ?? null, JSON.stringify(metadata ?? {})]
  );
}
