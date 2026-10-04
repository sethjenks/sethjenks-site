import { decodeTones, cellHash, clamp } from "./math";
import { drawMark, enabledMarkKinds, pickMarkKind } from "./marks";
import type { PlatePaintView, PlateRecipe } from "./types";

const TWO_PI = Math.PI * 2;

function fieldOffset({
  column,
  columns,
  field,
  motion,
  pointerX,
  pointerY,
  progress,
  row,
  rows,
}: {
  column: number;
  columns: number;
  field: PlateRecipe["field"];
  motion: number;
  pointerX: number;
  pointerY: number;
  progress: number;
  row: number;
  rows: number;
}): { dx: number; dy: number; pulse: number } {
  const phase = progress * TWO_PI;
  const pointerPhase = (pointerX - 0.5) * 1.4 + (pointerY - 0.5) * 0.6;
  const wave =
    Math.sin(column * 0.21 + row * 0.13 + phase + pointerPhase) * field.wave;
  const tilt = (column / Math.max(1, columns - 1) - 0.5) * field.tilt;
  const lift = Math.cos(phase + row * 0.09) * field.wave * 0.35;
  return {
    dx: wave * 0.38 + (pointerX - 0.5) * motion * 0.22,
    dy: tilt + lift + (pointerY - 0.5) * motion * 0.12,
    pulse: 1 + Math.sin(phase) * motion * 0.08,
  };
}

export function paintPlate(
  context: CanvasRenderingContext2D,
  recipe: PlateRecipe,
  view: PlatePaintView,
  {
    height,
    includeBackground = true,
    width,
  }: {
    height: number;
    includeBackground?: boolean;
    width: number;
  },
): void {
  if (includeBackground) {
    context.fillStyle = recipe.background;
    context.fillRect(0, 0, width, height);
  }

  const tones = decodeTones(recipe.tones, recipe.columns * recipe.rows);
  const cellWidth = width / recipe.columns;
  const cellHeight = height / recipe.rows;
  const ramp = Array.from(recipe.characters);
  const progress = ((view.progress % 1) + 1) % 1;
  const motion = clamp(recipe.motion.amount, 0, 1);
  const pointerX = view.pointer?.x ?? 0.5;
  const pointerY = view.pointer?.y ?? 0.5;
  const fontFamily =
    view.fontFamily ?? '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

  const inks =
    recipe.inks.length > 0 ? recipe.inks : [recipe.ink || "#111111"];
  const enabled = enabledMarkKinds(recipe.marks.enabled);
  const inkForTone = (tone: number): string => {
    if (inks.length === 1) return inks[0] ?? recipe.ink;
    const t = clamp(tone / 0.92, 0, 1);
    const index = Math.min(
      inks.length - 1,
      Math.round(t * (inks.length - 1)),
    );
    return inks[index] ?? recipe.ink;
  };

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let row = 0; row < recipe.rows; row += 1) {
    for (let column = 0; column < recipe.columns; column += 1) {
      const tone = (tones[row * recipe.columns + column] ?? 255) / 255;
      if (tone > 0.92) continue;
      const ink = inkForTone(tone);
      context.fillStyle = ink;
      context.strokeStyle = ink;

      const offset = fieldOffset({
        column,
        columns: recipe.columns,
        field: recipe.field,
        motion,
        pointerX,
        pointerY,
        progress,
        row,
        rows: recipe.rows,
      });
      const x = (column + 0.5 + offset.dx) * cellWidth;
      const y = (row + 0.52 + offset.dy) * cellHeight;
      const markSize = cellHeight * 0.82 * recipe.marks.size * offset.pulse;
      const useMark =
        cellHash(recipe.seed, column, row) < recipe.marks.mix && tone < 0.88;

      if (useMark) {
        drawMark(
          context,
          pickMarkKind(
            recipe.seed,
            column,
            row,
            recipe.field.detail,
            enabled,
          ),
          x,
          y,
          markSize,
          recipe.marks.edges,
        );
        continue;
      }

      const character =
        ramp[Math.round(tone * Math.max(0, ramp.length - 1))] ?? " ";
      if (character.trim().length === 0) continue;
      context.font = `500 ${markSize}px ${fontFamily}`;
      context.fillText(character, x, y);
    }
  }

  const fleckCount = enabled.includes("fleck")
    ? Math.round(recipe.columns * recipe.rows * recipe.marks.flecks * 0.08)
    : 0;
  for (let index = 0; index < fleckCount; index += 1) {
    const column = Math.floor(
      cellHash(recipe.seed + 91, index, 3) * recipe.columns,
    );
    const row = Math.floor(cellHash(recipe.seed + 7, 4, index) * recipe.rows);
    const tone = (tones[row * recipe.columns + column] ?? 0) / 255;
    if (tone < 0.55) continue;
    context.fillStyle = inkForTone(tone);
    context.strokeStyle = context.fillStyle;
    const offset = fieldOffset({
      column,
      columns: recipe.columns,
      field: recipe.field,
      motion,
      pointerX,
      pointerY,
      progress,
      row,
      rows: recipe.rows,
    });
    drawMark(
      context,
      "fleck",
      (column + 0.5 + offset.dx) * cellWidth,
      (row + 0.5 + offset.dy) * cellHeight,
      cellHeight * 0.45 * recipe.marks.size,
      0,
    );
  }

  const smearCount = enabled.includes("smear")
    ? Math.round(recipe.columns * recipe.rows * recipe.marks.smears * 0.04)
    : 0;
  for (let index = 0; index < smearCount; index += 1) {
    const column = Math.floor(
      cellHash(recipe.seed + 53, index, 8) * recipe.columns,
    );
    const row = Math.floor(cellHash(recipe.seed + 11, 9, index) * recipe.rows);
    const tone = (tones[row * recipe.columns + column] ?? 255) / 255;
    if (tone > 0.8) continue;
    context.fillStyle = inkForTone(tone);
    context.strokeStyle = context.fillStyle;
    const offset = fieldOffset({
      column,
      columns: recipe.columns,
      field: recipe.field,
      motion,
      pointerX,
      pointerY,
      progress,
      row,
      rows: recipe.rows,
    });
    drawMark(
      context,
      "smear",
      (column + 0.5 + offset.dx) * cellWidth,
      (row + 0.5 + offset.dy) * cellHeight,
      cellWidth * 0.9 * recipe.marks.size,
      1,
    );
  }

  context.restore();
}
