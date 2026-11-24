import { useId } from "react";
import { FOCUS_CLASS } from "@/components/assessment/assessment-fields";
import { BODY_REGIONS, PAIN_INTENSITIES, type BodyRegion, type PainIntensity } from "@/lib/constants/readiness";
import { translate } from "@/lib/i18n/translate";
import type { ReportedPain } from "@/lib/readiness/readiness-schema";
import { ReadinessOptionGroup } from "./readiness-option-group";

interface PainRegionFieldsProps {
  pains: readonly ReportedPain[];
  onToggle: (region: BodyRegion) => void;
  onIntensityChange: (region: BodyRegion, intensity: PainIntensity) => void;
}

const REGION_CLASS = "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 has-[:checked]:border-accent-strong";
const INTENSITY_OPTIONS = PAIN_INTENSITIES.map((value) => ({ value, label: translate(`readiness.intensity.${value}`) }));

function PainRegion({ region, pain, onToggle, onIntensityChange }: { region: BodyRegion; pain?: ReportedPain } & Omit<PainRegionFieldsProps, "pains">) {
  const label = translate(`readiness.regions.${region}`);
  return (
    <div className="flex flex-col gap-2">
      <label className={REGION_CLASS}>
        <input type="checkbox" checked={pain !== undefined} onChange={() => onToggle(region)} className={`size-5 accent-accent-strong ${FOCUS_CLASS}`} />
        <span>{label}</span>
      </label>
      {pain && (
        <div className="pl-4">
          <ReadinessOptionGroup
            legend={translate("readiness.intensityLegend", { region: label })}
            name={`pain-${region}`}
            options={INTENSITY_OPTIONS}
            selected={pain.intensity}
            onSelect={(intensity) => onIntensityChange(region, intensity)}
          />
        </div>
      )}
    </div>
  );
}

/** "Dor ou cansaço": optional regions, each with its intensity once marked. */
export function PainRegionFields({ pains, onToggle, onIntensityChange }: PainRegionFieldsProps) {
  const hintId = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={hintId}>
      <legend className="mb-1 font-semibold">{translate("readiness.painLegend")}</legend>
      <span id={hintId} className="text-sm text-muted">{translate("readiness.painHint")}</span>
      {BODY_REGIONS.map((region) => (
        <PainRegion key={region} region={region} pain={pains.find((item) => item.bodyRegion === region)} onToggle={onToggle} onIntensityChange={onIntensityChange} />
      ))}
    </fieldset>
  );
}
