"use client";

import { useCallback, useRef, useState } from "react";
import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import { TECHNIQUE_RULES_CALIBRATED, type TechniqueIssue } from "@/lib/constants/technique-rules";
import { pickLiveCue } from "@/lib/technique/live-cues";
import { getMovementPattern } from "@/lib/technique/patterns/movement-patterns";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import { createPoseRepTracker, type PoseRepTracker, type TechniqueRep } from "@/lib/technique/pose-rep-tracker";

export interface RepTracking {
  repCount: number;
  /** Called when the countdown ends: a fresh counter for this recording. */
  startTracking: () => void;
  /** "Encerrar", the D8 time cap or standing still: hands the reps to the summary. */
  finishRecording: () => void;
  handlePose: (landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => void;
}

export type RepListener = (repCount: number, cue: TechniqueIssue | null) => void;

/**
 * Counts reps from the camera poses only while recording (steps 5.2–5.3): `onRep` hears each new rep with its cue,
 * `onFinish` gets the reps once (Encerrar, the time cap or standing still).
 */
export function useRepTracking(ruleSetId: TechniqueRuleSetId, onFinish: (reps: TechniqueRep[]) => void, onRep?: RepListener): RepTracking {
  const trackerRef = useRef<PoseRepTracker | null>(null);
  const [repCount, setRepCount] = useState(0);

  const startTracking = useCallback(() => {
    trackerRef.current = createPoseRepTracker(getMovementPattern(ruleSetId));
    setRepCount(0);
  }, [ruleSetId]);

  const finishRecording = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    trackerRef.current = null;
    onFinish(tracker.finish());
  }, [onFinish]);

  const handlePose = useCallback((landmarks: readonly PoseLandmark[], aspectRatio: number, timestampMs: number) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const previousCount = tracker.repCount;
    tracker.addPose(landmarks, aspectRatio, timestampMs);
    setRepCount(tracker.repCount);
    if (tracker.repCount > previousCount) onRep?.(tracker.repCount, pickLiveCue(getMovementPattern(ruleSetId), tracker.finish(), TECHNIQUE_RULES_CALIBRATED));
    if (tracker.isIdle(timestampMs)) finishRecording();
  }, [finishRecording, onRep, ruleSetId]);

  return { repCount, startTracking, finishRecording, handlePose };
}
