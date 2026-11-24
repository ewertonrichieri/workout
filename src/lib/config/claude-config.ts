import { z } from "zod";
import { ConfigValidationError } from "@/lib/config/config";

const claudeEnvironmentSchema = z.object({ ANTHROPIC_API_KEY: z.string().min(1) });

export interface ClaudeConfig {
  apiKey: string;
}

/** Secret: read only by the server composition root (server-claude-client.ts); never logged. */
export function parseClaudeConfig(environment: Record<string, string | undefined>): ClaudeConfig {
  const result = claudeEnvironmentSchema.safeParse(environment);
  if (!result.success) throw new ConfigValidationError(result.error.issues.map((issue) => issue.path.join(".")));
  return { apiKey: result.data.ANTHROPIC_API_KEY };
}

let cachedClaudeConfig: ClaudeConfig | undefined;

/** Read once, when the first AI call is composed (the app runs without AI until then). */
export function getClaudeConfig(): ClaudeConfig {
  cachedClaudeConfig ??= parseClaudeConfig(process.env);
  return cachedClaudeConfig;
}
