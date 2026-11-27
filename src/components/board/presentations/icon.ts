import { APP_ICON_MARKS, type AppIconMark } from "@/components/app-icon";
import { placed } from "@/components/board/presentations/stage";
import type { PresentationProject, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";
import type { CollectionId } from "@/lib/collection-ids";

const PHONE_OPEN = { width: 1532, height: 862 };
const ICON_CLOSED = { width: 400, height: 400 };
/** Match `iconDockClosed` in icon-dock.tsx — kept here so this module stays server-safe. */
const ICON_DOCK_CLOSED = { width: 700, height: 480 };
const ICON_SIZE = 256;
const ICON_GAP = 32;
const ICON_ROUNDED_RADIUS = Math.round((ICON_SIZE * 280) / 1024);
const ICON_META: Record<AppIconMark, { label: string; description: string }> = {
  vault: {
    label: "Vault",
    description: "Open brackets around a center square.",
  },
  signer: {
    label: "Signer",
    description: "A ribbon mark that reads like a linked S.",
  },
  wallet: {
    label: "Wallet",
    description: "Three segments meeting in a triangular gap.",
  },
};

/** The three Chia product icons — Vault, Signer, Wallet. */
export const CHIA_ICON_MARKS = APP_ICON_MARKS;

export function iconTiles(): PresentationTile[] {
  const tiles: PresentationTile[] = [];
  const primaryCol = 2;
  const primaryRow = 1;
  const closedX = (ICON_CLOSED.width - ICON_SIZE) / 2;
  const closedY = (ICON_CLOSED.height - ICON_SIZE) / 2;

  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const x = 48 + col * (ICON_SIZE + ICON_GAP);
      const y = 72 + row * (ICON_SIZE + ICON_GAP);
      const seenW = Math.min(x + ICON_SIZE, PHONE_OPEN.width) - Math.max(x, 0);

      if (seenW < 96) {
        continue;
      }

      const primary = col === primaryCol && row === primaryRow;
      const mark: AppIconMark = primary ? "vault" : APP_ICON_MARKS[(col + row * 2) % APP_ICON_MARKS.length];
      const meta = ICON_META[mark];

      tiles.push({
        id: `i-${col}-${row}`,
        x,
        y,
        width: ICON_SIZE,
        height: ICON_SIZE,
        radius: ICON_ROUNDED_RADIUS,
        resting: primary,
        ring: Math.max(Math.abs(col - primaryCol), Math.abs(row - primaryRow)),
        shiftX: primary ? closedX - x : 0,
        shiftY: primary ? closedY - y : 0,
        icon: { mark, rounded: true },
        label: meta.label,
        description: meta.description,
      });
    }
  }

  return tiles;
}

const ICON_PROJECT: PresentationProject = { title: "Vault", chips: ["Brand"] };

export type IconCollectionInput = {
  id: CollectionId;
  poster: string;
  title: string;
  alt?: string;
};

/** A short set of App Icons (e.g. the three Chia marks). Optional poster is the closed face. */
export type IconSetInput = {
  marks: readonly AppIconMark[];
  poster?: string;
  alt?: string;
};

export type IconSource = IconCollectionInput | IconSetInput;

function isIconSet(source: IconSource): source is IconSetInput {
  return "marks" in source;
}

function collectionIconTile(poster: string, title: string, alt = title): PresentationTile {
  const x = (ICON_CLOSED.width - ICON_SIZE) / 2;
  const y = (ICON_CLOSED.height - ICON_SIZE) / 2;

  return {
    id: "icon",
    x,
    y,
    width: ICON_SIZE,
    height: ICON_SIZE,
    radius: ICON_ROUNDED_RADIUS,
    resting: true,
    ring: 0,
    shiftX: 0,
    shiftY: 0,
    aspect: 1,
    media: { layers: [{ kind: "image", src: poster, alt, position: "center", fit: "cover" }] },
    label: title,
    description: title,
  };
}

/** Centered row of marks. Poster (if any) paints the resting face while closed. */
export function iconSetTiles(
  marks: readonly AppIconMark[] = CHIA_ICON_MARKS,
  poster?: string,
  posterAlt = "",
): PresentationTile[] {
  const count = Math.max(1, marks.length);
  const totalW = count * ICON_SIZE + (count - 1) * ICON_GAP;
  const originX = (PHONE_OPEN.width - totalW) / 2;
  const originY = (PHONE_OPEN.height - ICON_SIZE) / 2;
  const primaryIndex = Math.floor((count - 1) / 2);
  const closedX = (ICON_CLOSED.width - ICON_SIZE) / 2;
  const closedY = (ICON_CLOSED.height - ICON_SIZE) / 2;

  return marks.map((mark, index) => {
    const primary = index === primaryIndex;
    const meta = ICON_META[mark];
    const x = originX + index * (ICON_SIZE + ICON_GAP);

    return {
      id: `i-${mark}-${index}`,
      x,
      y: originY,
      width: ICON_SIZE,
      height: ICON_SIZE,
      radius: ICON_ROUNDED_RADIUS,
      resting: primary,
      ring: Math.abs(index - primaryIndex),
      shiftX: primary ? closedX - x : 0,
      shiftY: primary ? closedY - originY : 0,
      icon: { mark, rounded: true },
      ...(primary && poster
        ? {
            media: {
              layers: [
                {
                  kind: "image" as const,
                  src: poster,
                  alt: posterAlt || meta.description,
                  position: "center",
                  fit: "cover" as const,
                },
              ],
            },
          }
        : {}),
      aspect: 1,
      label: meta.label,
      description: meta.description,
    };
  });
}

export function iconPresentation(
  project: PresentationProject = ICON_PROJECT,
  source?: IconSource,
): PresentationSpec {
  if (source && isIconSet(source)) {
    return {
      id: "icon",
      label: "Icon",
      openLabel: "Expand the dock",
      project,
      dock: true,
      closed: placed(ICON_DOCK_CLOSED),
      open: placed(PHONE_OPEN),
      tiles: iconSetTiles(source.marks, source.poster, source.alt),
    };
  }

  if (source) {
    return {
      id: "icon",
      label: "Icon",
      openLabel: "Expand the icon",
      project,
      lens: true,
      collection: { id: source.id, poster: source.poster, title: source.title },
      closed: placed(ICON_CLOSED),
      open: placed(PHONE_OPEN),
      tiles: [collectionIconTile(source.poster, source.title, source.alt || source.title)],
    };
  }

  return {
    id: "icon",
    label: "Icon",
    openLabel: "Expand the icon",
    project,
    closed: placed(ICON_CLOSED),
    open: placed(PHONE_OPEN),
    tiles: iconTiles(),
  };
}
