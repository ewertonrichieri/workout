"use client";

import { useRef, useSyncExternalStore, type ChangeEvent } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { APP_LANGUAGE } from "@/lib/constants/app";
import { MAX_DETECTION_PHOTOS } from "@/lib/constants/equipment-detection";
import type { DetectedEquipment } from "@/lib/equipment-detection/detection-schema";
import { translate } from "@/lib/i18n/translate";
import { canCompressPhotos } from "./photo-compression";
import { usePhotoDetection, type PhotoDetectionState } from "./use-photo-detection";

const HINT_ID = "equipment-photo-hint";
const PHOTO_LIST_FORMAT = new Intl.ListFormat(APP_LANGUAGE, { style: "long", type: "conjunction" });

/** Support never changes while the page is open. */
const subscribeToNothing = () => () => undefined;

function describePhotos(photoNumbers: readonly number[]): string {
  const numbers = PHOTO_LIST_FORMAT.format(photoNumbers.map(String));
  return translate(photoNumbers.length === 1 ? "equipmentDetection.photoNumbers" : "equipmentDetection.photoNumbersPlural", { numbers });
}

function DetectedList({ equipment }: { equipment: readonly DetectedEquipment[] }) {
  if (equipment.length === 0) return <p role="status" className="text-muted">{translate("equipmentDetection.empty")}</p>;
  return (
    <section aria-labelledby="equipment-photo-result" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h3 id="equipment-photo-result" className="font-semibold">{translate("equipmentDetection.resultTitle")}</h3>
      <p className="text-sm text-muted">{translate("equipmentDetection.resultHint")}</p>
      <ul className="flex flex-col gap-2">
        {equipment.map((item) => (
          <li key={item.slug} className="flex flex-col">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-muted">{`${translate(`equipmentDetection.confidence.${item.confidence}`)} · ${describePhotos(item.photoNumbers)}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetectionFeedback({ state }: { state: PhotoDetectionState }) {
  if (state.name === "preparing") return <p role="status">{translate("equipmentDetection.preparing")}</p>;
  if (state.name === "analyzing") return <p role="status">{translate("equipmentDetection.analyzing")}</p>;
  if (state.name === "error") return <p role="alert" className="font-medium text-accent-strong">{state.message}</p>;
  if (state.name === "done") return <DetectedList equipment={state.equipment} />;
  return null;
}

/** "Identificar por foto" in the assessment (step 4.1); hidden where the browser cannot prepare photos. */
export function EquipmentPhotoDetection() {
  const isSupported = useSyncExternalStore(subscribeToNothing, canCompressPhotos, () => false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, detect, isBusy } = usePhotoDetection();
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
      <DetectionFeedback state={state} />
    </div>
  );
}
