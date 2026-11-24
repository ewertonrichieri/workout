"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { countCompletedExercises } from "@/lib/training/set-log-draft";
import type { LoadIncreases } from "@/lib/training/load-increases";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReadinessCheckinPanel } from "@/components/readiness/readiness-checkin-panel";
import { FinishWorkoutButton } from "./finish-workout-button";
import { useWorkoutDraft } from "./use-workout-draft";
import { WorkoutExerciseGroups } from "./workout-exercise-groups";

const NO_INCREASES: LoadIncreases = {};

/** Set logging for the selected workout; the draft stays on the device until "Finalizar treino" (2.6). */
interface WorkoutTrackerProps {
  workout: Workout;
  suggestedLoads: SuggestedLoads;
  /** Earned increases (step 3.5); empty when none. */
  loadIncreases?: LoadIncreases;
  /** Time per workout of the latest assessment, the default answer of the check-in (step 3B.1). */
  sessionMinutes?: number | null;
}

function TrackerSummary({ completed, total, hasFinished }: { completed: number; total: number; hasFinished: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p role="status" className="font-semibold">{translate("training.completedSummary", { done: completed, total })}</p>
      <p className="text-sm text-muted">{translate("training.draftNotice")}</p>
      {hasFinished && <p role="status" className="font-semibold text-accent-strong">{translate("training.finish.success")}</p>}
    </div>
  );
}

export function WorkoutTracker({ workout, suggestedLoads, loadIncreases = NO_INCREASES, sessionMinutes = null }: WorkoutTrackerProps) {
  const router = useRouter();
  const { draft, changeSet, changeReadiness, clearDraft } = useWorkoutDraft(workout, suggestedLoads);
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
      <TrackerSummary completed={completed} total={workout.exercises.length} hasFinished={hasFinished} />
      <ReadinessCheckinPanel
        workoutId={workout.id}
        readiness={draft.readiness}
        hasStarted={draft.startedAt !== null}
        sessionMinutes={sessionMinutes}
        onChange={changeReadiness}
      />
      <WorkoutExerciseGroups exercises={workout.exercises} draft={draft} suggestedLoads={suggestedLoads} loadIncreases={loadIncreases} onSetChange={changeSetAfterFinish} />
      <FinishWorkoutButton draft={draft} onFinished={finish} />
    </div>
  );
}
