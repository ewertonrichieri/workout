import { z } from "zod";
import { SOURCE_PRIORITY } from "../catalog-sources";
import type { NormalizedExercise } from "./normalize-source-exercise";

const MIN_MERGE_SIZE = 2;

/** Curated decisions for duplicates the automatic rule does not catch. */
export const duplicateDecisionsSchema = z.object({
  merges: z.array(
    z.object({
      refKeys: z.array(z.string().min(1)).min(MIN_MERGE_SIZE),
      reason: z.string().trim().min(1),
    }),
  ),
});

export type DuplicateDecisions = z.infer<typeof duplicateDecisionsSchema>;

export type ReviewCandidateKind = "same_name_different_equipment" | "alias_match";

/** Two groups that may be the same exercise; a person decides (false positives are worse). */
export interface ReviewCandidate {
  kind: ReviewCandidateKind;
  refKeys: [string[], string[]];
  names: [string, string];
  equipment: [string[], string[]];
}

export interface DeduplicationResult {
  groups: NormalizedExercise[][];
  reviewCandidates: ReviewCandidate[];
}

export class UnknownDecisionReferenceError extends Error {
  constructor(refKey: string) {
    super(`duplicate decision references unknown exercise "${refKey}"`);
    this.name = "UnknownDecisionReferenceError";
  }
}

function compareExercises(left: NormalizedExercise, right: NormalizedExercise): number {
  const bySource = SOURCE_PRIORITY.indexOf(left.sourceExercise.source) - SOURCE_PRIORITY.indexOf(right.sourceExercise.source);
  return bySource !== 0 ? bySource : left.refKey.localeCompare(right.refKey);
}

function createDisjointSet(keys: readonly string[]) {
  const parent = new Map(keys.map((key) => [key, key]));
  const find = (key: string): string => {
    const root = parent.get(key) ?? key;
    if (root === key) return key;
    const finalRoot = find(root);
    parent.set(key, finalRoot);
    return finalRoot;
  };
  const union = (left: string, right: string): void => {
    parent.set(find(right), find(left));
  };
  return { find, union };
}

function unionByMatchKey(exercises: readonly NormalizedExercise[], union: (left: string, right: string) => void): void {
  const firstByMatchKey = new Map<string, string>();
  for (const exercise of exercises) {
    const matchKey = `${exercise.nameKey}|${exercise.equipmentKey}`;
    const first = firstByMatchKey.get(matchKey);
    if (first) union(first, exercise.refKey);
    else firstByMatchKey.set(matchKey, exercise.refKey);
  }
}

function unionByDecisions(decisions: DuplicateDecisions, knownKeys: ReadonlySet<string>, union: (left: string, right: string) => void): void {
  for (const { refKeys } of decisions.merges) {
    const unknown = refKeys.find((refKey) => !knownKeys.has(refKey));
    if (unknown) throw new UnknownDecisionReferenceError(unknown);
    refKeys.slice(1).forEach((refKey) => union(refKeys[0], refKey));
  }
}

function collectGroups(exercises: readonly NormalizedExercise[], find: (key: string) => string): NormalizedExercise[][] {
  const groupsByRoot = new Map<string, NormalizedExercise[]>();
  for (const exercise of exercises) {
    const root = find(exercise.refKey);
    groupsByRoot.set(root, [...(groupsByRoot.get(root) ?? []), exercise]);
  }
  return [...groupsByRoot.values()]
    .map((group) => [...group].sort(compareExercises))
    .sort((left, right) => compareExercises(left[0], right[0]));
}

function buildCandidate(kind: ReviewCandidateKind, left: NormalizedExercise[], right: NormalizedExercise[]): ReviewCandidate {
  return {
    kind,
    refKeys: [left.map((exercise) => exercise.refKey), right.map((exercise) => exercise.refKey)],
    names: [left[0].displayNameEn, right[0].displayNameEn],
    equipment: [left[0].equipment, right[0].equipment],
  };
}

function indexGroupsBy(groups: NormalizedExercise[][], keyOf: (exercise: NormalizedExercise) => string): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  groups.forEach((group, groupIndex) => {
    group.forEach((exercise) => index.set(keyOf(exercise), (index.get(keyOf(exercise)) ?? new Set()).add(groupIndex)));
  });
  return index;
}

function findCandidatePairs(groups: NormalizedExercise[][]): Map<string, [ReviewCandidateKind, number, number]> {
  const pairs = new Map<string, [ReviewCandidateKind, number, number]>();
  const addPair = (kind: ReviewCandidateKind, first: number, second: number): void => {
    const [low, high] = first < second ? [first, second] : [second, first];
    if (low !== high && !pairs.has(`${low}-${high}`)) pairs.set(`${low}-${high}`, [kind, low, high]);
  };
  indexGroupsBy(groups, (exercise) => exercise.nameKey).forEach((indexes) => {
    const [first, ...others] = [...indexes];
    others.forEach((other) => addPair("same_name_different_equipment", first, other));
  });
  const byNameAndEquipment = indexGroupsBy(groups, (exercise) => `${exercise.nameKey}|${exercise.equipmentKey}`);
  groups.forEach((group, groupIndex) => {
    group.forEach((exercise) => exercise.aliasKeys.forEach((aliasKey) => {
      byNameAndEquipment.get(`${aliasKey}|${exercise.equipmentKey}`)?.forEach((other) => addPair("alias_match", groupIndex, other));
    }));
  });
  return pairs;
}

/**
 * Groups exercises that are the same across (or within) sources.
 * Automatic merge only on identical name key AND equipment key; curated decisions add merges;
 * near matches become review candidates and stay separate.
 */
export function deduplicateExercises(exercises: readonly NormalizedExercise[], decisions: DuplicateDecisions): DeduplicationResult {
  const refKeys = exercises.map((exercise) => exercise.refKey);
  const { find, union } = createDisjointSet(refKeys);
  unionByMatchKey(exercises, union);
  unionByDecisions(decisions, new Set(refKeys), union);
  const groups = collectGroups(exercises, find);
  const reviewCandidates = [...findCandidatePairs(groups).values()].map(([kind, left, right]) =>
    buildCandidate(kind, groups[left], groups[right]),
  );
  return { groups, reviewCandidates };
}
