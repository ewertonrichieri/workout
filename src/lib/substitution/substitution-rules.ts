import { ALWAYS_AVAILABLE_EQUIPMENT, REASONS_WITHOUT_ORIGINAL_EQUIPMENT, type SubstitutionReason } from "@/lib/constants/substitution";
import type { AiSubstitution, SubstitutionProfile } from "./substitution-schema";

/** Codes are logged (never the content); any issue makes the swap fall back to the automatic order. */
export type SubstitutionIssue = "unknown_exercise" | "duplicate_exercise";

interface FilterRules {
  original: SubstitutionProfile;
  reason: SubstitutionReason | null;
  /** Today's workout and what the device already shows (AI adjustment, other swaps). */
  excludedSlugs: ReadonlySet<string>;
}

/** Busy or broken equipment: options using any of the original's equipment are out, except bodyweight. */
function blockedEquipment({ original, reason }: FilterRules): Set<string> {
  if (reason === null || !REASONS_WITHOUT_ORIGINAL_EQUIPMENT.includes(reason)) return new Set();
  return new Set(original.equipment.filter((item) => item !== ALWAYS_AVAILABLE_EQUIPMENT));
}

export function filterCandidates(candidates: readonly SubstitutionProfile[], rules: FilterRules): SubstitutionProfile[] {
  const blocked = blockedEquipment(rules);
  return candidates.filter((item) => !rules.excludedSlugs.has(item.slug) && !item.equipment.some((equipment) => blocked.has(equipment)));
}

function countShared(values: readonly string[], reference: readonly string[]): number {
  return values.filter((value) => reference.includes(value)).length;
}

/** Automatic order: more shared primary muscles, then more shared secondary muscles, then slug (stable). */
export function rankCandidates(candidates: readonly SubstitutionProfile[], original: SubstitutionProfile): SubstitutionProfile[] {
  const score = (item: SubstitutionProfile) => [countShared(item.primaryMuscles, original.primaryMuscles), countShared(item.secondaryMuscles, original.secondaryMuscles)];
  return [...candidates].sort((left, right) => {
    const [leftPrimary, leftSecondary] = score(left);
    const [rightPrimary, rightSecondary] = score(right);
    return rightPrimary - leftPrimary || rightSecondary - leftSecondary || left.slug.localeCompare(right.slug);
  });
}

export function findSuggestionIssues(output: AiSubstitution, candidateSlugs: ReadonlySet<string>): SubstitutionIssue[] {
  const slugs = output.suggestions.map((suggestion) => suggestion.exerciseSlug);
  const issues: SubstitutionIssue[] = [];
  if (slugs.some((slug) => !candidateSlugs.has(slug))) issues.push("unknown_exercise");
  if (new Set(slugs).size !== slugs.length) issues.push("duplicate_exercise");
  return issues;
}
