import type { InkPoint } from "./types";

export function pathLength(points: InkPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  return length;
}

export function resample(points: InkPoint[], max: number): InkPoint[] {
  if (points.length <= max) {
    return points;
  }
  const next: InkPoint[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let index = 0; index < max; index += 1) {
    next.push(points[Math.round(index * step)]);
  }
  return next;
}

export function inkPath(points: InkPoint[]): string {
  if (points.length < 2) {
    return "";
  }
  const format = (value: number) => (Math.round(value * 10) / 10).toString();
  let path = `M ${format(points[0].x)} ${format(points[0].y)}`;
  if (points.length === 2) {
    path += ` L ${format(points[1].x)} ${format(points[1].y)}`;
    return path;
  }
  for (let index = 1; index < points.length - 1; index += 1) {
    const midX = (points[index].x + points[index + 1].x) / 2;
    const midY = (points[index].y + points[index + 1].y) / 2;
    path += ` Q ${format(points[index].x)} ${format(points[index].y)} ${format(midX)} ${format(midY)}`;
  }
  const last = points[points.length - 1];
  path += ` L ${format(last.x)} ${format(last.y)}`;
  return path;
}

export function strokeCenter(points: InkPoint[]): { x: number; y: number } {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function highestPoint(points: InkPoint[]): { x: number; y: number } {
  let best = points[0] ?? { x: 0, y: 0 };
  for (const point of points) {
    if (point.y < best.y) {
      best = point;
    }
  }
  return best;
}
