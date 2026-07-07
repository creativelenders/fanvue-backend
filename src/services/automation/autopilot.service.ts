// @ts-nocheck
import { db } from "../../db/client";
import { autopilotConfig, keywordTriggers, conversationFlows, fans, messageGuardRules } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NotFoundError } from "../../utils/errors";
import type { UpdateAutopilotRequest } from "../../schemas/automation.schema";
import { AIService } from "../ai/ai.service";

export class AutopilotService {
  private ai: AIService;

  constructor() {
    this.ai = new AIService();
  }

  async getConfig(workspaceId: string) {
    let config = await db.query.autopilotConfig.findFirst({
      where: eq(autopilotConfig.workspaceId, workspaceId),
    });

    if (!config) {
      // Create default config
      const [newConfig] = await db
        .insert(autopilotConfig)
        .values({ workspaceId })
        .returning();
      config = newConfig;
    }

    return config;
  }

  async updateConfig(workspaceId: string, data: UpdateAutopilotRequest) {
    const [updated] = await db
      .update(autopilotConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(autopilotConfig.workspaceId, workspaceId))
      .returning();

    if (!updated) throw new NotFoundError("Autopilot config");
    return updated;
  }

  /**
   * Process an incoming fan message through autopilot:
   * 1. Check message guard (blocked words)
   * 2. Check keyword triggers
   * 3. Check conversation flows
   * 4. If in auto mode, generate AI reply
   * 5. If in assist mode, return suggested replies
   */
  async processMessage(
    workspaceId: string,
    fanId: string,
    message: string
  ): Promise<{
    action: "reply" | "suggest" | "block" | "no_action";
    reply?: string;
    suggestedReplies?: string[];
    triggeredFlow?: string;
    triggeredTrigger?: string;
  }> {
    // 1. Check message guard
    const blockedWords = await db.query.messageGuardRules.findMany({
      where: and(
        eq(messageGuardRules.workspaceId, workspaceId),
        eq(messageGuardRules.isActive, true),
        eq(messageGuardRules.action, "block")
      ),
    });

    for (const rule of blockedWords) {
      if (message.toLowerCase().includes(rule.word.toLowerCase())) {
        return {
          action: "block",
          reply: "Message blocked by content filter.",
        };
      }
    }

    // 2. Check keyword triggers
    const triggers = await db.query.keywordTriggers.findMany({
      where: and(
        eq(keywordTriggers.workspaceId, workspaceId),
        eq(keywordTriggers.isActive, true)
      ),
    });

    for (const trigger of triggers) {
      const matched = trigger.keywords.some((kw) => {
        if (trigger.matchType === "exact") return message.toLowerCase() === kw.toLowerCase();
        if (trigger.matchType === "contains") return message.toLowerCase().includes(kw.toLowerCase());
        return false;
      });

      if (matched) {
        // Increment match count
        await db
          .update(keywordTriggers)
          .set({ totalMatches: sql`${keywordTriggers.totalMatches} + 1` })
          .where(eq(keywordTriggers.id, trigger.id));

        return {
          action: "reply",
          reply: trigger.response,
          triggeredTrigger: trigger.name,
        };
      }
    }

    // 3. Check conversation flows
    const flows = await db.query.conversationFlows.findMany({
      where: and(
        eq(conversationFlows.workspaceId, workspaceId),
        eq(conversationFlows.isActive, true)
      ),
      with: { steps: { orderBy: (steps: any, { asc }: any) => [asc(steps.stepOrder)] } },
    });

    for (const flow of flows) {
      if (flow.keyword && message.toLowerCase().includes(flow.keyword.toLowerCase())) {
        // Increment triggered count
        await db
          .update(conversationFlows)
          .set({ totalTriggered: sql`${conversationFlows.totalTriggered} + 1` })
          .where(eq(conversationFlows.id, flow.id));

        if (flow.steps.length > 0) {
          return {
            action: "reply",
            reply: flow.steps[0].message,
            triggeredFlow: flow.name,
          };
        }
      }
    }

    // 4. Check autopilot mode
    const config = await this.getConfig(workspaceId);

    if (!config.isEnabled) {
      return { action: "no_action" };
    }

    // Get fan context for personalized reply
    const fan = await db.query.fans.findFirst({
      where: and(eq(fans.id, fanId), eq(fans.workspaceId, workspaceId)),
    });

    if (config.mode === "auto") {
      // Generate AI reply
      const aiResult = await this.ai.generateContent(message, {
        systemPrompt: `You are ${fan?.name || "a friendly"} assistant for FanVue. 
          Respond warmly and naturally to the fan's message. 
          Keep responses under 200 characters. Be helpful and engaging.`,
        maxTokens: 300,
        temperature: 0.7,
      });

      // Log auto-reply
      await db
        .update(autopilotConfig)
        .set({
          totalAutoReplies: sql`${autopilotConfig.totalAutoReplies} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(autopilotConfig.workspaceId, workspaceId));

      return {
        action: "reply",
        reply: aiResult.content,
      };
    }

    if (config.mode === "assist") {
      // Generate suggested replies (assist mode)
      const aiResult = await this.ai.generateContent(message, {
        systemPrompt: `Suggest 3 short replies for a fan message. 
          Format as a JSON array of strings. Replies should be natural and friendly.
          Keep each under 100 characters.`,
        maxTokens: 500,
        temperature: 0.8,
      });

      let suggestedReplies: string[] = [];
      try {
        suggestedReplies = JSON.parse(aiResult.content);
      } catch {
        suggestedReplies = [
          "Thanks for reaching out! 😊",
          "Great to hear from you! How can I help?",
          "Hey! Thanks for your message 💫",
        ];
      }

      return {
        action: "suggest",
        suggestedReplies: suggestedReplies.slice(0, 3),
      };
    }

    return { action: "no_action" };
  }
}
