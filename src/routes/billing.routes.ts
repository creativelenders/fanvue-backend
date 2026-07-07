import type { FastifyInstance } from "fastify";
import { BillingController } from "../controllers/billing.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const controller = new BillingController();

export async function billingRoutes(app: FastifyInstance) {
  // ── Plans ──
  app.get("/plans", controller.listPlans.bind(controller));

  // ── Subscription ──
  app.get(
    "/workspaces/:workspaceId/subscription",
    { preHandler: [authMiddleware] },
    controller.getSubscription.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/subscription/change-plan",
    { preHandler: [authMiddleware, permissionMiddleware("settings", "update")] },
    controller.changePlan.bind(controller)
  );

  // ── Usage ──
  app.get(
    "/workspaces/:workspaceId/usage",
    { preHandler: [authMiddleware] },
    controller.getUsage.bind(controller)
  );

  // ── Invoices ──
  app.get(
    "/workspaces/:workspaceId/invoices",
    { preHandler: [authMiddleware] },
    controller.listInvoices.bind(controller)
  );
}
