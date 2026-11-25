"use client";

import { useEffect, useRef } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import { EQUIPMENT_PRESETS, type EquipmentPreset } from "@/lib/constants/equipment-detection";
import { resolvePresetSlugs } from "@/lib/equipment-detection/equipment-review";
import { translate } from "@/lib/i18n/translate";
import { ChoiceFieldset } from "./assessment-fields";
import { EquipmentPhotoDetection } from "./equipment-photo-detection";
import { useEquipmentSelection, type EquipmentSelectionNotice } from "./use-equipment-selection";

function PresetPicker({ onPick }: { onPick: (preset: EquipmentPreset) => void }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby="equipment-presets-hint">
      <legend className="mb-1 font-semibold">{translate("equipmentDetection.presetsLegend")}</legend>
      <span id="equipment-presets-hint" className="text-sm text-muted">{translate("equipmentDetection.presetsHint")}</span>
      <div className="grid grid-cols-2 gap-2">
        {EQUIPMENT_PRESETS.map((preset) => (
          <button key={preset} type="button" onClick={() => onPick(preset)} className={SECONDARY_BUTTON_CLASS}>
            {translate(`equipmentDetection.presets.${preset}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** After a replacement the button that caused it may disappear (photo review): focus moves to "Desfazer". */
function SelectionNotice({ notice, onUndo }: { notice: EquipmentSelectionNotice | null; onUndo: () => void }) {
  const undoRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (notice?.canUndo) undoRef.current?.focus();
  }, [notice]);
  if (!notice) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-accent-strong">{notice.message}</p>
      {notice.canUndo && <button ref={undoRef} type="button" onClick={onUndo} className={SECONDARY_BUTTON_CLASS}>{translate("equipmentDetection.undo")}</button>}
    </div>
  );
}

interface EquipmentSectionProps {
  equipment: readonly CatalogTerm[];
  initialSlugs: readonly string[];
  error?: string;
}

/** Equipment of the assessment: manual checkboxes, ready-made profiles and photos (spec 013); saved only with the form. */
export function EquipmentSection({ equipment, initialSlugs, error }: EquipmentSectionProps) {
  const { selected, notice, toggle, replace, undo } = useEquipmentSelection(initialSlugs);
  const vocabularySlugs = equipment.map((term) => term.slug);
  const applyPreset = (preset: EquipmentPreset) => {
    const name = translate(`equipmentDetection.presets.${preset}`);
    replace(resolvePresetSlugs(preset, vocabularySlugs), translate("equipmentDetection.presetApplied", { name }));
  };
  const options = equipment.map((term) => ({ value: term.slug, label: term.name }));
  return (
    <div className="flex flex-col gap-4">
      <PresetPicker onPick={applyPreset} />
      <EquipmentPhotoDetection vocabulary={equipment} onApply={(slugs) => replace(slugs, translate("equipmentDetection.reviewApplied"))} />
      <SelectionNotice notice={notice} onUndo={undo} />
      <ChoiceFieldset id="assessment-equipment" type="checkbox" name="equipmentSlugs" legend={translate("assessment.equipmentLegend")} options={options} isChecked={(value) => selected.includes(value)} onToggle={toggle} hint={translate("assessment.equipmentHint")} error={error} />
    </div>
  );
}
