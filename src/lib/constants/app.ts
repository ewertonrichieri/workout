/** Installable app (step 3.8): theme colors from globals.css (--background, --accent). */
export const APP_BACKGROUND_COLOR = "#12120e";
export const APP_THEME_COLOR = "#6b690c";
export const APP_ICON_FOREGROUND_COLOR = "#f3f3ea";
export const APP_LANGUAGE = "pt-BR";

/** Generated icons (src/app/icon.tsx); ids become /icon/<id>. */
export const APP_ICONS = [
  { id: "192", size: 192, purpose: "any" },
  { id: "512", size: 512, purpose: "any" },
  { id: "maskable", size: 512, purpose: "maskable" },
] as const;
export const APPLE_ICON_SIZE = 180;
/** Maskable icons keep the drawing inside the central safe zone (80%). */
export const MASKABLE_ICON_SCALE = 0.6;
export const ICON_DRAWING_SCALE = 0.8;
