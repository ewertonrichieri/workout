/** Point in a space where one unit is equally long horizontally and vertically. */
export interface Point {
  x: number;
  y: number;
}

const DEGREES_PER_RADIAN = 180 / Math.PI;

/** MediaPipe x and y are shares of the image width and height; scaling x by width/height makes angles real. */
export function toAspectSpace(point: Point, aspectRatio: number): Point {
  return { x: point.x * aspectRatio, y: point.y };
}

export function distanceBetween(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

/** Angle first–vertex–second, in degrees (0–180); 0 when a segment has no length. */
export function angleAtVertex(first: Point, vertex: Point, second: Point): number {
  const firstLength = distanceBetween(vertex, first);
  const secondLength = distanceBetween(vertex, second);
  if (firstLength === 0 || secondLength === 0) return 0;
  const dot = (first.x - vertex.x) * (second.x - vertex.x) + (first.y - vertex.y) * (second.y - vertex.y);
  const cosine = Math.min(1, Math.max(-1, dot / (firstLength * secondLength)));
  return Math.acos(cosine) * DEGREES_PER_RADIAN;
}

/** Lean of the segment lower → upper from the vertical, in degrees (image y grows downwards). */
export function angleFromVertical(lower: Point, upper: Point): number {
  return Math.atan2(Math.abs(upper.x - lower.x), lower.y - upper.y) * DEGREES_PER_RADIAN;
}

/** How far `upper` is above `lower`, from the horizontal (−90 to 90); negative when it is below. */
export function elevationAngle(upper: Point, lower: Point): number {
  return Math.atan2(lower.y - upper.y, Math.abs(lower.x - upper.x)) * DEGREES_PER_RADIAN;
}
