import { access } from "node:fs/promises";
import path from "node:path";

import homeFile from "../../content/home.json";
import { collectionForGallery, type CollectionId } from "@/lib/collection-ids";
import { getGalleryItems, type GalleryItem, type GalleryVideo } from "@/lib/gallery";
import { getProjectItems, type ProjectItem } from "@/lib/projects";
import { presentationFor } from "@/components/board/presentations/registry";
import { isPresentationKind, type PresentationSpec } from "@/components/board/presentations/types";
import { getWorkItems, type WorkItem } from "@/lib/work";

const PORTRAIT_PUBLIC_PATH = "/media/people/seth-jenks.jpg";

export const HOME_FILTERS = ["product", "brand", "play"] as const;
export const HOME_FRAMES = ["poster", "tall", "short", "mark", "phone"] as const;
export const HOME_FITS = ["cover", "contain"] as const;

export type HomeFilter = (typeof HOME_FILTERS)[number];
export type HomeFrame = (typeof HOME_FRAMES)[number];
export type HomeFit = (typeof HOME_FITS)[number];

export type HomeStill = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type TileMotion = {
  scale: number;
  x: number;
  y: number;
  opacity: number;
};

export type TileLayerMotion = {
  from: TileMotion;
  to: TileMotion;
};

export type TileHover = {
  duration: number;
  background: TileLayerMotion;
  foreground: TileLayerMotion;
};

export type TileBackground =
  | { type: "color"; color: string }
  | { type: "gradient"; gradient: string }
  | { type: "image"; src: string; alt: string; fit: HomeFit };

export type TileForeground =
  | { type: "image"; src: string; alt: string; fit: HomeFit }
  | { type: "vector"; src: string; alt: string; fit: HomeFit }
  | { type: "video"; src: string; poster?: string; alt: string; fit: HomeFit; play: "hover" | "always" }
  | { type: "html"; src: string; title: string };

export type ProjectPlate = {
  label: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type CardOpening =
  | { kind: "slot" }
  | { kind: "video"; src: string; poster?: string; width: number; height: number }
  | { kind: "image"; src: string; alt: string; width: number; height: number }
  | { kind: "frame"; src: string; title: string; width: number; height: number }
  | { kind: "collection"; id: CollectionId; poster: string; title: string }
  | {
      kind: "project";
      href: string;
      title: string;
      summary: string;
      year: string;
      role: string;
      tags: string[];
      statement: string;
      still: { src: string; alt: string };
      preview: { src: string; alt: string };
      plates: ProjectPlate[];
    }
  | {
      kind: "presentation";
      presentation: PresentationSpec["id"];
      href: string;
      project: PresentationSpec["project"];
      spec: PresentationSpec;
    };

export type HomeCard = {
  kind: "card";
  key: string;
  id: string;
  label: string;
  filter: HomeFilter;
  frame: HomeFrame;
  ratio?: string;
  href?: string;
  external: boolean;
  background: TileBackground;
  foreground?: TileForeground;
  hover: TileHover;
  opening: CardOpening;
};

export type HomeBoard = {
  columns: HomeCard[][];
  projects: ProjectItem[];
  portrait?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHomeFilter(value: unknown): value is HomeFilter {
  return typeof value === "string" && HOME_FILTERS.some((filter) => filter === value);
}

function isHomeFrame(value: unknown): value is HomeFrame {
  return typeof value === "string" && HOME_FRAMES.some((frame) => frame === value);
}

function isHomeFit(value: unknown): value is HomeFit {
  return typeof value === "string" && HOME_FITS.some((fit) => fit === value);
}

const IDENTITY_MOTION: TileMotion = { scale: 1, x: 0, y: 0, opacity: 1 };
const RASTER_SRC = /^\/media\/[a-z0-9][a-z0-9/_-]*\.(?:png|jpe?g|webp|gif)$/;
const VECTOR_SRC = /^\/media\/[a-z0-9][a-z0-9/_-]*\.svg$/;
const VIDEO_SRC = /^\/media\/[a-z0-9][a-z0-9/_-]*\.mp4$/;
const HTML_SRC = /^\/media\/[a-z0-9][a-z0-9/_-]*\.html$/;
const COLOR_SRC = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function readText(value: unknown, where: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${where} must be a non-empty string.`);
  }

  return value.trim();
}

function readBoundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  where: string,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${where} must be a number from ${min} to ${max}.`);
  }

  return value;
}

