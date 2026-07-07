import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const UuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const WorkspaceParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.record(z.unknown()).optional(),
  });

export const PeriodQuerySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
});
