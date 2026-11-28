import { access } from "node:fs/promises";
import path from "node:path";

import homeFile from "../../content/home.json";
import { collectionForGallery } from "@/lib/collection-ids";
import { getGalleryItems, type GalleryItem, type GalleryVideo } from "@/lib/gallery";
import { getProjectItems, type ProjectItem } from "@/lib/projects";
import { CHIA_ICON_MARKS } from "@/components/board/presentations/icon";
import { copyFrame, embedFrame, imageFrame, type DesktopFrameInput } from "@/components/board/presentations/desktop";
import { COMMAND_KEY_SRC } from "@/components/board/presentations/key-object";
import { presentationFor, type PresentationMedia } from "@/components/board/presentations/registry";
import {
  isPresentationKind,
  withFill,
  type PresentationKind,
  type PresentationProject,
  type PresentationSpec,
} from "@/components/board/presentations/types";
import { introFields } from "@/lib/project-intro";
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

export type CardOpening = {
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

function frameBox(frame: HomeFrame) {
  switch (frame) {
    case "tall":
      return { width: 383, height: 440 };
    case "poster":
      return { width: 383, height: 280 };
    case "short":
      return { width: 383, height: 248 };
    case "mark":
      return { width: 383, height: 210 };
    case "phone":
      return { width: 390, height: 852 };
    default: {
      const unreachable: never = frame;
      return unreachable;
    }
  }
}

function readPresentation(value: unknown, where: string): PresentationKind | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isPresentationKind(value)) {
    throw new Error(`${where} has an unknown presentation.`);
  }
  return value;
}

function readFill(value: unknown, where: string): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${where} must be a boolean.`);
  }
  return value;
}

function withPresentation(
  card: Omit<HomeCard, "opening" | "ratio">,
  kind: PresentationKind,
  project: PresentationProject,
  media: PresentationMedia | undefined,
  href: string,
  fill = false,
): HomeCard {
  const spec = withFill(presentationFor(kind, project, media), fill);
  return {
    ...card,
    ratio: `${spec.closed.width} / ${spec.closed.height}`,
    ...(href ? { href } : {}),
    opening: { kind: "presentation", presentation: kind, href, project, spec },
  };
}

function galleryPoster(item: GalleryItem, foreground: TileForeground | undefined) {
  if (item.media === "video" || item.media === "site") {
    return item.poster;
  }
  if (item.media === "image") {
    return item.src;
  }
  if (foreground?.type === "image" || foreground?.type === "vector") {
    return foreground.src;
  }
  return "";
}

function galleryDesktopFrame(item: GalleryItem, fit: "cover" | "contain" = "contain"): DesktopFrameInput {
  if (item.media === "video") {
    return {
      label: item.title,
      description: item.alt,
      aspect: item.width / item.height,
      object: {
        type: "video",
        src: item.src,
        alt: item.alt,
        poster: item.poster,
        play: "hover",
        fit,
      },
    };
  }

  if (item.media === "image") {
    return {
      label: item.title,
      description: item.alt,
      aspect: item.width / item.height,
      object: { type: "image", src: item.src, alt: item.alt, position: "center center", fit },
    };
  }

  throw new Error(`Gallery item "${item.id}" cannot join a desktop stack.`);
}

function readGalleryStack(
  value: unknown,
  gallery: readonly GalleryItem[],
  heroId: string,
  where: string,
): GalleryItem[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must be a non-empty array of gallery ids.`);
  }

  const seen = new Set<string>([heroId]);
  const stack: GalleryItem[] = [];

  for (const [index, entry] of value.entries()) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`${where}[${index}] must be a gallery id.`);
    }

    const id = entry.trim();
    if (seen.has(id)) {
      throw new Error(`${where}[${index}] repeats "${id}".`);
    }

    const item = gallery.find((candidate) => candidate.id === id);
    if (!item) {
      throw new Error(`Unknown gallery id "${id}" in ${where}[${index}].`);
    }

    if (item.media !== "image" && item.media !== "video") {
      throw new Error(`${where}[${index}] ("${id}") must be an image or video.`);
    }

    seen.add(id);
    stack.push(item);
  }

  return stack;
}

function heroClosedBox(item: { width: number; height: number }) {
  return { width: item.width, height: item.height };
}

const PAPER_BUTTON = "/media/work/paper-button";
const PAPER_BUTTON_ARTICLE = "https://paper.tips/notes/you-can-rebuild-a-button-from-a-photo";

