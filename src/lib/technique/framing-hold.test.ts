import { describe, expect, it } from "vitest";
import { createFramingHold } from "./framing-hold";

const HOLD_MS = 1000;

describe("createFramingHold", () => {
  it("is stable only after the body stays framed for the whole hold", () => {
    const hold = createFramingHold(HOLD_MS);
    expect(hold.update(true, 0)).toBe(false);
    expect(hold.update(true, 999)).toBe(false);
    expect(hold.update(true, 1000)).toBe(true);
  });

  it("restarts the hold when the body leaves the frame", () => {
    const hold = createFramingHold(HOLD_MS);
    hold.update(true, 0);
    expect(hold.update(false, 800)).toBe(false);
    expect(hold.update(true, 900)).toBe(false);
    expect(hold.update(true, 1899)).toBe(false);
    expect(hold.update(true, 1900)).toBe(true);
  });

  it("resets on demand", () => {
    const hold = createFramingHold(HOLD_MS);
    hold.update(true, 0);
    hold.reset();
    expect(hold.update(true, 1500)).toBe(false);
  });
});
