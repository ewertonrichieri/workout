import { describe, expect, it } from "vitest";
import type { CatalogMedia } from "../catalog-exercise";
import { resolveExerciseMedia } from "./resolve-exercise-media";
import type { MediaHosting } from "./media-hosting";

const hosting: MediaHosting = {
  cdnBaseUrl: "https://cdn.example.test/gh",
  sources: {
    "workout-free-videos": { license: "CC0-1.0", priority: 10, repository: { name: "owner/videos", commit: "abc123" } },
    "free-exercise-db-with-videos": { license: "unverified", priority: 20 },
    "exercise-library": { license: "unverified", priority: 30, repository: { name: "owner/library", commit: "def456" } },
  },
};

const femaleVideo: CatalogMedia = {
  source: "free-exercise-db-with-videos", location: "url", mediaType: "video", variant: "female",
  url: "https://media.example.test/female/a.mp4", thumbnailUrl: "https://media.example.test/female/a.jpg",
};
const maleVideo: CatalogMedia = { ...femaleVideo, variant: "male", url: "https://media.example.test/male/a.mp4", thumbnailUrl: undefined };
const repositoryVideo: CatalogMedia = { source: "workout-free-videos", location: "repository_path", mediaType: "video", path: "media/video/a.mp4" };
const firstGif: CatalogMedia = { source: "exercise-library", location: "repository_path", mediaType: "gif", path: "gifs/a.gif" };
const secondGif: CatalogMedia = { ...firstGif, path: "gifs/b.gif" };

describe("resolveExerciseMedia", () => {
  it("builds pinned CDN URLs for repository media with source license and priority", () => {
    expect(resolveExerciseMedia([repositoryVideo], hosting)).toEqual([
      { mediaType: "video", url: "https://cdn.example.test/gh/owner/videos@abc123/media/video/a.mp4", thumbnailUrl: null, source: "workout-free-videos", license: "CC0-1.0", priority: 10 },
    ]);
  });

  it("keeps a single Free Exercise DB video, preferring the male variant", () => {
    const resolved = resolveExerciseMedia([femaleVideo, maleVideo], hosting);
    expect(resolved.map((media) => media.url)).toEqual(["https://media.example.test/male/a.mp4"]);
  });

  it("falls back to the female variant and keeps its thumbnail", () => {
    expect(resolveExerciseMedia([femaleVideo], hosting)).toEqual([
      expect.objectContaining({ url: femaleVideo.url, thumbnailUrl: "https://media.example.test/female/a.jpg", priority: 20 }),
    ]);
  });

  it("keeps every gif with increasing priority and orders all media by priority", () => {
    const resolved = resolveExerciseMedia([secondGif, firstGif, femaleVideo, repositoryVideo], hosting);
    expect(resolved.map((media) => [media.source, media.priority])).toEqual([
      ["workout-free-videos", 10],
      ["free-exercise-db-with-videos", 20],
      ["exercise-library", 30],
      ["exercise-library", 31],
    ]);
  });

  it("fails when a repository source has no configured repository", () => {
    const withoutRepository: MediaHosting = { ...hosting, sources: { ...hosting.sources, "exercise-library": { license: "unverified", priority: 30 } } };
    expect(() => resolveExerciseMedia([firstGif], withoutRepository)).toThrow(/exercise-library/);
  });
});
