import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { sendFormRequestForData, sendJsonRequest, sendJsonRequestForData } from "./send-json-request";

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

describe("sendFormRequestForData", () => {
  it("posts the multipart body as is (the browser sets the boundary) and validates the data", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { id: "a" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();
    body.append("photos", new Blob(["x"]), "a.webp");
    await expect(sendFormRequestForData("/api/x", body, dataSchema, FALLBACK)).resolves.toEqual({ ok: true, data: { id: "a" } });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", { method: "POST", body });
  });

  it("uses the server message on errors", async () => {
    mockFetch(429, { success: false, error: "Limite atingido." });
    await expect(sendFormRequestForData("/api/x", new FormData(), dataSchema, FALLBACK)).resolves.toEqual({ ok: false, message: "Limite atingido." });
  });
});
