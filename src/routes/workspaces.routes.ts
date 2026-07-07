import type { FastifyInstance } from "fastify";
import { WorkspaceController } from "../controllers/workspaces.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new WorkspaceController();

export async function workspaceRoutes(app: FastifyInstance) {
  // ── Workspace CRUD ──
  app.post("/workspaces", { preHandler: [authMiddleware] }, controller.create.bind(controller));
  app.get("/workspaces", { preHandler: [authMiddleware] }, controller.list.bind(controller));
  app.get("/workspaces/:workspaceId", { preHandler: [authMiddleware] }, controller.getById.bind(controller));
  app.patch("/workspaces/:workspaceId", { preHandler: [authMiddleware] }, controller.update.bind(controller));
  app.delete("/workspaces/:workspaceId", { preHandler: [authMiddleware] }, controller.delete.bind(controller));

  // ── Members ──
  app.get("/workspaces/:workspaceId/members", { preHandler: [authMiddleware] }, controller.getMembers.bind(controller));
  app.post("/workspaces/:workspaceId/invite", { preHandler: [authMiddleware] }, controller.invite.bind(controller));
  app.post("/workspaces/accept-invite", { preHandler: [authMiddleware] }, controller.acceptInvite.bind(controller));
  app.patch("/workspaces/:workspaceId/members/:memberId", { preHandler: [authMiddleware] }, controller.updateMember.bind(controller));
  app.delete("/workspaces/:workspaceId/members/:memberId", { preHandler: [authMiddleware] }, controller.removeMember.bind(controller));
}
