import { IDLE_STOP_MS, MAX_UNSEEN_FRAME_RATIO, MIN_REP_DURATION_MS, MIN_SEEN_FRAME_RATIO_TO_COUNT } from "@/lib/constants/technique-rules";
import type { CounterRule, MetricSpec, MovementPattern } from "./patterns/pattern-types";
import type { FrameMeasures, FrameSample, TechniqueRep } from "./rep-types";

export interface RepTracker {
  addFrame: (frame: FrameSample) => void;
  readonly repCount: number;
  /** At rest for IDLE_STOP_MS after at least one rep (decision D8). */
  isIdle: (nowMs: number) => boolean;
  /** Finished reps; a rep still in progress is dropped. */
  finish: () => TechniqueRep[];
}

interface RepInProgress {
  startMs: number;
  bottomMs: number;
  extremeSignal: number;
  restValues: Readonly<Record<string, number>>;
  metrics: Record<string, number>;
  frameCount: number;
  seenFrameCount: number;
}

interface TrackerState {
  phase: "waiting_rest" | "rest" | "moving";
  /** Last frame at rest: where the next rep starts and the baseline of relative metrics. */
  lastRest: { timestampMs: number; values: Readonly<Record<string, number>> };
  lastRepEndMs: number;
  current: RepInProgress | null;
  reps: TechniqueRep[];
}

const isAtRest = (rule: CounterRule, signal: number) => (rule.direction === "decreasing" ? signal >= rule.restAt : signal <= rule.restAt);
const hasLeftRest = (rule: CounterRule, signal: number) => (rule.direction === "decreasing" ? signal < rule.startAt : signal > rule.startAt);
const isFurther = (rule: CounterRule, signal: number, extreme: number) => (rule.direction === "decreasing" ? signal < extreme : signal > extreme);
const hasReachedTarget = (rule: CounterRule, extreme: number) => (rule.direction === "decreasing" ? extreme <= rule.targetAt : extreme >= rule.targetAt);

function updateMetric(metrics: Record<string, number>, spec: MetricSpec, value: number): void {
  const previous = metrics[spec.name];
  if (previous === undefined) metrics[spec.name] = value;
  else metrics[spec.name] = spec.keep === "min" ? Math.min(previous, value) : Math.max(previous, value);
}

function accumulate(pattern: MovementPattern, rep: RepInProgress, frame: FrameSample): void {
  rep.frameCount += 1;
  const measures = frame.measures;
  if (!measures) return;
  rep.seenFrameCount += 1;
  if (rep.seenFrameCount === 1 || isFurther(pattern.counter, measures.signal, rep.extremeSignal)) {
    rep.extremeSignal = measures.signal;
    rep.bottomMs = frame.timestampMs;
  }
  pattern.metrics.forEach((spec) => updateMetric(rep.metrics, spec, spec.read(measures.values, rep.restValues)));
}

function closeRep(rep: RepInProgress, repNumber: number, endMs: number): TechniqueRep {
  const unseenRatio = (rep.frameCount - rep.seenFrameCount) / rep.frameCount;
  return {
    repNumber, startMs: rep.startMs, bottomMs: rep.bottomMs, endMs, descentMs: rep.bottomMs - rep.startMs,
    frameCount: rep.frameCount, seenFrameCount: rep.seenFrameCount, isEvaluated: unseenRatio <= MAX_UNSEEN_FRAME_RATIO, metrics: rep.metrics,
  };
}

function startRep(state: TrackerState, pattern: MovementPattern, frame: FrameSample): void {
  const { timestampMs, values } = state.lastRest;
  state.current = { startMs: timestampMs, bottomMs: timestampMs, extremeSignal: 0, restValues: values, metrics: {}, frameCount: 0, seenFrameCount: 0 };
  accumulate(pattern, state.current, frame);
  state.phase = "moving";
}

function endRep(state: TrackerState, pattern: MovementPattern, rep: RepInProgress, frame: FrameSample, measures: FrameMeasures): void {
  const isLongEnough = frame.timestampMs - rep.startMs >= MIN_REP_DURATION_MS;
  const isConfirmed = isLongEnough && rep.seenFrameCount / rep.frameCount >= MIN_SEEN_FRAME_RATIO_TO_COUNT;
  if (isConfirmed && hasReachedTarget(pattern.counter, rep.extremeSignal)) {
    state.reps.push(closeRep(rep, state.reps.length + 1, frame.timestampMs));
    state.lastRepEndMs = frame.timestampMs;
  }
  state.lastRest = { timestampMs: frame.timestampMs, values: measures.values };
  state.current = null;
  state.phase = "rest";
}

/** Unseen frames never move the state; they only count against the rep in progress. */
function addFrame(state: TrackerState, pattern: MovementPattern, frame: FrameSample): void {
  const measures = frame.measures;
  if (!measures) {
    if (state.current) accumulate(pattern, state.current, frame);
    return;
  }
  const atRest = isAtRest(pattern.counter, measures.signal);
  if (state.phase === "waiting_rest" && atRest) state.phase = "rest";
  if (state.phase === "rest") {
    if (atRest) state.lastRest = { timestampMs: frame.timestampMs, values: measures.values };
    else if (hasLeftRest(pattern.counter, measures.signal)) startRep(state, pattern, frame);
  } else if (state.phase === "moving" && state.current) {
    if (atRest) endRep(state, pattern, state.current, frame, measures);
    else accumulate(pattern, state.current, frame);
  }
}

/**
 * Counts reps of any movement pattern (D13) on its signal, with hysteresis: a rep starts when the user leaves rest
 * and counts when the signal got far enough and the user is back at rest.
 */
export function createRepTracker(pattern: MovementPattern): RepTracker {
  const state: TrackerState = { phase: "waiting_rest", lastRest: { timestampMs: 0, values: {} }, lastRepEndMs: 0, current: null, reps: [] };
  return {
    addFrame: (frame) => addFrame(state, pattern, frame),
    get repCount() {
      return state.reps.length;
    },
    isIdle: (nowMs) => state.phase === "rest" && state.reps.length > 0 && nowMs - state.lastRepEndMs >= IDLE_STOP_MS,
    finish: () => [...state.reps],
  };
}
