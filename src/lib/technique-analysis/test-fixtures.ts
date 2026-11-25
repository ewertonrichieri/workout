import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";
import type { RepMetrics } from "./rep-metrics";

/** Fictional rep numbers (never real user data). */
export function buildRepMetrics(repNumber: number, overrides: Partial<RepMetrics> = {}): RepMetrics {
  return {
    repNumber, durationMs: 3000, descentMs: 1500, minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30,
    maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0, frameCount: 90, seenFrameCount: 90, ...overrides,
  };
}

export function buildSquatRep(repNumber: number, overrides: Partial<SquatRep> = {}): SquatRep {
  return {
    repNumber, startMs: 10_000, bottomMs: 11_500, endMs: 13_000, descentMs: 1500, minKneeAngle: 80.04, minThighAngle: -5.04, maxTrunkLean: 30.04,
    maxKneeTravelRatio: -0.1004, maxHeelRiseRatio: 0.0004, frameCount: 90, seenFrameCount: 90, isEvaluated: true, ...overrides,
  };
}
