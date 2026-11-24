import type { PlanCandidate } from "@/lib/plan-generation/plan-candidate";
import type { Workout, WorkoutExercise } from "@/lib/training/plan-types";
import type { AdjustmentChange, AiDailyAdjustment } from "./adjustment-schema";

/** Codes are logged (never the content); any issue rejects the whole adjustment. */
export type AdjustmentIssue =
  | "unknown_exercise"
  | "duplicate_exercise"
  | "invalid_change"
  | "above_plan"
  | "no_change"
  | "invalid_rep_range"
  | "unknown_replacement"
  | "replacement_in_workout"
  | "duplicate_replacement"
  | "empty_workout"
  | "over_time";

export interface AdjustmentRules {
  workout: Workout;
  /** Exercises the AI may swap in (step 3B.2); empty without an assessment. */
  candidateSlugs: ReadonlySet<string>;
}

type AiChange = AiDailyAdjustment["changes"][number];

/** AI changes are keyed by slug; null sets/reps keep the planned value; a removal carries no prescription. */
function resolveAiChange(aiChange: AiChange, prescription: WorkoutExercise): AdjustmentChange {
  const base = { workoutExerciseId: prescription.id, changeType: aiChange.changeType, reason: aiChange.reason };
  if (aiChange.changeType === "removed") return { ...base, replacementSlug: null, sets: null, repsMin: null, repsMax: null };
  return {
    ...base,
    replacementSlug: aiChange.replacementSlug,
    sets: aiChange.sets ?? prescription.sets,
    repsMin: aiChange.repsMin ?? prescription.repsMin,
    repsMax: aiChange.repsMax ?? prescription.repsMax,
  };
}

export function resolveAiChanges(adjustment: AiDailyAdjustment, workout: Workout): { changes: AdjustmentChange[]; issues: AdjustmentIssue[] } {
  const changes: AdjustmentChange[] = [];
  const issues = new Set<AdjustmentIssue>();
  for (const aiChange of adjustment.changes) {
    const prescription = workout.exercises.find((item) => item.exercise.slug === aiChange.exerciseSlug);
    if (prescription) changes.push(resolveAiChange(aiChange, prescription));
    else issues.add("unknown_exercise");
  }
  return { changes, issues: [...issues] };
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function prescriptionIssues(change: AdjustmentChange, prescription: WorkoutExercise): AdjustmentIssue[] {
  const { sets, repsMin, repsMax } = change;
  if (sets === null || repsMin === null || repsMax === null) return ["invalid_change"];
  const issues: AdjustmentIssue[] = [];
  if (sets > prescription.sets || repsMin > prescription.repsMin || repsMax > prescription.repsMax) issues.push("above_plan");
  if (repsMax < repsMin) issues.push("invalid_rep_range");
  const isSame = sets === prescription.sets && repsMin === prescription.repsMin && repsMax === prescription.repsMax;
  if (change.changeType === "reduced" && isSame) issues.push("no_change");
  return issues;
}

function replacementIssues(change: AdjustmentChange, { workout, candidateSlugs }: AdjustmentRules): AdjustmentIssue[] {
  if (change.changeType !== "replaced") return change.replacementSlug === null ? [] : ["invalid_change"];
  if (change.replacementSlug === null || !candidateSlugs.has(change.replacementSlug)) return ["unknown_replacement"];
  const isInWorkout = workout.exercises.some((item) => item.exercise.slug === change.replacementSlug);
  return isInWorkout ? ["replacement_in_workout"] : [];
}

function changeIssues(change: AdjustmentChange, rules: AdjustmentRules): AdjustmentIssue[] {
  const prescription = rules.workout.exercises.find((item) => item.id === change.workoutExerciseId);
  if (!prescription) return ["unknown_exercise"];
  if (change.changeType === "removed") {
    const isBare = change.replacementSlug === null && change.sets === null && change.repsMin === null && change.repsMax === null;
    return isBare ? [] : ["invalid_change"];
  }
  return [...prescriptionIssues(change, prescription), ...replacementIssues(change, rules)];
}

/** Rules of the daily adjustment: lighter or equal to the plan, swaps only from the list, ≥ 1 exercise left. */
export function findChangeIssues(changes: readonly AdjustmentChange[], rules: AdjustmentRules): AdjustmentIssue[] {
  const issues = new Set<AdjustmentIssue>(changes.flatMap((change) => changeIssues(change, rules)));
  if (hasDuplicates(changes.map((change) => change.workoutExerciseId))) issues.add("duplicate_exercise");
  const replacements = changes.flatMap((change) => (change.changeType === "replaced" && change.replacementSlug ? [change.replacementSlug] : []));
  if (hasDuplicates(replacements)) issues.add("duplicate_replacement");
  const removedCount = new Set(changes.filter((change) => change.changeType === "removed").map((change) => change.workoutExerciseId)).size;
  if (removedCount >= rules.workout.exercises.length) issues.add("empty_workout");
  return [...issues];
}

/** Whole AI answer: resolvable, valid changes and an estimate that fits in the available time. */
export function findAiAdjustmentIssues(adjustment: AiDailyAdjustment, rules: AdjustmentRules & { availableMinutes: number }): AdjustmentIssue[] {
  const resolved = resolveAiChanges(adjustment, rules.workout);
  const issues = new Set<AdjustmentIssue>([...resolved.issues, ...findChangeIssues(resolved.changes, rules)]);
  if (adjustment.estimatedMinutes > rules.availableMinutes) issues.add("over_time");
  return [...issues];
}

/** Swap options: exercises the user can do that share a primary muscle with today's workout, outside it. */
export function selectReplacementCandidates(candidates: readonly PlanCandidate[], workoutProfiles: readonly PlanCandidate[]): PlanCandidate[] {
  const workoutSlugs = new Set(workoutProfiles.map((profile) => profile.slug));
  const workoutMuscles = new Set(workoutProfiles.flatMap((profile) => profile.primaryMuscles));
  return candidates.filter(
    (candidate) => !workoutSlugs.has(candidate.slug) && candidate.primaryMuscles.some((muscle) => workoutMuscles.has(muscle)),
  );
}
