import { z } from "zod";
import { DEFAULT_LOG_LEVEL, LOG_LEVELS, type LogLevel } from "@/lib/constants/logging";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
});

export interface AppConfig {
  nodeEnvironment: "development" | "production" | "test";
  logLevel: LogLevel;
}

export class ConfigValidationError extends Error {
  constructor(invalidVariables: string[]) {
    super(`Invalid environment variables: ${invalidVariables.join(", ")}`);
    this.name = "ConfigValidationError";
  }
}

export function parseConfig(environment: Record<string, string | undefined>): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const invalidVariables = result.error.issues.map((issue) => issue.path.join("."));
    throw new ConfigValidationError(invalidVariables);
  }
  return { nodeEnvironment: result.data.NODE_ENV, logLevel: result.data.LOG_LEVEL };
}

let cachedConfig: AppConfig | undefined;

/** Reads and validates process.env once; fails fast on invalid configuration. */
export function getConfig(): AppConfig {
  cachedConfig ??= parseConfig(process.env);
  return cachedConfig;
}
