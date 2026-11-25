"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { assessmentInputSchema, findAssessmentFieldErrors, type AssessmentField, type SavedAssessment } from "@/lib/assessment/assessment-schema";
import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import {
  EXPERIENCE_LEVELS,
  MAX_DAYS_PER_WEEK,
  MAX_LIMITATIONS_LENGTH,
  MAX_SESSION_MINUTES,
  MIN_DAYS_PER_WEEK,
  MIN_SESSION_MINUTES,
  SESSION_MINUTES_STEP,
  SPLIT_PREFERENCES,
} from "@/lib/constants/assessment";
import { PLAN_GOALS } from "@/lib/constants/training";
import { sendJsonRequest } from "@/lib/http/send-json-request";
import { translate } from "@/lib/i18n/translate";
import { ChoiceFieldset, FieldText, describedBy, FOCUS_CLASS, INPUT_CLASS, type ChoiceOption } from "./assessment-fields";
import { EquipmentPhotoDetection } from "./equipment-photo-detection";
import { buildFormDefaults, describeFieldError, readAssessmentForm, type AssessmentFormDefaults } from "./assessment-form-values";

export const ASSESSMENTS_ENDPOINT = "/api/assessments";

type SubmitState = { name: "idle" } | { name: "submitting" } | { name: "saved" } | { name: "error"; message: string };
type FieldErrors = Partial<Record<AssessmentField, string>>;

interface AssessmentFormProps {
  equipment: CatalogTerm[];
  latest: SavedAssessment | null;
}

const GOAL_OPTIONS: ChoiceOption[] = PLAN_GOALS.map((goal) => ({ value: goal, label: translate(`assessment.goals.${goal}`) }));
const LEVEL_OPTIONS: ChoiceOption[] = EXPERIENCE_LEVELS.map((level) => ({ value: level, label: translate(`assessment.levels.${level}`) }));
const SPLIT_OPTIONS: ChoiceOption[] = SPLIT_PREFERENCES.map((split) => ({ value: split, label: translate(`assessment.splits.${split}`) }));
const DAY_OPTIONS = Array.from({ length: MAX_DAYS_PER_WEEK - MIN_DAYS_PER_WEEK + 1 }, (_, index) => MIN_DAYS_PER_WEEK + index);

const MINUTES_HINT = translate("assessment.minutesHint", { min: MIN_SESSION_MINUTES, max: MAX_SESSION_MINUTES });
const LIMITATIONS_HINT = translate("assessment.limitationsHint", { max: MAX_LIMITATIONS_LENGTH });

function toFieldErrors(fields: AssessmentField[]): FieldErrors {
  return Object.fromEntries(fields.map((field) => [field, describeFieldError(field)]));
}

/** Validates on the device (same schema as the server), then posts; typed answers stay on failure. */
function useAssessmentSubmit() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ name: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = readAssessmentForm(new FormData(event.currentTarget));
    const parsed = assessmentInputSchema.safeParse(payload);
    setFieldErrors(parsed.success ? {} : toFieldErrors(findAssessmentFieldErrors(parsed.error)));
    if (!parsed.success) return setState({ name: "error", message: translate("assessment.fixErrors") });
    setState({ name: "submitting" });
    const result = await sendJsonRequest(ASSESSMENTS_ENDPOINT, "POST", payload, translate("assessment.failed"));
    setState(result.ok ? { name: "saved" } : { name: "error", message: result.message });
    if (result.ok) router.refresh();
  };
  return { state, fieldErrors, submit };
}

