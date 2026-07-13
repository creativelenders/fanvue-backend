// ============================================================
// Bulk reindex worker — scans entity tables and rebuilds search_index
// ============================================================

import { getEmbedding } from "./embeddings";
import { SourceType } from "./types";

const BATCH_SIZE = 100;

const TABLE_MAP: Record<SourceType, { table: string; titleField: string }> = {
  fan:               { table: "fans",               titleField: "username" },
  prompt_template:   { table: "prompt_templates",   titleField: "title" },
  content_item:      { table: "content_items",      titleField: "title" },
  media_asset:       { table: "media_assets",       titleField: "alt_text" },
  campaign:          { table: "campaigns",          titleField: "title" },
  automation_rule:   { table: "automation_rules",   titleField: "title" },
  conversation_flow: { table: "conversation_flows", titleField: "title" },
  keyword_trigger:   { table: "keyword_triggers",   titleField: "title" },
  knowledge_document:{ table: "knowledge_documents",titleField: "title" },
};

export async function reindexAll(workspaceId: string, sourceType?: string): Promise<{ indexed: number; failed: number }> {
  const { db } = await import("@/lib/db");
  let indexed = 0, failed = 0, offset = 0;

  const types: SourceType[] = sourceType
    ? [sourceType as SourceType]
    : Object.keys(TABLE_MAP) as SourceType[];

  for (const entityType of types) {
    const tbl = TABLE_MAP[entityType];
    if (!tbl) continue;
    offset = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await db.query(
        `SELECT * FROM ${tbl.table} WHERE workspace_id = $1 ORDER BY id LIMIT $2 OFFSET $3`,
        [workspaceId, BATCH_SIZE, offset]
      );
      if (rows.rows.length === 0) { hasMore = false; break; }

      for (const row of rows.rows) {
        try {
          const text = [row[tbl.titleField], row.description, row.body, row.notes, ...(row.tags ?? [])]
            .filter(Boolean).join(" ").slice(0, 8000);
          const embedding = await getEmbedding(text);
          await db.query(
            `INSERT INTO search_index (id, workspace_id, source_type, title, body, tags, searchable_text, embedding, metadata, is_deleted, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9::jsonb,false,$10)
             ON CONFLICT (id) DO UPDATE SET
               title=EXCLUDED.title, body=EXCLUDED.body, tags=EXCLUDED.tags,
               searchable_text=EXCLUDED.searchable_text, embedding=EXCLUDED.embedding,
               metadata=EXCLUDED.metadata, updated_at=NOW()`,
            [row.id, workspaceId, entityType, row[tbl.titleField] ?? "", row.body ?? row.description ?? "",
             JSON.stringify(row.tags ?? []), text, `[${embedding.join(",")}]`,
             JSON.stringify(row.metadata ?? {}), row.created_by ?? "system"]
          );
          indexed++;
        } catch (e) {
          console.error(`Index fail ${entityType}/${row.id}:`, e);
          failed++;
        }
      }
      offset += BATCH_SIZE;
    }
  }
  return { indexed, failed };
}
