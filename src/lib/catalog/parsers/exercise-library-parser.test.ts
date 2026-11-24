import { describe, expect, it } from "vitest";
import { parseExerciseLibrary } from "./exercise-library-parser";

function buildRawExercise(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "aB3dE5f",
    name: "fake sit-up",
    gif: "aB3dE5f.gif",
    targetMuscles: ["abs"],
    secondaryMuscles: ["hip flexors"],
    bodyParts: ["waist"],
    equipment: ["body weight"],
    instructions: ["Step:1 Lie down.", "Step:2 Sit up."],
    ...overrides,
  };
}

describe("parseExerciseLibrary", () => {
  it("maps fields to the common shape with the repository gif path", () => {
    const [exercise] = parseExerciseLibrary([buildRawExercise()]).exercises;
    expect(exercise).toEqual({
      source: "exercise-library",
      externalId: "aB3dE5f",
      nameEn: "fake sit-up",
      aliases: [],
      primaryMuscles: ["abs"],
      secondaryMuscles: ["hip flexors"],
      equipment: ["body weight"],
      instructionSteps: ["Lie down.", "Sit up."],
      media: [{ location: "repository_path", mediaType: "gif", path: "gifs/aB3dE5f.gif" }],
    });
  });

  it("keeps steps that have no numbered prefix", () => {
    const [exercise] = parseExerciseLibrary([buildRawExercise({ instructions: ["Just do it."] })]).exercises;
    expect(exercise.instructionSteps).toEqual(["Just do it."]);
  });

  it("repairs broken degree signs in names", () => {
    const [exercise] = parseExerciseLibrary([buildRawExercise({ name: "sled 45Ð²Â° leg press" })]).exercises;
    expect(exercise.nameEn).toBe("sled 45° leg press");
  });

  it("rejects gif names that try to leave the gifs folder", () => {
    expect(parseExerciseLibrary([buildRawExercise({ gif: "../secret.gif" })]).rejected).toHaveLength(1);
  });
});
