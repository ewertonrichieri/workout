"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the progression cannot be loaded. */
export default function ProgressError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("history.progressLoadError")} onRetry={() => retry()} />;
}
