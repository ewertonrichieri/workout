"use client";

import { useState } from "react";
import {
  DEFAULT_ENERGY_LEVEL,
  DEFAULT_PAIN_INTENSITY,
  DEFAULT_SLEEP_QUALITY,
  type BodyRegion,
  type EnergyLevel,
  type PainIntensity,
  type SleepQuality,
} from "@/lib/constants/readiness";
import { pickDefaultAvailableMinutes } from "@/lib/readiness/readiness-rules";
import type { ReadinessCheckinInput, ReportedPain } from "@/lib/readiness/readiness-schema";

export interface ReadinessFormState {
  sleepQuality: SleepQuality;
  energyLevel: EnergyLevel;
  availableMinutes: number;
  pains: ReportedPain[];
  setSleepQuality: (value: SleepQuality) => void;
  setEnergyLevel: (value: EnergyLevel) => void;
  setAvailableMinutes: (value: number) => void;
  togglePain: (region: BodyRegion) => void;
  setPainIntensity: (region: BodyRegion, intensity: PainIntensity) => void;
  toPayload: (workoutId: string) => ReadinessCheckinInput;
}

/** Answers of the check-in form; a normal day is already selected (one tap to save). */
export function useReadinessForm(sessionMinutes: number | null): ReadinessFormState {
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>(DEFAULT_SLEEP_QUALITY);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(DEFAULT_ENERGY_LEVEL);
  const [availableMinutes, setAvailableMinutes] = useState(() => pickDefaultAvailableMinutes(sessionMinutes));
  const [pains, setPains] = useState<ReportedPain[]>([]);
  const togglePain = (region: BodyRegion) =>
    setPains((current) =>
      current.some((pain) => pain.bodyRegion === region)
        ? current.filter((pain) => pain.bodyRegion !== region)
        : [...current, { bodyRegion: region, intensity: DEFAULT_PAIN_INTENSITY }],
    );
  const setPainIntensity = (region: BodyRegion, intensity: PainIntensity) =>
    setPains((current) => current.map((pain) => (pain.bodyRegion === region ? { ...pain, intensity } : pain)));
  const toPayload = (workoutId: string) => ({ workoutId, sleepQuality, energyLevel, availableMinutes, pains });
  return { sleepQuality, energyLevel, availableMinutes, pains, setSleepQuality, setEnergyLevel, setAvailableMinutes, togglePain, setPainIntensity, toPayload };
}
