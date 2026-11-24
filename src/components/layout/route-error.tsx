"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { translate } from "@/lib/i18n/translate";

/** Shared route-level fallback (e.g. database unavailable) with a retry button. */
export function RouteError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <EmptyState title={title} description={translate("errors.internal")}>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 min-h-11 rounded-lg border border-border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          {translate("common.retryButton")}
        </button>
      </EmptyState>
    </main>
  );
}
