"use client";

import { RouteError } from "@/components/layout/route-error";
import { translate } from "@/lib/i18n/translate";

/** Fallback for the home screen (and signed-in screens without their own error boundary). */
export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title={translate("pages.home.loadError")} onRetry={() => retry()} />;
}
