import { z } from "zod";
import { translate } from "@/lib/i18n/translate";
import type { FinishWorkoutInput } from "@/lib/training/session-schema";

export const FINISH_WORKOUT_ENDPOINT = "/api/workout-sessions";

export type FinishWorkoutResult = { ok: true } | { ok: false; message: string };

const responseSchema = z.object({ success: z.boolean(), error: z.string().optional() });

/** Sends "Finalizar treino" to the app's own API; never throws (network failure → friendly message). */
export async function submitFinishedWorkout(payload: FinishWorkoutInput): Promise<FinishWorkoutResult> {
  const failed: FinishWorkoutResult = { ok: false, message: translate("training.finish.failed") };
  try {
    const response = await fetch(FINISH_WORKOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = responseSchema.safeParse(await response.json());
    if (response.ok && body.success && body.data.success) return { ok: true };
    return body.success && body.data.error ? { ok: false, message: body.data.error } : failed;
  } catch (error) {
    if (error instanceof TypeError || error instanceof SyntaxError) return failed;
    throw error;
  }
}
