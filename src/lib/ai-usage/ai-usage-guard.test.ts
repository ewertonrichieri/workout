import { describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "@/lib/errors/app-errors";
import type { Logger } from "@/lib/logger/logger";
import { createAiUsageGuard } from "./ai-usage-guard";
import type { AiUsageRepository } from "./ai-usage-repository";

function setup(isAllowed: boolean) {
  const repository: AiUsageRepository = { registerRequest: vi.fn(async () => isAllowed) };
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger;
  return { repository, logger, guard: createAiUsageGuard({ repository, logger }) };
}

describe("AI usage guard", () => {
  it("registers the request with the operation's limit and the 24-hour window", async () => {
    const { guard, repository } = setup(true);
    await expect(guard.reserve("plan.generate")).resolves.toBeUndefined();
    expect(repository.registerRequest).toHaveBeenCalledWith("plan.generate", { maxRequests: 3, windowSeconds: 86_400 });
  });

  it("uses the daily adjustment limit", async () => {
    const { guard, repository } = setup(true);
    await guard.reserve("readiness.adjust");
    expect(repository.registerRequest).toHaveBeenCalledWith("readiness.adjust", { maxRequests: 5, windowSeconds: 86_400 });
  });

  it("uses the equipment detection limit (spec 013, D6)", async () => {
    const { guard, repository } = setup(true);
    await guard.reserve("equipment.detect");
    expect(repository.registerRequest).toHaveBeenCalledWith("equipment.detect", { maxRequests: 5, windowSeconds: 86_400 });
  });

  it("rejects with 429 and a Portuguese message once the limit is reached", async () => {
    const { guard, logger } = setup(false);
    const error = await guard.reserve("plan.generate").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect((error as RateLimitExceededError).httpStatus).toBe(429);
    expect((error as RateLimitExceededError).message).toContain("3 pedidos");
    expect(logger.warn).toHaveBeenCalledWith("ai request limit reached", { operation: "plan.generate" });
  });
});
