import Link from "next/link";
import { ExerciseCover } from "@/components/exercises/exercise-cover";
import { buildExerciseDetailHref } from "@/components/exercises/exercise-search-href";
import { translate } from "@/lib/i18n/translate";
import type { LoadAdjustment } from "@/lib/training/load-adjustments";
import type { DailyChange, WorkoutExercise } from "@/lib/training/plan-types";
import { formatLoadInput, isExerciseCompleted, type SetEntry } from "@/lib/training/set-log-draft";
import { SubstitutionControl } from "@/components/substitution/substitution-control";
import type { DraftSubstitution } from "@/lib/substitution/substitution-schema";
import { ExerciseMoreOptions } from "./exercise-more-options";
import { SetLogList } from "./set-log-list";
import { TrackProgressionSwitch } from "./track-progression-switch";
import { describePrescription, describeRepsTarget } from "./workout-labels";

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  sets: readonly SetEntry[];
  /** Load fields were prefilled from the latest session (step 2.7). */
  hasSuggestedLoad: boolean;
  /** Earned increase (step 3.5): the fields hold the new load and the card says why. */
  loadAdjustment?: LoadAdjustment;
  onSetChange: (setIndex: number, patch: Partial<SetEntry>) => void;
  /** Swap on the spot (step 3B.4); omitted where swapping is not offered. */
  substitution?: { excludeSlugs: readonly string[]; onChange: (substitution: DraftSubstitution | null) => void };
}

function PrescriptionSummary({ workoutExercise, isCompleted }: { workoutExercise: WorkoutExercise; isCompleted: boolean }) {
  const { exercise, notes } = workoutExercise;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Link
        href={buildExerciseDetailHref(exercise.slug)}
        className="flex min-h-11 items-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
      >
        {exercise.name}
      </Link>
      <p className="text-sm">{describePrescription(workoutExercise)}</p>
      {notes && <p className="text-sm text-muted">{notes}</p>}
      {isCompleted && <p className="text-sm font-semibold text-accent-strong">{translate("training.exerciseCompleted")}</p>}
    </div>
  );
}

/** The card always says why the load changes or holds (steps 3.5, 3B.3). */
function describeAdjustment(adjustment: LoadAdjustment): string {
  if (adjustment.kind === "hold") return translate("training.progression.holdNotice", { load: formatLoadInput(adjustment.loadKg) });
  const loads = { from: formatLoadInput(adjustment.fromKg), to: formatLoadInput(adjustment.toKg) };
  if (adjustment.kind === "decrease") return translate("training.progression.decreaseNotice", { count: adjustment.maxEffortSets, reps: adjustment.repsMin, ...loads });
  return translate("training.progression.increaseNotice", { reps: adjustment.reps, ...loads });
}


/** Today-only change: AI adjustment (3B.2) or swap on the spot (3B.4). */
function describeDailyChange(change: DailyChange): string {
  if (change.changeType === "substituted" && change.originalName) return translate("training.substitution.cardNotice", { original: change.originalName });
  const reason = change.reason ?? "";
  if (change.changeType === "replaced" && change.originalName) return translate("readiness.adjustment.cardReplaced", { original: change.originalName, reason });
  return translate("readiness.adjustment.cardReduced", { reason });
}

type NoticeProps = Pick<WorkoutExerciseCardProps, "hasSuggestedLoad" | "loadAdjustment"> & { dailyChange?: DailyChange };

/** At most one notice (spec 015): today's change, else why the load changes, else the suggested load. */
function CardNotice({ dailyChange, loadAdjustment, hasSuggestedLoad }: NoticeProps) {
  if (dailyChange) return <p className="text-sm font-medium text-accent-strong">{describeDailyChange(dailyChange)}</p>;
  if (loadAdjustment) return <p className="text-sm font-medium text-accent-strong">{describeAdjustment(loadAdjustment)}</p>;
  return hasSuggestedLoad ? <p className="text-sm text-muted">{translate("training.progression.suggestedNotice")}</p> : null;
}

/** Fixed prescription ("10") fills an empty first set; a range ("8 a 12") does not (spec 015). */
function fixedRepsOf({ repsMin, repsMax }: WorkoutExercise): number | null {
  return repsMin === repsMax ? repsMin : null;
}

/** One prescribed exercise: prescription, set logging and, under "Mais opções", the rest (spec 015). */
export function WorkoutExerciseCard({ workoutExercise, sets, hasSuggestedLoad, loadAdjustment, onSetChange, substitution }: WorkoutExerciseCardProps) {
  const { exercise, dailyChange } = workoutExercise;
  const isCompleted = isExerciseCompleted(sets);
  // Swapping (or undoing it) is offered only before any set of this exercise is checked.
  const canSwap = substitution !== undefined && !sets.some((entry) => entry.isDone);
  // The switch belongs to the planned exercise, so a replacement of today does not show it.
  const isReplacedToday = dailyChange?.changeType === "replaced" || dailyChange?.changeType === "substituted";
  return (
    <article className={`flex flex-col gap-3 rounded-2xl border bg-surface p-3 ${isCompleted ? "border-accent-strong" : "border-border"}`}>
      <div className="flex items-center gap-4">
        <ExerciseCover media={exercise.coverMedia} />
        <PrescriptionSummary workoutExercise={workoutExercise} isCompleted={isCompleted} />
      </div>
      <CardNotice dailyChange={dailyChange} loadAdjustment={loadAdjustment} hasSuggestedLoad={hasSuggestedLoad} />
      <SetLogList exerciseName={exercise.name} repsTarget={describeRepsTarget(workoutExercise)} fixedReps={fixedRepsOf(workoutExercise)} sets={sets} onSetChange={onSetChange} />
      <ExerciseMoreOptions exercise={exercise}>
        {canSwap && <SubstitutionControl key={exercise.slug} workoutExercise={workoutExercise} excludeSlugs={substitution.excludeSlugs} onChange={substitution.onChange} />}
        {!isReplacedToday && (
          <TrackProgressionSwitch workoutExerciseId={workoutExercise.id} exerciseName={exercise.name} isTracked={workoutExercise.trackProgression} />
        )}
      </ExerciseMoreOptions>
    </article>
  );
}
