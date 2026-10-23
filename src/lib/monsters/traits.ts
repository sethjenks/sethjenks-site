import { pathLength } from "./ink";
import type {
  Gait,
  InkPoint,
  InkStroke,
  MonsterTraits,
  Mood,
  ScreenBox,
  SizeWord,
} from "./types";

const INK_LOW = 280;
const INK_HIGH = 18000;

const NAMES = [
  "Bram",
  "Nub",
  "Kip",
  "Vex",
  "Poe",
  "Moth",
  "Lumen",
  "Grit",
  "Curl",
  "Rasp",
  "Dab",
  "Wick",
  "Sable",
  "Pebble",
  "Scowl",
  "Moss",
  "Knurl",
  "Pip",
  "Husk",
  "Fizz",
  "Cinder",
  "Tick",
  "Inkling",
  "Nim",
  "Quill",
  "Soot",
  "Pell",
  "Marrow",
  "Cob",
  "Yew",
  "Lark",
  "Dreg",
  "Snip",
  "Wisp",
  "Bog",
  "Fern",
  "Jot",
  "Rune",
  "Plum",
  "Nib",
  "Twill",
  "Crumb",
  "Vellum",
  "Puck",
  "Hart",
  "Loom",
  "Ash",
  "Kettle",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

type Bounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function boundsOf(strokes: InkStroke[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function strokeBounds(points: InkPoint[]): Bounds {
  return boundsOf([{ id: "_", points, width: 1, color: "#111", closed: false }]);
}

function hashStrokes(strokes: InkStroke[]): number {
  let hash = 2166136261;
  const mix = (value: number) => {
    hash ^= value | 0;
    hash = Math.imul(hash, 16777619);
  };
  mix(strokes.length);
  for (const stroke of strokes) {
    mix(Math.round(stroke.width * 10));
    mix(stroke.points.length);
    mix(stroke.closed ? 1 : 0);
    for (const point of stroke.points) {
      mix(Math.round(point.x * 2));
      mix(Math.round(point.y * 2));
    }
  }
  return hash >>> 0;
}

function measureJagged(strokes: InkStroke[]): number {
  let weighted = 0;
  let weight = 0;
  for (const stroke of strokes) {
    const points = stroke.points;
    for (let index = 1; index < points.length - 1; index += 1) {
      const ax = points[index].x - points[index - 1].x;
      const ay = points[index].y - points[index - 1].y;
      const bx = points[index + 1].x - points[index].x;
      const by = points[index + 1].y - points[index].y;
      const left = Math.hypot(ax, ay);
      const right = Math.hypot(bx, by);
      if (left < 0.5 || right < 0.5) {
        continue;
      }
      const dot = (ax * bx + ay * by) / (left * right);
      const angle = Math.acos(clamp(dot, -1, 1));
      const sample = Math.min(left, right);
      weighted += angle * sample;
      weight += sample;
    }
  }
  if (weight === 0) {
    return 0.2;
  }
  return clamp(weighted / weight / Math.PI, 0, 1);
}

function measureRound(strokes: InkStroke[], box: Bounds, jaggedness: number): number {
  const aspect = Math.min(box.w, box.h) / Math.max(box.w, box.h);
  const length = strokes.reduce((sum, stroke) => sum + pathLength(stroke.points), 0);
  const perimeter = 2 * (box.w + box.h);
  const loop = clamp(length / perimeter, 0, 1.4) / 1.4;
  const closed = strokes.some((stroke) => stroke.closed) ? 0.15 : 0;
  const smooth = 1 - jaggedness;
  return clamp(smooth * 0.62 + aspect * 0.23 + loop * 0.15 + closed, 0, 1);
}

function measureLoose(strokes: InkStroke[], box: Bounds): number {
  if (strokes.length <= 1) {
    return 0.12;
  }
  const diagonal = Math.max(1, Math.hypot(box.w, box.h));
  let gapSum = 0;
  for (let index = 0; index < strokes.length; index += 1) {
    let nearest = Infinity;
    const ends = [
      strokes[index].points[0],
      strokes[index].points[strokes[index].points.length - 1],
    ];
    for (let other = 0; other < strokes.length; other += 1) {
      if (other === index) {
        continue;
      }
      const samples = strokes[other].points;
      const stride = Math.max(1, Math.floor(samples.length / 24));
      for (const end of ends) {
        if (!end) {
          continue;
        }
        for (let pointIndex = 0; pointIndex < samples.length; pointIndex += stride) {
          const point = samples[pointIndex];
          nearest = Math.min(nearest, Math.hypot(end.x - point.x, end.y - point.y));
        }
      }
    }
    gapSum += Number.isFinite(nearest) ? nearest : diagonal;
  }
  return clamp(gapSum / strokes.length / (diagonal * 0.22), 0, 1);
}

function legIds(strokes: InkStroke[], box: Bounds): string[] {
  if (strokes.length < 2 || box.h < 8) {
    return [];
  }
  const bottom = box.y + box.h;
  const band = box.y + box.h * 0.86;
  const hasBody = strokes.some((stroke) => {
    const limits = strokeBounds(stroke.points);
    return limits.y + limits.h < box.y + box.h * 0.8;
  });
  if (!hasBody) {
    return [];
  }
  const ids: string[] = [];
  for (const stroke of strokes) {
    if (stroke.points.length < 2) {
      continue;
    }
    const limits = strokeBounds(stroke.points);
    const reaches = limits.y + limits.h >= band && limits.y + limits.h >= bottom - box.h * 0.08;
    const rises = limits.y < band - box.h * 0.04;
    const tall = limits.h > box.h * 0.18;
    const vertical = limits.h > limits.w * 0.8;
    const underline = limits.w > box.w * 0.65 && limits.h < box.h * 0.25;
    if (reaches && rises && tall && vertical && !underline) {
      ids.push(stroke.id);
    }
  }
  return ids;
}

function sizeWord(ink: number): SizeWord {
  if (ink < 0.34) {
    return "small";
  }
  if (ink < 0.67) {
    return "medium";
  }
  return "large";
}

function gaitFor(legs: number, roundness: number): Gait {
  if (legs > 0) {
    return "legs";
  }
  if (roundness >= 0.58) {
    return "roll";
  }
  return "hop";
}

function moodFor(jaggedness: number, roundness: number): Mood {
  if (jaggedness - roundness > 0.04) {
    return "grumpy";
  }
  return "friendly";
}

function compareStrokes(a: InkStroke, b: InkStroke): number {
  const aBox = strokeBounds(a.points);
  const bBox = strokeBounds(b.points);
  return aBox.y - bBox.y || aBox.x - bBox.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function deriveTraits(strokes: InkStroke[]): MonsterTraits {
  const ordered = [...strokes].sort(compareStrokes);
  const box = boundsOf(ordered);
  const inkRaw = ordered.reduce(
    (sum, stroke) => sum + pathLength(stroke.points) * Math.max(0.5, stroke.width),
    0,
  );
  const ink = clamp(
    (Math.log(inkRaw + 1) - Math.log(INK_LOW)) / (Math.log(INK_HIGH) - Math.log(INK_LOW)),
    0,
    1,
  );
  const jaggedness = measureJagged(ordered);
  const roundness = measureRound(ordered, box, jaggedness);
  const legs = legIds(ordered, box);
  const looseness = measureLoose(ordered, box);
  const gait = gaitFor(legs.length, roundness);
  const mood = moodFor(jaggedness, roundness);
  return {
    name: NAMES[hashStrokes(ordered) % NAMES.length],
    ink,
    size: sizeWord(ink),
    speed: lerp(156, 54, ink),
    mass: lerp(0.85, 2.6, ink),
    mood,
    jaggedness,
    roundness,
    gait,
    legIds: legs,
    looseness,
    lifespan: lerp(60, 30, looseness),
  };
}

export function fittedSize(
  box: ScreenBox,
  ink: number,
  narrow: boolean,
): { w: number; h: number } {
  const targetH = (narrow ? 64 : 88) + ink * (narrow ? 72 : 112);
  const base = targetH / Math.max(24, box.h);
  const maxW = narrow ? 168 : 260;
  const scale = box.w * base > maxW ? maxW / Math.max(1, box.w) : base;
  return {
    w: Math.max(36, box.w * scale),
    h: Math.max(36, box.h * scale),
  };
}

export function gaitLabel(gait: Gait, legs: number): string {
  switch (gait) {
    case "legs":
      return legs === 1 ? "1 leg" : `${legs} legs`;
    case "hop":
      return "Hops";
    case "roll":
      return "Rolls";
    default: {
      const exhaustive: never = gait;
      return exhaustive;
    }
  }
}

export function sizeLabel(size: SizeWord): string {
  switch (size) {
    case "small":
      return "Small";
    case "medium":
      return "Medium";
    case "large":
      return "Large";
    default: {
      const exhaustive: never = size;
      return exhaustive;
    }
  }
}

export function traitCardCopy(
  traits: MonsterTraits,
  remaining: number,
): { name: string; line: string; detail: string } {
  const seconds = Math.max(0, Math.ceil(remaining));
  return {
    name: traits.name,
    line: `${sizeLabel(traits.size)}, ${traits.mood}`,
    detail: `${gaitLabel(traits.gait, traits.legIds.length)}, ${seconds}s`,
  };
}

export function summonAnnouncement(traits: MonsterTraits): string {
  const seconds = Math.max(1, Math.round(traits.lifespan));
  return `${traits.name} is on the page. ${sizeLabel(traits.size)}, ${traits.mood}, ${gaitLabel(traits.gait, traits.legIds.length)}, about ${seconds} seconds.`;
}
