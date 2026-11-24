import { APP_ICON_MARKS, type AppIconMark } from "@/components/app-icon";
import { placed } from "@/components/board/presentations/stage";
import type { PresentationProject, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";
import type { CollectionId } from "@/lib/collection-ids";

const PHONE_OPEN = { width: 1532, height: 862 };
const ICON_CLOSED = { width: 400, height: 400 };
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
};

function collectionIconTile(poster: string, title: string): PresentationTile {
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
    media: { layers: [{ kind: "image", src: poster, position: "center", fit: "cover" }] },
    label: title,
    description: title,
  };
}

export function iconPresentation(
  project: PresentationProject = ICON_PROJECT,
  source?: IconCollectionInput,
): PresentationSpec {
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
      tiles: [collectionIconTile(source.poster, source.title)],
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
