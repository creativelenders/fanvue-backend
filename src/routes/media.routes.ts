import type { FastifyInstance } from "fastify";
import { MediaController } from "../controllers/media.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new MediaController();

export async function mediaRoutes(app: FastifyInstance) {
  app.get(
    "/media",
    { preHandler: [authMiddleware] },
    controller.list.bind(controller)
  );

  app.post(
    "/media/upload",
    { preHandler: [authMiddleware] },
    controller.upload.bind(controller)
  );
}
