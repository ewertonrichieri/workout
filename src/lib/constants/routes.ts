export const APP_ROUTES = {
  home: "/",
  workout: "/workout",
  schedule: "/schedule",
  profile: "/profile",
  exercises: "/exercises",
  progress: "/progress",
  assessment: "/assessment",
  workoutEdit: "/workout/edit",
} as const;

/** Query param of paginated lists (catalog, history). */
export const PAGE_QUERY_PARAM = "page";

/** /workout?review=1 shows the "review the generated plan" notice (step 3.4). */
export const REVIEW_QUERY_PARAM = "review";
export const REVIEW_QUERY_VALUE = "1";
