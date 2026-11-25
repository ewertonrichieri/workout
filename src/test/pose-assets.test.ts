import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POSE_MODEL_PATH } from "@/lib/constants/technique";

/** Recorded in public/mediapipe/NOTICE.md (spec 014, decision D2). */
const POSE_MODEL_SHA256 = "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";

describe("pose model served by the app (D2)", () => {
  it("is the pinned MediaPipe Pose Landmarker lite file", async () => {
    const model = await readFile(join(process.cwd(), "public", POSE_MODEL_PATH));
    expect(createHash("sha256").update(model).digest("hex")).toBe(POSE_MODEL_SHA256);
  });
});
