import { z } from "zod";
import { CAMERA_VIEWS } from "@/lib/constants/technique";
import { MAX_ANALYSIS_REPS, MAX_FRAMES_PER_REP, MAX_REP_DURATION_MS, METRIC_DECIMALS } from "@/lib/constants/technique-analysis";
import { MAX_UNSEEN_FRAME_RATIO } from "@/lib/constants/technique-rules";
import type { MovementPattern } from "@/lib/technique/patterns/pattern-types";
import type { TechniqueRep } from "@/lib/technique/rep-types";

const durationSchema = z.int().min(0).max(MAX_REP_DURATION_MS);
const MAX_METRIC_NAME_LENGTH = 40;
const MAX_METRICS_PER_REP = 12;

/** Numbers of one rep as the phone sends them: no image, no landmark, times relative to the rep start. */
export const repMetricsSchema = z.strictObject({
  repNumber: z.int().min(1).max(MAX_ANALYSIS_REPS),
  durationMs: durationSchema,
  descentMs: durationSchema,
  frameCount: z.int().min(1).max(MAX_FRAMES_PER_REP),
  seenFrameCount: z.int().min(0).max(MAX_FRAMES_PER_REP),
  /** Named metrics of the movement pattern; the exact names and ranges are checked against the pattern. */
  metrics: z.record(z.string().max(MAX_METRIC_NAME_LENGTH), z.number()).refine((metrics) => Object.keys(metrics).length <= MAX_METRICS_PER_REP),
}).refine((rep) => rep.seenFrameCount <= rep.frameCount && rep.descentMs <= rep.durationMs);
export type RepMetrics = z.infer<typeof repMetricsSchema>;

/** POST /api/technique-analyses body (spec 014, steps 5.4 and 5.7). */
export const techniqueAnalysisInputSchema = z.strictObject({
  exerciseSlug: z.string().min(1).max(200),
  cameraView: z.enum(CAMERA_VIEWS),
  reps: z.array(repMetricsSchema).min(1).max(MAX_ANALYSIS_REPS)
    .refine((reps) => new Set(reps.map((rep) => rep.repNumber)).size === reps.length),
});
export type TechniqueAnalysisInput = z.infer<typeof techniqueAnalysisInputSchema>;

/** Every rep carries exactly the pattern's metrics, each within its valid range. */
export function hasPatternMetrics(pattern: MovementPattern, reps: readonly RepMetrics[]): boolean {
  return reps.every((rep) => Object.keys(rep.metrics).length === pattern.metrics.length && pattern.metrics.every((spec) => {
    const value = rep.metrics[spec.name];
    return value !== undefined && value >= spec.bounds[0] && value <= spec.bounds[1];
  }));
}

function roundMetric(value: number): number {
  const factor = 10 ** METRIC_DECIMALS;
  return Math.round(value * factor) / factor || 0;
}

/** Phone side: what leaves the device for the analysis (decision D6: numbers only). */
export function toRepMetrics(rep: TechniqueRep): RepMetrics {
  return {
    repNumber: rep.repNumber,
    durationMs: Math.round(rep.endMs - rep.startMs),
    descentMs: Math.round(rep.descentMs),
    frameCount: rep.frameCount,
    seenFrameCount: rep.seenFrameCount,
    metrics: Object.fromEntries(Object.entries(rep.metrics).map(([name, value]) => [name, roundMetric(value)])),
  };
}

/** Server side: rebuilds the rep and decides on its own whether it was evaluated (never trusts the client). */
export function fromRepMetrics(metrics: RepMetrics): TechniqueRep {
  const unseenRatio = (metrics.frameCount - metrics.seenFrameCount) / metrics.frameCount;
  return {
    repNumber: metrics.repNumber,
    startMs: 0,
    bottomMs: metrics.descentMs,
    endMs: metrics.durationMs,
    descentMs: metrics.descentMs,
    frameCount: metrics.frameCount,
    seenFrameCount: metrics.seenFrameCount,
    isEvaluated: unseenRatio <= MAX_UNSEEN_FRAME_RATIO,
    metrics: metrics.metrics,
  };
}
