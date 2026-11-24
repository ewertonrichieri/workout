import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError } from "@/lib/errors/app-errors";
import { createSupabaseAssessmentRepository } from "./assessment-repository";

const ASSESSMENT_ID = "11111111-1111-4111-8111-111111111111";

const INPUT = {
  goal: "hypertrophy" as const,
  experienceLevel: "beginner" as const,
  daysPerWeek: 2,
  sessionMinutes: 50,
  splitPreference: "full_body" as const,
  equipmentSlugs: ["bench", "dumbbell"],
  limitations: "Lombar sensível",
};

const LATEST_ROW = {
  id: ASSESSMENT_ID,
  created_at: "2026-11-26T10:00:00+00:00",
  goal: "hypertrophy",
  experience_level: "beginner",
  days_per_week: 2,
  session_minutes: 50,
  split_preference: "full_body",
  limitations: null,
  assessment_equipment: [{ equipment: { slug: "bench" } }, { equipment: { slug: "dumbbell" } }],
};

function createRpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

/** Fake of from().select().eq().order().limit().maybeSingle() that records the calls. */
function createQueryClient(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  };
  const client = { from: vi.fn(() => query) } as unknown as SupabaseClient;
  return { client, query };
}

describe("assessment repository: saveAssessment", () => {
  it("calls the transactional function with snake_case parameters", async () => {
    const client = createRpcClient({ data: ASSESSMENT_ID, error: null });
    await expect(createSupabaseAssessmentRepository(client).saveAssessment(INPUT)).resolves.toBe(ASSESSMENT_ID);
    expect(client.rpc).toHaveBeenCalledWith("save_assessment", {
      p_goal: "hypertrophy",
      p_experience_level: "beginner",
      p_days_per_week: 2,
      p_session_minutes: 50,
      p_split_preference: "full_body",
      p_limitations: "Lombar sensível",
      p_equipment_slugs: ["bench", "dumbbell"],
    });
  });

  it("fails on database errors or an unexpected result", async () => {
    await expect(createSupabaseAssessmentRepository(createRpcClient({ data: null, error: { message: "boom" } })).saveAssessment(INPUT)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseAssessmentRepository(createRpcClient({ data: 7, error: null })).saveAssessment(INPUT)).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("assessment repository: findLatestAssessment", () => {
  it("reads the newest assessment of the user with its equipment", async () => {
    const { client, query } = createQueryClient({ data: LATEST_ROW, error: null });
    await expect(createSupabaseAssessmentRepository(client).findLatestAssessment("user-1")).resolves.toEqual({
      id: ASSESSMENT_ID,
      createdAt: "2026-11-26T10:00:00+00:00",
      goal: "hypertrophy",
      experienceLevel: "beginner",
      daysPerWeek: 2,
      sessionMinutes: 50,
      splitPreference: "full_body",
      limitations: null,
      equipmentSlugs: ["bench", "dumbbell"],
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when the user has no assessment", async () => {
    const { client } = createQueryClient({ data: null, error: null });
    await expect(createSupabaseAssessmentRepository(client).findLatestAssessment("user-1")).resolves.toBeNull();
  });

  it("fails on database errors or rows outside the schema", async () => {
    const failing = createQueryClient({ data: null, error: { message: "boom" } });
    await expect(createSupabaseAssessmentRepository(failing.client).findLatestAssessment("user-1")).rejects.toBeInstanceOf(RepositoryError);
    const malformed = createQueryClient({ data: { ...LATEST_ROW, goal: "flexibility" }, error: null });
    await expect(createSupabaseAssessmentRepository(malformed.client).findLatestAssessment("user-1")).rejects.toBeInstanceOf(RepositoryError);
  });
});
