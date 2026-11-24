/** Plan and workout domain values (stored in English, see PRD glossary). */
export const PLAN_GOALS = ["hypertrophy", "weight_loss", "strength", "conditioning"] as const;
export const PLAN_ORIGINS = ["ai", "manual"] as const;
export const PLAN_STATUSES = { active: "active", archived: "archived" } as const;

/** Default plan validity from the PRD (6 weeks). */
export const DEFAULT_PLAN_VALIDITY_WEEKS = 6;

/** Calendar used for "today" (validity, sessions). Single-user MVP in Brazil. */
export const APP_TIME_ZONE = "America/Sao_Paulo";

/** URL search param that selects the workout tab by label (e.g. /workout?workout=B). */
export const WORKOUT_QUERY_PARAM = "workout";

/** Set logging limits (step 2.4); load mirrors `set_logs.load_kg numeric(6, 2)`. */
export const MAX_REPS_DONE = 999;
export const MAX_LOAD_KG = 9999.99;
export const LOAD_DECIMAL_PLACES = 2;

/** Device-only draft of the sets typed before "Finalizar treino" (step 2.6). */
export const WORKOUT_DRAFT_STORAGE_PREFIX = "workout-draft";

/** Upper bound of sets accepted when finishing a workout (guards the request size). */
export const MAX_SETS_PER_SESSION = 200;

/** History (step 2.8): sessions per page in "Agenda" and how much progression is shown. */
export const HISTORY_PAGE_SIZE = 20;
export const MAX_PROGRESS_SESSIONS = 50;
/** Set logs read to build the progression (several per session). */
export const MAX_PROGRESS_SET_LOGS = 1000;

/** Locale of numbers shown to the user (pt-BR only in the MVP). */
export const APP_LOCALE = "pt-BR";
