import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlock, BetaJSONOutputFormat, BetaMessage, BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";
import {
  AI_RETRY_POLICY,
  CLAUDE_MODEL,
  DEFAULT_CLAUDE_EFFORT,
  DEFAULT_CLAUDE_MAX_TOKENS,
  type ClaudeEffort,
} from "@/lib/constants/ai";
import { ExternalServiceError } from "@/lib/errors/app-errors";
import { runWithRetry, type AttemptContext, type RetryPolicy } from "@/lib/http/retry-policy";
import { translate } from "@/lib/i18n/translate";
import type { Logger } from "@/lib/logger/logger";
import { classifyClaudeError, toClaudeAppError } from "./claude-errors";

export interface StructuredOutputRequest<T> {
  /** Name for the logs (e.g. "plan.generate"); never the content. */
  operation: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  effort?: ClaudeEffort;
  maxTokens?: number;
  /** Marks the system prompt for prompt caching (large, stable prefixes such as the catalog). */
  cacheSystem?: boolean;
}

export interface StructuredOutputClient {
  /** Calls Claude and returns output that passed the schema; throws an AppError otherwise. */
  generate<T>(request: StructuredOutputRequest<T>): Promise<T>;
}

interface StructuredOutputDependencies {
  client: Anthropic;
  logger: Logger;
  policy?: RetryPolicy;
}

/** JSON Schema from the SDK helper; parsing stays here, after the stop reason is checked. */
function toOutputFormat<T>(schema: z.ZodType<T>): BetaJSONOutputFormat {
  const format = betaZodOutputFormat(schema);
  return { type: format.type, schema: format.schema };
}

function buildSystem<T>(request: StructuredOutputRequest<T>): BetaMessageStreamParams["system"] {
  if (!request.cacheSystem) return request.system;
  return [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }];
}

function buildRequestBody<T>(request: StructuredOutputRequest<T>): BetaMessageStreamParams {
  return {
    model: CLAUDE_MODEL,
    max_tokens: request.maxTokens ?? DEFAULT_CLAUDE_MAX_TOKENS,
    system: buildSystem(request),
    messages: [{ role: "user", content: request.prompt }],
    output_config: { effort: request.effort ?? DEFAULT_CLAUDE_EFFORT, format: toOutputFormat(request.schema) },
  };
}

function readFinalText(content: readonly BetaContentBlock[]): string {
  return content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) throw new ExternalServiceError(translate("ai.invalidOutput"));
    throw error;
  }
}

function readOutput<T>(message: BetaMessage, schema: z.ZodType<T>): T {
  if (message.stop_reason === "refusal") throw new ExternalServiceError(translate("ai.refused"));
  if (message.stop_reason === "max_tokens") throw new ExternalServiceError(translate("ai.invalidOutput"));
  const output = schema.safeParse(parseJson(readFinalText(message.content)));
  if (!output.success) throw new ExternalServiceError(translate("ai.invalidOutput"));
  return output.data;
}

/** Metadata only: never the prompt, the answer or the key. */
function describeMessage(message: BetaMessage) {
  return {
    stopReason: message.stop_reason,
    inputTokens: message.usage?.input_tokens,
    outputTokens: message.usage?.output_tokens,
    cacheReadTokens: message.usage?.cache_read_input_tokens,
    cacheWriteTokens: message.usage?.cache_creation_input_tokens,
  };
}

export function createStructuredOutputClient({ client, logger, policy = AI_RETRY_POLICY }: StructuredOutputDependencies): StructuredOutputClient {
  async function requestMessage<T>(request: StructuredOutputRequest<T>): Promise<BetaMessage> {
    const body = buildRequestBody(request);
    const send = ({ signal, remainingMs }: AttemptContext) => client.beta.messages.stream(body, { signal, timeout: remainingMs }).finalMessage();
    try {
      return await runWithRetry(send, { policy, shouldRetry: classifyClaudeError });
    } catch (error) {
      logger.error("claude request failed", { operation: request.operation, errorName: error instanceof Error ? error.name : typeof error });
      throw toClaudeAppError(error);
    }
  }

  return {
    async generate(request) {
      const startedAt = Date.now();
      const message = await requestMessage(request);
      const context = { operation: request.operation, durationMs: Date.now() - startedAt, ...describeMessage(message) };
      try {
        const output = readOutput(message, request.schema);
        logger.info("claude request succeeded", context);
        return output;
      } catch (error) {
        logger.warn("claude output rejected", context);
        throw error;
      }
    },
  };
}
