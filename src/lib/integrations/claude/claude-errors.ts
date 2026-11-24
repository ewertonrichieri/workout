import Anthropic from "@anthropic-ai/sdk";
import { HTTP_STATUS } from "@/lib/constants/http";
import { AppError, ExternalServiceError, RateLimitExceededError } from "@/lib/errors/app-errors";
import { RetryBudgetExceededError, type RetryDecision } from "@/lib/http/retry-policy";
import { translate } from "@/lib/i18n/translate";

const RETRY_AFTER_HEADER = "retry-after";
const MILLISECONDS_PER_SECOND = 1_000;

/** Retry-After in seconds or as an HTTP date; undefined when absent or unreadable. */
function readRetryAfterMs(headers: Headers | undefined): number | undefined {
  const value = headers?.get(RETRY_AFTER_HEADER);
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * MILLISECONDS_PER_SECOND;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/** Retries only rate limits, server errors and connection failures (never other 4xx). */
export function classifyClaudeError(error: unknown): RetryDecision {
  if (error instanceof Anthropic.APIUserAbortError) return { retry: false };
  if (error instanceof Anthropic.APIConnectionError) return { retry: true };
  if (error instanceof Anthropic.RateLimitError) {
    const delayMs = readRetryAfterMs(error.headers);
    return delayMs === undefined ? { retry: true } : { retry: true, delayMs };
  }
  if (error instanceof Anthropic.APIError && (error.status ?? 0) >= HTTP_STATUS.INTERNAL_SERVER_ERROR) return { retry: true };
  return { retry: false };
}

/** Safe pt-BR error for the user; details stay in the logs. */
export function toClaudeAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof RetryBudgetExceededError) return new ExternalServiceError(translate("ai.timeout"));
  if (error instanceof Anthropic.RateLimitError) return new RateLimitExceededError(translate("ai.rateLimited"));
  return new ExternalServiceError(translate("ai.unavailable"));
}
