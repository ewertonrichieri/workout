import { FRAME_EDGE_MARGIN, MIN_LANDMARK_VISIBILITY } from "@/lib/constants/technique";
import { BODY_PART_LANDMARKS } from "./pose-landmarks";

/** Normalized landmark (0–1 of the image), as MediaPipe returns it. */
export interface PoseLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export const FRAMING_ISSUES = ["no_person", "too_close", "feet_hidden", "head_hidden", "off_center"] as const;
export type FramingIssue = (typeof FRAMING_ISSUES)[number];

export type FramingResult = { isReady: true } | { isReady: false; issue: FramingIssue };

function isInsideFrame(value: number): boolean {
  return value >= FRAME_EDGE_MARGIN && value <= 1 - FRAME_EDGE_MARGIN;
}

/** Seen with enough confidence and inside the frame; missing visibility counts as not seen. */
export function isLandmarkSeen(landmark: PoseLandmark | undefined): boolean {
  if (!landmark) return false;
  return (landmark.visibility ?? 0) >= MIN_LANDMARK_VISIBILITY && isInsideFrame(landmark.x) && isInsideFrame(landmark.y);
}

function isPartSeen(landmarks: readonly PoseLandmark[], indexes: readonly number[]): boolean {
  return indexes.some((index) => isLandmarkSeen(landmarks[index]));
}

/** Whether the whole body is in the frame, and if not, what the user should fix first. */
export function assessFraming(landmarks: readonly PoseLandmark[]): FramingResult {
  if (landmarks.length === 0) return { isReady: false, issue: "no_person" };
  const isHeadSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.head);
  const areFeetSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.feet);
  if (!isHeadSeen && !areFeetSeen) return { isReady: false, issue: "too_close" };
  if (!areFeetSeen) return { isReady: false, issue: "feet_hidden" };
  if (!isHeadSeen) return { isReady: false, issue: "head_hidden" };
  const isMiddleSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.torso) && isPartSeen(landmarks, BODY_PART_LANDMARKS.knees);
  if (!isMiddleSeen) return { isReady: false, issue: "off_center" };
  return { isReady: true };
}
