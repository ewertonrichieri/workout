/** Retry policy for external HTTP calls (AGENTS.md, section 7). */
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_TOTAL_TIMEOUT_MS = 15_000;
