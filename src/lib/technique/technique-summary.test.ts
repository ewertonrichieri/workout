import { describe, expect, it } from "vitest";
import { squatPattern } from "./patterns/squat-pattern";
import { buildRep } from "./patterns/test-reps";
import { buildTechniqueSummary } from "./technique-summary";

describe("buildTechniqueSummary", () => {
  it("counts reps and evaluated reps", () => {
    const summary = buildTechniqueSummary(squatPattern, [buildRep(1), buildRep(2, { isEvaluated: false }), buildRep(3)], true);
    expect(summary).toMatchObject({ repCount: 3, evaluatedRepCount: 2, needsRerecord: false });
  });

  it("asks to record again when more than half of the reps were not evaluated", () => {
    expect(buildTechniqueSummary(squatPattern, [buildRep(1), buildRep(2, { isEvaluated: false }), buildRep(3, { isEvaluated: false })], true).needsRerecord).toBe(true);
    expect(buildTechniqueSummary(squatPattern, [buildRep(1), buildRep(2, { isEvaluated: false })], true).needsRerecord).toBe(false);
    expect(buildTechniqueSummary(squatPattern, [], true)).toMatchObject({ repCount: 0, needsRerecord: true });
  });

  it("uses the first evaluated rep as the reference of the relative rules", () => {
    const reps = [buildRep(1, { isEvaluated: false }, { maxTrunkLean: 10 }), buildRep(2, {}, { maxTrunkLean: 30 }), buildRep(3, {}, { maxTrunkLean: 45 })];
    const summary = buildTechniqueSummary(squatPattern, reps, true);
    expect(summary.reps.map((item) => item.issues)).toEqual([[], [], [{ issue: "trunk_lean_fatigue", severity: "error" }]]);
    expect(summary.reference?.repNumber).toBe(2);
  });
});
