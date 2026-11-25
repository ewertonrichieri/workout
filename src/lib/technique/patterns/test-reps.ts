import type { TechniqueRep } from "@/lib/technique/rep-types";

const SQUAT_METRICS = { minKneeAngle: 80, minThighAngle: -5, maxTrunkLean: 30, maxKneeTravelRatio: -0.1, maxHeelRiseRatio: 0 };

/** Fictional rep for tests (never real user data); defaults to a good squat rep. */
export function buildRep(repNumber: number, overrides: Partial<Omit<TechniqueRep, "metrics">> = {}, metrics: Record<string, number> = {}): TechniqueRep {
  return {
    repNumber, startMs: 0, bottomMs: 1500, endMs: 3000, descentMs: 1500, frameCount: 30, seenFrameCount: 30, isEvaluated: true,
    ...overrides,
    metrics: { ...SQUAT_METRICS, ...metrics },
  };
}

export function buildHingeRep(repNumber: number, metrics: Partial<Record<"minHipAngle" | "minKneeAngle" | "maxTrunkLean", number>> = {}, overrides: Partial<Omit<TechniqueRep, "metrics">> = {}): TechniqueRep {
  return { ...buildRep(repNumber, overrides), metrics: { minHipAngle: 75, minKneeAngle: 150, maxTrunkLean: 60, ...metrics } };
}

export function buildRowRep(repNumber: number, metrics: Partial<Record<"maxWristHeight" | "trunkRise" | "restTrunkLean" | "minElbowAngle", number>> = {}): TechniqueRep {
  return { ...buildRep(repNumber), metrics: { maxWristHeight: 0.3, trunkRise: 2, restTrunkLean: 50, minElbowAngle: 95, ...metrics } };
}
