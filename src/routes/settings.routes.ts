import type { FastifyInstance } from "fastify";
import { SettingsController } from "../controllers/settings.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new SettingsController();

export async function settingsRoutes(app: FastifyInstance) {
  app.get(
    "/workspaces/:workspaceId/settings",
    { preHandler: [authMiddleware] },
    controller.getSettings.bind(controller)
  );
}