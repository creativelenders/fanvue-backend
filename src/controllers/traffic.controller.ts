import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import { trafficSources } from "../db/schema";
import { eq } from "drizzle-orm";

export class TrafficController {
  async createLink(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const platforms = ["twitter", "instagram", "tiktok", "youtube", "reddit"];
    const [newItem] = await db.insert(trafficSources).values({
      workspaceId,
      name: `New Tracking Link ${Math.floor(Math.random() * 1000)}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      trackingCode: `link_${Math.random().toString(36).substring(7)}`,
      utmCampaign: "Growth Campaign",
    }).returning();
    return reply.status(201).send({ success: true, data: newItem });
  }

  async listLinks(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const items = await db.query.trafficSources.findMany({
      where: eq(trafficSources.workspaceId, workspaceId)
    });
    return reply.status(200).send({ success: true, data: items });
  }

  async recordClick(req: FastifyRequest, reply: FastifyReply) {
    const { code } = req.params as { code: string };
    const link = await db.query.trafficSources.findFirst({
      where: eq(trafficSources.trackingCode, code)
    });

    if (!link) {
      return reply.status(404).send({ success: false, error: "Link not found" });
    }

    // Increment click count
    await db.update(trafficSources)
      .set({ totalClicks: (link.totalClicks || 0) + 1 })
      .where(eq(trafficSources.id, link.id));

    return reply.status(200).send({ success: true, data: { redirectUrl: "https://fanvue.com/home" } });
  }
}
