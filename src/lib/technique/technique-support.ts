import { TECHNIQUE_EXERCISES, TECHNIQUE_ROUTE, type TechniqueRuleSet } from "@/lib/constants/technique";

/** Rules of a supported exercise (decision D3); undefined hides "Analisar minha execução". */
export function findTechniqueRuleSet(exerciseSlug: string): TechniqueRuleSet | undefined {
  return Object.hasOwn(TECHNIQUE_EXERCISES, exerciseSlug) ? TECHNIQUE_EXERCISES[exerciseSlug] : undefined;
}

export function buildTechniqueHref(exerciseSlug: string): string {
  return `${TECHNIQUE_ROUTE}/${exerciseSlug}`;
}
