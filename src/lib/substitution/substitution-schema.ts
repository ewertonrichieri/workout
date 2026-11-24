import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/constants/catalog";
import { MAX_EXCLUDED_SLUGS, MAX_SUBSTITUTION_REASON_LENGTH, MAX_SUBSTITUTION_SUGGESTIONS, SUBSTITUTION_REASONS } from "@/lib/constants/substitution";
import { plannedExerciseInfoSchema } from "@/lib/readiness/adjustment-schema";

const slugSchema = z.string().regex(SLUG_PATTERN);

/** Body of POST /api/workout-exercises/:id/substitutions (step 3B.4). */
export const substitutionRequestSchema = z.object({
  reason: z.enum(SUBSTITUTION_REASONS).nullable().default(null),
  /** Exercises the device already shows today; used only to filter the options. */
  excludeSlugs: z.array(slugSchema).max(MAX_EXCLUDED_SLUGS).default([]),
});
export type SubstitutionRequest = z.infer<typeof substitutionRequestSchema>;

/** Structured output asked from Claude: plain fields only (converts to JSON Schema). */
export const aiSubstitutionSchema = z.object({
  suggestions: z.array(z.object({
    exerciseSlug: z.string().min(1).describe("Slug copied exactly from the candidate list"),
    reason: z.string().min(1).max(MAX_SUBSTITUTION_REASON_LENGTH).describe("Short reason in Brazilian Portuguese"),
  })).min(1).max(MAX_SUBSTITUTION_SUGGESTIONS),
});
export type AiSubstitution = z.infer<typeof aiSubstitutionSchema>;

/** Muscles and equipment of a catalog exercise, as list_substitution_candidates returns them. */
export interface SubstitutionProfile {
  slug: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
}

/** What the swap screen shows; `isAutomatic` = ranked by shared muscles only (the AI did not choose). */
export const substitutionResultSchema = z.object({
  isAutomatic: z.boolean(),
  suggestions: z.array(z.object({ exercise: plannedExerciseInfoSchema, reason: z.string().nullable() })).min(1).max(MAX_SUBSTITUTION_SUGGESTIONS),
});
export type SubstitutionResult = z.infer<typeof substitutionResultSchema>;

/** One swap of today kept in the draft and sent when finishing. */
export const draftSubstitutionSchema = z.object({
  exercise: plannedExerciseInfoSchema,
  reason: z.enum(SUBSTITUTION_REASONS).nullable(),
});
export type DraftSubstitution = z.infer<typeof draftSubstitutionSchema>;
