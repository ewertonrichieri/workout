import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import { hingePattern } from "./hinge-pattern";
import type { MovementPattern } from "./pattern-types";
import { rowPattern } from "./row-pattern";
import { squatPattern } from "./squat-pattern";

const PATTERNS: Readonly<Record<TechniqueRuleSetId, MovementPattern>> = { squat: squatPattern, hinge: hingePattern, row: rowPattern };

/** Movement pattern (D13) by rule set id. */
export function getMovementPattern(id: TechniqueRuleSetId): MovementPattern {
  return PATTERNS[id];
}
