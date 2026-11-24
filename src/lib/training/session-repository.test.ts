import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseSessionRepository } from "./session-repository";

const INPUT = {
  workoutId: "11111111-1111-4111-8111-111111111111",
  startedAt: "2026-11-24T10:00:00.000Z",
  sets: [{ workoutExerciseId: "22222222-2222-4222-8222-222222222222", setNumber: 1, repsDone: 10, loadKg: 12.5 }],
};

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("session repository", () => {
  it("calls the transactional function with snake_case sets", async () => {
    const client = createClient({ data: "33333333-3333-4333-8333-333333333333", error: null });
    await expect(createSupabaseSessionRepository(client).finishSession(INPUT)).resolves.toBe("33333333-3333-4333-8333-333333333333");
    expect(client.rpc).toHaveBeenCalledWith("finish_workout_session", {
      p_workout_id: INPUT.workoutId,
      p_started_at: INPUT.startedAt,
      p_sets: [{ workout_exercise_id: "22222222-2222-4222-8222-222222222222", set_number: 1, reps_done: 10, load_kg: 12.5 }],
    });
  });

  it("fails on database errors or an unexpected result", async () => {
    await expect(createSupabaseSessionRepository(createClient({ data: null, error: { message: "boom" } })).finishSession(INPUT)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseSessionRepository(createClient({ data: 42, error: null })).finishSession(INPUT)).rejects.toBeInstanceOf(RepositoryError);
  });
});
