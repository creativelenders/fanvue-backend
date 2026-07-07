// @ts-nocheck
import { db } from "../db/client";
import {
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  subscriptionPlans,
  workspaceSubscriptions,
  rolePermissions,
} from "../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { ConflictError, NotFoundError, BadRequestError } from "../utils/errors";
import crypto from "crypto";
import bcrypt from "bcrypt";
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest } from "../schemas/workspaces.schema";

export class WorkspaceService {
  async create(userId: string, data: CreateWorkspaceRequest) {
    // Check slug uniqueness
    let finalSlug = data.slug;
    const existing = await db.query.workspaces.findFirst({
      where: eq(workspaces.slug, finalSlug),
    });
    if (existing) {
      finalSlug = `${finalSlug}-${crypto.randomBytes(4).toString("hex")}`;
    }

    // Get default plan (Standard)
    const defaultPlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, "standard"),
    });
    if (!defaultPlan) throw new Error("Default plan not found");

    // Create workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: data.name,
        slug: finalSlug,
        plan: "standard",
        isTrialing: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        aiGenerationsLimit: defaultPlan.aiGenerationsLimit,
      })
      .returning();

    // Add creator as owner
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    // Create subscription record
    await db.insert(workspaceSubscriptions).values({
      workspaceId: workspace.id,
      planId: defaultPlan.id,
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // Seed default role permissions for this workspace
    await this.seedRolePermissions(workspace.id);

    return workspace;
  }

  async getById(workspaceId: string) {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });
    if (!workspace) throw new NotFoundError("Workspace");
    return workspace;
  }

  async update(workspaceId: string, data: UpdateWorkspaceRequest) {
    if (data.slug) {
      const existing = await db.query.workspaces.findFirst({
        where: and(
          eq(workspaces.slug, data.slug),
          sql`${workspaces.id} != ${workspaceId}`
        ),
      });
      if (existing) throw new ConflictError("Slug already taken");
    }

    const [updated] = await db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updated) throw new NotFoundError("Workspace");
    return updated;
  }

  async getMembers(workspaceId: string) {
    return db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
      with: {
        user: {
          columns: { id: true, email: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async inviteMember(workspaceId: string, inviterId: string, data: { email: string; role: string }) {
    const workspace = await this.getById(workspaceId);

    // Check if user already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, inviterId)
      ),
    });

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const [invitation] = await db
      .insert(workspaceInvitations)
      .values({
        workspaceId,
        email: data.email.toLowerCase(),
        role: data.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();

    // In production: send email with invitation link
    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await db.query.workspaceInvitations.findFirst({
      where: eq(workspaceInvitations.token, token),
    });

    if (!invitation || invitation.expiresAt < new Date() || invitation.acceptedAt) {
      throw new BadRequestError("Invalid or expired invitation");
    }

    // Add user to workspace
    await db.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await db
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id));

    return invitation.workspaceId;
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: string) {
    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated) throw new NotFoundError("Member");
    return updated;
  }

  async removeMember(workspaceId: string, memberId: string) {
    const result = await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );
    if (result.rowCount === 0) throw new NotFoundError("Member");
  }

  async getUserWorkspaces(userId: string) {
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, userId),
      with: { workspace: true },
    });
    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }
  
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      ),
    });
    return !!membership;
  }

  private async seedRolePermissions(workspaceId: string) {
    const resources = [
      "content", "chat", "media", "fans", "ppv",
      "automation", "team", "traffic", "analytics", "settings",
    ];
    const actions = ["create", "read", "update", "delete", "approve"];

    const permissionMatrix: Record<string, string[]> = {
      owner: resources.flatMap((r) => actions.map((a) => `${r}:${a}`)),
      admin: resources.flatMap((r) => actions.map((a) => `${r}:${a}`)),
      editor: [
        "content:create", "content:read", "content:update",
        "chat:create", "chat:read", "chat:update",
        "media:create", "media:read",
        "fans:read", "fans:update",
        "ppv:create", "ppv:read",
        "automation:read",
        "analytics:read",
        "team:read",
      ],
      chatter: [
        "chat:create", "chat:read", "chat:update",
        "fans:read",
        "ppv:read",
        "team:read",
        "team:create",
      ],
    };

    for (const [role, perms] of Object.entries(permissionMatrix)) {
      for (const perm of perms) {
        const [resource, action] = perm.split(":");
        await db.insert(rolePermissions).values({
          workspaceId,
          role,
          resource,
          action,
          isAllowed: true,
        }).onConflictDoNothing({
          target: [rolePermissions.workspaceId, rolePermissions.role, rolePermissions.resource, rolePermissions.action],
        });
      }
    }
  }
}
