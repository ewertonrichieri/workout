import type { PoseLandmark } from "@/lib/technique/body-framing";
import { isLandmarkSeen } from "@/lib/technique/body-framing";
import { SKELETON_CONNECTIONS } from "@/lib/technique/pose-landmarks";

const BONE_WIDTH_PX = 4;
const JOINT_RADIUS_PX = 5;
const FULL_CIRCLE = Math.PI * 2;

export interface OverlayColors {
  bone: string;
  joint: string;
}

function drawBones(context: CanvasRenderingContext2D, landmarks: readonly PoseLandmark[], colors: OverlayColors): void {
  const { width, height } = context.canvas;
  context.strokeStyle = colors.bone;
  context.lineWidth = BONE_WIDTH_PX;
  for (const [fromIndex, toIndex] of SKELETON_CONNECTIONS) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    if (!from || !to || !isLandmarkSeen(from) || !isLandmarkSeen(to)) continue;
    context.beginPath();
    context.moveTo(from.x * width, from.y * height);
    context.lineTo(to.x * width, to.y * height);
    context.stroke();
  }
}

function drawJoints(context: CanvasRenderingContext2D, landmarks: readonly PoseLandmark[], colors: OverlayColors): void {
  const { width, height } = context.canvas;
  context.fillStyle = colors.joint;
  for (const landmark of landmarks) {
    if (!isLandmarkSeen(landmark)) continue;
    context.beginPath();
    context.arc(landmark.x * width, landmark.y * height, JOINT_RADIUS_PX, 0, FULL_CIRCLE);
    context.fill();
  }
}

/** Draws only the landmarks the camera really saw (nothing is guessed). */
export function drawPoseOverlay(context: CanvasRenderingContext2D, landmarks: readonly PoseLandmark[], colors: OverlayColors): void {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  drawBones(context, landmarks, colors);
  drawJoints(context, landmarks, colors);
}
