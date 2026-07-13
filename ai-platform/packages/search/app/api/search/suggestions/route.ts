// ============================================================
// GET /api/search/suggestions?q=... — Auto-complete suggestions
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const workspaceId = request.headers.get("x-workspace-id");
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/lib/db");
  const result = await db.query(
    `SELECT DISTINCT title FROM search_index
     WHERE workspace_id = $1 AND is_deleted = false AND title ILIKE $2
     ORDER BY title LIMIT 10`,
    [workspaceId, `%${q}%`]
  );

  return NextResponse.json({ suggestions: result.rows.map((r: any) => r.title) });
}
