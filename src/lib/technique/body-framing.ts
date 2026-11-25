import { FRAME_EDGE_MARGIN, MIN_LANDMARK_VISIBILITY, SIDE_VIEW_MAX_SHOULDER_RATIO, type CameraView } from "@/lib/constants/technique";
import { distanceBetween, toAspectSpace, type Point } from "./geometry";
import { BODY_PART_LANDMARKS, POSE_LANDMARK } from "./pose-landmarks";

/** Normalized landmark (0–1 of the image), as MediaPipe returns it. */
export interface PoseLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export const FRAMING_ISSUES = ["no_person", "too_close", "feet_hidden", "head_hidden", "off_center", "not_side_view"] as const;
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

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

/**
 * Facing the camera, the shoulders look wide compared with the torso; from the side they overlap.
 * Measured on reference photos: 3/4 view ≈ 0.34, facing the camera 0.5–0.71 (step 5.2).
 */
function isSideView(landmarks: readonly PoseLandmark[], aspectRatio: number): boolean {
  const [leftShoulder, rightShoulder, leftHip, rightHip] = [
    POSE_LANDMARK.leftShoulder, POSE_LANDMARK.rightShoulder, POSE_LANDMARK.leftHip, POSE_LANDMARK.rightHip,
  ].map((index) => toAspectSpace(landmarks[index] ?? { x: 0, y: 0 }, aspectRatio)) as [Point, Point, Point, Point];
  const torsoLength = distanceBetween(midpoint(leftShoulder, rightShoulder), midpoint(leftHip, rightHip));
  if (torsoLength === 0) return false;
  return Math.abs(leftShoulder.x - rightShoulder.x) / torsoLength <= SIDE_VIEW_MAX_SHOULDER_RATIO;
}

export interface FramingOptions {
  aspectRatio: number;
  cameraView: CameraView;
}

/** Whether the whole body is in the frame (and, for side-view exercises, sideways), and if not, what to fix first. */
export function assessFraming(landmarks: readonly PoseLandmark[], options?: FramingOptions): FramingResult {
  if (landmarks.length === 0) return { isReady: false, issue: "no_person" };
  const isHeadSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.head);
  const areFeetSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.feet);
  if (!isHeadSeen && !areFeetSeen) return { isReady: false, issue: "too_close" };
  if (!areFeetSeen) return { isReady: false, issue: "feet_hidden" };
  if (!isHeadSeen) return { isReady: false, issue: "head_hidden" };
  const isMiddleSeen = isPartSeen(landmarks, BODY_PART_LANDMARKS.torso) && isPartSeen(landmarks, BODY_PART_LANDMARKS.knees);
  if (!isMiddleSeen) return { isReady: false, issue: "off_center" };
  if (options?.cameraView === "side" && !isSideView(landmarks, options.aspectRatio)) return { isReady: false, issue: "not_side_view" };
  return { isReady: true };
}
