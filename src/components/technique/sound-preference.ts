import { SOUND_PREFERENCE_STORAGE_KEY } from "@/lib/constants/technique";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const SOUND_OFF_VALUE = "1";

/** Spoken cues are on unless the user turned them off on this device (D7); storage failures keep them on. */
export function readSoundEnabled(storage: PreferenceStorage | undefined): boolean {
  try {
    return storage?.getItem(SOUND_PREFERENCE_STORAGE_KEY) !== SOUND_OFF_VALUE;
  } catch {
    return true;
  }
}

/** Best effort: private windows or blocked storage just forget the choice. */
export function writeSoundEnabled(storage: PreferenceStorage | undefined, isEnabled: boolean): void {
  try {
    if (isEnabled) storage?.removeItem(SOUND_PREFERENCE_STORAGE_KEY);
    else storage?.setItem(SOUND_PREFERENCE_STORAGE_KEY, SOUND_OFF_VALUE);
  } catch {
    // The preference is a convenience; the toggle still works for this visit.
  }
}