function ScheduleFields({ defaults, errors }: { defaults: AssessmentFormDefaults; errors: FieldErrors }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="assessment-days" className="font-semibold">{translate("assessment.daysLabel")}</label>
        <select id="assessment-days" name="daysPerWeek" defaultValue={String(defaults.daysPerWeek)} aria-invalid={errors.daysPerWeek ? true : undefined} aria-describedby={describedBy("assessment-days", undefined, errors.daysPerWeek)} className={INPUT_CLASS}>
          {DAY_OPTIONS.map((days) => <option key={days} value={days}>{translate("assessment.daysOption", { count: days })}</option>)}
        </select>
        <FieldText id="assessment-days" error={errors.daysPerWeek} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="assessment-minutes" className="font-semibold">{translate("assessment.minutesLabel")}</label>
        <input id="assessment-minutes" name="sessionMinutes" type="number" inputMode="numeric" min={MIN_SESSION_MINUTES} max={MAX_SESSION_MINUTES} step={SESSION_MINUTES_STEP} defaultValue={defaults.sessionMinutes} aria-invalid={errors.sessionMinutes ? true : undefined} aria-describedby={describedBy("assessment-minutes", MINUTES_HINT, errors.sessionMinutes)} className={INPUT_CLASS} />
        <FieldText id="assessment-minutes" hint={MINUTES_HINT} error={errors.sessionMinutes} />
      </div>
    </div>
  );
}

function LimitationsField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="assessment-limitations" className="font-semibold">{translate("assessment.limitationsLabel")}</label>
      <textarea id="assessment-limitations" name="limitations" rows={3} maxLength={MAX_LIMITATIONS_LENGTH} defaultValue={defaultValue} aria-invalid={error ? true : undefined} aria-describedby={describedBy("assessment-limitations", LIMITATIONS_HINT, error)} className={`${INPUT_CLASS} py-2`} />
      <FieldText id="assessment-limitations" hint={LIMITATIONS_HINT} error={error} />
    </div>
  );
}

function SubmitFeedback({ state }: { state: SubmitState }) {
  if (state.name === "saved") return <p role="status" className="text-accent-strong">{translate("assessment.saved")}</p>;
  if (state.name === "error") return <p role="alert" className="font-medium text-accent-strong">{state.message}</p>;
  return null;
}

export function AssessmentForm({ equipment, latest }: AssessmentFormProps) {
  const defaults = buildFormDefaults(latest);
  const { state, fieldErrors: errors, submit } = useAssessmentSubmit();
  const equipmentOptions = equipment.map((term) => ({ value: term.slug, label: term.name }));
  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <p className="text-muted">{translate("assessment.intro")}</p>
      <ChoiceFieldset id="assessment-goal" type="radio" name="goal" legend={translate("assessment.goalLegend")} options={GOAL_OPTIONS} isChecked={(value) => value === defaults.goal} error={errors.goal} />
      <ChoiceFieldset id="assessment-level" type="radio" name="experienceLevel" legend={translate("assessment.levelLegend")} options={LEVEL_OPTIONS} isChecked={(value) => value === defaults.experienceLevel} error={errors.experienceLevel} />
      <ScheduleFields defaults={defaults} errors={errors} />
      <ChoiceFieldset id="assessment-split" type="radio" name="splitPreference" legend={translate("assessment.splitLegend")} options={SPLIT_OPTIONS} isChecked={(value) => value === defaults.splitPreference} hint={translate("assessment.splitHint")} error={errors.splitPreference} />
      <ChoiceFieldset id="assessment-equipment" type="checkbox" name="equipmentSlugs" legend={translate("assessment.equipmentLegend")} options={equipmentOptions} isChecked={(value) => defaults.equipmentSlugs.includes(value)} hint={translate("assessment.equipmentHint")} error={errors.equipmentSlugs} />
      <EquipmentPhotoDetection />
      <LimitationsField defaultValue={defaults.limitations} error={errors.limitations} />
      <SubmitFeedback state={state} />
      <button type="submit" disabled={state.name === "submitting"} className={`min-h-11 rounded-lg bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-60 ${FOCUS_CLASS}`}>
        {translate(state.name === "submitting" ? "assessment.submitting" : "assessment.submitButton")}
      </button>
    </form>
  );
}
