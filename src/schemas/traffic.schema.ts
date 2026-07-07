import { z } from "zod";

export const CreateTrafficSourceRequestSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().optional(),
  platform: z.string().max(64).optional(),
  utmSource: z.string().max(128).optional(),
  utmMedium: z.string().max(128).optional(),
  utmCampaign: z.string().max(128).optional(),
});

export type CreateTrafficSourceRequest = z.infer<typeof CreateTrafficSourceRequestSchema>;

export const TrafficSourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().nullable(),
  platform: z.string().nullable(),
  trackingCode: z.string(),
  totalClicks: z.number(),
  totalSubscriptions: z.number(),
  totalRevenue: z.string(),
  roi: z.string(),
  createdAt: z.string(),
});

export type TrafficSourceResponse = z.infer<typeof TrafficSourceResponseSchema>;
