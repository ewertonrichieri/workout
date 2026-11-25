import type { CameraErrorReason } from "./camera-support";

/**
 * Screens of the technique analysis (spec 014, flow): privacy and limits notice → positioning guide →
 * framing (camera on, "Começar" once the body is framed) → countdown → recording.
 */
export type TechniqueFlowState =
  | { phase: "notice" }
  | { phase: "guide" }
  | { phase: "framing" }
  | { phase: "countdown" }
  | { phase: "recording" }
  | { phase: "camera_error"; reason: CameraErrorReason }
  | { phase: "model_error" };

export type TechniqueFlowEvent =
  | { type: "accept_notice" }
  | { type: "open_camera" }
  | { type: "start_countdown" }
  | { type: "countdown_done" }
  | { type: "framing_lost" }
  | { type: "stop_recording" }
  | { type: "camera_failed"; reason: CameraErrorReason }
  | { type: "model_failed" }
  | { type: "back_to_guide" };

export const INITIAL_TECHNIQUE_FLOW: TechniqueFlowState = { phase: "notice" };

const CAMERA_PHASES: ReadonlySet<TechniqueFlowState["phase"]> = new Set(["framing", "countdown", "recording"]);

/** Moves allowed only from one phase; anything else keeps the current state. */
const TRANSITIONS: Partial<Record<TechniqueFlowEvent["type"], { from: TechniqueFlowState["phase"]; to: TechniqueFlowState }>> = {
  accept_notice: { from: "notice", to: { phase: "guide" } },
  open_camera: { from: "guide", to: { phase: "framing" } },
  start_countdown: { from: "framing", to: { phase: "countdown" } },
  countdown_done: { from: "countdown", to: { phase: "recording" } },
  framing_lost: { from: "countdown", to: { phase: "framing" } },
  stop_recording: { from: "recording", to: { phase: "framing" } },
};

function reduceFailure(state: TechniqueFlowState, event: TechniqueFlowEvent): TechniqueFlowState | undefined {
  if (event.type === "back_to_guide") return state.phase === "camera_error" || state.phase === "model_error" ? { phase: "guide" } : state;
  if (!CAMERA_PHASES.has(state.phase)) return undefined;
  if (event.type === "camera_failed") return { phase: "camera_error", reason: event.reason };
  if (event.type === "model_failed") return { phase: "model_error" };
  return undefined;
}

export function reduceTechniqueFlow(state: TechniqueFlowState, event: TechniqueFlowEvent): TechniqueFlowState {
  const failure = reduceFailure(state, event);
  if (failure) return failure;
  const transition = TRANSITIONS[event.type];
  return transition && transition.from === state.phase ? transition.to : state;
}
