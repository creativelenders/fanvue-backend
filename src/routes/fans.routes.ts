import type { FastifyInstance } from "fastify";
import { FansController } from "../controllers/fans.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const controller = new FansController();

export async function fanRoutes(app: FastifyInstance) {
  // ── CRUD ──
  app.post(
    "/workspaces/:workspaceId/fans",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "create")] },
    controller.add.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/fans",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.list.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/fans/:id",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.getById.bind(controller)
  );
  app.patch(
    "/workspaces/:workspaceId/fans/:id",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "update")] },
    controller.update.bind(controller)
  );
  app.delete(
    "/workspaces/:workspaceId/fans/:id",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "delete")] },
    controller.delete.bind(controller)
  );

  // ── Scoring ──
  app.post(
    "/workspaces/:workspaceId/fans/rescore-all",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "update")] },
    controller.rescoreAll.bind(controller)
  );

  // ── Activity ──
  app.get(
    "/workspaces/:workspaceId/fans/:id/activity",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.getActivity.bind(controller)
  );

  // ── Lists ──
  app.post(
    "/workspaces/:workspaceId/fan-lists",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "create")] },
    controller.createList.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/fan-lists",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.listLists.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/fan-lists/:id",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.getList.bind(controller)
  );
  app.delete(
    "/workspaces/:workspaceId/fan-lists/:id",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "delete")] },
    controller.deleteList.bind(controller)
  );

  // ── Tags ──
  app.post(
    "/workspaces/:workspaceId/fan-tags",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "create")] },
    controller.createTag.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/fan-tags",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "read")] },
    controller.listTags.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/fans/:id/tags/:tagId",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "update")] },
    controller.assignTag.bind(controller)
  );
  app.delete(
    "/workspaces/:workspaceId/fans/:id/tags/:tagId",
    { preHandler: [authMiddleware, permissionMiddleware("fans", "update")] },
    controller.removeTag.bind(controller)
  );
}
