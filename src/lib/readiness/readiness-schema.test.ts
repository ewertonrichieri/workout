import { describe, expect, it } from "vitest";
import { readinessCheckinInputSchema } from "./readiness-schema";

const VALID = {
  workoutId: "11111111-1111-4111-8111-111111111111",
  sleepQuality: "poor",
  energyLevel: "low",
  availableMinutes: 30,
  pains: [{ bodyRegion: "knees", intensity: "severe" }],
};

describe("readiness check-in schema", () => {
  it("accepts a complete check-in and one without pains", () => {
    expect(readinessCheckinInputSchema.safeParse(VALID).success).toBe(true);
    expect(readinessCheckinInputSchema.safeParse({ ...VALID, pains: [] }).success).toBe(true);
  });

  it.each([
    ["unknown sleep", { sleepQuality: "great" }],
    ["unknown energy", { energyLevel: "none" }],
    ["too few minutes", { availableMinutes: 5 }],
    ["too many minutes", { availableMinutes: 241 }],
    ["fractional minutes", { availableMinutes: 30.5 }],
    ["unknown region", { pains: [{ bodyRegion: "toes", intensity: "mild" }] }],
    ["unknown intensity", { pains: [{ bodyRegion: "knees", intensity: "extreme" }] }],
    ["repeated region", { pains: [{ bodyRegion: "knees", intensity: "mild" }, { bodyRegion: "knees", intensity: "severe" }] }],
    ["invalid workout id", { workoutId: "abc" }],
  ])("rejects %s", (_name, patch) => {
    expect(readinessCheckinInputSchema.safeParse({ ...VALID, ...patch }).success).toBe(false);
  });
});
