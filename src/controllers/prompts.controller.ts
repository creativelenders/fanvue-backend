import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { promptLibrary } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export class PromptsController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = (request.user as any)?.workspaceId || "3af39644-6d79-4384-842d-3f141bd63919";
    const prompts = await db.select()
      .from(promptLibrary)
      .where(eq(promptLibrary.workspaceId, workspaceId))
      .orderBy(desc(promptLibrary.createdAt));

    return reply.status(200).send({ success: true, data: prompts });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = (request.user as any)?.workspaceId || "3af39644-6d79-4384-842d-3f141bd63919";
    const userId = request.user!.sub;
    const { name, content, category } = request.body as any;

    const [newPrompt] = await db.insert(promptLibrary).values({
      workspaceId,
      userId,
      name,
      content,
      category: category || "generic"
    }).returning();

    return reply.status(201).send({ success: true, data: newPrompt });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = (request.user as any)?.workspaceId || "3af39644-6d79-4384-842d-3f141bd63919";
    const { id } = request.params as any;
    const { name, content } = request.body as any;

    const [updatedPrompt] = await db.update(promptLibrary)
      .set({
        ...(name && { name }),
        ...(content && { content }),
        updatedAt: new Date()
      })
      .where(eq(promptLibrary.id, id))
      .returning();

    return reply.status(200).send({ success: true, data: updatedPrompt });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    await db.delete(promptLibrary).where(eq(promptLibrary.id, id));
    return reply.status(200).send({ success: true, message: "Deleted successfully" });
  }
}
