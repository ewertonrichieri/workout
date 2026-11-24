import { CATALOG_SOURCES, VIDEO_VARIANTS } from "../catalog-sources";
import type { CatalogMedia } from "../catalog-exercise";
import type { MediaHosting, SourceHosting } from "./media-hosting";

/** Media row ready for `exercise_media`. */
export interface ResolvedMedia {
  mediaType: CatalogMedia["mediaType"];
  url: string;
  thumbnailUrl: string | null;
  source: CatalogMedia["source"];
  license: string;
  priority: number;
}

export class MissingMediaHostingError extends Error {
  constructor(source: string) {
    super(`no repository configured to serve media of "${source}"`);
    this.name = "MissingMediaHostingError";
  }
}

const [PREFERRED_VARIANT] = VIDEO_VARIANTS;

/** Free Exercise DB has male and female takes of the same video: keep one per exercise. */
function keepOneFreeExerciseDbVideo(media: readonly CatalogMedia[]): CatalogMedia[] {
  const isFreeExerciseDb = (item: CatalogMedia) => item.source === CATALOG_SOURCES.freeExerciseDb;
  const candidates = media.filter(isFreeExerciseDb);
  const chosen = candidates.find((item) => item.location === "url" && item.variant === PREFERRED_VARIANT) ?? candidates[0];
  return media.filter((item) => !isFreeExerciseDb(item) || item === chosen);
}

function buildUrl(media: CatalogMedia, hosting: SourceHosting, cdnBaseUrl: string): string {
  if (media.location === "url") return media.url;
  if (!hosting.repository) throw new MissingMediaHostingError(media.source);
  return `${cdnBaseUrl}/${hosting.repository.name}@${hosting.repository.commit}/${media.path}`;
}

/** Turns catalog media into pinned URLs with license and display priority, best first. */
export function resolveExerciseMedia(media: readonly CatalogMedia[], hosting: MediaHosting): ResolvedMedia[] {
  const countBySource = new Map<string, number>();
  return keepOneFreeExerciseDbVideo(media)
    .map((item) => {
      const sourceHosting = hosting.sources[item.source];
      const offset = countBySource.get(item.source) ?? 0;
      countBySource.set(item.source, offset + 1);
      return {
        mediaType: item.mediaType,
        url: buildUrl(item, sourceHosting, hosting.cdnBaseUrl),
        thumbnailUrl: item.location === "url" ? (item.thumbnailUrl ?? null) : null,
        source: item.source,
        license: sourceHosting.license,
        priority: sourceHosting.priority + offset,
      };
    })
    .sort((left, right) => left.priority - right.priority);
}
