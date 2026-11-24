"use client";

import { translate } from "@/lib/i18n/translate";
import type { Workout } from "@/lib/training/plan-types";
import { countCompletedExercises, hasCheckedSets } from "@/lib/training/set-log-draft";
import { omitPrescriptions } from "@/lib/readiness/adjusted-workout";
import type { LoadAdjustments } from "@/lib/training/load-adjustments";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ReadinessCheckinPanel } from "@/components/readiness/readiness-checkin-panel";
import { FinishWorkoutButton } from "./finish-workout-button";
import { useWorkoutDraft } from "./use-workout-draft";
import { WorkoutExerciseGroups } from "./workout-exercise-groups";

const NO_ADJUSTMENTS: LoadAdjustments = {};

/** Set logging for the selected workout; the draft stays on the device until "Finalizar treino" (2.6). */
interface WorkoutTrackerProps {
  workout: Workout;
  suggestedLoads: SuggestedLoads;
  /** Earned increases (step 3.5); empty when none. */
  loadAdjustments?: LoadAdjustments;
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

export function WorkoutTracker({ workout: planned, suggestedLoads, loadAdjustments = NO_ADJUSTMENTS, sessionMinutes = null }: WorkoutTrackerProps) {
  const router = useRouter();
  const day = useWorkoutDraft(planned, suggestedLoads);
  const { draft, workout, changeSet } = day;
  const todayAdjustments = useMemo(() => omitPrescriptions(loadAdjustments, day.changedIds), [loadAdjustments, day.changedIds]);
  const [hasFinished, setHasFinished] = useState(false);
  const finish = () => {
    day.clearDraft();
    setHasFinished(true);
    // New suggested loads (step 2.7) come from the session just saved.
    router.refresh();
  };
  const changeSetAfterFinish: typeof changeSet = (...args) => {
    setHasFinished(false);
    changeSet(...args);
  };
  return (
    <div className="flex flex-col gap-4">
      <TrackerSummary completed={countCompletedExercises(draft, workout)} total={workout.exercises.length} hasFinished={hasFinished} />
      <ReadinessCheckinPanel
        planned={planned}
        readiness={draft.readiness}
        hasStarted={draft.startedAt !== null}
        canUndoAdjustment={!hasCheckedSets(draft)}
        sessionMinutes={sessionMinutes}
        onChange={day.changeReadiness}
      />
      <WorkoutExerciseGroups exercises={workout.exercises} draft={draft} suggestedLoads={day.suggestedLoads} loadAdjustments={todayAdjustments} onSetChange={changeSetAfterFinish} />
      <FinishWorkoutButton draft={draft} onFinished={finish} />
    </div>
  );
}
