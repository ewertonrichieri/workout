import { Suspense } from "react";
import { SessionHistoryList } from "@/components/history/session-history-list";
import { EmptyState } from "@/components/layout/empty-state";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthenticatedUserId } from "@/lib/auth/server-auth";
import { PAGE_QUERY_PARAM } from "@/lib/constants/routes";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { SessionHistoryPage } from "@/lib/training/history-service";
import { createServerHistoryService } from "@/lib/training/server-history-service";

type ScheduleSearchParams = PageProps<"/schedule">["searchParams"];

/** An invalid page in the URL shows a message instead of failing the screen. */
async function loadHistory(rawPage: unknown): Promise<SessionHistoryPage | null> {
  const userId = await getAuthenticatedUserId();
  const service = await createServerHistoryService();
  try {
    return await service.listHistory(userId, rawPage);
  } catch (error) {
    if (error instanceof InvalidInputError) return null;
    throw error;
  }
}

async function ScheduleContent({ searchParams }: { searchParams: ScheduleSearchParams }) {
  const history = await loadHistory((await searchParams)[PAGE_QUERY_PARAM]);
  if (!history) return <EmptyState title={translate("pages.schedule.emptyTitle")} description={translate("history.invalidPage")} />;
  return <SessionHistoryList history={history} />;
}

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <>
      <PageHeader title={translate("pages.schedule.title")} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
        <Suspense fallback={<ListSkeleton label={translate("history.loading")} />}>
          <ScheduleContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
