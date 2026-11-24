// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors/app-errors";
import type { Logger } from "@/lib/logger/logger";
import { respondWithJson } from "./api-handler";

function createFakeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("respondWithJson", () => {
  it("wraps data in the success envelope with HTTP 200", async () => {
    const response = await respondWithJson({ route: "/api/test", logger: createFakeLogger() }, async () => ({ value: 1 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: { value: 1 } });
  });

  it("uses the status and message of app errors", async () => {
    const response = await respondWithJson({ route: "/api/test", logger: createFakeLogger() }, async () => {
      throw new NotFoundError("Exercício não encontrado.");
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ success: false, error: "Exercício não encontrado." });
  });

  it("hides unexpected errors and logs them with the route", async () => {
    const logger = createFakeLogger();
    const response = await respondWithJson({ route: "/api/test", logger }, async () => {
      throw new Error("connection refused at 10.0.0.1");
    });
    expect(response.status).toBe(500);
    const body: unknown = await response.json();
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
    expect(logger.error).toHaveBeenCalledWith("api request failed", expect.objectContaining({ route: "/api/test" }));
  });
});
