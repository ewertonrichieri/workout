import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getClaudeConfig } from "@/lib/config/claude-config";
import { createServerLogger } from "@/lib/http/server-logger";
import { createStructuredOutputClient, type StructuredOutputClient } from "./structured-output-client";

/** SDK retries off: the project's retry policy (runWithRetry) is the only one. */
const SDK_MAX_RETRIES = 0;

function buildClient(): StructuredOutputClient {
  const client = new Anthropic({ apiKey: getClaudeConfig().apiKey, maxRetries: SDK_MAX_RETRIES });
  return createStructuredOutputClient({ client, logger: createServerLogger() });
}

/** Composition root for Claude calls; the key is read on the first call, so screens that never call AI work without it. */
export function createServerStructuredOutputClient(): StructuredOutputClient {
  let client: StructuredOutputClient | undefined;
  return {
    generate(request) {
      client ??= buildClient();
      return client.generate(request);
    },
  };
}
