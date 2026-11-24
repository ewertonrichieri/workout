import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import type { PLAN_GOALS, PLAN_ORIGINS } from "@/lib/constants/training";
import type { SuggestedLoads } from "./suggested-loads";

export type PlanGoal = (typeof PLAN_GOALS)[number];
export type PlanOrigin = (typeof PLAN_ORIGINS)[number];

/** Exercise data needed to show a prescribed exercise. */
export interface PlannedExerciseInfo {
  id: string;
  slug: string;
  name: string;
  coverMedia: ExerciseMediaItem | null;
  media: ExerciseMediaItem[];
}

/** One exercise prescribed inside a workout (A, B, C...). */
export interface WorkoutExercise {
  id: string;
  position: number;
  /** Grouping shown on the workout screen (e.g. "Neuromuscular"); free text, optional. */
  category: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
  notes: string | null;
  trackProgression: boolean;
  exercise: PlannedExerciseInfo;
}

export interface Workout {
  id: string;
  label: string;
  position: number;
  exercises: WorkoutExercise[];
}

export interface ActivePlan {
  id: string;
  goal: PlanGoal;
  origin: PlanOrigin;
  /** ISO calendar dates (YYYY-MM-DD). */
  startsOn: string;
  validUntil: string;
  workouts: Workout[];
}

export interface PlanValidity {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  /** 0 to 1, share of the validity period already elapsed. */
  progress: number;
  isExpired: boolean;
}

export interface ActivePlanOverview {
  plan: ActivePlan;
  validity: PlanValidity;
  /** "Salvar carga para progredir" suggestions per workout exercise (step 2.7). */
  suggestedLoads: SuggestedLoads;
}
