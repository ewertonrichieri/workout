import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDraftStorageKey, readStoredDraft, writeStoredDraft } from "./draft-storage";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("draft storage", () => {
  it("builds one key per workout and day", () => {
    expect(buildDraftStorageKey("workout-A", "2026-11-24")).toBe("workout-draft:workout-A:2026-11-24");
  });

  it("writes and reads JSON", () => {
    writeStoredDraft("key", { value: 1 });
    expect(readStoredDraft("key")).toEqual({ value: 1 });
  });

  it("returns null for missing or corrupted data", () => {
    expect(readStoredDraft("missing")).toBeNull();
    window.localStorage.setItem("corrupted", "{not json");
    expect(readStoredDraft("corrupted")).toBeNull();
  });

  it("keeps working when the storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(readStoredDraft("key")).toBeNull();
    expect(() => writeStoredDraft("key", { value: 1 })).not.toThrow();
  });
});
