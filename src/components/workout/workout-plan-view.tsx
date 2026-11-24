import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { APP_ROUTES } from "@/lib/constants/routes";
import { WORKOUT_QUERY_PARAM } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";
import type { ActivePlanOverview, Workout } from "@/lib/training/plan-types";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";
import { selectWorkout } from "@/lib/training/workout-display";
import { PlanValiditySummary } from "./plan-validity-summary";
import { WorkoutTracker } from "./workout-tracker";
import { WorkoutTabs } from "./workout-tabs";

interface WorkoutPlanViewProps {
  overview: ActivePlanOverview;
  /** Label from the URL; unknown or missing → first workout. */
  requestedLabel?: string;
  /** Right after an AI generation: invite the user to review and adjust (step 3.4). */
  showReviewNotice?: boolean;
}

const EDIT_LINK_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

function EditWorkoutLink({ label }: { label: string }) {
  const href = `${APP_ROUTES.workoutEdit}?${new URLSearchParams({ [WORKOUT_QUERY_PARAM]: label })}`;
  return <Link href={href} className={EDIT_LINK_CLASS}>{translate("planEdit.editLink", { label })}</Link>;
}

function ReviewNotice() {
  return <p role="status" className="rounded-2xl border border-accent-strong bg-surface p-4">{translate("planEdit.reviewNotice")}</p>;
}

function EmptyWorkout() {
  return <EmptyState title={translate("training.emptyWorkoutTitle")} description={translate("training.emptyWorkoutDescription")} />;
}

function SelectedWorkout({ workout, suggestedLoads }: { workout: Workout; suggestedLoads: SuggestedLoads }) {
  if (workout.exercises.length === 0) return <EmptyWorkout />;
  return <WorkoutTracker key={workout.id} workout={workout} suggestedLoads={suggestedLoads} />;
}

function WorkoutHeading({ workouts, selected }: { workouts: readonly Workout[]; selected: Workout }) {
  if (workouts.length > 1) return <WorkoutTabs workouts={workouts} selectedLabel={selected.label} />;
  return <h2 className="text-2xl font-semibold">{selected.label}</h2>;
}

/** Daily workout screen: tabs (when split), plan validity and exercise cards by category. */
export function WorkoutPlanView({ overview, requestedLabel, showReviewNotice = false }: WorkoutPlanViewProps) {
  const { plan, validity } = overview;
  const selected = selectWorkout(plan.workouts, requestedLabel);
  return (
    <>
      {showReviewNotice && <ReviewNotice />}
      <PlanValiditySummary validity={validity} validUntil={plan.validUntil} />
      {selected ? (
        <>
          <WorkoutHeading workouts={plan.workouts} selected={selected} />
          <EditWorkoutLink label={selected.label} />
          <SelectedWorkout workout={selected} suggestedLoads={overview.suggestedLoads} />
        </>
      ) : (
        <EmptyWorkout />
      )}
    </>
  );
}
