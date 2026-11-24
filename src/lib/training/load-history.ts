import { toDateInTimeZone } from "./plan-validity";

/** One logged set of an exercise in a finished session. */
export interface SetLogHistoryRow {
  sessionId: string;
  /** ISO instant the session was finished. */
  finishedAt: string;
  setNumber: number;
  repsDone: number | null;
  loadKg: number | null;
}

/** One session of an exercise on the progression screen. */
export interface ExerciseProgressEntry {
  sessionId: string;
  /** Calendar date (YYYY-MM-DD) in the app time zone. */
  date: string;
  /** Heaviest load of the session; `null` when no set had a load (bodyweight). */
  maxLoadKg: number | null;
  /** Reps of the first set done at the heaviest load. */
  repsAtMaxLoad: number | null;
  setCount: number;
}

function summarizeSession(rows: readonly SetLogHistoryRow[], timeZone: string): ExerciseProgressEntry {
  const [first] = rows;
  const ordered = [...rows].sort((left, right) => left.setNumber - right.setNumber);
  const loads = ordered.map((row) => row.loadKg).filter((load) => load !== null);
  const maxLoadKg = loads.length > 0 ? Math.max(...loads) : null;
  const heaviest = maxLoadKg === null ? undefined : ordered.find((row) => row.loadKg === maxLoadKg);
  return {
    sessionId: first.sessionId,
    date: toDateInTimeZone(new Date(first.finishedAt), timeZone),
    maxLoadKg,
    repsAtMaxLoad: heaviest?.repsDone ?? null,
    setCount: rows.length,
  };
}

/** Per-session summary in chronological order, keeping the latest `maxSessions`. */
export function buildExerciseProgress(rows: readonly SetLogHistoryRow[], timeZone: string, maxSessions: number): ExerciseProgressEntry[] {
  const bySession = new Map<string, SetLogHistoryRow[]>();
  for (const row of rows) bySession.set(row.sessionId, [...(bySession.get(row.sessionId) ?? []), row]);
  const sessions = [...bySession.values()].sort((left, right) => Date.parse(left[0].finishedAt) - Date.parse(right[0].finishedAt));
  return sessions.slice(-maxSessions).map((sessionRows) => summarizeSession(sessionRows, timeZone));
}
