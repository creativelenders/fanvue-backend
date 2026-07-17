import OpenAI from "openai";
import { env } from "../config/env";
import { InternalServerError } from "../utils/errors";

export class AIService {
  private providers: { name: string; client: OpenAI; model: string }[] = [];

  constructor() {
    // 1. Groq
    if (env.GROQ_API_KEY) {
      this.providers.push({
        name: "Groq",
        client: new OpenAI({
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: env.GROQ_API_KEY,
        }),
        model: env.GROQ_MODEL || "llama3-70b-8192",
      });
    }

    // 2. OpenRouter
    if (env.OPENROUTER_API_KEY) {
      this.providers.push({
        name: "OpenRouter",
        client: new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: env.OPENROUTER_API_KEY,
        }),
        model: env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      });
    }

    // 3. DeepSeek
    if (env.DEEPSEEK_API_KEY) {
      this.providers.push({
        name: "DeepSeek",
        client: new OpenAI({
          baseURL: "https://api.deepseek.com/v1",
          apiKey: env.DEEPSEEK_API_KEY,
        }),
        model: "deepseek-chat",
      });
    }

    // 4. Kimi (Moonshot)
    if (env.KIMI_API_KEY) {
      this.providers.push({
        name: "Kimi",
        client: new OpenAI({
          baseURL: "https://api.moonshot.ai/v1",
          apiKey: env.KIMI_API_KEY,
        }),
        model: "kimi-k3", // Updated to new kimi-k3 version
      });
    }
  }

  private async executeWithFallback(messages: any[], maxTokens: number, temperature: number, fallbackContext: string): Promise<string> {
    if (this.providers.length === 0) {
      console.warn("No AI providers configured. Falling back to mock data.");
      return fallbackContext;
    }

    for (const provider of this.providers) {
      try {
        const response = await provider.client.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: maxTokens,
          temperature,
        });
        return response.choices[0]?.message?.content || "";
      } catch (error) {
        console.warn(`${provider.name} API Error. Falling back to next provider...`, error);
      }
    }

    throw new InternalServerError("All AI providers failed to generate content.");
  }

  /**
   * Use AI to generate promotional content or captions
   */
  async generatePromotionalContent(prompt: string, type: string = "caption"): Promise<string> {
    const messages = [
      {
        role: "system",
        content: `You are an expert promotional assistant for Fan Vue creators. Generate a high-converting ${type} based on the user's prompt. Be engaging, concise, and professional.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const mockFallback = `[Mock Generation - ${type}]: ${prompt.substring(0, 50)}...`;
    return this.executeWithFallback(messages, 500, 0.7, mockFallback);
  }

  /**
   * Use AI to draft a reply to a fan conversation
   */
  async draftChatReply(messages: { role: string; content: string }[]): Promise<string> {
    const formattedMessages: any[] = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));

    formattedMessages.unshift({
      role: "system",
      content: "You are an AI assistant helping a creator draft a reply to their fan. Read the conversation history and write a warm, engaging, and authentic response on behalf of the creator. Do not include quotes or filler text, just the exact message to send."
    });

    const mockFallback = `[Mock Reply]: Thanks for reaching out! Let me know what you think of my latest post.`;
    return this.executeWithFallback(formattedMessages, 300, 0.7, mockFallback);
  }
}

export const aiService = new AIService();
