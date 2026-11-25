import {
  SQUAT_DEPTH_MAX_THIGH_ANGLE,
  SQUAT_DESCENT_KNEE_ANGLE,
  SQUAT_HEEL_RISE_MAX_RATIO,
  SQUAT_KNEE_TRAVEL_INFO_RATIO,
  SQUAT_MIN_DESCENT_MS,
  SQUAT_REP_MAX_BOTTOM_KNEE_ANGLE,
  SQUAT_TOP_KNEE_ANGLE,
  SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES,
  SQUAT_TRUNK_LEAN_MAX_DEGREES,
} from "@/lib/constants/technique-rules";
import { angleAtVertex, angleFromVertical, distanceBetween, elevationAngle } from "@/lib/technique/geometry";
import { POSE_LANDMARK as L } from "@/lib/technique/pose-landmarks";
import type { FrameMeasures, TechniqueRep } from "@/lib/technique/rep-types";
import { otherReference, readMetric, readValue, selectIssues, type MetricSpec, type MovementPattern } from "./pattern-types";
import { pickSeenSide } from "./side-joints";

const SIDES = [
  [L.leftShoulder, L.leftHip, L.leftKnee, L.leftAnkle, L.leftHeel, L.leftFootIndex],
  [L.rightShoulder, L.rightHip, L.rightKnee, L.rightAnkle, L.rightHeel, L.rightFootIndex],
] as const;
const MS_PER_SECOND = 1000;
const RATIO_BOUNDS = [-10, 10] as const;

/**
 * Side view: knee angle (counting signal), thigh against the horizontal (0 = parallel), trunk from the vertical,
 * heel height relative to the toes and knee ahead of the toes (shares of the shin length).
 */
function measureFrame(landmarks: Parameters<MovementPattern["measureFrame"]>[0], aspectRatio: number): FrameMeasures | null {
  const joints = pickSeenSide(landmarks, aspectRatio, SIDES);
  if (!joints) return null;
  const [shoulder, hip, knee, ankle, heel, toe] = joints;
  const shinLength = distanceBetween(knee, ankle);
  if (shinLength === 0) return null;
  const kneeAngle = angleAtVertex(hip, knee, ankle);
  const values = {
    kneeAngle,
    thighAngle: elevationAngle(hip, knee),
    trunkLean: angleFromVertical(hip, shoulder),
    heelToToeRatio: (toe.y - heel.y) / shinLength,
    kneeTravelRatio: ((knee.x - toe.x) * Math.sign(toe.x - heel.x)) / shinLength,
  };
  return { signal: kneeAngle, values };
}

const metrics: readonly MetricSpec[] = [
  { name: "minKneeAngle", keep: "min", read: (values) => readValue(values, "kneeAngle"), bounds: [0, 180] },
  { name: "minThighAngle", keep: "min", read: (values) => readValue(values, "thighAngle"), bounds: [-90, 90] },
  { name: "maxTrunkLean", keep: "max", read: (values) => readValue(values, "trunkLean"), bounds: [0, 180] },
  { name: "maxKneeTravelRatio", keep: "max", read: (values) => readValue(values, "kneeTravelRatio"), bounds: RATIO_BOUNDS },
  { name: "maxHeelRiseRatio", keep: "max", read: (values, rest) => readValue(values, "heelToToeRatio") - (rest.heelToToeRatio ?? readValue(values, "heelToToeRatio")), bounds: RATIO_BOUNDS },
];

function hasFatigue(rep: TechniqueRep, reference: TechniqueRep | undefined): boolean {
  const other = otherReference(rep, reference);
  return other !== undefined && readMetric(rep, "maxTrunkLean") - readMetric(other, "maxTrunkLean") >= SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES;
}

/** D5 calibrated with the user's videos (POS-001). */
function detectIssues(rep: TechniqueRep, reference: TechniqueRep | undefined) {
  return selectIssues([
    ["shallow_depth", readMetric(rep, "minThighAngle") > SQUAT_DEPTH_MAX_THIGH_ANGLE],
    ["heel_lift", readMetric(rep, "maxHeelRiseRatio") > SQUAT_HEEL_RISE_MAX_RATIO],
    ["fast_descent", rep.descentMs < SQUAT_MIN_DESCENT_MS],
    ["trunk_lean", readMetric(rep, "maxTrunkLean") > SQUAT_TRUNK_LEAN_MAX_DEGREES],
    ["trunk_lean_fatigue", hasFatigue(rep, reference)],
    ["knee_forward", readMetric(rep, "maxKneeTravelRatio") > SQUAT_KNEE_TRAVEL_INFO_RATIO],
  ]);
}

function describeThigh(thighAngle: number): string {
  const degrees = Math.round(Math.abs(thighAngle));
  // Any angle above parallel is shown as at least 1°, so "0° above" never contradicts a shallow_depth issue.
  return thighAngle > 0 ? `thigh ${Math.max(1, degrees)}° above parallel` : `thigh ${degrees}° below parallel`;
}

export const squatPattern: MovementPattern = {
  id: "squat",
  measureFrame,
  counter: { direction: "decreasing", restAt: SQUAT_TOP_KNEE_ANGLE, startAt: SQUAT_DESCENT_KNEE_ANGLE, targetAt: SQUAT_REP_MAX_BOTTOM_KNEE_ANGLE },
  metrics,
  detectIssues,
  spokenCues: ["shallow_depth", "trunk_lean_fatigue", "fast_descent"],
  issueDegrees: (_issue, rep, reference) => readMetric(rep, "maxTrunkLean") - (reference ? readMetric(reference, "maxTrunkLean") : readMetric(rep, "maxTrunkLean")),
  describeRulesForPrompt: () => [
    `shallow_depth: thigh above parallel by more than ${SQUAT_DEPTH_MAX_THIGH_ANGLE}°`,
    `trunk_lean: trunk more than ${SQUAT_TRUNK_LEAN_MAX_DEGREES}° from vertical`,
    `trunk_lean_fatigue: trunk ${SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES}° or more beyond the first evaluated rep`,
    `heel_lift: heel rise above ${SQUAT_HEEL_RISE_MAX_RATIO} of the shin length (unreliable in 2D)`,
    `fast_descent: descent faster than ${(SQUAT_MIN_DESCENT_MS / MS_PER_SECOND).toFixed(1)} s`,
    "knee_forward: knee ahead of the toes (common, informative)",
  ],
  describeRepForPrompt: (rep) => [
    `knee ${Math.round(readMetric(rep, "minKneeAngle"))}°`,
    describeThigh(readMetric(rep, "minThighAngle")),
    `trunk ${Math.round(readMetric(rep, "maxTrunkLean"))}°`,
    `descent ${(rep.descentMs / MS_PER_SECOND).toFixed(1)} s`,
    `heel rise ${readMetric(rep, "maxHeelRiseRatio").toFixed(2)}`,
    `knee past toes ${readMetric(rep, "maxKneeTravelRatio").toFixed(2)}`,
  ].join(", "),
};

