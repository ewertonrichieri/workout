"use client";

import { useState } from "react";
import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { findPlayableMediaIndex, toYouTubeEmbedUrl } from "@/lib/catalog/media/media-fallback";
import { translate } from "@/lib/i18n/translate";
import { describeLicense, describeSource } from "./exercise-labels";

interface ExerciseMediaPlayerProps {
  /** Enabled media ordered by priority (video → GIF → YouTube). */
  media: readonly ExerciseMediaItem[];
  exerciseName: string;
}

interface MediaElementProps {
  media: ExerciseMediaItem;
  label: string;
  onError: () => void;
}

const MEDIA_CLASS = "aspect-video w-full rounded-2xl bg-background object-contain";
const FIRST_MEDIA_INDEX = 0;

function MediaElement({ media, label, onError }: MediaElementProps) {
  if (media.mediaType === "youtube") {
    const embedUrl = toYouTubeEmbedUrl(media.url) ?? undefined;
    return <iframe src={embedUrl} title={label} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen className={MEDIA_CLASS} />;
  }
  if (media.mediaType === "video") {
    return <video src={media.url} poster={media.thumbnailUrl ?? undefined} aria-label={label} controls muted loop playsInline preload="metadata" onError={onError} className={MEDIA_CLASS} />;
  }
  // Remote animated GIF: next/image would not optimize it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={label} loading="lazy" onError={onError} className={MEDIA_CLASS} />;
}

/** Plays the best media of the exercise and falls back to the next one when it fails to load. */
export function ExerciseMediaPlayer({ media, exerciseName }: ExerciseMediaPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(() => findPlayableMediaIndex(media, FIRST_MEDIA_INDEX));
  const current = currentIndex === null ? undefined : media[currentIndex];
  if (currentIndex === null || !current) {
    return <p className="rounded-2xl border border-border bg-surface p-6 text-center text-muted">{translate("catalog.noMedia")}</p>;
  }
  const showNextMedia = () => setCurrentIndex(findPlayableMediaIndex(media, currentIndex + 1));
  return (
    <figure className="flex flex-col gap-2">
      <MediaElement key={currentIndex} media={current} label={translate("catalog.mediaLabel", { name: exerciseName })} onError={showNextMedia} />
      <figcaption className="text-xs text-muted">
        {translate("catalog.mediaCredit", { source: describeSource(current.source), license: describeLicense(current.license) })}
      </figcaption>
    </figure>
  );
}
