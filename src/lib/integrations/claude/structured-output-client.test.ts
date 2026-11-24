import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ExternalServiceError, RateLimitExceededError } from "@/lib/errors/app-errors";
import type { LogContext, Logger } from "@/lib/logger/logger";
import { createStructuredOutputClient } from "./structured-output-client";

const PlanSchema = z.object({ title: z.string(), days: z.number().int() });

const REQUEST = { operation: "test.plan", system: "Você é um personal trainer.", prompt: "Monte um plano.", schema: PlanSchema };

interface FakeMessage {
  stop_reason: string;
  content: Array<Record<string, unknown>>;
  usage: Record<string, number>;
}

function textMessage(text: string, stopReason = "end_turn"): FakeMessage {
  return { stop_reason: stopReason, content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 5 } };
}

type LogMethod = (message: string, context?: LogContext) => void;
type StreamMethod = (body: Record<string, unknown>, options: { signal: AbortSignal; timeout: number }) => { finalMessage(): Promise<FakeMessage | undefined> };

function createLogger() {
  return { debug: vi.fn<LogMethod>(), info: vi.fn<LogMethod>(), warn: vi.fn<LogMethod>(), error: vi.fn<LogMethod>() } satisfies Logger;
}

function setup(results: Array<FakeMessage | Error>) {
  const stream = vi.fn<StreamMethod>(() => {
    const next = results.shift();
    return { finalMessage: async () => (next instanceof Error ? Promise.reject(next) : next) };
  });
  const client = { beta: { messages: { stream } } } as unknown as Anthropic;
  const logger = createLogger();
  return { stream, logger, service: createStructuredOutputClient({ client, logger }) };
}

async function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  const settled = Promise.allSettled([promise]).then(([result]) => result);
  await vi.runAllTimersAsync();
  return settled;
}

async function apiError(status: number) {
  const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
  return AnthropicSdk.APIError.generate(status, { type: "error", error: { type: "api_error", message: "x" } }, "x", new Headers());
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("structured output client", () => {
  it("sends a streamed request with schema, fallback and effort, and returns the validated output", async () => {
    const { service, stream } = setup([textMessage('{"title":"Plano A","days":3}')]);
    await expect(service.generate({ ...REQUEST, effort: "xhigh" })).resolves.toEqual({ title: "Plano A", days: 3 });
    const [body, options] = stream.mock.calls[0];
    expect(body).toMatchObject({
      model: "claude-opus-5-5",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: REQUEST.system,
      messages: [{ role: "user", content: REQUEST.prompt }],
      output_config: { effort: "xhigh", format: { type: "json_schema" } },
    });
    expect(body).not.toHaveProperty("thinking");
    expect(options.timeout).toBe(120_000);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends the model chosen by the caller", async () => {
    const { service, stream } = setup([textMessage('{"title":"Plano","days":3}')]);
    await service.generate({ ...REQUEST, model: "claude-haiku-5-5" });
    expect(stream.mock.calls[0][0]).toMatchObject({ model: "claude-haiku-5-5" });
  });

  it("caches the system prompt when asked", async () => {
    const { service, stream } = setup([textMessage('{"title":"Plano","days":3}')]);
    await service.generate({ ...REQUEST, cacheSystem: true });
    expect(stream.mock.calls[0][0].system).toEqual([{ type: "text", text: REQUEST.system, cache_control: { type: "ephemeral" } }]);
  });

  it("uses the text after the last fallback switch", async () => {
    const message: FakeMessage = {
      stop_reason: "end_turn",
      usage: {},
      content: [
        { type: "text", text: '{"tit' },
        { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" } },
        { type: "text", text: '{"title":"Plano B","days":2}' },
      ],
    };
    await expect(setup([message]).service.generate(REQUEST)).resolves.toEqual({ title: "Plano B", days: 2 });
  });

  it.each([
    ["invalid JSON", textMessage("não é json")],
    ["output outside the schema", textMessage('{"title":"Plano","days":"três"}')],
    ["a refusal", textMessage("", "refusal")],
    ["a truncated answer", textMessage('{"title":"Pla', "max_tokens")],
  ])("fails without retry on %s", async (_, message) => {
    const { service, stream, logger } = setup([message]);
    const result = await settle(service.generate(REQUEST));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(ExternalServiceError);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("Plano");
  });

  it("retries a temporary failure and then succeeds", async () => {
    const { service, stream } = setup([await apiError(529), textMessage('{"title":"Plano","days":4}')]);
    const result = await settle(service.generate(REQUEST));
    expect(result).toEqual({ status: "fulfilled", value: { title: "Plano", days: 4 } });
    expect(stream).toHaveBeenCalledTimes(2);
    expect(stream.mock.calls[1][1].timeout).toBe(119_000);
  });

  it("does not retry client errors", async () => {
    const { service, stream } = setup([await apiError(400)]);
    const result = await settle(service.generate(REQUEST));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(ExternalServiceError);
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it("answers 429 after exhausting the attempts and logs without content", async () => {
    const { service, stream, logger } = setup([await apiError(429), await apiError(429), await apiError(429)]);
    const result = await settle(service.generate(REQUEST));
    expect(result.status === "rejected" && result.reason).toBeInstanceOf(RateLimitExceededError);
    expect(stream).toHaveBeenCalledTimes(3);
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain("test.plan");
    expect(logged).not.toContain(REQUEST.prompt);
  });
});
