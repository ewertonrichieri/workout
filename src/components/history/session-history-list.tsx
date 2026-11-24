import { EmptyState } from "@/components/layout/empty-state";
import { PaginationNav } from "@/components/layout/pagination-nav";
import { translate } from "@/lib/i18n/translate";
import type { SessionHistoryItem, SessionHistoryPage } from "@/lib/training/history-service";
import { buildScheduleHref, formatCalendarDate } from "./history-labels";

function SessionHistoryRow({ session }: { session: SessionHistoryItem }) {
  const label = session.workoutLabel === null ? translate("history.removedWorkout") : translate("history.workoutLabel", { label: session.workoutLabel });
  const sets = translate(session.setCount === 1 ? "history.setCountOne" : "history.setCountOther", { count: session.setCount });
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
      <span className="flex flex-col gap-1">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted">{sets}</span>
      </span>
      <span className="text-sm tabular-nums">{formatCalendarDate(session.date)}</span>
    </li>
  );
}

/** "Agenda": finished workouts, newest first. */
export function SessionHistoryList({ history }: { history: SessionHistoryPage }) {
  if (history.items.length === 0) {
    return <EmptyState title={translate("pages.schedule.emptyTitle")} description={translate("pages.schedule.emptyDescription")} />;
  }
  return (
    <>
      <ul aria-label={translate("history.listLabel")} className="flex flex-col gap-3">
        {history.items.map((session) => <SessionHistoryRow key={session.id} session={session} />)}
      </ul>
      {history.totalPages > 1 && (
        <PaginationNav label={translate("history.paginationLabel")} page={history.page} totalPages={history.totalPages} buildHref={buildScheduleHref} />
      )}
    </>
  );
}
