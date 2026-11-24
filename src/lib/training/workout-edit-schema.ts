import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/constants/catalog";
import {
  MAX_CATEGORY_LENGTH,
  MAX_EXERCISE_NOTES_LENGTH,
  MAX_EXERCISES_PER_WORKOUT,
  MAX_PLAN_REPS,
  MAX_PLAN_REST_SECONDS,
  MAX_PLAN_SETS,
  MIN_EXERCISES_PER_WORKOUT,
} from "@/lib/constants/plan-generation";

/** Optional text: trimmed; empty becomes null. */
function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((text) => (text ? text : null));
}

/** One prescribed exercise as edited by the user (step 3.4); same limits as the AI generation. */
export const editedExerciseSchema = z
  .object({
    /** null = new item (added, or swapped for another exercise). */
    id: z.uuid().nullable(),
    exerciseSlug: z.string().regex(SLUG_PATTERN),
    category: optionalText(MAX_CATEGORY_LENGTH),
    sets: z.number().int().min(1).max(MAX_PLAN_SETS),
    repsMin: z.number().int().min(1).max(MAX_PLAN_REPS),
    repsMax: z.number().int().min(1).max(MAX_PLAN_REPS),
    restSeconds: z.number().int().min(0).max(MAX_PLAN_REST_SECONDS).nullable(),
    notes: optionalText(MAX_EXERCISE_NOTES_LENGTH),
  })
  .refine((item) => item.repsMax >= item.repsMin, { path: ["repsMax"] });

/** Body of PUT /api/workouts/:id/exercises: the full list, in the order to show. */
export const workoutEditInputSchema = z.object({
  exercises: z.array(editedExerciseSchema).min(MIN_EXERCISES_PER_WORKOUT).max(MAX_EXERCISES_PER_WORKOUT),
});

export type EditedExercise = z.output<typeof editedExerciseSchema>;
export type EditedExerciseField = keyof EditedExercise;
