import { z } from "zod";
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from "@/lib/constants/assessment";
import { BODY_REGIONS, ENERGY_LEVELS, PAIN_INTENSITIES, SLEEP_QUALITIES } from "@/lib/constants/readiness";

export const reportedPainSchema = z.object({
  bodyRegion: z.enum(BODY_REGIONS),
  intensity: z.enum(PAIN_INTENSITIES),
});

const painsSchema = z
  .array(reportedPainSchema)
  .max(BODY_REGIONS.length)
  .refine((pains) => new Set(pains.map((pain) => pain.bodyRegion)).size === pains.length);

/** Body of POST /api/readiness-checkins (step 3B.1); the same limits of time as the assessment. */
export const readinessCheckinInputSchema = z.object({
  workoutId: z.uuid(),
  sleepQuality: z.enum(SLEEP_QUALITIES),
  energyLevel: z.enum(ENERGY_LEVELS),
  availableMinutes: z.number().int().min(MIN_SESSION_MINUTES).max(MAX_SESSION_MINUTES),
  pains: painsSchema,
});

export type ReportedPain = z.infer<typeof reportedPainSchema>;
export type ReadinessCheckinInput = z.infer<typeof readinessCheckinInputSchema>;

/** What the workout screen needs after saving: kept in the draft of the day. */
export const checkinResultSchema = z.object({
  checkinId: z.uuid(),
  needsAdjustment: z.boolean(),
  hasSeverePain: z.boolean(),
});
export type CheckinResult = z.infer<typeof checkinResultSchema>;
