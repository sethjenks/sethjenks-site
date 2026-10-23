import { highestPoint, inkPath, resample, strokeCenter } from "./ink";
import type { InkPoint, InkStroke, MonsterDrawing, VisualStroke } from "./types";

const INK = "#1d1d1d";

export type RawStroke = {
  id: string;
  points: InkPoint[];
  width: number;
  closed: boolean;
};

export function composeDrawing(strokes: RawStroke[]): MonsterDrawing | null {
  const usable = strokes.filter((stroke) => stroke.points.length > 0);
  if (usable.length === 0) {
    return null;
  }

  const screenPoints = new Map<string, InkPoint[]>();
  const pageStrokes: InkStroke[] = [];
  let screenWidth = 2;

  for (const stroke of usable) {
    const sampled = resample(stroke.points, 80);
    screenPoints.set(stroke.id, sampled);
    screenWidth = Math.max(screenWidth, stroke.width);
    pageStrokes.push({
      id: stroke.id,
      points: sampled,
      width: stroke.width,
      color: INK,
      closed: stroke.closed,
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let pageMinX = Infinity;
  let pageMinY = Infinity;
  for (const points of screenPoints.values()) {
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      pageMinX = Math.min(pageMinX, point.x);
      pageMinY = Math.min(pageMinY, point.y);
    }
  }

  const pad = screenWidth / 2 + 2;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const normalized = pageStrokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      x: point.x - pageMinX,
      y: point.y - pageMinY,
    })),
  }));

  const visual: VisualStroke[] = normalized.map((stroke) => {
    const points = (screenPoints.get(stroke.id) ?? []).map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    }));
    const hip = highestPoint(points);
    const center = strokeCenter(points);
    const dot = points.length < 2 ? (points[0] ?? { x: 0, y: 0 }) : null;
    return {
      id: stroke.id,
      d: inkPath(points),
      width: stroke.width,
      color: INK,
      hipX: hip.x,
      hipY: hip.y,
      cx: center.x,
      cy: center.y,
      dot,
    };
  });

  return {
    strokes: normalized,
    visual,
    screenBox: {
      x: minX,
      y: minY,
      w: Math.max(8, maxX - minX),
      h: Math.max(8, maxY - minY),
    },
    shapeIds: usable.map((stroke) => stroke.id),
  };
}
