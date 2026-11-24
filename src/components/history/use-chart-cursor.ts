"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowDown"]);
const NEXT_KEYS = new Set(["ArrowRight", "ArrowUp"]);

/** Active point of a chart: nearest to the pointer, or moved with the arrow keys (starts at the latest). */
export function useChartCursor(pointXs: readonly number[], viewWidth: number) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastIndex = pointXs.length - 1;

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const viewX = ((event.clientX - bounds.left) / bounds.width) * viewWidth;
    const nearest = pointXs.reduce((best, x, index) => (Math.abs(x - viewX) < Math.abs(pointXs[best] - viewX) ? index : best), 0);
    setActiveIndex(nearest);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = PREVIOUS_KEYS.has(event.key) ? -1 : NEXT_KEYS.has(event.key) ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    setActiveIndex((current) => Math.min(Math.max((current ?? lastIndex) + step, 0), lastIndex));
  };

  return {
    activeIndex,
    handlers: {
      onPointerMove,
      onPointerLeave: () => setActiveIndex(null),
      onFocus: () => setActiveIndex(lastIndex),
      onBlur: () => setActiveIndex(null),
      onKeyDown,
    },
  };
}
