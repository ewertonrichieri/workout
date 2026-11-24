import { describeSetsAndReps } from "@/components/workout/workout-labels";
import { translate } from "@/lib/i18n/translate";
import type { ProposedChange } from "@/lib/readiness/adjustment-schema";
import type { WorkoutExercise } from "@/lib/training/plan-types";

function describeToday(change: ProposedChange): string {
  if (change.changeType === "removed" || change.sets === null || change.repsMin === null || change.repsMax === null) {
    return translate("readiness.adjustment.removedLabel");
  }
  const prescription = describeSetsAndReps({ sets: change.sets, repsMin: change.repsMin, repsMax: change.repsMax });
  if (change.changeType === "replaced" && change.replacement) {
    return translate("readiness.adjustment.replacedLabel", { name: change.replacement.name, prescription });
  }
  return translate("readiness.adjustment.afterLabel", { prescription });
}

/** Before and after of one prescription, with the reason given by the AI. */
export function AdjustmentChangeItem({ change, planned }: { change: ProposedChange; planned: WorkoutExercise }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <p className="font-semibold">{planned.exercise.name}</p>
      <p className="text-sm text-muted">{translate("readiness.adjustment.beforeLabel", { prescription: describeSetsAndReps(planned) })}</p>
      <p className="text-sm font-medium">{describeToday(change)}</p>
      <p className="text-sm">{change.reason}</p>
    </li>
  );
}
