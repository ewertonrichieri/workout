import Link from "next/link";
import { translate } from "@/lib/i18n/translate";
import { buildExerciseSearchHref, type ExerciseListFilters } from "./exercise-search-href";

interface ExercisePaginationProps {
  filters: ExerciseListFilters;
  page: number;
  totalPages: number;
}

const LINK_CLASS =
  "flex min-h-11 items-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export function ExercisePagination({ filters, page, totalPages }: ExercisePaginationProps) {
  return (
    <nav aria-label={translate("catalog.paginationLabel")} className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={buildExerciseSearchHref(filters, page - 1)} className={LINK_CLASS}>{translate("catalog.previousPage")}</Link>
      ) : <span />}
      <span className="text-sm text-muted">{translate("catalog.pageStatus", { page, totalPages })}</span>
      {page < totalPages ? (
        <Link href={buildExerciseSearchHref(filters, page + 1)} className={LINK_CLASS}>{translate("catalog.nextPage")}</Link>
      ) : <span />}
    </nav>
  );
}
