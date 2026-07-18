import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth.middleware";
import { db } from "../db/client";

const AI_API_URL = process.env.AI_API_URL || process.env.API_BASE_URL || "http://localhost:8000";
const AI_AUTH_SECRET = process.env.AI_AUTH_SECRET || "fanvue_super_secret_auth_key_123";

function generateAuthHeaders(method: string, path: string, workspaceId: string, userId: string, role: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const canonical = `${timestamp}.${method}.${path}.${workspaceId}.${userId}.${role}`;
  const signature = crypto.createHmac("sha256", AI_AUTH_SECRET).update(canonical).digest("hex");
  return {
    "x-workspace-id": workspaceId,
    "x-user-id": userId,
    "x-user-role": role,
    "x-auth-timestamp": timestamp,
    "x-auth-signature": signature,
    "Content-Type": "application/json"
  };
}

export async function aiRoutes(app: FastifyInstance) {
  app.all("/ai/*", { preHandler: [authMiddleware] }, async (req, reply) => {
    const proxyPaths = [
      "/platform/dashboard",
      "/platform/campaigns",
      "/platform/media/jobs",
      "/platform/approvals",
      "/platform/webhooks",
      "/platform/autonomous_ops"
    ];
    const path = req.url.replace("/api/v1/ai", "");
    const userId = req.user?.sub || "demo_operator";
    let workspaceId = (req.user as any)?.workspaceId || (req as any).workspaceId;

    if (workspaceId && workspaceId !== "demo_workspace") {
      const exists = await db.query.workspaces.findFirst({
        // @ts-ignore: Drizzle ORM resolution mode mismatch in NodeNext
        where: (ws, { eq }) => eq(ws.id, workspaceId as string),
      });
      if (!exists) {
        workspaceId = null;
      }
    }

    if (!workspaceId || workspaceId === "demo_workspace") {
      const defaultWorkspace = await db.query.workspaces.findFirst();
      if (defaultWorkspace) {
        workspaceId = defaultWorkspace.id;
      } else {
        // Fallback to the known UUID from the DB
        workspaceId = "3af39644-6d79-4384-842d-3f141bd63919";
      }
    }
    
    const role = "owner"; 

    const headers = generateAuthHeaders(req.method, path, workspaceId, userId, role);
    
    try {
      const fetchOptions: RequestInit = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(`${AI_API_URL}${path}`, fetchOptions);
      
      let statusToReturn = response.status;
      // If the upstream AI service returns 401 because our internal HMAC signatures mismatch,
      // return 502 to the frontend instead of 401 so the frontend doesn't log the user out.
      if (statusToReturn === 401) {
        statusToReturn = 502;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          req.log.error(`AI API Error (${response.status}): ${JSON.stringify(data)}`);
        }
        return reply.status(statusToReturn).send(data);
      } else {
        const text = await response.text();
        if (!response.ok) {
          req.log.error(`AI API Error (${response.status}): ${text}`);
        }
        return reply.status(statusToReturn).send(text);
      }
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ success: false, message: "AI Engine connection failed" });
    }
  });
}
