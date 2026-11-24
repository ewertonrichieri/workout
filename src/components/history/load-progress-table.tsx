import { translate } from "@/lib/i18n/translate";
import type { ExerciseProgressEntry } from "@/lib/training/load-history";
import { describeLoad, formatCalendarDate } from "./history-labels";

const MISSING_VALUE = "—";
const CELL_CLASS = "border-b border-border px-2 py-2 text-left tabular-nums";

/** Accessible alternative to the chart: every session, newest first. */
export function LoadProgressTable({ exerciseName, entries }: { exerciseName: string; entries: readonly ExerciseProgressEntry[] }) {
  const newestFirst = [...entries].reverse();
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="pb-2 text-left font-semibold">{translate("history.tableCaption", { name: exerciseName })}</caption>
      <thead className="text-muted">
        <tr>
          <th scope="col" className={CELL_CLASS}>{translate("history.dateColumn")}</th>
          <th scope="col" className={CELL_CLASS}>{translate("history.maxLoadColumn")}</th>
          <th scope="col" className={CELL_CLASS}>{translate("history.repsColumn")}</th>
          <th scope="col" className={CELL_CLASS}>{translate("history.setsColumn")}</th>
        </tr>
      </thead>
      <tbody>
        {newestFirst.map((entry) => (
          <tr key={entry.sessionId}>
            <td className={CELL_CLASS}>{formatCalendarDate(entry.date)}</td>
            <td className={CELL_CLASS}>{entry.maxLoadKg === null ? translate("history.noLoad") : describeLoad(entry.maxLoadKg)}</td>
            <td className={CELL_CLASS}>{entry.repsAtMaxLoad ?? MISSING_VALUE}</td>
            <td className={CELL_CLASS}>{entry.setCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
