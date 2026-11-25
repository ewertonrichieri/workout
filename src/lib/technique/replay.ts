import type { PoseLandmark } from "./body-framing";
import type { TechniqueRep } from "./pose-rep-tracker";

/** One pose of the recording, relative to the start of the video (kept only in memory). */
export interface ReplayFrame {
  offsetMs: number;
  landmarks: PoseLandmark[];
}

/** Recording kept in the browser memory for the replay (step 5.4); discarded when the screen closes. */
export interface TechniqueReplay {
  video: Blob;
  /** performance.now() when the video started: converts rep times to video times. */
  startedAtMs: number;
  frames: ReplayFrame[];
}

export interface ReplayMarker {
  repNumber: number;
  startSeconds: number;
  endSeconds: number;
  /** The rep has an error or warning (drawn in red). */
  needsCorrection: boolean;
}

const MS_PER_SECOND = 1000;
/** Most efficient first; Safari only records MP4. */
export const REPLAY_MIME_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"] as const;

export function pickRecorderMimeType(isTypeSupported: (type: string) => boolean): string | undefined {
  return REPLAY_MIME_TYPES.find((type) => isTypeSupported(type));
}

/** Latest frame at or before the video time (binary search; frames are in time order). */
export function findFrameAt(frames: readonly ReplayFrame[], offsetMs: number): ReplayFrame | undefined {
  let low = 0;
  let high = frames.length - 1;
  let found: ReplayFrame | undefined;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const frame = frames[middle]!;
    if (frame.offsetMs <= offsetMs) {
      found = frame;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

export function buildReplayMarkers(reps: readonly TechniqueRep[], startedAtMs: number, repsNeedingCorrection: ReadonlySet<number>): ReplayMarker[] {
  return reps.map((rep) => ({
    repNumber: rep.repNumber,
    startSeconds: (rep.startMs - startedAtMs) / MS_PER_SECOND,
    endSeconds: (rep.endMs - startedAtMs) / MS_PER_SECOND,
    needsCorrection: repsNeedingCorrection.has(rep.repNumber),
  }));
}

export function findMarkerAt(markers: readonly ReplayMarker[], seconds: number): ReplayMarker | undefined {
  return markers.find((marker) => seconds >= marker.startSeconds && seconds <= marker.endSeconds);
}
