/** MediaPipe Pose Landmarker returns 33 normalized landmarks in this fixed order. */
export const POSE_LANDMARK_COUNT = 33;

export const POSE_LANDMARK = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

const L = POSE_LANDMARK;

/** Bones drawn over the camera image (only the ones the analysis uses, to keep the drawing clean). */
export const SKELETON_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [L.leftShoulder, L.rightShoulder],
  [L.leftShoulder, L.leftElbow],
  [L.leftElbow, L.leftWrist],
  [L.rightShoulder, L.rightElbow],
  [L.rightElbow, L.rightWrist],
  [L.leftShoulder, L.leftHip],
  [L.rightShoulder, L.rightHip],
  [L.leftHip, L.rightHip],
  [L.leftHip, L.leftKnee],
  [L.leftKnee, L.leftAnkle],
  [L.leftAnkle, L.leftHeel],
  [L.leftHeel, L.leftFootIndex],
  [L.leftAnkle, L.leftFootIndex],
  [L.rightHip, L.rightKnee],
  [L.rightKnee, L.rightAnkle],
  [L.rightAnkle, L.rightHeel],
  [L.rightHeel, L.rightFootIndex],
  [L.rightAnkle, L.rightFootIndex],
];

/** Each body part is seen when at least one of its landmarks is (a side view hides one side). */
export const BODY_PART_LANDMARKS = {
  head: [L.nose, L.leftEar, L.rightEar],
  torso: [L.leftShoulder, L.rightShoulder, L.leftHip, L.rightHip],
  knees: [L.leftKnee, L.rightKnee],
  feet: [L.leftAnkle, L.rightAnkle, L.leftHeel, L.rightHeel, L.leftFootIndex, L.rightFootIndex],
} as const;
