import { APP_LOCALE } from "@/lib/constants/training";
import { DISPLAY_ANGLE_STEP_DEGREES, SQUAT_DEPTH_MAX_THIGH_ANGLE, SQUAT_MIN_DESCENT_MS } from "@/lib/constants/technique-rules";
import type { SquatRep } from "@/lib/technique/squat/squat-rep-tracker";
import type { RepIssue } from "@/lib/technique/squat/squat-rules";
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

export function describeDepth(rep: SquatRep): string {
  if (rep.minThighAngle <= SQUAT_DEPTH_MAX_THIGH_ANGLE) return translate("technique.summary.depthOk");
  return translate("technique.summary.depthShallow", { degrees: Math.max(roundAngle(rep.minThighAngle), DISPLAY_ANGLE_STEP_DEGREES) });
}

export function describeTrunk(rep: SquatRep): string {
  return translate("technique.summary.trunk", { degrees: roundAngle(rep.maxTrunkLean) });
}

export function describeDescent(rep: SquatRep): string {
  return translate("technique.summary.descent", { seconds: secondsFormatter.format(rep.descentMs / MS_PER_SECOND) });
}

/** "Corrigir: …" / "Atenção: …" / "Para conferir: …". */
export function describeIssue({ issue, severity }: RepIssue, rep: SquatRep, referenceTrunkLean: number | null): string {
  const extraDegrees = roundAngle(rep.maxTrunkLean - (referenceTrunkLean ?? rep.maxTrunkLean));
  const minimumSeconds = secondsFormatter.format(SQUAT_MIN_DESCENT_MS / MS_PER_SECOND);
  const text = translate(`technique.summary.issues.${issue}`, { degrees: extraDegrees, seconds: minimumSeconds });
  return `${translate(`technique.summary.severity.${severity}`)}: ${text}`;
}
