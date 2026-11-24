"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the workout to edit cannot be loaded. */
export default function WorkoutEditError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("training.loadError")} onRetry={() => retry()} />;
}
