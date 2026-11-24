import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("makes the app installable in standalone mode with theme colors and icons", () => {
    const result = manifest();
    expect(result).toMatchObject({ name: "Workout", start_url: "/", display: "standalone", lang: "pt-BR", background_color: "#12120e", theme_color: "#6b690c" });
    expect(result.icons?.map((icon) => [icon.src, icon.sizes, icon.purpose])).toEqual([
      ["/icon/192", "192x192", "any"],
      ["/icon/512", "512x512", "any"],
      ["/icon/maskable", "512x512", "maskable"],
    ]);
  });
});
