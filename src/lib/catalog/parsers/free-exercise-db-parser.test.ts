import { describe, expect, it } from "vitest";
import { parseFreeExerciseDb } from "./free-exercise-db-parser";

const MEDIA_HOST = "https://media.example.test";

function buildRawExercise(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "0001",
    name: "Fake Bench Press",
    aliases: ["flat press"],
    bodyPart: "chest",
    target: "pectorals",
    secondaryMuscles: ["triceps"],
    equipment: "barbell",
    difficulty: "beginner",
    instructions: "Single paragraph.",
    steps: ["Step one.", "Step two."],
    videos: { male: `${MEDIA_HOST}/male/a.mp4`, female: `${MEDIA_HOST}/female/a.mp4` },
    thumbnails: { male: `${MEDIA_HOST}/male/a.jpg`, female: `${MEDIA_HOST}/female/a.jpg` },
    ...overrides,
  };
}

describe("parseFreeExerciseDb", () => {
  it("maps fields to the common shape", () => {
    const [exercise] = parseFreeExerciseDb([buildRawExercise()]).exercises;
    expect(exercise).toMatchObject({
      source: "free-exercise-db-with-videos",
      externalId: "0001",
      nameEn: "Fake Bench Press",
      aliases: ["flat press"],
      primaryMuscles: ["pectorals"],
      secondaryMuscles: ["triceps"],
      equipment: ["barbell"],
      difficulty: "beginner",
      instructionSteps: ["Step one.", "Step two."],
    });
  });

  it("keeps one video per available variant with its thumbnail", () => {
    const [exercise] = parseFreeExerciseDb([buildRawExercise()]).exercises;
    expect(exercise.media).toEqual([
      { location: "url", mediaType: "video", variant: "male", url: `${MEDIA_HOST}/male/a.mp4`, thumbnailUrl: `${MEDIA_HOST}/male/a.jpg` },
      { location: "url", mediaType: "video", variant: "female", url: `${MEDIA_HOST}/female/a.mp4`, thumbnailUrl: `${MEDIA_HOST}/female/a.jpg` },
    ]);
  });

  it("accepts exercises with a single video variant", () => {
    const raw = buildRawExercise({ videos: { female: `${MEDIA_HOST}/female/a.mp4` }, thumbnails: {} });
    const [exercise] = parseFreeExerciseDb([raw]).exercises;
    expect(exercise.media).toEqual([
      { location: "url", mediaType: "video", variant: "female", url: `${MEDIA_HOST}/female/a.mp4` },
    ]);
  });

  it("falls back to the instructions paragraph when there are no steps", () => {
    const [exercise] = parseFreeExerciseDb([buildRawExercise({ steps: [] })]).exercises;
    expect(exercise.instructionSteps).toEqual(["Single paragraph."]);
  });

  it("rejects exercises without any video", () => {
    const result = parseFreeExerciseDb([buildRawExercise({ videos: {} })]);
    expect(result.exercises).toEqual([]);
    expect(result.rejected).toHaveLength(1);
  });

  it("rejects an unknown difficulty", () => {
    expect(parseFreeExerciseDb([buildRawExercise({ difficulty: "expert" })]).rejected).toHaveLength(1);
  });
});
