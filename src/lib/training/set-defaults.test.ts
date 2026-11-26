import { describe, expect, it } from "vitest";
import { fillWithDefaults, resolveSetDefaults, type SetEntry } from "./set-log-draft";

const EMPTY: SetEntry = { repsDone: "", load: "", isDone: false };

describe("resolveSetDefaults", () => {
  it("uses the fixed prescription for the first set and no load", () => {
    expect(resolveSetDefaults([EMPTY, EMPTY], 0, 10)).toEqual({ repsDone: "10", load: "" });
  });

  it("has no reps for the first set of a range", () => {
    expect(resolveSetDefaults([EMPTY, EMPTY], 0, null)).toEqual({ repsDone: "", load: "" });
  });

  it("repeats the reps and load of the previous set", () => {
    const sets = [{ repsDone: "11", load: "22,5", isDone: true }, EMPTY];
    expect(resolveSetDefaults(sets, 1, null)).toEqual({ repsDone: "11", load: "22,5" });
  });

  it("ignores invalid values of the previous set and falls back to the prescription", () => {
    const sets = [{ repsDone: "abc", load: "1,234", isDone: false }, EMPTY];
    expect(resolveSetDefaults(sets, 1, 10)).toEqual({ repsDone: "10", load: "" });
  });
});

describe("fillWithDefaults", () => {
  it("fills only the empty fields", () => {
    const entry = { repsDone: "", load: "30", isDone: false };
    expect(fillWithDefaults(entry, { repsDone: "10", load: "20" })).toEqual({ repsDone: "10", load: "30", isDone: false });
  });

  it("never replaces what the user typed", () => {
    const entry = { repsDone: "7", load: "", isDone: false };
    expect(fillWithDefaults(entry, { repsDone: "10", load: "" })).toEqual(entry);
  });
});
