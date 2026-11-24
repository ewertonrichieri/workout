import Link from "next/link";
import type { CatalogTerm, ExerciseSummary } from "@/lib/catalog/exercises/exercise-types";
import { ExerciseCover } from "./exercise-cover";
import { buildExerciseDetailHref } from "./exercise-search-href";

const TERM_SEPARATOR = ", ";
const GROUP_SEPARATOR = " · ";

function joinTerms(terms: readonly CatalogTerm[]): string {
  return terms.map((term) => term.name).join(TERM_SEPARATOR);
}

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  const details = [joinTerms(exercise.primaryMuscles), joinTerms(exercise.equipment)].filter(Boolean).join(GROUP_SEPARATOR);
  return (
    <Link
      href={buildExerciseDetailHref(exercise.slug)}
      className="flex min-h-11 items-center gap-4 rounded-2xl border border-border bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
    >
      <ExerciseCover media={exercise.coverMedia} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold">{exercise.name}</span>
        {details && <span className="text-sm text-muted">{details}</span>}
      </span>
    </Link>
  );
}
