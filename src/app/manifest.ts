import type { MetadataRoute } from "next";
import { APP_BACKGROUND_COLOR, APP_ICONS, APP_LANGUAGE, APP_THEME_COLOR } from "@/lib/constants/app";
import { APP_ROUTES } from "@/lib/constants/routes";
import { translate } from "@/lib/i18n/translate";

/** Web app manifest (step 3.8): Next.js serves it at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: translate("app.name"),
    short_name: translate("app.name"),
    description: translate("app.description"),
    start_url: APP_ROUTES.home,
    display: "standalone",
    lang: APP_LANGUAGE,
    background_color: APP_BACKGROUND_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: APP_ICONS.map((icon) => ({ src: `/icon/${icon.id}`, sizes: `${icon.size}x${icon.size}`, type: "image/png", purpose: icon.purpose })),
  };
}
