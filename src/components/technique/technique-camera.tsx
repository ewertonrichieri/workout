"use client";

import type { Dispatch } from "react";
import type { TechniqueRuleSet } from "@/lib/constants/technique";
import type { TechniqueFlowEvent } from "@/lib/technique/technique-flow";
import { translate } from "@/lib/i18n/translate";
import { CameraControls, type CameraPhase } from "./camera-controls";
import { SoundToggle } from "./sound-toggle";
import { describeCountdown, describeFraming, describeRecording, type CameraStage } from "./technique-status";
import type { PoseTrackingState } from "./use-pose-tracking";
import { useTechniqueSession } from "./use-technique-session";

interface TechniqueCameraProps {
  phase: CameraPhase;
  ruleSet: TechniqueRuleSet;
  dispatch: Dispatch<TechniqueFlowEvent>;
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

/** Camera preview with the skeleton, framing message, live rep count, spoken cues and controls (steps 5.1–5.4). */
export function TechniqueCamera({ phase, ruleSet, dispatch }: TechniqueCameraProps) {
  const session = useTechniqueSession(phase, ruleSet, dispatch);
  const { videoRef, canvasRef, stage, tracking, isFramed, repTracking, speech, cues } = session;
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
      <p role="status" aria-live="polite" className={`font-medium ${isFramed ? "text-accent-strong" : ""}`}>{describeStatus(phase, stage, tracking, session)}</p>
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