function studyIconsFrames(): DesktopFrameInput[] {
  const shot = (file: string, label: string, description: string): DesktopFrameInput =>
    imageFrame({
      src: `${PAPER_BUTTON}/${file}`,
      label,
      description,
      width: 1600,
      height: 1200,
      fit: "cover",
    });

  return [
    embedFrame({
      src: COMMAND_KEY_SRC,
      title: "Command key",
      label: "The button",
      description: "The HTML and CSS rebuild. Click the key to turn the lamp on.",
      width: 1080,
      height: 540,
    }),
    shot(
      "key-reference.webp",
      "The reference",
      "The source photo: a Bluetooth key and a Command key in a recessed well, by Beyza İlhan.",
    ),
    copyFrame({
      title: "The reference",
      label: "The reference",
      body: "This is the photo I was working against, by Beyza İlhan. Everything after this is me trying to rebuild it.",
    }),
    shot(
      "key-first-try.webp",
      "First pass",
      "First Paper pass at the Bluetooth and Command key pair, with a blue lamp under the left cap.",
    ),
    copyFrame({
      title: "First pass",
      label: "First pass",
      body: "Closer than I expected, and still not the photo. The glyphs came out as vectors, the corners went soft, and the lamp missed the well.",
    }),
    shot(
      "key-second-try.webp",
      "Second pass",
      "Second Paper pass after a written critique of the first attempt.",
    ),
    copyFrame({
      title: "Critique, then again",
      label: "Second pass",
      body: "I wrote what was off against the source and sent it back. The second pass started to hold the proportions.",
    }),
    shot(
      "key-third-try.webp",
      "Third pass",
      "Third Paper pass with the recessed tray restored around the key pair.",
    ),
    copyFrame({
      title: "The tray comes back",
      label: "Third pass",
      body: "I missed the recessed tray from the first try, so I asked for it. The third pass set the keys down in a well again.",
    }),
    shot(
      "key-fourth-try.webp",
      "Fourth pass",
      "Fourth Paper pass after matching tiled grain from a screenshot of the source.",
    ),
    copyFrame({
      title: "Grain, not banding",
      label: "Fourth pass",
      body: "Gradients band. I showed it a crop of the noise, and the fourth pass tiled that grain into the shapes.",
    }),
    shot(
      "key-unlit-lit.webp",
      "Lamp off, lamp on",
      "Two Command keys on the same dark ground: lamp off on the left, blue underglow on the right.",
    ),
    copyFrame({
      title: "Lamp off, lamp on",
      label: "Finish",
      body: "I dropped the tray and kept a single Command key. One state shows the socket. The other turns the blue light on.",
    }),
  ];
}

