// @ts-nocheck
import type { AICompletionRequest, AICompletionResult } from "./ai.service";
import { InternalServerError } from "../../utils/errors";

export class ClaudeClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
  }

  async complete(
    modelSlug: string,
    request: AICompletionRequest
  ): Promise<AICompletionResult> {
    if (!this.apiKey) {
      // Return mock for development
      return this.mockResponse(modelSlug, request);
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: request.maxTokens || 2048,
          temperature: request.temperature ?? 0.7,
          system: request.systemPrompt || "You are Claude Brain, an expert content strategist for social media creators. Generate viral, engaging content.",
          messages: [{ role: "user", content: request.prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new InternalServerError(`Claude API error: ${error}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || "";

      return {
        content,
        modelSlug,
        modelName: "Claude Brain",
        provider: "anthropic",
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        costIncurred: 0.015, // per request flat rate for now
        latencyMs: 0,
      };
    } catch (err) {
      if (err instanceof InternalServerError) throw err;
      throw new InternalServerError(`Claude API request failed: ${(err as Error).message}`);
    }
  }

  private mockResponse(modelSlug: string, request: AICompletionRequest): AICompletionResult {
    return {
      content: `[Claude Brain Generated] Based on your prompt: "${request.prompt.substring(0, 50)}..."\n\n🔥 **Viral Hook**: The algorithm chose YOU to see this.\n📝 **Caption**: This changes everything about how you create content.\n🎯 **CTA**: Double tap if this resonates!\n\n#contentstrategy #viral #growth`,
      modelSlug,
      modelName: "Claude Brain",
      provider: "anthropic",
      tokensUsed: 245,
      costIncurred: 0.015,
      latencyMs: 0,
    };
  }
}
