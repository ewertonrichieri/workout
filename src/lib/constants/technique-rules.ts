/**
 * Squat rules (spec 014, step 5.2).
 *
 * Rep counting values are technical (hysteresis on the knee angle). The D5 limits were calibrated on
 * 2026-11-25 with the user's side-view recordings and confirmed by the user (POS-001).
 */

/** Knee at least this open = standing (top of the rep). */
export const SQUAT_TOP_KNEE_ANGLE = 160;
/** Below this the user has left the top: a rep starts (10° of hysteresis against jitter). */
export const SQUAT_DESCENT_KNEE_ANGLE = 150;
/** A movement only counts as a rep when the knee bends at least this far; smaller dips are ignored. */
export const SQUAT_REP_MAX_BOTTOM_KNEE_ANGLE = 140;
/** A rep with more unseen frames than this share is "não avaliada" (spec 014, honest measurement). */
export const MAX_UNSEEN_FRAME_RATIO = 0.25;
/** A rep with fewer seen frames than this share is not counted at all: the camera cannot confirm it happened (POS-001). */
export const MIN_SEEN_FRAME_RATIO_TO_COUNT = 0.5;
/**
 * A rep shorter than this is a blip of the pose model, not a movement (5.7: a single noisy frame counted as a pull;
 * the fastest real reps of the calibration videos lasted 0.67 s or more).
 */
export const MIN_REP_DURATION_MS = 400;
/** Decision D8: the recording stops after this long standing still, once at least one rep was done. */
export const IDLE_STOP_MS = 5000;

/** D5: thigh at most this many degrees above the horizontal = parallel or deeper. */
export const SQUAT_DEPTH_MAX_THIGH_ANGLE = 0;
/**
 * D5: absolute trunk lean from the vertical; informative only (the fatigue comparison is what counts).
 * Calibrated: a correct deep squat reached 49°; leaning on purpose, 75–84°.
 */
export const SQUAT_TRUNK_LEAN_MAX_DEGREES = 60;
/** D5: trunk leaning this much more than in the first evaluated rep = fatigue. */
export const SQUAT_TRUNK_FATIGUE_INCREASE_DEGREES = 15;
/**
 * D5 ("calcanhar saindo do chão"): heel rise against standing, as a share of the shin length.
 * Calibrated: heel down reached 0.235, heel up 0.26+ (one miss); too close to call it an error, so it only informs.
 */
export const SQUAT_HEEL_RISE_MAX_RATIO = 0.25;
/** D5: a descent faster than this deserves a control warning. Calibrated: normal 0.8–2.5 s, fast on purpose 0.4–0.6 s. */
export const SQUAT_MIN_DESCENT_MS = 700;
/** Knee ahead of the toes (share of the shin length); informative only (D5). */
export const SQUAT_KNEE_TRAVEL_INFO_RATIO = 0;

/** Squat (D5, POS-001), hip hinge and row (D14) calibrated and confirmed by the user on 2026-11-25: severities apply. */
export const TECHNIQUE_RULES_CALIBRATED = true;

/**
 * Hip hinge (D14): counted on the hip angle (shoulder–hip–knee) with the same hysteresis as the squat.
 * Relative rules compare each rep with the first evaluated rep of the set (D13). Calibrated with the user's video:
 * short reps opened the hip 31–50° more than the first, the others at most 18°; deeper knee bend 19–33°, the others ≤ 10°.
 */
export const HINGE_TOP_HIP_ANGLE = 160;
export const HINGE_DESCENT_HIP_ANGLE = 150;
export const HINGE_REP_MAX_BOTTOM_HIP_ANGLE = 140;
export const HINGE_SHORT_RANGE_DEGREES = 25;
export const HINGE_KNEE_BEND_DEGREES = 15;
/** Literature reference (D13, "Para conferir"): in a Romanian deadlift the knee stays almost straight (~145°+). */
export const HINGE_SQUAT_LIKE_KNEE_ANGLE = 140;

/**
 * Row (D14): counted on the wrist height above the hip, in torso lengths. Calibrated with the user's video:
 * hanging −0.20 to −0.42; normal pulls peaked +0.15 to +0.44, short ones −0.05 to +0.04; pulling to the shoulders
 * raised the trunk 9–13°, normal pulls at most 4°.
 */
export const ROW_REST_MAX_WRIST_HEIGHT = -0.2;
export const ROW_START_MIN_WRIST_HEIGHT = -0.15;
export const ROW_REP_MIN_PEAK_WRIST_HEIGHT = -0.1;
export const ROW_SHORT_PULL_WRIST_HEIGHT = 0.1;
export const ROW_TRUNK_RISE_DEGREES = 8;
/** Literature reference (D13, "Para conferir"): rows are usually done with the trunk 40–65° from vertical. */
export const ROW_UPRIGHT_TRUNK_DEGREES = 40;

/** 2D angles are approximate: shown rounded to this step, with "cerca de" (spec 014). */
export const DISPLAY_ANGLE_STEP_DEGREES = 5;

export const TECHNIQUE_ISSUES = [
  "shallow_depth", "heel_lift", "fast_descent", "trunk_lean", "trunk_lean_fatigue", "knee_forward",
  "hinge_short_range", "hinge_knee_bend", "hinge_squat_like", "row_short_pull", "row_trunk_rise", "row_trunk_upright",
] as const;
export type TechniqueIssue = (typeof TECHNIQUE_ISSUES)[number];

export const ISSUE_SEVERITIES = ["error", "warning", "info"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

/**
 * Severity of each issue once calibrated. Squat (D5 + POS-001): depth and fatigue are errors, the heel only informs.
 * Hip hinge and row (D13): rules relative to the first rep are warnings; literature references only inform.
 */
export const ISSUE_SEVERITY: Readonly<Record<TechniqueIssue, IssueSeverity>> = {
  shallow_depth: "error",
  heel_lift: "info",
  fast_descent: "warning",
  trunk_lean: "info",
  trunk_lean_fatigue: "error",
  knee_forward: "info",
  hinge_short_range: "warning",
  hinge_knee_bend: "warning",
  hinge_squat_like: "info",
  row_short_pull: "warning",
  row_trunk_rise: "warning",
  row_trunk_upright: "info",
};
