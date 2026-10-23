import type { InkPoint } from "./types";

export type PickBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function distanceToSegment(point: InkPoint, start: InkPoint, end: InkPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (length === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function pointHitsStroke(points: InkPoint[], point: InkPoint, slop: number): boolean {
  if (points.length === 0) {
    return false;
  }
  if (points.length === 1) {
    return Math.hypot(points[0].x - point.x, points[0].y - point.y) <= slop;
  }
  for (let index = 1; index < points.length; index += 1) {
    if (distanceToSegment(point, points[index - 1], points[index]) <= slop) {
      return true;
    }
  }
  return false;
}

function pointInBox(point: InkPoint, box: PickBox): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.w &&
    point.y >= box.y &&
    point.y <= box.y + box.h
  );
}

function segmentHitsBox(start: InkPoint, end: InkPoint, box: PickBox): boolean {
  if (pointInBox(start, box) || pointInBox(end, box)) {
    return true;
  }
  const right = box.x + box.w;
  const bottom = box.y + box.h;
  const edges: Array<[InkPoint, InkPoint]> = [
    [
      { x: box.x, y: box.y },
      { x: right, y: box.y },
    ],
    [
      { x: right, y: box.y },
      { x: right, y: bottom },
    ],
    [
      { x: right, y: bottom },
      { x: box.x, y: bottom },
    ],
    [
      { x: box.x, y: bottom },
      { x: box.x, y: box.y },
    ],
  ];
  return edges.some((edge) => segmentsCross(start, end, edge[0], edge[1]));
}

function segmentsCross(a: InkPoint, b: InkPoint, c: InkPoint, d: InkPoint): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const adx = d.x - a.x;
  const ady = d.y - a.y;
  const cdx = d.x - c.x;
  const cdy = d.y - c.y;
  const cax = a.x - c.x;
  const cay = a.y - c.y;
  const cbx = b.x - c.x;
  const cby = b.y - c.y;
  const ab = abx * acy - aby * acx;
  const ab2 = abx * ady - aby * adx;
  const cd = cdx * cay - cdy * cax;
  const cd2 = cdx * cby - cdy * cbx;
  return ab * ab2 < 0 && cd * cd2 < 0;
}

export function boxHitsStroke(points: InkPoint[], box: PickBox): boolean {
  if (points.length === 0 || box.w < 0 || box.h < 0) {
    return false;
  }
  if (points.length === 1) {
    return pointInBox(points[0], box);
  }
  for (let index = 1; index < points.length; index += 1) {
    if (segmentHitsBox(points[index - 1], points[index], box)) {
      return true;
    }
  }
  return false;
}

export function normalizeBox(start: InkPoint, end: InkPoint): PickBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}
