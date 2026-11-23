export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const DEFAULT_LOG_LEVEL: LogLevel = "info";

export const REDACTED_VALUE = "[REDACTED]";

/** Lowercased keys whose values must never be logged. */
export const SENSITIVE_LOG_KEYS: ReadonlySet<string> = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "authorization",
  "cookie",
]);
