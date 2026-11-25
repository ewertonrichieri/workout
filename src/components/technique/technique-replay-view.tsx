"use client";

import { useEffect, useRef } from "react";
import { findFrameAt, findMarkerAt, type ReplayMarker, type TechniqueReplay } from "@/lib/technique/replay";
import { translate } from "@/lib/i18n/translate";
import { drawPoseOverlay, type OverlayColors } from "./pose-overlay";

const MS_PER_SECOND = 1000;
/** Seeking lands a little inside the rep, so its color (red or not) shows right away. */
const JUMP_INTO_REP_SECONDS = 0.1;

interface ReplayColors {
  normal: OverlayColors;
  correction: OverlayColors;
}

function readReplayColors(): ReplayColors {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return { normal: { bone: read("--accent-strong"), joint: read("--foreground") }, correction: { bone: read("--danger"), joint: read("--danger") } };
}

function drawAtCurrentTime(video: HTMLVideoElement, canvas: HTMLCanvasElement, replay: TechniqueReplay, markers: readonly ReplayMarker[], colors: ReplayColors): void {
  const context = canvas.getContext("2d");
  if (!context || video.videoWidth === 0) return;
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  const frame = findFrameAt(replay.frames, video.currentTime * MS_PER_SECOND);
  const marker = findMarkerAt(markers, video.currentTime);
  drawPoseOverlay(context, frame?.landmarks ?? [], marker?.needsCorrection ? colors.correction : colors.normal);
}

/** Plays the in-memory video with the skeleton; the URL is revoked when the summary closes (privacy). */
function useReplayPlayback(replay: TechniqueReplay, markers: readonly ReplayMarker[]) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const url = URL.createObjectURL(replay.video);
    video.src = url;
    const colors = readReplayColors();
    let frameRequest = 0;
    const draw = () => {
      drawAtCurrentTime(video, canvas, replay, markers, colors);
      if (!video.paused && !video.ended) frameRequest = requestAnimationFrame(draw);
    };
    const events = ["loadeddata", "play", "seeked", "pause"] as const;
    events.forEach((name) => video.addEventListener(name, draw));
    return () => {
      cancelAnimationFrame(frameRequest);
      events.forEach((name) => video.removeEventListener(name, draw));
      video.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [replay, markers]);
  return { videoRef, canvasRef };
}

function RepJumpButtons({ markers, onJump }: { markers: readonly ReplayMarker[]; onJump: (seconds: number) => void }) {
  return (
    <nav aria-label={translate("technique.replay.jumpLabel")} className="flex flex-wrap gap-2">
      {markers.map((marker) => (
        <button
          key={marker.repNumber}
          type="button"
          onClick={() => onJump(marker.startSeconds + JUMP_INTO_REP_SECONDS)}
          aria-label={translate(marker.needsCorrection ? "technique.replay.goToRepWithCorrection" : "technique.replay.goToRep", { number: marker.repNumber })}
          className={`min-h-11 min-w-11 rounded-lg border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${marker.needsCorrection ? "border-danger text-danger" : "border-border"}`}
        >
          {translate("technique.analysis.ordinal", { number: marker.repNumber })}
        </button>
      ))}
    </nav>
  );
}

/** Replay of the set with the skeleton (not mirrored, like a saved video); reps with something to fix in red (step 5.4). */
export function TechniqueReplayView({ replay, markers }: { replay: TechniqueReplay; markers: readonly ReplayMarker[] }) {
  const { videoRef, canvasRef } = useReplayPlayback(replay, markers);
  const jumpTo = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, seconds);
  };
  return (
    <section aria-labelledby="technique-replay-title" className="flex flex-col gap-2">
      <h3 id="technique-replay-title" className="text-lg font-semibold">{translate("technique.replay.title")}</h3>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
        <video ref={videoRef} controls muted playsInline aria-label={translate("technique.replay.videoLabel")} className="block h-auto w-full" />
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <p className="text-sm text-muted">{translate("technique.replay.legend")}</p>
      <RepJumpButtons markers={markers} onJump={jumpTo} />
    </section>
  );
}
