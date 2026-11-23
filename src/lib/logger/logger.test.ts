import { describe, expect, it, vi } from "vitest";
import { createLogger, type LogWriter } from "@/lib/logger/logger";

function createCapturingWriter(): { writer: LogWriter; lines: string[] } {
  const lines: string[] = [];
  return { writer: vi.fn((line: string) => lines.push(line)), lines };
}

describe("createLogger", () => {
  it("writes structured JSON with level and message", () => {
    const { writer, lines } = createCapturingWriter();
    const logger = createLogger({ minimumLevel: "debug", writer });
    logger.info("plan generated", { planId: "p1" });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: "info", message: "plan generated", planId: "p1" });
    expect(typeof entry.timestamp).toBe("string");
  });

  it("skips entries below the minimum level", () => {
    const { writer, lines } = createCapturingWriter();
    const logger = createLogger({ minimumLevel: "warn", writer });
    logger.debug("hidden");
    logger.info("hidden");
    logger.error("shown");
    expect(lines).toHaveLength(1);
  });

  it("redacts sensitive fields, including nested ones", () => {
    const { writer, lines } = createCapturingWriter();
    const logger = createLogger({ minimumLevel: "debug", writer });
    logger.warn("auth", { apiKey: "abc", request: { authorization: "Bearer x", path: "/a" } });
    const entry = JSON.parse(lines[0]);
    expect(entry.apiKey).toBe("[REDACTED]");
    expect(entry.request).toEqual({ authorization: "[REDACTED]", path: "/a" });
  });
});
