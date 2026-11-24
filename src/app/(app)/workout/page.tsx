import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { WorkoutPlanView } from "@/components/workout/workout-plan-view";
import { WorkoutSkeleton } from "@/components/workout/workout-skeleton";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { APP_ROUTES, REVIEW_QUERY_PARAM, REVIEW_QUERY_VALUE } from "@/lib/constants/routes";
import { WORKOUT_QUERY_PARAM } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";
import { createServerPlanGenerationService } from "@/lib/plan-generation/server-plan-generation-service";
import { createServerPlanService } from "@/lib/training/server-plan-service";

type WorkoutSearchParams = PageProps<"/workout">["searchParams"];

async function WorkoutContent({ searchParams }: { searchParams: WorkoutSearchParams }) {
  const params = await searchParams;
  const requested = params[WORKOUT_QUERY_PARAM];
  const userId = await getAuthenticatedUserId();
  const [planService, generationService] = await Promise.all([createServerPlanService(), createServerPlanGenerationService()]);
  const [overview, status] = await Promise.all([planService.getActivePlanOverview(userId), generationService.getGenerationStatus(userId)]);
  if (!overview) {
    return <EmptyState title={translate("pages.workout.emptyTitle")} description={translate("pages.workout.emptyDescription")} />;
  }
  return (
    <WorkoutPlanView
      overview={overview}
      requestedLabel={typeof requested === "string" ? requested : undefined}
      showReviewNotice={params[REVIEW_QUERY_PARAM] === REVIEW_QUERY_VALUE}
      hasLimitations={status.hasLimitations}
    />
  );
}

export default function WorkoutPage({ searchParams }: PageProps<"/workout">) {
  return (
    <>
      <PageHeader title={translate("pages.workout.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<WorkoutSkeleton />}>
          <WorkoutContent searchParams={searchParams} />
        </Suspense>
        <Link
          href={APP_ROUTES.exercises}
          className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          {translate("catalog.browseLink")}
        </Link>
      </main>
    </>
  );
}
