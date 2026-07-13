// ============================================================
// GET /api/search/recent — User's recent search history
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = request.headers.get("x-workspace-id");
  const userId = request.headers.get("x-user-id");
  if (!workspaceId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/lib/db");
  const result = await db.query(
    `SELECT query, entity_filter, created_at FROM search_history
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY created_at DESC LIMIT 10`,
    [workspaceId, userId]
  );

  return NextResponse.json({
    searches: result.rows.map((r: any) => ({
      query: r.query,
      entityFilter: r.entity_filter,
      timestamp: r.created_at,
    })),
  });
}
