// ============================================================
// Optional Perplexity API connector for live web research
// ============================================================

const API_KEY = process.env.PERPLEXITY_API_KEY;
const MODEL = "sonar-pro"; // or "sonar" for cheaper tier

export interface WebResearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export async function webResearch(query: string): Promise<{
  answer: string;
  results: WebResearchResult[];
}> {
  if (!API_KEY) throw new Error("Perplexity API key not configured");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a web research assistant. Answer concisely and cite URLs.",
        },
        { role: "user", content: query },
      ],
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`Perplexity error ${res.status}`);

  const data = await res.json();
  const answer = data.choices[0].message.content;

  // Extract citations from the answer (Perplexity includes them inline)
  const citations: string[] = data.citations ?? [];
  const results: WebResearchResult[] = citations.map((url: string, i: number) => ({
    title: `Source ${i + 1}`,
    url,
    snippet: answer.split(`[${i + 1}]`)[0]?.slice(-100) ?? "",
    source: new URL(url).hostname,
  }));

  return { answer, results };
}
