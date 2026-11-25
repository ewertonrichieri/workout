"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { PoseLandmark } from "@/lib/technique/body-framing";
import { pickRecorderMimeType, type ReplayFrame, type TechniqueReplay } from "@/lib/technique/replay";

/** If the browser never reports the end of the recording, the summary still opens (without replay). */
const RECORDER_STOP_TIMEOUT_MS = 3000;

export interface ReplayRecorder {
  start: () => void;
  addPose: (landmarks: readonly PoseLandmark[], timestampMs: number) => void;
  /** Ends the recording; null when the browser cannot record (the analysis works without replay). */
  stop: () => Promise<TechniqueReplay | null>;
}

interface ActiveRecording {
  recorder: MediaRecorder;
  chunks: Blob[];
  frames: ReplayFrame[];
  startedAtMs: number;
}

function openRecorder(stream: MediaStream): MediaRecorder | null {
  if (typeof MediaRecorder === "undefined") return null;
  const mimeType = pickRecorderMimeType((type) => MediaRecorder.isTypeSupported(type));
  try {
    return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch {
    return null;
  }
}

function finishRecording(active: ActiveRecording): Promise<TechniqueReplay | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), RECORDER_STOP_TIMEOUT_MS);
    active.recorder.addEventListener("stop", () => {
      clearTimeout(timeout);
      const video = new Blob(active.chunks, { type: active.recorder.mimeType });
      resolve(video.size > 0 ? { video, startedAtMs: active.startedAtMs, frames: active.frames } : null);
    }, { once: true });
    active.recorder.stop();
  });
}

/** Records the set and its poses in memory only, for the replay (step 5.4, privacy: the video never leaves the phone). */
export function useReplayRecorder(videoRef: RefObject<HTMLVideoElement | null>): ReplayRecorder {
  const activeRef = useRef<ActiveRecording | null>(null);

  const start = useCallback(() => {
    const stream = videoRef.current?.srcObject;
    const recorder = stream instanceof MediaStream ? openRecorder(stream) : null;
    if (!recorder) return void (activeRef.current = null);
    const active: ActiveRecording = { recorder, chunks: [], frames: [], startedAtMs: performance.now() };
    recorder.addEventListener("dataavailable", (event) => active.chunks.push(event.data));
    recorder.start();
    activeRef.current = active;
  }, [videoRef]);

  const addPose = useCallback((landmarks: readonly PoseLandmark[], timestampMs: number) => {
    const active = activeRef.current;
    if (active) active.frames.push({ offsetMs: timestampMs - active.startedAtMs, landmarks: landmarks.map(({ x, y, visibility }) => ({ x, y, visibility })) });
  }, []);

  const stop = useCallback(async () => {
    const active = activeRef.current;
    activeRef.current = null;
    return active && active.recorder.state !== "inactive" ? finishRecording(active) : null;
  }, []);

  return { start, addPose, stop };
}
