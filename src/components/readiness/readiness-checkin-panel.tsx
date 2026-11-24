"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import type { CheckinResult } from "@/lib/readiness/readiness-schema";
import type { DraftReadiness } from "@/lib/training/set-log-draft";
import { ReadinessCheckinForm } from "./readiness-checkin-form";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./readiness-styles";

interface ReadinessCheckinPanelProps {
  workoutId: string;
  readiness: DraftReadiness | null;
  /** The user already logged something today: the check-in is no longer offered. */
  hasStarted: boolean;
  /** Time per workout of the latest assessment (default answer); null without one. */
  sessionMinutes: number | null;
  onChange: (readiness: DraftReadiness) => void;
}

const CARD_CLASS = "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4";

function CheckinPrompt({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <section aria-labelledby="readiness-prompt-title" className={CARD_CLASS}>
      <h3 id="readiness-prompt-title" className="text-lg font-semibold">{translate("readiness.promptTitle")}</h3>
      <p className="text-sm text-muted">{translate("readiness.promptDescription")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onStart} className={PRIMARY_BUTTON_CLASS}>{translate("readiness.startButton")}</button>
        <button type="button" onClick={onSkip} className={SECONDARY_BUTTON_CLASS}>{translate("readiness.skipButton")}</button>
      </div>
    </section>
  );
}

function CheckinSummary({ result }: { result: CheckinResult }) {
  return (
    <section role="status" className={CARD_CLASS}>
      <p className="font-semibold">{translate("readiness.doneTitle")}</p>
      <p className="text-sm">{translate(result.needsAdjustment ? "readiness.doneLighter" : "readiness.doneNormal")}</p>
      {result.hasSeverePain && <p role="note" className="text-sm font-medium">{translate("readiness.severePainNotice")}</p>}
    </section>
  );
}

/** Pre-workout check-in (step 3B.1): optional, offered only before the first set of the day. */
export function ReadinessCheckinPanel({ workoutId, readiness, hasStarted, sessionMinutes, onChange }: ReadinessCheckinPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const skip = () => onChange({ status: "skipped" });
  if (readiness?.status === "done") return <CheckinSummary result={readiness} />;
  if (readiness?.status === "skipped" || hasStarted) return null;
  if (!isFormOpen) return <CheckinPrompt onStart={() => setIsFormOpen(true)} onSkip={skip} />;
  return <ReadinessCheckinForm workoutId={workoutId} sessionMinutes={sessionMinutes} onSaved={(result) => onChange({ status: "done", ...result })} onSkip={skip} />;
}
