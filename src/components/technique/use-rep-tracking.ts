"use client";

import { useCallback, useRef, useState, type Dispatch } from "react";
import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import { SQUAT_RULES_CALIBRATED } from "@/lib/constants/technique-rules";
import { pickLiveCue, type SpokenCue } from "@/lib/technique/live-cues";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import { createPoseRepTracker, type PoseRepTracker } from "@/lib/technique/pose-rep-tracker";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";

export interface RepTracking {
  repCount: number;
  /** Called when the countdown ends: a fresh counter for this recording. */
  startTracking: () => void;
  /** "Encerrar", the D8 time cap or standing still: hands the reps to the summary. */
  finishRecording: () => void;
  handlePose: (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;
}

export type RepListener = (repCount: number, cue: SpokenCue | null) => void;

/** Counts reps from the camera poses only while recording (steps 5.2–5.3); `onRep` hears each new rep with its cue. */
export function useRepTracking(ruleSetId: TechniqueRuleSetId, dispatch: Dispatch<TechniqueFlowEvent>, onRep?: RepListener): RepTracking {
  const trackerRef = useRef<PoseRepTracker | null>(null);
  const [repCount, setRepCount] = useState(0);

  const startTracking = useCallback(() => {
    trackerRef.current = createPoseRepTracker(ruleSetId);
    setRepCount(0);
  }, [ruleSetId]);

  const finishRecording = useCallback(() => {
    const reps = trackerRef.current?.finish() ?? [];
    trackerRef.current = null;
    dispatch({ type: "recording_finished", reps });
  }, [dispatch]);

  const handlePose = useCallback((landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const previousCount = tracker.repCount;
    tracker.addPose(landmarks, aspectRatio, timestampMs);
    setRepCount(tracker.repCount);
    if (tracker.repCount > previousCount) onRep?.(tracker.repCount, pickLiveCue(tracker.finish(), SQUAT_RULES_CALIBRATED));
    if (tracker.isIdle(timestampMs)) finishRecording();
  }, [finishRecording, onRep]);

  return { repCount, startTracking, finishRecording, handlePose };
}
