import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { ppvCampaigns } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export class PpvController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    
    const campaigns = await db.query.ppvCampaigns.findMany({
      where: eq(ppvCampaigns.workspaceId, workspaceId),
      orderBy: [desc(ppvCampaigns.createdAt)]
    });

    const formatted = campaigns.map(c => ({
      id: c.id,
      name: c.title,
      price: c.price,
      mediaType: c.mediaType || "image",
      totalSent: c.totalSent,
      totalPurchased: c.totalPurchases || 0,
      revenue: c.revenue,
      createdAt: c.createdAt
    }));

    return reply.status(200).send({ success: true, data: formatted });
  }

  async add(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    
    const [campaign] = await db.insert(ppvCampaigns).values({
      workspaceId,
      userId: request.user.id,
      title: `PPV Campaign ${Math.floor(Math.random() * 1000)}`,
      description: "Exclusive unlock",
      price: "15.00",
      mediaType: "video",
      totalSent: 0,
      totalPurchases: 0,
      revenue: "0.00",
      status: "draft"
    }).returning();

    const formatted = {
      id: campaign.id,
      name: campaign.title,
      price: campaign.price,
      mediaType: campaign.mediaType || "image",
      totalSent: campaign.totalSent,
      totalPurchased: campaign.totalPurchases || 0,
      revenue: campaign.revenue,
      createdAt: campaign.createdAt
    };

    return reply.status(201).send({ success: true, data: formatted });
  }
}
