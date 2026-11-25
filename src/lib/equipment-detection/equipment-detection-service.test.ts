// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { AiUsageGuard } from "@/lib/ai-usage/ai-usage-guard";
import { ExternalServiceError, InvalidInputError, RateLimitExceededError, UnprocessableError } from "@/lib/errors/app-errors";
import type { StructuredOutputClient } from "@/lib/integrations/claude/structured-output-client";
import type { Logger } from "@/lib/logger/logger";
import type { AiEquipmentDetection } from "./detection-schema";
import { createEquipmentDetectionService, type EquipmentDetectionServiceDependencies } from "./equipment-detection-service";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
const photo = () => new File([JPEG], "foto.jpg", { type: "image/jpeg" });
const VOCABULARY = [{ slug: "dumbbell", name: "Halteres" }, { slug: "bench", name: "Banco" }, { slug: "bodyweight", name: "Peso corporal" }];

interface SetupOptions {
  output?: AiEquipmentDetection;
  aiError?: Error;
  guardError?: Error;
  vocabulary?: typeof VOCABULARY;
}

function setup(options: SetupOptions = {}) {
  const generate = vi.fn(async () => {
    if (options.aiError) throw options.aiError;
    return options.output ?? { equipment: [{ slug: "dumbbell", confidence: "high", photoNumbers: [1] }, { slug: "treadmill", confidence: "high", photoNumbers: [2] }] };
  });
  const reserve = vi.fn<AiUsageGuard["reserve"]>(async () => {
    if (options.guardError) throw options.guardError;
  });
  const dependencies: EquipmentDetectionServiceDependencies = {
    equipmentSource: { listEquipment: vi.fn(async () => options.vocabulary ?? VOCABULARY) },
    aiUsageGuard: { reserve },
    structuredOutputClient: { generate } as unknown as StructuredOutputClient,
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger,
  };
  return { dependencies, generate, reserve, service: createEquipmentDetectionService(dependencies) };
}

describe("equipment detection service", () => {
  it("sends the labeled photos and the vocabulary to the AI and returns the sanitized list", async () => {
    const { service, generate, reserve, dependencies } = setup();
    await expect(service.detectEquipment([photo(), photo()])).resolves.toEqual({
      equipment: [{ slug: "dumbbell", name: "Halteres", confidence: "high", photoNumbers: [1] }],
    });
    expect(reserve).toHaveBeenCalledWith("equipment.detect");
    const [request] = generate.mock.calls[0] as unknown as [{ operation: string; effort: string; prompt: string; images: Array<{ label: string; mediaType: string }> }];
    expect(request).toMatchObject({ operation: "equipment.detect", effort: "low" });
    expect(request.images.map((image) => [image.label, image.mediaType])).toEqual([["Photo 1", "image/jpeg"], ["Photo 2", "image/jpeg"]]);
    expect(request.prompt).toContain("dumbbell | Halteres");
    expect(dependencies.logger.warn).toHaveBeenCalledWith("equipment detection items dropped", { operation: "equipment.detect", issues: ["unknown_slug"] });
    expect(JSON.stringify(vi.mocked(dependencies.logger.info).mock.calls)).not.toContain(Buffer.from(JPEG).toString("base64"));
  });

  it("returns an empty list when the photos show no equipment", async () => {
    const { service } = setup({ output: { equipment: [] } });
    await expect(service.detectEquipment([photo()])).resolves.toEqual({ equipment: [] });
  });

  it("validates the photos before counting the request or calling the AI", async () => {
    const { service, generate, reserve } = setup();
    await expect(service.detectEquipment([])).rejects.toBeInstanceOf(InvalidInputError);
    expect(reserve).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not call the AI once the daily limit is reached", async () => {
    const { service, generate } = setup({ guardError: new RateLimitExceededError("limite") });
    await expect(service.detectEquipment([photo()])).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(generate).not.toHaveBeenCalled();
  });

  it("lets AI failures reach the route (502 in Portuguese; the device keeps the user's list)", async () => {
    const { service } = setup({ aiError: new ExternalServiceError("indisponível") });
    await expect(service.detectEquipment([photo()])).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("explains when the catalog has no equipment, without calling the AI", async () => {
    const { service, generate } = setup({ vocabulary: [] });
    await expect(service.detectEquipment([photo()])).rejects.toBeInstanceOf(UnprocessableError);
    expect(generate).not.toHaveBeenCalled();
  });
});
