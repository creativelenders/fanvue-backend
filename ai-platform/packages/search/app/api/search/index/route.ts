// ============================================================
// POST /api/search/index — Indexing endpoint
// Actions: index, reindex, delete
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getEmbedding } from "@/lib/search/embeddings";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const workspaceId = request.headers.get("x-workspace-id");
  const userId = request.headers.get("x-user-id");
  if (!workspaceId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  switch (body.action) {
    case "index":   return handleIndex(body.entity, workspaceId, userId);
    case "reindex": return handleReindex(workspaceId, body.sourceType);
    case "delete":  return handleDelete(body.entityId, workspaceId);
    default:        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

async function handleIndex(entity: any, workspaceId: string, userId: string) {
  const { db } = await import("@/lib/db");
  const text = [entity.title, entity.description, entity.body, ...(entity.tags ?? [])].filter(Boolean).join(" ");
  let embedding: number[] | null = null;
  try { embedding = await getEmbedding(text); } catch (e) { console.warn("Embedding failed", e); }

  await db.query(
    `INSERT INTO search_index (id, workspace_id, source_type, title, body, tags, searchable_text, embedding, metadata, is_deleted, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9::jsonb,false,$10)
     ON CONFLICT (id) DO UPDATE SET
       title=EXCLUDED.title, body=EXCLUDED.body, tags=EXCLUDED.tags,
       searchable_text=EXCLUDED.searchable_text, embedding=EXCLUDED.embedding,
       metadata=EXCLUDED.metadata, updated_at=NOW()`,
    [entity.id, workspaceId, entity.sourceType, entity.title, entity.body ?? entity.description ?? "",
     JSON.stringify(entity.tags ?? []), text,
     embedding ? `[${embedding.join(",")}]` : null,
     JSON.stringify(entity.metadata ?? {}), userId]
  );
  return NextResponse.json({ indexed: true, id: entity.id });
}

async function handleReindex(workspaceId: string, sourceType?: string) {
  const { reindexAll } = await import("@/lib/search/index-worker");
  reindexAll(workspaceId, sourceType).catch(console.error);
  return NextResponse.json({ reindexing: true, message: `Reindex started for ${workspaceId}${sourceType ? ", type: " + sourceType : ""}` });
}

async function handleDelete(entityId: string, workspaceId: string) {
  const { db } = await import("@/lib/db");
  await db.query("UPDATE search_index SET is_deleted=true, updated_at=NOW() WHERE id=$1 AND workspace_id=$2", [entityId, workspaceId]);
  return NextResponse.json({ deleted: true });
}
