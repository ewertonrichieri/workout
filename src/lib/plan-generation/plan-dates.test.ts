import { describe, expect, it } from "vitest";
import { computeGeneratedPlanDates } from "./plan-dates";

describe("computeGeneratedPlanDates", () => {
  it("starts today in São Paulo and lasts 42 calendar days", () => {
    // 01:30 UTC on Dec 1st is still Nov 30th in São Paulo.
    expect(computeGeneratedPlanDates(new Date("2026-12-01T01:30:00Z"))).toEqual({ startsOn: "2026-11-30", validUntil: "2027-01-10" });
  });
});
