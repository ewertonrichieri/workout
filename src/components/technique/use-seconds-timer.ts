"use client";

import { useEffect, useState } from "react";

const SECOND_MS = 1000;

/**
 * Counts whole seconds while `isActive` and calls `onLimit` once `limitSeconds` is reached
 * (countdown before recording and the D8 recording cap).
 */
export function useSecondsTimer(isActive: boolean, limitSeconds: number, onLimit: () => void): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), SECOND_MS);
    return () => {
      clearInterval(interval);
      setElapsedSeconds(0);
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive && elapsedSeconds >= limitSeconds) onLimit();
  }, [isActive, elapsedSeconds, limitSeconds, onLimit]);

  return isActive ? elapsedSeconds : 0;
}
