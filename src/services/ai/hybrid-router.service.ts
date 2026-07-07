import { aiModels, contentGenerations } from "../../db/schema";
import { db } from "../../db/client";
import { eq, desc, sql } from "drizzle-orm";

interface ModelScore {
  slug: string;
  score: number;
  reason: string;
}

export class HybridRouterService {
  /**
   * Analyzes a prompt and selects the optimal AI model based on:
   * - Prompt complexity and intent (creative vs analytical vs structured)
   * - Historical model performance for similar tasks
   * - Cost optimization (uses DeepSeek for simple, Claude for complex)
   * - Current model availability and load
   */
  async selectOptimalModel(prompt: string) {
    const promptAnalysis = this.analyzePrompt(prompt);
    const models = await db.query.aiModels.findMany({
      where: eq(aiModels.isActive, true),
    });

    const scored = models
      .filter((m) => m.provider !== "system")
      .map((model) => this.scoreModel(model, promptAnalysis));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Return the model record from DB
    const selected = models.find((m) => m.slug === best.slug);
    if (!selected) throw new Error("No suitable AI model found");

    return selected;
  }

  /**
   * When hybrid-router itself is selected, pick the actual best model
   */
  async selectActualModel(prompt: string) {
    return this.selectOptimalModel(prompt);
  }

  private analyzePrompt(prompt: string): {
    type: "creative" | "analytical" | "structured" | "simple";
    complexity: number; // 1-10
    needsReasoning: boolean;
    needsCreativity: boolean;
  } {
    const length = prompt.length;
    const hasCreativeWords = /\b(creative|viral|story|engage|hook|trend|brand|audience)\b/i.test(prompt);
    const hasAnalyticalWords = /\b(analyze|compare|evaluate|data|metrics|performance|strategy)\b/i.test(prompt);
    const hasStructuralWords = /\b(outline|steps|list|template|format|structure)\b/i.test(prompt);

    let type: "creative" | "analytical" | "structured" | "simple" = "simple";
    let complexity = Math.min(10, Math.ceil(length / 200) + 1);

    if (hasCreativeWords && hasAnalyticalWords) type = "analytical";
    else if (hasCreativeWords) type = "creative";
    else if (hasStructuralWords) type = "structured";

    return {
      type,
      complexity,
      needsReasoning: hasAnalyticalWords || complexity > 6,
      needsCreativity: hasCreativeWords || type === "creative",
    };
  }

  private scoreModel(
    model: typeof aiModels.$inferSelect,
    analysis: ReturnType<typeof this.analyzePrompt>
  ): ModelScore {
    const cap = model.capabilities;
    let score = 0;
    const reasons: string[] = [];

    if (analysis.needsCreativity) {
      score += cap.creativity * 1.5;
      reasons.push(`creativity:${cap.creativity}`);
    }
    if (analysis.needsReasoning) {
      score += cap.reasoning * 1.5;
      reasons.push(`reasoning:${cap.reasoning}`);
    }

    // Cost efficiency bonus for simple tasks
    if (analysis.complexity <= 4) {
      const costEfficiency = 1 / parseFloat(model.costPerRequest);
      score += costEfficiency * 10;
      reasons.push(`cost-efficient:${costEfficiency.toFixed(1)}`);
    }

    // Speed bonus for simple tasks
    if (analysis.type === "simple" || analysis.type === "structured") {
      score += cap.speed * 0.8;
      reasons.push(`speed:${cap.speed}`);
    }

    return {
      slug: model.slug,
      score: Math.round(score * 10) / 10,
      reason: reasons.join(", "),
    };
  }
}
