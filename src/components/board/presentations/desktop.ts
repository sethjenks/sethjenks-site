import { placed } from "@/components/board/presentations/stage";
import type { PresentationSpec, PresentationTile } from "@/components/board/presentations/types";

const DESKTOP_CLOSED = { width: 532, height: 475 };
const DESKTOP_OPEN = { width: 1532, height: 862 };
const DESKTOP_GAP = 20;
const DESKTOP_PRIMARY = { x: 69, y: 85, width: 700, height: 520, radius: 36 };
const DESKTOP_FRAMES = [
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

export function desktopTiles(): PresentationTile[] {
  const gap = DESKTOP_GAP;
  const pad = 28;
  const heroFrame = DESKTOP_FRAMES[0];
  const hero = {
    x: DESKTOP_PRIMARY.x,
    y: DESKTOP_PRIMARY.y,
    width: DESKTOP_PRIMARY.width,
    height: DESKTOP_PRIMARY.height,
  };
  const rightX = hero.x + hero.width + gap;
  const innerRight = DESKTOP_OPEN.width - pad;
  const sideWidth = Math.floor((innerRight - rightX - gap) / 2);
  const columns = [
    { x: hero.x, width: hero.width, y: hero.y + hero.height + gap },
    { x: rightX, width: sideWidth, y: hero.y },
    { x: rightX + sideWidth + gap, width: sideWidth, y: hero.y },
  ];
  const cursor = columns.map((column) => column.y);
  const tiles: PresentationTile[] = [];

  if (heroFrame) {
    tiles.push({
      id: "d-hero",
      x: hero.x,
      y: hero.y,
      width: hero.width,
      height: hero.height,
      radius: DESKTOP_PRIMARY.radius,
      resting: true,
      ring: 0,
      shiftX: 0,
      shiftY: 0,
      image: heroFrame.src,
      imagePosition: heroFrame.position,
      aspect: heroFrame.aspect,
      label: heroFrame.label,
      description: heroFrame.description,
    });
  }

  DESKTOP_FRAMES.slice(1).forEach((frame, index) => {
    let columnIndex = 0;
    for (let i = 1; i < cursor.length; i += 1) {
      const top = cursor[i];
      if (top !== undefined && (cursor[columnIndex] === undefined || top < cursor[columnIndex])) {
        columnIndex = i;
      }
    }

    const column = columns[columnIndex];
    const y = cursor[columnIndex];
    if (!column || y === undefined) {
      return;
    }

    const height = Math.round(column.width / frame.aspect);
    tiles.push({
      id: `d-${columnIndex}-${index}`,
      x: column.x,
      y,
      width: column.width,
      height,
      radius: 0,
      resting: false,
      ring: Math.min(4, columnIndex + 1),
      shiftX: 0,
      shiftY: 0,
      image: frame.src,
      imagePosition: frame.position,
      aspect: frame.aspect,
      label: frame.label,
      description: frame.description,
    });
    cursor[columnIndex] = y + height + gap;
  });

  return tiles;
}

export function desktopPresentation(): PresentationSpec {
  return {
    id: "desktop",
    label: "Desktop",
    openLabel: "Expand the desktop view",
    project: { title: "Citrus Pear", chips: ["Brand"] },
    closed: placed(DESKTOP_CLOSED),
    open: placed(DESKTOP_OPEN),
    tiles: desktopTiles(),
  };
}
