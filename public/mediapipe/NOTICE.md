# MediaPipe (spec 014, decisões D1 e D2)

- `models/pose_landmarker_lite.task` — MediaPipe Pose Landmarker "lite" (float16, versão 1), baixado de
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`
  em 2026-11-25. SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`. Licença Apache 2.0 (Google).
- `wasm/` — copiado de `@mediapipe/tasks-vision` (versão fixa no `package.json`, Apache 2.0) por `scripts/copy-pose-assets.ts`
  antes de `npm run dev` e `npm run build`; não é versionado.
