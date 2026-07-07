import { z } from "zod";

export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
});

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

export const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/).optional(),
});

export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

export const WorkspaceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  isTrialing: z.boolean(),
  aiGenerationsUsed: z.number(),
  aiGenerationsLimit: z.number(),
  totalFans: z.number(),
  totalRevenue: z.string(),
  createdAt: z.string(),
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export const InviteMemberRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "chatter"]),
});

export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>;

export const UpdateMemberRoleRequestSchema = z.object({
  role: z.enum(["admin", "editor", "chatter"]),
});

export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>;

export const WorkspaceMemberResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.string(),
  joinedAt: z.string(),
});

export type WorkspaceMemberResponse = z.infer<typeof WorkspaceMemberResponseSchema>;
