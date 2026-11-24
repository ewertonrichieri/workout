import { z } from "zod";

export type JsonRequestResult = { ok: true } | { ok: false; message: string };

type JsonMethod = "POST" | "PATCH";

const envelopeSchema = z.object({ success: z.boolean(), error: z.string().optional() });

/** Client call to the app's own API (standard envelope); never throws: failures become a pt-BR message. */
export async function sendJsonRequest(url: string, method: JsonMethod, body: unknown, fallbackMessage: string): Promise<JsonRequestResult> {
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const envelope = envelopeSchema.safeParse(await response.json());
    if (response.ok && envelope.success && envelope.data.success) return { ok: true };
    return envelope.success && envelope.data.error ? { ok: false, message: envelope.data.error } : { ok: false, message: fallbackMessage };
  } catch (error) {
    // Network failure (TypeError) or a body that is not JSON (SyntaxError): keep the user's data and explain.
    if (error instanceof TypeError || error instanceof SyntaxError) return { ok: false, message: fallbackMessage };
    throw error;
  }
}
