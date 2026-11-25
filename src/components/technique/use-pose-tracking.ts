"use client";

import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { FRAMING_HOLD_MS, type CameraView } from "@/lib/constants/technique";
import { assessFraming, type FramingResult, type PoseLandmark } from "@/lib/technique/body-framing";
import { createFramingHold } from "@/lib/technique/framing-hold";
import { drawPoseOverlay, type OverlayColors } from "./pose-overlay";
import type { PoseDetector } from "./pose-detector";

/** HTMLMediaElement.HAVE_CURRENT_DATA: a frame is available to analyze. */
const VIDEO_HAS_FRAME = 2;

export interface PoseTrackingState {
  framing: FramingResult | null;
  /** The whole body has stayed framed for FRAMING_HOLD_MS. */
  isStable: boolean;
}

const INITIAL_TRACKING: PoseTrackingState = { framing: null, isStable: false };

/** Theme tokens (globals.css), read once per camera session instead of on every frame. */
function readOverlayColors(): OverlayColors {
  const styles = getComputedStyle(document.documentElement);
  return { bone: styles.getPropertyValue("--accent-strong").trim(), joint: styles.getPropertyValue("--foreground").trim() };
}

function matchCanvasToVideo(canvas: HTMLCanvasElement, video: HTMLVideoElement): void {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
}

function isSameTracking(previous: PoseTrackingState, next: PoseTrackingState): boolean {
  const previousIssue = previous.framing && !previous.framing.isReady ? previous.framing.issue : previous.framing?.isReady;
  const nextIssue = next.framing && !next.framing.isReady ? next.framing.issue : next.framing?.isReady;
  return previousIssue === nextIssue && previous.isStable === next.isStable;
}

interface PoseTrackingInput {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  detector: PoseDetector | null;
  isActive: boolean;
  /** Side-view exercises also require the user to stand sideways (step 5.2). */
  cameraView: CameraView;
  /** Every analyzed pose, with the image aspect ratio (rep counting, step 5.2). */
  onPose?: (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;
}

/** Runs the pose model on every camera frame, draws the skeleton and says whether the body is framed. */
export function usePoseTracking({ videoRef, canvasRef, detector, isActive, cameraView, onPose }: PoseTrackingInput): PoseTrackingState {
  const [tracking, setTracking] = useState<PoseTrackingState>(INITIAL_TRACKING);
  const reportPose = useEffectEvent((landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => onPose?.(landmarks, aspectRatio, timestampMs));

  useEffect(() => {
    if (!isActive || !detector) return;
    const hold = createFramingHold(FRAMING_HOLD_MS);
    const colors = readOverlayColors();
    let frameRequest = 0;
    const analyzeFrame = (): void => {
      frameRequest = requestAnimationFrame(analyzeFrame);
      const video = videoRef.current;
      const context = canvasRef.current?.getContext("2d");
      if (!video || !context || video.readyState < VIDEO_HAS_FRAME) return;
      const nowMs = performance.now();
      const landmarks = detector.detect(video, nowMs);
      const aspectRatio = video.videoWidth / video.videoHeight;
      reportPose(landmarks, aspectRatio, nowMs);
      matchCanvasToVideo(context.canvas, video);
      drawPoseOverlay(context, landmarks, colors);
      const framing = assessFraming(landmarks, { aspectRatio, cameraView });
      const next = { framing, isStable: hold.update(framing.isReady, nowMs) };
      setTracking((previous) => (isSameTracking(previous, next) ? previous : next));
    };
    frameRequest = requestAnimationFrame(analyzeFrame);
    return () => {
      cancelAnimationFrame(frameRequest);
      setTracking(INITIAL_TRACKING);
    };
  }, [isActive, detector, videoRef, canvasRef, cameraView]);

  return tracking;
}
