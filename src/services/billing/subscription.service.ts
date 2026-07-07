import { db } from "../../db/client";
import {
  subscriptionPlans,
  workspaceSubscriptions,
  invoices,
  workspaces,
  usageRecords,
} from "../../db/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../utils/errors";

export class SubscriptionService {
  async listPlans() {
    return db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
    });
  }

  async getCurrentSubscription(workspaceId: string) {
    const sub = await db.query.workspaceSubscriptions.findFirst({
      where: eq(workspaceSubscriptions.workspaceId, workspaceId),
      with: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");
    return sub;
  }

  async changePlan(workspaceId: string, planId: string) {
    const plan = await db.query.subscriptionPlans.findFirst({
      where: and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true)),
    });
    if (!plan) throw new NotFoundError("Plan");

    const currentSub = await this.getCurrentSubscription(workspaceId);

    // Update subscription
    const [updated] = await db
      .update(workspaceSubscriptions)
      .set({
        planId,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
      .returning();

    // Update workspace limits
    await db
      .update(workspaces)
      .set({
        plan: plan.slug,
        aiGenerationsLimit: plan.aiGenerationsLimit,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));

    // Create invoice for prorated amount
    await db.insert(invoices).values({
      workspaceId,
      subscriptionId: currentSub.id,
      amount: plan.price,
      status: "pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return updated;
  }

  async getUsage(workspaceId: string) {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new NotFoundError("Workspace");

    // Get daily usage for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyUsage = await db
      .select({
        date: sql<string>`DATE(${usageRecords.recordedAt})`,
        generations: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.recordType} = 'ai_generation' THEN ${usageRecords.quantity} ELSE 0 END), 0)`,
        cost: sql<string>`COALESCE(SUM(${usageRecords.cost}::numeric), 0)::text`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.workspaceId, workspaceId),
          gte(usageRecords.recordedAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${usageRecords.recordedAt})`)
      .orderBy(sql`DATE(${usageRecords.recordedAt})`);

    // Get totals
    const totals = await db
      .select({
        apiCalls: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.recordType} = 'api_call' THEN ${usageRecords.quantity} ELSE 0 END), 0)`,
        storageUsed: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.recordType} = 'storage' THEN ${usageRecords.quantity} ELSE 0 END), 0)`,
      })
      .from(usageRecords)
      .where(eq(usageRecords.workspaceId, workspaceId));

    return {
      aiGenerationsUsed: workspace.aiGenerationsUsed || 0,
      aiGenerationsLimit: workspace.aiGenerationsLimit || 100,
      apiCalls: Number(totals[0]?.apiCalls || 0),
      storageUsed: Number(totals[0]?.storageUsed || 0),
      usageByDay: dailyUsage,
    };
  }

  async checkGenerationsLimit(workspaceId: string): Promise<boolean> {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) return false;

    return (workspace.aiGenerationsUsed || 0) < (workspace.aiGenerationsLimit || 100);
  }

  async incrementGenerationsUsed(workspaceId: string) {
    await db
      .update(workspaces)
      .set({
        aiGenerationsUsed: sql`${workspaces.aiGenerationsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
  }
}
