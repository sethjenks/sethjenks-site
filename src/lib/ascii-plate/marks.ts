import { cellHash } from "./math";
import { PLATE_MARK_KINDS, type PlateMarkKind } from "./types";

export function enabledMarkKinds(
  enabled?: readonly string[] | null,
): PlateMarkKind[] {
  if (!enabled) {
    return [...PLATE_MARK_KINDS];
  }

  const allowed = new Set(enabled);
  const kinds = PLATE_MARK_KINDS.filter((kind) => allowed.has(kind));
  return kinds.length > 0 ? kinds : ["tick"];
}

export function pickMarkKind(
  seed: number,
  column: number,
  row: number,
  detail: number,
  enabled?: readonly string[] | null,
): PlateMarkKind {
  const bank = enabledMarkKinds(enabled);
  const lane = Math.floor(
    cellHash(seed + 17, column, row) * (2 + detail * 5),
  );
  return bank[lane % bank.length];
}

export function drawMark(
  context: CanvasRenderingContext2D,
  kind: PlateMarkKind,
  x: number,
  y: number,
  size: number,
  edges: number,
): void {
  const stroke = edges > 0.5;
  const radius = size * 0.42;
  context.beginPath();

  switch (kind) {
    case "tick":
      context.moveTo(x, y - radius);
      context.lineTo(x, y + radius);
      break;
    case "slash":
      context.moveTo(x - radius, y + radius * 0.7);
      context.lineTo(x + radius, y - radius * 0.7);
      break;
    case "wedge":
      context.moveTo(x, y - radius);
      context.lineTo(x + radius, y + radius * 0.7);
      context.lineTo(x - radius, y + radius * 0.7);
      context.closePath();
      break;
    case "ring":
      context.arc(x, y, radius * 0.72, 0, Math.PI * 2);
      break;
    case "block":
      context.rect(x - radius * 0.7, y - radius * 0.7, radius * 1.4, radius * 1.4);
      break;
    case "fleck":
      context.arc(x, y, Math.max(0.4, radius * 0.28), 0, Math.PI * 2);
      break;
    case "smear":
      context.moveTo(x - radius, y);
      context.lineTo(x + radius, y + radius * 0.12);
      break;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled mark: ${_exhaustive}`);
    }
  }

  if (stroke || kind === "tick" || kind === "slash" || kind === "smear") {
    context.lineWidth = Math.max(0.7, size * (kind === "smear" ? 0.22 : 0.12));
    context.lineCap = "round";
    context.stroke();
    return;
  }

  context.fill();
}
