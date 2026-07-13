// ============================================================
// Qwythos inference client — HF Inference Endpoint (llama.cpp container)
// Uses OpenAI-compatible /v1/chat/completions API
// ============================================================

import { db } from "@/lib/db";
import { getEmbedding } from "./embeddings";

const ENDPOINT = (process.env.OMNIROUTE_BASE_URL ?? process.env.QWYTHOS_ENDPOINT_URL ?? "http://localhost:20128/v1").replace(/\/$/, "");
const API_KEY = process.env.OMNIROUTE_API_KEY ?? process.env.QWYTHOS_API_KEY ?? "";
const MODEL = process.env.HERMES_MODEL ?? process.env.QWYTHOS_MODEL ?? "Nous-Hermes-3";

interface Opts {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

export async function qwythosComplete(opts: Opts): Promise<string> {
  const res = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 256,
      temperature: opts.temperature ?? 0.1,
      stop: opts.stop,
    }),
  });
  if (!res.ok) throw new Error(`Qwythos error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function chatCompletionsUrl(): string {
  return ENDPOINT.endsWith("/v1")
    ? `${ENDPOINT}/chat/completions`
    : `${ENDPOINT}/v1/chat/completions`;
}

export interface SubscriberContextSnippet {
  id: string;
  score: number;
  snippet: string;
  preferenceMarkers: string[];
  createdAt?: string;
}

/**
 * Retrieve subscriber-specific semantic memory for Hermes CRM prompts.
 * Expects conversation/preference documents in search_index with metadata.subscriber_id
 * or metadata.subscriberId. Returns only the top 3 compact snippets.
 */
export async function getSubscriberContext(
  subscriberId: string,
  query: string
): Promise<SubscriberContextSnippet[]> {
  const embedding = await getEmbedding(query);
  const embStr = `[${embedding.join(",")}]`;
  const sql = `
    SELECT id, body, metadata, created_at,
      1 - (embedding <=> $2::vector) AS similarity
    FROM search_index
    WHERE is_deleted = false
      AND embedding IS NOT NULL
      AND (
        metadata->>'subscriber_id' = $1
        OR metadata->>'subscriberId' = $1
        OR metadata->>'fan_uuid' = $1
      )
    ORDER BY embedding <=> $2::vector
    LIMIT 3`;
  const result = await db.query(sql, [subscriberId, embStr]);
  return result.rows.map((row: any) => {
    const metadata = row.metadata ?? {};
    const markers = metadata.preference_markers ?? metadata.preferenceMarkers ?? metadata.tags ?? [];
    return {
      id: row.id,
      score: Number(row.similarity ?? 0),
      snippet: String(row.body ?? "").replace(/\s+/g, " ").slice(0, 420),
      preferenceMarkers: Array.isArray(markers) ? markers.map(String).slice(0, 8) : [],
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    };
  });
}
