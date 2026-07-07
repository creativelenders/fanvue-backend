import { z } from "zod";

// ── Generate Content ──
export const GenerateContentRequestSchema = z.object({
  prompt: z.string().min(3).max(5000),
  strategySlug: z.string().min(1).max(64),
  platform: z.string().max(32).optional(),
  aiModelSlug: z.string().max(64).optional(),
  tone: z.string().max(32).optional(),
  targetAudience: z.string().max(256).optional(),
  variations: z.coerce.number().int().min(1).max(10).default(1),
  metadata: z.record(z.unknown()).optional(),
});

export type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

export const GenerateContentResponseSchema = z.object({
  id: z.string().uuid(),
  generatedContent: z.string(),
  strategy: z.object({ id: z.string().uuid(), name: z.string() }),
  aiModel: z.object({ id: z.string().uuid(), name: z.string(), provider: z.string() }),
  riskScore: z.number().nullable(),
  costIncurred: z.string(),
  tokensUsed: z.number(),
  latencyMs: z.number(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});

export type GenerateContentResponse = z.infer<typeof GenerateContentResponseSchema>;

// ── Batch Generate ──
export const BatchGenerateRequestSchema = z.object({
  prompts: z.array(z.string().min(3).max(5000)).min(1).max(10),
  strategySlug: z.string().min(1).max(64),
  platform: z.string().max(32).optional(),
  aiModelSlug: z.string().max(64).optional(),
});

export type BatchGenerateRequest = z.infer<typeof BatchGenerateRequestSchema>;

// ── Content List Query ──
export const ContentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "tokensUsed", "costIncurred"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  strategyId: z.string().uuid().optional(),
  isArchived: z.coerce.boolean().optional(),
  search: z.string().max(256).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ContentListQuery = z.infer<typeof ContentListQuerySchema>;

// ── Content Item (for responses) ──
export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string(),
  generatedContent: z.string(),
  strategy: z.object({ id: z.string().uuid(), name: z.string() }),
  aiModel: z.object({ id: z.string().uuid(), name: z.string(), provider: z.string() }),
  riskScore: z.number().nullable(),
  complianceApproved: z.boolean().nullable(),
  costIncurred: z.string(),
  tokensUsed: z.number(),
  latencyMs: z.number(),
  isArchived: z.boolean(),
  createdAt: z.string(),
});

export type ContentItem = z.infer<typeof ContentItemSchema>;
