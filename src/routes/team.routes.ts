import type { FastifyInstance } from "fastify";
import { TeamController } from "../controllers/team.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const controller = new TeamController();

export async function teamRoutes(app: FastifyInstance) {
  // ── Shifts ──
  app.post(
    "/workspaces/:workspaceId/shifts/start",
    { preHandler: [authMiddleware, permissionMiddleware("team", "create")] },
    controller.startShift.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/shifts/:id/end",
    { preHandler: [authMiddleware, permissionMiddleware("team", "update")] },
    controller.endShift.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/shifts",
    { preHandler: [authMiddleware, permissionMiddleware("team", "read")] },
    controller.listShifts.bind(controller)
  );

  // ── Leaderboard ──
  app.get(
    "/workspaces/:workspaceId/leaderboard",
    { preHandler: [authMiddleware, permissionMiddleware("team", "read")] },
    controller.getLeaderboard.bind(controller)
  );

  // ── Schedules ──
  app.post(
    "/workspaces/:workspaceId/schedules",
    { preHandler: [authMiddleware, permissionMiddleware("team", "create")] },
    controller.createSchedule.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/schedules",
    { preHandler: [authMiddleware, permissionMiddleware("team", "read")] },
    controller.listSchedules.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/schedules/coverage",
    { preHandler: [authMiddleware, permissionMiddleware("team", "read")] },
    controller.getCoverage.bind(controller)
  );
}
