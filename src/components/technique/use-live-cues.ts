"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RECORDING_COUNTDOWN_SECONDS } from "@/lib/constants/technique";
import type { TechniqueIssue } from "@/lib/constants/technique-rules";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import { createRepAnnouncer } from "@/lib/technique/rep-announcer";
import type { CameraPhase } from "./camera-controls";
import type { SpeechControls } from "./use-speech";

export interface LiveCues {
  /** Last cue of this recording, also shown on screen (fallback without voice). */
  lastCue: string | null;
  handleRep: (repCount: number, cue: TechniqueIssue | null) => void;
  /** Speaks the first countdown number inside the tap, which unlocks speech on iOS. */
  announceStart: () => void;
  resetCues: () => void;
}

/** Short spoken phrase of each issue a pattern may speak (D7); issues without one are never spoken. */
const CUE_KEYS: Partial<Record<TechniqueIssue, TranslationKey>> = {
  shallow_depth: "technique.cues.shallow_depth",
  trunk_lean_fatigue: "technique.cues.trunk_lean_fatigue",
  fast_descent: "technique.cues.fast_descent",
  hinge_short_range: "technique.cues.hinge_short_range",
  hinge_knee_bend: "technique.cues.hinge_knee_bend",
  row_short_pull: "technique.cues.row_short_pull",
  row_trunk_rise: "technique.cues.row_trunk_rise",
};

function describeCue(cue: TechniqueIssue | null): string | null {
  const key = cue ? CUE_KEYS[cue] : undefined;
  return key ? translate(key) : null;
}

function readClock(): number {
  return performance.now();
}

/** Spoken countdown, rep count and cues (step 5.3, decision D7). */
export function useLiveCues(phase: CameraPhase, countdownSeconds: number, speech: SpeechControls): LiveCues {
  const { speak } = speech;
  const [lastCue, setLastCue] = useState<string | null>(null);
  const announcer = useMemo(() => createRepAnnouncer({ speak, now: readClock }), [speak]);

  useEffect(() => {
    const remainingSeconds = RECORDING_COUNTDOWN_SECONDS - countdownSeconds;
    // "3" is spoken inside the tap (announceStart); the countdown ends on "Já!", never "0".
    if (phase === "countdown" && countdownSeconds > 0 && remainingSeconds > 0) speak(String(remainingSeconds));
    if (phase === "recording") speak(translate("technique.recording.go"));
  }, [phase, countdownSeconds, speak]);

  const handleRep = useCallback((repCount: number, cue: TechniqueIssue | null) => {
    const shownCue = announcer.announceRep(repCount, describeCue(cue));
    if (shownCue) setLastCue(shownCue);
  }, [announcer]);

  const announceStart = useCallback(() => speak(String(RECORDING_COUNTDOWN_SECONDS)), [speak]);
  const resetCues = useCallback(() => setLastCue(null), []);
  return { lastCue, handleRep, announceStart, resetCues };
}
