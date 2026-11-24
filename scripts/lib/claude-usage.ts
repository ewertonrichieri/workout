// Shared by the measurement scripts: usage line of the structured-output client and its cost.
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { PlanCandidate } from "../../src/lib/plan-generation/plan-candidate";

/** USD per million tokens (prompts up to 100K for Haiku; cache write = 5-minute TTL, 1.25x input; Haiku cache read assumed 0.1x). */
const PRICES_PER_MILLION: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
};
const TOKENS_PER_MILLION = 1_000_000;

export const usageLineSchema = z.object({
  durationMs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number().nullish(),
  cacheWriteTokens: z.number().nullish(),
});
export type UsageLine = z.infer<typeof usageLineSchema>;

/** Last log line written by the structured-output client holds the usage of the call. */
export function readUsage(logLines: readonly string[]): UsageLine {
  return usageLineSchema.parse(JSON.parse(logLines.at(-1) ?? "{}"));
}

export function computeCostUsd(usage: UsageLine, model: string): number {
  const prices = PRICES_PER_MILLION[model];
  if (!prices) return Number.NaN;
  const tokens = usage.inputTokens * prices.input
    + usage.outputTokens * prices.output
    + (usage.cacheWriteTokens ?? 0) * prices.cacheWrite
    + (usage.cacheReadTokens ?? 0) * prices.cacheRead;
  return tokens / TOKENS_PER_MILLION;
}

const catalogRowsSchema = z.array(z.object({ slug: z.string(), primary_muscles: z.array(z.string()), equipment: z.array(z.string()) }));

/** JSON file saved from list_plan_candidates or list_exercise_profiles (slug, primary_muscles, equipment). */
export async function readCatalogRows(path: string): Promise<PlanCandidate[]> {
  const rows = catalogRowsSchema.parse(JSON.parse(await readFile(path, "utf8")));
  return rows.map((row) => ({ slug: row.slug, primaryMuscles: row.primary_muscles, equipment: row.equipment }));
}
