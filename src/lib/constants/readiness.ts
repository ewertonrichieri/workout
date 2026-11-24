/** Pre-workout check-in domain values and limits (spec 012, step 3B.1). */
export const SLEEP_QUALITIES = ["poor", "ok", "good"] as const;
export const ENERGY_LEVELS = ["low", "normal", "high"] as const;
export const BODY_REGIONS = ["neck", "shoulders", "upper_back", "lower_back", "chest", "elbows", "wrists", "hips", "knees", "ankles"] as const;
export const PAIN_INTENSITIES = ["mild", "moderate", "severe"] as const;

export type SleepQuality = (typeof SLEEP_QUALITIES)[number];
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];
export type BodyRegion = (typeof BODY_REGIONS)[number];
export type PainIntensity = (typeof PAIN_INTENSITIES)[number];

/** Answers that ask for a lighter day (decision D2). */
export const SLEEP_QUALITY_NEEDING_ADJUSTMENT: SleepQuality = "poor";
export const ENERGY_LEVEL_NEEDING_ADJUSTMENT: EnergyLevel = "low";
export const SEVERE_PAIN_INTENSITY: PainIntensity = "severe";

/** Starting answers of the form, so a normal day takes a single tap. */
export const DEFAULT_SLEEP_QUALITY: SleepQuality = "ok";
export const DEFAULT_ENERGY_LEVEL: EnergyLevel = "normal";
export const DEFAULT_PAIN_INTENSITY: PainIntensity = "mild";

/** Quick time options (decision D3); the assessment time is added when missing. */
export const AVAILABLE_MINUTES_OPTIONS = [20, 30, 45, 60, 90] as const;
