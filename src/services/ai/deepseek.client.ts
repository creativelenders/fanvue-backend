// @ts-nocheck
import type { AICompletionRequest, AICompletionResult } from "./ai.service";
import { InternalServerError } from "../../utils/errors";

export class DeepSeekClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
  }

  async complete(
    modelSlug: string,
    request: AICompletionRequest
  ): Promise<AICompletionResult> {
    if (!this.apiKey) {
      return this.mockResponse(modelSlug, request);
    }

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                request.systemPrompt ||
                "You are a reliable content generation assistant. Create structured, engaging social media content.",
            },
            { role: "user", content: request.prompt },
          ],
          max_tokens: request.maxTokens || 2048,
          temperature: request.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new InternalServerError(`DeepSeek API error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      return {
        content,
        modelSlug,
        modelName: "DeepSeek Base",
        provider: "deepseek",
        tokensUsed: data.usage?.total_tokens || 0,
        costIncurred: 0.005,
        latencyMs: 0,
      };
    } catch (err) {
      if (err instanceof InternalServerError) throw err;
      throw new InternalServerError(`DeepSeek API request failed: ${(err as Error).message}`);
    }
  }

  private mockResponse(modelSlug: string, request: AICompletionRequest): AICompletionResult {
    return {
      content: `[DeepSeek Generated] Structured content for: "${request.prompt.substring(0, 50)}..."\n\n📌 **Strategy**: Educational Deep Dive\n💡 **Key Points**:\n1. Start with a powerful hook\n2. Provide actionable value\n3. End with a clear CTA\n\n✨ **Generated Caption**: Save this for your next content sprint!\n\n#contentcreation #growth`,
      modelSlug,
      modelName: "DeepSeek Base",
      provider: "deepseek",
      tokensUsed: 312,
      costIncurred: 0.005,
      latencyMs: 0,
    };
  }
}
