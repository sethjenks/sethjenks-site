import { keyObjectMedia, type KeyObject } from "@/components/board/presentations/key-object";
import { placed } from "@/components/board/presentations/stage";
import type { PresentationProject, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";

export type DesktopFrameInput = {
  label: string;
  description: string;
  aspect: number;
  object: KeyObject;
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

export function desktopTiles(
  frames: readonly (DesktopFrameCatalog | DesktopFrameInput)[] = DESKTOP_FRAMES,
): PresentationTile[] {
  const width = DESKTOP_OPEN.width;
  let y = 0;

  return frames.map((entry, index) => {
    const frame = toDesktopFrameInput(entry);
    const height = Math.max(1, Math.round(width / frame.aspect));
    const primary = index === 0;
    const tile: PresentationTile = {
      id: primary ? "d-hero" : `d-${index}`,
      x: 0,
      y,
      width,
      height,
      radius: primary ? DESKTOP_PRIMARY.radius : 0,
      resting: primary,
      ring: Math.min(4, index),
      shiftX: 0,
      shiftY: 0,
      media: keyObjectMedia(frame.object),
      aspect: frame.aspect,
      label: frame.label,
      description: frame.description,
    };

    if (primary) {
      tile.closedX = DESKTOP_PRIMARY.x;
      tile.closedY = DESKTOP_PRIMARY.y;
      tile.closedWidth = DESKTOP_PRIMARY.width;
      tile.closedHeight = DESKTOP_PRIMARY.height;
    }

    y += height + DESKTOP_GAP;
    return tile;
  });
}

export function desktopPresentation(
  project: PresentationProject = DESKTOP_PROJECT,
  frames?: readonly DesktopFrameInput[],
): PresentationSpec {
  return {
    id: "desktop",
    label: "Desktop",
    openLabel: "Expand the desktop view",
    project,
    closed: placed(DESKTOP_CLOSED),
    open: placed(DESKTOP_OPEN),
    tiles: desktopTiles(frames),
  };
}
