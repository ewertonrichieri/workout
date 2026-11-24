import { describe, expect, it } from "vitest";
import { computeLoadTicks, scaleChartPoints } from "./chart-scale";

describe("computeLoadTicks", () => {
  it("uses round steps from zero that cover the maximum", () => {
    expect(computeLoadTicks(22.5)).toEqual([0, 5, 10, 15, 20, 25]);
    expect(computeLoadTicks(87)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(computeLoadTicks(4)).toEqual([0, 1, 2, 3, 4]);
    expect(computeLoadTicks(0)).toEqual([0, 1]);
  });
});

describe("scaleChartPoints", () => {
  const area = { left: 40, top: 10, width: 200, height: 100 };

  it("spreads points evenly by order and maps loads to the y scale", () => {
    expect(scaleChartPoints([10, 20, 15], 20, area)).toEqual([
      { x: 40, y: 60 },
      { x: 140, y: 10 },
      { x: 240, y: 35 },
    ]);
  });

  it("centers a single point", () => {
    expect(scaleChartPoints([10], 20, area)).toEqual([{ x: 140, y: 60 }]);
  });
});
