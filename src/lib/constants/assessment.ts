/** Assessment (anamnese) domain values and limits (spec 011, step 3.1). Goals reuse PLAN_GOALS. */
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const SPLIT_PREFERENCES = ["ai_decides", "full_body", "split"] as const;
export const DEFAULT_SPLIT_PREFERENCE = "ai_decides";

export const MIN_DAYS_PER_WEEK = 1;
export const MAX_DAYS_PER_WEEK = 7;

export const MIN_SESSION_MINUTES = 10;
export const MAX_SESSION_MINUTES = 240;
export const SESSION_MINUTES_STEP = 5;

export const MAX_LIMITATIONS_LENGTH = 1000;
/** Upper bound of equipment items in one assessment (the catalog has 30). */
export const MAX_ASSESSMENT_EQUIPMENT = 100;
export const MAX_EQUIPMENT_SLUG_LENGTH = 100;

/** Starting values of the form for a user without a previous assessment. */
export const DEFAULT_DAYS_PER_WEEK = 3;
export const DEFAULT_SESSION_MINUTES = 60;
