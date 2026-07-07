import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/client";
import { aiChatSessions, aiChatMessages, fans } from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { aiService } from "../services/ai.service";

export class ChatController {
  async getThreads(request: FastifyRequest, reply: FastifyReply) {
    const workspaceId = request.user.workspaceId;
    
    // Auto-create a demo thread if none exist so the UI isn't empty
    let threads = await db.select({
      id: aiChatSessions.id,
      fanId: aiChatSessions.fanId,
      fanName: fans.name,
      updatedAt: aiChatSessions.updatedAt
    })
    .from(aiChatSessions)
    .leftJoin(fans, eq(aiChatSessions.fanId, fans.id))
    .where(eq(aiChatSessions.workspaceId, workspaceId))
    .orderBy(desc(aiChatSessions.updatedAt));

    if (threads.length === 0) {
      // Seed a fan and a session
      const [newFan] = await db.insert(fans).values({ workspaceId, name: "Demo Fan", platform: "onlyfans" }).returning();
      const [newSession] = await db.insert(aiChatSessions).values({ workspaceId, userId: request.user.id, fanId: newFan.id }).returning();
      await db.insert(aiChatMessages).values({ sessionId: newSession.id, role: "user", content: "Hey, are you online?" });
      
      threads = [{ id: newSession.id, fanId: newFan.id, fanName: newFan.name, updatedAt: newSession.updatedAt }];
    }

    // Fetch latest message for each thread
    const formattedThreads = await Promise.all(threads.map(async t => {
      const msgs = await db.select().from(aiChatMessages).where(eq(aiChatMessages.sessionId, t.id)).orderBy(desc(aiChatMessages.createdAt)).limit(1);
      return {
        id: t.id,
        fanId: t.fanId,
        fanName: t.fanName || "Unknown Fan",
        lastMessage: msgs.length > 0 ? msgs[0].content : "",
        unreadCount: 0,
        updatedAt: t.updatedAt
      };
    }));

    return reply.status(200).send({ success: true, data: formattedThreads });
  }

  async getMessages(request: FastifyRequest<{ Params: { threadId: string } }>, reply: FastifyReply) {
    const { threadId } = request.params;
    const messages = await db.select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, threadId))
      .orderBy(asc(aiChatMessages.createdAt));
      
    return reply.status(200).send({ success: true, data: messages });
  }

  async sendMessage(request: FastifyRequest<{ Params: { threadId: string }; Body: { content: string } }>, reply: FastifyReply) {
    const { threadId } = request.params;
    const { content } = request.body;

    // 1. Save user's message (as 'assistant' since we are the creator replying to the fan)
    const [newMessage] = await db.insert(aiChatMessages).values({
      sessionId: threadId,
      role: "assistant",
      content
    }).returning();

    // 2. Update session
    await db.update(aiChatSessions).set({ updatedAt: new Date() }).where(eq(aiChatSessions.id, threadId));

    // Simulate fan reply after a delay (mocking the fact that a real fan might reply later, but we won't block the API)
    // In a real system, this would be handled via webhooks. We'll just return our message.
    return reply.status(200).send({ success: true, data: newMessage });
  }

  async draftReply(request: FastifyRequest<{ Params: { threadId: string } }>, reply: FastifyReply) {
    const { threadId } = request.params;
    
    // Fetch recent messages
    const messages = await db.select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, threadId))
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(10);
      
    // Reverse to chronological order
    const chronologicalMessages = messages.reverse();
    
    // Format for Kimi AI
    const formattedMessages = chronologicalMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const draftContent = await aiService.draftChatReply(formattedMessages);
    
    return reply.status(200).send({ success: true, data: { draft: draftContent } });
  }
}
