import { describe, expect, it } from "vitest";
import { ConfigValidationError } from "./config";
import { parseClaudeConfig } from "./claude-config";

describe("claude config", () => {
  it("reads the API key", () => {
    expect(parseClaudeConfig({ ANTHROPIC_API_KEY: "test-key" })).toEqual({ apiKey: "test-key" });
  });

  it("fails fast without a key, naming only the variable", () => {
    expect(() => parseClaudeConfig({})).toThrow(ConfigValidationError);
    expect(() => parseClaudeConfig({ ANTHROPIC_API_KEY: "" })).toThrow("ANTHROPIC_API_KEY");
  });
});
