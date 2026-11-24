import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import { InvalidInputError, UnprocessableError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";
import type { AssessmentRepository } from "./assessment-repository";
import { assessmentInputSchema, type AssessmentInput, type SavedAssessment } from "./assessment-schema";

/** Catalog equipment the user can pick (satisfied by the exercise repository). */
export interface EquipmentSource {
  listEquipment(): Promise<CatalogTerm[]>;
}

export interface AssessmentForm {
  equipment: CatalogTerm[];
  latest: SavedAssessment | null;
}

export interface AssessmentService {
  /** The owner comes from the session inside the database function (auth.uid()). */
  saveAssessment(rawInput: unknown): Promise<{ assessmentId: string }>;
  getAssessmentForm(userId: string): Promise<AssessmentForm>;
}

function parseInput(rawInput: unknown): AssessmentInput {
  const parsed = assessmentInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new InvalidInputError(translate("errors.invalidInput"));
  return parsed.data;
}

function assertEquipmentInCatalog(slugs: readonly string[], catalog: readonly CatalogTerm[]): void {
  const known = new Set(catalog.map((term) => term.slug));
  if (!slugs.every((slug) => known.has(slug))) throw new UnprocessableError(translate("assessment.unknownEquipment"));
}

export function createAssessmentService(repository: AssessmentRepository, equipmentSource: EquipmentSource): AssessmentService {
  return {
    async saveAssessment(rawInput) {
      const input = parseInput(rawInput);
      assertEquipmentInCatalog(input.equipmentSlugs, await equipmentSource.listEquipment());
      return { assessmentId: await repository.saveAssessment(input) };
    },
    async getAssessmentForm(userId) {
      const [equipment, latest] = await Promise.all([equipmentSource.listEquipment(), repository.findLatestAssessment(userId)]);
      return { equipment, latest };
    },
  };
}
