import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { contentGenerations, aiModels, contentStrategies } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { aiService } from "../services/ai.service";

export class ContentController {
  async listGenerations(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const generations = await db.select()
      .from(contentGenerations)
      .where(eq(contentGenerations.workspaceId, workspaceId))
      .orderBy(desc(contentGenerations.createdAt))
      .limit(20);

    return reply.status(200).send({ success: true, data: generations });
  }

  async generate(request: FastifyRequest<{ Body: { prompt: string; type?: string } }>, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const userId = request.user.id;
    const { prompt, type } = request.body;

    // Use DeepSeek for content generation
    const generatedContent = await aiService.generatePromotionalContent(prompt, type);

    // Get or create an AI model to satisfy foreign key constraints
    let model = await db.select().from(aiModels).limit(1);
    let modelId;
    if (model.length === 0) {
      const [newModel] = await db.insert(aiModels).values({
        slug: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: { creativity: 1, reasoning: 1, logic: 1, speed: 1 }
      }).returning();
      modelId = newModel.id;
    } else {
      modelId = model[0].id;
    }

    const [generation] = await db.insert(contentGenerations).values({
      workspaceId,
      userId,
      aiModelId: modelId,
      prompt,
      generatedContent,
      platform: type || "generic"
    }).returning();

    return reply.status(200).send({ success: true, data: generation });
  }

  async trainPersona(request: FastifyRequest<{ Body: { description: string } }>, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const userId = request.user.id;
    const { description } = request.body;

    const [strategy] = await db.insert(contentStrategies).values({
      workspaceId,
      slug: `persona-${Date.now()}`,
      name: `Trained Persona ${new Date().toLocaleDateString()}`,
      description,
      createdBy: userId,
    }).returning();

    return reply.status(200).send({ success: true, data: strategy });
  }

  async listPersonas(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    const personas = await db.select()
      .from(contentStrategies)
      .where(eq(contentStrategies.workspaceId, workspaceId))
      .orderBy(desc(contentStrategies.createdAt));

    return reply.status(200).send({ success: true, data: personas });
  }
}
