import { PLAN_VALIDITY_LAST_DAY_OFFSET } from "@/lib/constants/plan-generation";
import { APP_TIME_ZONE, DEFAULT_PLAN_VALIDITY_WEEKS } from "@/lib/constants/training";
import { toDateInTimeZone } from "@/lib/training/plan-validity";

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MILLISECONDS_PER_DAY).toISOString().slice(0, "YYYY-MM-DD".length);
}

/** Plan starts today (app calendar) and stays valid for 6 weeks, the last day included. */
export function computeGeneratedPlanDates(now: Date): { startsOn: string; validUntil: string } {
  const startsOn = toDateInTimeZone(now, APP_TIME_ZONE);
  const lastDayOffset = DEFAULT_PLAN_VALIDITY_WEEKS * DAYS_PER_WEEK - PLAN_VALIDITY_LAST_DAY_OFFSET;
  return { startsOn, validUntil: addDays(startsOn, lastDayOffset) };
}
