import { describe, expect, it, vi } from "vitest";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { ExternalServiceError, InvalidInputError, NotFoundError, UnprocessableError } from "@/lib/errors/app-errors";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import { buildPlanOverview, buildWorkout, buildWorkoutExercise } from "@/test/training-fixtures";
import type { StoredCheckin } from "./adjustment-repository";
import type { AiDailyAdjustment } from "./adjustment-schema";
import { createAdjustmentService, type AdjustmentServiceDependencies } from "./adjustment-service";

const CHECKIN_ID = "44444444-4444-4444-8444-444444444444";
const WORKOUT_ID = "66666666-6666-4666-8666-666666666666";
const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";

const WORKOUT = { ...buildWorkout("A", 1, [
  buildWorkoutExercise(1, { id: FIRST_ID, sets: 4, repsMin: 8, repsMax: 12 }),
  buildWorkoutExercise(2, { id: SECOND_ID, sets: 3, repsMin: 10, repsMax: 10 }),
]), id: WORKOUT_ID };
const PLAN = buildPlanOverview([WORKOUT]).plan;

const CHECKIN: StoredCheckin = {
  id: CHECKIN_ID,
  workoutId: WORKOUT_ID,
  sleepQuality: "poor",
  energyLevel: "normal",
  availableMinutes: 45,
  createdAt: "2026-11-24T12:00:00+00:00",
  pains: [{ bodyRegion: "knees", intensity: "severe" }],
  hasFinishedSession: false,
};

const ASSESSMENT: SavedAssessment = {
  id: "77777777-7777-4777-8777-777777777777",
  createdAt: "2026-11-20T10:00:00.000Z",
  goal: "hypertrophy",
  experienceLevel: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  splitPreference: "ai_decides",
  equipmentSlugs: ["dumbbell"],
  limitations: "Joelho direito",
};

const PROFILES = [
  { slug: "fake-exercise-1", primaryMuscles: ["quadriceps"], equipment: ["barbell"] },
  { slug: "fake-exercise-2", primaryMuscles: ["chest"], equipment: ["dumbbell"] },
];
const CANDIDATES = [
  { slug: "goblet-squat", primaryMuscles: ["quadriceps"], equipment: ["dumbbell"] },
  { slug: "curl", primaryMuscles: ["biceps"], equipment: ["dumbbell"] },
];
const GOBLET = { id: "55555555-5555-4555-8555-555555555555", slug: "goblet-squat", name: "Agachamento goblet", coverMedia: null, media: [] };

const AI_OUTPUT: AiDailyAdjustment = {
  summary: "Treino mais leve e sem carga no joelho.",
  estimatedMinutes: 40,
  changes: [
    { exerciseSlug: "fake-exercise-1", changeType: "replaced", replacementSlug: "goblet-squat", sets: 3, repsMin: null, repsMax: 10, reason: "Poupa o joelho" },
    { exerciseSlug: "fake-exercise-2", changeType: "reduced", replacementSlug: null, sets: 2, repsMin: null, repsMax: null, reason: "Dormiu mal" },
  ],
};

interface SetupOptions {
  checkin?: StoredCheckin | null;
  assessment?: SavedAssessment | null;
  output?: AiDailyAdjustment;
}

function setup(options: SetupOptions = {}) {
  const generate = vi.fn(async () => options.output ?? AI_OUTPUT);
  const dependencies: AdjustmentServiceDependencies = {
    adjustmentRepository: {
      findCheckin: vi.fn(async () => (options.checkin === undefined ? CHECKIN : options.checkin)),
      listExerciseProfiles: vi.fn(async () => PROFILES),
      findExercisesBySlugs: vi.fn(async () => [GOBLET]),
      saveAdjustments: vi.fn(async () => undefined),
    },
    planRepository: { findActivePlan: vi.fn(async () => PLAN) },
    assessmentRepository: { findLatestAssessment: vi.fn(async () => (options.assessment === undefined ? ASSESSMENT : options.assessment)) },
    candidateSource: { listCandidates: vi.fn(async () => CANDIDATES) },
    structuredOutputClient: { generate } as unknown as StructuredOutputClient,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger,
    now: () => new Date("2026-11-24T20:00:00Z"),
  };
  return { dependencies, generate, service: createAdjustmentService(dependencies) };
}

