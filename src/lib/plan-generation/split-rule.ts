import type { SPLIT_PREFERENCES } from "@/lib/constants/assessment";
import { AI_FULL_BODY_MAX_DAYS, MAX_PLAN_WORKOUTS, MIN_SPLIT_WORKOUTS } from "@/lib/constants/plan-generation";

export type SplitPreference = (typeof SPLIT_PREFERENCES)[number];

export interface WorkoutCountRange {
  min: number;
  max: number;
}

const SINGLE_WORKOUT: WorkoutCountRange = { min: 1, max: 1 };

/** How many workouts the plan may have (user decision 2026-11-24): the preference always wins. */
export function resolveWorkoutCountRange({ splitPreference, daysPerWeek }: { splitPreference: SplitPreference; daysPerWeek: number }): WorkoutCountRange {
  const cappedDays = Math.min(daysPerWeek, MAX_PLAN_WORKOUTS);
  if (splitPreference === "full_body") return SINGLE_WORKOUT;
  if (splitPreference === "split") return { min: MIN_SPLIT_WORKOUTS, max: Math.max(MIN_SPLIT_WORKOUTS, cappedDays) };
  return daysPerWeek <= AI_FULL_BODY_MAX_DAYS ? SINGLE_WORKOUT : { min: 1, max: cappedDays };
}
