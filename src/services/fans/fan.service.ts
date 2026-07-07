// @ts-nocheck
import { db } from "../../db/client";
import { fans, fanActivityLog, fanTagAssignments, fanTags, fanSubscriptions } from "../../db/schema";
import { eq, and, or, sql, desc, ilike, inArray, gte, lte } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../utils/errors";
import type { AddFanRequest, UpdateFanRequest, FanListQuery } from "../../schemas/fans.schema";
import { ScoringService } from "./scoring.service";

export class FanService {
  private scoring: ScoringService;

  constructor() {
    this.scoring = new ScoringService();
  }

  async add(workspaceId: string, userId: string, data: AddFanRequest) {
    const [fan] = await db
      .insert(fans)
      .values({
        workspaceId,
        name: data.name || null,
        handle: data.handle || null,
        platform: data.platform || null,
        platformId: data.platformId || null,
        status: data.status || "active",
        notes: data.notes || null,
        metadata: data.metadata || {},
        score: 0,
      })
      .returning();

    // Log activity
    await db.insert(fanActivityLog).values({
      workspaceId,
      fanId: fan.id,
      activityType: "created",
      description: "Fan added to CRM",
    });

    return fan;
  }

  async list(workspaceId: string, query: FanListQuery) {
    const conditions = [eq(fans.workspaceId, workspaceId)];

    if (query.status) {
      conditions.push(eq(fans.status, query.status));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(fans.name, `%${query.search}%`),
          ilike(fans.handle, `%${query.search}%`)
        )
      );
    }
    if (query.minScore !== undefined) {
      conditions.push(gte(fans.score, query.minScore));
    }
    if (query.maxScore !== undefined) {
      conditions.push(lte(fans.score, query.maxScore));
    }
    if (query.tagId) {
      const taggedFanIds = db
        .select({ fanId: fanTagAssignments.fanId })
        .from(fanTagAssignments)
        .where(eq(fanTagAssignments.tagId, query.tagId));
      conditions.push(inArray(fans.id, taggedFanIds));
    }

    const sortMap: Record<string, any> = {
      score: desc(fans.score),
      totalSpend: desc(fans.totalSpend),
      lastActiveAt: desc(fans.lastActiveAt),
      createdAt: desc(fans.createdAt),
    };

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(fans)
      .where(and(...conditions));

    const items = await db.query.fans.findMany({
      where: and(...conditions),
      orderBy: sortMap[query.sort] || desc(fans.score),
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return {
      data: items.map((fan) => ({
        ...fan,
        tags: fan.tags.map((t: any) => t.tag),
        totalSpend: fan.totalSpend ? fan.totalSpend.toString() : "0",
        avgSpend: fan.avgSpend ? fan.avgSpend.toString() : "0",
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total: Number(total[0]?.count || 0),
        totalPages: Math.ceil(Number(total[0]?.count || 0) / query.limit),
        hasNext: query.page * query.limit < Number(total[0]?.count || 0),
        hasPrev: query.page > 1,
      },
    };
  }

  async getById(workspaceId: string, fanId: string) {
    const fan = await db.query.fans.findFirst({
      where: and(eq(fans.id, fanId), eq(fans.workspaceId, workspaceId)),
      with: {
        tags: {
          with: { tag: true },
        },
        subscriptions: {
          where: eq(fanSubscriptions.status, "active"),
        },
      },
    });

    if (!fan) throw new NotFoundError("Fan");
    return {
      ...fan,
      tags: fan.tags.map((t: any) => t.tag)
    };
  }

  async update(workspaceId: string, fanId: string, data: UpdateFanRequest) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updates.name = data.name;
    if (data.handle !== undefined) updates.handle = data.handle;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.metadata !== undefined) updates.metadata = data.metadata;

    if (data.score !== undefined) {
      updates.score = data.score;
    } else if (data.status === "active" || data.status === "churned") {
      // Auto-recalculate score on status change
      const fan = await this.getById(workspaceId, fanId);
      updates.score = this.scoring.calculate({
        totalSpend: fan.totalSpend ? parseFloat(fan.totalSpend) : 0,
        avgSpend: fan.avgSpend ? parseFloat(fan.avgSpend) : 0,
        totalMessages: fan.totalMessages || 0,
        lastActiveAt: fan.lastActiveAt,
        status: data.status || fan.status || "active",
        subscribedAt: fan.subscribedAt,
      });
    }

    const [updated] = await db
      .update(fans)
      .set(updates)
      .where(and(eq(fans.id, fanId), eq(fans.workspaceId, workspaceId)))
      .returning();

    if (!updated) throw new NotFoundError("Fan");

    // Log activity
    await db.insert(fanActivityLog).values({
      workspaceId,
      fanId: updated.id,
      activityType: "updated",
      description: "Fan profile updated",
      metadata: { changes: Object.keys(updates).filter((k) => k !== "updatedAt") },
    });

    return updated;
  }

  async delete(workspaceId: string, fanId: string) {
    const result = await db
      .delete(fans)
      .where(and(eq(fans.id, fanId), eq(fans.workspaceId, workspaceId)));
    if (result.rowCount === 0) throw new NotFoundError("Fan");
  }

  async rescoreAll(workspaceId: string) {
    const allFans = await db.query.fans.findMany({
      where: eq(fans.workspaceId, workspaceId),
    });

    for (const fan of allFans) {
      const newScore = this.scoring.calculate({
        totalSpend: fan.totalSpend ? parseFloat(fan.totalSpend) : 0,
        avgSpend: fan.avgSpend ? parseFloat(fan.avgSpend) : 0,
        totalMessages: fan.totalMessages || 0,
        lastActiveAt: fan.lastActiveAt,
        status: fan.status || "active",
        subscribedAt: fan.subscribedAt,
      });

      await db
        .update(fans)
        .set({ score: newScore, updatedAt: new Date() })
        .where(eq(fans.id, fan.id));
    }

    return { rescored: allFans.length };
  }

  async getActivity(workspaceId: string, fanId: string, limit = 20) {
    return db.query.fanActivityLog.findMany({
      where: and(
        eq(fanActivityLog.fanId, fanId),
        eq(fanActivityLog.workspaceId, workspaceId)
      ),
      orderBy: desc(fanActivityLog.occurredAt),
      limit,
    });
  }
}
