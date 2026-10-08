export const PLATE_VERSION = 1 as const;

export const PLATE_MARK_KINDS = [
  "tick",
  "slash",
  "wedge",
  "ring",
  "block",
  "fleck",
  "smear",
] as const;

export type PlateMarkKind = (typeof PLATE_MARK_KINDS)[number];

export type PlateMarks = {
  edges: number;
  enabled: readonly PlateMarkKind[];
  flecks: number;
  mix: number;
  size: number;
  smears: number;
};

export type PlateFrame = {
  x: number;
  y: number;
  zoom: number;
};

export type PlateField = {
  detail: number;
  tilt: number;
  wave: number;
};

export type PlateMotion = {
  amount: number;
};

export type PlateRecipe = {
  background: string;
  characters: string;
  columns: number;
  contrast: number;
  field: PlateField;
  height: number;
  ink: string;
  inks: readonly string[];
  invert: boolean;
  marks: PlateMarks;
  motion: PlateMotion;
  rows: number;
  seed: number;
  tones: string;
  version: typeof PLATE_VERSION;
  width: number;
};

export type PlatePointer = {
  x: number;
  y: number;
};

export type PlatePaintView = {
  fontFamily?: string;
  pointer?: PlatePointer;
  progress: number;
};

export type PlateImageLike =
  | HTMLCanvasElement
  | HTMLImageElement
  | ImageBitmap
  | OffscreenCanvas;
