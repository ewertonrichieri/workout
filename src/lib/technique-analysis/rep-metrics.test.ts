import { describe, expect, it } from "vitest";
import { hingePattern } from "@/lib/technique/patterns/hinge-pattern";
import { squatPattern } from "@/lib/technique/patterns/squat-pattern";
import { fromRepMetrics, hasPatternMetrics, techniqueAnalysisInputSchema, toRepMetrics } from "./rep-metrics";
import { buildRepMetrics, buildSquatRep } from "./test-fixtures";

describe("rep metrics sent to the server", () => {
  it("keeps only numbers, relative times and values rounded to 0.001", () => {
    expect(toRepMetrics(buildSquatRep(2))).toEqual(buildRepMetrics(2));
  });

  it("rebuilds the rep on the server and decides itself whether it was evaluated", () => {
    expect(fromRepMetrics(buildRepMetrics(1))).toMatchObject({ repNumber: 1, startMs: 0, bottomMs: 1500, endMs: 3000, isEvaluated: true });
    expect(fromRepMetrics(buildRepMetrics(1, { frameCount: 100, seenFrameCount: 70 })).isEvaluated).toBe(false);
  });
});

describe("hasPatternMetrics (D13: exactly the metrics of the movement pattern)", () => {
  it("accepts the pattern's metrics within range", () => {
    expect(hasPatternMetrics(squatPattern, [buildRepMetrics(1)])).toBe(true);
    expect(hasPatternMetrics(hingePattern, [{ ...buildRepMetrics(1), metrics: { minHipAngle: 75, minKneeAngle: 150, maxTrunkLean: 60 } }])).toBe(true);
  });

  it("rejects metrics of another pattern, missing or extra metrics and values out of range", () => {
    expect(hasPatternMetrics(hingePattern, [buildRepMetrics(1)])).toBe(false);
    expect(hasPatternMetrics(squatPattern, [{ ...buildRepMetrics(1), metrics: { minKneeAngle: 80 } }])).toBe(false);
    expect(hasPatternMetrics(squatPattern, [buildRepMetrics(1, {}, { extra: 1 })])).toBe(false);
    expect(hasPatternMetrics(squatPattern, [buildRepMetrics(1, {}, { minKneeAngle: 200 })])).toBe(false);
  });
});

describe("techniqueAnalysisInputSchema", () => {
  const valid = { exerciseSlug: "barbell-back-squat", cameraView: "side", reps: [buildRepMetrics(1), buildRepMetrics(2)] };

  it("accepts the metrics of a set", () => {
    expect(techniqueAnalysisInputSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["no reps", { ...valid, reps: [] }],
    ["too many reps", { ...valid, reps: Array.from({ length: 41 }, (_, index) => buildRepMetrics(index + 1)) }],
    ["repeated rep numbers", { ...valid, reps: [buildRepMetrics(1), buildRepMetrics(1)] }],
    ["more seen frames than frames", { ...valid, reps: [buildRepMetrics(1, { seenFrameCount: 91 })] }],
    ["descent longer than the rep", { ...valid, reps: [buildRepMetrics(1, { descentMs: 4000 })] }],
    ["unknown camera view", { ...valid, cameraView: "top" }],
    ["extra fields such as landmarks", { ...valid, landmarks: [[0.5, 0.5]] }],
    ["text instead of a metric value", { ...valid, reps: [{ ...buildRepMetrics(1), metrics: { minKneeAngle: "80" } }] }],
  ])("rejects %s", (_label, input) => {
    expect(techniqueAnalysisInputSchema.safeParse(input).success).toBe(false);
  });
});
