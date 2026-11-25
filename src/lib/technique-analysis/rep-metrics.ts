import { z } from "zod";
import { CAMERA_VIEWS } from "@/lib/constants/technique";
import {
  ANGLE_DECIMALS,
  MAX_ANALYSIS_REPS,
  MAX_FRAMES_PER_REP,
  MAX_RATIO_MAGNITUDE,
  MAX_REP_DURATION_MS,
  RATIO_DECIMALS,
} from "@/lib/constants/technique-analysis";
import { MAX_UNSEEN_FRAME_RATIO } from "@/lib/constants/technique-rules";
import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";

const DEGREES_HALF_TURN = 180;
const DEGREES_QUARTER_TURN = 90;

const durationSchema = z.int().min(0).max(MAX_REP_DURATION_MS);
const ratioSchema = z.number().min(-MAX_RATIO_MAGNITUDE).max(MAX_RATIO_MAGNITUDE);

/** Numbers of one rep as the phone sends them: no image, no landmark, times relative to the rep start. */
export const repMetricsSchema = z.strictObject({
  repNumber: z.int().min(1).max(MAX_ANALYSIS_REPS),
  durationMs: durationSchema,
  descentMs: durationSchema,
  minKneeAngle: z.number().min(0).max(DEGREES_HALF_TURN),
  minThighAngle: z.number().min(-DEGREES_QUARTER_TURN).max(DEGREES_QUARTER_TURN),
  maxTrunkLean: z.number().min(0).max(DEGREES_HALF_TURN),
  maxKneeTravelRatio: ratioSchema,
  maxHeelRiseRatio: ratioSchema,
  frameCount: z.int().min(1).max(MAX_FRAMES_PER_REP),
  seenFrameCount: z.int().min(0).max(MAX_FRAMES_PER_REP),
}).refine((rep) => rep.seenFrameCount <= rep.frameCount && rep.descentMs <= rep.durationMs);
export type RepMetrics = z.infer<typeof repMetricsSchema>;

/** POST /api/technique-analyses body (spec 014, step 5.4). */
export const techniqueAnalysisInputSchema = z.strictObject({
  exerciseSlug: z.string().min(1).max(200),
  cameraView: z.enum(CAMERA_VIEWS),
  reps: z.array(repMetricsSchema).min(1).max(MAX_ANALYSIS_REPS)
    .refine((reps) => new Set(reps.map((rep) => rep.repNumber)).size === reps.length),
});
export type TechniqueAnalysisInput = z.infer<typeof techniqueAnalysisInputSchema>;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor || 0;
}

/** Phone side: what leaves the device for the analysis (decision D6: numbers only). */
export function toRepMetrics(rep: SquatRep): RepMetrics {
  return {
    repNumber: rep.repNumber,
    durationMs: Math.round(rep.endMs - rep.startMs),
    descentMs: Math.round(rep.descentMs),
    minKneeAngle: roundTo(rep.minKneeAngle, ANGLE_DECIMALS),
    minThighAngle: roundTo(rep.minThighAngle, ANGLE_DECIMALS),
    maxTrunkLean: roundTo(rep.maxTrunkLean, ANGLE_DECIMALS),
    maxKneeTravelRatio: roundTo(rep.maxKneeTravelRatio, RATIO_DECIMALS),
    maxHeelRiseRatio: roundTo(rep.maxHeelRiseRatio, RATIO_DECIMALS),
    frameCount: rep.frameCount,
    seenFrameCount: rep.seenFrameCount,
  };
}

/** Server side: rebuilds the rep and decides on its own whether it was evaluated (never trusts the client). */
export function fromRepMetrics(metrics: RepMetrics): SquatRep {
  const unseenRatio = (metrics.frameCount - metrics.seenFrameCount) / metrics.frameCount;
  return {
    ...metrics,
    startMs: 0,
    bottomMs: metrics.descentMs,
    endMs: metrics.durationMs,
    isEvaluated: unseenRatio <= MAX_UNSEEN_FRAME_RATIO,
  };
}
