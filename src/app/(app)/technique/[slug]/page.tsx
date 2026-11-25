import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { TechniqueScreen } from "@/components/technique/technique-screen";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { createServerExerciseCatalogService } from "@/lib/catalog/exercises/server-exercise-catalog";
import { APP_ROUTES } from "@/lib/constants/routes";
import { NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import { findTechniqueRuleSet } from "@/lib/technique/technique-support";

type TechniqueParams = PageProps<"/technique/[slug]">["params"];

async function loadExercise(slug: string): Promise<ExerciseDetail> {
  const service = await createServerExerciseCatalogService();
  try {
    return await service.getExercise(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

async function TechniqueContent({ params }: { params: TechniqueParams }) {
  const { slug } = await params;
  const ruleSet = findTechniqueRuleSet(slug);
  if (!ruleSet) notFound();
  const exercise = await loadExercise(slug);
  return (
    <>
      <h2 className="text-xl font-semibold">{exercise.name}</h2>
      <TechniqueScreen ruleSet={ruleSet} />
    </>
  );
}

/** "Analisar minha execução" (spec 014, step 5.1); the camera runs only in the browser. */
export default function TechniquePage({ params }: PageProps<"/technique/[slug]">) {
  return (
    <>
      <PageHeader title={translate("technique.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <Link href={APP_ROUTES.workout} className="flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
          {translate("technique.backToWorkout")}
        </Link>
        <Suspense fallback={<ListSkeleton label={translate("technique.framing.loadingModel")} rows={2} />}>
          <TechniqueContent params={params} />
        </Suspense>
      </main>
    </>
  );
}
