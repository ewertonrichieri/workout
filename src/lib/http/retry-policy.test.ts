import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetryBudgetExceededError, runWithRetry, type RetryDecision, type RetryPolicy } from "./retry-policy";

const POLICY: RetryPolicy = { maxAttempts: 3, baseDelayMs: 1_000, totalTimeoutMs: 15_000 };

class TemporaryError extends Error {}
class PermanentError extends Error {}

function shouldRetry(error: unknown): RetryDecision {
  return error instanceof TemporaryError ? { retry: true } : { retry: false };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Runs the retry loop while advancing fake time; returns the settled promise. */
async function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  const settled = Promise.allSettled([promise]).then(([result]) => result);
  await vi.runAllTimersAsync();
  return settled;
}

describe("runWithRetry", () => {
  it("returns the first successful result without waiting", async () => {
    const operation = vi.fn(async () => "ok");
    await expect(settle(runWithRetry(operation, { policy: POLICY, shouldRetry }))).resolves.toEqual({ status: "fulfilled", value: "ok" });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries temporary failures with exponential backoff (1s, 2s)", async () => {
    const startedAt = Date.now();
    const calls: number[] = [];
    const operation = vi.fn(async () => {
      calls.push(Date.now() - startedAt);
      if (calls.length < 3) throw new TemporaryError();
      return "ok";
    });
    const result = await settle(runWithRetry(operation, { policy: POLICY, shouldRetry }));
    expect(result).toEqual({ status: "fulfilled", value: "ok" });
    expect(calls).toEqual([0, 1_000, 3_000]);
  });

  it("gives up after the maximum attempts with the last error", async () => {
    const operation = vi.fn(async () => {
      throw new TemporaryError("still down");
    });
    const result = await settle(runWithRetry(operation, { policy: POLICY, shouldRetry }));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(TemporaryError);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("never retries permanent failures", async () => {
    const operation = vi.fn(async () => {
      throw new PermanentError();
    });
    const result = await settle(runWithRetry(operation, { policy: POLICY, shouldRetry }));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(PermanentError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("uses the delay asked by the failure (e.g. Retry-After)", async () => {
    const startedAt = Date.now();
    const calls: number[] = [];
    const operation = vi.fn(async () => {
      calls.push(Date.now() - startedAt);
      if (calls.length === 1) throw new TemporaryError();
      return "ok";
    });
    await settle(runWithRetry(operation, { policy: POLICY, shouldRetry: () => ({ retry: true, delayMs: 5_000 }) }));
    expect(calls).toEqual([0, 5_000]);
  });

  it("does not wait when the delay would pass the total timeout", async () => {
    const operation = vi.fn(async () => {
      throw new TemporaryError();
    });
    const result = await settle(runWithRetry(operation, { policy: POLICY, shouldRetry: () => ({ retry: true, delayMs: 20_000 }) }));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(TemporaryError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("gives each attempt only the remaining time and aborts at the total timeout", async () => {
    const remaining: number[] = [];
    const operation = vi.fn(({ signal, remainingMs }: { signal: AbortSignal; remainingMs: number }) => {
      remaining.push(remainingMs);
      return new Promise<string>((_, reject) => signal.addEventListener("abort", () => reject(new TemporaryError("aborted"))));
    });
    const result = await settle(runWithRetry(operation, { policy: POLICY, shouldRetry }));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(RetryBudgetExceededError);
    expect(remaining).toEqual([15_000]);
  });
});
