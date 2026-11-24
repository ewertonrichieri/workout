import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { createSupabaseAdjustmentRepository } from "./adjustment-repository";

const CHECKIN_ID = "44444444-4444-4444-8444-444444444444";
const WORKOUT_ID = "11111111-1111-4111-8111-111111111111";
const CHECKIN_ROW = {
  id: CHECKIN_ID,
  workout_id: WORKOUT_ID,
  sleep_quality: "poor",
  energy_level: "low",
  available_minutes: 30,
  created_at: "2026-11-24T10:00:00+00:00",
  readiness_checkin_pains: [{ body_region: "knees", intensity: "severe" }],
  workout_sessions: [],
};

/** Fake of from().select().eq().in().maybeSingle() that records the calls. */
function createQueryClient(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };
  const client = { from: vi.fn(() => query), rpc: vi.fn(async () => result) } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };
  return { client, query };
}

describe("adjustment repository: findCheckin", () => {
  it("reads the user's check-in with pains and whether it was finished", async () => {
    const { client, query } = createQueryClient({ data: CHECKIN_ROW, error: null });
    await expect(createSupabaseAdjustmentRepository(client).findCheckin(CHECKIN_ID, "user-1")).resolves.toEqual({
      id: CHECKIN_ID,
      workoutId: WORKOUT_ID,
      sleepQuality: "poor",
      energyLevel: "low",
      availableMinutes: 30,
      createdAt: "2026-11-24T10:00:00+00:00",
      pains: [{ bodyRegion: "knees", intensity: "severe" }],
      hasFinishedSession: false,
    });
    expect(client.from).toHaveBeenCalledWith("readiness_checkins");
    expect(query.eq).toHaveBeenCalledWith("id", CHECKIN_ID);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("understands a finished session embedded as a list or as one object", async () => {
    const asList = createQueryClient({ data: { ...CHECKIN_ROW, workout_sessions: [{ id: "s" }] }, error: null });
    await expect(createSupabaseAdjustmentRepository(asList.client).findCheckin(CHECKIN_ID, "user-1")).resolves.toMatchObject({ hasFinishedSession: true });
    const asObject = createQueryClient({ data: { ...CHECKIN_ROW, workout_sessions: { id: "s" } }, error: null });
    await expect(createSupabaseAdjustmentRepository(asObject.client).findCheckin(CHECKIN_ID, "user-1")).resolves.toMatchObject({ hasFinishedSession: true });
    const asNull = createQueryClient({ data: { ...CHECKIN_ROW, workout_sessions: null }, error: null });
    await expect(createSupabaseAdjustmentRepository(asNull.client).findCheckin(CHECKIN_ID, "user-1")).resolves.toMatchObject({ hasFinishedSession: false });
  });

  it("returns null when missing and fails on errors or unexpected rows", async () => {
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: null }).client).findCheckin(CHECKIN_ID, "u")).resolves.toBeNull();
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: { message: "x" } }).client).findCheckin(CHECKIN_ID, "u")).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: { id: 1 }, error: null }).client).findCheckin(CHECKIN_ID, "u")).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("adjustment repository: catalog reads", () => {
  it("lists muscles and equipment of the given exercises", async () => {
    const { client } = createQueryClient({ data: [{ slug: "a", primary_muscles: ["chest"], equipment: ["bench"] }], error: null });
    await expect(createSupabaseAdjustmentRepository(client).listExerciseProfiles(["a"])).resolves.toEqual([{ slug: "a", primaryMuscles: ["chest"], equipment: ["bench"] }]);
    expect(client.rpc).toHaveBeenCalledWith("list_exercise_profiles", { p_slugs: ["a"] });
  });

  it("reads replacement exercises with their enabled media", async () => {
    const row = {
      id: "55555555-5555-4555-8555-555555555555",
      slug: "goblet-squat",
      name_pt: "Agachamento goblet",
      exercise_media: [{ media_type: "gif", url: "https://x/g.gif", thumbnail_url: null, source: "s", license: "l", priority: 30, is_enabled: true }],
    };
    const { client, query } = createQueryClient({ data: [row], error: null });
    const [exercise] = await createSupabaseAdjustmentRepository(client).findExercisesBySlugs(["goblet-squat"]);
    expect(exercise).toMatchObject({ slug: "goblet-squat", name: "Agachamento goblet", coverMedia: { url: "https://x/g.gif" } });
    expect(query.in).toHaveBeenCalledWith("slug", ["goblet-squat"]);
  });

  it("skips the queries for empty lists", async () => {
    const { client } = createQueryClient({ data: [], error: null });
    await expect(createSupabaseAdjustmentRepository(client).findExercisesBySlugs([])).resolves.toEqual([]);
    await expect(createSupabaseAdjustmentRepository(client).listExerciseProfiles([])).resolves.toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe("adjustment repository: saveAdjustments", () => {
  const CHANGE = { workoutExerciseId: WORKOUT_ID, changeType: "replaced" as const, replacementSlug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 10, reason: "Poupa o joelho" };

  it("calls the transactional function with snake_case changes", async () => {
    const { client } = createQueryClient({ data: 1, error: null });
    await createSupabaseAdjustmentRepository(client).saveAdjustments(CHECKIN_ID, [CHANGE]);
    expect(client.rpc).toHaveBeenCalledWith("save_session_adjustments", {
      p_checkin_id: CHECKIN_ID,
      p_changes: [{ workout_exercise_id: WORKOUT_ID, change_type: "replaced", replacement_slug: "goblet-squat", sets: 3, reps_min: 8, reps_max: 10, reason: "Poupa o joelho" }],
    });
  });

  it("explains a finished workout and fails on other errors", async () => {
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: { code: "WK002" } }).client).saveAdjustments(CHECKIN_ID, [])).rejects.toBeInstanceOf(UnprocessableError);
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: { code: "22023" } }).client).saveAdjustments(CHECKIN_ID, [])).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("adjustment repository: saved proposal of a check-in", () => {
  const CHANGE = { workoutExerciseId: WORKOUT_ID, changeType: "replaced" as const, replacementSlug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 10, reason: "Poupa o joelho" };
  const PROPOSAL_ROW = {
    summary: "Treino mais leve.",
    estimated_minutes: 30,
    adjustment_proposal_changes: [
      { workout_exercise_id: WORKOUT_ID, change_type: "replaced", sets: 3, reps_min: 8, reps_max: 10, reason: "Poupa o joelho", replacement: { slug: "goblet-squat" } },
      { workout_exercise_id: CHECKIN_ID, change_type: "removed", sets: null, reps_min: null, reps_max: null, reason: "Sem tempo", replacement: null },
    ],
  };

  it("reads the proposal with its changes and replacement slugs", async () => {
    const { client, query } = createQueryClient({ data: PROPOSAL_ROW, error: null });
    await expect(createSupabaseAdjustmentRepository(client).findProposal(CHECKIN_ID)).resolves.toEqual({
      summary: "Treino mais leve.",
      estimatedMinutes: 30,
      changes: [CHANGE, { workoutExerciseId: CHECKIN_ID, changeType: "removed", replacementSlug: null, sets: null, repsMin: null, repsMax: null, reason: "Sem tempo" }],
    });
    expect(client.from).toHaveBeenCalledWith("adjustment_proposals");
    expect(query.eq).toHaveBeenCalledWith("checkin_id", CHECKIN_ID);
  });

  it("returns null without a saved proposal and fails on errors or unexpected rows", async () => {
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: null }).client).findProposal(CHECKIN_ID)).resolves.toBeNull();
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: null, error: { message: "x" } }).client).findProposal(CHECKIN_ID)).rejects.toBeInstanceOf(RepositoryError);
    await expect(createSupabaseAdjustmentRepository(createQueryClient({ data: { summary: 1 }, error: null }).client).findProposal(CHECKIN_ID)).rejects.toBeInstanceOf(RepositoryError);
  });

  it("saves the proposal through the transactional function", async () => {
    const { client } = createQueryClient({ data: true, error: null });
    await createSupabaseAdjustmentRepository(client).saveProposal(CHECKIN_ID, { summary: "Treino mais leve.", estimatedMinutes: 30, changes: [CHANGE] });
    expect(client.rpc).toHaveBeenCalledWith("save_adjustment_proposal", {
      p_checkin_id: CHECKIN_ID,
      p_summary: "Treino mais leve.",
      p_estimated_minutes: 30,
      p_changes: [{ workout_exercise_id: WORKOUT_ID, change_type: "replaced", replacement_slug: "goblet-squat", sets: 3, reps_min: 8, reps_max: 10, reason: "Poupa o joelho" }],
    });
  });

  it("fails when the proposal cannot be saved", async () => {
    const { client } = createQueryClient({ data: null, error: { code: "22023" } });
    await expect(createSupabaseAdjustmentRepository(client).saveProposal(CHECKIN_ID, { summary: "x", estimatedMinutes: 30, changes: [] })).rejects.toBeInstanceOf(RepositoryError);
  });
});
