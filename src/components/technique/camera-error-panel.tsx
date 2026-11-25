import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import type { CameraErrorReason } from "@/lib/technique/camera-support";
import { translate } from "@/lib/i18n/translate";

/** Camera or model failure: says why in Portuguese and lets the user try again (the workout is untouched). */
export function CameraErrorPanel({ reason, onRetry }: { reason: CameraErrorReason | "model"; onRetry: () => void }) {
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p>{translate(`technique.errors.${reason}`)}</p>
      <button type="button" onClick={onRetry} className={PRIMARY_BUTTON_CLASS}>{translate("technique.errors.retry")}</button>
    </section>
  );
}
