"use client";

import type { BentoGesture } from "@/components/bento/gesture";

export const MATRIX_QUADS = [
  {
    name: "Temporary Edge",
    line: "Useful today. Don't build the strategy on it.",
  },
  {
    name: "Durable Advantage",
    line: "This is the moat worth defending.",
  },
  {
    name: "Commodity",
    line: "Necessary plumbing. Spend zero strategy attention here.",
  },
  {
    name: "Table Stakes",
    line: "Required to operate, not a differentiator.",
  },
] as const;

export function matrixIndex(point: { x: number; y: number }) {
  const column = point.x >= 0.5 ? 1 : 0;
  const row = point.y >= 0.5 ? 1 : 0;
  return row * 2 + column;
}

export function SpotlightStage({ gesture }: { gesture: BentoGesture }) {
  const lit = gesture.reduced
    ? -1
    : gesture.hover
      ? matrixIndex(gesture.point)
      : gesture.latched
        ? matrixIndex(gesture.pin)
        : -1;

  return (
    <div className="matrix-board">
      {MATRIX_QUADS.map((quad, index) => (
        <div key={quad.name} className="matrix-quad" data-lit={lit === index ? "" : undefined} data-dim={lit >= 0 && lit !== index ? "" : undefined}>
          <span>{quad.name}</span>
        </div>
      ))}
    </div>
  );
}