function readMotion(value: unknown, base: TileMotion, where: string): TileMotion {
  if (value === undefined) {
    return base;
  }

  if (!isRecord(value)) {
    throw new Error(`${where} must be an object.`);
  }

  return {
    scale: readBoundedNumber(value.scale, base.scale, 0.25, 3, `${where}.scale`),
    x: readBoundedNumber(value.x, base.x, -240, 240, `${where}.x`),
    y: readBoundedNumber(value.y, base.y, -240, 240, `${where}.y`),
    opacity: readBoundedNumber(value.opacity, base.opacity, 0, 1, `${where}.opacity`),
  };
}

function readLayerMotion(value: unknown, where: string): TileLayerMotion {
  if (value === undefined) {
    return { from: IDENTITY_MOTION, to: IDENTITY_MOTION };
  }

  if (!isRecord(value)) {
    throw new Error(`${where} must be an object.`);
  }

  const from = readMotion(value.from, IDENTITY_MOTION, `${where}.from`);
  return { from, to: readMotion(value.to, from, `${where}.to`) };
}

function readHover(value: unknown, where: string): TileHover {
  if (value === undefined) {
    return {
      duration: 400,
      background: readLayerMotion(undefined, where),
      foreground: readLayerMotion(undefined, where),
    };
  }

  if (!isRecord(value)) {
    throw new Error(`${where} must be an object.`);
  }

  return {
    duration: readBoundedNumber(value.duration, 400, 0, 2000, `${where}.duration`),
    background: readLayerMotion(value.background, `${where}.background`),
    foreground: readLayerMotion(value.foreground, `${where}.foreground`),
  };
}

function readFit(value: unknown, fallback: HomeFit, where: string): HomeFit {
  if (value === undefined) {
    return fallback;
  }

  if (!isHomeFit(value)) {
    throw new Error(`${where} must be "cover" or "contain".`);
  }

  return value;
}

