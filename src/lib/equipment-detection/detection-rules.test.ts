import { describe, expect, it } from "vitest";
import { sanitizeDetection } from "./detection-rules";

const VOCABULARY = [
  { slug: "dumbbell", name: "Halteres" },
  { slug: "bench", name: "Banco" },
  { slug: "cable", name: "Polia" },
  { slug: "bodyweight", name: "Peso corporal" },
];

describe("sanitizeDetection", () => {
  it("keeps known equipment with its Portuguese name, best confidence first and then by name", () => {
    const output = { equipment: [
      { slug: "cable", confidence: "low" as const, photoNumbers: [2] },
      { slug: "dumbbell", confidence: "high" as const, photoNumbers: [1] },
      { slug: "bench", confidence: "high" as const, photoNumbers: [1, 2] },
    ] };
    expect(sanitizeDetection(output, VOCABULARY, 2)).toEqual({
      equipment: [
        { slug: "bench", name: "Banco", confidence: "high", photoNumbers: [1, 2] },
        { slug: "dumbbell", name: "Halteres", confidence: "high", photoNumbers: [1] },
        { slug: "cable", name: "Polia", confidence: "low", photoNumbers: [2] },
      ],
      issues: [],
    });
  });

  it("drops slugs outside the vocabulary (a false positive is worse) and reports them without content", () => {
    const output = { equipment: [{ slug: "treadmill", confidence: "high" as const, photoNumbers: [1] }, { slug: "bench", confidence: "medium" as const, photoNumbers: [1] }] };
    const result = sanitizeDetection(output, VOCABULARY, 1);
    expect(result.equipment.map((item) => item.slug)).toEqual(["bench"]);
    expect(result.issues).toEqual(["unknown_slug"]);
  });

  it("drops bodyweight, which is always available", () => {
    const output = { equipment: [{ slug: "bodyweight", confidence: "high" as const, photoNumbers: [1] }] };
    expect(sanitizeDetection(output, VOCABULARY, 1)).toEqual({ equipment: [], issues: [] });
  });

  it("merges repeated slugs, keeping the highest confidence and every photo", () => {
    const output = { equipment: [
      { slug: "dumbbell", confidence: "low" as const, photoNumbers: [3] },
      { slug: "dumbbell", confidence: "medium" as const, photoNumbers: [1, 3] },
    ] };
    expect(sanitizeDetection(output, VOCABULARY, 3).equipment).toEqual([{ slug: "dumbbell", name: "Halteres", confidence: "medium", photoNumbers: [1, 3] }]);
  });

  it("ignores photo numbers that were not sent and drops items left without a photo", () => {
    const output = { equipment: [
      { slug: "dumbbell", confidence: "high" as const, photoNumbers: [0, 2, 9] },
      { slug: "bench", confidence: "high" as const, photoNumbers: [4] },
    ] };
    const result = sanitizeDetection(output, VOCABULARY, 2);
    expect(result.equipment).toEqual([{ slug: "dumbbell", name: "Halteres", confidence: "high", photoNumbers: [2] }]);
    expect(result.issues).toEqual(["invalid_photo_number", "no_valid_photo"]);
  });

  it("accepts an empty answer (photos without gym equipment)", () => {
    expect(sanitizeDetection({ equipment: [] }, VOCABULARY, 1)).toEqual({ equipment: [], issues: [] });
  });
});
