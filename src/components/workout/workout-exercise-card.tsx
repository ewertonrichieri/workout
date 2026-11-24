import Link from "next/link";
import { ExerciseCover } from "@/components/exercises/exercise-cover";
import { buildProgressHref } from "@/components/history/history-labels";
import { buildExerciseDetailHref } from "@/components/exercises/exercise-search-href";
import { translate } from "@/lib/i18n/translate";
import type { LoadIncrease } from "@/lib/training/load-increases";
import type { WorkoutExercise } from "@/lib/training/plan-types";
import { formatLoadInput, isExerciseCompleted, type SetEntry } from "@/lib/training/set-log-draft";
import { ExerciseDemoDisclosure } from "./exercise-demo-disclosure";
import { SetLogList } from "./set-log-list";
import { TrackProgressionSwitch } from "./track-progression-switch";
import { describeRepsTarget, describeRest, describeSetsAndReps } from "./workout-labels";

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  sets: readonly SetEntry[];
  /** Load fields were prefilled from the latest session (step 2.7). */
  hasSuggestedLoad: boolean;
  /** Earned increase (step 3.5): the fields hold the new load and the card says why. */
  loadIncrease?: LoadIncrease;
  onSetChange: (setIndex: number, patch: Partial<SetEntry>) => void;
}

const PROGRESS_LINK_CLASS =
  "flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

function PrescriptionSummary({ workoutExercise }: { workoutExercise: WorkoutExercise }) {
  const { exercise, notes } = workoutExercise;
  const rest = describeRest(workoutExercise.restSeconds);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Link
        href={buildExerciseDetailHref(exercise.slug)}
        className="flex min-h-11 items-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      >
        {exercise.name}
      </Link>
      <p className="text-sm">{describeSetsAndReps(workoutExercise)}</p>
      {rest && <p className="text-sm text-muted">{rest}</p>}
      {notes && <p className="text-sm text-muted">{notes}</p>}
    </div>
  );
}

/** One prescribed exercise: prescription, demonstration and set logging. */
function SuggestionNotice({ hasSuggestedLoad, loadIncrease }: { hasSuggestedLoad: boolean; loadIncrease?: LoadIncrease }) {
  if (loadIncrease) {
    const params = { reps: loadIncrease.reps, from: formatLoadInput(loadIncrease.fromKg), to: formatLoadInput(loadIncrease.toKg) };
    return <p className="text-sm font-medium text-accent-strong">{translate("training.progression.increaseNotice", params)}</p>;
  }
  return hasSuggestedLoad ? <p className="text-sm text-muted">{translate("training.progression.suggestedNotice")}</p> : null;
}

export function WorkoutExerciseCard({ workoutExercise, sets, hasSuggestedLoad, loadIncrease, onSetChange }: WorkoutExerciseCardProps) {
  const { exercise } = workoutExercise;
  const isCompleted = isExerciseCompleted(sets);
  return (
    <article className={`flex flex-col gap-3 rounded-2xl border bg-surface p-3 ${isCompleted ? "border-accent-strong" : "border-border"}`}>
      <div className="flex items-center gap-4">
        <ExerciseCover media={exercise.coverMedia} />
        <PrescriptionSummary workoutExercise={workoutExercise} />
      </div>
      {isCompleted && <p className="text-sm font-semibold text-accent-strong">{translate("training.exerciseCompleted")}</p>}
      <SuggestionNotice hasSuggestedLoad={hasSuggestedLoad} loadIncrease={loadIncrease} />
      <SetLogList exerciseName={exercise.name} repsTarget={describeRepsTarget(workoutExercise)} sets={sets} onSetChange={onSetChange} />
      <TrackProgressionSwitch workoutExerciseId={workoutExercise.id} exerciseName={exercise.name} isTracked={workoutExercise.trackProgression} />
      <ExerciseDemoDisclosure exercise={exercise} />
      <Link href={buildProgressHref(exercise.slug)} className={PROGRESS_LINK_CLASS}>
        {translate("history.progressLink")}
      </Link>
    </article>
  );
}
