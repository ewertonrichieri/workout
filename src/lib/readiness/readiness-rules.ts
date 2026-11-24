import { DEFAULT_SESSION_MINUTES } from "@/lib/constants/assessment";
import {
  AVAILABLE_MINUTES_OPTIONS,
  ENERGY_LEVEL_NEEDING_ADJUSTMENT,
  SEVERE_PAIN_INTENSITY,
  SLEEP_QUALITY_NEEDING_ADJUSTMENT,
} from "@/lib/constants/readiness";
import type { ReadinessCheckinInput, ReportedPain } from "./readiness-schema";

/**
 * Decision D2: only a lighter day calls the AI (step 3B.2).
 * Without an assessment there is no reference time, so time alone never asks for it.
 */
export function needsAdjustment(checkin: ReadinessCheckinInput, sessionMinutes: number | null): boolean {
  const isShortOnTime = sessionMinutes !== null && checkin.availableMinutes < sessionMinutes;
  return (
    checkin.sleepQuality === SLEEP_QUALITY_NEEDING_ADJUSTMENT ||
    checkin.energyLevel === ENERGY_LEVEL_NEEDING_ADJUSTMENT ||
    checkin.pains.length > 0 ||
    isShortOnTime
  );
}

/** A severe pain reinforces the health notice. */
export function hasSeverePain(pains: readonly ReportedPain[]): boolean {
  return pains.some((pain) => pain.intensity === SEVERE_PAIN_INTENSITY);
}

export function pickDefaultAvailableMinutes(sessionMinutes: number | null): number {
  return sessionMinutes ?? DEFAULT_SESSION_MINUTES;
}

/** Quick options plus the assessment time (decision D3), ascending, without repeats. */
export function buildAvailableMinutesOptions(sessionMinutes: number | null): number[] {
  const options = new Set<number>([...AVAILABLE_MINUTES_OPTIONS, pickDefaultAvailableMinutes(sessionMinutes)]);
  return [...options].sort((first, second) => first - second);
}
