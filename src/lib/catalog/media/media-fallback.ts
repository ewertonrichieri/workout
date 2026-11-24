import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { YOUTUBE_EMBED_BASE_URL, YOUTUBE_HOSTS, YOUTUBE_VIDEO_ID_PATTERN } from "@/lib/constants/catalog";

const SHORT_LINK_HOST = "youtu.be";
const PATH_PREFIXES_WITH_ID = ["embed", "shorts"];

function parseUrl(url: string): URL | null {
  return URL.canParse(url) ? new URL(url) : null;
}

function extractYouTubeVideoId(parsed: URL): string | null {
  const [first, second] = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname === SHORT_LINK_HOST) return first ?? null;
  if (first === "watch") return parsed.searchParams.get("v");
  return PATH_PREFIXES_WITH_ID.includes(first ?? "") ? (second ?? null) : null;
}

/** Official privacy-enhanced embed URL of a YouTube video, or `null` when the URL is not one. */
export function toYouTubeEmbedUrl(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed || !(YOUTUBE_HOSTS as readonly string[]).includes(parsed.hostname)) return null;
  const videoId = extractYouTubeVideoId(parsed);
  return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? `${YOUTUBE_EMBED_BASE_URL}${videoId}` : null;
}

function isPlayable(media: ExerciseMediaItem): boolean {
  return media.mediaType !== "youtube" || toYouTubeEmbedUrl(media.url) !== null;
}

/** First playable media at or after `fromIndex` (list already ordered by priority); `null` when none is left. */
export function findPlayableMediaIndex(media: readonly ExerciseMediaItem[], fromIndex: number): number | null {
  const index = media.findIndex((item, position) => position >= fromIndex && isPlayable(item));
  return index === -1 ? null : index;
}
