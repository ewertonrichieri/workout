import { describe, expect, it } from "vitest";
import { buildAvailableMinutesOptions, hasSeverePain, needsAdjustment, pickDefaultAvailableMinutes } from "./readiness-rules";
import type { ReadinessCheckinInput } from "./readiness-schema";

const GOOD_DAY: ReadinessCheckinInput = {
  workoutId: "11111111-1111-4111-8111-111111111111",
  sleepQuality: "good",
  energyLevel: "normal",
  availableMinutes: 60,
  pains: [],
};

describe("needsAdjustment", () => {
  it("keeps the workout on a good day with enough time", () => {
    expect(needsAdjustment(GOOD_DAY, 60)).toBe(false);
    expect(needsAdjustment({ ...GOOD_DAY, sleepQuality: "ok", energyLevel: "high", availableMinutes: 90 }, 60)).toBe(false);
  });

  it("asks for an adjustment after poor sleep, with low energy or with any pain", () => {
    expect(needsAdjustment({ ...GOOD_DAY, sleepQuality: "poor" }, 60)).toBe(true);
    expect(needsAdjustment({ ...GOOD_DAY, energyLevel: "low" }, 60)).toBe(true);
    expect(needsAdjustment({ ...GOOD_DAY, pains: [{ bodyRegion: "knees", intensity: "mild" }] }, 60)).toBe(true);
  });

  it("asks for an adjustment when there is less time than the assessment", () => {
    expect(needsAdjustment({ ...GOOD_DAY, availableMinutes: 45 }, 60)).toBe(true);
  });

  it("ignores the time rule without an assessment", () => {
    expect(needsAdjustment({ ...GOOD_DAY, availableMinutes: 20 }, null)).toBe(false);
  });
});

describe("hasSeverePain", () => {
  it("is true only with a severe pain", () => {
    expect(hasSeverePain([])).toBe(false);
    expect(hasSeverePain([{ bodyRegion: "neck", intensity: "moderate" }])).toBe(false);
    expect(hasSeverePain([{ bodyRegion: "neck", intensity: "mild" }, { bodyRegion: "knees", intensity: "severe" }])).toBe(true);
  });
});

describe("available minutes", () => {
  it("defaults to the assessment time, or the app default without one", () => {
    expect(pickDefaultAvailableMinutes(50)).toBe(50);
    expect(pickDefaultAvailableMinutes(null)).toBe(60);
  });

  it("offers the quick options plus the assessment time, sorted and without repeats", () => {
    expect(buildAvailableMinutesOptions(60)).toEqual([20, 30, 45, 60, 90]);
    expect(buildAvailableMinutesOptions(50)).toEqual([20, 30, 45, 50, 60, 90]);
    expect(buildAvailableMinutesOptions(null)).toEqual([20, 30, 45, 60, 90]);
  });
});
