/** What happened in the plan being replaced, sent to the AI on renewal (step 3.6). */
export interface PlanHistoryExercise {
  slug: string;
  sessions: number;
  /** Heaviest load of the first and the last session; null for bodyweight work. */
  firstMaxLoadKg: number | null;
  lastMaxLoadKg: number | null;
  lastReps: number | null;
}

export interface PlanHistorySummary {
  sessions: number;
  exercises: PlanHistoryExercise[];
}
