import { translate } from "@/lib/i18n/translate";

/** Health warning (step 3.7): informative, never blocks; reinforced when the user reported a limitation. */
export function HealthNotice({ hasLimitations }: { hasLimitations: boolean }) {
  return (
    <aside role="note" aria-label={translate("health.title")} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="font-semibold">{translate("health.title")}</p>
      <p className="text-muted">{translate("health.notice")}</p>
      {hasLimitations && <p className="font-medium">{translate("health.limitationsNotice")}</p>}
    </aside>
  );
}
