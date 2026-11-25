import {
  ROW_REP_MIN_PEAK_WRIST_HEIGHT,
  ROW_REST_MAX_WRIST_HEIGHT,
  ROW_SHORT_PULL_WRIST_HEIGHT,
  ROW_START_MIN_WRIST_HEIGHT,
  ROW_TRUNK_RISE_DEGREES,
  ROW_UPRIGHT_TRUNK_DEGREES,
} from "@/lib/constants/technique-rules";
import { angleAtVertex, angleFromVertical, distanceBetween } from "@/lib/technique/geometry";
import { POSE_LANDMARK as L } from "@/lib/technique/pose-landmarks";
import type { FrameMeasures, TechniqueRep } from "@/lib/technique/rep-types";
import { readMetric, readValue, selectIssues, type MetricSpec, type MovementPattern } from "./pattern-types";
import { pickSeenSide } from "./side-joints";

const MS_PER_SECOND = 1000;

const SIDES = [
  [L.leftShoulder, L.leftElbow, L.leftWrist, L.leftHip],
  [L.rightShoulder, L.rightElbow, L.rightWrist, L.rightHip],
] as const;

/**
 * Side view: wrist height above the hip in torso lengths (counting signal: −0.3 hanging, positive when pulled up to
 * the belly), trunk from the vertical and elbow angle.
 */
function measureFrame(landmarks: Parameters<MovementPattern["measureFrame"]>[0], aspectRatio: number): FrameMeasures | null {
  const joints = pickSeenSide(landmarks, aspectRatio, SIDES);
  if (!joints) return null;
  const [shoulder, elbow, wrist, hip] = joints;
  const torsoLength = distanceBetween(shoulder, hip);
  if (torsoLength === 0) return null;
  const wristHeight = (hip.y - wrist.y) / torsoLength;
  return { signal: wristHeight, values: { wristHeight, trunkLean: angleFromVertical(hip, shoulder), elbowAngle: angleAtVertex(shoulder, elbow, wrist) } };
}

const metrics: readonly MetricSpec[] = [
  { name: "maxWristHeight", keep: "max", read: (values) => readValue(values, "wristHeight"), bounds: [-10, 10] },
  /** How much the trunk rose during the pull, against the trunk while hanging before it (cheating with the back). */
  { name: "trunkRise", keep: "max", read: (values, rest) => (rest.trunkLean ?? readValue(values, "trunkLean")) - readValue(values, "trunkLean"), bounds: [-180, 180] },
  { name: "restTrunkLean", keep: "max", read: (values, rest) => rest.trunkLean ?? readValue(values, "trunkLean"), bounds: [0, 180] },
  { name: "minElbowAngle", keep: "min", read: (values) => readValue(values, "elbowAngle"), bounds: [0, 180] },
];

/** D14: wrist height and trunk rise need no comparison with the first rep; the trunk inclination is a reference. */
function detectIssues(rep: TechniqueRep) {
  return selectIssues([
    ["row_short_pull", readMetric(rep, "maxWristHeight") < ROW_SHORT_PULL_WRIST_HEIGHT],
    ["row_trunk_rise", readMetric(rep, "trunkRise") >= ROW_TRUNK_RISE_DEGREES],
    ["row_trunk_upright", readMetric(rep, "restTrunkLean") < ROW_UPRIGHT_TRUNK_DEGREES],
  ]);
}

export const rowPattern: MovementPattern = {
  id: "row",
  measureFrame,
  counter: { direction: "increasing", restAt: ROW_REST_MAX_WRIST_HEIGHT, startAt: ROW_START_MIN_WRIST_HEIGHT, targetAt: ROW_REP_MIN_PEAK_WRIST_HEIGHT },
  metrics,
  detectIssues,
  spokenCues: ["row_short_pull", "row_trunk_rise"],
  issueDegrees: (issue, rep) => (issue === "row_trunk_rise" ? readMetric(rep, "trunkRise") : readMetric(rep, "restTrunkLean")),
  describeRulesForPrompt: () => [
    `row_short_pull: the hand stopped below ${ROW_SHORT_PULL_WRIST_HEIGHT} torso lengths above the hip (did not reach the belly)`,
    `row_trunk_rise: the trunk rose ${ROW_TRUNK_RISE_DEGREES}° or more during the pull (using the back to pull, often when pulling too high)`,
    `row_trunk_upright: trunk less than ${ROW_UPRIGHT_TRUNK_DEGREES}° from vertical while hanging; rows are usually done at 40–65° (informative reference)`,
  ],
  describeRepForPrompt: (rep) => [
    `hand reached ${readMetric(rep, "maxWristHeight").toFixed(2)} torso lengths above the hip`,
    `trunk rose ${Math.round(readMetric(rep, "trunkRise"))}° during the pull`,
    `trunk ${Math.round(readMetric(rep, "restTrunkLean"))}° from vertical while hanging`,
    `pull ${(rep.descentMs / MS_PER_SECOND).toFixed(1)} s`,
  ].join(", "),
};
