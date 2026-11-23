import {
  LOG_LEVELS,
  REDACTED_VALUE,
  SENSITIVE_LOG_KEYS,
  type LogLevel,
} from "@/lib/constants/logging";

export type LogContext = Record<string, unknown>;
export type LogWriter = (line: string) => void;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

interface LoggerOptions {
  minimumLevel: LogLevel;
  writer?: LogWriter;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      SENSITIVE_LOG_KEYS.has(key.toLowerCase()) ? REDACTED_VALUE : redactSensitiveFields(fieldValue),
    ]),
  );
}

function writeToConsole(line: string): void {
  console.log(line);
}

export function createLogger({ minimumLevel, writer = writeToConsole }: LoggerOptions): Logger {
  const minimumIndex = LOG_LEVELS.indexOf(minimumLevel);

  function log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (LOG_LEVELS.indexOf(level) < minimumIndex) return;
    const safeContext = redactSensitiveFields(context) as LogContext;
    writer(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...safeContext }));
  }

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}
