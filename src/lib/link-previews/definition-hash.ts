import type { Entry, EntryImage, ImageSource, Layout, System } from "./types";
import { isSheet, isSource, resolveLayout } from "./types";

export function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] === undefined) continue;
      sorted[key] = sortValue(record[key]);
    }
    return sorted;
  }
  return value;
}

function normalizeSource(source: ImageSource): ImageSource {
  const next: ImageSource = {
    src: source.src,
    focus: { x: source.focus.x, y: source.focus.y },
  };
  if (source.zoom != null && source.zoom !== 1) next.zoom = source.zoom;
  return next;
}

export function normalizeImage(image: EntryImage): EntryImage {
  if (image == null) return null;
  if (isSheet(image)) return { sheet: [...image.sheet], columns: image.columns };
  if (isSource(image)) return normalizeSource(image);
  return null;
}

function systemForHash(system: System, usesColor: boolean): unknown {
  const next: Record<string, unknown> = { ...system, color: system.color.toLowerCase() };
  if (!usesColor) delete next.color;
  return next;
}

/**
 * 32-bit FNV-1a over the UTF-16 code units of `text`, as 8 hex digits.
 * Offset 0x811c9dc5, prime 0x01000193.
 */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function definitionHash(entry: Entry, system: System, usesColor: boolean): string {
  const layout: Layout = resolveLayout(entry);
  const drawn: Record<string, unknown> =
    layout === "image-only"
      ? {
          title: entry.title,
          layout,
          image: normalizeImage(entry.image),
        }
      : {
          title: entry.title,
          theme: entry.theme,
          layout,
          image: layout === "type-only" ? null : normalizeImage(entry.image),
          system: systemForHash(system, usesColor),
        };
  if (entry.alt) drawn.alt = entry.alt;
  return fnv1a(canonical(drawn));
}
