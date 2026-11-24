import { useId } from "react";
import type { WorkoutExercise } from "@/lib/training/plan-types";
import { groupExercisesByCategory, type WorkoutExerciseGroup } from "@/lib/training/workout-display";
import { WorkoutExerciseCard } from "./workout-exercise-card";

function ExerciseCardList({ exercises }: { exercises: readonly WorkoutExercise[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {exercises.map((workoutExercise) => (
        <li key={workoutExercise.id}>
          <WorkoutExerciseCard workoutExercise={workoutExercise} />
        </li>
      ))}
    </ul>
  );
}

function CategorySection({ group }: { group: WorkoutExerciseGroup }) {
  const headingId = useId();
  if (group.category === null) return <ExerciseCardList exercises={group.exercises} />;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold uppercase tracking-wide text-accent-strong">
        {group.category}
      </h3>
      <ExerciseCardList exercises={group.exercises} />
    </section>
  );
}

/** Exercise cards grouped by category, in order of first appearance. */
export function WorkoutExerciseGroups({ exercises }: { exercises: readonly WorkoutExercise[] }) {
  return (
    <div className="flex flex-col gap-6">
      {groupExercisesByCategory(exercises).map((group) => (
        <CategorySection key={group.category ?? ""} group={group} />
      ))}
    </div>
  );
}
