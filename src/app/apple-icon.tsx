import { ImageResponse } from "next/og";
import { AppIconDrawing } from "@/components/layout/app-icon-drawing";
import { APPLE_ICON_SIZE, MASKABLE_ICON_SCALE } from "@/lib/constants/app";

export const size = { width: APPLE_ICON_SIZE, height: APPLE_ICON_SIZE };
export const contentType = "image/png";

/** iOS home screen icon; iOS rounds the corners, so the drawing keeps a margin. */
export default function AppleIcon() {
  return new ImageResponse(<AppIconDrawing size={APPLE_ICON_SIZE} scale={MASKABLE_ICON_SCALE} />, size);
}
