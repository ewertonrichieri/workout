import { SECONDARY_BUTTON_CLASS } from "@/components/readiness/readiness-styles";
import { translate } from "@/lib/i18n/translate";

interface SoundToggleProps {
  isSupported: boolean;
  isEnabled: boolean;
  onToggle: () => void;
}

/** Turns the spoken cues on and off (D7); without browser speech the cues appear only on screen. */
export function SoundToggle({ isSupported, isEnabled, onToggle }: SoundToggleProps) {
  if (!isSupported) return <p className="text-sm text-muted">{translate("technique.sound.unsupported")}</p>;
  return (
    <button type="button" aria-pressed={isEnabled} onClick={onToggle} className={`${SECONDARY_BUTTON_CLASS} self-start`}>
      {translate(isEnabled ? "technique.sound.on" : "technique.sound.off")}
    </button>
  );
}
