import type { FastifyInstance } from "fastify";
import { ContentController } from "../controllers/content.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new ContentController();

export async function contentRoutes(app: FastifyInstance) {
  app.get(
    "/content/generations",
    { preHandler: [authMiddleware] },
    controller.listGenerations.bind(controller)
  );
  
  app.post(
    "/content/generate",
    { preHandler: [authMiddleware] },
    controller.generate.bind(controller)
  );

  app.get(
    "/content/personas",
    { preHandler: [authMiddleware] },
    controller.listPersonas.bind(controller)
  );

  app.post(
    "/content/persona/train",
    { preHandler: [authMiddleware] },
    controller.trainPersona.bind(controller)
  );
}
