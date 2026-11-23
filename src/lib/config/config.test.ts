import { describe, expect, it } from "vitest";
import { ConfigValidationError, parseConfig } from "@/lib/config/config";

describe("parseConfig", () => {
  it("returns typed config with defaults", () => {
    const config = parseConfig({ NODE_ENV: "development" });
    expect(config).toEqual({ nodeEnvironment: "development", logLevel: "info" });
  });

  it("accepts an explicit log level", () => {
    const config = parseConfig({ NODE_ENV: "production", LOG_LEVEL: "warn" });
    expect(config.logLevel).toBe("warn");
  });

  it("throws naming the invalid variable", () => {
    expect(() => parseConfig({ NODE_ENV: "development", LOG_LEVEL: "loud" })).toThrow(
      ConfigValidationError,
    );
    expect(() => parseConfig({ NODE_ENV: "development", LOG_LEVEL: "loud" })).toThrow(/LOG_LEVEL/);
  });
});
