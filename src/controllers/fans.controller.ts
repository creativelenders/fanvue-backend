import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import { fans } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export class FansController {
  async add(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const [newFan] = await db.insert(fans).values({
      workspaceId,
      name: `New Fan ${Math.floor(Math.random() * 1000)}`,
      handle: `@fan${Math.floor(Math.random() * 10000)}`,
      platform: "onlyfans",
      status: "active",
      score: 50,
      totalSpend: "0.00",
    }).returning();
    return reply.status(201).send({ success: true, data: newFan });
  }
  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, id } = req.params as { workspaceId: string, id: string };
    const fan = await db.query.fans.findFirst({
      where: require("drizzle-orm").and(
        eq(require("../db/schema").fans.workspaceId, workspaceId),
        eq(require("../db/schema").fans.id, id)
      ),
      with: {
        chatSessions: {
          with: { messages: true }
        },
        purchases: {
          with: { campaign: true }
        }
      }
    });

    if (!fan) return reply.status(404).send({ success: false, error: "Fan not found" });
    return reply.status(200).send({ success: true, data: fan });
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const { search, status, sort, order, page = "1", limit = "20" } = req.query as Record<string, string>;
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(fans.workspaceId, workspaceId)];

    if (status) {
      conditions.push(eq(fans.status, status));
    }

    if (search) {
      conditions.push(
        sql`(${fans.name} ILIKE ${`%${search}%`} OR ${fans.handle} ILIKE ${`%${search}%`})`
      );
    }

    const orderByParams = [];
    const sortCol = (fans as any)[sort] || fans.score;
    if (order === "asc") {
      orderByParams.push(require("drizzle-orm").asc(sortCol));
    } else {
      orderByParams.push(desc(sortCol));
    }

    const fansList = await db.query.fans.findMany({
      where: require("drizzle-orm").and(...conditions),
      orderBy: orderByParams,
      limit: limitNum,
      offset
    });

    const [{ count }] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(fans)
      .where(require("drizzle-orm").and(...conditions));

    return reply.status(200).send({
      success: true,
      data: {
        data: fansList,
        meta: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
          hasNext: pageNum * limitNum < count,
          hasPrev: pageNum > 1
        }
      }
    });
  }


  async update(req: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ success: true });
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    await db.delete(fans).where(eq(fans.id, id));
    return reply.status(200).send({ success: true });
  }

  async rescoreAll(req: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ success: true });
  }

  async getActivity(req: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ success: true, data: [] });
  }
  
  async createList(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const { name, isDynamic, description } = req.body as any;
    const result = await db.insert(require("../db/schema").fanLists).values({
      workspaceId,
      name,
      description: description || "Custom fan list",
      isDynamic: isDynamic || false,
      rules: {}
    }).returning();
    return reply.send({ success: true, data: (result as any)[0] });
  }

  async listLists(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const lists = await db.query.fanLists.findMany({
      where: eq(require("../db/schema").fanLists.workspaceId, workspaceId)
    });
    return reply.send({ success: true, data: lists });
  }

  async getList(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
  async deleteList(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }

  async createTag(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
  async listTags(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true, data: [] }) }
  async assignTag(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
  async removeTag(req: FastifyRequest, reply: FastifyReply) { return reply.send({ success: true }) }
}
