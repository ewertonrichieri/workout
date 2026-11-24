import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ExternalServiceError, RateLimitExceededError } from "@/lib/errors/app-errors";
import { RetryBudgetExceededError } from "@/lib/http/retry-policy";
import { classifyClaudeError, toClaudeAppError } from "./claude-errors";

function apiError(status: number, headers: Record<string, string> = {}) {
  return Anthropic.APIError.generate(status, { type: "error", error: { type: "api_error", message: "x" } }, "x", new Headers(headers));
}

describe("classifyClaudeError", () => {
  it.each([500, 503, 529])("retries server errors (%i)", (status) => {
    expect(classifyClaudeError(apiError(status))).toEqual({ retry: true });
  });

  it("retries connection failures and per-attempt timeouts", () => {
    expect(classifyClaudeError(new Anthropic.APIConnectionError({ message: "reset" }))).toEqual({ retry: true });
    expect(classifyClaudeError(new Anthropic.APIConnectionTimeoutError())).toEqual({ retry: true });
  });

  it("retries 429 honoring Retry-After in seconds", () => {
    expect(classifyClaudeError(apiError(429, { "retry-after": "3" }))).toEqual({ retry: true, delayMs: 3_000 });
    expect(classifyClaudeError(apiError(429))).toEqual({ retry: true });
  });

  it.each([400, 401, 403, 404, 408, 409, 413, 422])("never retries other client errors (%i)", (status) => {
    expect(classifyClaudeError(apiError(status))).toEqual({ retry: false });
  });

  it("never retries a cancelled request or an unknown error", () => {
    expect(classifyClaudeError(new Anthropic.APIUserAbortError())).toEqual({ retry: false });
    expect(classifyClaudeError(new Error("boom"))).toEqual({ retry: false });
  });
});

describe("toClaudeAppError", () => {
  it("maps rate limits to 429 and everything else to 502 with pt-BR messages", () => {
    const rateLimited = toClaudeAppError(apiError(429));
    expect(rateLimited).toBeInstanceOf(RateLimitExceededError);
    expect(rateLimited.message).toMatch(/muitos pedidos/i);
    const timedOut = toClaudeAppError(new RetryBudgetExceededError());
    expect(timedOut).toBeInstanceOf(ExternalServiceError);
    expect(timedOut.message).toMatch(/demorou/i);
    expect(toClaudeAppError(apiError(500))).toBeInstanceOf(ExternalServiceError);
    expect(toClaudeAppError(new Error("boom"))).toBeInstanceOf(ExternalServiceError);
  });

  it("keeps app errors already raised", () => {
    const error = new ExternalServiceError("Resposta inválida");
    expect(toClaudeAppError(error)).toBe(error);
  });
});
