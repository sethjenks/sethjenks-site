import type { AppIconMark } from "@/components/app-icon";
import type { CardMedia } from "@/components/board/card-media";
import type { CollectionId } from "@/lib/collection-ids";

export const PRESENTATION_KINDS = ["phone", "desktop", "widget", "icon"] as const;

export type PresentationKind = (typeof PRESENTATION_KINDS)[number];

export type PresentationFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PresentationBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PresentationTile = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius in layout units at the resting size; open scales it with the tile. */
  radius: number;
  /**
   * Open corner radius when the closed fill face stays square.
   * Fill cards zero `radius` so the cover meets the shell edge.
   */
  openRadius?: number;
  resting: boolean;
  ring: number;
  shiftX: number;
  shiftY: number;
  /** Closed-shell placement when the open feed uses a different size. */
  closedX?: number;
  closedY?: number;
  closedWidth?: number;
  closedHeight?: number;
  image?: string;
  imagePosition?: string;
  aspect?: number;
  media?: CardMedia;
  /** Text tile in a desktop masonry. Not a resting face. */
  copy?: {
    title?: string;
    body: string;
  };
  icon?: {
    mark: AppIconMark;
    rounded: boolean;
  };
  label: string;
  description: string;
};

export type PresentationProject = {
  title: string;
  chips: readonly string[];
  href?: string;
};

export type PresentationCollection = {
  id: CollectionId;
  poster: string;
  title: string;
};

export type PresentationSpec = {
  id: PresentationKind;
  label: string;
  openLabel: string;
  project: PresentationProject;
  closed: PresentationFrame;
  open: PresentationFrame;
  tiles: PresentationTile[];
  /** Open this icon study as the fisheye lens. */
  lens?: boolean;
  /** Open this icon study as the glass icon dock. */
  dock?: boolean;
  collection?: PresentationCollection;
  /**
   * Resting hero fills the closed shell edge-to-edge with no content radius.
   * The card shell still clips the corners. Open layout is unchanged.
   */
  fill?: boolean;
};

export function isPresentationKind(value: unknown): value is PresentationKind {
  return typeof value === "string" && PRESENTATION_KINDS.some((kind) => kind === value);
}

/** Make the resting tile fill the closed shell; open mosaic / lens stay as authored. */
export function withFill(spec: PresentationSpec, fill: boolean): PresentationSpec {
  if (!fill) {
    return spec.fill ? { ...spec, fill: false } : spec;
  }

  return {
    ...spec,
    fill: true,
    tiles: spec.tiles.map((tile) => {
      if (!tile.resting) {
        return tile;
      }

      return {
        ...tile,
        radius: 0,
        closedX: 0,
        closedY: 0,
        closedWidth: spec.closed.width,
        closedHeight: spec.closed.height,
        shiftX: 0,
        shiftY: 0,
      };
    }),
  };
}
