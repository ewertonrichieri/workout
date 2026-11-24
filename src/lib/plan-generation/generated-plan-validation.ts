import type { GeneratedPlan, GeneratedWorkout } from "./generated-plan-schema";
import type { WorkoutCountRange } from "./split-rule";

/** Codes are logged (never the plan content); any issue rejects the whole plan. */
export type GeneratedPlanIssue = "workout_count" | "duplicate_label" | "unknown_exercise" | "duplicate_exercise" | "invalid_rep_range";

interface PlanRules {
  candidateSlugs: ReadonlySet<string>;
  workoutCountRange: WorkoutCountRange;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function workoutIssues(workout: GeneratedWorkout, candidateSlugs: ReadonlySet<string>): GeneratedPlanIssue[] {
  const slugs = workout.exercises.map((exercise) => exercise.exerciseSlug);
  const issues: GeneratedPlanIssue[] = [];
  if (slugs.some((slug) => !candidateSlugs.has(slug))) issues.push("unknown_exercise");
  if (hasDuplicates(slugs)) issues.push("duplicate_exercise");
  if (workout.exercises.some((exercise) => exercise.repsMax < exercise.repsMin)) issues.push("invalid_rep_range");
  return issues;
}

/** Rules the schema cannot express: catalog membership, split rule, uniqueness, rep ranges. */
export function findGeneratedPlanIssues(plan: GeneratedPlan, { candidateSlugs, workoutCountRange }: PlanRules): GeneratedPlanIssue[] {
  const issues = new Set<GeneratedPlanIssue>();
  const count = plan.workouts.length;
  if (count < workoutCountRange.min || count > workoutCountRange.max) issues.add("workout_count");
  if (hasDuplicates(plan.workouts.map((workout) => workout.label.trim().toLowerCase()))) issues.add("duplicate_label");
  plan.workouts.flatMap((workout) => workoutIssues(workout, candidateSlugs)).forEach((issue) => issues.add(issue));
  const order: GeneratedPlanIssue[] = ["workout_count", "duplicate_label", "unknown_exercise", "duplicate_exercise", "invalid_rep_range"];
  return order.filter((issue) => issues.has(issue));
}
