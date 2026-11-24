/** Catalog exercise the AI may choose (has enabled media; equipment the user has). */
export interface PlanCandidate {
  slug: string;
  primaryMuscles: string[];
  equipment: string[];
}
