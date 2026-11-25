import type { MovementPattern } from "./patterns/pattern-types";
import type { PoseLandmark } from "./body-framing";
import { createRepTracker } from "./rep-tracker";
import type { TechniqueRep } from "./rep-types";

export type { TechniqueRep };

/** Feeds raw MediaPipe poses to the rep counter of the movement pattern. */
export interface PoseRepTracker {
  addPose: (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;
  readonly repCount: number;
  isIdle: (nowMs: number) => boolean;
  finish: () => TechniqueRep[];
}

export function createPoseRepTracker(pattern: MovementPattern): PoseRepTracker {
  const tracker = createRepTracker(pattern);
  return {
    addPose: (landmarks, aspectRatio, timestampMs) => tracker.addFrame({ timestampMs, measures: pattern.measureFrame(landmarks, aspectRatio) }),
    get repCount() {
      return tracker.repCount;
    },
    isIdle: (nowMs) => tracker.isIdle(nowMs),
    finish: () => tracker.finish(),
  };
}
