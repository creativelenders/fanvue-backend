// ============================================================
// Embedding generation — TEI endpoint or local ogma-mini (ONNX)
// ============================================================

const ENDPOINT = process.env.EMBEDDING_ENDPOINT_URL;
const API_KEY = process.env.EMBEDDING_API_KEY;
const DIMS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? "256", 10);

export async function getEmbedding(text: string): Promise<number[]> {
  if (ENDPOINT) return fromTEI(text);
  return fromLocal(text);
}

async function fromTEI(text: string): Promise<number[]> {
  const res = await fetch(`${ENDPOINT}/embed`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: text, truncate: true }),
  });
  if (!res.ok) throw new Error(`TEI embedding failed: ${res.status}`);
  const data = await res.json();
  return data[0];
}

async function fromLocal(text: string): Promise<number[]> {
  // Lazy-load local ONNX model (ogma-mini — 3.5M params, 14MB)
  const { pipeline } = await import("@xenova/transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/ogma-mini");
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data).slice(0, DIMS);
}
