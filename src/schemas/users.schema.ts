import { z } from "zod";

export const UserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
  tier: z.string(),
  twoFactorEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(2).max(128).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const UpdateUserRoleRequestSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "contributor", "power_user", "elite", "admin"]),
});

export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;
