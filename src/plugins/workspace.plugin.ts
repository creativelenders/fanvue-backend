import type { FastifyInstance } from "fastify";
import { WorkspaceService } from "../services/workspace.service";
import { BadRequestError } from "../utils/errors";

const workspaceService = new WorkspaceService();

export async function workspacePlugin(app: FastifyInstance) {
  /**
   * Decorator that resolves workspaceId from route params
   * and attaches the workspace to the request.
   * Usage: { preHandler: [authMiddleware, app.resolveWorkspace] }
   */
  app.decorateRequest("workspace", undefined);
  app.decorateRequest("workspaceId", undefined);

  app.decorate("resolveWorkspace", async function (request: any, _reply: any) {
    const { workspaceId } = request.params as { workspaceId?: string };
    if (!workspaceId) {
      throw new BadRequestError("Workspace ID required");
    }

    const workspace = await workspaceService.getById(workspaceId);
    request.workspace = workspace;
    request.workspaceId = workspaceId;

    // Verify user is a member of this workspace
    const isMember = await workspaceService.isMember(workspaceId, request.user.sub);
    if (!isMember) {
      throw new BadRequestError("Not a member of this workspace");
    }
  });
}
