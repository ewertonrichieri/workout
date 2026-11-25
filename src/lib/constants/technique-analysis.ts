import type { ClaudeEffort } from "@/lib/constants/ai";

/** AI analysis after the set (spec 014, step 5.4). */
export const TECHNIQUE_ANALYSIS_OPERATION = "technique.analyze";
/** Decision D12: short explanation of numbers already measured on the phone; reevaluate after the real call. */
export const TECHNIQUE_ANALYSIS_EFFORT: ClaudeEffort = "low";
export const TECHNIQUE_ANALYSES_ENDPOINT = "/api/technique-analyses";

/** Above any real set; also bounds the request size. */
export const MAX_ANALYSIS_REPS = 40;
/** Bounds of the numbers the phone sends (anything outside is rejected with 400). */
export const MAX_REP_DURATION_MS = 60_000;
export const MAX_FRAMES_PER_REP = 3_600;
export const MAX_RATIO_MAGNITUDE = 10;

/** Scores from 0 to 10 (spec 014: "nota por repetição"). */
export const TECHNIQUE_SCORE_MAX = 10;
export const MAX_STRENGTHS = 3;
export const MAX_CORRECTIONS = 4;
export const MAX_FEEDBACK_TEXT_LENGTH = 240;
/** Metrics are sent rounded: angles to 0.1°, ratios to 0.001. */
export const ANGLE_DECIMALS = 1;
export const RATIO_DECIMALS = 3;
