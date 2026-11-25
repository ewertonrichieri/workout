import {
  HINGE_DESCENT_HIP_ANGLE,
  HINGE_KNEE_BEND_DEGREES,
  HINGE_REP_MAX_BOTTOM_HIP_ANGLE,
  HINGE_SHORT_RANGE_DEGREES,
  HINGE_SQUAT_LIKE_KNEE_ANGLE,
  HINGE_TOP_HIP_ANGLE,
  SQUAT_MIN_DESCENT_MS,
  type TechniqueIssue,
} from "@/lib/constants/technique-rules";
import { angleAtVertex, angleFromVertical } from "@/lib/technique/geometry";
import { POSE_LANDMARK as L } from "@/lib/technique/pose-landmarks";
import type { FrameMeasures, TechniqueRep } from "@/lib/technique/rep-types";
import { otherReference, readMetric, readValue, selectIssues, type MetricSpec, type MovementPattern } from "./pattern-types";
import { pickSeenSide } from "./side-joints";

const SIDES = [
  [L.leftShoulder, L.leftHip, L.leftKnee, L.leftAnkle],
  [L.rightShoulder, L.rightHip, L.rightKnee, L.rightAnkle],
] as const;
const MS_PER_SECOND = 1000;
/** Same tempo rule as the squat: a descent this fast deserves a control warning (D14). */
const HINGE_MIN_DESCENT_MS = SQUAT_MIN_DESCENT_MS;

/** Side view: hip angle shoulder–hip–knee (counting signal), knee angle and trunk from the vertical. */
function measureFrame(landmarks: Parameters<MovementPattern["measureFrame"]>[0], aspectRatio: number): FrameMeasures | null {
  const joints = pickSeenSide(landmarks, aspectRatio, SIDES);
  if (!joints) return null;
  const [shoulder, hip, knee, ankle] = joints;
  const hipAngle = angleAtVertex(shoulder, hip, knee);
  return { signal: hipAngle, values: { hipAngle, kneeAngle: angleAtVertex(hip, knee, ankle), trunkLean: angleFromVertical(hip, shoulder) } };
}

const metrics: readonly MetricSpec[] = [
  { name: "minHipAngle", keep: "min", read: (values) => readValue(values, "hipAngle"), bounds: [0, 180] },
  { name: "minKneeAngle", keep: "min", read: (values) => readValue(values, "kneeAngle"), bounds: [0, 180] },
  { name: "maxTrunkLean", keep: "max", read: (values) => readValue(values, "trunkLean"), bounds: [0, 180] },
];

/** How much more open the hip stayed than in the first rep (short range), and how much more the knee bent. */
function relativeDegrees(issue: TechniqueIssue, rep: TechniqueRep, reference: TechniqueRep): number {
  if (issue === "hinge_short_range") return readMetric(rep, "minHipAngle") - readMetric(reference, "minHipAngle");
  return readMetric(reference, "minKneeAngle") - readMetric(rep, "minKneeAngle");
}

/** D14: relative rules (Atenção), the tempo rule and the literature reference (Para conferir). */
function detectIssues(rep: TechniqueRep, reference: TechniqueRep | undefined): TechniqueIssue[] {
  const other = otherReference(rep, reference);
  return selectIssues([
    ["hinge_short_range", other !== undefined && relativeDegrees("hinge_short_range", rep, other) >= HINGE_SHORT_RANGE_DEGREES],
    ["hinge_knee_bend", other !== undefined && relativeDegrees("hinge_knee_bend", rep, other) >= HINGE_KNEE_BEND_DEGREES],
    ["fast_descent", rep.descentMs < HINGE_MIN_DESCENT_MS],
    ["hinge_squat_like", readMetric(rep, "minKneeAngle") < HINGE_SQUAT_LIKE_KNEE_ANGLE],
  ]);
}

export const hingePattern: MovementPattern = {
  id: "hinge",
  measureFrame,
  counter: { direction: "decreasing", restAt: HINGE_TOP_HIP_ANGLE, startAt: HINGE_DESCENT_HIP_ANGLE, targetAt: HINGE_REP_MAX_BOTTOM_HIP_ANGLE },
  metrics,
  detectIssues,
  spokenCues: ["hinge_short_range", "hinge_knee_bend", "fast_descent"],
  issueDegrees: (issue, rep, reference) => (reference ? relativeDegrees(issue, rep, reference) : 0),
  describeRulesForPrompt: () => [
    `hinge_short_range: hip ${HINGE_SHORT_RANGE_DEGREES}° or more less closed than in the first evaluated rep (range dropping)`,
    `hinge_knee_bend: knee ${HINGE_KNEE_BEND_DEGREES}° or more more bent than in the first evaluated rep (turning into a squat)`,
    `fast_descent: descent faster than ${(HINGE_MIN_DESCENT_MS / MS_PER_SECOND).toFixed(1)} s`,
    `hinge_squat_like: knee below ${HINGE_SQUAT_LIKE_KNEE_ANGLE}° at the bottom; in a Romanian deadlift the knee stays almost straight (informative reference)`,
  ],
  describeRepForPrompt: (rep) => [
    `hip ${Math.round(readMetric(rep, "minHipAngle"))}° at the bottom`,
    `knee ${Math.round(readMetric(rep, "minKneeAngle"))}°`,
    `trunk ${Math.round(readMetric(rep, "maxTrunkLean"))}° from vertical`,
    `descent ${(rep.descentMs / MS_PER_SECOND).toFixed(1)} s`,
  ].join(", "),
};
