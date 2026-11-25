"use client";

import { useRef, useSyncExternalStore, type ChangeEvent } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { MAX_DETECTION_PHOTOS } from "@/lib/constants/equipment-detection";
import type { CatalogTerm } from "@/lib/catalog/exercises/exercise-types";
import { buildReviewItems } from "@/lib/equipment-detection/equipment-review";
import { translate } from "@/lib/i18n/translate";
import { DetectionReview } from "./detection-review";
import { canCompressPhotos } from "./photo-compression";
import { usePhotoDetection, type PhotoDetectionState } from "./use-photo-detection";

const HINT_ID = "equipment-photo-hint";
/** Support never changes while the page is open. */
const subscribeToNothing = () => () => undefined;

interface DetectionFeedbackProps {
  state: PhotoDetectionState;
  vocabulary: readonly CatalogTerm[];
  onApply: (slugs: string[]) => void;
}

function DetectionFeedback({ state, vocabulary, onApply }: DetectionFeedbackProps) {
  if (state.name === "preparing") return <p role="status">{translate("equipmentDetection.preparing")}</p>;
  if (state.name === "analyzing") return <p role="status">{translate("equipmentDetection.analyzing")}</p>;
  if (state.name === "error") return <p role="alert" className="font-medium text-accent-strong">{state.message}</p>;
  if (state.name !== "done") return null;
  const items = buildReviewItems(state.equipment, vocabulary);
  if (items.length === 0) return <p role="status" className="text-muted">{translate("equipmentDetection.empty")}</p>;
  return <DetectionReview initialItems={items} onApply={onApply} />;
}

interface EquipmentPhotoDetectionProps {
  vocabulary: readonly CatalogTerm[];
  /** Receives the reviewed list (step 4.2). */
  onApply: (slugs: string[]) => void;
}

/** "Identificar por foto" in the assessment (steps 4.1 and 4.2); hidden where the browser cannot prepare photos. */
export function EquipmentPhotoDetection({ vocabulary, onApply }: EquipmentPhotoDetectionProps) {
  const isSupported = useSyncExternalStore(subscribeToNothing, canCompressPhotos, () => false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, detect, reset, isBusy } = usePhotoDetection();
  if (!isSupported) return null;
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    void detect(files);
  };
  return (
    <div className="flex flex-col gap-2" aria-busy={isBusy}>
      <p id={HINT_ID} className="text-sm text-muted">{translate("equipmentDetection.hint", { max: MAX_DETECTION_PHOTOS })}</p>
      <button type="button" disabled={isBusy} onClick={() => inputRef.current?.click()} aria-describedby={HINT_ID} className={SECONDARY_BUTTON_CLASS}>
        {translate("equipmentDetection.button")}
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden tabIndex={-1} onChange={onChange} data-testid="equipment-photo-input" />
      <DetectionFeedback state={state} vocabulary={vocabulary} onApply={(slugs) => { reset(); onApply(slugs); }} />
    </div>
  );
}
