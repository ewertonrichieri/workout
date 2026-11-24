import { translate } from "@/lib/i18n/translate";

const SKELETON_CARDS = 4;

export function WorkoutSkeleton() {
  return (
    <div aria-busy="true" aria-label={translate("training.loading")} className="flex flex-col gap-3">
      <div className="h-10 animate-pulse rounded-xl border border-border bg-surface" />
      {Array.from({ length: SKELETON_CARDS }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
