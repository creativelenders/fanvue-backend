import type { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new AuthController();

export async function authRoutes(app: FastifyInstance) {
  // ── Public routes ──
  app.post("/auth/login", controller.login.bind(controller));
  app.post("/auth/register", controller.register.bind(controller));
  app.post("/auth/refresh", controller.refresh.bind(controller));
  app.post("/auth/forgot-password", controller.forgotPassword.bind(controller));
  app.post("/auth/reset-password", controller.resetPassword.bind(controller));

  // ── Protected routes ──
  app.post("/auth/logout", { preHandler: [authMiddleware] }, controller.logout.bind(controller));
  app.get("/auth/me", { preHandler: [authMiddleware] }, controller.me.bind(controller));
  app.post("/auth/change-password", { preHandler: [authMiddleware] }, controller.changePassword.bind(controller));
  app.post("/auth/2fa/setup", { preHandler: [authMiddleware] }, controller.setup2FA.bind(controller));
  app.post("/auth/2fa/verify", { preHandler: [authMiddleware] }, controller.verify2FA.bind(controller));
}
