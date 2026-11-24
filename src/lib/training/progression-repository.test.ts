import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseProgressionRepository } from "./progression-repository";

const EXERCISE_ID = "22222222-2222-4222-8222-222222222222";

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("progression repository", () => {
  it("reads the latest loads through the database function", async () => {
    const client = createClient({ data: [{ exercise_id: EXERCISE_ID, set_number: 1, load_kg: "12.50", reps_done: 10 }], error: null });
    await expect(createSupabaseProgressionRepository(client).findLatestSetLoads([EXERCISE_ID])).resolves.toEqual([{ exerciseId: EXERCISE_ID, setNumber: 1, loadKg: 12.5, repsDone: 10 }]);
    expect(client.rpc).toHaveBeenCalledWith("latest_set_loads", { p_exercise_ids: [EXERCISE_ID] });
  });

  it("skips the query when no exercise is tracked", async () => {
    const client = createClient({ data: [], error: null });
    await expect(createSupabaseProgressionRepository(client).findLatestSetLoads([])).resolves.toEqual([]);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("fails on database errors or rows outside the schema", async () => {
    await expect(createSupabaseProgressionRepository(createClient({ data: null, error: { message: "x" } })).findLatestSetLoads([EXERCISE_ID])).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseProgressionRepository(createClient({ data: [{ exercise_id: 1 }], error: null })).findLatestSetLoads([EXERCISE_ID])).rejects.toBeInstanceOf(RepositoryError);
  });
});
