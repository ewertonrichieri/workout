"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";
import { buildFinishPayload, hasUncheckedSets, type WorkoutDraft } from "@/lib/training/set-log-draft";
import { submitFinishedWorkout } from "./finish-workout-request";

type FinishStep = { name: "idle" } | { name: "confirming" } | { name: "submitting" } | { name: "error"; message: string };

interface FinishWorkoutButtonProps {
  draft: WorkoutDraft;
  onFinished: () => void;
}

const BUTTON_CLASS =
  "min-h-11 rounded-lg px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong disabled:opacity-60";
const PRIMARY_CLASS = `${BUTTON_CLASS} bg-accent text-accent-foreground`;
const SECONDARY_CLASS = `${BUTTON_CLASS} border border-border`;

function ConfirmIncomplete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p>{translate("training.finish.confirmIncomplete")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} className={PRIMARY_CLASS}>{translate("training.finish.confirmButton")}</button>
        <button type="button" onClick={onCancel} className={SECONDARY_CLASS}>{translate("training.finish.cancelButton")}</button>
      </div>
    </div>
  );
}

/** "Finalizar treino": sends only checked sets; asks before leaving unchecked sets behind. */
export function FinishWorkoutButton({ draft, onFinished }: FinishWorkoutButtonProps) {
  const [step, setStep] = useState<FinishStep>({ name: "idle" });
  const submit = async () => {
    setStep({ name: "submitting" });
    const result = await submitFinishedWorkout(buildFinishPayload(draft, new Date().toISOString()));
    if (result.ok) {
      setStep({ name: "idle" });
      onFinished();
    } else setStep({ name: "error", message: result.message });
  };
  const start = () => {
    if (buildFinishPayload(draft, new Date().toISOString()).sets.length === 0) setStep({ name: "error", message: translate("training.finish.noSets") });
    else if (hasUncheckedSets(draft)) setStep({ name: "confirming" });
    else void submit();
  };
  if (step.name === "confirming") return <ConfirmIncomplete onConfirm={() => void submit()} onCancel={() => setStep({ name: "idle" })} />;
  const isSubmitting = step.name === "submitting";
  return (
    <div className="flex flex-col gap-2">
      {step.name === "error" && <p role="alert" className="text-accent-strong">{step.message}</p>}
      <button type="button" onClick={start} disabled={isSubmitting} className={PRIMARY_CLASS}>
        {translate(isSubmitting ? "training.finish.pending" : "training.finish.button")}
      </button>
    </div>
  );
}
