import { PLAN_GENERATION_OPERATION } from "@/lib/constants/plan-generation";
import { ADJUSTMENT_OPERATION } from "@/lib/constants/readiness";

/**
 * Per-user limits of the AI calls that cost money (cost control, 2026-11-24; specs 011 and 012).
 * The on-the-spot substitution has no limit by the user's decision (SUB-001).
 */
export const AI_LIMITED_OPERATIONS = [PLAN_GENERATION_OPERATION, ADJUSTMENT_OPERATION] as const;
export type AiLimitedOperation = (typeof AI_LIMITED_OPERATIONS)[number];

/** Rolling window of the limits: the last 24 hours. */
export const AI_USAGE_WINDOW_SECONDS = 24 * 60 * 60;

export const AI_MAX_REQUESTS_PER_WINDOW: Record<AiLimitedOperation, number> = {
  [PLAN_GENERATION_OPERATION]: 3,
  [ADJUSTMENT_OPERATION]: 5,
};
