import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/constants/catalog";
import { MAX_EXCLUDED_SLUGS, SUBSTITUTION_REASONS } from "@/lib/constants/substitution";
import { MAX_LOAD_KG, MAX_REPS_DONE, MAX_SETS_PER_SESSION, SET_EFFORTS } from "@/lib/constants/training";

const LOAD_STEP_KG = 0.01;

export const finishedSetSchema = z.object({
  workoutExerciseId: z.uuid(),
  setNumber: z.number().int().positive(),
  repsDone: z.number().int().min(0).max(MAX_REPS_DONE),
  loadKg: z.number().min(0).max(MAX_LOAD_KG).multipleOf(LOAD_STEP_KG).nullable(),
  /** Perceived effort (step 3B.3); optional. */
  effort: z.enum(SET_EFFORTS).nullable().default(null),
});

/** Swap of today (step 3B.4); the database turns the slug into the exercise and revalidates it. */
export const finishedSubstitutionSchema = z.object({
  workoutExerciseId: z.uuid(),
  exerciseSlug: z.string().regex(SLUG_PATTERN),
  reason: z.enum(SUBSTITUTION_REASONS).nullable(),
});

/** Body of POST /api/workout-sessions (step 2.6); same limits as the set logging draft. */
export const finishWorkoutInputSchema = z.object({
  workoutId: z.uuid(),
  startedAt: z.iso.datetime(),
  sets: z.array(finishedSetSchema).max(MAX_SETS_PER_SESSION),
  /** Check-in of the day (step 3B.1); the database checks that it belongs to this workout. */
  readinessCheckinId: z.uuid().nullable().default(null),
  substitutions: z.array(finishedSubstitutionSchema).max(MAX_EXCLUDED_SLUGS).default([]),
});

export type FinishedSet = z.input<typeof finishedSetSchema>;
export type FinishedSubstitution = z.infer<typeof finishedSubstitutionSchema>;
export type FinishWorkoutInput = z.input<typeof finishWorkoutInputSchema>;
