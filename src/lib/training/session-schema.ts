import { z } from "zod";
import { MAX_LOAD_KG, MAX_REPS_DONE, MAX_SETS_PER_SESSION } from "@/lib/constants/training";

const LOAD_STEP_KG = 0.01;

export const finishedSetSchema = z.object({
  workoutExerciseId: z.uuid(),
  setNumber: z.number().int().positive(),
  repsDone: z.number().int().min(0).max(MAX_REPS_DONE),
  loadKg: z.number().min(0).max(MAX_LOAD_KG).multipleOf(LOAD_STEP_KG).nullable(),
});

/** Body of POST /api/workout-sessions (step 2.6); same limits as the set logging draft. */
export const finishWorkoutInputSchema = z.object({
  workoutId: z.uuid(),
  startedAt: z.iso.datetime(),
  sets: z.array(finishedSetSchema).max(MAX_SETS_PER_SESSION),
});

export type FinishedSet = z.infer<typeof finishedSetSchema>;
export type FinishWorkoutInput = z.infer<typeof finishWorkoutInputSchema>;