function readMediaPath(value: unknown, pattern: RegExp, where: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${where} must be a path under /media/.`);
  }

  return value;
}

function readColor(value: unknown, where: string): string {
  if (typeof value !== "string" || !COLOR_SRC.test(value)) {
    throw new Error(`${where} must be a hex color.`);
  }

  return value;
}

function readGradient(value: unknown, where: string): string {
  if (
    typeof value !== "string" ||
    !/^(?:linear|radial|conic)-gradient\([^;{}]*\)$/.test(value) ||
    /url\s*\(|expression\s*\(/i.test(value)
  ) {
    throw new Error(`${where} must be a linear, radial, or conic gradient.`);
  }

  return value;
}

function readBackground(value: unknown, fallback: TileBackground, where: string): TileBackground {
  if (value === undefined) {
    return fallback;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error(`${where} must be an object with a type.`);
  }

  switch (value.type) {
    case "color":
      return { type: "color", color: readColor(value.color, `${where}.color`) };
    case "gradient":
      return { type: "gradient", gradient: readGradient(value.gradient, `${where}.gradient`) };
    case "image": {
      const src =
        value.src === undefined
          ? fallback.type === "image"
            ? fallback.src
            : undefined
          : readMediaPath(value.src, RASTER_SRC, `${where}.src`);
      if (src === undefined) {
        throw new Error(`${where}.src must be a raster image path.`);
      }
      const alt = readText(value.alt, `${where}.alt`) ?? (fallback.type === "image" ? fallback.alt : undefined);
      if (alt === undefined) {
        throw new Error(`${where}.alt must be a non-empty string.`);
      }
      return {
        type: "image",
        src,
        alt,
        fit: readFit(value.fit, fallback.type === "image" ? fallback.fit : "cover", `${where}.fit`),
      };
    }
    default:
      throw new Error(`${where}.type must be "color", "gradient", or "image".`);
  }
}

function readForeground(
  value: unknown,
  fallback: HomeStill,
  fit: HomeFit,
  where: string,
): TileForeground | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error(`${where} must be an object with a type.`);
  }

  switch (value.type) {
    case "image":
      return {
        type: "image",
        src:
          value.src === undefined
            ? fallback.src
            : readMediaPath(value.src, RASTER_SRC, `${where}.src`),
        alt: readText(value.alt, `${where}.alt`) ?? fallback.alt,
        fit: readFit(value.fit, fit, `${where}.fit`),
      };
    case "vector":
      return {
        type: "vector",
        src: readMediaPath(value.src, VECTOR_SRC, `${where}.src`),
        alt: readText(value.alt, `${where}.alt`) ?? fallback.alt,
        fit: readFit(value.fit, fit, `${where}.fit`),
      };
    case "video": {
      if (value.play !== undefined && value.play !== "hover" && value.play !== "always") {
        throw new Error(`${where}.play must be "hover" or "always".`);
      }
      const play = value.play === "always" ? "always" : "hover";
      const poster =
        value.poster === undefined
          ? undefined
          : readMediaPath(value.poster, RASTER_SRC, `${where}.poster`);
      return {
        type: "video",
        src: readMediaPath(value.src, VIDEO_SRC, `${where}.src`),
        alt: readText(value.alt, `${where}.alt`) ?? fallback.alt,
        fit: readFit(value.fit, fit, `${where}.fit`),
        play,
        ...(poster ? { poster } : {}),
      };
    }
    case "html": {
      const title = readText(value.title, `${where}.title`);
      if (title === undefined) {
        throw new Error(`${where}.title must be a non-empty string.`);
      }
      return {
        type: "html",
        src: readMediaPath(value.src, HTML_SRC, `${where}.src`),
        title,
      };
    }
    default:
      throw new Error(`${where}.type must be "image", "vector", "video", or "html".`);
  }
}

function galleryStill(item: GalleryItem): HomeStill {
  switch (item.media) {
    case "image":
      return { src: item.src, width: item.width, height: item.height, alt: item.alt };
    case "video":
    case "site":
      return { src: item.poster, width: item.width, height: item.height, alt: item.alt };
    case "frame":
      throw new Error(`Gallery item "${item.id}" has no still image for the home board.`);
    default: {
      const unknown: never = item;
      return unknown;
    }
  }
}

function galleryOpening(item: GalleryItem, foreground: TileForeground | undefined): CardOpening {
  const collection = collectionForGallery(item.id);
  if (collection) {
    const poster =
      item.media === "video" || item.media === "site"
        ? item.poster
        : item.media === "image"
          ? item.src
          : foreground?.type === "image" || foreground?.type === "vector"
            ? foreground.src
            : "";
    return { kind: "collection", id: collection, poster, title: item.title };
  }

  if (foreground?.type === "video" || item.media === "video") {
    const src = foreground?.type === "video" ? foreground.src : item.media === "video" ? item.src : "";
    const poster =
      foreground?.type === "video"
        ? foreground.poster
        : item.media === "video"
          ? item.poster
          : undefined;
    return {
      kind: "video",
      src,
      width: item.width,
      height: item.height,
      ...(poster ? { poster } : {}),
    };
  }

  if (foreground?.type === "html" || item.media === "frame" || item.media === "site") {
    const src =
      foreground?.type === "html"
        ? foreground.src
        : item.media === "site"
          ? item.frame
          : item.media === "frame"
            ? item.src
            : "";
    const title = foreground?.type === "html" ? foreground.title : item.title;
    return { kind: "frame", src, title, width: item.width, height: item.height };
  }

  const pictured =
    foreground?.type === "image" || foreground?.type === "vector"
      ? { src: foreground.src, alt: foreground.alt }
      : { src: item.media === "image" ? item.src : "", alt: item.media === "image" ? item.alt : "" };

  return {
    kind: "image",
    src: pictured.src,
    alt: pictured.alt,
    width: item.width,
    height: item.height,
  };
}

function galleryHref(
  item: GalleryItem,
  projects: readonly ProjectItem[],
): { href?: string; external: boolean } {
  const project = projects.find((entry) => entry.id === item.id);

  if (project?.href) {
    return { href: project.href, external: /^https?:\/\//.test(project.href) };
  }

  switch (item.media) {
    case "site":
      return { href: item.frame, external: false };
    case "image":
    case "video":
      return { href: item.src, external: false };
    case "frame":
      return { href: item.src, external: false };
    default: {
      const unknown: never = item;
      return unknown;
    }
  }
}

function workStill(item: WorkItem, plateLabel: string | undefined): HomeStill {
  if (plateLabel === undefined) {
    return {
      src: item.src,
      width: item.width,
      height: item.height,
      alt: item.alt ?? item.summary,
    };
  }

  const plate = item.plates?.find((entry) => entry.label === plateLabel);
  if (!plate) {
    throw new Error(`Work item "${item.id}" has no plate "${plateLabel}".`);
  }

  return { src: plate.src, width: plate.width, height: plate.height, alt: plate.alt };
}

function resolveTile(
  value: unknown,
  column: number,
  index: number,
  gallery: readonly GalleryItem[],
  work: readonly WorkItem[],
  projects: readonly ProjectItem[],
): HomeCard {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error(`content/home.json columns[${column}][${index}] must be an object.`);
  }

  if (value.kind !== "gallery" && value.kind !== "work" && value.kind !== "slot") {
    throw new Error(`content/home.json columns[${column}][${index}] has an unknown kind.`);
  }

  if (typeof value.id !== "string") {
    throw new Error(`content/home.json columns[${column}][${index}] needs an id.`);
  }

  if (!isHomeFilter(value.filter)) {
    throw new Error(`content/home.json columns[${column}][${index}] has an unknown filter.`);
  }

  if (!isHomeFrame(value.frame)) {
    throw new Error(`content/home.json columns[${column}][${index}] has an unknown frame.`);
  }

  const fit = value.fit === undefined ? "cover" : value.fit;
  if (!isHomeFit(fit)) {
    throw new Error(`content/home.json columns[${column}][${index}] has an unknown fit.`);
  }

  const where = `content/home.json columns[${column}][${index}]`;
  const label = readText(value.label, `${where}.label`);

  if (value.kind !== "work" && value.presentation !== undefined) {
    throw new Error(`${where} can only set presentation on a work tile.`);
  }

  if (value.kind === "slot") {
    return {
      kind: "card",
      key: `slot-${value.id}-${column}-${index}`,
      id: value.id,
      label: label ?? "Untitled",
      filter: value.filter,
      frame: value.frame,
      external: false,
      background: { type: "color", color: "#eeeeee" },
      hover: readHover(undefined, `${where}.hover`),
      opening: { kind: "slot" },
    };
  }

  if (value.kind === "gallery") {
    const item = gallery.find((entry) => entry.id === value.id);
    if (!item) {
      throw new Error(`Unknown gallery id "${value.id}" in content/home.json.`);
    }

    const href = galleryHref(item, projects);
    const card = {
      kind: "card" as const,
      key: `gallery-${item.id}-${column}-${index}`,
      id: item.id,
      label: label ?? item.title,
      filter: value.filter,
      frame: value.frame,
      ...(value.frame === "phone" ? { ratio: `${item.width} / ${item.height}` } : {}),
      external: href.external,
      ...(href.href ? { href: href.href } : {}),
    };

    if (item.media === "frame") {
      const foreground = readForeground(
        value.foreground ?? { type: "html", src: item.src, title: item.title },
        { src: item.src, width: item.width, height: item.height, alt: item.alt },
        fit,
        `${where}.foreground`,
      );
      if (!foreground) {
        throw new Error(`${where} needs a foreground.`);
      }

      return {
        ...card,
        background: readBackground(
          value.background,
          { type: "color", color: "#eeeeee" },
          `${where}.background`,
        ),
        foreground,
        hover: readHover(value.hover, `${where}.hover`),
        opening: galleryOpening(item, foreground),
      };
    }

    const still = galleryStill(item);
    const layers =
      item.media === "video"
        ? playingVideo(readTileLayers(value, still, fit, where), item, fit, value.foreground)
        : readTileLayers(value, still, fit, where);
    return {
      ...card,
      ...layers,
      opening: galleryOpening(item, layers.foreground),
    };
  }

  const item = work.find((entry) => entry.id === value.id);
  if (!item) {
    throw new Error(`Unknown work id "${value.id}" in content/home.json.`);
  }

  const plate = value.plate;
  if (plate !== undefined && (typeof plate !== "string" || plate.trim().length === 0)) {
    throw new Error(`content/home.json columns[${column}][${index}] plate must be a string.`);
  }

  const plateLabel = typeof plate === "string" ? plate.trim() : undefined;
  const still = workStill(item, plateLabel);
  const clip = gallery.find((entry) => entry.id === item.id);
  const video = clip?.media === "video" ? clip : undefined;
  const layers = readTileLayers(value, still, fit, where);
  const shown =
    video && plateLabel === undefined && value.foreground === undefined
      ? playingVideo(layers, video, fit, value.foreground)
      : layers;
  const title = label ?? item.title;
  const heading = item.sections[0]?.heading ?? title;

  if (value.presentation !== undefined) {
    if (!isPresentationKind(value.presentation)) {
      throw new Error(`${where} has an unknown presentation.`);
    }

    const project = {
      title,
      chips: [item.year, item.role, ...(item.tags ?? [])],
      href: `/work/${item.id}`,
    };
    const spec = presentationFor(value.presentation, project);

    return {
      kind: "card",
      key: `work-${item.id}-presentation-${column}-${index}`,
      id: item.id,
      label: title,
      filter: value.filter,
      frame: value.frame,
      ratio: `${spec.closed.width} / ${spec.closed.height}`,
      href: `/work/${item.id}`,
      external: false,
      background: { type: "color" as const, color: "#ededed" },
      hover: readHover(value.hover, `${where}.hover`),
      opening: {
        kind: "presentation" as const,
        presentation: value.presentation,
        href: `/work/${item.id}`,
        project,
        spec,
      },
    };
  }

  return {
    kind: "card",
    key: `work-${item.id}-${plate ?? "hero"}-${column}-${index}`,
    id: item.id,
    label: title,
    filter: value.filter,
    frame: value.frame,
    ...(value.frame === "phone" ? { ratio: `${still.width} / ${still.height}` } : {}),
    href: `/work/${item.id}`,
    external: false,
    opening: {
      kind: "project",
      href: `/work/${item.id}`,
      title,
      summary: item.summary,
      year: item.year,
      role: item.role,
      tags: item.tags ?? [],
      statement: /[.!?]$/.test(heading) ? heading : `${heading}.`,
      still: { src: item.src, alt: item.alt ?? item.summary },
      preview: { src: still.src, alt: still.alt },
      plates: (item.plates ?? []).map((entry) => ({
        label: entry.label,
        src: entry.src,
        alt: entry.alt,
        width: entry.width,
        height: entry.height,
      })),
    },
    ...shown,
  };
}

function playingVideo(
  layers: ReturnType<typeof readTileLayers>,
  clip: GalleryVideo,
  fit: HomeFit,
  foreground: unknown,
): ReturnType<typeof readTileLayers> {
  if (foreground !== undefined && layers.foreground?.type !== "video") {
    return layers;
  }

  return {
    ...layers,
    foreground: {
      type: "video",
      src: clip.src,
      poster: clip.poster,
      alt: clip.alt,
      fit: layers.foreground?.type === "video" ? layers.foreground.fit : fit,
      play: "always",
    },
    hover: {
      ...layers.hover,
      foreground: {
        from: { ...layers.hover.foreground.from, opacity: 1 },
        to: { ...layers.hover.foreground.to, opacity: 1 },
      },
    },
  };
}

function readTileLayers(value: Record<string, unknown>, still: HomeStill, fit: HomeFit, where: string) {
  const foreground = readForeground(value.foreground, still, fit, `${where}.foreground`);
  return {
    background: readBackground(
      value.background,
      { type: "image", src: still.src, alt: still.alt, fit },
      `${where}.background`,
    ),
    hover: readHover(value.hover, `${where}.hover`),
    ...(foreground ? { foreground } : {}),
  };
}

async function portraitSrc(): Promise<string | undefined> {
  try {
    await access(path.join(process.cwd(), "public", PORTRAIT_PUBLIC_PATH));
    return PORTRAIT_PUBLIC_PATH;
  } catch {
    return undefined;
  }
}

export async function getHomeBoard(): Promise<HomeBoard> {
  if (!isRecord(homeFile) || !Array.isArray(homeFile.columns) || !Array.isArray(homeFile.projects)) {
    throw new Error("content/home.json must include columns and projects.");
  }

  if (homeFile.columns.length !== 3) {
    throw new Error("content/home.json must have three columns.");
  }

  const [gallery, work, projects] = await Promise.all([
    getGalleryItems(),
    getWorkItems(),
    getProjectItems(),
  ]);

  const columns = homeFile.columns.map((column, columnIndex) => {
    if (!Array.isArray(column) || column.length === 0) {
      throw new Error(`content/home.json columns[${columnIndex}] must be a non-empty array.`);
    }

    return column.map((tile, index) =>
      resolveTile(tile, columnIndex, index, gallery, work, projects),
    );
  });

  const projectIds = homeFile.projects;
  if (projectIds.length === 0 || projectIds.some((id) => typeof id !== "string")) {
    throw new Error("content/home.json projects must be an array of ids.");
  }

  const resolvedProjects = projectIds.map((id) => {
    const project = projects.find((entry) => entry.id === id);
    if (!project) {
      throw new Error(`Unknown project id "${id}" in content/home.json.`);
    }
    return project;
  });

  const portrait = await portraitSrc();

  return {
    columns,
    projects: resolvedProjects,
    ...(portrait ? { portrait } : {}),
  };
}
