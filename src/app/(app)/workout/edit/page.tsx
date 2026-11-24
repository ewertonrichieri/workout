import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { WorkoutEditor } from "@/components/plan-edit/workout-editor";
import { buildWorkoutHref } from "@/components/workout/workout-labels";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { WORKOUT_QUERY_PARAM } from "@/lib/constants/training";
import { translate } from "@/lib/i18n/translate";
import { createServerPlanService } from "@/lib/training/server-plan-service";
import { selectWorkout } from "@/lib/training/workout-display";

type EditSearchParams = PageProps<"/workout/edit">["searchParams"];

const BACK_LINK_CLASS =
  "flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

async function EditContent({ searchParams }: { searchParams: EditSearchParams }) {
  const requested = (await searchParams)[WORKOUT_QUERY_PARAM];
  const userId = await getAuthenticatedUserId();
  const overview = await (await createServerPlanService()).getActivePlanOverview(userId);
  const workout = overview ? selectWorkout(overview.plan.workouts, typeof requested === "string" ? requested : undefined) : null;
  if (!workout) return <EmptyState title={translate("planEdit.noWorkoutTitle")} description={translate("planEdit.noWorkoutDescription")} />;
  return (
    <>
      <h2 className="text-2xl font-semibold">{translate("planEdit.title", { label: workout.label })}</h2>
      <WorkoutEditor key={workout.id} workout={workout} />
      <Link href={buildWorkoutHref(workout.label)} className={BACK_LINK_CLASS}>{translate("planEdit.backLink")}</Link>
    </>
  );
}

/** Manual editing of the selected workout of the active plan (step 3.4). */
export default function WorkoutEditPage({ searchParams }: PageProps<"/workout/edit">) {
  return (
    <>
      <PageHeader title={translate("pages.workout.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<ListSkeleton label={translate("planEdit.loading")} rows={3} />}>
          <EditContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
