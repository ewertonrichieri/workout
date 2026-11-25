// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { ExternalServiceError, InvalidInputError, NotFoundError, RateLimitExceededError, UnprocessableError } from "@/lib/errors/app-errors";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import type { AiTechniqueAnalysis } from "./analysis-schema";
import type { TechniqueAnalysisRecord } from "./technique-analysis-repository";
import { createTechniqueAnalysisService, type TechniqueAnalysisServiceDependencies } from "./technique-analysis-service";
import { buildRepMetrics } from "./test-fixtures";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ANALYSIS_ID = "00000000-0000-4000-8000-0000000000aa";
const EXERCISE = { id: "00000000-0000-4000-8000-0000000000e1", slug: "barbell-back-squat", name: "Agachamento livre com barra" } as ExerciseDetail;
const AI_OUTPUT: AiTechniqueAnalysis = {
  overallScore: 7,
  reps: [{ repNumber: 1, score: 9 }, { repNumber: 2, score: 5 }],
  strengths: ["Boa profundidade na 1ª repetição."],
  corrections: [{ issue: "shallow_depth", repNumbers: [2], text: "Desça até a coxa ficar paralela." }],
  mainTip: "Desça um pouco mais.",
};
const INPUT = { exerciseSlug: "barbell-back-squat", cameraView: "side", reps: [buildRepMetrics(1), buildRepMetrics(2, { minThighAngle: 20 })] };

interface SetupOptions {
  aiError?: Error;
  guardError?: Error;
  exercise?: ExerciseDetail | null;
  hasLimitations?: boolean;
}

function setup(options: SetupOptions = {}) {
  const generate = vi.fn(async () => {
    if (options.aiError) throw options.aiError;
    return AI_OUTPUT;
  });
  const reserve = vi.fn<AiUsageGuard["reserve"]>(async () => {
    if (options.guardError) throw options.guardError;
  });
  const saveAnalysis = vi.fn<(record: TechniqueAnalysisRecord) => Promise<string>>(async () => ANALYSIS_ID);
  const dependencies: TechniqueAnalysisServiceDependencies = {
    exerciseSource: { findBySlug: vi.fn(async () => (options.exercise === undefined ? EXERCISE : options.exercise)) },
    limitationsSource: { hasLimitations: vi.fn(async () => options.hasLimitations ?? false) },
    aiUsageGuard: { reserve },
    structuredOutputClient: { generate } as unknown as StructuredOutputClient,
    analysisRepository: { saveAnalysis },
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger,
  };
  return { generate, reserve, saveAnalysis, service: createTechniqueAnalysisService(dependencies) };
}

describe("technique analysis service (step 5.4)", () => {
  it("recomputes the issues, asks the AI with numbers only and saves the analysis", async () => {
    const { service, generate, reserve, saveAnalysis } = setup({ hasLimitations: true });
    const result = await service.analyze(USER_ID, INPUT);
    expect(reserve).toHaveBeenCalledWith("technique.analyze");
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ operation: "technique.analyze", effort: "low" }));
    const [request] = generate.mock.calls[0] as unknown as [{ prompt: string }];
    expect(request.prompt).toContain("Rep 2: knee 80°, thigh 20° above parallel");
    expect(request.prompt).toContain("issues: shallow_depth (error)");
    expect(saveAnalysis).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: EXERCISE.id, cameraView: "side", overallScore: 7, mainTip: "Desça um pouco mais." }));
    expect(result).toMatchObject({
      id: ANALYSIS_ID,
      overallScore: 7,
      hasLimitations: true,
      reps: [
        { repNumber: 1, score: 9, isEvaluated: true, issues: [] },
        { repNumber: 2, score: 5, isEvaluated: true, issues: [{ issue: "shallow_depth", severity: "error" }] },
      ],
    });
  });

  it("ignores issues the phone may have computed: only the server rules count", async () => {
    const { service } = setup();
    const tampered = { ...INPUT, reps: [buildRepMetrics(1), buildRepMetrics(2)] };
    const result = await service.analyze(USER_ID, tampered);
    expect(result.reps.every((rep) => rep.issues.length === 0)).toBe(true);
  });

  it("rejects invalid input and exercises without technique rules (400)", async () => {
    const { service, generate } = setup();
    await expect(service.analyze(USER_ID, { ...INPUT, reps: [] })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.analyze(USER_ID, { ...INPUT, exerciseSlug: "leg-press" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(service.analyze(USER_ID, { ...INPUT, cameraView: "front" })).rejects.toBeInstanceOf(InvalidInputError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not call the AI when most reps were not seen (422)", async () => {
    const { service, generate, reserve } = setup();
    const unseen = buildRepMetrics(2, { frameCount: 100, seenFrameCount: 10 });
    await expect(service.analyze(USER_ID, { ...INPUT, reps: [unseen, { ...unseen, repNumber: 3 }, buildRepMetrics(1)] })).rejects.toBeInstanceOf(UnprocessableError);
    expect(reserve).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns 404 for an exercise missing from the catalog", async () => {
    const { service } = setup({ exercise: null });
    await expect(service.analyze(USER_ID, INPUT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("saves nothing when the limit is reached or the AI fails (decision D9)", async () => {
    const limited = setup({ guardError: new RateLimitExceededError("limite") });
    await expect(limited.service.analyze(USER_ID, INPUT)).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(limited.generate).not.toHaveBeenCalled();
    const failing = setup({ aiError: new ExternalServiceError("IA fora") });
    await expect(failing.service.analyze(USER_ID, INPUT)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(failing.saveAnalysis).not.toHaveBeenCalled();
  });
});
