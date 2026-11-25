import { describe, expect, it } from "vitest";
import { classifyCameraError, hasCameraSupport } from "./camera-support";

describe("hasCameraSupport", () => {
  it("needs getUserMedia", () => {
    expect(hasCameraSupport({ mediaDevices: { getUserMedia: () => Promise.resolve() } })).toBe(true);
    expect(hasCameraSupport({ mediaDevices: undefined })).toBe(false);
    expect(hasCameraSupport({})).toBe(false);
    expect(hasCameraSupport(undefined)).toBe(false);
  });
});

describe("classifyCameraError", () => {
  function domError(name: string): DOMException {
    return new DOMException("fictional", name);
  }

  it("maps browser errors to the reasons shown to the user", () => {
    expect(classifyCameraError(domError("NotAllowedError"))).toBe("permission_denied");
    expect(classifyCameraError(domError("SecurityError"))).toBe("permission_denied");
    expect(classifyCameraError(domError("NotFoundError"))).toBe("no_camera");
    expect(classifyCameraError(domError("OverconstrainedError"))).toBe("no_camera");
    expect(classifyCameraError(domError("NotReadableError"))).toBe("camera_busy");
  });

  it("falls back to unavailable for anything else", () => {
    expect(classifyCameraError(domError("AbortError"))).toBe("unavailable");
    expect(classifyCameraError(new Error("boom"))).toBe("unavailable");
    expect(classifyCameraError("text")).toBe("unavailable");
  });
});
