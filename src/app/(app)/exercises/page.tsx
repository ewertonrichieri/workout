import { Suspense } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseListSkeleton } from "@/components/exercises/exercise-list-skeleton";
import { ExerciseResults } from "@/components/exercises/exercise-results";
import { ExerciseSearchForm } from "@/components/exercises/exercise-search-form";
import type { ExerciseSearchPage } from "@/lib/catalog/exercises/exercise-types";
import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

type ExercisesSearchParams = PageProps<"/exercises">["searchParams"];

type ExerciseCatalogService = Awaited<ReturnType<typeof createServerExerciseCatalogService>>;

/** Invalid filters in the URL show a message instead of failing the page. */
async function loadSearchPage(service: ExerciseCatalogService, params: unknown): Promise<ExerciseSearchPage | null> {
  try {
    return await service.searchExercises(params);
  } catch (error) {
    if (error instanceof InvalidInputError) return null;
    throw error;
  }
}

async function ExerciseSearchContent({ searchParams }: { searchParams: ExercisesSearchParams }) {
  const params = await searchParams;
  const service = await createServerExerciseCatalogService();
  const filters = await service.listFilters();
  const criteria = {
    query: typeof params.q === "string" ? params.q : undefined,
    muscle: typeof params.muscle === "string" ? params.muscle : undefined,
    equipment: typeof params.equipment === "string" ? params.equipment : undefined,
  };
  const page = await loadSearchPage(service, params);
  return (
    <>
      <ExerciseSearchForm criteria={criteria} filters={filters} />
      {page ? (
        <ExerciseResults page={page} criteria={criteria} />
      ) : (
        <EmptyState title={translate("catalog.emptyTitle")} description={translate("catalog.invalidFilters")} />
      )}
    </>
  );
}

export default function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  return (
    <>
      <PageHeader title={translate("catalog.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<ExerciseListSkeleton />}>
          <ExerciseSearchContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
