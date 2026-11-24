import { translate } from "@/lib/i18n/translate";

const SKELETON_ROWS = 6;

export function ExerciseListSkeleton() {
  return (
    <div aria-busy="true" aria-label={translate("catalog.loading")} className="flex flex-col gap-3">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
