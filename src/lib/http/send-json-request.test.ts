import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { sendJsonRequest, sendJsonRequestForData } from "./send-json-request";

const FALLBACK = "Falhou.";
const dataSchema = z.object({ id: z.string() });

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("sendJsonRequestForData", () => {
  it("returns the validated data of a successful envelope", async () => {
    mockFetch(201, { success: true, data: { id: "a" } });
    await expect(sendJsonRequestForData("/api/x", "POST", {}, dataSchema, FALLBACK)).resolves.toEqual({ ok: true, data: { id: "a" } });
  });

  it("uses the server message, or the fallback when the data is outside the schema", async () => {
    mockFetch(422, { success: false, error: "Treino não encontrado." });
    await expect(sendJsonRequestForData("/api/x", "POST", {}, dataSchema, FALLBACK)).resolves.toEqual({ ok: false, message: "Treino não encontrado." });
    mockFetch(201, { success: true, data: { other: 1 } });
    await expect(sendJsonRequestForData("/api/x", "POST", {}, dataSchema, FALLBACK)).resolves.toEqual({ ok: false, message: FALLBACK });
  });

  it("turns a network failure into the fallback message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(sendJsonRequestForData("/api/x", "POST", {}, dataSchema, FALLBACK)).resolves.toEqual({ ok: false, message: FALLBACK });
  });
});

describe("sendJsonRequest", () => {
  it("keeps returning only ok or a message", async () => {
    mockFetch(200, { success: true, data: { anything: 1 } });
    await expect(sendJsonRequest("/api/x", "PATCH", {}, FALLBACK)).resolves.toEqual({ ok: true });
    mockFetch(500, { success: false, error: "Erro interno." });
    await expect(sendJsonRequest("/api/x", "PATCH", {}, FALLBACK)).resolves.toEqual({ ok: false, message: "Erro interno." });
  });
});
