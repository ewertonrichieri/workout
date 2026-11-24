import { APP_ROUTES } from "@/lib/constants/routes";
import { WORKOUT_QUERY_PARAM } from "@/lib/constants/training";
import { translate, type TranslationKey } from "@/lib/i18n/translate";
import type { PlanValidity, WorkoutExercise } from "@/lib/training/plan-types";

const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;
const DETAIL_SEPARATOR = " · ";

function pluralize(count: number, oneKey: TranslationKey, otherKey: TranslationKey): string {
  return translate(count === 1 ? oneKey : otherKey, { count });
}

/** ISO calendar date (YYYY-MM-DD) shown as DD/MM/AAAA, without time zone conversion. */
export function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

type Prescription = Pick<WorkoutExercise, "sets" | "repsMin" | "repsMax">;

export function describeSetsAndReps({ sets, repsMin, repsMax }: Prescription): string {
  const setsText = pluralize(sets, "training.setsOne", "training.setsOther");
  const repsText =
    repsMin === repsMax
      ? pluralize(repsMin, "training.repsOne", "training.repsOther")
      : translate("training.repsRange", { min: repsMin, max: repsMax });
  return [setsText, repsText].join(DETAIL_SEPARATOR);
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  if (minutes === 0) return translate("training.durationSeconds", { seconds });
  if (seconds === 0) return translate("training.durationMinutes", { minutes });
  return translate("training.durationMinutesSeconds", { minutes, seconds });
}

/** Prescribed rest as information only (no timer, see spec 010); `null` when not prescribed. */
export function describeRest(restSeconds: number | null): string | null {
  return restSeconds === null ? null : translate("training.rest", { duration: formatDuration(restSeconds) });
}

function describeRemainingDays(remainingDays: number): string {
  if (remainingDays === 0) return translate("training.lastDay");
  return pluralize(remainingDays, "training.remainingDaysOne", "training.remainingDaysOther");
}

export function describeValidity(validity: PlanValidity, validUntil: string): string {
  const date = formatCalendarDate(validUntil);
  if (validity.isExpired) return translate("training.expired", { date });
  return [translate("training.validUntil", { date }), describeRemainingDays(validity.remainingDays)].join(DETAIL_SEPARATOR);
}

export function describeValidityProgress(progress: number): { percent: number; text: string } {
  const percent = Math.round(progress * PERCENT);
  return { percent, text: translate("training.validityProgressValue", { percent }) };
}

export function buildWorkoutHref(label: string): string {
  return `${APP_ROUTES.workout}?${new URLSearchParams({ [WORKOUT_QUERY_PARAM]: label })}`;
}

/** Target reps used as input hint: "10" or "8 a 12". */
export function describeRepsTarget({ repsMin, repsMax }: Pick<WorkoutExercise, "repsMin" | "repsMax">): string {
  return repsMin === repsMax ? translate("training.repsTargetOne", { count: repsMin }) : translate("training.repsTargetRange", { min: repsMin, max: repsMax });
}
