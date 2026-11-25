import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { translate } from "@/lib/i18n/translate";

/** Privacy, 2D-camera limits and health notice shown before the camera turns on (spec 014). */
export function TechniqueNotice({ onAccept }: { onAccept: () => void }) {
  return (
    <section aria-labelledby="technique-notice-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 id="technique-notice-title" className="text-lg font-semibold">{translate("technique.notice.title")}</h2>
      <p>{translate("technique.notice.privacy")}</p>
      <p className="text-sm text-muted">{translate("technique.notice.limits")}</p>
      <p className="text-sm text-muted">{translate("technique.notice.health")}</p>
      <button type="button" onClick={onAccept} className={PRIMARY_BUTTON_CLASS}>{translate("technique.notice.accept")}</button>
    </section>
  );
}
