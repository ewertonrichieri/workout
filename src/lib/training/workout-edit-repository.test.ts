import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { NotFoundError, RepositoryError, UnprocessableError } from "@/lib/errors/app-errors";
import { createSupabaseWorkoutEditRepository } from "./workout-edit-repository";

const WORKOUT_ID = "11111111-1111-4111-8111-111111111111";
const ITEMS = [{ id: null, exerciseSlug: "goblet-squat", category: "Principal", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, notes: "Devagar" }];

function createClient(error: unknown) {
  return { rpc: vi.fn(async () => ({ data: null, error })) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("workout edit repository", () => {
  it("calls the transactional function with snake_case items", async () => {
    const client = createClient(null);
    await createSupabaseWorkoutEditRepository(client).saveWorkoutExercises(WORKOUT_ID, ITEMS);
    expect(client.rpc).toHaveBeenCalledWith("save_workout_exercises", {
      p_workout_id: WORKOUT_ID,
      p_exercises: [{ id: null, exercise_slug: "goblet-squat", category: "Principal", sets: 3, reps_min: 10, reps_max: 12, rest_seconds: 60, notes: "Devagar" }],
    });
  });

  it("maps a missing workout, a catalog mismatch and other failures", async () => {
    const repository = (error: unknown) => createSupabaseWorkoutEditRepository(createClient(error));
    await expect(repository({ code: "WK002" }).saveWorkoutExercises(WORKOUT_ID, ITEMS)).rejects.toBeInstanceOf(NotFoundError);
    await expect(repository({ code: "22023" }).saveWorkoutExercises(WORKOUT_ID, ITEMS)).rejects.toBeInstanceOf(UnprocessableError);
    await expect(repository({ code: "XX000" }).saveWorkoutExercises(WORKOUT_ID, ITEMS)).rejects.toBeInstanceOf(RepositoryError);
  });
});
