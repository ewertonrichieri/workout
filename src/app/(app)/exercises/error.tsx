"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the catalog cannot be loaded. */
export default function ExercisesError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("catalog.loadError")} onRetry={() => retry()} />;
}
