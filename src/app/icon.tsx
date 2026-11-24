import { ImageResponse } from "next/og";
import { AppIconDrawing } from "@/components/layout/app-icon-drawing";
import { APP_ICONS, ICON_DRAWING_SCALE, MASKABLE_ICON_SCALE } from "@/lib/constants/app";

export const contentType = "image/png";

/** One generated PNG per manifest icon (/icon/192, /icon/512, /icon/maskable). */
export function generateImageMetadata() {
  return APP_ICONS.map((icon) => ({ id: icon.id, size: { width: icon.size, height: icon.size }, contentType }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = String(await id);
  const icon = APP_ICONS.find((candidate) => candidate.id === iconId) ?? APP_ICONS[0];
  const scale = icon.purpose === "maskable" ? MASKABLE_ICON_SCALE : ICON_DRAWING_SCALE;
  return new ImageResponse(<AppIconDrawing size={icon.size} scale={scale} />, { width: icon.size, height: icon.size });
}
