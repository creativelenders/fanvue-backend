// ============================================================
// Retrieval — keyword FTS + vector similarity + hybrid RRF
// ============================================================

import { db } from "@/lib/db"; // your database client
import { SearchQuery, SearchResult, SourceType } from "./types";

/**
 * PostgreSQL full-text search using ts_vector.
 * Expects a GIN index on searchable_text_tsv.
 */
export async function keywordSearch(
  query: SearchQuery
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const searchTerm = query.rewriteQuery ?? query.rawQuery;
  const tsquery = searchTerm
    .split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, "") + ":*")
    .join(" & ");

  const where: string[] = ["workspace_id = $1", "is_deleted = false"];
  const params: unknown[] = [query.workspaceId];
  let idx = 2;

  if (query.entityFilter?.length) {
    where.push(`source_type = ANY($${idx})`);
    params.push(query.entityFilter);
    idx++;
  }

  const sql = `
    SELECT id, source_type, title, body,
      ts_rank(searchable_text_tsv, to_tsquery('english', $${idx})) AS rank,
      ts_headline('english', body, to_tsquery('english', $${idx}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15') AS headline
    FROM search_index
    WHERE ${where.join(" AND ")}
      AND searchable_text_tsv @@ to_tsquery('english', $${idx})
    ORDER BY rank DESC
    LIMIT $${idx + 1} OFFSET $${idx + 2}`;

  params.push(tsquery, query.limit, query.offset);
  const result = await db.query(sql, params);
  return { results: result.rows.map(mapRow), totalCount: result.rows.length };
}

/**
 * Vector similarity search via pgvector (cosine distance).
 */
export async function vectorSearch(
  query: SearchQuery,
  embedding: number[]
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const embStr = `[${embedding.join(",")}]`;
  const where: string[] = ["workspace_id = $1", "is_deleted = false", "embedding IS NOT NULL"];
  const params: unknown[] = [query.workspaceId];
  let idx = 2;

  if (query.entityFilter?.length) {
    where.push(`source_type = ANY($${idx})`);
    params.push(query.entityFilter);
    idx++;
  }

  const sql = `
    SELECT id, source_type, title, body,
      1 - (embedding <=> $${idx}::vector) AS similarity
    FROM search_index
    WHERE ${where.join(" AND ")}
    ORDER BY embedding <=> $${idx}::vector
    LIMIT $${idx + 1}`;

  params.push(embStr, query.limit);
  const result = await db.query(sql, params);
  return {
    results: result.rows.map((r: any) => ({
      id: r.id, score: r.similarity,
      sourceType: r.source_type as SourceType,
      title: r.title, snippet: r.body.slice(0, 200),
      url: `/${r.source_type}s/${r.id}`,
      entity: {}, highlights: [],
      permissionLevel: "viewer", metadata: {},
    })),
    totalCount: result.rows.length,
  };
}

/**
 * Hybrid: run keyword + vector in parallel, fuse with Reciprocal Rank Fusion.
 */
export async function hybridSearch(
  query: SearchQuery,
  embedding: number[]
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const [kw, vec] = await Promise.all([
    keywordSearch(query),
    vectorSearch(query, embedding),
  ]);
  const fused = fuseResults(
    [{ items: kw.results, k: 60 }, { items: vec.results, k: 60 }],
    query.limit
  );
  return { results: fused, totalCount: fused.length };
}

function fuseResults(sets: { items: SearchResult[]; k: number }[], limit: number): SearchResult[] {
  const scores = new Map<string, { score: number; item: SearchResult }>();
  for (const { items, k } of sets) {
    items.forEach((item, i) => {
      const existing = scores.get(item.id);
      const rrf = 1 / (k + i + 1);
      if (existing) existing.score += rrf;
      else scores.set(item.id, { score: rrf, item });
    });
  }
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => ({ ...s.item, score: s.score }));
}

function mapRow(row: any): SearchResult {
  return {
    id: row.id, score: row.rank ?? 0,
    sourceType: row.source_type as SourceType,
    title: row.title, snippet: row.headline ?? row.body.slice(0, 200),
    url: `/${row.source_type}s/${row.id}`,
    entity: {}, highlights: [], permissionLevel: "viewer", metadata: {},
  };
}
