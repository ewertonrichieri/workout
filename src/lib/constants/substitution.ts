import type { ClaudeEffort } from "@/lib/constants/ai";

/** Exercise substitution on the spot (spec 012, step 3B.4). */
export const SUBSTITUTION_REASONS = ["equipment_busy", "equipment_broken", "other"] as const;
export type SubstitutionReason = (typeof SUBSTITUTION_REASONS)[number];
/** With these reasons the original's equipment is out, except what never runs out. */
export const REASONS_WITHOUT_ORIGINAL_EQUIPMENT: readonly SubstitutionReason[] = ["equipment_busy", "equipment_broken"];
export const ALWAYS_AVAILABLE_EQUIPMENT = "bodyweight";

export const MAX_SUBSTITUTION_SUGGESTIONS = 3;
/** Keeps the AI call short; the list is already ranked by shared muscles. */
export const MAX_SUBSTITUTION_CANDIDATES_FOR_AI = 40;
/** Exercises already shown today (AI adjustment or other swaps), sent only to filter the options. */
export const MAX_EXCLUDED_SLUGS = 12;
export const MAX_SUBSTITUTION_REASON_LENGTH = 300;

export const SUBSTITUTION_OPERATION = "workout.substitute";
/** A short choice among a ranked list, made at the gym: speed first; reevaluate after the real call. */
export const SUBSTITUTION_EFFORT: ClaudeEffort = "low";
