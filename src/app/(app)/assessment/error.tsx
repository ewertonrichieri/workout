"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Route-level fallback when the assessment form cannot be loaded. */
export default function AssessmentError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("assessment.loadError")} onRetry={() => retry()} />;
}
