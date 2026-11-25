import { z } from "zod";

export type JsonRequestResult = { ok: true } | { ok: false; message: string };
export type JsonDataRequestResult<Data> = { ok: true; data: Data } | { ok: false; message: string };

type JsonMethod = "POST" | "PATCH" | "PUT";

const envelopeSchema = z.object({ success: z.boolean(), data: z.unknown().optional(), error: z.string().optional() });

async function requestEnvelopeData<Data>(url: string, init: RequestInit, dataSchema: z.ZodType<Data>, fallbackMessage: string): Promise<JsonDataRequestResult<Data>> {
  try {
    const response = await fetch(url, init);
    const envelope = envelopeSchema.safeParse(await response.json());
    if (!envelope.success) return { ok: false, message: fallbackMessage };
    if (!response.ok || !envelope.data.success) return { ok: false, message: envelope.data.error ?? fallbackMessage };
    const data = dataSchema.safeParse(envelope.data.data);
    return data.success ? { ok: true, data: data.data } : { ok: false, message: fallbackMessage };
  } catch (error) {
    // Network failure (TypeError) or a body that is not JSON (SyntaxError): keep the user's data and explain.
    if (error instanceof TypeError || error instanceof SyntaxError) return { ok: false, message: fallbackMessage };
    throw error;
  }
}

/**
 * Client call to the app's own API (standard envelope) that also returns the validated `data`.
 * Never throws: failures, and data outside the schema, become a pt-BR message.
 */
export async function sendJsonRequestForData<Data>(
  url: string,
  method: JsonMethod,
  body: unknown,
  dataSchema: z.ZodType<Data>,
  fallbackMessage: string,
): Promise<JsonDataRequestResult<Data>> {
  const init = { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  return requestEnvelopeData(url, init, dataSchema, fallbackMessage);
}

/** Same as sendJsonRequestForData for file uploads: a multipart POST, the browser sets the content type. */
export async function sendFormRequestForData<Data>(url: string, body: FormData, dataSchema: z.ZodType<Data>, fallbackMessage: string): Promise<JsonDataRequestResult<Data>> {
  return requestEnvelopeData(url, { method: "POST", body }, dataSchema, fallbackMessage);
}

/** Same call when the caller only needs to know whether it worked. */
export async function sendJsonRequest(url: string, method: JsonMethod, body: unknown, fallbackMessage: string): Promise<JsonRequestResult> {
  const result = await sendJsonRequestForData(url, method, body, z.unknown(), fallbackMessage);
  return result.ok ? { ok: true } : result;
}

/** GET from the app's own API (standard envelope), with the data validated; never throws. */
export async function fetchJsonData<Data>(url: string, dataSchema: z.ZodType<Data>, fallbackMessage: string): Promise<JsonDataRequestResult<Data>> {
  return requestEnvelopeData(url, { method: "GET" }, dataSchema, fallbackMessage);
}

/** DELETE on the app's own API; `keepalive` lets it finish while the page closes (pending undo windows). */
export async function sendDeleteRequest(url: string, fallbackMessage: string, options: { keepalive?: boolean } = {}): Promise<JsonRequestResult> {
  const result = await requestEnvelopeData(url, { method: "DELETE", ...options }, z.unknown(), fallbackMessage);
  return result.ok ? { ok: true } : result;
}
