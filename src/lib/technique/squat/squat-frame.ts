import { isLandmarkSeen, type PoseLandmark } from "@/lib/technique/body-framing";
import { angleAtVertex, angleFromVertical, distanceBetween, elevationAngle, toAspectSpace, type Point } from "@/lib/technique/geometry";
import { POSE_LANDMARK } from "@/lib/technique/pose-landmarks";

/** What the squat rules read in one camera frame (side view). */
export interface SquatMeasures {
  /** Hip–knee–ankle angle: 180 standing straight, smaller when bending. */
  kneeAngle: number;
  /** Hip above the knee, from the horizontal: 0 = thigh parallel, negative = deeper. */
  thighAngle: number;
  /** Shoulder–hip line from the vertical. */
  trunkLean: number;
  /** Heel height relative to the toes, as a share of the shin length (grows when the heel rises). */
  heelToToeRatio: number;
  /** How far the knee is ahead of the toes, as a share of the shin length (negative = behind). */
  kneeTravelRatio: number;
}

/** null = a joint the rules need was not seen: the frame is not measured. */
export interface SquatFrame {
  timestampMs: number;
  measures: SquatMeasures | null;
}

const SIDES = [
  [POSE_LANDMARK.leftShoulder, POSE_LANDMARK.leftHip, POSE_LANDMARK.leftKnee, POSE_LANDMARK.leftAnkle, POSE_LANDMARK.leftHeel, POSE_LANDMARK.leftFootIndex],
  [POSE_LANDMARK.rightShoulder, POSE_LANDMARK.rightHip, POSE_LANDMARK.rightKnee, POSE_LANDMARK.rightAnkle, POSE_LANDMARK.rightHeel, POSE_LANDMARK.rightFootIndex],
] as const;

function averageVisibility(landmarks: readonly PoseLandmark[]): number {
  return landmarks.reduce((total, landmark) => total + (landmark.visibility ?? 0), 0) / landmarks.length;
}

/** The camera sees one side best in a side view; both sides must be fully seen to be chosen. */
function pickSeenSide(landmarks: readonly PoseLandmark[]): PoseLandmark[] | null {
  const candidates = SIDES.map((indexes) => indexes.map((index) => landmarks[index]))
    .filter((side): side is PoseLandmark[] => side.every((landmark) => isLandmarkSeen(landmark)));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, side) => (averageVisibility(side) > averageVisibility(best) ? side : best));
}

function measureJoints([shoulder, hip, knee, ankle, heel, toe]: readonly Point[]): SquatMeasures | null {
  const shinLength = distanceBetween(knee, ankle);
  if (shinLength === 0) return null;
  const facing = Math.sign(toe.x - heel.x);
  return {
    kneeAngle: angleAtVertex(hip, knee, ankle),
    thighAngle: elevationAngle(hip, knee),
    trunkLean: angleFromVertical(hip, shoulder),
    heelToToeRatio: (toe.y - heel.y) / shinLength,
    kneeTravelRatio: ((knee.x - toe.x) * facing) / shinLength,
  };
}

export function measureSquatFrame(landmarks: readonly PoseLandmark[], aspectRatio: number): SquatMeasures | null {
  const side = pickSeenSide(landmarks);
  if (!side) return null;
  return measureJoints(side.map((landmark) => toAspectSpace(landmark, aspectRatio)));
}
