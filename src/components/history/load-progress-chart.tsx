"use client";

import { translate } from "@/lib/i18n/translate";
import { computeLoadTicks, scaleChartPoints, type ChartPoint, type PlotArea } from "./chart-scale";
import { describeLoad, formatCalendarDate, formatShortDate } from "./history-labels";
import { useChartCursor } from "./use-chart-cursor";

export interface LoadPoint {
  date: string;
  loadKg: number;
}

interface LoadProgressChartProps {
  exerciseName: string;
  /** Sessions with a load, in chronological order (at least one). */
  points: readonly LoadPoint[];
}

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 200;
const PLOT: PlotArea = { left: 36, top: 16, width: 232, height: 148 };
const AXIS_LABEL_OFFSET = 8;
const X_LABEL_Y = PLOT.top + PLOT.height + 20;
const END_LABEL_GAP = 8;
const POINT_RADIUS = 4;
const ACTIVE_POINT_RADIUS = 6;
const PERCENT = 100;

function describeChart(exerciseName: string, points: readonly LoadPoint[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  return translate("history.chartLabel", {
    name: exerciseName,
    firstLoad: describeLoad(first.loadKg), firstDate: formatCalendarDate(first.date),
    lastLoad: describeLoad(last.loadKg), lastDate: formatCalendarDate(last.date),
  });
}

function YAxis({ ticks, yMax }: { ticks: readonly number[]; yMax: number }) {
  return ticks.map((tick) => {
    const y = PLOT.top + PLOT.height * (1 - tick / yMax);
    return (
      <g key={tick}>
        <line x1={PLOT.left} x2={PLOT.left + PLOT.width} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
        <text x={PLOT.left - AXIS_LABEL_OFFSET} y={y} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[10px] tabular-nums">{tick}</text>
      </g>
    );
  });
}

function SeriesLine({ coordinates, activeIndex }: { coordinates: readonly ChartPoint[]; activeIndex: number | null }) {
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  return (
    <>
      <path d={path} fill="none" className="stroke-chart-series" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coordinates.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={index === activeIndex ? ACTIVE_POINT_RADIUS : POINT_RADIUS} className="fill-chart-series stroke-surface" strokeWidth={2} />
      ))}
    </>
  );
}

/** Single-series line of the heaviest load per session, with crosshair tooltip (pointer and arrow keys). */
export function LoadProgressChart({ exerciseName, points }: LoadProgressChartProps) {
  const ticks = computeLoadTicks(Math.max(...points.map((point) => point.loadKg)));
  const yMax = ticks[ticks.length - 1];
  const coordinates = scaleChartPoints(points.map((point) => point.loadKg), yMax, PLOT);
  const { activeIndex, handlers } = useChartCursor(coordinates.map((point) => point.x), VIEW_WIDTH);
  const last = coordinates[coordinates.length - 1];
  const active = activeIndex === null ? null : { point: points[activeIndex], coordinate: coordinates[activeIndex] };
  return (
    <div role="group" tabIndex={0} aria-label={translate("history.chartKeyboardHint")} {...handlers}
      className="relative rounded-2xl border border-border bg-surface p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={describeChart(exerciseName, points)} className="block h-auto w-full touch-pan-y">
        <YAxis ticks={ticks} yMax={yMax} />
        {active && <line x1={active.coordinate.x} x2={active.coordinate.x} y1={PLOT.top} y2={PLOT.top + PLOT.height} className="stroke-muted" strokeWidth={1} />}
        <SeriesLine coordinates={coordinates} activeIndex={activeIndex} />
        <text x={last.x + END_LABEL_GAP} y={last.y} dominantBaseline="middle" className="fill-foreground text-[10px] font-semibold">{describeLoad(points[points.length - 1].loadKg)}</text>
        <text x={PLOT.left} y={X_LABEL_Y} className="fill-muted text-[10px]">{formatShortDate(points[0].date)}</text>
        {points.length > 1 && <text x={PLOT.left + PLOT.width} y={X_LABEL_Y} textAnchor="end" className="fill-muted text-[10px]">{formatShortDate(points[points.length - 1].date)}</text>}
      </svg>
      {active && (
        <p aria-live="polite" style={{ left: `${(active.coordinate.x / VIEW_WIDTH) * PERCENT}%` }}
          className="pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-background px-2 py-1 text-xs">
          {`${formatCalendarDate(active.point.date)} · ${describeLoad(active.point.loadKg)}`}
        </p>
      )}
    </div>
  );
}
