import {
  IDLE_STOP_MS,
  MAX_UNSEEN_FRAME_RATIO,
  MIN_SEEN_FRAME_RATIO_TO_COUNT,
  SQUAT_DESCENT_KNEE_ANGLE,
  SQUAT_REP_MAX_BOTTOM_KNEE_ANGLE,
  SQUAT_TOP_KNEE_ANGLE,
} from "@/lib/constants/technique-rules";
import type { SquatFrame, SquatMeasures } from "./squat-frame";

/** Numbers of one squat rep: what goes to the summary, to the AI (5.4) and to the history. */
export interface SquatRep {
  repNumber: number;
  startMs: number;
  bottomMs: number;
  endMs: number;
  descentMs: number;
  minKneeAngle: number;
  minThighAngle: number;
  maxTrunkLean: number;
  maxKneeTravelRatio: number;
  /** Heel rise against the last standing frame, as a share of the shin length. */
  maxHeelRiseRatio: number;
  frameCount: number;
  seenFrameCount: number;
  /** False when too many frames were not seen: the rep has no verdict (never guess). */
  isEvaluated: boolean;
}

export interface SquatRepTracker {
  addFrame: (frame: SquatFrame) => void;
  readonly repCount: number;
  /** Standing still for IDLE_STOP_MS after at least one rep (decision D8). */
  isIdle: (nowMs: number) => boolean;
  /** Finished reps; a rep still in progress is dropped. */
  finish: () => SquatRep[];
}

interface RepInProgress {
  startMs: number;
  bottomMs: number;
  baselineHeelToToe: number;
  minKneeAngle: number;
  minThighAngle: number;
  maxTrunkLean: number;
  maxKneeTravelRatio: number;
  maxHeelRiseRatio: number;
  frameCount: number;
  seenFrameCount: number;
}

function startRep(startMs: number, baselineHeelToToe: number): RepInProgress {
  return {
    startMs, bottomMs: startMs, baselineHeelToToe, minKneeAngle: Infinity, minThighAngle: Infinity, maxTrunkLean: -Infinity,
    maxKneeTravelRatio: -Infinity, maxHeelRiseRatio: -Infinity, frameCount: 0, seenFrameCount: 0,
  };
}

function accumulate(rep: RepInProgress, frame: SquatFrame): void {
  rep.frameCount += 1;
  const measures = frame.measures;
  if (!measures) return;
  rep.seenFrameCount += 1;
  if (measures.kneeAngle < rep.minKneeAngle) {
    rep.minKneeAngle = measures.kneeAngle;
    rep.bottomMs = frame.timestampMs;
  }
  rep.minThighAngle = Math.min(rep.minThighAngle, measures.thighAngle);
  rep.maxTrunkLean = Math.max(rep.maxTrunkLean, measures.trunkLean);
  rep.maxKneeTravelRatio = Math.max(rep.maxKneeTravelRatio, measures.kneeTravelRatio);
  rep.maxHeelRiseRatio = Math.max(rep.maxHeelRiseRatio, measures.heelToToeRatio - rep.baselineHeelToToe);
}

function closeRep(rep: RepInProgress, repNumber: number, endMs: number): SquatRep {
  const unseenRatio = (rep.frameCount - rep.seenFrameCount) / rep.frameCount;
  return {
    repNumber, startMs: rep.startMs, bottomMs: rep.bottomMs, endMs, descentMs: rep.bottomMs - rep.startMs,
    minKneeAngle: rep.minKneeAngle, minThighAngle: rep.minThighAngle, maxTrunkLean: rep.maxTrunkLean,
    maxKneeTravelRatio: rep.maxKneeTravelRatio, maxHeelRiseRatio: rep.maxHeelRiseRatio,
    frameCount: rep.frameCount, seenFrameCount: rep.seenFrameCount, isEvaluated: unseenRatio <= MAX_UNSEEN_FRAME_RATIO,
  };
}

type TrackerPhase = "waiting_top" | "top" | "down";

interface TrackerState {
  phase: TrackerPhase;
  /** Last standing frame: where the next rep starts and the heel baseline. */
  lastTop: { timestampMs: number; heelToToe: number };
  lastRepEndMs: number;
  current: RepInProgress | null;
  reps: SquatRep[];
}

function handleTop(state: TrackerState, frame: SquatFrame, measures: SquatMeasures): void {
  if (measures.kneeAngle >= SQUAT_TOP_KNEE_ANGLE) {
    state.lastTop = { timestampMs: frame.timestampMs, heelToToe: measures.heelToToeRatio };
  } else if (measures.kneeAngle < SQUAT_DESCENT_KNEE_ANGLE) {
    state.current = startRep(state.lastTop.timestampMs, state.lastTop.heelToToe);
    accumulate(state.current, frame);
    state.phase = "down";
  }
}

function handleDown(state: TrackerState, rep: RepInProgress, frame: SquatFrame, measures: SquatMeasures): void {
  if (measures.kneeAngle < SQUAT_TOP_KNEE_ANGLE) return accumulate(rep, frame);
  const isConfirmed = rep.seenFrameCount / rep.frameCount >= MIN_SEEN_FRAME_RATIO_TO_COUNT;
  if (isConfirmed && rep.minKneeAngle <= SQUAT_REP_MAX_BOTTOM_KNEE_ANGLE) {
    state.reps.push(closeRep(rep, state.reps.length + 1, frame.timestampMs));
    state.lastRepEndMs = frame.timestampMs;
  }
  state.lastTop = { timestampMs: frame.timestampMs, heelToToe: measures.heelToToeRatio };
  state.current = null;
  state.phase = "top";
}

/** Unseen frames never move the state; they only count against the rep in progress. */
function addFrame(state: TrackerState, frame: SquatFrame): void {
  const measures = frame.measures;
  if (!measures) {
    if (state.current) accumulate(state.current, frame);
    return;
  }
  if (state.phase === "waiting_top" && measures.kneeAngle >= SQUAT_TOP_KNEE_ANGLE) state.phase = "top";
  if (state.phase === "top") handleTop(state, frame, measures);
  else if (state.phase === "down" && state.current) handleDown(state, state.current, frame, measures);
}

/**
 * Counts squat reps on the knee angle with hysteresis: a rep starts when the user leaves the top,
 * and counts when the knee bent enough and the user stands again.
 */
export function createSquatRepTracker(): SquatRepTracker {
  const state: TrackerState = { phase: "waiting_top", lastTop: { timestampMs: 0, heelToToe: 0 }, lastRepEndMs: 0, current: null, reps: [] };
  return {
    addFrame: (frame) => addFrame(state, frame),
    get repCount() {
      return state.reps.length;
    },
    isIdle: (nowMs) => state.phase === "top" && state.reps.length > 0 && nowMs - state.lastRepEndMs >= IDLE_STOP_MS,
    finish: () => [...state.reps],
  };
}
