import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import type { TechniqueRuleSetId } from "@/lib/constants/technique";
import { translate, type TranslationKey } from "@/lib/i18n/translate";

/** Guide lines of each supported exercise and camera view (only the squat from the side in 5.1–5.4). */
const GUIDE_LINES: Readonly<Record<TechniqueRuleSetId, readonly TranslationKey[]>> = {
  squat: [
    "technique.guide.squatSide.side",
    "technique.guide.squatSide.distance",
    "technique.guide.squatSide.fullBody",
    "technique.guide.squatSide.light",
  ],
};

/** Phone lying on the floor, sideways to a standing person (the text carries the same information). */
function SideViewIllustration() {
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label={translate("technique.guide.illustration")} className="h-auto w-full text-muted">
      <line x1="10" y1="110" x2="230" y2="110" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="88" width="14" height="22" rx="3" fill="none" stroke="var(--accent-strong)" strokeWidth="3" />
      <line x1="44" y1="99" x2="150" y2="99" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
      <text x="97" y="92" textAnchor="middle" fontSize="12" fill="currentColor">2–3 m</text>
      <circle cx="180" cy="22" r="9" fill="none" stroke="var(--foreground)" strokeWidth="3" />
      <path d="M180 31 L180 70 M180 42 L196 56 M180 70 L170 110 M180 70 L192 110" fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PositioningGuide({ ruleSetId, onOpenCamera }: { ruleSetId: TechniqueRuleSetId; onOpenCamera: () => void }) {
  return (
    <section aria-labelledby="technique-guide-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 id="technique-guide-title" className="text-lg font-semibold">{translate("technique.guide.title")}</h2>
      <SideViewIllustration />
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {GUIDE_LINES[ruleSetId].map((key) => <li key={key}>{translate(key)}</li>)}
      </ul>
      <button type="button" onClick={onOpenCamera} className={PRIMARY_BUTTON_CLASS}>{translate("technique.guide.openCamera")}</button>
    </section>
  );
}
