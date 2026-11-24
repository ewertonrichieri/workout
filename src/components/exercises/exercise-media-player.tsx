import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { translate } from "@/lib/i18n/translate";
import { describeLicense, describeSource } from "./exercise-labels";

interface ExerciseMediaPlayerProps {
  media: ExerciseMediaItem | null;
  exerciseName: string;
}

const MEDIA_CLASS = "aspect-video w-full rounded-2xl bg-background object-contain";

function MediaElement({ media, label }: { media: ExerciseMediaItem; label: string }) {
  if (media.mediaType === "video") {
    return <video src={media.url} poster={media.thumbnailUrl ?? undefined} aria-label={label} controls muted loop playsInline preload="metadata" className={MEDIA_CLASS} />;
  }
  // Remote animated GIF: next/image would not optimize it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={label} loading="lazy" className={MEDIA_CLASS} />;
}

/** Shows the best media of the exercise (fallback between media arrives in step 2.3). */
export function ExerciseMediaPlayer({ media, exerciseName }: ExerciseMediaPlayerProps) {
  if (!media) {
    return <p className="rounded-2xl border border-border bg-surface p-6 text-center text-muted">{translate("catalog.noMedia")}</p>;
  }
  return (
    <figure className="flex flex-col gap-2">
      <MediaElement media={media} label={translate("catalog.mediaLabel", { name: exerciseName })} />
      <figcaption className="text-xs text-muted">
        {translate("catalog.mediaCredit", { source: describeSource(media.source), license: describeLicense(media.license) })}
      </figcaption>
    </figure>
  );
}
