import type { PoseLandmark } from "@/lib/technique/body-framing";
import { POSE_LANDMARK, POSE_LANDMARK_COUNT } from "@/lib/technique/pose-landmarks";
import type { Point } from "@/lib/technique/geometry";

const SEEN = 0.9;
const HIDDEN = 0.1;

export interface SideJoints {
  shoulder: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
  heel: Point;
  toe: Point;
}

const RIGHT = { shoulder: POSE_LANDMARK.rightShoulder, hip: POSE_LANDMARK.rightHip, knee: POSE_LANDMARK.rightKnee, ankle: POSE_LANDMARK.rightAnkle, heel: POSE_LANDMARK.rightHeel, toe: POSE_LANDMARK.rightFootIndex };
const LEFT = { shoulder: POSE_LANDMARK.leftShoulder, hip: POSE_LANDMARK.leftHip, knee: POSE_LANDMARK.leftKnee, ankle: POSE_LANDMARK.leftAnkle, heel: POSE_LANDMARK.leftHeel, toe: POSE_LANDMARK.leftFootIndex };

/** Fictional side-view pose: the chosen side seen, the other side hidden (as the camera sees a side view). */
export function buildSidePose(joints: SideJoints, side: "left" | "right" = "right", visibility = SEEN): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({ x: 0.5, y: 0.5, visibility: HIDDEN }));
  const indexes = side === "right" ? RIGHT : LEFT;
  for (const [joint, index] of Object.entries(indexes) as Array<[keyof SideJoints, number]>) {
    landmarks[index] = { ...joints[joint], visibility };
  }
  return landmarks;
}

export const STANDING: SideJoints = {
  shoulder: { x: 0.5, y: 0.2 },
  hip: { x: 0.5, y: 0.5 },
  knee: { x: 0.5, y: 0.7 },
  ankle: { x: 0.5, y: 0.9 },
  heel: { x: 0.47, y: 0.92 },
  toe: { x: 0.56, y: 0.92 },
};

/** Thigh parallel to the floor, trunk leaning forward. */
export const PARALLEL_BOTTOM: SideJoints = {
  shoulder: { x: 0.55, y: 0.45 },
  hip: { x: 0.4, y: 0.7 },
  knee: { x: 0.6, y: 0.7 },
  ankle: { x: 0.5, y: 0.9 },
  heel: { x: 0.47, y: 0.92 },
  toe: { x: 0.56, y: 0.92 },
};
