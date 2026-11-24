import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { DumbbellIcon } from "@/components/navigation/navigation-icons";

const COVER_SIZE_PX = 72;

interface ExerciseCoverProps {
  media: ExerciseMediaItem | null;
}

/** Small decorative preview for lists: thumbnail or GIF when available, icon otherwise. */
export function ExerciseCover({ media }: ExerciseCoverProps) {
  const imageUrl = media?.thumbnailUrl ?? (media?.mediaType === "gif" ? media.url : null);
  if (!imageUrl) {
    return (
      <span aria-hidden="true" className="flex size-18 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
        <DumbbellIcon />
      </span>
    );
  }
  return (
    // Remote CDN media (animated GIFs included) gains nothing from next/image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" width={COVER_SIZE_PX} height={COVER_SIZE_PX} loading="lazy" className="size-18 shrink-0 rounded-lg bg-background object-cover" />
  );
}
