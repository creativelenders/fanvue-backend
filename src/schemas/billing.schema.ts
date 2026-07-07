import { z } from "zod";

export const PlanResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  price: z.string(),
  aiGenerationsLimit: z.number(),
  socialPlatforms: z.number(),
  seats: z.number(),
  hasAdvancedAnalytics: z.boolean(),
  hasApiAccess: z.boolean(),
  hasPrioritySupport: z.boolean(),
  hasTeamManagement: z.boolean(),
  features: z.array(z.string()),
  sortOrder: z.number(),
});

export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export const SubscriptionResponseSchema = z.object({
  id: z.string().uuid(),
  plan: PlanResponseSchema,
  status: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  trialEndsAt: z.string().nullable(),
  createdAt: z.string(),
});

export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const ChangePlanRequestSchema = z.object({
  planId: z.string().uuid(),
});

export type ChangePlanRequest = z.infer<typeof ChangePlanRequestSchema>;

export const UsageResponseSchema = z.object({
  aiGenerationsUsed: z.number(),
  aiGenerationsLimit: z.number(),
  apiCalls: z.number(),
  storageUsed: z.number(),
  usageByDay: z.array(z.object({
    date: z.string(),
    generations: z.number(),
    cost: z.string(),
  })),
});

export type UsageResponse = z.infer<typeof UsageResponseSchema>;
