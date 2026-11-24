"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { countCompletedExercises } from "@/lib/training/set-log-draft";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FinishWorkoutButton } from "./finish-workout-button";
import { useWorkoutDraft } from "./use-workout-draft";
import { WorkoutExerciseGroups } from "./workout-exercise-groups";

/** Set logging for the selected workout; the draft stays on the device until "Finalizar treino" (2.6). */
interface WorkoutTrackerProps {
  workout: Workout;
  suggestedLoads: SuggestedLoads;
}

export function WorkoutTracker({ workout, suggestedLoads }: WorkoutTrackerProps) {
  const router = useRouter();
  const { draft, changeSet, clearDraft } = useWorkoutDraft(workout, suggestedLoads);
  const [hasFinished, setHasFinished] = useState(false);
  const finish = () => {
    clearDraft();
    setHasFinished(true);
    // New suggested loads (step 2.7) come from the session just saved.
    router.refresh();
  };
  const changeSetAfterFinish: typeof changeSet = (...args) => {
    setHasFinished(false);
    changeSet(...args);
  };
  const completed = countCompletedExercises(draft, workout);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p role="status" className="font-semibold">
          {translate("training.completedSummary", { done: completed, total: workout.exercises.length })}
        </p>
        <p className="text-sm text-muted">{translate("training.draftNotice")}</p>
        {hasFinished && <p role="status" className="font-semibold text-accent-strong">{translate("training.finish.success")}</p>}
      </div>
      <WorkoutExerciseGroups exercises={workout.exercises} draft={draft} suggestedLoads={suggestedLoads} onSetChange={changeSetAfterFinish} />
      <FinishWorkoutButton draft={draft} onFinished={finish} />
    </div>
  );
}
