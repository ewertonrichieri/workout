import { APP_ICON_FOREGROUND_COLOR, APP_THEME_COLOR } from "@/lib/constants/app";

/** Proportions of the dumbbell drawing (fractions of the drawing size). */
const PLATE = { width: 0.18, height: 0.62 };
const BAR = { width: 0.5, height: 0.12 };

/** App icon for ImageResponse: a dumbbell on the theme color; `scale` shrinks it (maskable safe zone). */
export function AppIconDrawing({ size, scale }: { size: number; scale: number }) {
  const drawing = size * scale;
  const plate = { width: drawing * PLATE.width, height: drawing * PLATE.height, background: APP_ICON_FOREGROUND_COLOR, borderRadius: drawing * 0.04 };
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: APP_THEME_COLOR }}>
      <div style={plate} />
      <div style={{ width: drawing * BAR.width, height: drawing * BAR.height, background: APP_ICON_FOREGROUND_COLOR }} />
      <div style={plate} />
    </div>
  );
}
