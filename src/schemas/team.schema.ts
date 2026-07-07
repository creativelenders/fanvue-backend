import { z } from "zod";

export const StartShiftRequestSchema = z.object({
  chatterId: z.string().uuid(),
  notes: z.string().optional(),
});

export type StartShiftRequest = z.infer<typeof StartShiftRequestSchema>;

export const EndShiftRequestSchema = z.object({
  totalMessages: z.number().int().min(0).optional(),
  totalPpvSent: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export type EndShiftRequest = z.infer<typeof EndShiftRequestSchema>;

export const CreateScheduleRequestSchema = z.object({
  userId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  timezone: z.string().max(64).default("UTC"),
  isRecurring: z.boolean().default(true),
});

export type CreateScheduleRequest = z.infer<typeof CreateScheduleRequestSchema>;

export const ShiftResponseSchema = z.object({
  id: z.string().uuid(),
  chatterId: z.string().uuid(),
  chatterName: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  totalMessages: z.number(),
  totalPpvSent: z.number(),
  conversionRate: z.string(),
  revenue: z.string(),
  avgResponseTime: z.number().nullable(),
});

export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;
