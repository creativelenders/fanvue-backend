// ============================================================
// POST /api/search — Main search endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search/orchestrator";
import { SearchQuery } from "@/lib/search/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workspaceId = request.headers.get("x-workspace-id");
    const userId = request.headers.get("x-user-id");
    if (!workspaceId || !userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const query: SearchQuery = {
      rawQuery: body.query,
      workspaceId, userId,
      mode: body.mode ?? "hybrid",
      entityFilter: body.entityFilter,
      dateRange: body.dateRange,
      tags: body.tags,
      limit: Math.min(body.limit ?? 10, 50),
      offset: body.offset ?? 0,
      includeWebResults: body.includeWebResults ?? false,
    };

    if (!query.rawQuery?.trim()) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }

    const response = await search(query);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed", details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined },
      { status: 500 }
    );
  }
}
