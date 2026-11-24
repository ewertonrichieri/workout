import { describe, expect, it } from "vitest";
import { isRenewalDue } from "./plan-renewal";

const validity = (remainingDays: number, isExpired = false) => ({ totalDays: 41, elapsedDays: 41 - remainingDays, remainingDays, progress: 0, isExpired });

describe("isRenewalDue", () => {
  it.each([
    [8, false],
    [7, true],
    [0, true],
  ])("with %i days left → %s", (remainingDays, expected) => {
    expect(isRenewalDue(validity(remainingDays))).toBe(expected);
  });

  it("is due once the plan expired", () => {
    expect(isRenewalDue(validity(0, true))).toBe(true);
  });
});
