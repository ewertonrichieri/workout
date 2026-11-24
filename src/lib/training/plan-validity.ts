import type { PlanValidity } from "./plan-types";

const MILLISECONDS_PER_DAY = 86_400_000;

interface ValidityInput {
  startsOn: string;
  validUntil: string;
  today: string;
}

/** Days between two ISO calendar dates, ignoring time zones and daylight saving. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MILLISECONDS_PER_DAY);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Honest progress of the plan validity: elapsed share of the period, clamped to [0, 1]. */
export function computePlanValidity({ startsOn, validUntil, today }: ValidityInput): PlanValidity {
  const totalDays = daysBetween(startsOn, validUntil);
  const elapsedDays = clamp(daysBetween(startsOn, today), 0, totalDays);
  return {
    totalDays,
    elapsedDays,
    remainingDays: totalDays - elapsedDays,
    progress: totalDays === 0 ? 1 : elapsedDays / totalDays,
    isExpired: daysBetween(validUntil, today) > 0,
  };
}

/** Calendar date (YYYY-MM-DD) of an instant in the given IANA time zone. */
export function toDateInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
