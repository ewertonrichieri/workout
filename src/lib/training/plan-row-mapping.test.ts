import { describe, expect, it } from "vitest";
import { ACTIVE_PLAN_COLUMNS, mapActivePlanRow } from "./plan-row-mapping";

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const WORKOUT_A = "22222222-2222-4222-8222-222222222222";
const WORKOUT_B = "33333333-3333-4333-8333-333333333333";
const EXERCISE_ID = "44444444-4444-4444-8444-444444444444";

function buildWorkoutExercise(id: string, position: number, overrides: Record<string, unknown> = {}) {
  return {
    id, position, category: "Neuromuscular", sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 60, notes: null, track_progression: true,
    exercises: {
      id: EXERCISE_ID, slug: "fake-press", name_pt: "Supino falso",
      exercise_media: [
        { media_type: "gif", url: "https://cdn.example.test/a.gif", thumbnail_url: null, source: "exercise-library", license: "unverified", priority: 30, is_enabled: true },
        { media_type: "video", url: "https://cdn.example.test/a.mp4", thumbnail_url: null, source: "workout-free-videos", license: "CC0-1.0", priority: 10, is_enabled: true },
      ],
    },
    ...overrides,
  };
}

const ROW = {
  id: PLAN_ID, goal: "hypertrophy", origin: "manual", starts_on: "2026-11-01", valid_until: "2026-12-13",
  workouts: [
    { id: WORKOUT_B, label: "B", position: 2, workout_exercises: [] },
    {
      id: WORKOUT_A, label: "A", position: 1,
      workout_exercises: [
        buildWorkoutExercise("55555555-5555-4555-8555-555555555552", 2),
        buildWorkoutExercise("55555555-5555-4555-8555-555555555551", 1, { category: null, reps_max: 8, rest_seconds: null }),
      ],
    },
  ],
};

describe("mapActivePlanRow", () => {
  it("maps the plan with workouts and exercises in position order", () => {
    const plan = mapActivePlanRow(ROW);
    expect(plan).toMatchObject({ id: PLAN_ID, goal: "hypertrophy", origin: "manual", startsOn: "2026-11-01", validUntil: "2026-12-13" });
    expect(plan.workouts.map((workout) => workout.label)).toEqual(["A", "B"]);
    expect(plan.workouts[0].exercises.map((exercise) => exercise.position)).toEqual([1, 2]);
  });

  it("maps prescription fields and the best enabled media as cover", () => {
    const [first] = mapActivePlanRow(ROW).workouts[0].exercises;
    expect(first).toMatchObject({
      category: null, sets: 3, repsMin: 8, repsMax: 8, restSeconds: null, notes: null, trackProgression: true,
      exercise: { id: EXERCISE_ID, slug: "fake-press", name: "Supino falso" },
    });
    expect(first.exercise.coverMedia?.url).toBe("https://cdn.example.test/a.mp4");
  });

  it("rejects rows outside the expected shape", () => {
    expect(() => mapActivePlanRow({ ...ROW, goal: "unknown" })).toThrow();
  });

  it("selects every field the mapping reads, as a well-formed embed list", () => {
    expect(ACTIVE_PLAN_COLUMNS).toBe(
      "id, goal, origin, starts_on, valid_until, workouts(id, label, position, workout_exercises(" +
        "id, position, category, sets, reps_min, reps_max, rest_seconds, notes, track_progression, " +
        "exercises(id, slug, name_pt, exercise_media(media_type, url, thumbnail_url, source, license, priority, is_enabled))))",
    );
  });
});
