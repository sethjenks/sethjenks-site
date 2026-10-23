import { getPointsFromDrawSegment, type Editor, type TLShapeId } from "tldraw";
import { highestPoint, inkPath, resample, strokeCenter } from "./ink";
import type { InkPoint, InkStroke, MonsterDrawing, VisualStroke } from "./types";

const STROKE_SIZES = {
  s: 1,
  m: 1.75,
  l: 2.5,
  xl: 5,
} as const;

const INK_COLORS: Record<string, string> = {
  black: "#1d1d1d",
  blue: "#4465e9",
  green: "#099268",
  grey: "#9fa8b2",
  "light-blue": "#4ba1f1",
  "light-green": "#4cb05e",
  "light-red": "#f87777",
  "light-violet": "#e085f4",
  orange: "#e16919",
  red: "#e03131",
  violet: "#ae3ec9",
  yellow: "#f1ac4b",
  white: "#1d1d1d",
};

type DrawProps = {
  segments: Parameters<typeof getPointsFromDrawSegment>[0][];
  color: string;
  size: keyof typeof STROKE_SIZES;
  scale: number;
  scaleX: number;
  scaleY: number;
  isClosed: boolean;
};

function isDrawShape(shape: { type: string; props: unknown }): shape is { type: "draw"; id: TLShapeId; props: DrawProps } {
  if (shape.type !== "draw" || !shape.props || typeof shape.props !== "object") {
    return false;
  }
  return "segments" in shape.props;
}

function inkColor(name: string): string {
  return INK_COLORS[name] ?? "#1d1d1d";
}

function pageWidth(size: keyof typeof STROKE_SIZES, scale: number): number {
  return 2 * STROKE_SIZES[size] * scale;
}

export function extractDrawing(editor: Editor, ids?: readonly string[]): MonsterDrawing | null {
  const shapeIds: TLShapeId[] = ids
    ? ids.map((id) => id as TLShapeId)
    : [...editor.getSelectedShapeIds()];
  const pageStrokes: InkStroke[] = [];
  const screenPoints = new Map<string, InkPoint[]>();
  const colors = new Map<string, string>();
  const widths = new Map<string, number>();
  let screenWidth = 2;

  for (const id of shapeIds) {
    const shape = editor.getShape(id);
    if (!shape || !isDrawShape(shape)) {
      continue;
    }
    const props = shape.props;
    const size = props.size in STROKE_SIZES ? props.size : "m";
    const width = pageWidth(size, props.scale || 1);
    const color = inkColor(props.color);
    const origin = editor.pageToScreen({ x: 0, y: 0 });
    const unit = editor.pageToScreen({ x: width, y: 0 });
    const pxWidth = Math.max(1.25, Math.hypot(unit.x - origin.x, unit.y - origin.y));
    screenWidth = Math.max(screenWidth, pxWidth);
    const transform = editor.getShapePageTransform(shape.id);

    props.segments.forEach((segment, index) => {
      const local = getPointsFromDrawSegment(segment, props.scaleX || 1, props.scaleY || 1, []);
      if (local.length === 0) {
        return;
      }
      const strokeId = `${shape.id}:${index}`;
      const page: InkPoint[] = [];
      const screen: InkPoint[] = [];
      for (const point of local) {
        const onPage = transform.applyToPoint(point);
        page.push({ x: onPage.x, y: onPage.y });
        const onScreen = editor.pageToScreen(onPage);
        screen.push({ x: onScreen.x, y: onScreen.y });
      }
      pageStrokes.push({
        id: strokeId,
        points: resample(page, 80),
        width,
        color,
        closed: props.isClosed && props.segments.length === 1,
      });
      screenPoints.set(strokeId, resample(screen, 80));
      colors.set(strokeId, color);
      widths.set(strokeId, pxWidth);
    });
  }

  if (pageStrokes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const points of screenPoints.values()) {
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  const pad = screenWidth / 2 + 2;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  let pageMinX = Infinity;
  let pageMinY = Infinity;
  for (const stroke of pageStrokes) {
    for (const point of stroke.points) {
      pageMinX = Math.min(pageMinX, point.x);
      pageMinY = Math.min(pageMinY, point.y);
    }
  }

  const strokes = pageStrokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      x: point.x - pageMinX,
      y: point.y - pageMinY,
    })),
  }));

  const visual: VisualStroke[] = strokes.map((stroke) => {
    const points = (screenPoints.get(stroke.id) ?? []).map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    }));
    const hip = highestPoint(points);
    const center = strokeCenter(points);
    const dot = points.length < 2 ? (points[0] ?? { x: 0, y: 0 }) : null;
    return {
      id: stroke.id,
      d: inkPath(points),
      width: widths.get(stroke.id) ?? 2,
      color: colors.get(stroke.id) ?? "#1d1d1d",
      hipX: hip.x,
      hipY: hip.y,
      cx: center.x,
      cy: center.y,
      dot,
    };
  });

  return {
    strokes,
    visual,
    screenBox: {
      x: minX,
      y: minY,
      w: Math.max(8, maxX - minX),
      h: Math.max(8, maxY - minY),
    },
    shapeIds: [...new Set(shapeIds.filter((id) => editor.getShape(id)?.type === "draw"))],
  };
}
