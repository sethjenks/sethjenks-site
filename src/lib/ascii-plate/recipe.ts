import { enabledMarkKinds } from "./marks";
import { clamp, encodeTones, unit } from "./math";
import { sampleToneField } from "./sample";
import type { PlateCoverTransform } from "./sample";
import type {
  PlateField,
  PlateImageLike,
  PlateMarkKind,
  PlateMarks,
  PlateMotion,
  PlateRecipe,
} from "./types";
import { PLATE_MARK_KINDS, PLATE_VERSION } from "./types";

function asHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }
  return fallback;
}

function integer(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.round(numeric);
}

export function defaultPlateMarks(): PlateMarks {
  return {
    edges: 0.55,
    enabled: [...PLATE_MARK_KINDS],
    flecks: 0.08,
    mix: 0.4,
    size: 0.8,
    smears: 0.12,
  };
}

function asInks(value: unknown, fallback: string): string[] {
  if (Array.isArray(value)) {
    const inks = value
      .map((item) => asHex(item, ""))
      .filter((item) => item.length > 0);
    if (inks.length > 0) return inks;
  }
  return [asHex(fallback, "#111111")];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asEnabledMarks(value: unknown): PlateMarkKind[] {
  if (!Array.isArray(value)) {
    return enabledMarkKinds(null);
  }

  return enabledMarkKinds(
    value.filter((item): item is string => typeof item === "string"),
  );
}

export function defaultPlateField(): PlateField {
  return {
    detail: 0.5,
    tilt: 0.2,
    wave: 0.45,
  };
}

export function defaultPlateMotion(): PlateMotion {
  return { amount: 0.55 };
}

export function createPlateRecipe({
  background,
  characters,
  columns,
  contrast,
  field,
  height,
  image,
  ink,
  inks,
  invert,
  marks,
  motion,
  seed,
  transform,
  width,
}: {
  background: string;
  characters: string;
  columns: number;
  contrast: number;
  field?: Partial<PlateField>;
  height: number;
  image: PlateImageLike;
  ink?: string;
  inks?: readonly string[];
  invert: boolean;
  marks?: Partial<PlateMarks>;
  motion?: Partial<PlateMotion>;
  seed: number;
  transform?: PlateCoverTransform;
  width: number;
}): PlateRecipe {
  const sampled = sampleToneField({
    columns,
    contrast,
    height,
    image,
    invert,
    transform,
    width,
  });

  return {
    background: asHex(background, "#FAFAFA"),
    characters,
    columns,
    contrast,
    field: {
      ...defaultPlateField(),
      ...field,
      detail: unit(field?.detail ?? 0.5, 0.5),
      tilt: unit(field?.tilt ?? 0.2, 0.2),
      wave: unit(field?.wave ?? 0.45, 0.45),
    },
    height,
    ink: asHex(inks?.[0] ?? ink, "#111111"),
    inks: asInks(inks, asHex(ink, "#111111")),
    invert,
    marks: {
      ...defaultPlateMarks(),
      ...marks,
      edges: unit(marks?.edges ?? 0.55, 0.55),
      enabled: asEnabledMarks(marks?.enabled),
      flecks: unit(marks?.flecks ?? 0.08, 0.08),
      mix: unit(marks?.mix ?? 0.4, 0.4),
      size: unit(marks?.size ?? 0.8, 0.8),
      smears: unit(marks?.smears ?? 0.12, 0.12),
    },
    motion: {
      amount: unit(motion?.amount ?? 0.55, 0.55),
    },
    rows: sampled.rows,
    seed,
    tones: encodeTones(sampled.tones),
    version: PLATE_VERSION,
    width,
  };
}

export function parsePlateRecipe(value: unknown): PlateRecipe {
  if (!value || typeof value !== "object") {
    throw new Error("Plate recipe must be an object.");
  }

  const raw = value as Record<string, unknown>;
  if (raw.version !== PLATE_VERSION) {
    throw new Error("Unsupported plate recipe version.");
  }
  if (typeof raw.tones !== "string" || raw.tones.length === 0) {
    throw new Error("Plate recipe is missing a tone field.");
  }
  if (typeof raw.characters !== "string" || raw.characters.length === 0) {
    throw new Error("Plate recipe is missing a character ramp.");
  }

  const columns = clamp(integer(raw.columns, 120), 8, 320);
  const rows = clamp(integer(raw.rows, 1), 1, 320);
  const marks = isRecord(raw.marks) ? raw.marks : {};
  const field = isRecord(raw.field) ? raw.field : {};
  const motion = isRecord(raw.motion) ? raw.motion : {};

  return {
    background: asHex(raw.background, "#FAFAFA"),
    characters: raw.characters,
    columns,
    contrast: clamp(Number(raw.contrast) || 1, 0.5, 2.5),
    field: {
      detail: unit(field.detail, 0.5),
      tilt: unit(field.tilt, 0.2),
      wave: unit(field.wave, 0.45),
    },
    height: Math.max(1, integer(raw.height, 336)),
    ink: asHex(
      Array.isArray(raw.inks) ? raw.inks[0] : raw.ink,
      "#111111",
    ),
    inks: asInks(raw.inks, asHex(raw.ink, "#111111")),
    invert: raw.invert === true,
    marks: {
      edges: unit(marks.edges, 0.55),
      enabled: asEnabledMarks(marks.enabled),
      flecks: unit(marks.flecks, 0.08),
      mix: unit(marks.mix, 0.4),
      size: unit(marks.size, 0.8),
      smears: unit(marks.smears, 0.12),
    },
    motion: { amount: unit(motion.amount, 0.55) },
    rows,
    seed: integer(raw.seed, 1),
    tones: raw.tones,
    version: PLATE_VERSION,
    width: Math.max(1, integer(raw.width, 672)),
  };
}
