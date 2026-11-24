export const APP_ROUTES = {
  home: "/",
  workout: "/workout",
  schedule: "/schedule",
  profile: "/profile",
  exercises: "/exercises",
  progress: "/progress",
} as const;

/** Query param of paginated lists (catalog, history). */
export const PAGE_QUERY_PARAM = "page";
