import type { FastifyInstance } from "fastify";
import { PpvController } from "../controllers/ppv.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new PpvController();

export async function ppvRoutes(app: FastifyInstance) {
  app.get(
    "/workspaces/:workspaceId/ppv",
    { preHandler: [authMiddleware] },
    controller.list.bind(controller)
  );

  app.post(
    "/workspaces/:workspaceId/ppv",
    { preHandler: [authMiddleware] },
    controller.add.bind(controller)
  );
}
