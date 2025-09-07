import { z } from "zod";

export const ScheduleIntentSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string().optional(),
  durationMinutes: z.number().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  attendees: z.array(z.string()).optional()
});

export type ScheduleIntent = z.infer<typeof ScheduleIntentSchema>;

export const TravelQuerySchema = z.object({
  origin: z.string(),
  destination: z.string(),
  mode: z.enum(["driving", "walking", "cycling", "transit"]).default("driving")
});

export type TravelQuery = z.infer<typeof TravelQuerySchema>;

