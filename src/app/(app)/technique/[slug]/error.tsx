"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the exercise cannot be loaded. */
export default function TechniqueError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("technique.loadError")} onRetry={() => retry()} />;
}
