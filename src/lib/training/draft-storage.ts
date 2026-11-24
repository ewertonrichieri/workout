import { WORKOUT_DRAFT_STORAGE_PREFIX } from "@/lib/constants/training";

const KEY_SEPARATOR = ":";

export function buildDraftStorageKey(workoutId: string, date: string): string {
  return [WORKOUT_DRAFT_STORAGE_PREFIX, workoutId, date].join(KEY_SEPARATOR);
}

/** Blocked storage (private mode, policies) or corrupted JSON: the draft is simply not restored. */
function isRecoverableStorageError(error: unknown): boolean {
  return error instanceof DOMException || error instanceof SyntaxError;
}

/** Raw stored value (to be validated by the caller), or `null` when missing/unavailable. */
export function readStoredDraft(key: string): unknown {
  try {
    const text = window.localStorage.getItem(key);
    return text === null ? null : (JSON.parse(text) as unknown);
  } catch (error) {
    if (isRecoverableStorageError(error)) return null;
    throw error;
  }
}

/** Best effort: when storage is unavailable or full, logging keeps working without persistence. */
export function writeStoredDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (!isRecoverableStorageError(error)) throw error;
  }
}
