/** Center piece is full size. Edges fall off like a spherical lens. */
export const MIN_SCALE = 0.46;
const RUBBER_LIMIT = 160;

export const easeOut = unitBezier(0.23, 1, 0.32, 1);
export const easeInOut = unitBezier(0.77, 0, 0.175, 1);

export function cellSize(viewportMin: number): number {
  return Math.round(Math.min(168, Math.max(112, viewportMin * 0.22)));
}

export function gridPitch(cell: number): number {
  return cell + 16;
}

export function gridShape(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(count, 1))));
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / cols));
  return { cols, rows };
}

export function heroIndex(count: number): number {
  if (count <= 1) {
    return 0;
  }
  const { cols, rows } = gridShape(count);
  const row = Math.floor((rows - 1) / 2);
  const col = Math.floor((cols - 1) / 2);
  return Math.min(count - 1, row * cols + col);
}

export function indexAt(
  col: number,
  row: number,
  cols: number,
  count: number,
): number | null {
  if (col < 0 || row < 0 || col >= cols) {
    return null;
  }
  const index = row * cols + col;
  if (index < 0 || index >= count) {
    return null;
  }
  return index;
}

export function neighborIndex(
  index: number,
  dCol: number,
  dRow: number,
  cols: number,
  count: number,
): number {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return indexAt(col + dCol, row + dRow, cols, count) ?? index;
}

export function worldPoint(
  index: number,
  cols: number,
  pitch: number,
): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * pitch, y: row * pitch };
}

export function cameraBounds(count: number, cell: number): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cols: number;
  rows: number;
  pitch: number;
} {
  const { cols, rows } = gridShape(count);
  const pitch = gridPitch(cell);
  return {
    minX: 0,
    maxX: Math.max(0, cols - 1) * pitch,
    minY: 0,
    maxY: Math.max(0, rows - 1) * pitch,
    cols,
    rows,
    pitch,
  };
}

export function lensSigma(viewportMin: number, cell: number): number {
  const screenEdge = Math.max(cell, viewportMin * 0.46);
  const approximateWorld = screenEdge / 0.7;
  return Math.max(cell * 2.2, approximateWorld / 1.15);
}

export function scaleAt(dist: number, sigma: number, reduced: boolean): number {
  if (reduced) {
    return 1;
  }
  const t = dist / Math.max(sigma, 1);
  return MIN_SCALE + (1 - MIN_SCALE) * Math.exp(-t * t);
}

export function lensOpacity(scale: number, reduced: boolean): number {
  if (reduced) {
    return 1;
  }
  const t = (scale - MIN_SCALE) / (1 - MIN_SCALE);
  return 0.74 + 0.26 * Math.min(1, Math.max(0, t));
}

/** Screen radius for a world radius. Derivative at 0 is 1, so the center tracks a finger. */
export function integrateScale(dist: number, sigma: number, reduced: boolean): number {
  if (reduced || dist <= 0) {
    return Math.max(0, dist);
  }
  const safeSigma = Math.max(sigma, 1);
  const amp = 1 - MIN_SCALE;
  return (
    MIN_SCALE * dist +
    amp * safeSigma * Math.sqrt(Math.PI) * 0.5 * erf(dist / safeSigma)
  );
}

export function invertRadius(screenR: number, sigma: number, reduced: boolean): number {
  if (reduced || screenR <= 0) {
    return Math.max(0, screenR);
  }
  let lo = 0;
  let hi = Math.max(screenR / MIN_SCALE, screenR + sigma);
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    if (integrateScale(mid, sigma, false) < screenR) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

export function placeItem(
  dx: number,
  dy: number,
  sigma: number,
  reduced: boolean,
): { x: number; y: number; scale: number; opacity: number } {
  const dist = Math.hypot(dx, dy);
  const scale = scaleAt(dist, sigma, reduced);
  const opacity = lensOpacity(scale, reduced);
  if (dist < 0.001) {
    return { x: 0, y: 0, scale, opacity };
  }
  const screenR = integrateScale(dist, sigma, reduced);
  const gain = screenR / dist;
  return { x: dx * gain, y: dy * gain, scale, opacity };
}

export function nearestIndex(
  x: number,
  y: number,
  cols: number,
  rows: number,
  count: number,
  pitch: number,
): number {
  const col = clamp(Math.round(x / pitch), 0, cols - 1);
  const row = clamp(Math.round(y / pitch), 0, rows - 1);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      const index = indexAt(c, r, cols, count);
      if (index == null) {
        continue;
      }
      const dx = c * pitch - x;
      const dy = r * pitch - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
  }
  return best;
}

export function applyRubber(value: number, min: number, max: number): number {
  if (value < min) {
    return min - rubberPull(min - value);
  }
  if (value > max) {
    return max + rubberPull(value - max);
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pieceCaption(index: number, count: number): string {
  return `${(index + 1).toLocaleString("en-US")} of ${count.toLocaleString("en-US")}`;
}

function rubberPull(over: number): number {
  return (over * 0.32 * RUBBER_LIMIT) / (over + RUBBER_LIMIT);
}

function erf(x: number): number {
  const sign = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
}

function cubic(t: number, a: number, b: number): number {
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return ((e * t + d) * t + c) * t;
}

function cubicDerivative(t: number, a: number, b: number): number {
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return (3 * e * t + 2 * d) * t + c;
}

function unitBezier(x1: number, y1: number, x2: number, y2: number) {
  return (amount: number) => {
    if (amount <= 0) {
      return 0;
    }
    if (amount >= 1) {
      return 1;
    }
    let u = amount;
    for (let i = 0; i < 8; i += 1) {
      const error = cubic(u, x1, x2) - amount;
      const slope = cubicDerivative(u, x1, x2);
      if (Math.abs(slope) < 1e-5) {
        break;
      }
      u = Math.min(1, Math.max(0, u - error / slope));
    }
    return cubic(u, y1, y2);
  };
}
