import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseHistoryRepository } from "./history-repository";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

function createFakeClient(result: { data: unknown; error: unknown; count?: number | null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "not", "order", "limit"]) builder[method] = vi.fn(() => builder);
  builder.range = vi.fn(async () => result);
  builder.limit = vi.fn(async () => result);
  const client = { from: vi.fn(() => builder) };
  return { client: client as unknown as SupabaseClient, builder };
}

describe("history repository", () => {
  it("lists finished sessions of the user, newest first, with set counts", async () => {
    const row = { id: SESSION_ID, finished_at: "2026-11-24T12:00:00+00:00", workouts: { label: "A" }, set_logs: [{ count: 12 }] };
    const { client, builder } = createFakeClient({ data: [row, { ...row, workouts: null }], error: null, count: 2 });
    const page = await createSupabaseHistoryRepository(client).listFinishedSessions("user-1", { page: 2, pageSize: 20 });
    expect(page).toEqual({
      items: [
        { id: SESSION_ID, finishedAt: "2026-11-24T12:00:00+00:00", workoutLabel: "A", setCount: 12 },
        { id: SESSION_ID, finishedAt: "2026-11-24T12:00:00+00:00", workoutLabel: null, setCount: 12 },
      ],
      total: 2,
    });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.order).toHaveBeenCalledWith("finished_at", { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("reads set logs of an exercise only from the user's finished sessions", async () => {
    const row = { session_id: SESSION_ID, set_number: 1, reps_done: 10, load_kg: "20.00", workout_sessions: { finished_at: "2026-11-24T12:00:00+00:00" } };
    const { client, builder } = createFakeClient({ data: [row], error: null });
    await expect(createSupabaseHistoryRepository(client).listExerciseSetLogs("user-1", "e1")).resolves.toEqual([
      { sessionId: SESSION_ID, finishedAt: "2026-11-24T12:00:00+00:00", setNumber: 1, repsDone: 10, loadKg: 20 },
    ]);
    expect(builder.eq).toHaveBeenCalledWith("exercise_id", "e1");
    expect(builder.eq).toHaveBeenCalledWith("workout_sessions.user_id", "user-1");
  });

  it("turns database errors and unexpected rows into repository errors", async () => {
    await expect(createSupabaseHistoryRepository(createFakeClient({ data: null, error: { message: "x" } }).client).listFinishedSessions("u", { page: 1, pageSize: 20 })).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseHistoryRepository(createFakeClient({ data: [{ id: 1 }], error: null }).client).listExerciseSetLogs("u", "e1")).rejects.toBeInstanceOf(RepositoryError);
  });
});
