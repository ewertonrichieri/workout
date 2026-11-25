import { MIN_CUE_INTERVAL_MS } from "@/lib/constants/technique";

export interface RepAnnouncerDependencies {
  speak: (text: string) => void;
  now: () => number;
}

export interface RepAnnouncer {
  /** Speaks the count (and the cue, unless one was spoken too recently); returns the cue to show on screen. */
  announceRep: (repCount: number, cueText: string | null) => string | null;
}

export function createRepAnnouncer({ speak, now }: RepAnnouncerDependencies): RepAnnouncer {
  let lastCueMs = -Infinity;
  return {
    announceRep(repCount, cueText) {
      const canSpeakCue = cueText !== null && now() - lastCueMs >= MIN_CUE_INTERVAL_MS;
      if (canSpeakCue) lastCueMs = now();
      speak(canSpeakCue ? `${repCount}. ${cueText}` : String(repCount));
      return cueText;
    },
  };
}
