import type { FastifyInstance } from "fastify";
import { AutomationController } from "../controllers/automation.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";

const controller = new AutomationController();

export async function automationRoutes(app: FastifyInstance) {
  // ── Autopilot ──
  app.get(
    "/workspaces/:workspaceId/autopilot",
    { preHandler: [authMiddleware] },
    controller.getAutopilot.bind(controller)
  );
  app.put(
    "/workspaces/:workspaceId/autopilot",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "update")] },
    controller.updateAutopilot.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/autopilot/process",
    { preHandler: [authMiddleware] },
    controller.processMessage.bind(controller)
  );

  // ── Auto Messages ──
  app.post(
    "/workspaces/:workspaceId/auto-messages",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createAutoMessage.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/auto-messages",
    { preHandler: [authMiddleware] },
    controller.listAutoMessages.bind(controller)
  );

  // ── Conversation Flows ──
  app.post(
    "/workspaces/:workspaceId/flows",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createFlow.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/flows",
    { preHandler: [authMiddleware] },
    controller.listFlows.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/flows/:id",
    { preHandler: [authMiddleware] },
    controller.getFlow.bind(controller)
  );
  app.put(
    "/workspaces/:workspaceId/flows/:id",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "update")] },
    controller.updateFlow.bind(controller)
  );

  // ── Keyword Triggers ──
  app.post(
    "/workspaces/:workspaceId/triggers",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createTrigger.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/triggers",
    { preHandler: [authMiddleware] },
    controller.listTriggers.bind(controller)
  );
  app.patch(
    "/workspaces/:workspaceId/triggers/:id",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "update")] },
    controller.updateTrigger.bind(controller)
  );
  app.delete(
    "/workspaces/:workspaceId/triggers/:id",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "delete")] },
    controller.deleteTrigger.bind(controller)
  );

  // ── Message Guard ──
  app.get(
    "/workspaces/:workspaceId/message-guard",
    { preHandler: [authMiddleware] },
    controller.listGuardWords.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/message-guard",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.addGuardWord.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/message-guard/check",
    { preHandler: [authMiddleware] },
    controller.checkMessage.bind(controller)
  );
  app.delete(
    "/workspaces/:workspaceId/message-guard/:id",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "delete")] },
    controller.deleteGuardWord.bind(controller)
  );

  // ── Bumps ──
  app.post(
    "/workspaces/:workspaceId/bumps",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createBumpRule.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/bumps",
    { preHandler: [authMiddleware] },
    controller.listBumpRules.bind(controller)
  );

  // ── Broadcasts ──
  app.post(
    "/workspaces/:workspaceId/broadcasts",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createBroadcast.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/broadcasts",
    { preHandler: [authMiddleware] },
    controller.listBroadcasts.bind(controller)
  );
  app.post(
    "/workspaces/:workspaceId/broadcasts/:id/send",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "update")] },
    controller.sendBroadcast.bind(controller)
  );

  // ── Social Funnels ──
  app.post(
    "/workspaces/:workspaceId/social-funnels",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createSocialFunnel.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/social-funnels",
    { preHandler: [authMiddleware] },
    controller.listSocialFunnels.bind(controller)
  );

  // ── Onboarding Funnels ──
  app.post(
    "/workspaces/:workspaceId/onboarding",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "create")] },
    controller.createOnboardingFunnel.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/onboarding",
    { preHandler: [authMiddleware] },
    controller.listOnboardingFunnels.bind(controller)
  );
  app.get(
    "/workspaces/:workspaceId/onboarding/:id",
    { preHandler: [authMiddleware] },
    controller.getOnboardingFunnel.bind(controller)
  );
  app.put(
    "/workspaces/:workspaceId/onboarding/:id",
    { preHandler: [authMiddleware, permissionMiddleware("automation", "update")] },
    controller.updateOnboardingFunnel.bind(controller)
  );
}
