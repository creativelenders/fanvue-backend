import "fastify";
import type { workspaces } from "../db/schema";
import type { FastifyReply, FastifyRequest as Req } from "fastify";

type Workspace = typeof workspaces.$inferSelect;

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      sub: string;
      email: string;
      role: string;
      tier: string;
    };
    workspace?: Workspace;
    workspaceId?: string;
  }

  interface FastifyInstance {
    resolveWorkspace: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
