/** Exercise catalog limits (search and pagination). */
export const EXERCISE_PAGE_SIZE_DEFAULT = 20;
export const EXERCISE_PAGE_SIZE_MAX = 50;
export const EXERCISE_SEARCH_MAX_LENGTH = 80;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Privacy-enhanced official YouTube embed (PRD: YouTube only as embed). */
export const YOUTUBE_EMBED_BASE_URL = "https://www.youtube-nocookie.com/embed/";
export const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"] as const;
export const YOUTUBE_VIDEO_ID_PATTERN = /^[\w-]{11}$/;
