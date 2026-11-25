/** What a pattern reads in one camera frame: the counting signal and named values (null = not seen, never guessed). */
export interface FrameMeasures {
  signal: number;
  values: Readonly<Record<string, number>>;
}

export interface FrameSample {
  timestampMs: number;
  measures: FrameMeasures | null;
}

/** Numbers of one rep of any movement pattern (D13): timing, visibility and the pattern's named metrics. */
export interface TechniqueRep {
  repNumber: number;
  startMs: number;
  /** Frame where the counting signal was furthest from rest (bottom of a squat, top of a pull). */
  bottomMs: number;
  endMs: number;
  /** From leaving rest to the bottom (squat, hinge) or to the top of the pull (row). */
  descentMs: number;
  frameCount: number;
  seenFrameCount: number;
  /** False when too many frames were not seen: the rep has no verdict (never guess). */
  isEvaluated: boolean;
  metrics: Readonly<Record<string, number>>;
}
