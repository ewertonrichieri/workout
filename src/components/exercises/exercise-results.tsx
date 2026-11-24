import { EmptyState } from "@/components/layout/empty-state";
import type { ExerciseSearchPage } from "@/lib/catalog/exercises/exercise-types";
import { translate } from "@/lib/i18n/translate";
import { ExerciseCard } from "./exercise-card";
import { ExercisePagination } from "./exercise-pagination";
import type { ExerciseListFilters } from "./exercise-search-href";

interface ExerciseResultsProps {
  page: ExerciseSearchPage;
  criteria: ExerciseListFilters;
}

export function ExerciseResults({ page, criteria }: ExerciseResultsProps) {
  if (page.items.length === 0) {
    return <EmptyState title={translate("catalog.emptyTitle")} description={translate("catalog.emptyDescription")} />;
  }
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted" role="status">{translate("catalog.resultsCount", { total: page.total })}</p>
      <ul className="flex flex-col gap-3">
        {page.items.map((exercise) => (
          <li key={exercise.slug}><ExerciseCard exercise={exercise} /></li>
        ))}
      </ul>
      {page.totalPages > 1 && <ExercisePagination filters={criteria} page={page.page} totalPages={page.totalPages} />}
    </section>
  );
}
