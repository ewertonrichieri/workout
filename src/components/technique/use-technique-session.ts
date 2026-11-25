"use client";

import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from "react";
import { MAX_RECORDING_SECONDS, RECORDING_COUNTDOWN_SECONDS, type CameraView, type TechniqueRuleSet } from "@/lib/constants/technique";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import type { CameraErrorReason } from "@/lib/technique/camera-support";
import type { TechniqueRep } from "@/lib/technique/pose-rep-tracker";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";
import type { CameraPhase } from "./camera-controls";
import type { CameraStage } from "./technique-status";
import { useCameraStream } from "./use-camera-stream";
import { useFramingLossGuard } from "./use-framing-loss-guard";
import { useLiveCues } from "./use-live-cues";
import { usePoseDetector } from "./use-pose-detector";
import { usePoseTracking } from "./use-pose-tracking";
import { useRepTracking, type RepListener } from "./use-rep-tracking";
import { useReplayRecorder } from "./use-replay-recorder";
import { useSecondsTimer } from "./use-seconds-timer";
import { useSpeech } from "./use-speech";

type PoseHandler = (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;

function useCameraPipeline(videoRef: RefObject<HTMLVideoElement | null>, dispatch: Dispatch<TechniqueFlowEvent>, cameraView: CameraView, onPose: PoseHandler) {
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
  return { canvasRef, stage, tracking };
}

/** Rep counting, spoken cues and the in-memory replay, wired together (steps 5.2–5.4). */
function useRecording(videoRef: RefObject<HTMLVideoElement | null>, ruleSet: TechniqueRuleSet, dispatch: Dispatch<TechniqueFlowEvent>) {
  const recorder = useReplayRecorder(videoRef);
  const handleRepRef = useRef<RepListener>(() => undefined);
  const onRep = useCallback<RepListener>((count, cue) => handleRepRef.current(count, cue), []);
  const { stop: stopRecorder, addPose, start: startRecorder } = recorder;
  const onFinish = useCallback((reps: TechniqueRep[]) => {
    stopRecorder()
      .catch(() => null)
      .then((replay) => dispatch({ type: "recording_finished", reps, replay }));
  }, [stopRecorder, dispatch]);
  const repTracking = useRepTracking(ruleSet.id, onFinish, onRep);
  const { handlePose } = repTracking;
  const onPose = useCallback<PoseHandler>((landmarks, aspectRatio, timestampMs) => {
    handlePose(landmarks, aspectRatio, timestampMs);
    addPose(landmarks, timestampMs);
  }, [handlePose, addPose]);
  return { repTracking, startRecorder, handleRepRef, onPose };
}

/** Everything the camera screen needs while it is open (camera, pose, counting, voice, replay, timers). */
export function useTechniqueSession(phase: CameraPhase, ruleSet: TechniqueRuleSet, dispatch: Dispatch<TechniqueFlowEvent>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speech = useSpeech();
  const { repTracking, startRecorder, handleRepRef, onPose } = useRecording(videoRef, ruleSet, dispatch);
  const { canvasRef, stage, tracking } = useCameraPipeline(videoRef, dispatch, ruleSet.cameraView, onPose);
  const isFramed = tracking.framing?.isReady === true;
  const { startTracking, finishRecording } = repTracking;
  const finishCountdown = useCallback(() => {
    startTracking();
    startRecorder();
    dispatch({ type: "countdown_done" });
  }, [startTracking, startRecorder, dispatch]);
  const countdownSeconds = useSecondsTimer(phase === "countdown", RECORDING_COUNTDOWN_SECONDS, finishCountdown);
  const recordingSeconds = useSecondsTimer(phase === "recording", MAX_RECORDING_SECONDS, finishRecording);
  const cancelCountdown = useCallback(() => dispatch({ type: "framing_lost" }), [dispatch]);
  useFramingLossGuard(phase === "countdown", isFramed, cancelCountdown);
  const cues = useLiveCues(phase, countdownSeconds, speech);
  useEffect(() => {
    handleRepRef.current = cues.handleRep;
  }, [cues.handleRep, handleRepRef]);
  return { videoRef, canvasRef, stage, tracking, isFramed, repTracking, speech, cues, countdownSeconds, recordingSeconds };
}
