const DEFAULT_ROWS = 6;

/** Loading placeholder for list screens; `label` is announced to screen readers. */
export function ListSkeleton({ label, rows = DEFAULT_ROWS }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
