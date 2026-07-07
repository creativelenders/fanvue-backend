import type { FastifyReply, FastifyRequest } from "fastify";
import { WorkspaceService } from "../services/workspace.service";

export class WorkspaceController {
  private service = new WorkspaceService();

  async create(req: FastifyRequest, reply: FastifyReply) {
    // We assume body contains name, slug
    const data = req.body as any;
    console.log("CREATE WORKSPACE API HIT:", data);
    const workspace = await this.service.create(req.user!.sub, data);
    return reply.status(201).send({ success: true, data: workspace });
  }
  
  async list(req: FastifyRequest, reply: FastifyReply) {
    const workspaces = await this.service.getUserWorkspaces(req.user!.sub);
    return reply.status(200).send({ success: true, data: workspaces });
  }
  
  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const workspace = await this.service.getById(workspaceId);
    return reply.status(200).send({ success: true, data: workspace });
  }
  
  async update(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    const data = req.body as any;
    const workspace = await this.service.update(workspaceId, data);
    return reply.status(200).send({ success: true, data: workspace });
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = req.params as { workspaceId: string };
    // Import db and workspaces here, or do it at the top
    const { db } = await import("../db/client");
    const { workspaces } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    return reply.status(200).send({ success: true, data: null });
  }

  async getMembers(req: FastifyRequest, reply: FastifyReply) {}
  async invite(req: FastifyRequest, reply: FastifyReply) {}
  async acceptInvite(req: FastifyRequest, reply: FastifyReply) {}
  async updateMember(req: FastifyRequest, reply: FastifyReply) {}
  async removeMember(req: FastifyRequest, reply: FastifyReply) {}
}
