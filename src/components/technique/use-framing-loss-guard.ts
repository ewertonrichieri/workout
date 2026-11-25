"use client";

import { useEffect } from "react";
import { FRAMING_LOSS_TOLERANCE_MS } from "@/lib/constants/technique";

/** Calls `onLost` only when the body stays out of frame for the tolerance, so a short model glitch does not cancel the countdown. */
export function useFramingLossGuard(isActive: boolean, isFramed: boolean, onLost: () => void): void {
  useEffect(() => {
    if (!isActive || isFramed) return;
    const timeout = setTimeout(onLost, FRAMING_LOSS_TOLERANCE_MS);
    return () => clearTimeout(timeout);
  }, [isActive, isFramed, onLost]);
}
