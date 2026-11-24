import { describe, expect, it, vi } from "vitest";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { ExternalServiceError, InvalidInputError, NotFoundError, RateLimitExceededError, UnprocessableError } from "@/lib/errors/app-errors";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { AiSubstitution } from "./substitution-schema";
import { createSubstitutionService, type SubstitutionServiceDependencies } from "./substitution-service";

const PRESCRIPTION_ID = "11111111-1111-4111-8111-111111111111";
const PRESS = buildWorkoutExercise(1, { id: PRESCRIPTION_ID, sets: 3, repsMin: 8, repsMax: 12 });
const ROW = buildWorkoutExercise(2, { id: "22222222-2222-4222-8222-222222222222" });
const PLAN = buildPlanOverview([buildWorkout("A", 1, [PRESS, ROW])]).plan;

const ASSESSMENT: SavedAssessment = {
  id: "77777777-7777-4777-8777-777777777777",
  createdAt: "2026-11-20T10:00:00.000Z",
  goal: "hypertrophy",
  experienceLevel: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  splitPreference: "ai_decides",
  equipmentSlugs: ["machine", "dumbbell", "bench", "bodyweight"],
  limitations: "Ombro esquerdo",
};

const profile = (slug: string, secondaryMuscles: string[], equipment: string[]) => ({ slug, primaryMuscles: ["chest"], secondaryMuscles, equipment });
const ORIGINAL = profile("fake-exercise-1", ["triceps"], ["machine"]);
const CANDIDATES = [
  profile("push-up", [], ["bodyweight"]),
  profile("dumbbell-bench-press", ["triceps"], ["dumbbell", "bench"]),
  profile("lever-pec-deck", [], ["machine"]),
  profile("fake-exercise-2", ["triceps"], ["dumbbell"]),
  profile("dumbbell-fly", [], ["dumbbell", "bench"]),
];
const info = (slug: string) => ({ id: `id-${slug}`, slug, name: `Nome ${slug}`, coverMedia: null, media: [] });

interface SetupOptions {
  assessment?: SavedAssessment | null;
  output?: AiSubstitution;
  aiError?: Error;
  candidates?: typeof CANDIDATES;
}

function setup(options: SetupOptions = {}) {
  const generate = vi.fn(async () => {
    if (options.aiError) throw options.aiError;
    return options.output ?? { suggestions: [{ exerciseSlug: "dumbbell-bench-press", reason: "Mesmo empurrar" }, { exerciseSlug: "push-up", reason: "Sem aparelho" }] };
  });
  const dependencies: SubstitutionServiceDependencies = {
    planRepository: { findActivePlan: vi.fn(async () => PLAN) },
    assessmentRepository: { findLatestAssessment: vi.fn(async () => (options.assessment === undefined ? ASSESSMENT : options.assessment)) },
    substitutionRepository: { listCandidates: vi.fn(async () => ({ original: ORIGINAL, candidates: options.candidates ?? CANDIDATES })) },
    exerciseSource: {
      listExerciseProfiles: vi.fn(async () => [{ slug: "fake-exercise-1", primaryMuscles: ["chest"], equipment: ["machine"] }, { slug: "fake-exercise-2", primaryMuscles: ["back"], equipment: ["cable"] }]),
      findExercisesBySlugs: vi.fn(async (slugs: readonly string[]) => [...slugs].reverse().map(info)),
    },
    structuredOutputClient: { generate } as unknown as StructuredOutputClient,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger,
  };
  return { dependencies, generate, service: createSubstitutionService(dependencies) };
}

describe("substitution service", () => {
  it("lets the AI choose among the filtered options and keeps its order", async () => {
    const { service, generate, dependencies } = setup();
    await expect(service.suggestSubstitutes("user-1", PRESCRIPTION_ID, { reason: "equipment_busy", excludeSlugs: ["dumbbell-fly"] })).resolves.toEqual({
      isAutomatic: false,
      suggestions: [
        { exercise: info("dumbbell-bench-press"), reason: "Mesmo empurrar" },
        { exercise: info("push-up"), reason: "Sem aparelho" },
      ],
    });
    expect(dependencies.substitutionRepository.listCandidates).toHaveBeenCalledWith("fake-exercise-1", ASSESSMENT.equipmentSlugs);
    const request = generate.mock.calls[0] as unknown as [{ prompt: string; operation: string; effort: string }];
    expect(request[0]).toMatchObject({ operation: "workout.substitute", effort: "low" });
    expect(request[0].prompt).toContain("dumbbell-bench-press");
    expect(request[0].prompt).not.toContain("lever-pec-deck |");
    expect(request[0].prompt).not.toContain("fake-exercise-2 |");
    expect(request[0].prompt).not.toContain("dumbbell-fly |");
    expect(request[0].prompt).toContain("<user_limitations>");
  });

  it.each([
    ["the AI is unavailable", { aiError: new ExternalServiceError("x") }],
    ["the AI is rate limited", { aiError: new RateLimitExceededError("x") }],
    ["the AI picks outside the list", { output: { suggestions: [{ exerciseSlug: "lever-pec-deck", reason: "x" }] } }],
  ])("falls back to the automatic order when %s", async (_name, options) => {
    const { service, dependencies } = setup(options);
    await expect(service.suggestSubstitutes("user-1", PRESCRIPTION_ID, { reason: "equipment_busy" })).resolves.toEqual({
      isAutomatic: true,
      suggestions: [
        { exercise: info("dumbbell-bench-press"), reason: null },
        { exercise: info("dumbbell-fly"), reason: null },
        { exercise: info("push-up"), reason: null },
      ],
    });
    expect(dependencies.logger.warn).toHaveBeenCalled();
  });

  it("uses the plan's equipment plus bodyweight without an assessment", async () => {
    const { service, dependencies } = setup({ assessment: null });
    await service.suggestSubstitutes("user-1", PRESCRIPTION_ID, {});
    expect(dependencies.exerciseSource.listExerciseProfiles).toHaveBeenCalledWith(["fake-exercise-1", "fake-exercise-2"]);
    expect(dependencies.substitutionRepository.listCandidates).toHaveBeenCalledWith("fake-exercise-1", ["machine", "cable", "bodyweight"]);
  });

  it("explains when nothing fits, without calling the AI", async () => {
    const { service, generate } = setup({ candidates: [profile("lever-pec-deck", [], ["machine"])] });
    await expect(service.suggestSubstitutes("user-1", PRESCRIPTION_ID, { reason: "equipment_broken" })).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects invalid input and exercises outside the active plan", async () => {
    const { service } = setup();
    await expect(service.suggestSubstitutes("user-1", "abc", {})).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.suggestSubstitutes("user-1", PRESCRIPTION_ID, { reason: "lazy" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.suggestSubstitutes("user-1", "33333333-3333-4333-8333-333333333333", {})).rejects.toBeInstanceOf(NotFoundError);
  });
});
