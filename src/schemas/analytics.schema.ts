import { z } from "zod";

// ── Track Event ──
export const TrackEventRequestSchema = z.object({
  eventType: z.string().min(1).max(64),
  eventName: z.string().max(128).optional(),
  pagePath: z.string().max(512).optional(),
  referrer: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  value: z.number().optional(),
});

export type TrackEventRequest = z.infer<typeof TrackEventRequestSchema>;

// ── Dashboard Query ──
export const DashboardQuerySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  platform: z.string().max(32).optional(),
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

export const DashboardResponseSchema = z.object({
  activeUsers: z.number(),
  totalViews: z.number(),
  totalGenerations: z.number(),
  bounceRate: z.number(),
  conversionRate: z.number(),
  revenue: z.string(),
  eventsOverTime: z.array(
    z.object({
      date: z.string(),
      views: z.number(),
      generations: z.number(),
      conversions: z.number(),
    })
  ),
  topStrategies: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
      percentage: z.number(),
    })
  ),
  engagementByPlatform: z.array(
    z.object({
      platform: z.string(),
      count: z.number(),
      avgEngagement: z.number(),
    })
  ),
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
