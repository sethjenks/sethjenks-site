import { clamp, encodeTones, plateRows } from "./math";
import type { PlateImageLike } from "./types";

export type PlateCoverTransform = {
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  zoom?: number;
};

function normalizedRotation(
  rotationDeg: number | undefined,
): 0 | 90 | 180 | 270 {
  return rotationDeg === 90 || rotationDeg === 180 || rotationDeg === 270
    ? rotationDeg
    : 0;
}

function sourceSize(image: PlateImageLike): { height: number; width: number } {
  if ("naturalWidth" in image && image.naturalWidth) {
    return {
      height: Math.max(1, image.naturalHeight || 1),
      width: Math.max(1, image.naturalWidth),
    };
  }

  return {
    height: Math.max(1, image.height || 1),
    width: Math.max(1, image.width || 1),
  };
}

export function drawCover(
  context: CanvasRenderingContext2D,
  image: PlateImageLike,
  width: number,
  height: number,
  transform: PlateCoverTransform | undefined,
): void {
  const rotation = normalizedRotation(transform?.rotationDeg);
  const swapsAxes = rotation === 90 || rotation === 270;
  const { height: imageHeight, width: imageWidth } = sourceSize(image);
  const orientedWidth = swapsAxes ? imageHeight : imageWidth;
  const orientedHeight = swapsAxes ? imageWidth : imageHeight;
  const zoom = clamp(transform?.zoom ?? 1, 1, 3);
  const scale =
    Math.max(width / orientedWidth, height / orientedHeight) * zoom;
  const extraX = Math.max(0, orientedWidth * scale - width) / 2;
  const extraY = Math.max(0, orientedHeight * scale - height) / 2;
  const shiftX = clamp(transform?.offsetX ?? 0, -1, 1) * extraX;
  const shiftY = clamp(transform?.offsetY ?? 0, -1, 1) * extraY;

  context.save();
  context.translate(width / 2 + shiftX, height / 2 + shiftY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(
    transform?.flipHorizontal ? -1 : 1,
    transform?.flipVertical ? -1 : 1,
  );
  context.drawImage(
    image,
    (-imageWidth * scale) / 2,
    (-imageHeight * scale) / 2,
    imageWidth * scale,
    imageHeight * scale,
  );
  context.restore();
}

export function sampleToneField({
  columns,
  contrast,
  height,
  image,
  invert,
  transform,
  width,
}: {
  columns: number;
  contrast: number;
  height: number;
  image: PlateImageLike;
  invert: boolean;
  transform?: PlateCoverTransform;
  width: number;
}): { rows: number; tones: Uint8Array } {
  const rows = plateRows(width, height, columns);
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  const sampleContext = sampleCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!sampleContext) {
    throw new Error("ASCII sampling requires a 2D canvas context.");
  }

  drawCover(sampleContext, image, columns, rows, transform);
  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
  const tones = new Uint8Array(columns * rows);

  for (let index = 0; index < tones.length; index += 1) {
    const pixelIndex = index * 4;
    const alpha = pixels[pixelIndex + 3] / 255;
    const luminance =
      ((pixels[pixelIndex] * 0.2126 +
        pixels[pixelIndex + 1] * 0.7152 +
        pixels[pixelIndex + 2] * 0.0722) /
        255) *
      alpha;
    let tone = clamp((luminance - 0.5) * contrast + 0.5, 0, 1);
    if (invert) tone = 1 - tone;
    tones[index] = Math.round(tone * 255);
  }

  return { rows, tones };
}

export function encodeToneField(tones: Uint8Array): string {
  return encodeTones(tones);
}
