"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { SPEECH_LANGUAGE } from "@/lib/constants/technique";
import { readSoundEnabled, writeSoundEnabled } from "./sound-preference";

export interface SpeechControls {
  isSupported: boolean;
  isEnabled: boolean;
  toggle: () => void;
  /** Speaks now, interrupting what is still being said (the latest count matters most). */
  speak: (text: string) => void;
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function readSpeechSupport(): boolean {
  return typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
}

function readLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function speakNow(text: string): void {
  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANGUAGE;
  const voice = synthesis.getVoices().find((candidate) => candidate.lang.replace("_", "-").startsWith(SPEECH_LANGUAGE));
  if (voice) utterance.voice = voice;
  synthesis.cancel();
  synthesis.speak(utterance);
}

/** Browser voice for the live cues (decision D7); without it the cues stay on screen only. */
export function useSpeech(): SpeechControls {
  const isSupported = useSyncExternalStore(subscribeToNothing, readSpeechSupport, () => false);
  const [isEnabled, setIsEnabled] = useState(() => typeof window === "undefined" || readSoundEnabled(readLocalStorage()));
  const toggle = useCallback(() => {
    setIsEnabled((current) => {
      writeSoundEnabled(readLocalStorage(), !current);
      if (current && readSpeechSupport()) window.speechSynthesis.cancel();
      return !current;
    });
  }, []);
  const speak = useCallback((text: string) => {
    if (isSupported && isEnabled) speakNow(text);
  }, [isSupported, isEnabled]);
  return { isSupported, isEnabled, toggle, speak };
}
