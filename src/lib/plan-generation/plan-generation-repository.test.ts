import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { createSupabasePlanGenerationRepository } from "./plan-generation-repository";

const PLAN_ID = "22222222-2222-4222-8222-222222222222";

function createClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

const NEW_PLAN = {
  assessmentId: "11111111-1111-4111-8111-111111111111",
  goal: "strength" as const,
  startsOn: "2026-11-24",
  validUntil: "2027-01-04",
  replaceActivePlan: true,
  plan: {
    workouts: [
      { label: "A", exercises: [{ exerciseSlug: "db-press", category: "Principal", sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, notes: null }] },
    ],
  },
};

describe("plan generation repository: listCandidates", () => {
  it("reads the candidates for the user's equipment", async () => {
    const client = createClient({ data: [{ slug: "db-press", primary_muscles: ["chest"], equipment: ["bench", "dumbbell"] }], error: null });
    await expect(createSupabasePlanGenerationRepository(client).listCandidates(["dumbbell", "bench"])).resolves.toEqual([
      { slug: "db-press", primaryMuscles: ["chest"], equipment: ["bench", "dumbbell"] },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_plan_candidates", { p_equipment_slugs: ["dumbbell", "bench"] });
  });

  it("fails on database errors or rows outside the schema", async () => {
    await expect(createSupabasePlanGenerationRepository(createClient({ data: null, error: { message: "boom" } })).listCandidates([])).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabasePlanGenerationRepository(createClient({ data: [{ slug: 1 }], error: null })).listCandidates([])).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("plan generation repository: createGeneratedPlan", () => {
  it("calls the transactional function with snake_case workouts", async () => {
    const client = createClient({ data: PLAN_ID, error: null });
    await expect(createSupabasePlanGenerationRepository(client).createGeneratedPlan(NEW_PLAN)).resolves.toBe(PLAN_ID);
    expect(client.rpc).toHaveBeenCalledWith("create_generated_plan", {
      p_assessment_id: NEW_PLAN.assessmentId,
      p_goal: "strength",
      p_starts_on: "2026-11-24",
      p_valid_until: "2027-01-04",
      p_replace_active: true,
      p_workouts: [
        { label: "A", exercises: [{ exercise_slug: "db-press", category: "Principal", sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 60, notes: null }] },
      ],
    });
  });

  it("explains an active plan that was not confirmed, and fails on other errors", async () => {
    const conflict = createClient({ data: null, error: { code: "WK001", message: "active plan exists" } });
    await expect(createSupabasePlanGenerationRepository(conflict).createGeneratedPlan(NEW_PLAN)).rejects.toBeInstanceOf(UnprocessableError);
    const failure = createClient({ data: null, error: { code: "22023", message: "mismatch" } });
    await expect(createSupabasePlanGenerationRepository(failure).createGeneratedPlan(NEW_PLAN)).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("plan generation repository: summarizePlanHistory", () => {
  it("reads the history of a plan", async () => {
    const client = createClient({
      data: { sessions: 4, exercises: [{ slug: "db-press", sessions: 4, first_max_load_kg: 20, last_max_load_kg: "22.50", last_reps: 12 }] },
      error: null,
    });
    await expect(createSupabasePlanGenerationRepository(client).summarizePlanHistory(PLAN_ID)).resolves.toEqual({
      sessions: 4,
      exercises: [{ slug: "db-press", sessions: 4, firstMaxLoadKg: 20, lastMaxLoadKg: 22.5, lastReps: 12 }],
    });
    expect(client.rpc).toHaveBeenCalledWith("plan_history_summary", { p_plan_id: PLAN_ID });
  });

  it("fails on database errors or data outside the schema", async () => {
    await expect(createSupabasePlanGenerationRepository(createClient({ data: null, error: { message: "x" } })).summarizePlanHistory(PLAN_ID)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabasePlanGenerationRepository(createClient({ data: { sessions: "x" }, error: null })).summarizePlanHistory(PLAN_ID)).rejects.toBeInstanceOf(RepositoryError);
  });
});

