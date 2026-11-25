"use client";

import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { MAX_RECORDING_SECONDS, RECORDING_COUNTDOWN_SECONDS } from "@/lib/constants/technique";
import type { CameraErrorReason } from "@/lib/technique/camera-support";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";
import { translate } from "@/lib/i18n/translate";
import { CameraControls, type CameraPhase } from "./camera-controls";
import { describeCountdown, describeFraming, describeRecording, type CameraStage } from "./technique-status";
import { useCameraStream } from "./use-camera-stream";
import { usePoseDetector } from "./use-pose-detector";
import { usePoseTracking } from "./use-pose-tracking";
import { useSecondsTimer } from "./use-seconds-timer";

interface TechniqueCameraProps {
  phase: CameraPhase;
  dispatch: Dispatch<TechniqueFlowEvent>;
}

function useCameraPipeline(dispatch: Dispatch<TechniqueFlowEvent>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorState = usePoseDetector(true);
  const handleCameraError = useCallback((reason: CameraErrorReason) => dispatch({ type: "camera_failed", reason }), [dispatch]);
  const isLive = useCameraStream(videoRef, true, handleCameraError);
  const detector = detectorState.status === "ready" ? detectorState.detector : null;
  const tracking = usePoseTracking({ videoRef, canvasRef, detector, isActive: isLive });
  useEffect(() => {
    if (detectorState.status === "error") dispatch({ type: "model_failed" });
  }, [detectorState.status, dispatch]);
  const stage: CameraStage = detector === null ? "loading_model" : isLive ? "tracking" : "starting_camera";
  return { videoRef, canvasRef, stage, tracking };
}

function useCameraTimers(phase: CameraPhase, isFramed: boolean, dispatch: Dispatch<TechniqueFlowEvent>) {
  const finishCountdown = useCallback(() => dispatch({ type: "countdown_done" }), [dispatch]);
  const stopRecording = useCallback(() => dispatch({ type: "stop_recording" }), [dispatch]);
  const countdownSeconds = useSecondsTimer(phase === "countdown", RECORDING_COUNTDOWN_SECONDS, finishCountdown);
  const recordingSeconds = useSecondsTimer(phase === "recording", MAX_RECORDING_SECONDS, stopRecording);
  useEffect(() => {
    if (phase === "countdown" && !isFramed) dispatch({ type: "framing_lost" });
  }, [phase, isFramed, dispatch]);
  return { countdownSeconds, recordingSeconds };
}

/** Camera preview with the skeleton, the framing message and the recording controls (step 5.1). */
export function TechniqueCamera({ phase, dispatch }: TechniqueCameraProps) {
  const { videoRef, canvasRef, stage, tracking } = useCameraPipeline(dispatch);
  const isFramed = tracking.framing?.isReady === true;
  const { countdownSeconds, recordingSeconds } = useCameraTimers(phase, isFramed, dispatch);
  const status =
    phase === "countdown" ? describeCountdown(countdownSeconds)
    : phase === "recording" ? `${translate("technique.recording.label")} · ${describeRecording(recordingSeconds)}`
    : describeFraming(stage, tracking.framing, tracking.isStable);
  return (
    <section className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface" role="img" aria-label={translate("technique.framing.cameraPreview")}>
        <video ref={videoRef} muted playsInline className="block h-auto w-full -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />
      </div>
      <p role="status" aria-live="polite" className={`font-medium ${isFramed ? "text-accent-strong" : ""}`}>{status}</p>
      <CameraControls
        phase={phase}
        canStart={stage === "tracking" && tracking.isStable}
        onStart={() => dispatch({ type: "start_countdown" })}
        onCancelCountdown={() => dispatch({ type: "framing_lost" })}
        onStop={() => dispatch({ type: "stop_recording" })}
      />
    </section>
  );
}
