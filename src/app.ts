import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import { workspacePlugin } from "./plugins/workspace.plugin";
import { errorHandler } from "./plugins/error-handler.plugin";

import { authRoutes } from "./routes/auth.routes";
import { workspaceRoutes } from "./routes/workspaces.routes";
import { contentRoutes } from "./routes/content.routes";
import { promptsRoutes } from "./routes/prompts.routes";
import { chatRoutes } from "./routes/chat.routes";
import { mediaRoutes } from "./routes/media.routes";
import { fanRoutes } from "./routes/fans.routes";
import { ppvRoutes } from "./routes/ppv.routes";
import { automationRoutes } from "./routes/automation.routes";
import { teamRoutes } from "./routes/team.routes";
import { trafficRoutes } from "./routes/traffic.routes";
import { billingRoutes } from "./routes/billing.routes";
import { analyticsRoutes } from "./routes/analytics.routes";
import { healthRoutes } from "./routes/health.routes";
import { aiRoutes } from "./routes/ai.routes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ── Plugins ──
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    }
  });
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    prefix: "/", // so /uploads/file.png works
  });
  await app.register(workspacePlugin);

  // ── Error Handler ──
  app.setErrorHandler(errorHandler);

  // ── Type augmentation ──
  app.decorateRequest("user", undefined);
  app.decorateRequest("workspace", undefined);
  app.decorateRequest("workspaceId", undefined);

  // ── Routes ──
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(workspaceRoutes, { prefix: "/api/v1" });
  await app.register(contentRoutes, { prefix: "/api/v1" });
  await app.register(promptsRoutes, { prefix: "/api/v1" });
  await app.register(chatRoutes, { prefix: "/api/v1" });
  await app.register(mediaRoutes, { prefix: "/api/v1" });
  await app.register(fanRoutes, { prefix: "/api/v1" });
  await app.register(ppvRoutes, { prefix: "/api/v1" });
  await app.register(automationRoutes, { prefix: "/api/v1" });
  await app.register(teamRoutes, { prefix: "/api/v1" });
  await app.register(trafficRoutes, { prefix: "/api/v1" });
  await app.register(billingRoutes, { prefix: "/api/v1" });
  await app.register(analyticsRoutes, { prefix: "/api/v1" });
  await app.register(aiRoutes, { prefix: "/api/v1" });

  return app;
}
