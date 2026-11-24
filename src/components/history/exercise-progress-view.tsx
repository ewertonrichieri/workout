import { EmptyState } from "@/components/layout/empty-state";
import { translate } from "@/lib/i18n/translate";
import type { ExerciseProgress } from "@/lib/training/history-service";
import { LoadProgressChart, type LoadPoint } from "./load-progress-chart";
import { LoadProgressTable } from "./load-progress-table";

function toLoadPoints(progress: ExerciseProgress): LoadPoint[] {
  return progress.entries.flatMap((entry) => (entry.maxLoadKg === null ? [] : [{ date: entry.date, loadKg: entry.maxLoadKg }]));
}

/** Progression of one exercise: chart of the heaviest load per session plus the full table. */
export function ExerciseProgressView({ progress }: { progress: ExerciseProgress }) {
  const { exercise, entries } = progress;
  const points = toLoadPoints(progress);
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{exercise.name}</h2>
        <p className="text-muted">{translate("history.progressSubtitle")}</p>
      </header>
      {entries.length === 0 ? (
        <EmptyState title={translate("history.progressEmptyTitle")} description={translate("history.progressEmptyDescription")} />
      ) : (
        <>
          {points.length > 0 ? <LoadProgressChart exerciseName={exercise.name} points={points} /> : <p className="text-muted">{translate("history.chartNoLoads")}</p>}
          <LoadProgressTable exerciseName={exercise.name} entries={entries} />
        </>
      )}
    </article>
  );
}
