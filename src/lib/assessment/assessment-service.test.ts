import { describe, expect, it, vi } from "vitest";
import { InvalidInputError, UnprocessableError } from "@/lib/errors/app-errors";
import type { AssessmentRepository } from "./assessment-repository";
import { createAssessmentService, type EquipmentSource } from "./assessment-service";

const EQUIPMENT = [
  { slug: "bench", name: "Banco" },
  { slug: "dumbbell", name: "Halteres" },
];

const VALID_INPUT = {
  goal: "strength",
  experienceLevel: "intermediate",
  daysPerWeek: 4,
  sessionMinutes: 45,
  splitPreference: "split",
  equipmentSlugs: ["dumbbell"],
  limitations: "",
};

const SAVED = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-11-26T10:00:00.000Z",
  goal: "strength" as const,
  experienceLevel: "intermediate" as const,
  daysPerWeek: 4,
  sessionMinutes: 45,
  splitPreference: "split" as const,
  equipmentSlugs: ["dumbbell"],
  limitations: null,
};

function setup(latest: typeof SAVED | null = null) {
  const repository: AssessmentRepository = {
    saveAssessment: vi.fn(async () => SAVED.id),
    findLatestAssessment: vi.fn(async () => latest),
  };
  const equipmentSource: EquipmentSource = { listEquipment: vi.fn(async () => EQUIPMENT) };
  return { repository, service: createAssessmentService(repository, equipmentSource) };
}

describe("assessment service: saveAssessment", () => {
  it("saves a valid assessment with normalized limitations", async () => {
    const { service, repository } = setup();
    await expect(service.saveAssessment(VALID_INPUT)).resolves.toEqual({ assessmentId: SAVED.id });
    expect(repository.saveAssessment).toHaveBeenCalledWith({ ...VALID_INPUT, limitations: null });
  });

  it("rejects input outside the schema", async () => {
    const { service, repository } = setup();
    await expect(service.saveAssessment({ ...VALID_INPUT, daysPerWeek: 9 })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.saveAssessment("not an object")).rejects.toBeInstanceOf(InvalidInputError);
    expect(repository.saveAssessment).not.toHaveBeenCalled();
  });

  it("rejects equipment that is not in the catalog", async () => {
    const { service, repository } = setup();
    await expect(service.saveAssessment({ ...VALID_INPUT, equipmentSlugs: ["dumbbell", "laser"] })).rejects.toBeInstanceOf(UnprocessableError);
    expect(repository.saveAssessment).not.toHaveBeenCalled();
  });
});

describe("assessment service: getAssessmentForm", () => {
  it("returns the catalog equipment and the latest assessment of the user", async () => {
    const { service, repository } = setup(SAVED);
    await expect(service.getAssessmentForm("user-1")).resolves.toEqual({ equipment: EQUIPMENT, latest: SAVED });
    expect(repository.findLatestAssessment).toHaveBeenCalledWith("user-1");
  });

  it("returns no latest assessment for a new user", async () => {
    await expect(setup().service.getAssessmentForm("user-1")).resolves.toEqual({ equipment: EQUIPMENT, latest: null });
  });
});
