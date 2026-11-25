import { POSE_MAX_PEOPLE, POSE_MODEL_PATH, POSE_WASM_PATH } from "@/lib/constants/technique";
import type { PoseLandmark } from "@/lib/technique/body-framing";

/** What the screen needs from MediaPipe: one person's landmarks per video frame. */
export interface PoseDetector {
  detect: (video: HTMLVideoElement, timestampMs: number) => PoseLandmark[];
  close: () => void;
}

type Delegate = "GPU" | "CPU";
const DELEGATES: readonly Delegate[] = ["GPU", "CPU"];

/**
 * Loads MediaPipe on demand (only on the technique screen) from the app's own files (decision D2).
 * Tries the GPU first and falls back to the CPU on devices without WebGL support.
 */
export async function loadPoseDetector(): Promise<PoseDetector> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(POSE_WASM_PATH);
  let lastError: unknown;
  for (const delegate of DELEGATES) {
    try {
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_PATH, delegate },
        runningMode: "VIDEO",
        numPoses: POSE_MAX_PEOPLE,
      });
      return {
        detect: (video, timestampMs) => landmarker.detectForVideo(video, timestampMs).landmarks[0] ?? [],
        close: () => landmarker.close(),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
