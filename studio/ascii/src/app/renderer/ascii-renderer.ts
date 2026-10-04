import {
  createPlateRecipe,
  PLATE_MARK_KINDS,
  paintPlate,
  type PlateFrame,
  type PlateMarkKind,
  type PlateRecipe,
} from "@ascii-plate";
import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime";

const CHARACTER_RAMPS: Record<string, string> = {
  blocks: "█▓▒░ ",
  dense: "@%#*+=-:. ",
  journal: "MWNXK0Okxdolc:,. ",
  minimal: "#*:. ",
};

export type AsciiRenderSettings = {
  background: string;
  characters: string;
  columns: number;
  contrast: number;
  field: { detail: number; tilt: number; wave: number };
  frame: PlateFrame;
  includeBackground: boolean;
  ink: string;
  inks: readonly string[];
  invert: boolean;
  marks: {
    edges: number;
    enabled: readonly PlateMarkKind[];
    flecks: number;
    mix: number;
    size: number;
    smears: number;
  };
  motion: { amount: number };
  seed: number;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function asHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;
    if (typeof hex === "string" && hex.length > 0) return hex;
  }
  return fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function unit(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readInks(value: unknown): string[] {
  if (Array.isArray(value)) {
    const inks = value
      .map((item) => asHex(item, ""))
      .filter((item) => item.length > 0);
    if (inks.length > 0) return inks;
  }
  return ["#111111"];
}

function readEnabledMarks(values: Record<string, unknown>): PlateMarkKind[] {
  const enabled = PLATE_MARK_KINDS.filter(
    (kind) => values[`marks.${kind}`] !== false,
  );
  return enabled.length > 0 ? enabled : ["tick"];
}

function readFrame(values: Record<string, unknown>): PlateFrame {
  const offset = isRecord(values["frame.offset"]) ? values["frame.offset"] : {};
  return {
    x: clamp(Number(offset.x) || 0, -1, 1),
    y: clamp(Number(offset.y) || 0, -1, 1),
    zoom: clamp(Number(values["frame.zoom"] ?? 1) || 1, 1, 3),
  };
}

export function getAsciiSourceAsset(
  state: ToolcraftState,
): ToolcraftMediaAsset | undefined {
  return state.mediaAssets.find(
    (asset) =>
      asset.sourceTarget === "source.image" &&
      (asset.assetKind ?? "image") === "image",
  );
}

export function readAsciiRenderSettings(
  state: ToolcraftState,
): AsciiRenderSettings {
  const preset = String(state.values["ascii.preset"] ?? "journal");
  const customCharacters = String(
    state.values["ascii.characters"] ?? "@%#*+=-:. ",
  );
  const characters =
    preset === "custom"
      ? customCharacters.trimEnd() || "@ "
      : CHARACTER_RAMPS[preset] ?? CHARACTER_RAMPS.journal;

  return {
    background: asHex(state.values["appearance.background"], "#FAFAFA"),
    characters,
    columns: clamp(Number(state.values["ascii.columns"] ?? 120), 40, 220),
    contrast: clamp(Number(state.values["ascii.contrast"] ?? 1.25), 0.5, 2.5),
    field: {
      detail: unit(state.values["field.detail"], 0.5),
      tilt: unit(state.values["field.tilt"], 0.2),
      wave: unit(state.values["field.wave"], 0.45),
    },
    frame: readFrame(state.values),
    includeBackground: state.values["export.includeBackground"] !== false,
    ink: readInks(state.values["appearance.inks"])[0] ?? "#111111",
    inks: readInks(state.values["appearance.inks"]),
    invert: state.values["ascii.invert"] === true,
    marks: {
      edges: unit(state.values["marks.edges"], 0.55),
      enabled: readEnabledMarks(state.values),
      flecks: unit(state.values["marks.flecks"], 0.08),
      mix: unit(state.values["marks.mix"], 0.4),
      size: unit(state.values["marks.weight"], 0.8),
      smears: unit(state.values["marks.smears"], 0.12),
    },
    motion: { amount: unit(state.values["motion.amount"], 0.55) },
    seed: Number.parseInt(String(state.values["marks.seed"] ?? "1"), 10) || 1,
  };
}

export function loadAsciiSourceImage(
  asset: ToolcraftMediaAsset,
): Promise<HTMLImageElement> {
  const cacheKey = `${asset.id}:${asset.dataUrl.length}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not decode ${asset.fileName}.`));
    image.src = asset.dataUrl;
  });
  imageCache.set(cacheKey, pending);
  return pending;
}

export function buildAsciiPlateRecipe({
  asset,
  height,
  image,
  settings,
  width,
}: {
  asset: ToolcraftMediaAsset;
  height: number;
  image: HTMLImageElement;
  settings: AsciiRenderSettings;
  width: number;
}): PlateRecipe {
  return createPlateRecipe({
    background: settings.background,
    characters: settings.characters,
    columns: Math.round(settings.columns),
    contrast: settings.contrast,
    field: settings.field,
    height,
    image,
    ink: settings.ink,
    inks: settings.inks,
    invert: settings.invert,
    marks: settings.marks,
    motion: settings.motion,
    seed: settings.seed,
    transform: {
      ...asset.transform,
      offsetX: settings.frame.x,
      offsetY: settings.frame.y,
      zoom: settings.frame.zoom,
    },
    width,
  });
}

export function paintAsciiPlate({
  asset,
  clear = true,
  context,
  height,
  image,
  paintBackground = true,
  progress = 0,
  settings,
  width,
}: {
  asset: ToolcraftMediaAsset;
  clear?: boolean;
  context: CanvasRenderingContext2D;
  height: number;
  image: HTMLImageElement;
  paintBackground?: boolean;
  progress?: number;
  settings: AsciiRenderSettings;
  width: number;
}): PlateRecipe {
  if (clear) context.clearRect(0, 0, width, height);
  const recipe = buildAsciiPlateRecipe({
    asset,
    height,
    image,
    settings,
    width,
  });
  paintPlate(
    context,
    recipe,
    {
      fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      progress,
    },
    {
      height,
      includeBackground: paintBackground && settings.includeBackground,
      width,
    },
  );
  return recipe;
}
