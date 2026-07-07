import OpenAI from "openai";
import { env } from "../config/env";
import { InternalServerError } from "../utils/errors";

export class AIService {
  private deepseekClient: OpenAI | null = null;
  private kimiClient: OpenAI | null = null;

  constructor() {
    if (env.DEEPSEEK_API_KEY) {
      this.deepseekClient = new OpenAI({
        baseURL: "https://api.deepseek.com/v1",
        apiKey: env.DEEPSEEK_API_KEY,
      });
    }

    if (env.KIMI_API_KEY) {
      this.kimiClient = new OpenAI({
        baseURL: "https://api.moonshot.ai/v1",
        apiKey: env.KIMI_API_KEY,
      });
    }
  }

  /**
   * Use DeepSeek to generate promotional content or captions
   */
  async generatePromotionalContent(prompt: string, type: string = "caption"): Promise<string> {
    if (!this.deepseekClient) {
      console.warn("DEEPSEEK_API_KEY is not configured. Falling back to mock data.");
      return `[Mock DeepSeek Generation - ${type}]: ${prompt.substring(0, 50)}...`;
    }

    try {
      const response = await this.deepseekClient.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an expert promotional assistant for Fan Vue creators. Generate a high-converting ${type} based on the user's prompt. Be engaging, concise, and professional.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "No content generated.";
    } catch (error) {
      console.error("DeepSeek API Error:", error);
      throw new InternalServerError("Failed to generate content using DeepSeek.");
    }
  }

  /**
   * Use Kimi (Moonshot AI) to draft a reply to a fan conversation
   */
  async draftChatReply(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.kimiClient) {
      console.warn("KIMI_API_KEY is not configured. Falling back to mock data.");
      return `[Mock Kimi Reply]: Thanks for reaching out! Let me know what you think of my latest post.`;
    }

    try {
      // Map the messages to ensure roles are strictly 'user', 'assistant', or 'system'
      const formattedMessages: any[] = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      }));

      // Prepend the system prompt
      formattedMessages.unshift({
        role: "system",
        content: "You are an AI assistant helping a creator draft a reply to their fan. Read the conversation history and write a warm, engaging, and authentic response on behalf of the creator. Do not include quotes or filler text, just the exact message to send."
      });

      const response = await this.kimiClient.chat.completions.create({
        model: "moonshot-v1-8k",
        messages: formattedMessages,
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "Could not generate reply.";
    } catch (error) {
      console.error("Kimi API Error:", error);
      throw new InternalServerError("Failed to draft reply using Kimi.");
    }
  }
}

export const aiService = new AIService();
