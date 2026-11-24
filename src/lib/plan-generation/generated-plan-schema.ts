import { z } from "zod";
import {
  MAX_CATEGORY_LENGTH,
  MAX_EXERCISE_NOTES_LENGTH,
  MAX_EXERCISES_PER_WORKOUT,
  MAX_PLAN_REPS,
  MAX_PLAN_REST_SECONDS,
  MAX_PLAN_SETS,
  MAX_PLAN_WORKOUTS,
  MAX_WORKOUT_LABEL_LENGTH,
  MIN_EXERCISES_PER_WORKOUT,
} from "@/lib/constants/plan-generation";

/**
 * Structured output asked from Claude (step 3.3). Plain fields only (no refine/transform), so it converts
 * to JSON Schema; cross-field rules live in generated-plan-validation.ts.
 */
const generatedExerciseSchema = z.object({
  exerciseSlug: z.string().min(1).describe("Slug copied exactly from the exercise list"),
  category: z.string().min(1).max(MAX_CATEGORY_LENGTH).nullable().describe("Short group name in Brazilian Portuguese"),
  sets: z.number().int().min(1).max(MAX_PLAN_SETS),
  repsMin: z.number().int().min(1).max(MAX_PLAN_REPS),
  repsMax: z.number().int().min(1).max(MAX_PLAN_REPS),
  restSeconds: z.number().int().min(0).max(MAX_PLAN_REST_SECONDS).nullable(),
  notes: z.string().min(1).max(MAX_EXERCISE_NOTES_LENGTH).nullable().describe("Optional short cue in Brazilian Portuguese"),
});

const generatedWorkoutSchema = z.object({
  label: z.string().min(1).max(MAX_WORKOUT_LABEL_LENGTH),
  exercises: z.array(generatedExerciseSchema).min(MIN_EXERCISES_PER_WORKOUT).max(MAX_EXERCISES_PER_WORKOUT),
});

export const generatedPlanSchema = z.object({
  workouts: z.array(generatedWorkoutSchema).min(1).max(MAX_PLAN_WORKOUTS),
});

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;
export type GeneratedWorkout = GeneratedPlan["workouts"][number];
