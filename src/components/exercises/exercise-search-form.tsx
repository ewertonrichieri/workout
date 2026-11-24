import type { CatalogTerm, ExerciseFilters } from "@/lib/catalog/exercises/exercise-types";
import { EXERCISE_SEARCH_MAX_LENGTH } from "@/lib/constants/catalog";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";
import type { ExerciseListFilters } from "./exercise-search-href";

interface ExerciseSearchFormProps {
  criteria: ExerciseListFilters;
  filters: ExerciseFilters;
}

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

function FilterSelect({ name, label, options, value }: { name: string; label: string; options: CatalogTerm[]; value?: string }) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm">
      {label}
      <select name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
        <option value="">{translate("catalog.allOption")}</option>
        {options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}
      </select>
    </label>
  );
}

/** Plain GET form: works without client JavaScript and keeps filters in the URL. */
export function ExerciseSearchForm({ criteria, filters }: ExerciseSearchFormProps) {
  return (
    <form action={APP_ROUTES.exercises} method="get" role="search" className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        {translate("catalog.searchLabel")}
        <input type="search" name="q" defaultValue={criteria.query ?? ""} maxLength={EXERCISE_SEARCH_MAX_LENGTH} placeholder={translate("catalog.searchPlaceholder")} className={FIELD_CLASS} />
      </label>
      <div className="flex gap-3">
        <FilterSelect name="muscle" label={translate("catalog.muscleLabel")} options={filters.muscles} value={criteria.muscle} />
        <FilterSelect name="equipment" label={translate("catalog.equipmentLabel")} options={filters.equipment} value={criteria.equipment} />
      </div>
      <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
        {translate("catalog.searchButton")}
      </button>
    </form>
  );
}
