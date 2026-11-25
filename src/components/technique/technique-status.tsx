import { MAX_RECORDING_SECONDS, RECORDING_COUNTDOWN_SECONDS } from "@/lib/constants/technique";
import type { FramingResult } from "@/lib/technique/body-framing";
import { translate } from "@/lib/i18n/translate";

export type CameraStage = "loading_model" | "starting_camera" | "tracking";

/** What the framing message says while the camera screen is open. */
export function describeFraming(stage: CameraStage, framing: FramingResult | null, isStable: boolean): string {
  if (stage === "loading_model") return translate("technique.framing.loadingModel");
  if (stage === "starting_camera" || framing === null) return translate("technique.framing.startingCamera");
  if (!framing.isReady) return translate(`technique.framing.issues.${framing.issue}`);
  return isStable ? translate("technique.framing.ready") : translate("technique.framing.holdStill");
}

export function describeCountdown(elapsedSeconds: number): string {
  return translate("technique.countdown.label", { seconds: Math.max(RECORDING_COUNTDOWN_SECONDS - elapsedSeconds, 1) });
}

export function describeRecording(elapsedSeconds: number): string {
  return translate("technique.recording.elapsed", { seconds: elapsedSeconds, max: MAX_RECORDING_SECONDS });
}
