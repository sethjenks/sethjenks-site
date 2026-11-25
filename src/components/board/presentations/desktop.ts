import { keyObjectMedia, type KeyObject } from "@/components/board/presentations/key-object";
import { placed } from "@/components/board/presentations/stage";
import type { PresentationProject, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";

/** Text section in a desktop masonry. Not a resting face. */
export type CopyObject = {
  type: "copy";
  title?: string;
  body: string;
};

export type DesktopObject = KeyObject | CopyObject;

export type DesktopFrameInput = {
  label: string;
  description: string;
  /** Media aspect. Copy frames ignore this; height comes from the text. */
  aspect: number;
  object: DesktopObject;
};

const COPY_PAD = 28;
const COPY_TITLE_SIZE = 22;
const COPY_TITLE_LEADING = 1.2;
const COPY_BODY_SIZE = 16;
const COPY_BODY_LEADING = 1.55;
const COPY_GAP = 12;
const COPY_MIN_HEIGHT = 180;
/** Keep a copy tile from swallowing a column. */
export const COPY_BODY_MAX = 420;

export type DesktopLayout = "masonry" | "split" | "banner";

export type DesktopOptions = {
  /** Open feed columns. 1 = full-width stack (default); 3 = masonry columns. */
  columns?: number;
  /** Closed shell size. Defaults to the landscape desktop card. */
  closed?: { width: number; height: number };
  /**
   * masonry: shortest-column feed.
   * split: centered image-left / text-right rows. Frames alternate media, copy.
   * banner: the last frame spans the width at the top; earlier frames share the row below.
   */
  layout?: DesktopLayout;
};

type DesktopFrameCatalog = {
  src: string;
  position: string;
  aspect: number;
  label: string;
  description: string;
};

const DESKTOP_PROJECT: PresentationProject = { title: "Citrus Pear", chips: ["Brand"] };

const DESKTOP_CLOSED = { width: 532, height: 475 };
const DESKTOP_OPEN = { width: 1532, height: 862 };
const DESKTOP_GAP = 20;
/** Centered process row: not the full open stage. */
const SPLIT_ROW_WIDTH = 1080;
const SPLIT_GAP = 36;
const SPLIT_ROW_GAP = 40;
const SPLIT_TOP = 28;
const SPLIT_IMAGE_SHARE = 0.58;
const SPLIT_RADIUS = 20;
const DESKTOP_PRIMARY = { x: 69, y: 85, width: 700, height: 520, radius: 36 };
const DESKTOP_FRAMES: DesktopFrameCatalog[] = [
  {
    src: "/media/card/desk-impeccable.png",
    position: "left top",
    aspect: 1400 / 907,
    label: "Workspace",
    description: "The brand workspace, open on Voice for Citrus Pear.",
  },
  {
    src: "/media/card/desk-page.png",
    position: "left top",
    aspect: 2048 / 2128,
    label: "Voice",
    description: "Tone, what to avoid, and the principles behind the brand.",
  },
  {
    src: "/media/card/desk-nav.png",
    position: "left top",
    aspect: 480 / 2112,
    label: "Chapters",
    description: "The guide, from strategy through templates.",
  },
  {
    src: "/media/card/desk-brandon.png",
    position: "center 62%",
    aspect: 880 / 794,
    label: "Brand Agent",
    description: "A panel for drafting the next section with the agent.",
  },
  {
    src: "/media/card/desk-buttons.png",
    position: "center 78%",
    aspect: 880 / 360,
    label: "Buttons",
    description: "Preview, publish, and invite, in a small row of actions.",
  },
  {
    src: "/media/card/desk-fields.png",
    position: "center top",
    aspect: 880 / 510,
    label: "Guide fields",
    description: "Tone, avoid, and principles as separate fields.",
  },
  {
    src: "/media/card/desk-workspace.png",
    position: "left top",
    aspect: 1200 / 750,
    label: "Agent",
    description: "The workspace with the brand agent open.",
  },
];

function isCopyObject(object: DesktopObject): object is CopyObject {
  return object.type === "copy";
}

/** One-liner for a text tile any desktop card can drop into its frame list. */
export function copyFrame(input: { body: string; title?: string; label?: string }): DesktopFrameInput {
  const body = input.body.trim();
  if (body.length === 0 || body.length > COPY_BODY_MAX) {
    throw new Error(`A copy frame needs 1–${COPY_BODY_MAX} characters.`);
  }
  const title = input.title?.trim();
  return {
    label: input.label ?? title ?? "Note",
    description: body,
    aspect: 1,
    object: title ? { type: "copy", title, body } : { type: "copy", body },
  };
}

/** One-liner for an embed tile, including an in-card interactive rebuild. */
export function embedFrame(input: {
  src: string;
  title: string;
  label: string;
  description: string;
  width: number;
  height: number;
}): DesktopFrameInput {
  return {
    label: input.label,
    description: input.description,
    aspect: input.width / input.height,
    object: { type: "embed", src: input.src, title: input.title },
  };
}

/** One-liner for an image tile beside copy or other media. */
export function imageFrame(input: {
  src: string;
  label: string;
  description: string;
  width: number;
  height: number;
  position?: string;
  fit?: "cover" | "contain";
}): DesktopFrameInput {
  return {
    label: input.label,
    description: input.description,
    aspect: input.width / input.height,
    object: {
      type: "image",
      src: input.src,
      position: input.position ?? "center center",
      fit: input.fit,
    },
  };
}

/** Height of a copy tile from its text, at the masonry column width. */
export function copyTileHeight(body: string, title: string | undefined, width: number): number {
  const inner = Math.max(120, width - COPY_PAD * 2);
  const bodyChars = Math.max(18, Math.floor(inner / (COPY_BODY_SIZE * 0.48)));
  const titleChars = Math.max(12, Math.floor(inner / (COPY_TITLE_SIZE * 0.52)));
  const bodyLines = body.split("\n").reduce((lines, row) => lines + Math.max(1, Math.ceil(row.length / bodyChars)), 0);
  const titleLines = title
    ? title.split("\n").reduce((lines, row) => lines + Math.max(1, Math.ceil(row.length / titleChars)), 0)
    : 0;
  const height =
    COPY_PAD * 2 +
    (titleLines > 0 ? titleLines * COPY_TITLE_SIZE * COPY_TITLE_LEADING + COPY_GAP : 0) +
    bodyLines * COPY_BODY_SIZE * COPY_BODY_LEADING;
  return Math.max(COPY_MIN_HEIGHT, Math.round(height));
}

function toDesktopFrameInput(frame: DesktopFrameCatalog | DesktopFrameInput): DesktopFrameInput {
  if ("object" in frame) {
    return frame;
  }

  return {
    label: frame.label,
    description: frame.description,
    aspect: frame.aspect,
    object: { type: "image", src: frame.src, position: frame.position },
  };
}

const BANNER_RADIUS = 24;

/**
 * Last frame is a full-width band. Earlier frames share one row under it.
 * The first frame stays the resting cover.
 */
function bannerTiles(frames: readonly (DesktopFrameCatalog | DesktopFrameInput)[]): PresentationTile[] {
  const inputs = frames.map(toDesktopFrameInput);
  if (inputs.some((frame) => isCopyObject(frame.object))) {
    throw new Error("A banner layout is media only.");
  }

  const banner = inputs[inputs.length - 1];
  if (!banner) {
    return [];
  }

  const row = inputs.slice(0, -1);
  const width = DESKTOP_OPEN.width;
  const bannerHeight = frameHeight(banner, width, false);
  const tiles: PresentationTile[] = [];

  const push = (frame: DesktopFrameInput, placement: { id: string; x: number; y: number; width: number; height: number; resting: boolean; index: number }) => {
    const tile: PresentationTile = {
      id: placement.id,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      radius: BANNER_RADIUS,
      openRadius: BANNER_RADIUS,
      resting: placement.resting,
      ring: Math.min(4, placement.index),
      shiftX: 0,
      shiftY: 0,
      ...frameFace(frame),
      aspect: placement.width / placement.height,
      label: frame.label,
      description: frame.description,
    };

    if (placement.resting) {
      tile.closedX = DESKTOP_PRIMARY.x;
      tile.closedY = DESKTOP_PRIMARY.y;
      tile.closedWidth = DESKTOP_PRIMARY.width;
      tile.closedHeight = DESKTOP_PRIMARY.height;
    }

    tiles.push(tile);
  };

  if (row.length === 0) {
    push(banner, { id: "d-hero", x: 0, y: 0, width, height: bannerHeight, resting: true, index: 0 });
    return tiles;
  }

  const rowWidth = Math.floor((width - DESKTOP_GAP * (row.length - 1)) / row.length);
  const rowY = bannerHeight + DESKTOP_GAP;

  row.forEach((frame, index) => {
    const height = frameHeight(frame, rowWidth, index === 0);
    push(frame, {
      id: index === 0 ? "d-hero" : `d-${index}`,
      x: index * (rowWidth + DESKTOP_GAP),
      y: rowY,
      width: rowWidth,
      height,
      resting: index === 0,
      index,
    });
  });

  push(banner, {
    id: "d-banner",
    x: 0,
    y: 0,
    width,
    height: bannerHeight,
    resting: false,
    index: inputs.length - 1,
  });

  return tiles;
}

/** Classic masonry: each item drops into the shortest column. */
function shortestColumn(heights: number[]): number {
  let index = 0;
  for (let i = 1; i < heights.length; i += 1) {
    if (heights[i]! < heights[index]!) {
      index = i;
    }
  }
  return index;
}

export function desktopTiles(
  frames: readonly (DesktopFrameCatalog | DesktopFrameInput)[] = DESKTOP_FRAMES,
  columns = 1,
  layout: DesktopLayout = "masonry",
): PresentationTile[] {
  switch (layout) {
    case "split":
      return splitTiles(frames);
    case "banner":
      return bannerTiles(frames);
    case "masonry":
      break;
    default: {
      const unreachable: never = layout;
      return unreachable;
    }
  }

  const cols = Math.max(1, Math.floor(columns));
  const width =
    cols === 1
      ? DESKTOP_OPEN.width
      : Math.floor((DESKTOP_OPEN.width - DESKTOP_GAP * (cols - 1)) / cols);
  const heights = Array.from({ length: cols }, () => 0);

  return frames.map((entry, index) => {
    const frame = toDesktopFrameInput(entry);
    const primary = index === 0;
    if (primary && isCopyObject(frame.object)) {
      throw new Error("The first desktop frame must be media. A copy tile cannot be the resting face.");
    }
    const height = frameHeight(frame, width, primary);
    const col = cols === 1 ? 0 : shortestColumn(heights);
    const x = col * (width + DESKTOP_GAP);
    const y = heights[col]!;
    const tile: PresentationTile = {
      id: primary ? "d-hero" : `d-${index}`,
      x,
      y,
      width,
      height,
      radius: primary && cols === 1 ? DESKTOP_PRIMARY.radius : cols > 1 ? 16 : 0,
      resting: primary,
      ring: Math.min(4, index),
      shiftX: 0,
      shiftY: 0,
      ...frameFace(frame),
      aspect: width / height,
      label: frame.label,
      description: frame.description,
    };

    if (primary) {
      // Closed face keeps the classic inset desktop window even when open is masonry.
      tile.closedX = DESKTOP_PRIMARY.x;
      tile.closedY = DESKTOP_PRIMARY.y;
      tile.closedWidth = DESKTOP_PRIMARY.width;
      tile.closedHeight = DESKTOP_PRIMARY.height;
    }

    heights[col] = y + height + DESKTOP_GAP;
    return tile;
  });
}

/** Image on the left, copy on the right, the pair centered in the open stage. */
function splitTiles(frames: readonly (DesktopFrameCatalog | DesktopFrameInput)[]): PresentationTile[] {
  const inputs = frames.map(toDesktopFrameInput);
  const imageWidth = Math.round(SPLIT_ROW_WIDTH * SPLIT_IMAGE_SHARE);
  const textWidth = SPLIT_ROW_WIDTH - imageWidth - SPLIT_GAP;
  const originX = (DESKTOP_OPEN.width - SPLIT_ROW_WIDTH) / 2;
  const tiles: PresentationTile[] = [];
  let y = SPLIT_TOP;
  let index = 0;

  while (index < inputs.length) {
    const frame = inputs[index]!;
    if (isCopyObject(frame.object)) {
      throw new Error("A split row starts with an image, video, or embed, then its copy.");
    }

    const next = inputs[index + 1];
    const copyFrameInput = next && isCopyObject(next.object) ? next : undefined;
    // An unpaired embed is the hero stage: the full centered row, not the image column.
    const span = frame.object.type === "embed" && !copyFrameInput;
    const tileWidth = span ? SPLIT_ROW_WIDTH : imageWidth;
    const imageHeight = Math.max(1, Math.round(tileWidth / frame.aspect));
    const textHeight = copyFrameInput && isCopyObject(copyFrameInput.object)
      ? copyTileHeight(copyFrameInput.object.body, copyFrameInput.object.title, textWidth)
      : 0;
    const rowHeight = Math.max(imageHeight, textHeight);
    const primary = tiles.length === 0;

    tiles.push({
      id: primary ? "d-hero" : `d-${tiles.length}`,
      x: originX,
      y,
      width: tileWidth,
      height: rowHeight,
      radius: SPLIT_RADIUS,
      // Fill squares the closed cover. Keep this radius once the card is open.
      openRadius: SPLIT_RADIUS,
      resting: primary,
      ring: Math.min(4, Math.floor(tiles.length / 2)),
      shiftX: 0,
      shiftY: 0,
      ...frameFace(frame),
      aspect: tileWidth / rowHeight,
      label: frame.label,
      description: frame.description,
      ...(primary
        ? {
            closedX: DESKTOP_PRIMARY.x,
            closedY: DESKTOP_PRIMARY.y,
            closedWidth: DESKTOP_PRIMARY.width,
            closedHeight: DESKTOP_PRIMARY.height,
          }
        : {}),
    });

    if (copyFrameInput) {
      tiles.push({
        id: `d-${tiles.length}`,
        x: originX + imageWidth + SPLIT_GAP,
        y,
        width: textWidth,
        height: rowHeight,
        radius: 0,
        resting: false,
        ring: Math.min(4, Math.floor(tiles.length / 2)),
        shiftX: 0,
        shiftY: 0,
        ...frameFace(copyFrameInput),
        aspect: textWidth / rowHeight,
        label: copyFrameInput.label,
        description: copyFrameInput.description,
      });
    }

    y += rowHeight + SPLIT_ROW_GAP;
    index += copyFrameInput ? 2 : 1;
  }

  return tiles;
}

function frameHeight(frame: DesktopFrameInput, width: number, primary: boolean): number {
  const object = frame.object;
  switch (object.type) {
    case "copy":
      if (primary) {
        throw new Error("The first desktop frame must be media. A copy tile cannot be the resting face.");
      }
      return copyTileHeight(object.body, object.title, width);
    case "image":
    case "video":
    case "embed":
      return Math.max(1, Math.round(width / frame.aspect));
    default: {
      const unreachable: never = object;
      return unreachable;
    }
  }
}

function frameFace(frame: DesktopFrameInput): Pick<PresentationTile, "media" | "copy"> {
  const object = frame.object;
  switch (object.type) {
    case "copy":
      return { copy: object.title ? { title: object.title, body: object.body } : { body: object.body } };
    case "image":
    case "video":
    case "embed":
      return { media: keyObjectMedia(object) };
    default: {
      const unreachable: never = object;
      return unreachable;
    }
  }
}

export function desktopPresentation(
  project: PresentationProject = DESKTOP_PROJECT,
  frames?: readonly DesktopFrameInput[],
  options?: DesktopOptions,
): PresentationSpec {
  const columns = options?.columns ?? 1;
  const closed = options?.closed ?? DESKTOP_CLOSED;
  const layout = options?.layout ?? "masonry";

  return {
    id: "desktop",
    label: "Desktop",
    openLabel: "Expand the desktop view",
    project,
    closed: placed(closed),
    open: placed(DESKTOP_OPEN),
    tiles: desktopTiles(frames, columns, layout),
  };
}
