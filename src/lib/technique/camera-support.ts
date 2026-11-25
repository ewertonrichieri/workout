export const CAMERA_ERROR_REASONS = ["permission_denied", "no_camera", "camera_busy", "unavailable"] as const;
export type CameraErrorReason = (typeof CAMERA_ERROR_REASONS)[number];

interface NavigatorLike {
  mediaDevices?: { getUserMedia?: unknown };
}

/** The camera needs getUserMedia (also missing outside HTTPS). */
export function hasCameraSupport(navigatorLike: NavigatorLike | undefined): boolean {
  return typeof navigatorLike?.mediaDevices?.getUserMedia === "function";
}

const REASON_BY_ERROR_NAME: Readonly<Record<string, CameraErrorReason>> = {
  NotAllowedError: "permission_denied",
  SecurityError: "permission_denied",
  NotFoundError: "no_camera",
  OverconstrainedError: "no_camera",
  NotReadableError: "camera_busy",
};

/** Maps a getUserMedia failure to the reason shown to the user. */
export function classifyCameraError(error: unknown): CameraErrorReason {
  if (error instanceof Error || error instanceof DOMException) return REASON_BY_ERROR_NAME[error.name] ?? "unavailable";
  return "unavailable";
}
