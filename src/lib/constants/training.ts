/** Plan and workout domain values (stored in English, see PRD glossary). */
export const PLAN_GOALS = ["hypertrophy", "weight_loss", "strength", "conditioning"] as const;
export const PLAN_ORIGINS = ["ai", "manual"] as const;
export const PLAN_STATUSES = { active: "active", archived: "archived" } as const;

/** Default plan validity from the PRD (6 weeks). */
export const DEFAULT_PLAN_VALIDITY_WEEKS = 6;

/** Calendar used for "today" (validity, sessions). Single-user MVP in Brazil. */
export const APP_TIME_ZONE = "America/Sao_Paulo";
