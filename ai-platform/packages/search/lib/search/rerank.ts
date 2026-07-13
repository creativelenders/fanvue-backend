// ============================================================
// Reranker — score normalization, recency boost, entity boosts
// ============================================================

import { SearchResult, SearchQuery } from "./types";

export interface RerankConfig {
  recencyBoost: number;
  entityBoosts: Partial<Record<string, number>>;
  scoreFloor: number;
}

const DEFAULT: RerankConfig = {
  recencyBoost: 1.15,
  entityBoosts: { fan: 1.0, prompt_template: 1.0, campaign: 1.05, automation_rule: 0.95 },
  scoreFloor: 0.1,
};

export function rerank(
  results: SearchResult[],
  _query: SearchQuery,
  config: RerankConfig = DEFAULT
): SearchResult[] {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return results
    .filter(r => r.score >= config.scoreFloor)
    .map(r => {
      let s = r.score;
      if (r.entity && "updatedAt" in (r.entity as any)) {
        const t = new Date((r.entity as any).updatedAt).getTime();
        if (now - t < sevenDays) s *= config.recencyBoost;
      }
      const eb = config.entityBoosts[r.sourceType];
      if (eb) s *= eb;
      return { ...r, score: Math.min(s, 1.0) };
    })
    .sort((a, b) => b.score - a.score);
}
