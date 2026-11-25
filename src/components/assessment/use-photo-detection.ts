"use client";

import { useState } from "react";
import type { DetectedEquipment } from "@/lib/equipment-detection/detection-schema";
import { preparePhotos, requestEquipmentDetection } from "./equipment-detection-request";

export type PhotoDetectionState =
  | { name: "idle" }
  | { name: "preparing" }
  | { name: "analyzing" }
  | { name: "done"; equipment: DetectedEquipment[] }
  | { name: "error"; message: string };

/** Prepares (compresses) and sends the photos; failures keep the user's checked list untouched. */
export function usePhotoDetection() {
  const [state, setState] = useState<PhotoDetectionState>({ name: "idle" });
  const detect = async (files: readonly File[]) => {
    if (files.length === 0) return;
    setState({ name: "preparing" });
    const prepared = await preparePhotos(files);
    if (!prepared.ok) return setState({ name: "error", message: prepared.message });
    setState({ name: "analyzing" });
    const result = await requestEquipmentDetection(prepared.photos);
    setState(result.ok ? { name: "done", equipment: result.data.equipment } : { name: "error", message: result.message });
  };
  const reset = () => setState({ name: "idle" });
  return { state, detect, reset, isBusy: state.name === "preparing" || state.name === "analyzing" };
}
