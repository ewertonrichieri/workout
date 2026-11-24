"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { countCompletedExercises } from "@/lib/training/set-log-draft";
import { useWorkoutDraft } from "./use-workout-draft";
import { WorkoutExerciseGroups } from "./workout-exercise-groups";

/** Set logging for the selected workout; the draft stays on the device until "Finalizar treino" (2.6). */
export function WorkoutTracker({ workout }: { workout: Workout }) {
  const { draft, changeSet } = useWorkoutDraft(workout);
  const completed = countCompletedExercises(draft, workout);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p role="status" className="font-semibold">
          {translate("training.completedSummary", { done: completed, total: workout.exercises.length })}
        </p>
        <p className="text-sm text-muted">{translate("training.draftNotice")}</p>
      </div>
      <WorkoutExerciseGroups exercises={workout.exercises} draft={draft} onSetChange={changeSet} />
    </div>
  );
}
