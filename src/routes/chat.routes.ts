import type { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new ChatController();

export async function chatRoutes(app: FastifyInstance) {
  app.get(
    "/workspaces/:workspaceId/chat",
    { preHandler: [authMiddleware] },
    controller.getThreads.bind(controller)
  );

  app.get(
    "/chat/:threadId/messages",
    { preHandler: [authMiddleware] },
    controller.getMessages.bind(controller)
  );

  app.post(
    "/chat/:threadId/messages",
    { preHandler: [authMiddleware] },
    controller.sendMessage.bind(controller)
  );

  app.post(
    "/chat/:threadId/draft",
    { preHandler: [authMiddleware] },
    controller.draftReply.bind(controller)
  );
}
