import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseReadinessRepository } from "./readiness-repository";

const CHECKIN_ID = "33333333-3333-4333-8333-333333333333";
const INPUT = {
  workoutId: "11111111-1111-4111-8111-111111111111",
  sleepQuality: "poor" as const,
  energyLevel: "low" as const,
  availableMinutes: 30,
  pains: [{ bodyRegion: "knees" as const, intensity: "severe" as const }],
};

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("readiness repository", () => {
  it("calls the transactional function with snake_case parameters", async () => {
    const client = createClient({ data: CHECKIN_ID, error: null });
    await expect(createSupabaseReadinessRepository(client).saveCheckin(INPUT)).resolves.toBe(CHECKIN_ID);
    expect(client.rpc).toHaveBeenCalledWith("save_readiness_checkin", {
      p_workout_id: INPUT.workoutId,
      p_sleep_quality: "poor",
      p_energy_level: "low",
      p_available_minutes: 30,
      p_pains: [{ body_region: "knees", intensity: "severe" }],
    });
  });

  it("fails on database errors or an unexpected result", async () => {
    await expect(createSupabaseReadinessRepository(createClient({ data: null, error: { message: "boom" } })).saveCheckin(INPUT)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseReadinessRepository(createClient({ data: 42, error: null })).saveCheckin(INPUT)).rejects.toBeInstanceOf(RepositoryError);
  });
});
