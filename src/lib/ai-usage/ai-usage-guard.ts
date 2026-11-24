import { AI_MAX_REQUESTS_PER_WINDOW, AI_USAGE_WINDOW_SECONDS, type AiLimitedOperation } from "@/lib/constants/ai-usage";
import { RateLimitExceededError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { Logger } from "@/lib/logger/logger";
import type { AiUsageRepository } from "./ai-usage-repository";

export interface AiUsageGuard {
  /** Call right before the AI, after the cheap checks: counts the request or throws RateLimitExceededError (429). */
  reserve(operation: AiLimitedOperation): Promise<void>;
}

interface AiUsageGuardDependencies {
  repository: AiUsageRepository;
  logger: Logger;
}

export function createAiUsageGuard({ repository, logger }: AiUsageGuardDependencies): AiUsageGuard {
  return {
    async reserve(operation) {
      const maxRequests = AI_MAX_REQUESTS_PER_WINDOW[operation];
      const isRegistered = await repository.registerRequest(operation, { maxRequests, windowSeconds: AI_USAGE_WINDOW_SECONDS });
      if (isRegistered) return;
      logger.warn("ai request limit reached", { operation });
      throw new RateLimitExceededError(translate("ai.usageLimitReached", { maxRequests }));
    },
  };
}
