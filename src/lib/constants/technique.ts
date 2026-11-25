/** Posture correction (spec 014, phase 5). */

import { APP_ROUTES } from "@/lib/constants/routes";

export const TECHNIQUE_ROUTE = APP_ROUTES.technique;

/** Decisions D1 and D2: MediaPipe Pose Landmarker "lite", served by the app itself. */
export const POSE_ASSETS_BASE_PATH = "/mediapipe";
export const POSE_WASM_PATH = `${POSE_ASSETS_BASE_PATH}/wasm`;
export const POSE_MODEL_PATH = `${POSE_ASSETS_BASE_PATH}/models/pose_landmarker_lite.task`;
/** One person per recording. */
export const POSE_MAX_PEOPLE = 1;

/** A landmark below this MediaPipe visibility counts as not seen (never guess what the camera did not see). */
export const MIN_LANDMARK_VISIBILITY = 0.5;
/** Normalized distance from the frame edges a body part must keep to count as inside the frame. */
export const FRAME_EDGE_MARGIN = 0.02;
/**
 * Side-view exercises: shoulder width / torso length above this = not sideways. Front or 3/4 views give wrong
 * joint angles in 2D. Calibrated (POS-001): side view ≤ 0.33 while sideways, 3/4 view never below 0.40.
 */
export const SIDE_VIEW_MAX_SHOULDER_RATIO = 0.4;
/** "Começar" is enabled only after the whole body stays framed for this long (spec 014, flow step 3). */
export const FRAMING_HOLD_MS = 1000;
/** During the countdown, the body must stay out of frame this long before it is cancelled (pose model glitches last ~170 ms). */
export const FRAMING_LOSS_TOLERANCE_MS = 500;
/** Countdown before recording (spec 014, flow step 3). */
export const RECORDING_COUNTDOWN_SECONDS = 3;
/** Decision D8: maximum length of one recording. */
export const MAX_RECORDING_SECONDS = 90;

export const CAMERA_VIEWS = ["side", "front"] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export const TECHNIQUE_RULE_SET_IDS = ["squat"] as const;
export type TechniqueRuleSetId = (typeof TECHNIQUE_RULE_SET_IDS)[number];

export interface TechniqueRuleSet {
  id: TechniqueRuleSetId;
  cameraView: CameraView;
}

/** Decision D3: exercises supported in steps 5.1 to 5.4 (the deadlift and the row come in 5.5). */
export const TECHNIQUE_EXERCISES: Readonly<Record<string, TechniqueRuleSet>> = {
  "barbell-back-squat": { id: "squat", cameraView: "side" },
  "dumbbell-goblet-squat": { id: "squat", cameraView: "side" },
};

/** Front camera: the user sees the framing while positioning the phone. */
export const CAMERA_FACING_MODE = "user";
