/** Generic retry loop for external calls (AGENTS.md, section 7). */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  totalTimeoutMs: number;
}

export type RetryDecision = { retry: false } | { retry: true; delayMs?: number };

export interface AttemptContext {
  attempt: number;
  /** Aborted when the total timeout ends; pass it to the request. */
  signal: AbortSignal;
  /** Time left in the total budget; use it as the per-attempt timeout. */
  remainingMs: number;
}

export interface RetryOptions {
  policy: RetryPolicy;
  shouldRetry: (error: unknown) => RetryDecision;
}

/** The total timeout ended before an attempt could succeed. */
export class RetryBudgetExceededError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Retry budget exceeded", options);
    this.name = "RetryBudgetExceededError";
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function nextDelayMs(policy: RetryPolicy, attempt: number, decision: RetryDecision): number | null {
  if (!decision.retry || attempt >= policy.maxAttempts) return null;
  return decision.delayMs ?? policy.baseDelayMs * 2 ** (attempt - 1);
}

async function runAttempts<T>(operation: (context: AttemptContext) => Promise<T>, options: RetryOptions, controller: AbortController): Promise<T> {
  const deadline = Date.now() + options.policy.totalTimeoutMs;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation({ attempt, signal: controller.signal, remainingMs: deadline - Date.now() });
    } catch (error) {
      if (controller.signal.aborted) throw new RetryBudgetExceededError({ cause: error });
      const delayMs = nextDelayMs(options.policy, attempt, options.shouldRetry(error));
      if (delayMs === null || Date.now() + delayMs >= deadline) throw error;
      await wait(delayMs);
    }
  }
}

/** Runs `operation` with bounded attempts, exponential backoff and a total timeout. */
export async function runWithRetry<T>(operation: (context: AttemptContext) => Promise<T>, options: RetryOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.policy.totalTimeoutMs);
  try {
    return await runAttempts(operation, options, controller);
  } finally {
    clearTimeout(timer);
  }
}
