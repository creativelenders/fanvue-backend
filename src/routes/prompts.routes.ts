import type { FastifyInstance } from "fastify";
import { PromptsController } from "../controllers/prompts.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new PromptsController();

export async function promptsRoutes(app: FastifyInstance) {
  app.get(
    "/prompts",
    { preHandler: [authMiddleware] },
    controller.list.bind(controller)
  );
  
  app.post(
    "/prompts",
    { preHandler: [authMiddleware] },
    controller.create.bind(controller)
  );

  app.put(
    "/prompts/:id",
    { preHandler: [authMiddleware] },
    controller.update.bind(controller)
  );

  app.delete(
    "/prompts/:id",
    { preHandler: [authMiddleware] },
    controller.delete.bind(controller)
  );
}
