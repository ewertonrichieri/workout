import type { Workout, WorkoutExercise } from "@/lib/training/plan-types";
import type { DraftSubstitution } from "@/lib/substitution/substitution-schema";
import type { DraftReadiness } from "@/lib/training/set-log-draft";
import type { ProposedChange } from "./adjustment-schema";

export interface WorkoutForDay {
  /** Today's workout: the plan, or the plan with the accepted adjustment (step 3B.2). */
  workout: Workout;
  /** Prescriptions removed or replaced today: their planned-exercise suggestions no longer apply. */
  changedIds: ReadonlySet<string>;
}

const NO_CHANGES: ReadonlySet<string> = new Set();

function acceptedChanges(readiness: DraftReadiness | null): readonly ProposedChange[] {
  if (readiness?.status !== "done" || readiness.adjustment?.status !== "accepted") return [];
  return readiness.adjustment.proposal.changes;
}

function applyChange(prescription: WorkoutExercise, change: ProposedChange): WorkoutExercise {
  const lighter = { ...prescription, sets: change.sets ?? prescription.sets, repsMin: change.repsMin ?? prescription.repsMin, repsMax: change.repsMax ?? prescription.repsMax };
  if (change.changeType === "replaced" && change.replacement) {
    // "Salvar carga para progredir" belongs to the planned exercise, so it is off for the replacement.
    const dailyChange = { changeType: "replaced" as const, reason: change.reason, originalName: prescription.exercise.name };
    return { ...lighter, exercise: change.replacement, trackProgression: false, dailyChange };
  }
  return { ...lighter, dailyChange: { changeType: "reduced", reason: change.reason, originalName: null } };
}

/** Swap on the spot (3B.4), on top of the adjustment: same prescription, the switch belongs to the planned exercise. */
function applySubstitution(prescription: WorkoutExercise, substitution: DraftSubstitution): WorkoutExercise {
  const dailyChange = { changeType: "substituted" as const, reason: null, originalName: prescription.exercise.name };
  return { ...prescription, exercise: substitution.exercise, trackProgression: false, dailyChange };
}

function applySubstitutions(day: WorkoutForDay, substitutions: Readonly<Record<string, DraftSubstitution>>): WorkoutForDay {
  const swappedIds = Object.keys(substitutions).filter((id) => day.workout.exercises.some((item) => item.id === id));
  if (swappedIds.length === 0) return day;
  const exercises = day.workout.exercises.map((item) => (substitutions[item.id] ? applySubstitution(item, substitutions[item.id]) : item));
  return { workout: { ...day.workout, exercises }, changedIds: new Set([...day.changedIds, ...swappedIds]) };
}

const NO_SUBSTITUTIONS: Readonly<Record<string, DraftSubstitution>> = {};

/** Today's workout: the accepted adjustment (proposals under review and declined ones keep the plan), then the swaps. */
export function adjustWorkoutForDay(workout: Workout, readiness: DraftReadiness | null, substitutions = NO_SUBSTITUTIONS): WorkoutForDay {
  return applySubstitutions(applyAdjustment(workout, readiness), substitutions);
}

function applyAdjustment(workout: Workout, readiness: DraftReadiness | null): WorkoutForDay {
  const changes = acceptedChanges(readiness);
  if (changes.length === 0) return { workout, changedIds: NO_CHANGES };
  const exercises = workout.exercises.flatMap((prescription) => {
    const change = changes.find((item) => item.workoutExerciseId === prescription.id);
    if (!change) return [prescription];
    return change.changeType === "removed" ? [] : [applyChange(prescription, change)];
  });
  const changedIds = new Set(changes.filter((change) => change.changeType !== "reduced").map((change) => change.workoutExerciseId));
  return { workout: { ...workout, exercises }, changedIds };
}

/** Copy of a per-prescription record (suggested loads, increases) without the given prescriptions. */
export function omitPrescriptions<Value>(record: Readonly<Record<string, Value>>, ids: ReadonlySet<string>): Record<string, Value> {
  if (ids.size === 0) return { ...record };
  return Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)));
}
