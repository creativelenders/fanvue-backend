import { z } from "zod";

// ── Autopilot ──
export const UpdateAutopilotRequestSchema = z.object({
  isEnabled: z.boolean().optional(),
  mode: z.enum(["assist", "auto", "off"]).optional(),
  maxAutoRepliesPerHour: z.number().int().min(1).max(500).optional(),
  requireApprovalAbove: z.number().positive().optional(),
  autoGreetNewFans: z.boolean().optional(),
  autoSellPpv: z.boolean().optional(),
  greetingMessage: z.string().max(2000).optional(),
});

export type UpdateAutopilotRequest = z.infer<typeof UpdateAutopilotRequestSchema>;

export const AutopilotConfigResponseSchema = z.object({
  isEnabled: z.boolean(),
  mode: z.string(),
  maxAutoRepliesPerHour: z.number(),
  requireApprovalAbove: z.string().nullable(),
  autoGreetNewFans: z.boolean(),
  autoSellPpv: z.boolean(),
  greetingMessage: z.string().nullable(),
  totalAutoReplies: z.number(),
  revenueGenerated: z.string(),
});

export type AutopilotConfigResponse = z.infer<typeof AutopilotConfigResponseSchema>;

// ── Conversation Flows ──
export const CreateFlowRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  keyword: z.string().max(128).optional(),
  steps: z.array(z.object({
    stepOrder: z.number().int().min(0),
    message: z.string().min(1).max(5000),
    delayMinutes: z.number().int().min(0).default(0),
    condition: z.object({
      ifResponseContains: z.string().optional(),
      ifNoResponse: z.boolean().optional(),
    }).optional(),
    ppvCampaignId: z.string().uuid().optional(),
  })).min(1).max(20),
});

export type CreateFlowRequest = z.infer<typeof CreateFlowRequestSchema>;

// ── Keyword Triggers ──
export const CreateTriggerRequestSchema = z.object({
  name: z.string().min(1).max(128),
  keywords: z.array(z.string().min(1)).min(1).max(50),
  response: z.string().min(1).max(2000),
  ppvCampaignId: z.string().uuid().optional(),
  matchType: z.enum(["exact", "contains", "regex"]).default("contains"),
});

export type CreateTriggerRequest = z.infer<typeof CreateTriggerRequestSchema>;

// ── Message Guard ──
export const AddGuardWordRequestSchema = z.object({
  word: z.string().min(1).max(128),
  action: z.enum(["block", "flag", "warn"]).default("block"),
});

export type AddGuardWordRequest = z.infer<typeof AddGuardWordRequestSchema>;

export const CheckMessageRequestSchema = z.object({
  message: z.string().min(1).max(5000),
});

export type CheckMessageRequest = z.infer<typeof CheckMessageRequestSchema>;

// ── Bumps ──
export const CreateBumpRuleRequestSchema = z.object({
  name: z.string().min(1).max(255),
  inactiveDays: z.number().int().min(1).max(365),
  message: z.string().min(1).max(2000),
  includePpv: z.boolean().default(false),
  ppvCampaignId: z.string().uuid().optional(),
  maxBumpsPerFan: z.number().int().min(1).max(20).default(3),
  cooldownDays: z.number().int().min(1).max(90).default(7),
});

export type CreateBumpRuleRequest = z.infer<typeof CreateBumpRuleRequestSchema>;

// ── Broadcasts ──
export const CreateBroadcastRequestSchema = z.object({
  name: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  includePpv: z.boolean().default(false),
  ppvCampaignId: z.string().uuid().optional(),
  targetListId: z.string().uuid().optional(),
  personalizationFields: z.array(z.string()).max(10).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type CreateBroadcastRequest = z.infer<typeof CreateBroadcastRequestSchema>;

// ── Social Funnels ──
export const CreateSocialFunnelRequestSchema = z.object({
  name: z.string().min(1).max(255),
  platform: z.enum(["instagram", "twitter", "tiktok"]),
  trigger: z.enum(["comment", "reply", "mention", "dm"]),
  keywords: z.array(z.string()).max(50).optional(),
  autoDmMessage: z.string().min(1).max(2000),
});

export type CreateSocialFunnelRequest = z.infer<typeof CreateSocialFunnelRequestSchema>;

// ── Onboarding Funnels ──
export const CreateOnboardingFunnelRequestSchema = z.object({
  name: z.string().min(1).max(255),
  steps: z.array(z.object({
    stepOrder: z.number().int().min(0),
    delayHours: z.number().int().min(0).default(0),
    message: z.string().min(1).max(5000),
    ppvCampaignId: z.string().uuid().optional(),
  })).min(1).max(20),
});

export type CreateOnboardingFunnelRequest = z.infer<typeof CreateOnboardingFunnelRequestSchema>;
