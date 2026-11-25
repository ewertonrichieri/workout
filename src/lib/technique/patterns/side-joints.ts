import { isLandmarkSeen, type PoseLandmark } from "@/lib/technique/body-framing";
import { toAspectSpace, type Point } from "@/lib/technique/geometry";

function averageVisibility(landmarks: readonly PoseLandmark[]): number {
  return landmarks.reduce((total, landmark) => total + (landmark.visibility ?? 0), 0) / landmarks.length;
}

/**
 * The joints of the body side the camera sees best (side view hides the other side), in aspect-corrected space.
 * Every joint must be seen on the chosen side; otherwise null (the frame is not measured).
 */
export type SideJoints<Indexes extends readonly number[]> = { -readonly [Key in keyof Indexes]: Point };

export function pickSeenSide<Indexes extends readonly number[]>(
  landmarks: readonly PoseLandmark[],
  aspectRatio: number,
  sides: readonly Indexes[],
): SideJoints<Indexes> | null {
  const candidates = sides.map((indexes) => indexes.map((index) => landmarks[index]))
    .filter((side): side is PoseLandmark[] => side.every((landmark) => isLandmarkSeen(landmark)));
  if (candidates.length === 0) return null;
  const best = candidates.reduce((chosen, side) => (averageVisibility(side) > averageVisibility(chosen) ? side : chosen));
  // Same length as the index list of the side, by construction.
  return best.map((landmark) => toAspectSpace(landmark, aspectRatio)) as unknown as SideJoints<Indexes>;
}
