import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import { workspaces } from "../db/schema";
import { eq } from "drizzle-orm";

const MOCK_PLANS = [
  {
    id: "plan_free",
    slug: "free",
    name: "Free",
    price: "0.00",
    aiGenerationsLimit: 100,
    socialPlatforms: 1,
    seats: 1,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  {
    id: "plan_starter",
    slug: "starter",
    name: "Starter",
    price: "49.00",
    aiGenerationsLimit: 1000,
    socialPlatforms: 1,
    seats: 1,
    hasAdvancedAnalytics: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
  },
  {
    id: "plan_elite",
    slug: "elite",
    name: "Elite",
    price: "99.00",
    aiGenerationsLimit: 5000,
    socialPlatforms: 3,
    seats: 3,
    hasAdvancedAnalytics: true,
    hasApiAccess: false,
    hasPrioritySupport: true,
  },
  {
    id: "plan_agency",
    slug: "agency",
    name: "Agency",
    price: "249.00",
    aiGenerationsLimit: 20000,
    socialPlatforms: 10,
    seats: 10,
    hasAdvancedAnalytics: true,
    hasApiAccess: true,
    hasPrioritySupport: true,
  }
];

export class BillingController {
  async listPlans(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: MOCK_PLANS });
  }

  async getSubscription(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId)
    });

    const currentSlug = workspace?.plan?.toLowerCase() || "free";
    const matchedPlan = MOCK_PLANS.find(p => p.slug === currentSlug) || MOCK_PLANS[0];
    
    return reply.send({ 
      success: true, 
      data: {
        id: "sub_" + workspaceId,
        workspaceId,
        status: "active",
        plan: matchedPlan,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      }
    });
  }

  async changePlan(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const { planId } = req.body as any;

    const newPlan = MOCK_PLANS.find(p => p.id === planId);
    if (!newPlan) {
      return reply.status(400).send({ success: false, error: "Invalid plan" });
    }

    // Update the workspace DB record with new plan and limit
    await db.update(workspaces)
      .set({ 
        plan: newPlan.name, // Will match uppercase Elite/Free etc
        aiGenerationsLimit: newPlan.aiGenerationsLimit,
        updatedAt: new Date()
      })
      .where(eq(workspaces.id, workspaceId));

    return reply.send({ success: true, data: { message: "Plan changed successfully" } });
  }

  async getUsage(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId)
    });

    return reply.send({ 
      success: true, 
      data: {
        aiGenerationsUsed: workspace?.aiGenerationsUsed || 0,
        aiGenerationsLimit: workspace?.aiGenerationsLimit || 100,
        messagesSent: 0,
        activeSubscribers: workspace?.totalFans || 0
      }
    });
  }

  async listInvoices(req: FastifyRequest, reply: FastifyReply) {
    const invoices = [
      {
        id: "inv_1",
        amount: "99.00",
        status: "paid",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "inv_2",
        amount: "99.00",
        status: "paid",
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    return reply.send({ success: true, data: invoices });
  }
}
