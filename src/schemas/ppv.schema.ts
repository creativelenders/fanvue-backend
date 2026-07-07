import { z } from "zod";

export const CreatePpvCampaignRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().max(32).optional(),
  price: z.number().positive().max(9999.99),
  targetListId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type CreatePpvCampaignRequest = z.infer<typeof CreatePpvCampaignRequestSchema>;

export const PpvCampaignResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  price: z.string(),
  status: z.string(),
  totalSent: z.number(),
  totalOpens: z.number(),
  totalPurchases: z.number(),
  revenue: z.string(),
  createdAt: z.string(),
});

export type PpvCampaignResponse = z.infer<typeof PpvCampaignResponseSchema>;
