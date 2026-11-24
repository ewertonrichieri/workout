import { z } from "zod";
import { normalizeTerm } from "./text-normalization";

const vocabularyEntrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  namePt: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
});

/** Curated canonical vocabulary (muscles or equipment) with the raw source terms it covers. */
export const vocabularySchema = z.object({
  entries: z.array(vocabularyEntrySchema).min(1),
  ignored: z.array(z.string().trim().min(1)),
});

export type Vocabulary = z.infer<typeof vocabularySchema>;
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;

const IGNORED_TERM = null;

/** Normalized raw term → canonical slug, or `null` when the term is explicitly ignored. */
export type VocabularyIndex = ReadonlyMap<string, string | null>;

export interface MappedTerms {
  slugs: string[];
  unmapped: string[];
}

export class VocabularyCollisionError extends Error {
  constructor(term: string) {
    super(`vocabulary term "${term}" is defined more than once`);
    this.name = "VocabularyCollisionError";
  }
}

function addTerm(index: Map<string, string | null>, rawTerm: string, target: string | null): void {
  const term = normalizeTerm(rawTerm);
  const existing = index.get(term);
  if (existing === target) return;
  if (index.has(term)) throw new VocabularyCollisionError(term);
  index.set(term, target);
}

export function createVocabularyIndex(vocabulary: Vocabulary): VocabularyIndex {
  const index = new Map<string, string | null>();
  for (const entry of vocabulary.entries) {
    [entry.slug, ...entry.aliases].forEach((alias) => addTerm(index, alias, entry.slug));
  }
  vocabulary.ignored.forEach((term) => addTerm(index, term, IGNORED_TERM));
  return index;
}

/** Maps raw terms to canonical slugs; unknown terms are reported, never guessed. */
export function mapTerms(index: VocabularyIndex, rawTerms: readonly string[]): MappedTerms {
  const slugs = new Set<string>();
  const unmapped: string[] = [];
  for (const rawTerm of rawTerms) {
    const term = normalizeTerm(rawTerm);
    if (!index.has(term)) unmapped.push(rawTerm);
    const slug = index.get(term);
    if (slug) slugs.add(slug);
  }
  return { slugs: [...slugs], unmapped };
}
