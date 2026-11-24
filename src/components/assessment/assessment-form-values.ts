import type { AssessmentField, SavedAssessment } from "@/lib/assessment/assessment-schema";
import {
  DEFAULT_DAYS_PER_WEEK,
  DEFAULT_SESSION_MINUTES,
  DEFAULT_SPLIT_PREFERENCE,
  MAX_LIMITATIONS_LENGTH,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
} from "@/lib/constants/assessment";
import { translate } from "@/lib/i18n/translate";

/** Raw answers as typed; the schema decides what is valid (empty number → NaN, never 0). */
export interface AssessmentFormPayload {
  goal: string | null;
  experienceLevel: string | null;
  daysPerWeek: number;
  sessionMinutes: number;
  splitPreference: string | null;
  equipmentSlugs: string[];
  limitations: string;
}

export type AssessmentFormDefaults = Pick<SavedAssessment, "daysPerWeek" | "sessionMinutes" | "equipmentSlugs"> & {
  goal: string | null;
  experienceLevel: string | null;
  splitPreference: string;
  limitations: string;
};

function readText(data: FormData, name: string): string | null {
  const value = data.get(name);
  return typeof value === "string" ? value : null;
}

function readInteger(data: FormData, name: string): number {
  const text = readText(data, name)?.trim() ?? "";
  return text === "" ? Number.NaN : Number(text);
}

export function readAssessmentForm(data: FormData): AssessmentFormPayload {
  return {
    goal: readText(data, "goal"),
    experienceLevel: readText(data, "experienceLevel"),
    daysPerWeek: readInteger(data, "daysPerWeek"),
    sessionMinutes: readInteger(data, "sessionMinutes"),
    splitPreference: readText(data, "splitPreference"),
    equipmentSlugs: data.getAll("equipmentSlugs").filter((value): value is string => typeof value === "string"),
    limitations: readText(data, "limitations") ?? "",
  };
}

/** Latest assessment when there is one; otherwise neutral defaults (goal and level stay unanswered). */
export function buildFormDefaults(latest: SavedAssessment | null): AssessmentFormDefaults {
  if (latest) return { ...latest, limitations: latest.limitations ?? "" };
  return {
    goal: null,
    experienceLevel: null,
    daysPerWeek: DEFAULT_DAYS_PER_WEEK,
    sessionMinutes: DEFAULT_SESSION_MINUTES,
    splitPreference: DEFAULT_SPLIT_PREFERENCE,
    equipmentSlugs: [],
    limitations: "",
  };
}

export function describeFieldError(field: AssessmentField): string {
  if (field === "sessionMinutes") return translate("assessment.fieldErrors.sessionMinutes", { min: MIN_SESSION_MINUTES, max: MAX_SESSION_MINUTES });
  if (field === "limitations") return translate("assessment.fieldErrors.limitations", { max: MAX_LIMITATIONS_LENGTH });
  return translate(`assessment.fieldErrors.${field}`);
}
