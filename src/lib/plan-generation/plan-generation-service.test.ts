import { describe, expect, it, vi } from "vitest";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { ExternalServiceError, InvalidInputError, UnprocessableError } from "@/lib/errors/app-errors";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildPlanOverview } from "@/test/training-fixtures";
import type { GeneratedPlan } from "./generated-plan-schema";
import { createPlanGenerationService, type PlanGenerationDependencies } from "./plan-generation-service";

const ASSESSMENT: SavedAssessment = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-11-24T10:00:00.000Z",
  goal: "hypertrophy",
  experienceLevel: "beginner",
  daysPerWeek: 2,
  sessionMinutes: 45,
  splitPreference: "ai_decides",
  equipmentSlugs: ["dumbbell"],
  limitations: null,
};

const CANDIDATES = [{ slug: "goblet-squat", primaryMuscles: ["quadriceps"], equipment: ["dumbbell"] }];

const FULL_BODY: GeneratedPlan = {
  workouts: [{ label: "Full body", exercises: [{ exerciseSlug: "goblet-squat", category: null, sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, notes: null }] }],
};

function setup(overrides: { latest?: SavedAssessment | null; hasActivePlan?: boolean; candidates?: typeof CANDIDATES; output?: GeneratedPlan } = {}) {
  const activePlan = overrides.hasActivePlan ? buildPlanOverview([]).plan : null;
  const generate = vi.fn(async () => overrides.output ?? FULL_BODY);
  const dependencies: PlanGenerationDependencies = {
    assessmentRepository: { findLatestAssessment: vi.fn(async () => (overrides.latest === undefined ? ASSESSMENT : overrides.latest)) },
    planRepository: { findActivePlan: vi.fn(async () => activePlan) },
    generationRepository: { listCandidates: vi.fn(async () => overrides.candidates ?? CANDIDATES), createGeneratedPlan: vi.fn(async () => "plan-1") },
    structuredOutputClient: { generate } as unknown as StructuredOutputClient,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger,
    now: () => new Date("2026-11-24T15:00:00Z"),
  };
  return { dependencies, generate, service: createPlanGenerationService(dependencies) };
}

describe("plan generation service", () => {
  it("generates with the latest assessment and saves the plan", async () => {
    const { service, dependencies, generate } = setup();
    await expect(service.generatePlan("user-1", { replaceActivePlan: false })).resolves.toEqual({ planId: "plan-1" });
    expect(dependencies.generationRepository.listCandidates).toHaveBeenCalledWith(["dumbbell"]);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ operation: "plan.generate", model: "claude-haiku-5-5", effort: "medium", cacheSystem: true }));
    expect(dependencies.generationRepository.createGeneratedPlan).toHaveBeenCalledWith({
      assessmentId: ASSESSMENT.id,
      goal: "hypertrophy",
      startsOn: "2026-11-24",
      validUntil: "2027-01-04",
      replaceActivePlan: false,
      plan: FULL_BODY,
    });
  });

  it("rejects a body outside the schema", async () => {
    await expect(setup().service.generatePlan("user-1", { replaceActivePlan: "yes" })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("asks for an assessment first", async () => {
    const { service, generate } = setup({ latest: null });
    await expect(service.generatePlan("user-1", { replaceActivePlan: false })).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not call the AI when an active plan exists without confirmation", async () => {
    const { service, generate } = setup({ hasActivePlan: true });
    await expect(service.generatePlan("user-1", { replaceActivePlan: false })).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
    await expect(service.generatePlan("user-1", { replaceActivePlan: true })).resolves.toEqual({ planId: "plan-1" });
  });

  it("explains when no catalog exercise fits the equipment", async () => {
    const { service, generate } = setup({ candidates: [] });
    await expect(service.generatePlan("user-1", { replaceActivePlan: false })).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects a generated plan that breaks the rules without saving it, logging only issue codes", async () => {
    const split: GeneratedPlan = { workouts: [FULL_BODY.workouts[0], { ...FULL_BODY.workouts[0], label: "B" }] };
    const { service, dependencies } = setup({ output: split });
    await expect(service.generatePlan("user-1", { replaceActivePlan: false })).rejects.toBeInstanceOf(ExternalServiceError);
    expect(dependencies.generationRepository.createGeneratedPlan).not.toHaveBeenCalled();
    expect(dependencies.logger.warn).toHaveBeenCalledWith("generated plan rejected", { operation: "plan.generate", issues: ["workout_count"] });
  });

  it("tells whether the user has an assessment and an active plan", async () => {
    await expect(setup({ hasActivePlan: true }).service.getGenerationStatus("user-1")).resolves.toEqual({ hasAssessment: true, hasActivePlan: true });
    await expect(setup({ latest: null }).service.getGenerationStatus("user-1")).resolves.toEqual({ hasAssessment: false, hasActivePlan: false });
  });
});
