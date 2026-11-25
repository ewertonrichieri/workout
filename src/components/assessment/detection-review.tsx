"use client";

import { useState } from "react";
import { PRIMARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { APP_LANGUAGE } from "@/lib/constants/app";
import type { ReviewItem } from "@/lib/equipment-detection/equipment-review";
import { translate } from "@/lib/i18n/translate";
import { FOCUS_CLASS } from "./assessment-fields";

const PHOTO_LIST_FORMAT = new Intl.ListFormat(APP_LANGUAGE, { style: "long", type: "conjunction" });
const APPLY_HINT_ID = "equipment-review-empty";

function describePhotos(photoNumbers: readonly number[]): string {
  const numbers = PHOTO_LIST_FORMAT.format(photoNumbers.map(String));
  return translate(photoNumbers.length === 1 ? "equipmentDetection.photoNumbers" : "equipmentDetection.photoNumbersPlural", { numbers });
}

function describeItem(item: ReviewItem): string {
  if (!item.confidence) return translate("equipmentDetection.alwaysAvailable");
  return `${translate(`equipmentDetection.confidence.${item.confidence}`)} · ${describePhotos(item.photoNumbers)}`;
}

/** No `name`: the review never becomes part of the assessment answers until "Usar esta lista". */
function ReviewOption({ item, onToggle }: { item: ReviewItem; onToggle: (isChecked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 has-[:checked]:border-accent-strong">
      <input type="checkbox" checked={item.isChecked} onChange={(event) => onToggle(event.currentTarget.checked)} className={`size-5 shrink-0 accent-accent-strong ${FOCUS_CLASS}`} />
      <span className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        <span className="text-sm text-muted">{describeItem(item)}</span>
      </span>
    </label>
  );
}

interface DetectionReviewProps {
  initialItems: readonly ReviewItem[];
  onApply: (slugs: string[]) => void;
}

/** Step 4.2: the user checks what they have; "Usar esta lista" replaces the assessment equipment (D4, D8). */
export function DetectionReview({ initialItems, onApply }: DetectionReviewProps) {
  const [items, setItems] = useState(() => [...initialItems]);
  const checkedSlugs = items.filter((item) => item.isChecked).map((item) => item.slug);
  const toggle = (slug: string, isChecked: boolean) => setItems((current) => current.map((item) => (item.slug === slug ? { ...item, isChecked } : item)));
  const isEmpty = checkedSlugs.length === 0;
  return (
    <section aria-labelledby="equipment-photo-result" className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h3 id="equipment-photo-result" className="font-semibold">{translate("equipmentDetection.resultTitle")}</h3>
      <p className="text-sm text-muted">{translate("equipmentDetection.resultHint")}</p>
      {items.map((item) => <ReviewOption key={item.slug} item={item} onToggle={(isChecked) => toggle(item.slug, isChecked)} />)}
      {isEmpty && <p id={APPLY_HINT_ID} className="text-sm font-medium text-accent-strong">{translate("equipmentDetection.applyEmpty")}</p>}
      <button type="button" disabled={isEmpty} aria-describedby={isEmpty ? APPLY_HINT_ID : undefined} onClick={() => onApply(checkedSlugs)} className={PRIMARY_BUTTON_CLASS}>
        {translate("equipmentDetection.applyButton")}
      </button>
    </section>
  );
}
