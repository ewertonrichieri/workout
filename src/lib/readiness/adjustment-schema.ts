import { z } from "zod";
import { MAX_PLAN_REPS, MAX_PLAN_SETS } from "@/lib/constants/plan-generation";
import { MAX_SESSION_MINUTES } from "@/lib/constants/assessment";
import { SLUG_PATTERN } from "@/lib/constants/catalog";
import {
  ADJUSTMENT_CHANGE_TYPES,
  MAX_ADJUSTMENT_CHANGES,
  MAX_ADJUSTMENT_REASON_LENGTH,
  MAX_ADJUSTMENT_SUMMARY_LENGTH,
} from "@/lib/constants/readiness";

const setsSchema = z.number().int().min(1).max(MAX_PLAN_SETS);
const repsSchema = z.number().int().min(1).max(MAX_PLAN_REPS);
const reasonSchema = z.string().trim().min(1).max(MAX_ADJUSTMENT_REASON_LENGTH);

/**
 * Structured output asked from Claude (step 3B.2). Plain fields only, so it converts to JSON Schema;
 * cross-field rules live in adjustment-rules.ts. Null sets/reps keep the planned value.
 */
export const aiDailyAdjustmentSchema = z.object({
  summary: z.string().min(1).max(MAX_ADJUSTMENT_SUMMARY_LENGTH).describe("One or two sentences in Brazilian Portuguese"),
  estimatedMinutes: z.number().int().min(1).max(MAX_SESSION_MINUTES).describe("Approximate length of the adjusted workout"),
  changes: z.array(z.object({
    exerciseSlug: z.string().min(1).describe("Slug of an exercise of today's workout"),
    changeType: z.enum(ADJUSTMENT_CHANGE_TYPES),
    replacementSlug: z.string().min(1).nullable().describe("Only for replaced: slug copied exactly from the replacement list"),
    sets: setsSchema.nullable(),
    repsMin: repsSchema.nullable(),
    repsMax: repsSchema.nullable(),
    reason: z.string().min(1).max(MAX_ADJUSTMENT_REASON_LENGTH).describe("Short reason in Brazilian Portuguese"),
  })).max(MAX_ADJUSTMENT_CHANGES),
});
export type AiDailyAdjustment = z.infer<typeof aiDailyAdjustmentSchema>;

/** One change keyed by prescription; sets and reps are final (null only when removed). */
export const adjustmentChangeSchema = z.object({
  workoutExerciseId: z.uuid(),
  changeType: z.enum(ADJUSTMENT_CHANGE_TYPES),
  replacementSlug: z.string().regex(SLUG_PATTERN).nullable(),
  sets: setsSchema.nullable(),
  repsMin: repsSchema.nullable(),
  repsMax: repsSchema.nullable(),
  reason: reasonSchema,
});
export type AdjustmentChange = z.infer<typeof adjustmentChangeSchema>;

/** Body of PUT /api/readiness-checkins/:id/adjustment; an empty list restores the original workout. */
export const saveAdjustmentInputSchema = z.object({ changes: z.array(adjustmentChangeSchema).max(MAX_ADJUSTMENT_CHANGES) });

const mediaItemSchema = z.object({
  mediaType: z.enum(["video", "gif", "image", "youtube"]),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  source: z.string(),
  license: z.string(),
});

export const plannedExerciseInfoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  coverMedia: mediaItemSchema.nullable(),
  media: z.array(mediaItemSchema),
});

/** What the review screen shows (and the draft keeps): changes with the replacement's name and media. */
export const adjustmentProposalSchema = z.object({
  checkinId: z.uuid(),
  summary: z.string(),
  estimatedMinutes: z.number().int().positive(),
  changes: z.array(adjustmentChangeSchema.extend({ replacement: plannedExerciseInfoSchema.nullable() })),
});
export type AdjustmentProposal = z.infer<typeof adjustmentProposalSchema>;
export type ProposedChange = AdjustmentProposal["changes"][number];

/** Daily adjustment kept in the draft of the day, so reloading never calls the AI again. */
export const draftAdjustmentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("proposed"), proposal: adjustmentProposalSchema }),
  z.object({ status: z.literal("accepted"), proposal: adjustmentProposalSchema }),
  z.object({ status: z.literal("declined") }),
]);
export type DraftAdjustment = z.infer<typeof draftAdjustmentSchema>;
