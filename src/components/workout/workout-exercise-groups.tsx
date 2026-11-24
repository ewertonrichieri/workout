import { useId } from "react";
import type { WorkoutExercise } from "@/lib/training/plan-types";
import type { WorkoutDraft } from "@/lib/training/set-log-draft";
import type { SuggestedLoads } from "@/lib/training/suggested-loads";
import { groupExercisesByCategory, type WorkoutExerciseGroup } from "@/lib/training/workout-display";
import type { SetChangeHandler } from "./use-workout-draft";
import { WorkoutExerciseCard } from "./workout-exercise-card";

interface DraftProps {
  draft: WorkoutDraft;
  suggestedLoads: SuggestedLoads;
  onSetChange: SetChangeHandler;
}

const NO_SETS: never[] = [];

function ExerciseCardList({ exercises, draft, suggestedLoads, onSetChange }: DraftProps & { exercises: readonly WorkoutExercise[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {exercises.map((workoutExercise) => (
        <li key={workoutExercise.id}>
          <WorkoutExerciseCard
            workoutExercise={workoutExercise}
            sets={draft.entries[workoutExercise.id] ?? NO_SETS}
            hasSuggestedLoad={suggestedLoads[workoutExercise.id] !== undefined}
            onSetChange={(setIndex, patch) => onSetChange(workoutExercise.id, setIndex, patch)}
          />
        </li>
      ))}
    </ul>
  );
}

function CategorySection({ group, ...draftProps }: DraftProps & { group: WorkoutExerciseGroup }) {
  const headingId = useId();
  if (group.category === null) return <ExerciseCardList exercises={group.exercises} {...draftProps} />;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-accent-strong">
        {group.category}
      </h3>
      <ExerciseCardList exercises={group.exercises} {...draftProps} />
    </section>
  );
}

/** Exercise cards grouped by category, in order of first appearance. */
export function WorkoutExerciseGroups({ exercises, ...draftProps }: DraftProps & { exercises: readonly WorkoutExercise[] }) {
  return (
    <div className="flex flex-col gap-6">
      {groupExercisesByCategory(exercises).map((group) => (
        <CategorySection key={group.category ?? ""} group={group} {...draftProps} />
      ))}
    </div>
  );
}
