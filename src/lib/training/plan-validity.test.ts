import { describe, expect, it } from "vitest";
import { computePlanValidity, toDateInTimeZone } from "./plan-validity";

describe("computePlanValidity", () => {
  it("reports elapsed and remaining days with progress", () => {
    expect(computePlanValidity({ startsOn: "2026-11-01", validUntil: "2026-12-13", today: "2026-11-22" })).toEqual({
      totalDays: 42,
      elapsedDays: 21,
      remainingDays: 21,
      progress: 0.5,
      isExpired: false,
    });
  });

  it("clamps before the start and after the end", () => {
    expect(computePlanValidity({ startsOn: "2026-11-01", validUntil: "2026-12-13", today: "2026-10-20" })).toMatchObject({ elapsedDays: 0, progress: 0, isExpired: false });
    expect(computePlanValidity({ startsOn: "2026-11-01", validUntil: "2026-12-13", today: "2026-12-20" })).toMatchObject({ remainingDays: 0, progress: 1, isExpired: true });
  });

  it("is not expired on the last valid day", () => {
    expect(computePlanValidity({ startsOn: "2026-11-01", validUntil: "2026-12-13", today: "2026-12-13" })).toMatchObject({ remainingDays: 0, isExpired: false });
  });
});

describe("toDateInTimeZone", () => {
  it("uses the calendar date of the given time zone", () => {
    expect(toDateInTimeZone(new Date("2026-11-24T02:30:00Z"), "America/Sao_Paulo")).toBe("2026-11-23");
  });
});
