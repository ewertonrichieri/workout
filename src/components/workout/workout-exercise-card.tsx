import Link from "next/link";
import { ExerciseCover } from "@/components/exercises/exercise-cover";
import { buildProgressHref } from "@/components/history/history-labels";
import { buildExerciseDetailHref } from "@/components/exercises/exercise-search-href";
import { translate } from "@/lib/i18n/translate";
import type { LoadAdjustment } from "@/lib/training/load-adjustments";
import type { DailyChange, WorkoutExercise } from "@/lib/training/plan-types";
import { formatLoadInput, isExerciseCompleted, type SetEntry } from "@/lib/training/set-log-draft";
import { SubstitutionControl } from "@/components/substitution/substitution-control";
import type { DraftSubstitution } from "@/lib/substitution/substitution-schema";
import { AnalyzeTechniqueLink } from "@/components/technique/analyze-technique-link";
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
  loadAdjustment?: LoadAdjustment;
  onSetChange: (setIndex: number, patch: Partial<SetEntry>) => void;
  /** Swap on the spot (step 3B.4); omitted where swapping is not offered. */
  substitution?: { excludeSlugs: readonly string[]; onChange: (substitution: DraftSubstitution | null) => void };
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
/** The card always says why the load changes or holds (steps 3.5, 3B.3). */
function describeAdjustment(adjustment: LoadAdjustment): string {
  if (adjustment.kind === "hold") return translate("training.progression.holdNotice", { load: formatLoadInput(adjustment.loadKg) });
  const loads = { from: formatLoadInput(adjustment.fromKg), to: formatLoadInput(adjustment.toKg) };
  if (adjustment.kind === "decrease") return translate("training.progression.decreaseNotice", { count: adjustment.maxEffortSets, reps: adjustment.repsMin, ...loads });
  return translate("training.progression.increaseNotice", { reps: adjustment.reps, ...loads });
}

function SuggestionNotice({ hasSuggestedLoad, loadAdjustment }: { hasSuggestedLoad: boolean; loadAdjustment?: LoadAdjustment }) {
  if (loadAdjustment) return <p className="text-sm font-medium text-accent-strong">{describeAdjustment(loadAdjustment)}</p>;
  return hasSuggestedLoad ? <p className="text-sm text-muted">{translate("training.progression.suggestedNotice")}</p> : null;
}

/** Today-only change: AI adjustment (3B.2) or swap on the spot (3B.4). */
function describeDailyChange(change: DailyChange): string {
  if (change.changeType === "substituted" && change.originalName) return translate("training.substitution.cardNotice", { original: change.originalName });
  const reason = change.reason ?? "";
  if (change.changeType === "replaced" && change.originalName) return translate("readiness.adjustment.cardReplaced", { original: change.originalName, reason });
  return translate("readiness.adjustment.cardReduced", { reason });
}

function DailyChangeNotice({ change }: { change: DailyChange }) {
  return <p className="text-sm font-medium text-accent-strong">{describeDailyChange(change)}</p>;
}

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
        <PrescriptionSummary workoutExercise={workoutExercise} />
      </div>
      {dailyChange && <DailyChangeNotice change={dailyChange} />}
      {isCompleted && <p className="text-sm font-semibold text-accent-strong">{translate("training.exerciseCompleted")}</p>}
      <SuggestionNotice hasSuggestedLoad={hasSuggestedLoad} loadAdjustment={loadAdjustment} />
      <SetLogList exerciseName={exercise.name} repsTarget={describeRepsTarget(workoutExercise)} sets={sets} onSetChange={onSetChange} />
      {!isReplacedToday && (
        <TrackProgressionSwitch workoutExerciseId={workoutExercise.id} exerciseName={exercise.name} isTracked={workoutExercise.trackProgression} />
      )}
      {canSwap && <SubstitutionControl key={exercise.slug} workoutExercise={workoutExercise} excludeSlugs={substitution.excludeSlugs} onChange={substitution.onChange} />}
      <ExerciseDemoDisclosure exercise={exercise} />
      <AnalyzeTechniqueLink exerciseSlug={exercise.slug} />
      <Link href={buildProgressHref(exercise.slug)} className={PROGRESS_LINK_CLASS}>
        {translate("history.progressLink")}
      </Link>
    </article>
  );
}
