"use client";

import { useEffect, useRef } from "react";
import { formatCalendarDate } from "@/components/history/history-labels";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { TECHNIQUE_SCORE_MAX } from "@/lib/constants/technique-analysis";
import type { TechniqueHistoryEntry } from "@/lib/technique-analysis/technique-history-schema";
import { translate } from "@/lib/i18n/translate";
import { useTechniqueHistory } from "./use-technique-history";

const LINK_BUTTON_CLASS = "flex min-h-11 items-center self-start font-medium text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong";

export function describeFrequentIssues(item: TechniqueHistoryEntry): string {
  if (item.frequentIssues.length === 0) return translate("technique.history.noIssues");
  const issues = item.frequentIssues.map(({ issue, repCount }) => translate("technique.history.issueCount", { issue: translate(`technique.history.issues.${issue}`), count: repCount }));
  return translate("technique.history.frequentIssues", { issues: issues.join(", ") });
}

function HistoryItem({ item, onDelete }: { item: TechniqueHistoryEntry; onDelete: () => void }) {
  const date = formatCalendarDate(item.date);
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{date} · {translate("technique.history.score", { score: item.overallScore, max: TECHNIQUE_SCORE_MAX })}</p>
        <button type="button" onClick={onDelete} aria-label={translate("technique.history.deleteLabel", { date })} className={`${SECONDARY_BUTTON_CLASS} text-sm`}>
          {translate("technique.history.delete")}
        </button>
      </div>
      <p className="text-sm text-muted">{translate("technique.history.reps", { evaluated: item.evaluatedRepCount, total: item.repCount })}</p>
      <p className="text-sm">{describeFrequentIssues(item)}</p>
      <p className="text-sm text-accent-strong">{item.mainTip}</p>
    </li>
  );
}

function UndoNotice({ onUndo }: { onUndo: () => void }) {
  const undoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => undoRef.current?.focus(), []);
  return (
    <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
      <p>{translate("technique.history.deleted")}</p>
      <button ref={undoRef} type="button" onClick={onUndo} className={SECONDARY_BUTTON_CLASS}>{translate("technique.history.undo")}</button>
    </div>
  );
}

function HistoryBody({ history }: { history: ReturnType<typeof useTechniqueHistory> }) {
  if (history.status === "loading") return <ListSkeleton label={translate("technique.history.loading")} rows={2} />;
  if (history.status === "error") {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p>{translate("technique.history.loadError")}</p>
        <button type="button" onClick={history.reload} className={`${SECONDARY_BUTTON_CLASS} self-start`}>{translate("technique.history.retry")}</button>
      </div>
    );
  }
  if (history.items.length === 0 && !history.hasPending) return <p className="text-muted">{translate("technique.history.empty")}</p>;
  return (
    <>
      <ol className="flex flex-col gap-2">{history.items.map((item) => <HistoryItem key={item.id} item={item} onDelete={() => history.remove(item)} />)}</ol>
      {history.items.length + (history.hasPending ? 1 : 0) < history.loaded.total && (
        <button type="button" onClick={history.loadMore} className={LINK_BUTTON_CLASS}>{translate("technique.history.loadMore")}</button>
      )}
    </>
  );
}

/** "Técnica" in the exercise detail (step 5.5): scores of the latest analyses and the most frequent issues. */
export function TechniqueHistory({ exerciseSlug }: { exerciseSlug: string }) {
  const history = useTechniqueHistory(exerciseSlug);
  return (
    <section id="tecnica" aria-labelledby="technique-history-title" className="flex flex-col gap-2">
      <h3 id="technique-history-title" className="font-semibold">{translate("technique.history.title")}</h3>
      <p className="text-sm text-muted">{translate("technique.history.subtitle")}</p>
      {history.hasPending && <UndoNotice onUndo={history.undo} />}
      {history.deleteError && <p role="alert" className="text-sm font-medium">{history.deleteError}</p>}
      <HistoryBody history={history} />
    </section>
  );
}