function galleryPresentation(
  item: GalleryItem,
  frame: HomeFrame,
  foreground: TileForeground | undefined,
  fit: HomeFit,
  explicit: PresentationKind | undefined,
  stack: readonly GalleryItem[] = [],
  fill = false,
): { kind: PresentationKind; project: PresentationProject; media?: PresentationMedia } {
  const project = { title: item.title, chips: [] as string[], ...introFields(item.intro) };
  const box = frameBox(frame);
  const collection = collectionForGallery(item.id);
  let kind: PresentationKind = "widget";
  let media: PresentationMedia | undefined;

  if (item.id === "study-icons") {
    if (item.media !== "image") {
      throw new Error(`Gallery item "${item.id}" must be an image.`);
    }

    return {
      kind: "desktop",
      project: { ...project, href: PAPER_BUTTON_ARTICLE },
      media: {
        frames: studyIconsFrames(),
        layout: "split",
        /* A little taller than the still, so the cap sits just below the top edge. */
        closed: fill ? { width: item.width, height: Math.round(item.height * 1.12) } : box,
      },
    };
  }

  if (stack.length > 0 || explicit === "desktop") {
    if (item.media !== "image" && item.media !== "video") {
      throw new Error(`Gallery item "${item.id}" cannot open as a desktop stack.`);
    }

    const visionBanner = item.id === "philo-sticker-set" && stack.length > 0;

    return {
      kind: "desktop",
      project,
      media: {
        // Cover on the hero so fill cards bleed edge-to-edge; contain keeps later pieces whole.
        frames: [galleryDesktopFrame(item, "cover"), ...stack.map((entry) => galleryDesktopFrame(entry))],
        // Stacks open as a 3-column masonry (same column count as widget landscape).
        // Vision to Venture puts the film across the top and the two graphics under it.
        columns: visionBanner ? undefined : stack.length > 0 ? 3 : undefined,
        layout: visionBanner ? "banner" : undefined,
        // Fill cards size the closed shell to the hero so cover does not crop.
        closed: fill ? heroClosedBox(item) : frameBox(frame),
      },
    };
  }

  if (collection) {
    kind = "icon";
    media = {
      icon: {
        id: collection,
        poster: galleryPoster(item, foreground),
        title: item.title,
        alt: item.alt,
      },
    };
  } else if (foreground?.type === "html" || item.media === "frame" || item.media === "site") {
    const src =
      foreground?.type === "html"
        ? foreground.src
        : item.media === "site"
          ? item.frame
          : item.media === "frame"
            ? item.src
            : "";
    const title = foreground?.type === "html" ? foreground.title : item.title;
    // App marks / filled icons stay on the widget (icon-like) shell — not a desktop page.
    if (("mark" in item && item.mark) || fill || explicit === "widget" || explicit === "icon") {
      kind = "widget";
      media = {
        widget: {
          frame: fill ? heroClosedBox(item) : box,
          face: {
            src,
            width: item.width,
            height: item.height,
            label: title,
            description: item.alt,
            embed: { src, title },
          },
        },
      };
    } else {
      const portrait = item.height / item.width > 1.15;
      kind = portrait ? "phone" : "desktop";
      media = portrait
        ? {
            screens: [
              {
                id: item.id,
                label: title,
                description: item.alt,
                object: { type: "embed", src, title },
              },
            ],
          }
        : {
            frames: [
              {
                label: title,
                description: item.alt,
                aspect: item.width / item.height,
                object: { type: "embed", src, title },
              },
            ],
          };
    }
  } else {
    const still = galleryStill(item);
    const video =
      foreground?.type === "video"
        ? {
            src: foreground.src,
            poster: foreground.poster ?? still.src,
            play: foreground.play === "always" ? ("auto" as const) : ("hover" as const),
          }
        : item.media === "video"
          ? { src: item.src, poster: item.poster, play: "hover" as const }
          : undefined;
    const contain =
      fit === "contain" ||
      foreground?.type === "vector" ||
      (foreground?.type === "video" && foreground.fit === "contain") ||
      (foreground?.type === "image" && foreground.fit === "contain");
    const src = foreground?.type === "image" || foreground?.type === "vector" ? foreground.src : still.src;
    media = {
      widget: {
        frame: fill ? heroClosedBox(still) : box,
        face: {
          src,
          width: still.width,
          height: still.height,
          label: item.title,
          description: item.alt,
          contain,
          ...(video ? { video } : {}),
        },
      },
    };
  }

  const resolved = explicit ?? kind;
  if (resolved === "phone" && media?.widget && !media.widget.face.video) {
    const face = media.widget.face;
    return {
      kind: "phone",
      project,
      media: {
        screens: [
          {
            id: item.id,
            label: face.label,
            description: face.description,
            object: { type: "image", src: face.src, alt: face.description },
          },
        ],
      },
    };
  }

  if (resolved === "phone" && media?.frames?.[0]) {
    const frame = media.frames[0];
    const object = frame.object;
    if (object.type === "embed") {
      return {
        kind: "phone",
        project,
        media: {
          screens: [
            {
              id: item.id,
              label: frame.label,
              description: frame.description,
              object,
            },
          ],
        },
      };
    }
  }

  if (resolved === "desktop" && media?.screens?.[0]?.object.type === "embed") {
    const screen = media.screens[0];
    return {
      kind: "desktop",
      project,
      media: {
        frames: [
          {
            label: screen.label,
            description: screen.description,
            aspect: item.width / item.height,
            object: screen.object,
          },
        ],
      },
    };
  }

  // Icon set (e.g. Vision → Vault / Signer / Wallet), not a collection lens.
  if (resolved === "icon" && !media?.icon) {
    return {
      kind: "icon",
      project,
      media: {
        iconSet: {
          marks: CHIA_ICON_MARKS,
          poster: galleryPoster(item, foreground),
          alt: item.alt,
        },
      },
    };
  }

  return { kind: resolved, project, media: explicit === undefined || explicit === kind ? media : undefined };
}

function friendFrames(item: WorkItem, title: string) {
  const frames = [];

  for (const block of item.blocks ?? []) {
    switch (block.type) {
      case "bleed":
      case "frame":
        frames.push({
          aspect: block.frame.width / block.frame.height,
          label: title,
          description: block.frame.caption ?? block.frame.alt,
          object: { type: "image" as const, src: block.frame.src, alt: block.frame.alt, position: "center center" },
        });
        break;
      case "statement":
      case "essay":
      case "facts":
        break;
      default: {
        const unknown: never = block;
        return unknown;
      }
    }
  }

  if (frames.length > 0) {
    return frames;
  }

  return [
    {
      aspect: item.width / item.height,
      label: title,
      description: item.summary,
      object: { type: "image" as const, src: item.src, alt: item.alt ?? item.summary, position: "center center" },
    },
  ];
}

