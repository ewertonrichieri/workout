import type { ClaudeEffort } from "@/lib/constants/ai";

/** Plan generation by AI (spec 011, step 3.3). */
export const PLAN_GENERATION_OPERATION = "plan.generate";
/** Cheaper model chosen by the user after the real call (PLN-001, 2026-11-24): ~16 s, ~US$ 0.005 per plan. */
export const PLAN_GENERATION_MODEL = "claude-haiku-5-5";
export const PLAN_GENERATION_EFFORT: ClaudeEffort = "medium";

/** Split rule (user decision 2026-11-24). */
export const AI_FULL_BODY_MAX_DAYS = 2;
export const MIN_SPLIT_WORKOUTS = 2;
export const MAX_PLAN_WORKOUTS = 5;
export const FULL_BODY_LABEL = "Full body";
export const SPLIT_LABELS = ["A", "B", "C", "D", "E"] as const;

/** Sanity limits of a generated prescription. */
export const MIN_EXERCISES_PER_WORKOUT = 1;
export const MAX_EXERCISES_PER_WORKOUT = 12;
export const MAX_PLAN_SETS = 10;
export const MAX_PLAN_REPS = 50;
export const MAX_PLAN_REST_SECONDS = 600;
export const MAX_WORKOUT_LABEL_LENGTH = 30;
export const MAX_CATEGORY_LENGTH = 40;
export const MAX_EXERCISE_NOTES_LENGTH = 300;

/** Last valid day = start + 6 weeks - 1 day (42 calendar days, both ends included). */
export const PLAN_VALIDITY_LAST_DAY_OFFSET = 1;

/** Starting prescription of an exercise added by hand (step 3.4); the user edits it before saving. */
export const NEW_EXERCISE_DEFAULT_SETS = 3;
export const NEW_EXERCISE_DEFAULT_REPS = 10;
