"use client";

import { useEffect, useState, type RefObject } from "react";
import { CAMERA_FACING_MODE } from "@/lib/constants/technique";
import { classifyCameraError, type CameraErrorReason } from "@/lib/technique/camera-support";

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.srcObject = stream;
  await video.play();
}

/**
 * Turns the camera on only while `isActive` (after the user's tap) and always off when it ends
 * or the screen closes (spec 014, privacy). The video never leaves the device.
 */
export function useCameraStream(videoRef: RefObject<HTMLVideoElement | null>, isActive: boolean, onError: (reason: CameraErrorReason) => void): boolean {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    let stream: MediaStream | null = null;
    let isCancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: CAMERA_FACING_MODE }, audio: false })
      .then(async (opened) => {
        stream = opened;
        if (isCancelled || !videoRef.current) return stopStream(opened);
        await attachStream(videoRef.current, opened);
        if (!isCancelled) setIsLive(true);
      })
      .catch((error: unknown) => {
        if (!isCancelled) onError(classifyCameraError(error));
      });
    return () => {
      isCancelled = true;
      if (stream) stopStream(stream);
      setIsLive(false);
    };
  }, [isActive, videoRef, onError]);

  return isActive && isLive;
}
