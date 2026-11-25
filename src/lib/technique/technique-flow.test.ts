import { describe, expect, it } from "vitest";
import { INITIAL_TECHNIQUE_FLOW, reduceTechniqueFlow, type TechniqueFlowState } from "./technique-flow";

function run(...events: Parameters<typeof reduceTechniqueFlow>[1][]): TechniqueFlowState {
  return events.reduce(reduceTechniqueFlow, INITIAL_TECHNIQUE_FLOW);
}

describe("reduceTechniqueFlow", () => {
  it("goes from the notice to the guide and then to the camera", () => {
    expect(INITIAL_TECHNIQUE_FLOW).toEqual({ phase: "notice" });
    expect(run({ type: "accept_notice" })).toEqual({ phase: "guide" });
    expect(run({ type: "accept_notice" }, { type: "open_camera" })).toEqual({ phase: "framing" });
  });

  it("starts the countdown only while framing and records after it", () => {
    expect(run({ type: "start_countdown" })).toEqual({ phase: "notice" });
    const counting = run({ type: "accept_notice" }, { type: "open_camera" }, { type: "start_countdown" });
    expect(counting).toEqual({ phase: "countdown" });
    expect(reduceTechniqueFlow(counting, { type: "countdown_done" })).toEqual({ phase: "recording" });
  });

  it("returns to framing when the body leaves the frame during the countdown", () => {
    const counting = run({ type: "accept_notice" }, { type: "open_camera" }, { type: "start_countdown" });
    expect(reduceTechniqueFlow(counting, { type: "framing_lost" })).toEqual({ phase: "framing" });
  });

  it("ends the recording in the summary with the reps, and records again from there", () => {
    const recording = run({ type: "accept_notice" }, { type: "open_camera" }, { type: "start_countdown" }, { type: "countdown_done" });
    const summary = reduceTechniqueFlow(recording, { type: "recording_finished", reps: [] });
    expect(summary).toEqual({ phase: "summary", reps: [] });
    expect(reduceTechniqueFlow(summary, { type: "record_again" })).toEqual({ phase: "framing" });
    expect(reduceTechniqueFlow(summary, { type: "camera_failed", reason: "unavailable" })).toBe(summary);
  });

  it("ignores a finished recording outside the recording phase", () => {
    const framing = run({ type: "accept_notice" }, { type: "open_camera" });
    expect(reduceTechniqueFlow(framing, { type: "recording_finished", reps: [] })).toBe(framing);
  });

  it("shows camera and model failures from any camera phase and allows going back to the guide", () => {
    const framing = run({ type: "accept_notice" }, { type: "open_camera" });
    const failed = reduceTechniqueFlow(framing, { type: "camera_failed", reason: "permission_denied" });
    expect(failed).toEqual({ phase: "camera_error", reason: "permission_denied" });
    expect(reduceTechniqueFlow(failed, { type: "back_to_guide" })).toEqual({ phase: "guide" });
    expect(reduceTechniqueFlow(framing, { type: "model_failed" })).toEqual({ phase: "model_error" });
  });
});
