import { describe, expect, it } from "vitest";
import { readSoundEnabled, writeSoundEnabled } from "./sound-preference";

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) };
}

describe("sound preference (D7: on by default, remembered on the device)", () => {
  it("is on by default and remembers when the user turns it off", () => {
    const storage = fakeStorage();
    expect(readSoundEnabled(storage)).toBe(true);
    writeSoundEnabled(storage, false);
    expect(readSoundEnabled(storage)).toBe(false);
    writeSoundEnabled(storage, true);
    expect(readSoundEnabled(storage)).toBe(true);
  });

  it("falls back to on when storage is unavailable", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => undefined };
    expect(readSoundEnabled(broken)).toBe(true);
    expect(() => writeSoundEnabled(broken, false)).not.toThrow();
    expect(readSoundEnabled(undefined)).toBe(true);
  });
});
