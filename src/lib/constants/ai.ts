import { MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS } from "@/lib/constants/retry";

/** Claude API defaults (spec 011, step 3.2). */
/** Cheaper model chosen by the user after the real call (PLN-001, 2026-11-24). */
export const CLAUDE_MODEL = "claude-haiku-5-5";
export const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type ClaudeEffort = (typeof CLAUDE_EFFORTS)[number];
export const DEFAULT_CLAUDE_EFFORT: ClaudeEffort = "high";
export const DEFAULT_CLAUDE_MAX_TOKENS = 32_000;

/** Server-side refusal fallback: the API re-runs a declined request on the recommended model. */
export const CLAUDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
export const CLAUDE_FALLBACK_MODE = "default";

/** Exception to the 15 s external timeout (AGENTS.md, section 7): AI calls get 120 s in total. */
export const AI_TOTAL_TIMEOUT_MS = 120_000;
export const AI_RETRY_POLICY = {
  maxAttempts: MAX_RETRY_ATTEMPTS,
  baseDelayMs: RETRY_BASE_DELAY_MS,
  totalTimeoutMs: AI_TOTAL_TIMEOUT_MS,
} as const;
