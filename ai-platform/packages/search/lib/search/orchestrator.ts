// ============================================================
// Search Orchestrator — central coordinator
// ============================================================
// Flow: classify intent -> rewrite query -> determine strategy
// -> route to retriever -> rerank -> summarize with Qwythos

import { SearchQuery, SearchResponse, SearchIntent } from "./types";
import { getSubscriberContext, qwythosComplete, SubscriberContextSnippet } from "./qwythos-client";
import { keywordSearch, vectorSearch, hybridSearch } from "./retrieval";
import { rerank } from "./rerank";
import { getEmbedding } from "./embeddings";
import {
  INTENT_CLASSIFIER_PROMPT,
  QUERY_REWRITER_PROMPT,
  ENTITY_ROUTER_PROMPT,
  RETRIEVAL_STRATEGY_PROMPT,
  buildSummarizerPrompt,
} from "./prompts";

export async function search(query: SearchQuery): Promise<SearchResponse> {
  const startTime = performance.now();

  // 1. Classify intent (parallel with rewrite)
  const [intent, rewritten] = await Promise.all([
    classifyIntent(query.rawQuery).catch(() => "semantic" as SearchIntent),
    rewriteQuery(query.rawQuery).catch(() => query.rawQuery),
  ]);
  query.intent = intent;
  query.rewriteQuery = rewritten;

  // 2. Determine strategy and entity targets
  const [strategy, targetEntities] = await Promise.all([
    determineStrategy(intent, rewritten).catch(() => "hybrid"),
    determineEntities(intent, rewritten).catch(() => null as string[] | null),
  ]);
  query.mode = strategy as SearchQuery["mode"];
  if (targetEntities?.length) {
    query.entityFilter = targetEntities as any;
  }

  // 3. Generate embedding for vector/hybrid search
  let embedding: number[] | null = null;
  if (strategy === "vector" || strategy === "hybrid") {
    try { embedding = await getEmbedding(query.rewriteQuery!); }
    catch { query.mode = "keyword"; }
  }

  // 4. Execute retrieval
  let results;
  switch (query.mode) {
    case "keyword":
      results = await keywordSearch(query);
      break;
    case "vector":
      results = embedding ? await vectorSearch(query, embedding) : await keywordSearch(query);
      break;
    case "hybrid":
      results = embedding ? await hybridSearch(query, embedding) : await keywordSearch(query);
      break;
    default:
      results = await hybridSearch(query, embedding ?? []);
  }

  // 5. Rerank
  const reranked = rerank(results.results, query);

  // 6. Generate AI answer from top results
  let aiAnswer: string | null = null;
  const topK = reranked.slice(0, 5);
  if (topK.length > 0) {
    try {
      const sp = buildSummarizerPrompt(query.rawQuery, topK);
      aiAnswer = await qwythosComplete({
        messages: [
          { role: "system", content: sp.system },
          { role: "user", content: sp.user },
        ],
        maxTokens: 400, temperature: 0.1,
      });
    } catch { /* AI answer optional */ }
  }

  const latencyMs = Math.round(performance.now() - startTime);
  return {
    query, aiAnswer,
    citations: topK.map(r => ({ id: r.id, title: r.title, snippet: r.snippet })),
    results: reranked, totalCount: results.totalCount,
    facets: countByType(reranked),
    suggestedActions: deriveActions(intent, reranked),
    latencyMs,
  };
}

export interface CompressedSubscriberContext {
  subscriberId: string;
  query: string;
  summary: string;
  preferenceMarkers: string[];
  memories: { id: string; score: number; snippet: string }[];
}

export async function buildCompressedSubscriberContext(
  subscriberId: string,
  query: string
): Promise<CompressedSubscriberContext> {
  const context = await getSubscriberContext(subscriberId, query);
  return compressSubscriberContext(subscriberId, query, context);
}

export function compressSubscriberContext(
  subscriberId: string,
  query: string,
  context: SubscriberContextSnippet[]
): CompressedSubscriberContext {
  const preferenceMarkers = Array.from(
    new Set(context.flatMap(item => item.preferenceMarkers ?? []))
  ).slice(0, 12);
  const memories = context.slice(0, 3).map(item => ({
    id: item.id,
    score: Number(item.score.toFixed?.(4) ?? item.score),
    snippet: trimForContext(item.snippet, 360),
  }));
  const summaryParts = [
    preferenceMarkers.length ? `Preferences: ${preferenceMarkers.join(", ")}.` : "",
    ...memories.map((item, index) => `Memory ${index + 1}: ${item.snippet}`),
  ].filter(Boolean);
  return {
    subscriberId,
    query: trimForContext(query, 240),
    summary: trimForContext(summaryParts.join(" "), 1800),
    preferenceMarkers,
    memories,
  };
}

async function classifyIntent(raw: string): Promise<SearchIntent> {
  const r = await qwythosComplete({
    messages: [
      { role: "system", content: INTENT_CLASSIFIER_PROMPT.system },
      { role: "user", content: raw },
    ],
    maxTokens: 5, temperature: 0.0,
  });
  const valid: SearchIntent[] = ["lookup","semantic","factoid","explore","external"];
  return valid.includes(r as SearchIntent) ? (r as SearchIntent) : "semantic";
}

async function rewriteQuery(raw: string): Promise<string> {
  return qwythosComplete({
    messages: [
      { role: "system", content: QUERY_REWRITER_PROMPT.system },
      { role: "user", content: raw },
    ],
    maxTokens: 60, temperature: 0.1,
  });
}

async function determineStrategy(intent: SearchIntent, rewritten: string): Promise<string> {
  if (intent === "lookup") return "keyword";
  if (intent === "external") return "web";
  if (intent === "factoid") return "hybrid";
  return qwythosComplete({
    messages: [
      { role: "system", content: RETRIEVAL_STRATEGY_PROMPT.system },
      { role: "user", content: rewritten },
    ],
    maxTokens: 5, temperature: 0.0,
  });
}

async function determineEntities(intent: SearchIntent, rewritten: string): Promise<string[] | null> {
  if (intent === "external") return null;
  const r = await qwythosComplete({
    messages: [
      { role: "system", content: ENTITY_ROUTER_PROMPT.system },
      { role: "user", content: rewritten },
    ],
    maxTokens: 20, temperature: 0.0,
  });
  return r.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean);
}

function countByType(results: any[]) {
  const counts: Record<string, number> = {};
  for (const r of results) counts[r.sourceType] = (counts[r.sourceType] ?? 0) + 1;
  return Object.entries(counts).map(([sourceType, count]) => ({ sourceType: sourceType as any, count }));
}

function deriveActions(intent: string, results: any[]) {
  const actions: any[] = [];
  if (results.length > 0) actions.push({ label: `Open: ${results[0].title}`, action: `navigate:${results[0].url}`, context: results[0].sourceType });
  return actions;
}

function trimForContext(value: string, maxChars: number): string {
  const compact = String(value ?? "").replace(/\s+/g, " ").trim();
  return compact.length <= maxChars ? compact : compact.slice(0, maxChars - 1).trimEnd() + "…";
}
