import { z } from "zod";

export const AiModelResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  provider: z.string(),
  modelVersion: z.string().nullable(),
  capabilities: z.object({
    creativity: z.number(),
    reasoning: z.number(),
    logic: z.number(),
    speed: z.number(),
  }),
  costPerRequest: z.string(),
  contextWindow: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type AiModelResponse = z.infer<typeof AiModelResponseSchema>;

export const UpdateModelRequestSchema = z.object({
  isActive: z.boolean().optional(),
  costPerRequest: z.string().optional(),
  capabilities: z
    .object({
      creativity: z.number().min(1).max(10).optional(),
      reasoning: z.number().min(1).max(10).optional(),
      logic: z.number().min(1).max(10).optional(),
      speed: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

export type UpdateModelRequest = z.infer<typeof UpdateModelRequestSchema>;

export const UsageStatsQuerySchema = z.object({
  modelId: z.string().uuid().optional(),
  period: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export type UsageStatsQuery = z.infer<typeof UsageStatsQuerySchema>;

export const UsageStatsResponseSchema = z.object({
  totalRequests: z.number(),
  totalTokens: z.number(),
  totalCost: z.string(),
  modelBreakdown: z.array(
    z.object({
      modelName: z.string(),
      requests: z.number(),
      tokens: z.number(),
      cost: z.string(),
      avgLatencyMs: z.number(),
    })
  ),
});

export type UsageStatsResponse = z.infer<typeof UsageStatsResponseSchema>;
