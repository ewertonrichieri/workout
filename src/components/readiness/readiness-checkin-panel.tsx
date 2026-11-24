"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import type { DraftAdjustment } from "@/lib/readiness/adjustment-schema";
import type { Workout } from "@/lib/training/plan-types";
import type { DraftReadiness } from "@/lib/training/set-log-draft";
import { DailyAdjustmentPanel } from "./daily-adjustment-panel";
import { ReadinessCheckinForm } from "./readiness-checkin-form";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./readiness-styles";

interface ReadinessCheckinPanelProps {
  /** The planned workout (the daily adjustment shows "before" from it). */
  planned: Workout;
  readiness: DraftReadiness | null;
  /** The user already logged something today: the check-in is no longer offered. */
  hasStarted: boolean;
  /** No set is checked yet: an accepted adjustment can still be undone. */
  canUndoAdjustment: boolean;
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

type DoneReadiness = Extract<DraftReadiness, { status: "done" }>;

function NormalDaySummary() {
  return (
    <section role="status" className={CARD_CLASS}>
      <p className="font-semibold">{translate("readiness.doneTitle")}</p>
      <p className="text-sm">{translate("readiness.doneNormal")}</p>
    </section>
  );
}

interface CheckinOutcomeProps {
  readiness: DoneReadiness;
  planned: Workout;
  canUndo: boolean;
  onChange: (readiness: DraftReadiness) => void;
}

/** A lighter day goes to the daily adjustment by AI (step 3B.2); a severe pain reinforces the health notice. */
function CheckinOutcome({ readiness, planned, canUndo, onChange }: CheckinOutcomeProps) {
  const changeAdjustment = (adjustment: DraftAdjustment) => onChange({ ...readiness, adjustment });
  return (
    <>
      {readiness.needsAdjustment ? (
        <DailyAdjustmentPanel checkinId={readiness.checkinId} planned={planned} adjustment={readiness.adjustment} canUndo={canUndo} onChange={changeAdjustment} />
      ) : (
        <NormalDaySummary />
      )}
      {readiness.hasSeverePain && <p role="note" className="rounded-2xl border border-accent-strong bg-surface p-4 text-sm font-medium">{translate("readiness.severePainNotice")}</p>}
    </>
  );
}

/** Pre-workout check-in (step 3B.1): optional, offered only before the first set of the day. */
export function ReadinessCheckinPanel({ planned, readiness, hasStarted, canUndoAdjustment, sessionMinutes, onChange }: ReadinessCheckinPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const skip = () => onChange({ status: "skipped" });
  if (readiness?.status === "done") return <CheckinOutcome readiness={readiness} planned={planned} canUndo={canUndoAdjustment} onChange={onChange} />;
  if (readiness?.status === "skipped" || hasStarted) return null;
  if (!isFormOpen) return <CheckinPrompt onStart={() => setIsFormOpen(true)} onSkip={skip} />;
  const save = (result: Omit<DoneReadiness, "status" | "adjustment">) => onChange({ status: "done", ...result, adjustment: null });
  return <ReadinessCheckinForm workoutId={planned.id} sessionMinutes={sessionMinutes} onSaved={save} onSkip={skip} />;
}
