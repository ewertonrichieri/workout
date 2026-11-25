"use client";

import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { MAX_RECORDING_SECONDS, RECORDING_COUNTDOWN_SECONDS, type CameraView, type TechniqueRuleSet } from "@/lib/constants/technique";
import type { CameraErrorReason } from "@/lib/technique/camera-support";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";
import { translate } from "@/lib/i18n/translate";
import { CameraControls, type CameraPhase } from "./camera-controls";
import { describeCountdown, describeFraming, describeRecording, type CameraStage } from "./technique-status";
import { useCameraStream } from "./use-camera-stream";
import { useFramingLossGuard } from "./use-framing-loss-guard";
import { usePoseDetector } from "./use-pose-detector";
import { usePoseTracking, type PoseTrackingState } from "./use-pose-tracking";
import { useRepTracking, type RepListener, type RepTracking } from "./use-rep-tracking";
import { useSecondsTimer } from "./use-seconds-timer";
import { SoundToggle } from "./sound-toggle";
import { useLiveCues } from "./use-live-cues";
import { useSpeech } from "./use-speech";

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
  const cancelCountdown = useCallback(() => dispatch({ type: "framing_lost" }), [dispatch]);
  useFramingLossGuard(phase === "countdown", isFramed, cancelCountdown);
  return { countdownSeconds, recordingSeconds };
}

function describeStatus(phase: CameraPhase, stage: CameraStage, tracking: PoseTrackingState, seconds: { countdownSeconds: number; recordingSeconds: number }): string {
  if (phase === "countdown") return describeCountdown(seconds.countdownSeconds);
  if (phase === "recording") return `${translate("technique.recording.label")} · ${describeRecording(seconds.recordingSeconds)}`;
  return describeFraming(stage, tracking.framing, tracking.isStable);
}

function RecordingCounter({ repCount, lastCue }: { repCount: number; lastCue: string | null }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-1">
      <p className="text-4xl font-semibold">{translate("technique.recording.repCount", { count: repCount })}</p>
      {lastCue && <p className="text-lg font-semibold text-accent-strong">{translate("technique.recording.lastCue", { cue: lastCue })}</p>}
    </div>
  );
}

/** Camera preview with the skeleton, framing message, live rep count, spoken cues and controls (steps 5.1–5.3). */
export function TechniqueCamera({ phase, ruleSet, dispatch }: TechniqueCameraProps) {
  const speech = useSpeech();
  const handleRepRef = useRef<RepListener>(() => undefined);
  const onRep = useCallback<RepListener>((count, cue) => handleRepRef.current(count, cue), []);
  const repTracking = useRepTracking(ruleSet.id, dispatch, onRep);
  const { videoRef, canvasRef, stage, tracking } = useCameraPipeline(dispatch, ruleSet.cameraView, repTracking.handlePose);
  const isFramed = tracking.framing?.isReady === true;
  const seconds = useCameraTimers(phase, isFramed, repTracking, dispatch);
  const cues = useLiveCues(phase, seconds.countdownSeconds, speech);
  useEffect(() => {
    handleRepRef.current = cues.handleRep;
  }, [cues.handleRep]);
  const start = () => {
    cues.resetCues();
    cues.announceStart();
    dispatch({ type: "start_countdown" });
  };
  return (
    <section className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface" role="img" aria-label={translate("technique.framing.cameraPreview")}>
        <video ref={videoRef} muted playsInline className="block h-auto w-full -scale-x-100" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />
      </div>
      <p role="status" aria-live="polite" className={`font-medium ${isFramed ? "text-accent-strong" : ""}`}>{describeStatus(phase, stage, tracking, seconds)}</p>
      {phase === "recording" && <RecordingCounter repCount={repTracking.repCount} lastCue={cues.lastCue} />}
      <SoundToggle isSupported={speech.isSupported} isEnabled={speech.isEnabled} onToggle={speech.toggle} />
      <CameraControls
        phase={phase}
        canStart={stage === "tracking" && tracking.isStable}
        onStart={start}
        onCancelCountdown={() => dispatch({ type: "framing_lost" })}
        onStop={repTracking.finishRecording}
      />
    </section>
  );
}
