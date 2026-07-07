import { z } from "zod";

export const AddFanRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  handle: z.string().max(255).optional(),
  platform: z.string().max(32).optional(),
  platformId: z.string().max(255).optional(),
  status: z.enum(["active", "expired", "churned", "pending"]).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AddFanRequest = z.infer<typeof AddFanRequestSchema>;

export const UpdateFanRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  handle: z.string().max(255).optional(),
  status: z.enum(["active", "expired", "churned", "pending"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateFanRequest = z.infer<typeof UpdateFanRequestSchema>;

export const FanResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  handle: z.string().nullable(),
  platform: z.string().nullable(),
  status: z.string(),
  score: z.number(),
  totalSpend: z.string(),
  avgSpend: z.string(),
  totalMessages: z.number(),
  lastActiveAt: z.string().nullable(),
  subscribedAt: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.object({ id: z.string().uuid(), name: z.string(), color: z.string() })),
  createdAt: z.string(),
});

export type FanResponse = z.infer<typeof FanResponseSchema>;

export const FanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["score", "totalSpend", "lastActiveAt", "createdAt"]).default("score"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "expired", "churned", "pending"]).optional(),
  search: z.string().max(255).optional(),
  minScore: z.coerce.number().int().optional(),
  maxScore: z.coerce.number().int().optional(),
  tagId: z.string().uuid().optional(),
});

export type FanListQuery = z.infer<typeof FanListQuerySchema>;

export const CreateFanListRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDynamic: z.boolean().default(false),
  dynamicCriteria: z.object({
    minScore: z.number().int().optional(),
    maxScore: z.number().int().optional(),
    minSpend: z.number().optional(),
    status: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
    lastActiveWithinDays: z.number().int().optional(),
  }).optional(),
});

export type CreateFanListRequest = z.infer<typeof CreateFanListRequestSchema>;
