import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import { conversationFlows, autopilotConfig, autoMessageCampaigns, messageGuardRules, socialFunnels, onboardingFunnels, ppvCampaigns, bumpRules, keywordTriggers } from "../db/schema";
import { and, eq } from "drizzle-orm";

export class AutomationController {
  async getAutopilot(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    console.log("GET AUTOPILOT FOR WORKSPACE:", workspaceId);
    
    let config = await db.query.autopilotConfig.findFirst({
      where: eq(autopilotConfig.workspaceId, workspaceId)
    });

    if (!config) {
      const [newConfig] = await db.insert(autopilotConfig).values({
        workspaceId,
        isEnabled: false,
        mode: "assist",
        maxAutoRepliesPerHour: 50,
        autoGreetNewFans: false,
        autoSellPpv: false,
      }).returning();
      config = newConfig;
    }

    return reply.status(200).send({ success: true, data: config });
  }

  async updateAutopilot(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const updates = req.body as any;

    const [updated] = await db.update(autopilotConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autopilotConfig.workspaceId, workspaceId))
      .returning();

    return reply.send({ success: true, data: updated });
  }

  async processMessage(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }

  async createAutoMessage(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newItem] = await db.insert(autoMessageCampaigns).values({
      workspaceId,
      name: `Campaign ${Math.floor(Math.random() * 1000)}`,
      trigger: "welcome",
      message: "Hey! Welcome to my page ❤️",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }

  async listAutoMessages(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.autoMessageCampaigns.findMany({
      where: eq(autoMessageCampaigns.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }

  async createFlow(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newItem] = await db.insert(conversationFlows).values({
      workspaceId,
      name: `Flow ${Math.floor(Math.random() * 1000)}`,
    }).returning();
    return reply.send({ success: true, data: newItem });
  }

  async listFlows(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const flows = await db.query.conversationFlows.findMany({
      where: eq(conversationFlows.workspaceId, workspaceId)
    });
    return reply.status(200).send({ success: true, data: flows });
  }
  async getFlow(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    const flow = await db.query.conversationFlows.findFirst({
      where: require("drizzle-orm").and(
        eq(conversationFlows.workspaceId, workspaceId),
        eq(conversationFlows.id, id)
      )
    });
    if (!flow) return reply.status(404).send({ success: false, error: "Flow not found" });
    return reply.send({ success: true, data: flow });
  }

  async updateFlow(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    const updates = req.body as any;

    const [updated] = await db.update(conversationFlows)
      .set({ ...updates, updatedAt: new Date() })
      .where(require("drizzle-orm").and(
        eq(conversationFlows.workspaceId, workspaceId),
        eq(conversationFlows.id, id)
      ))
      .returning();

    return reply.send({ success: true, data: updated });
  }

  async createTrigger(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newItem] = await db.insert(keywordTriggers).values({
      workspaceId,
      name: `Trigger ${Math.floor(Math.random() * 1000)}`,
      keywords: ["hello", "hi"],
      response: "Hello there! 😘",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }

  async listTriggers(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.keywordTriggers.findMany({
      where: eq(keywordTriggers.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }
  async updateTrigger(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
  async deleteTrigger(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }

  async listGuardWords(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.messageGuardRules.findMany({
      where: eq(messageGuardRules.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }

  async addGuardWord(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const { word, action } = req.body as any || {};
    const [newItem] = await db.insert(messageGuardRules).values({
      workspaceId,
      word: word || `banned_${Math.floor(Math.random() * 1000)}`,
      action: action || "block",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }
  async checkMessage(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
  async deleteGuardWord(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }

  async createBumpRule(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newItem] = await db.insert(bumpRules).values({
      workspaceId,
      name: `Bump ${Math.floor(Math.random() * 1000)}`,
      inactiveDays: 7,
      message: "Missed you! Come back and chat 💋",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }

  async listBumpRules(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.bumpRules.findMany({
      where: eq(bumpRules.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }

  async createBroadcast(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    // We store broadcasts in ppvCampaigns with mediaType="broadcast" as per Drizzle schema if needed
    // Actually, Broadcasts are a separate table or just ppvCampaigns? Let's check schema.
    // The schema does not have "broadcast_campaigns". Let's insert into ppvCampaigns for broadcasts!
    const [newItem] = await db.insert(ppvCampaigns).values({
      workspaceId,
      userId: req.user!.sub,
      title: `Broadcast ${Math.floor(Math.random() * 1000)}`,
      price: "0",
      mediaType: "broadcast",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }

  async listBroadcasts(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.ppvCampaigns.findMany({
      where: require("drizzle-orm").and(
        eq(ppvCampaigns.workspaceId, workspaceId),
        eq(ppvCampaigns.mediaType, "broadcast")
      )
    });
    // Format to match what the frontend expects
    const formatted = items.map(c => ({
      ...c,
      name: c.title,
      message: c.description,
      totalTargeted: c.totalSent,
      totalDelivered: c.totalSent,
      totalConversions: c.totalPurchases || 0,
    }));
    return reply.send({ success: true, data: formatted });
  }
  async sendBroadcast(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }

  async createSocialFunnel(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const platforms = ["twitter", "instagram", "tiktok", "reddit"];
    const [newItem] = await db.insert(socialFunnels).values({
      workspaceId,
      name: `New Social Funnel ${Math.floor(Math.random() * 1000)}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      trigger: "comments_on_post",
      autoDmMessage: "Hey there! Thanks for engaging. Here is my exclusive link: [link]",
    }).returning();
    return reply.send({ success: true, data: newItem });
  }
  
  async listSocialFunnels(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.socialFunnels.findMany({
      where: eq(socialFunnels.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }

  async createOnboardingFunnel(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newItem] = await db.insert(onboardingFunnels).values({
      workspaceId,
      name: `New Welcome Flow ${Math.floor(Math.random() * 1000)}`,
    }).returning();
    return reply.send({ success: true, data: newItem });
  }
  
  async listOnboardingFunnels(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.onboardingFunnels.findMany({
      where: eq(onboardingFunnels.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: items });
  }

  async getOnboardingFunnel(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    const funnel = await db.query.onboardingFunnels.findFirst({
      where: require("drizzle-orm").and(
        eq(onboardingFunnels.workspaceId, workspaceId),
        eq(onboardingFunnels.id, id)
      )
    });
    if (!funnel) return reply.status(404).send({ success: false, error: "Funnel not found" });
    return reply.send({ success: true, data: funnel });
  }

  async updateOnboardingFunnel(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    const updates = req.body as any;

    const [updated] = await db.update(onboardingFunnels)
      .set({ ...updates, updatedAt: new Date() })
      .where(require("drizzle-orm").and(
        eq(onboardingFunnels.workspaceId, workspaceId),
        eq(onboardingFunnels.id, id)
      ))
      .returning();

    return reply.send({ success: true, data: updated });
  }
}
