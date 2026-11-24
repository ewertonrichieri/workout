import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AiLimitedOperation } from "@/lib/constants/ai-usage";
import { RepositoryError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

export interface AiRequestLimit {
  maxRequests: number;
  windowSeconds: number;
}

export interface AiUsageRepository {
  /** Registers one AI request of the session's user when under the limit; false when the limit is reached. */
  registerRequest(operation: AiLimitedOperation, limit: AiRequestLimit): Promise<boolean>;
}

const registeredSchema = z.boolean();

/** Counts and registers in one transaction (register_ai_request), with the user's session (RLS applies). */
export function createSupabaseAiUsageRepository(client: SupabaseClient): AiUsageRepository {
  return {
    async registerRequest(operation, limit) {
      const { data, error } = await client.rpc("register_ai_request", {
        p_operation: operation,
        p_max_requests: limit.maxRequests,
        p_window_seconds: limit.windowSeconds,
      });
      const registered = registeredSchema.safeParse(data);
      if (error || !registered.success) throw new RepositoryError(translate("errors.internal"), "aiUsage.registerRequest");
      return registered.data;
    },
  };
}
