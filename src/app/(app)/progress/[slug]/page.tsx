import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseProgressView } from "@/components/history/exercise-progress-view";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { APP_ROUTES } from "@/lib/constants/routes";
import { NotFoundError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { ExerciseProgress } from "@/lib/training/history-service";
import { createServerHistoryService } from "@/lib/training/server-history-service";

type ProgressParams = PageProps<"/progress/[slug]">["params"];

async function loadProgress(slug: string): Promise<ExerciseProgress> {
  const userId = await getAuthenticatedUserId();
  const service = await createServerHistoryService();
  try {
    return await service.getExerciseProgress(userId, slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

async function ProgressContent({ params }: { params: ProgressParams }) {
  const { slug } = await params;
  return <ExerciseProgressView progress={await loadProgress(slug)} />;
}

export default function ProgressPage({ params }: PageProps<"/progress/[slug]">) {
  return (
    <>
      <PageHeader title={translate("history.progressTitle")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Link href={APP_ROUTES.workout} className="flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
          {translate("history.backToWorkout")}
        </Link>
        <Suspense fallback={<ListSkeleton label={translate("history.loading")} rows={2} />}>
          <ProgressContent params={params} />
        </Suspense>
      </main>
    </>
  );
}
