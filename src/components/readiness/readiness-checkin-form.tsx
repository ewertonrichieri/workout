"use client";

import { useState } from "react";
import { ENERGY_LEVELS, SLEEP_QUALITIES } from "@/lib/constants/readiness";
import { translate } from "@/lib/i18n/translate";
import { buildAvailableMinutesOptions } from "@/lib/readiness/readiness-rules";
import type { CheckinResult } from "@/lib/readiness/readiness-schema";
import { PainRegionFields } from "./pain-region-fields";
import { ReadinessOptionGroup } from "./readiness-option-group";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./readiness-styles";
import { submitReadinessCheckin } from "./readiness-request";
import { useReadinessForm, type ReadinessFormState } from "./use-readiness-form";

interface ReadinessCheckinFormProps {
  workoutId: string;
  sessionMinutes: number | null;
  onSaved: (result: CheckinResult) => void;
  onSkip: () => void;
}

type SubmitStep = { name: "idle" } | { name: "submitting" } | { name: "error"; message: string };

const SLEEP_OPTIONS = SLEEP_QUALITIES.map((value) => ({ value, label: translate(`readiness.sleep.${value}`) }));
const ENERGY_OPTIONS = ENERGY_LEVELS.map((value) => ({ value, label: translate(`readiness.energy.${value}`) }));

function ReadinessQuestions({ form, sessionMinutes }: { form: ReadinessFormState; sessionMinutes: number | null }) {
  const minutesOptions = buildAvailableMinutesOptions(sessionMinutes).map((value) => ({ value, label: translate("readiness.minutesOption", { minutes: value }) }));
  return (
    <>
      <ReadinessOptionGroup legend={translate("readiness.sleepLegend")} name="sleep" options={SLEEP_OPTIONS} selected={form.sleepQuality} onSelect={form.setSleepQuality} />
      <ReadinessOptionGroup legend={translate("readiness.energyLegend")} name="energy" options={ENERGY_OPTIONS} selected={form.energyLevel} onSelect={form.setEnergyLevel} />
      <ReadinessOptionGroup legend={translate("readiness.minutesLegend")} name="minutes" options={minutesOptions} selected={form.availableMinutes} onSelect={form.setAvailableMinutes} />
      <PainRegionFields pains={form.pains} onToggle={form.togglePain} onIntensityChange={form.setPainIntensity} />
    </>
  );
}

/** Check-in answers (step 3B.1); a failure keeps them and still allows training without a check-in. */
export function ReadinessCheckinForm({ workoutId, sessionMinutes, onSaved, onSkip }: ReadinessCheckinFormProps) {
  const form = useReadinessForm(sessionMinutes);
  const [step, setStep] = useState<SubmitStep>({ name: "idle" });
  const submit = async () => {
    setStep({ name: "submitting" });
    const result = await submitReadinessCheckin(form.toPayload(workoutId));
    if (result.ok) onSaved(result.data);
    else setStep({ name: "error", message: result.message });
  };
  const isSubmitting = step.name === "submitting";
  return (
    <form aria-label={translate("readiness.formLabel")} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <ReadinessQuestions form={form} sessionMinutes={sessionMinutes} />
      {step.name === "error" && <p role="alert" className="font-medium text-accent-strong">{step.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON_CLASS}>{translate(isSubmitting ? "readiness.submitting" : "readiness.submitButton")}</button>
        <button type="button" onClick={onSkip} className={SECONDARY_BUTTON_CLASS}>
          {translate(step.name === "error" ? "readiness.skipAfterFailure" : "readiness.skipButton")}
        </button>
      </div>
    </form>
  );
}
