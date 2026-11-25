export interface FramingHold {
  /** Feeds one frame; true once the body has been framed without a break for the whole hold. */
  update: (isFramed: boolean, nowMs: number) => boolean;
  reset: () => void;
}

export function createFramingHold(holdMs: number): FramingHold {
  let framedSinceMs: number | null = null;
  return {
    update(isFramed, nowMs) {
      if (!isFramed) {
        framedSinceMs = null;
        return false;
      }
      framedSinceMs ??= nowMs;
      return nowMs - framedSinceMs >= holdMs;
    },
    reset() {
      framedSinceMs = null;
    },
  };
}
