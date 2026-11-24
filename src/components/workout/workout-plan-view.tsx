import { EmptyState } from "@/components/layout/empty-state";
import { translate } from "@/lib/i18n/translate";
import type { ActivePlanOverview, Workout } from "@/lib/training/plan-types";
import { selectWorkout } from "@/lib/training/workout-display";
import { PlanValiditySummary } from "./plan-validity-summary";
import { WorkoutExerciseGroups } from "./workout-exercise-groups";
import { WorkoutTabs } from "./workout-tabs";

interface WorkoutPlanViewProps {
  overview: ActivePlanOverview;
  /** Label from the URL; unknown or missing → first workout. */
  requestedLabel?: string;
}

function EmptyWorkout() {
  return <EmptyState title={translate("training.emptyWorkoutTitle")} description={translate("training.emptyWorkoutDescription")} />;
}

function SelectedWorkout({ workout }: { workout: Workout }) {
  if (workout.exercises.length === 0) return <EmptyWorkout />;
  return <WorkoutExerciseGroups exercises={workout.exercises} />;
}

function WorkoutHeading({ workouts, selected }: { workouts: readonly Workout[]; selected: Workout }) {
  if (workouts.length > 1) return <WorkoutTabs workouts={workouts} selectedLabel={selected.label} />;
  return <h2 className="text-2xl font-semibold">{selected.label}</h2>;
}

/** Daily workout screen: tabs (when split), plan validity and exercise cards by category. */
export function WorkoutPlanView({ overview, requestedLabel }: WorkoutPlanViewProps) {
  const { plan, validity } = overview;
  const selected = selectWorkout(plan.workouts, requestedLabel);
  return (
    <>
      <PlanValiditySummary validity={validity} validUntil={plan.validUntil} />
      {selected ? (
        <>
          <WorkoutHeading workouts={plan.workouts} selected={selected} />
          <SelectedWorkout workout={selected} />
        </>
      ) : (
        <EmptyWorkout />
      )}
    </>
  );
}
