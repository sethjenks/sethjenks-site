import { placed } from "@/components/board/presentations/stage";
import { faceMedia, fittedTile, type TileFaceMedia } from "@/components/board/presentations/tile-fit";
import type {
  PresentationProject,
  PresentationSpec,
  PresentationTile,
} from "@/components/board/presentations/types";

export type WidgetOrientation = "landscape" | "portrait";

export type WidgetInput = {
  face: TileFaceMedia;
  frame: { width: number; height: number };
};

const WIDGET_GAP = 32;
const WIDGET_RADIUS = 32;
const WIDGET_LANDSCAPE = { width: 400, height: 252 };
const WIDGET_PORTRAIT = { width: 252, height: 400 };
const WIDGET_LANDSCAPE_CLOSED = { width: 520, height: 360 };
const WIDGET_PORTRAIT_CLOSED = { width: 360, height: 520 };
const PHONE_OPEN = { width: 1532, height: 862 };

export function widgetOrientationFor(frame: { width: number; height: number }): WidgetOrientation {
  return frame.width >= frame.height ? "landscape" : "portrait";
}

export function widgetTiles(orientation: WidgetOrientation): PresentationTile[] {
  const landscape = orientation === "landscape";
  const size = landscape ? WIDGET_LANDSCAPE : WIDGET_PORTRAIT;
  const closed = landscape ? WIDGET_LANDSCAPE_CLOSED : WIDGET_PORTRAIT_CLOSED;
  const columns = landscape ? 3 : 5;
  const rows = landscape ? 6 : 4;
  const primaryCol = Math.floor(columns / 2);
  const primaryRow = landscape ? 1 : 0;
  const strideX = size.width + WIDGET_GAP;
  const strideY = size.height + WIDGET_GAP;
  const originX = (PHONE_OPEN.width - (columns * size.width + (columns - 1) * WIDGET_GAP)) / 2;
  const originY = landscape ? (PHONE_OPEN.height - size.height) / 2 - primaryRow * strideY : 64;
  const closedX = (closed.width - size.width) / 2;
  const closedY = (closed.height - size.height) / 2;
  const tiles: PresentationTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const primary = col === primaryCol && row === primaryRow;
      const distance = Math.hypot(col - primaryCol, row - primaryRow);
      const ring = distance < 1.5 ? 1 : distance < 2.5 ? 2 : distance < 3.5 ? 3 : 4;

      tiles.push({
        id: `w-${orientation[0]}-${col}-${row}`,
        x: originX + col * strideX,
        y: originY + row * strideY,
        width: size.width,
        height: size.height,
        radius: WIDGET_RADIUS,
        resting: primary,
        ring: primary ? 0 : ring,
        shiftX: primary ? closedX - (originX + col * strideX) : 0,
        shiftY: primary ? closedY - (originY + row * strideY) : 0,
        label: "Widget",
        description: landscape ? "A widget, wider than it is tall." : "A widget, taller than it is wide.",
      });
    }
  }

  return tiles;
}

export function widgetPresentation(
  orientation: WidgetOrientation,
  project: PresentationProject = { title: "Widget", chips: [] },
  input?: WidgetInput,
): PresentationSpec {
  const closedSize = input?.frame
    ? input.frame
    : orientation === "landscape"
      ? WIDGET_LANDSCAPE_CLOSED
      : WIDGET_PORTRAIT_CLOSED;

  // Lab study: silhouette grid. Project cards: only real faces — no empty black tiles.
  if (!input) {
    return {
      id: "widget",
      label: "Widget",
      openLabel: "Expand the widget",
      project,
      closed: placed(closedSize),
      open: placed(PHONE_OPEN),
      tiles: widgetTiles(orientation),
    };
  }

  const face = input.face;
  const aspect = face.width / face.height;
  const fit = fittedTile(input.frame, aspect, "widget", face.label, face.description);
  const size = orientation === "landscape" ? WIDGET_LANDSCAPE : WIDGET_PORTRAIT;

  return {
    id: "widget",
    label: "Widget",
    openLabel: "Expand the widget",
    project,
    closed: placed(closedSize),
    open: placed(PHONE_OPEN),
    tiles: [
      {
        id: "widget",
        x: (PHONE_OPEN.width - size.width) / 2,
        y: (PHONE_OPEN.height - size.height) / 2,
        width: size.width,
        height: size.height,
        radius: fit.radius,
        resting: true,
        ring: 0,
        shiftX: 0,
        shiftY: 0,
        closedX: fit.x,
        closedY: fit.y,
        closedWidth: fit.width,
        closedHeight: fit.height,
        media: faceMedia(face),
        aspect,
        label: face.label,
        description: face.description,
      },
    ],
  };
}
