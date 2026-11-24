import { PaginationNav } from "@/components/layout/pagination-nav";
import { translate } from "@/lib/i18n/translate";
import { buildExerciseSearchHref, type ExerciseListFilters } from "./exercise-search-href";

interface ExercisePaginationProps {
  filters: ExerciseListFilters;
  page: number;
  totalPages: number;
}

export function ExercisePagination({ filters, page, totalPages }: ExercisePaginationProps) {
  return <PaginationNav label={translate("catalog.paginationLabel")} page={page} totalPages={totalPages} buildHref={(target) => buildExerciseSearchHref(filters, target)} />;
}
