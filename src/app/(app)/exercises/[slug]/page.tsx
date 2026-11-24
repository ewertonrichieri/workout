import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseDetailView } from "@/components/exercises/exercise-detail-view";
import { ExerciseListSkeleton } from "@/components/exercises/exercise-list-skeleton";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { APP_ROUTES } from "@/lib/constants/routes";
import { NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

type ExerciseParams = PageProps<"/exercises/[slug]">["params"];

async function loadExercise(slug: string): Promise<ExerciseDetail> {
  const service = await createServerExerciseCatalogService();
  try {
    return await service.getExercise(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

async function ExerciseDetailContent({ params }: { params: ExerciseParams }) {
  const { slug } = await params;
  return <ExerciseDetailView exercise={await loadExercise(slug)} />;
}

export default function ExercisePage({ params }: PageProps<"/exercises/[slug]">) {
  return (
    <>
      <PageHeader title={translate("catalog.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Link href={APP_ROUTES.exercises} className="flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
          {translate("catalog.backToList")}
        </Link>
        <Suspense fallback={<ExerciseListSkeleton />}>
          <ExerciseDetailContent params={params} />
        </Suspense>
      </main>
    </>
  );
}
