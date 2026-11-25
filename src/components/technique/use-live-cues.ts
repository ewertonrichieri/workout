"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RECORDING_COUNTDOWN_SECONDS } from "@/lib/constants/technique";
import type { SpokenCue } from "@/lib/technique/live-cues";
import { createRepAnnouncer } from "@/lib/technique/rep-announcer";
import { translate } from "@/lib/i18n/translate";
import type { CameraPhase } from "./camera-controls";
import type { SpeechControls } from "./use-speech";

export interface LiveCues {
  /** Last cue of this recording, also shown on screen (fallback without voice). */
  lastCue: string | null;
  handleRep: (repCount: number, cue: SpokenCue | null) => void;
  /** Speaks the first countdown number inside the tap, which unlocks speech on iOS. */
  announceStart: () => void;
  resetCues: () => void;
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

  const handleRep = useCallback((repCount: number, cue: SpokenCue | null) => {
    const shownCue = announcer.announceRep(repCount, cue ? translate(`technique.cues.${cue}`) : null);
    if (shownCue) setLastCue(shownCue);
  }, [announcer]);

  const announceStart = useCallback(() => speak(String(RECORDING_COUNTDOWN_SECONDS)), [speak]);
  const resetCues = useCallback(() => setLastCue(null), []);
  return { lastCue, handleRep, announceStart, resetCues };
}
