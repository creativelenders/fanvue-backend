import type { FastifyInstance } from "fastify";
import { TrafficController } from "../controllers/traffic.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new TrafficController();

export async function trafficRoutes(app: FastifyInstance) {
  app.post(
    "/workspaces/:workspaceId/traffic/links",
    { preHandler: [authMiddleware] },
    controller.createLink.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/traffic/links",
    { preHandler: [authMiddleware] },
    controller.listLinks.bind(controller)
  );

  // Note: This endpoint is public so redirect can happen without auth
  app.get(
    "/traffic/links/:code/click",
    controller.recordClick.bind(controller)
  );
}
