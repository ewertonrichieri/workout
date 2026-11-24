import type { ActivePlanOverview, Workout, WorkoutExercise } from "@/lib/training/plan-types";

/** Fictitious plan data for training tests (never real user data). */
export function buildWorkoutExercise(position: number, overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: `workout-exercise-${position}`,
    position,
    category: null,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 60,
    notes: null,
    trackProgression: true,
    exercise: {
      id: `exercise-${position}`,
      slug: `fake-exercise-${position}`,
      name: `Exercício falso ${position}`,
      coverMedia: null,
      media: [],
    },
    ...overrides,
  };
}

export function buildWorkout(label: string, position: number, exercises: WorkoutExercise[] = []): Workout {
  return { id: `workout-${label}`, label, position, exercises };
}

export function buildPlanOverview(workouts: Workout[]): ActivePlanOverview {
  return {
    plan: { id: "plan-1", goal: "hypertrophy", origin: "manual", startsOn: "2026-11-01", validUntil: "2026-12-13", workouts },
    validity: { totalDays: 42, elapsedDays: 21, remainingDays: 21, progress: 0.5, isExpired: false },
    suggestedLoads: {},
    loadAdjustments: {},
  };
}
