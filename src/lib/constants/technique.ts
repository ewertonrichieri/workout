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

/** Movement patterns (D13): every exercise of a pattern shares its rules. */
export const TECHNIQUE_RULE_SET_IDS = ["squat", "hinge", "row"] as const;
export type TechniqueRuleSetId = (typeof TECHNIQUE_RULE_SET_IDS)[number];

export interface TechniqueRuleSet {
  id: TechniqueRuleSetId;
  cameraView: CameraView;
}

const SQUAT: TechniqueRuleSet = { id: "squat", cameraView: "side" };
const HINGE: TechniqueRuleSet = { id: "hinge", cameraView: "side" };
const ROW: TechniqueRuleSet = { id: "row", cameraView: "side" };

/** Decisions D3 and D15: supported exercises and their movement pattern (one-arm rows stay out: one arm hides the other). */
export const TECHNIQUE_EXERCISES: Readonly<Record<string, TechniqueRuleSet>> = {
  "barbell-back-squat": SQUAT,
  "dumbbell-goblet-squat": SQUAT,
  "barbell-romanian-deadlift": HINGE,
  "dumbbell-romanian-deadlift": HINGE,
  "stiff-leg-deadlift": HINGE,
  "dumbbell-stiff-leg-deadlift": HINGE,
  "single-dumbbell-stiff-leg-deadlift": HINGE,
  "barbell-bent-over-row": ROW,
  "barbell-underhand-bent-over-row": ROW,
  "barbell-reverse-grip-bent-over-row": ROW,
  "ez-bar-reverse-grip-bent-over-row": ROW,
  "smith-bent-over-row": ROW,
  "smith-reverse-grip-bent-over-row": ROW,
  "dumbbell-bent-over-row": ROW,
  "dumbbell-palm-rotational-bent-over-row": ROW,
};

/** Front camera: the user sees the framing while positioning the phone. */
export const CAMERA_FACING_MODE = "user";

/** Decision D7: spoken cues use the browser voice in Brazilian Portuguese. */
export const SPEECH_LANGUAGE = "pt-BR";
/** At most one cue per rep, and never two cues closer than this, so the count is not drowned out (spec 014). */
export const MIN_CUE_INTERVAL_MS = 4000;
/** Remembered on this device only: the user switched the spoken cues off (D7). */
export const SOUND_PREFERENCE_STORAGE_KEY = "workout.technique.soundOff";
