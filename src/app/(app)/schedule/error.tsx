"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the history cannot be loaded. */
export default function ScheduleError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("history.loadError")} onRetry={() => retry()} />;
}
