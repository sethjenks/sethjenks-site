import type { Layout } from "./types";

export const FRAME_WIDTH = 1200;
export const FRAME_HEIGHT = 630;
export const CAPTURE_WIDTH = 2400;
export const CAPTURE_HEIGHT = 1260;

/** At most 2400×1260 and within 1% of 1200:630. */
export function fitsFrame(width: number, height: number): boolean {
  if (width < 1 || height < 1) return false;
  if (width > CAPTURE_WIDTH || height > CAPTURE_HEIGHT) return false;
  const ratio = width / height;
  const target = FRAME_WIDTH / FRAME_HEIGHT;
  return Math.abs(ratio - target) / target <= 0.01;
}

export type SaveMethodName = "capture" | "source-bytes" | "source-redraw";

export function saveMethod(input: {
  width: number;
  height: number;
  zoom?: number;
  sheet: boolean;
  layout: Layout;
  png: boolean;
}): SaveMethodName {
  const zoom = input.zoom ?? 1;
  if (
    input.layout === "image-only" &&
    !input.sheet &&
    zoom === 1 &&
    fitsFrame(input.width, input.height)
  ) {
    return input.png ? "source-bytes" : "source-redraw";
  }
  return "capture";
}
