"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the plan cannot be loaded (e.g. database unavailable). */
export default function WorkoutError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <EmptyState title={translate("training.loadError")} description={translate("errors.internal")}>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 min-h-11 rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          {translate("training.retryButton")}
        </button>
      </EmptyState>
    </main>
  );
}