describe("adjustment service: proposeAdjustment", () => {
  it("asks the AI with the check-in, today's workout and swap options, and resolves the proposal", async () => {
    const { service, generate, dependencies } = setup();
    await expect(service.proposeAdjustment("user-1", CHECKIN_ID)).resolves.toEqual({
      checkinId: CHECKIN_ID,
      summary: AI_OUTPUT.summary,
      estimatedMinutes: 40,
      changes: [
        { workoutExerciseId: FIRST_ID, changeType: "replaced", replacementSlug: "goblet-squat", sets: 3, repsMin: 8, repsMax: 10, reason: "Poupa o joelho", replacement: GOBLET },
        { workoutExerciseId: SECOND_ID, changeType: "reduced", replacementSlug: null, sets: 2, repsMin: 10, repsMax: 10, reason: "Dormiu mal", replacement: null },
      ],
    });
    expect(dependencies.adjustmentRepository.findCheckin).toHaveBeenCalledWith(CHECKIN_ID, "user-1");
    expect(dependencies.adjustmentRepository.listExerciseProfiles).toHaveBeenCalledWith(["fake-exercise-1", "fake-exercise-2"]);
    expect(dependencies.candidateSource.listCandidates).toHaveBeenCalledWith(["dumbbell"]);
    const request = generate.mock.calls[0] as unknown as [{ system: string; prompt: string; operation: string; effort: string; cacheSystem: boolean }];
    expect(request[0]).toMatchObject({ operation: "readiness.adjust", effort: "medium", cacheSystem: true });
    expect(request[0].system).toContain("goblet-squat");
    expect(request[0].system).not.toContain("curl |");
    expect(request[0].prompt).toContain("knees: severe");
    expect(request[0].prompt).toContain("<user_limitations>");
    expect(request[0].prompt).not.toContain(CHECKIN_ID);
  });

  it("accepts an answer without changes", async () => {
    const { service } = setup({ output: { summary: "Nada a mudar.", estimatedMinutes: 45, changes: [] } });
    await expect(service.proposeAdjustment("user-1", CHECKIN_ID)).resolves.toMatchObject({ changes: [] });
  });

  it("rejects an AI answer that breaks the rules, without retrying", async () => {
    const { service, generate, dependencies } = setup({ output: { ...AI_OUTPUT, changes: [{ ...AI_OUTPUT.changes[1], sets: 5 }] } });
    await expect(service.proposeAdjustment("user-1", CHECKIN_ID)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(dependencies.logger.warn).toHaveBeenCalledWith("daily adjustment rejected", expect.objectContaining({ issues: ["above_plan"] }));
  });

  it("does not call the AI when the check-in does not ask for an adjustment", async () => {
    const { service, generate } = setup({ checkin: { ...CHECKIN, sleepQuality: "good", pains: [], availableMinutes: 60 } });
    await expect(service.proposeAdjustment("user-1", CHECKIN_ID)).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("without an assessment, offers no swap options", async () => {
    const { service, generate, dependencies } = setup({ assessment: null, output: { ...AI_OUTPUT, changes: [AI_OUTPUT.changes[1]] } });
    await service.proposeAdjustment("user-1", CHECKIN_ID);
    expect(dependencies.candidateSource.listCandidates).not.toHaveBeenCalled();
    const request = generate.mock.calls[0] as unknown as [{ system: string }];
    expect(request[0].system).toContain("No replacement options");
  });

  it.each([
    ["an invalid id", "abc", {}, InvalidInputError],
    ["a check-in of someone else", CHECKIN_ID, { checkin: null }, NotFoundError],
    ["a check-in of another day", CHECKIN_ID, { checkin: { ...CHECKIN, createdAt: "2026-11-23T12:00:00+00:00" } }, UnprocessableError],
    ["a finished workout", CHECKIN_ID, { checkin: { ...CHECKIN, hasFinishedSession: true } }, UnprocessableError],
    ["a workout outside the active plan", CHECKIN_ID, { checkin: { ...CHECKIN, workoutId: null } }, NotFoundError],
  ])("rejects %s before calling the AI", async (_name, checkinId, options, errorType) => {
    const { service, generate } = setup(options as SetupOptions);
    await expect(service.proposeAdjustment("user-1", checkinId)).rejects.toBeInstanceOf(errorType);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("adjustment service: saveAdjustment", () => {
  const ACCEPTED = { workoutExerciseId: SECOND_ID, changeType: "reduced", replacementSlug: null, sets: 2, repsMin: 10, repsMax: 10, reason: "Dormiu mal" };

  it("revalidates and saves the accepted changes", async () => {
    const { service, dependencies } = setup();
    await expect(service.saveAdjustment("user-1", CHECKIN_ID, { changes: [ACCEPTED] })).resolves.toEqual({ changes: 1 });
    expect(dependencies.adjustmentRepository.saveAdjustments).toHaveBeenCalledWith(CHECKIN_ID, [ACCEPTED]);
  });

  it("restores the original workout with an empty list", async () => {
    const { service, dependencies } = setup({ checkin: { ...CHECKIN, sleepQuality: "good", pains: [], availableMinutes: 60 } });
    await expect(service.saveAdjustment("user-1", CHECKIN_ID, { changes: [] })).resolves.toEqual({ changes: 0 });
    expect(dependencies.adjustmentRepository.saveAdjustments).toHaveBeenCalledWith(CHECKIN_ID, []);
  });

  it("never trusts changes that break the rules", async () => {
    const { service, dependencies } = setup();
    await expect(service.saveAdjustment("user-1", CHECKIN_ID, { changes: [{ ...ACCEPTED, sets: 9 }] })).rejects.toBeInstanceOf(UnprocessableError);
    await expect(service.saveAdjustment("user-1", CHECKIN_ID, { changes: [{ ...ACCEPTED, changeType: "replaced", replacementSlug: "curl" }] })).rejects.toBeInstanceOf(UnprocessableError);
    await expect(service.saveAdjustment("user-1", CHECKIN_ID, { changes: "x" })).rejects.toBeInstanceOf(InvalidInputError);
    expect(dependencies.adjustmentRepository.saveAdjustments).not.toHaveBeenCalled();
  });
});
