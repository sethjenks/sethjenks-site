import { readFile } from "node:fs/promises";
import path from "node:path";

const GALLERY_PATH = path.join(process.cwd(), "content", "gallery.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_PATTERN = /^\/media\/work\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|svg)$/;
const VIDEO_PATTERN = /^\/media\/work\/[a-z0-9-]+\.mp4$/;
const FRAME_PATTERN = /^\/media\/work\/[a-z0-9-]+\.html$/;

type GalleryBase = {
  id: string;
  title: string;
  width: number;
  height: number;
  alt: string;
};

export type GalleryImage = GalleryBase & {
  media: "image";
  src: string;
  mark?: true;
  pad?: number;
};

export type GalleryVideo = GalleryBase & {
  media: "video";
  src: string;
  poster: string;
};

export type GalleryFrame = GalleryBase & {
  media: "frame";
  src: string;
  fit?: "screen" | "poster";
  mark?: true;
};

export type GalleryItem = GalleryImage | GalleryVideo | GalleryFrame;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function readBase(value: Record<string, unknown>): GalleryBase | null {
  const { id, title, width, height, alt } = value;

  if (
    typeof id !== "string" ||
    !ID_PATTERN.test(id) ||
    typeof title !== "string" ||
    title.trim().length === 0 ||
    !isPositiveNumber(width) ||
    !isPositiveNumber(height) ||
    typeof alt !== "string" ||
    alt.trim().length === 0
  ) {
    return null;
  }

  return {
    id,
    title: title.trim(),
    width,
    height,
    alt: alt.trim(),
  };
}

function parseGalleryItem(value: unknown): GalleryItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const base = readBase(value);
  if (!base) {
    return null;
  }

  const media = value.media ?? "image";
  if (value.mark !== undefined && value.mark !== true) {
    return null;
  }

  if (value.mark === true && media !== "image" && media !== "frame") {
    return null;
  }

  const pad =
    typeof value.pad === "number" &&
    Number.isFinite(value.pad) &&
    value.pad > 0 &&
    value.pad <= 40
      ? value.pad
      : null;
  if (value.pad !== undefined && (pad === null || media !== "image" || value.mark !== true)) {
    return null;
  }

  if (media === "image") {
    return typeof value.src === "string" && IMAGE_PATTERN.test(value.src)
      ? {
          ...base,
          media: "image",
          src: value.src,
          ...(value.mark === true ? { mark: true } : {}),
          ...(pad !== null ? { pad } : {}),
        }
      : null;
  }

  if (media === "video") {
    return typeof value.src === "string" &&
      VIDEO_PATTERN.test(value.src) &&
      typeof value.poster === "string" &&
      IMAGE_PATTERN.test(value.poster)
      ? { ...base, media: "video", src: value.src, poster: value.poster }
      : null;
  }

  if (media === "frame") {
    if (typeof value.src !== "string" || !FRAME_PATTERN.test(value.src)) {
      return null;
    }

    if (value.fit !== undefined && value.fit !== "screen" && value.fit !== "poster") {
      return null;
    }

    return {
      ...base,
      media: "frame",
      src: value.src,
      ...(value.fit === "screen" || value.fit === "poster" ? { fit: value.fit } : {}),
      ...(value.mark === true ? { mark: true } : {}),
    };
  }

  return null;
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const raw = JSON.parse(await readFile(GALLERY_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw)) {
    throw new Error("content/gallery.json must be an array of gallery items.");
  }

  const items = raw.map(parseGalleryItem);
  if (items.some((item) => item === null)) {
    throw new Error("content/gallery.json must be an array of gallery items.");
  }

  const gallery = items.filter((item): item is GalleryItem => item !== null);
  const seenIds = new Set<string>();
  const seenSrc = new Set<string>();

  for (const item of gallery) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate gallery id "${item.id}".`);
    }

    if (seenSrc.has(item.src)) {
      throw new Error(`Duplicate gallery source "${item.src}".`);
    }

    seenIds.add(item.id);
    seenSrc.add(item.src);
  }

  return gallery;
}