function workPresentation(
  item: WorkItem,
  _frame: HomeFrame,
  title: string,
  explicit: PresentationKind | undefined,
  stack: readonly GalleryItem[] = [],
): { kind: PresentationKind; project: PresentationProject; media?: PresentationMedia } {
  const project = {
    title,
    chips: [item.year, item.role, ...(item.tags ?? [])],
    href: `/work/${item.id}`,
    ...introFields(item.intro),
  };
  let kind: PresentationKind = "desktop";
  let media: PresentationMedia | undefined;
  const extras = stack.map((entry) => galleryDesktopFrame(entry));

  if (item.id === "chia-signer") {
    kind = "phone";
  } else if (item.id === "chia-friends") {
    kind = "desktop";
    media = {
      frames: [...friendFrames(item, title), ...extras],
      columns: extras.length > 0 ? 3 : undefined,
    };
  } else if (item.id === "philo") {
    // Hero, then site video (lands in the middle column), then plates + stack.
    media = {
      frames: [
        {
          aspect: item.width / item.height,
          label: title,
          description: item.summary,
          object: { type: "image" as const, src: item.src, alt: item.alt ?? item.summary, position: "center top" },
        },
        {
          aspect: 1440 / 900,
          label: "Site",
          description:
            "A jump cut through the Philo Ventures site, from the homepage through Explore, Build, Companies, and Team.",
          object: {
            type: "video" as const,
            src: "/media/work/philo.mp4",
            alt: "A jump cut through the Philo Ventures site, from the homepage through Explore, Build, Companies, and Team.",
            poster: "/media/work/philo-poster.jpg",
            play: "hover" as const,
            fit: "cover" as const,
          },
        },
        ...(item.plates ?? []).map((plate) => ({
          aspect: plate.width / plate.height,
          label: plate.label,
          description: plate.alt,
          object: { type: "image" as const, src: plate.src, alt: plate.alt, position: "center top" },
        })),
        ...extras,
      ],
      columns: 3,
    };
  } else {
    media = {
      frames: [
        {
          aspect: item.width / item.height,
          label: title,
          description: item.summary,
          object: { type: "image" as const, src: item.src, alt: item.alt ?? item.summary, position: "center top" },
        },
        ...(item.plates ?? []).map((plate) => ({
          aspect: plate.width / plate.height,
          label: plate.label,
          description: plate.alt,
          object: { type: "image" as const, src: plate.src, alt: plate.alt, position: "center top" },
        })),
        ...extras,
      ],
      columns: extras.length > 0 ? 3 : undefined,
    };
  }

  return { kind: explicit ?? kind, project, media: explicit === undefined || explicit === kind ? media : undefined };
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

  if (value.kind !== "gallery" && value.kind !== "work") {
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

  const explicit = readPresentation(value.presentation, `${where}.presentation`);
  const fill = readFill(value.fill, `${where}.fill`);

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

    const stack = readGalleryStack(value.stack, gallery, item.id, `${where}.stack`);

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

      const presented = galleryPresentation(item, value.frame, foreground, fit, explicit, stack, fill);
      return withPresentation(
        {
          ...card,
          background: readBackground(
            value.background,
            { type: "color", color: "#eeeeee" },
            `${where}.background`,
          ),
          foreground,
          hover: readHover(value.hover, `${where}.hover`),
        },
        presented.kind,
        { ...presented.project, title: card.label },
        presented.media,
        href.href ?? "",
        fill,
      );
    }

    const still = galleryStill(item);
    const layers =
      item.media === "video"
        ? playingVideo(readTileLayers(value, still, fit, where), item, fit, value.foreground)
        : readTileLayers(value, still, fit, where);
    const presented = galleryPresentation(item, value.frame, layers.foreground, fit, explicit, stack, fill);
    return withPresentation(
      { ...card, ...layers },
      presented.kind,
      { ...presented.project, title: card.label },
      presented.media,
      href.href ?? "",
      fill,
    );
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
  const stack = readGalleryStack(value.stack, gallery, item.id, `${where}.stack`);
  const presented = workPresentation(item, value.frame, title, explicit, stack);

  return withPresentation(
    {
      kind: "card",
      key: `work-${item.id}-presentation-${column}-${index}`,
      id: item.id,
      label: title,
      filter: value.filter,
      frame: value.frame,
      external: false,
      background: shown.background,
      hover: shown.hover,
      ...(shown.foreground ? { foreground: shown.foreground } : {}),
    },
    presented.kind,
    presented.project,
    presented.media,
    `/work/${item.id}`,
    fill,
  );
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
      play: "hover",
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
