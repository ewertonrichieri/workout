import { APP_LOCALE } from "@/lib/constants/training";
import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import { DISPLAY_ANGLE_STEP_DEGREES, ROW_SHORT_PULL_WRIST_HEIGHT, SQUAT_DEPTH_MAX_THIGH_ANGLE, SQUAT_MIN_DESCENT_MS } from "@/lib/constants/technique-rules";
import { readMetric, type MovementPattern } from "@/lib/technique/patterns/pattern-types";
import type { RepIssue } from "@/lib/technique/rep-rules";
import type { TechniqueRep } from "@/lib/technique/rep-types";
import { translate } from "@/lib/i18n/translate";

const MS_PER_SECOND = 1000;
const secondsFormatter = new Intl.NumberFormat(APP_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 2D angles are approximate: always shown rounded to 5° (spec 014). */
export function roundAngle(degrees: number): number {
  return Math.round(degrees / DISPLAY_ANGLE_STEP_DEGREES) * DISPLAY_ANGLE_STEP_DEGREES || 0;
}

export function describeRepCount(count: number): string {
  return translate(count === 1 ? "technique.summary.repCountOne" : "technique.summary.repCountOther", { count });
}

function describeDescent(rep: TechniqueRep): string {
  return translate("technique.summary.descent", { seconds: secondsFormatter.format(rep.descentMs / MS_PER_SECOND) });
}

function describeSquat(rep: TechniqueRep): string[] {
  const thighAngle = readMetric(rep, "minThighAngle");
  const depth = thighAngle <= SQUAT_DEPTH_MAX_THIGH_ANGLE
    ? translate("technique.summary.depthOk")
    : translate("technique.summary.depthShallow", { degrees: Math.max(roundAngle(thighAngle), DISPLAY_ANGLE_STEP_DEGREES) });
  return [depth, translate("technique.summary.trunk", { degrees: roundAngle(readMetric(rep, "maxTrunkLean")) }), describeDescent(rep)];
}

function describeHinge(rep: TechniqueRep): string[] {
  return [
    translate("technique.summary.hip", { degrees: roundAngle(readMetric(rep, "minHipAngle")) }),
    translate("technique.summary.knee", { degrees: roundAngle(readMetric(rep, "minKneeAngle")) }),
    describeDescent(rep),
  ];
}

function describeTrunkRise(rep: TechniqueRep): string {
  const degrees = roundAngle(readMetric(rep, "trunkRise"));
  return degrees < DISPLAY_ANGLE_STEP_DEGREES ? translate("technique.summary.trunkSteady") : translate("technique.summary.trunkRise", { degrees });
}

function describeRow(rep: TechniqueRep): string[] {
  const isAboveHip = readMetric(rep, "maxWristHeight") >= ROW_SHORT_PULL_WRIST_HEIGHT;
  return [
    translate(isAboveHip ? "technique.summary.pullAboveHip" : "technique.summary.pullAtHip"),
    describeTrunkRise(rep),
    translate("technique.summary.trunkInclination", { degrees: roundAngle(readMetric(rep, "restTrunkLean")) }),
  ];
}

const MEASURE_LINES: Readonly<Record<TechniqueRuleSetId, (rep: TechniqueRep) => string[]>> = { squat: describeSquat, hinge: describeHinge, row: describeRow };

/** The numbers of one evaluated rep, in Portuguese, for its movement pattern (D13). */
export function describeRepMeasures(patternId: TechniqueRuleSetId, rep: TechniqueRep): string[] {
  return MEASURE_LINES[patternId](rep);
}

/** "Corrigir: …" / "Atenção: …" / "Para conferir: …". */
export function describeIssue(pattern: MovementPattern, { issue, severity }: RepIssue, rep: TechniqueRep, reference: TechniqueRep | undefined): string {
  const degrees = roundAngle(pattern.issueDegrees(issue, rep, reference));
  const minimumSeconds = secondsFormatter.format(SQUAT_MIN_DESCENT_MS / MS_PER_SECOND);
  const text = translate(`technique.summary.issues.${issue}`, { degrees, seconds: minimumSeconds });
  return `${translate(`technique.summary.severity.${severity}`)}: ${text}`;
}
