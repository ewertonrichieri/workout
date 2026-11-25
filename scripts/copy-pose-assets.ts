// Copies the MediaPipe WASM runtime from node_modules to public/ so the app serves it itself (spec 014, D2).
// Runs before `dev` and `build`; the copied files are not versioned (they come from the pinned npm package).
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createLogger } from "../src/lib/logger/logger";

const SOURCE_DIRECTORY = join(process.cwd(), "node_modules", "@mediapipe", "tasks-vision", "wasm");
const TARGET_DIRECTORY = join(process.cwd(), "public", "mediapipe", "wasm");
/** FilesetResolver.forVisionTasks loads these two files when ES modules are off (its default). */
const WASM_FILES = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"] as const;

const logger = createLogger({ minimumLevel: "info" });

async function main(): Promise<void> {
  await mkdir(TARGET_DIRECTORY, { recursive: true });
  await Promise.all(WASM_FILES.map((file) => copyFile(join(SOURCE_DIRECTORY, file), join(TARGET_DIRECTORY, file))));
  logger.info("pose assets copied", { files: WASM_FILES.length });
}

main().catch((error: unknown) => {
  logger.error("pose assets copy failed", { error: error instanceof Error ? error.message : "unknown" });
  process.exitCode = 1;
});
