"use client";

import { useState } from "react";
import { translate } from "@/lib/i18n/translate";

export interface EquipmentSelectionNotice {
  message: string;
  canUndo: boolean;
}

interface SelectionState {
  selected: string[];
  /** List before the last replacement (preset or photos), for "Desfazer". */
  previous: string[] | null;
  notice: EquipmentSelectionNotice | null;
}

/** Checked equipment of the assessment; presets and photo reviews replace it with one-step undo (nothing is saved yet). */
export function useEquipmentSelection(initialSlugs: readonly string[]) {
  const [state, setState] = useState<SelectionState>({ selected: [...initialSlugs], previous: null, notice: null });
  const toggle = (slug: string, isChecked: boolean) => setState((current) => ({
    selected: isChecked ? [...new Set([...current.selected, slug])] : current.selected.filter((item) => item !== slug),
    previous: null,
    notice: null,
  }));
  const replace = (slugs: readonly string[], message: string) => setState((current) => ({
    selected: [...slugs],
    previous: current.selected,
    notice: { message, canUndo: true },
  }));
  const undo = () => setState((current) => current.previous
    ? { selected: current.previous, previous: null, notice: { message: translate("equipmentDetection.restored"), canUndo: false } }
    : current);
  return { selected: state.selected, notice: state.notice, toggle, replace, undo };
}
