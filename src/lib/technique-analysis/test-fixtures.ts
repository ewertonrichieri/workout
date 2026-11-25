import type { TechniqueRep } from "@/lib/technique/rep-types";
import type { RepMetrics } from "./rep-metrics";

const SQUAT_METRICS = { minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30, maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0 };

/** Fictional rep numbers (never real user data); squat metrics unless others are given. */
export function buildRepMetrics(repNumber: number, overrides: Partial<Omit<RepMetrics, "metrics">> = {}, metrics: Record<string, number> = {}): RepMetrics {
  return { repNumber, durationMs: 3000, descentMs: 1500, frameCount: 90, seenFrameCount: 90, ...overrides, metrics: { ...SQUAT_METRICS, ...metrics } };
}

/** Phone-side rep with unrounded numbers (rounding to 0.001 is part of what is tested). */
export function buildSquatRep(repNumber: number, overrides: Partial<Omit<TechniqueRep, "metrics">> = {}, metrics: Record<string, number> = {}): TechniqueRep {
  return {
    repNumber, startMs: 10_000, bottomMs: 11_500, endMs: 13_000, descentMs: 1500, frameCount: 90, seenFrameCount: 90, isEvaluated: true, ...overrides,
    metrics: { minKneeAngle: 80.0004, minThighAngle: -5.0003, maxTrunkLean: 30.0001, maxKneeTravelRatio: -0.10004, maxHeelRiseRatio: 0.0004, ...metrics },
  };
}
