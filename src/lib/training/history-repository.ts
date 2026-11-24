import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MAX_PROGRESS_SET_LOGS } from "@/lib/constants/training";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { SetLogHistoryRow } from "./load-history";

export interface FinishedSessionRow {
  id: string;
  finishedAt: string;
  /** `null` when the workout was deleted afterwards (FK `on delete set null`). */
  workoutLabel: string | null;
  setCount: number;
}

export interface HistoryRepository {
  listFinishedSessions(userId: string, pagination: { page: number; pageSize: number }): Promise<{ items: FinishedSessionRow[]; total: number }>;
  listExerciseSetLogs(userId: string, exerciseId: string): Promise<SetLogHistoryRow[]>;
}

const SESSION_COLUMNS = "id, finished_at, workouts(label), set_logs(count)";
const SET_LOG_COLUMNS = "session_id, set_number, reps_done, load_kg, workout_sessions!inner(finished_at)";
const numericSchema = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().nonnegative());

const sessionRowsSchema = z.array(z.object({
  id: z.uuid(),
  finished_at: z.string(),
  workouts: z.object({ label: z.string() }).nullable(),
  set_logs: z.array(z.object({ count: z.number().int() })),
}));

const setLogRowsSchema = z.array(z.object({
  session_id: z.uuid(),
  set_number: z.number().int(),
  reps_done: z.number().int().nullable(),
  load_kg: numericSchema.nullable(),
  workout_sessions: z.object({ finished_at: z.string() }),
}));

function failure(operation: string): RepositoryError {
  return new RepositoryError(translate("errors.internal"), operation);
}

/** Reads through the user's session (RLS) and also filters by the user explicitly. */
export function createSupabaseHistoryRepository(client: SupabaseClient): HistoryRepository {
  return {
    async listFinishedSessions(userId, { page, pageSize }) {
      const from = (page - 1) * pageSize;
      const { data, error, count } = await client.from("workout_sessions").select(SESSION_COLUMNS, { count: "exact" })
        .eq("user_id", userId).not("finished_at", "is", null).order("finished_at", { ascending: false }).range(from, from + pageSize - 1);
      const rows = sessionRowsSchema.safeParse(data);
      if (error || !rows.success) throw failure("history.listFinishedSessions");
      const items = rows.data.map((row) => ({ id: row.id, finishedAt: row.finished_at, workoutLabel: row.workouts?.label ?? null, setCount: row.set_logs[0]?.count ?? 0 }));
      return { items, total: count ?? items.length };
    },
    async listExerciseSetLogs(userId, exerciseId) {
      const { data, error } = await client.from("set_logs").select(SET_LOG_COLUMNS)
        .eq("exercise_id", exerciseId).eq("workout_sessions.user_id", userId).not("workout_sessions.finished_at", "is", null)
        .order("created_at", { ascending: false }).limit(MAX_PROGRESS_SET_LOGS);
      const rows = setLogRowsSchema.safeParse(data);
      if (error || !rows.success) throw failure("history.listExerciseSetLogs");
      return rows.data.map((row) => ({ sessionId: row.session_id, finishedAt: row.workout_sessions.finished_at, setNumber: row.set_number, repsDone: row.reps_done, loadKg: row.load_kg }));
    },
  };
}
