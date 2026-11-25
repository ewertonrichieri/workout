import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import type { PoseLandmark } from "./body-framing";
import { measureSquatFrame } from "./squat/squat-frame";
import { createSquatRepTracker, type SquatRep } from "./squat/squat-rep-tracker";

/** Reps of any supported exercise; only the squat in steps 5.2–5.4 (deadlift and row join in 5.5). */
export type TechniqueRep = SquatRep;

/** Feeds raw MediaPipe poses to the rep counter of the exercise. */
export interface PoseRepTracker {
  addPose: (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;
  readonly repCount: number;
  isIdle: (nowMs: number) => boolean;
  finish: () => TechniqueRep[];
}

const TRACKER_FACTORIES: Readonly<Record<TechniqueRuleSetId, () => PoseRepTracker>> = {
  squat: () => {
    const tracker = createSquatRepTracker();
    return {
      addPose: (landmarks, aspectRatio, timestampMs) => tracker.addFrame({ timestampMs, measures: measureSquatFrame(landmarks, aspectRatio) }),
      get repCount() {
        return tracker.repCount;
      },
      isIdle: (nowMs) => tracker.isIdle(nowMs),
      finish: () => tracker.finish(),
    };
  },
};

export function createPoseRepTracker(ruleSetId: TechniqueRuleSetId): PoseRepTracker {
  return TRACKER_FACTORIES[ruleSetId]();
}
