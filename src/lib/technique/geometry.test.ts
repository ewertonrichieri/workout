import { describe, expect, it } from "vitest";
import { angleAtVertex, angleFromVertical, distanceBetween, elevationAngle, toAspectSpace } from "./geometry";

describe("geometry", () => {
  it("measures the angle at a vertex in degrees", () => {
    expect(angleAtVertex({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180);
    expect(angleAtVertex({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(angleAtVertex({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45);
  });

  it("returns 0 for a degenerate angle instead of NaN", () => {
    expect(angleAtVertex({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(0);
  });

  it("measures the lean of a segment from the vertical (image y grows downwards)", () => {
    expect(angleFromVertical({ x: 0, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(angleFromVertical({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(45);
    expect(angleFromVertical({ x: 0, y: 1 }, { x: -1, y: 1 })).toBeCloseTo(90);
  });

  it("measures how far the first point is above the second, from the horizontal", () => {
    expect(elevationAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(elevationAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(elevationAngle({ x: 1, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(elevationAngle({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(-45);
  });

  it("measures distances", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it("undoes the image aspect ratio so angles match the real body", () => {
    expect(toAspectSpace({ x: 0.5, y: 0.25 }, 16 / 9)).toEqual({ x: 0.5 * (16 / 9), y: 0.25 });
  });
});
