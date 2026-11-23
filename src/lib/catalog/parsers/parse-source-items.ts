import type { z } from "zod";
import { sourceExerciseSchema, type SourceExercise } from "../source-exercise";

export interface RejectedSourceItem {
  index: number;
  externalId?: string;
  reason: string;
}

export interface ParsedSource {
  exercises: SourceExercise[];
  rejected: RejectedSourceItem[];
}

/** Thrown when a source file does not have the expected top-level shape. */
export class CatalogSourceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogSourceFormatError";
  }
}

function summarizeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "item"}: ${issue.message}`).join("; ");
}

function parseOneItem<RawItem>(
  rawItem: unknown,
  itemSchema: z.ZodType<RawItem>,
  mapItem: (item: RawItem) => SourceExercise,
): { exercise: SourceExercise } | { reason: string } {
  const rawResult = itemSchema.safeParse(rawItem);
  if (!rawResult.success) return { reason: summarizeIssues(rawResult.error) };
  const mappedResult = sourceExerciseSchema.safeParse(mapItem(rawResult.data));
  if (!mappedResult.success) return { reason: summarizeIssues(mappedResult.error) };
  return { exercise: mappedResult.data };
}

/**
 * Validates every raw item, maps it to the common shape and rejects invalid or repeated ones.
 * A bad item never fails the whole source: it is reported in `rejected` (false positives are worse).
 */
export function parseSourceItems<RawItem>(
  rawSource: unknown,
  itemSchema: z.ZodType<RawItem>,
  mapItem: (item: RawItem) => SourceExercise,
): ParsedSource {
  if (!Array.isArray(rawSource)) throw new CatalogSourceFormatError("source data must be a list of exercises");
  const seenExternalIds = new Set<string>();
  const parsed: ParsedSource = { exercises: [], rejected: [] };
  rawSource.forEach((rawItem: unknown, index) => {
    const outcome = parseOneItem(rawItem, itemSchema, mapItem);
    if ("reason" in outcome) {
      parsed.rejected.push({ index, reason: outcome.reason });
    } else if (seenExternalIds.has(outcome.exercise.externalId)) {
      parsed.rejected.push({ index, externalId: outcome.exercise.externalId, reason: "repeated source id" });
    } else {
      seenExternalIds.add(outcome.exercise.externalId);
      parsed.exercises.push(outcome.exercise);
    }
  });
  return parsed;
}
