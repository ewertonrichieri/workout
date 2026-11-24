import { describe, expect, it } from "vitest";
import { mapExerciseRow } from "./exercise-row-mapping";

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "6f1c2a52-6d0e-4f1a-9a0a-1b2c3d4e5f60",
    slug: "fake-press",
    name_pt: "Supino falso",
    name_en: "Fake Press",
    difficulty: "beginner",
    instructions_pt: null,
    exercise_muscles: [
      { muscle_role: "secondary", muscles: { slug: "triceps", name_pt: "Tríceps" } },
      { muscle_role: "primary", muscles: { slug: "chest", name_pt: "Peitoral" } },
    ],
    exercise_equipment: [{ equipment: { slug: "dumbbell", name_pt: "Halteres" } }],
    exercise_media: [
      { media_type: "gif", url: "https://cdn.example.test/a.gif", thumbnail_url: null, source: "exercise-library", license: "unverified", priority: 30, is_enabled: true },
      { media_type: "video", url: "https://cdn.example.test/a.mp4", thumbnail_url: null, source: "workout-free-videos", license: "CC0-1.0", priority: 10, is_enabled: true },
      { media_type: "video", url: "https://cdn.example.test/off.mp4", thumbnail_url: null, source: "free-exercise-db-with-videos", license: "unverified", priority: 5, is_enabled: false },
    ],
    ...overrides,
  };
}

describe("mapExerciseRow", () => {
  it("maps names, muscles by role and equipment", () => {
    expect(mapExerciseRow(buildRow())).toMatchObject({
      id: "6f1c2a52-6d0e-4f1a-9a0a-1b2c3d4e5f60",
      slug: "fake-press",
      name: "Supino falso",
      nameEn: "Fake Press",
      difficulty: "beginner",
      instructions: null,
      primaryMuscles: [{ slug: "chest", name: "Peitoral" }],
      secondaryMuscles: [{ slug: "triceps", name: "Tríceps" }],
      equipment: [{ slug: "dumbbell", name: "Halteres" }],
    });
  });

  it("keeps only enabled media ordered by priority and uses the first as cover", () => {
    const exercise = mapExerciseRow(buildRow());
    expect(exercise.media.map((media) => media.url)).toEqual(["https://cdn.example.test/a.mp4", "https://cdn.example.test/a.gif"]);
    expect(exercise.coverMedia?.url).toBe("https://cdn.example.test/a.mp4");
  });

  it("has no cover when no media is enabled", () => {
    expect(mapExerciseRow(buildRow({ exercise_media: [] })).coverMedia).toBeNull();
  });

  it("rejects rows outside the expected shape", () => {
    expect(() => mapExerciseRow(buildRow({ slug: 42 }))).toThrow();
  });
});
