"use client";

import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { MAX_RECORDING_SECONDS, RECORDING_COUNTDOWN_SECONDS, type CameraView, type TechniqueRuleSet } from "@/lib/constants/technique";
import type { CameraErrorReason } from "@/lib/technique/camera-support";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";
import { translate } from "@/lib/i18n/translate";
import { CameraControls, type CameraPhase } from "./camera-controls";
import { describeCountdown, describeFraming, describeRecording, type CameraStage } from "./technique-status";
import { useCameraStream } from "./use-camera-stream";
import { usePoseDetector } from "./use-pose-detector";
import { usePoseTracking, type PoseTrackingState } from "./use-pose-tracking";
import { useRepTracking, type RepTracking } from "./use-rep-tracking";
import { useSecondsTimer } from "./use-seconds-timer";

interface TechniqueCameraProps {
  phase: CameraPhase;
  ruleSet: TechniqueRuleSet;
  dispatch: Dispatch<TechniqueFlowEvent>;
}

function useCameraPipeline(dispatch: Dispatch<TechniqueFlowEvent>, cameraView: CameraView, onPose: RepTracking["handlePose"]) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorState = usePoseDetector(true);
  const handleCameraError = useCallback((reason: CameraErrorReason) => dispatch({ type: "camera_failed", reason }), [dispatch]);
  const isLive = useCameraStream(videoRef, true, handleCameraError);
  const detector = detectorState.status === "ready" ? detectorState.detector : null;
  const tracking = usePoseTracking({ videoRef, canvasRef, detector, isActive: isLive, cameraView, onPose });
  useEffect(() => {
    if (detectorState.status === "error") dispatch({ type: "model_failed" });
  }, [detectorState.status, dispatch]);
  const stage: CameraStage = detector === null ? "loading_model" : isLive ? "tracking" : "starting_camera";
  return { videoRef, canvasRef, stage, tracking };
}

function useCameraTimers(phase: CameraPhase, isFramed: boolean, repTracking: RepTracking, dispatch: Dispatch<TechniqueFlowEvent>) {
  const { startTracking, finishRecording } = repTracking;
  const finishCountdown = useCallback(() => {
    startTracking();
    dispatch({ type: "countdown_done" });
  }, [startTracking, dispatch]);
  const countdownSeconds = useSecondsTimer(phase === "countdown", RECORDING_COUNTDOWN_SECONDS, finishCountdown);
  const recordingSeconds = useSecondsTimer(phase === "recording", MAX_RECORDING_SECONDS, finishRecording);
  useEffect(() => {
    if (phase === "countdown" && !isFramed) dispatch({ type: "framing_lost" });
  }, [phase, isFramed, dispatch]);
  return { countdownSeconds, recordingSeconds };
}

function describeStatus(phase: CameraPhase, stage: CameraStage, tracking: PoseTrackingState, seconds: { countdownSeconds: number; recordingSeconds: number }): string {
  if (phase === "countdown") return describeCountdown(seconds.countdownSeconds);
  if (phase === "recording") return `${translate("technique.recording.label")} · ${describeRecording(seconds.recordingSeconds)}`;
  return describeFraming(stage, tracking.framing, tracking.isStable);
}

/** Camera preview with the skeleton, the framing message, the live rep count and the controls (steps 5.1–5.2). */
export function TechniqueCamera({ phase, ruleSet, dispatch }: TechniqueCameraProps) {
  const repTracking = useRepTracking(ruleSet.id, dispatch);
  const { videoRef, canvasRef, stage, tracking } = useCameraPipeline(dispatch, ruleSet.cameraView, repTracking.handlePose);
  const isFramed = tracking.framing?.isReady === true;
  const seconds = useCameraTimers(phase, isFramed, repTracking, dispatch);
  return (
    <section className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface" role="img" aria-label={translate("technique.framing.cameraPreview")}>
        <video ref={videoRef} muted playsInline className="block h-auto w-full -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />
      </div>
      <p role="status" aria-live="polite" className={`font-medium ${isFramed ? "text-accent-strong" : ""}`}>{describeStatus(phase, stage, tracking, seconds)}</p>
      {phase === "recording" && <p aria-live="polite" className="text-4xl font-semibold">{translate("technique.recording.repCount", { count: repTracking.repCount })}</p>}
      <CameraControls
        phase={phase}
        canStart={stage === "tracking" && tracking.isStable}
        onStart={() => dispatch({ type: "start_countdown" })}
        onCancelCountdown={() => dispatch({ type: "framing_lost" })}
        onStop={repTracking.finishRecording}
      />
    </section>
  );
}
