import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { promptLibrary } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export class PromptsController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const prompts = await db.select()
      .from(promptLibrary)
      .where(eq(promptLibrary.workspaceId, workspaceId))
      .orderBy(desc(promptLibrary.createdAt));

    return reply.status(200).send({ success: true, data: prompts });
  }

  async create(request: FastifyRequest<{ Body: { name: string; content: string; category?: string } }>, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const userId = request.user.id;
    const { name, content, category } = request.body;

    const [newPrompt] = await db.insert(promptLibrary).values({
      workspaceId,
      userId,
      name,
      content,
      category: category || "generic"
    }).returning();

    return reply.status(201).send({ success: true, data: newPrompt });
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; content?: string } }>, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const { id } = request.params;
    const { name, content } = request.body;

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

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    await db.delete(promptLibrary).where(eq(promptLibrary.id, id));
    return reply.status(200).send({ success: true, message: "Deleted successfully" });
  }
}
