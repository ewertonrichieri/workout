import "server-only";
import { getConfig } from "@/lib/config/config";
import { createLogger, type Logger } from "@/lib/logger/logger";

/** Logger configured from the validated environment (server only). */
export function createServerLogger(): Logger {
  return createLogger({ minimumLevel: getConfig().logLevel });
}
