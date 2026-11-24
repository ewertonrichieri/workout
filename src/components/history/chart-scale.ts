/** Round tick steps (kg); the first that keeps the axis within `MAX_TICK_INTERVALS` wins. */
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500];
const MAX_TICK_INTERVALS = 5;
const EMPTY_AXIS_MAX = 1;

/** Y axis ticks from 0 with clean values covering `maxValue`. */
export function computeLoadTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, EMPTY_AXIS_MAX];
  const step = TICK_STEPS.find((candidate) => Math.ceil(maxValue / candidate) <= MAX_TICK_INTERVALS) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const intervals = Math.ceil(maxValue / step);
  return Array.from({ length: intervals + 1 }, (_, index) => index * step);
}

export interface PlotArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

const HALF = 2;

/** Points spread evenly by session order (x) and scaled from 0..`yMax` (y grows downwards in SVG). */
export function scaleChartPoints(values: readonly number[], yMax: number, area: PlotArea): ChartPoint[] {
  const lastIndex = values.length - 1;
  return values.map((value, index) => ({
    x: lastIndex === 0 ? area.left + area.width / HALF : area.left + (index * area.width) / lastIndex,
    y: area.top + area.height * (1 - value / yMax),
  }));
}
