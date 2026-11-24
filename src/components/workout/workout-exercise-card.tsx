import Link from "next/link";
import { ExerciseCover } from "@/components/exercises/exercise-cover";
import { buildExerciseDetailHref } from "@/components/exercises/exercise-search-href";
import type { WorkoutExercise } from "@/lib/training/plan-types";
import { ExerciseDemoDisclosure } from "./exercise-demo-disclosure";
import { describeRest, describeSetsAndReps } from "./workout-labels";

/** One prescribed exercise; the name links to the catalog detail (inputs arrive in step 2.4). */
export function WorkoutExerciseCard({ workoutExercise }: { workoutExercise: WorkoutExercise }) {
  const { exercise, notes } = workoutExercise;
  const rest = describeRest(workoutExercise.restSeconds);
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center gap-4">
        <ExerciseCover media={exercise.coverMedia} />
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
      </div>
      <ExerciseDemoDisclosure exercise={exercise} />
    </article>
  );
}
