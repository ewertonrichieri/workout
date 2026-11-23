import { describe, expect, it } from "vitest";
import { parseWorkoutFreeVideos } from "./workout-free-videos-parser";

function buildRawExercise(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "c01",
    slug: "fake-dumbbell-press",
    name: "Fake Dumbbell Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
    equipment: ["dumbbell", "bench"],
    level: "intermediate",
    cues: ["Cue one", "Cue two"],
    video: { path: "media/video/fake-dumbbell-press.mp4", bytes: 1000 },
    ...overrides,
  };
}

describe("parseWorkoutFreeVideos", () => {
  it("maps fields to the common shape with the repository video path", () => {
    const [exercise] = parseWorkoutFreeVideos([buildRawExercise()]).exercises;
    expect(exercise).toEqual({
      source: "workout-free-videos",
      externalId: "c01",
      nameEn: "Fake Dumbbell Press",
      aliases: [],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps", "shoulders"],
      equipment: ["dumbbell", "bench"],
      difficulty: "intermediate",
      instructionSteps: ["Cue one", "Cue two"],
      media: [{ location: "repository_path", mediaType: "video", path: "media/video/fake-dumbbell-press.mp4" }],
    });
  });

  it("rejects exercises without a video path", () => {
    expect(parseWorkoutFreeVideos([buildRawExercise({ video: {} })]).rejected).toHaveLength(1);
  });
});
