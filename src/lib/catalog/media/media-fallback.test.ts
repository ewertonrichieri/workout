import { describe, expect, it } from "vitest";
import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { findPlayableMediaIndex, toYouTubeEmbedUrl } from "./media-fallback";

function buildMedia(mediaType: ExerciseMediaItem["mediaType"], url: string): ExerciseMediaItem {
  return { mediaType, url, thumbnailUrl: null, source: "fake-source", license: "CC0-1.0" };
}

describe("toYouTubeEmbedUrl", () => {
  it("converts the common YouTube URL formats to the privacy-enhanced embed", () => {
    const expected = "https://www.youtube-nocookie.com/embed/abcDEF12_-3";
    expect(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=abcDEF12_-3&t=10")).toBe(expected);
    expect(toYouTubeEmbedUrl("https://youtu.be/abcDEF12_-3")).toBe(expected);
    expect(toYouTubeEmbedUrl("https://www.youtube.com/embed/abcDEF12_-3")).toBe(expected);
    expect(toYouTubeEmbedUrl("https://m.youtube.com/shorts/abcDEF12_-3")).toBe(expected);
  });

  it("rejects URLs that are not a YouTube video", () => {
    expect(toYouTubeEmbedUrl("https://example.test/watch?v=abcDEF12_-3")).toBeNull();
    expect(toYouTubeEmbedUrl("https://www.youtube.com/channel/xyz")).toBeNull();
    expect(toYouTubeEmbedUrl("not a url")).toBeNull();
  });
});

describe("findPlayableMediaIndex", () => {
  const media = [
    buildMedia("video", "https://cdn.example.test/a.mp4"),
    buildMedia("youtube", "https://example.test/invalid"),
    buildMedia("gif", "https://cdn.example.test/a.gif"),
  ];

  it("returns the first playable media from the given index", () => {
    expect(findPlayableMediaIndex(media, 0)).toBe(0);
  });

  it("skips YouTube entries that cannot be embedded", () => {
    expect(findPlayableMediaIndex(media, 1)).toBe(2);
  });

  it("returns null when nothing is left to try", () => {
    expect(findPlayableMediaIndex(media, 3)).toBeNull();
    expect(findPlayableMediaIndex([], 0)).toBeNull();
  });
});
