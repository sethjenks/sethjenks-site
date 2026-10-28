import type { PlayBody } from "@/lib/playfield-physics";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
  sparkle: boolean;
};

export type SparkField = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  sparks: Spark[];
  last: Map<string, { x: number; y: number }>;
  hue: number;
  width: number;
  height: number;
};

const MAX_SPARKS = 420;
const TRAIL_GAP = 5;

export function mountEmployerSparks(): SparkField {
  const canvas = document.createElement("canvas");
  canvas.className = "employer-sparks";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not draw employer sparks");
  }

  document.body.appendChild(canvas);
  return {
    canvas,
    context,
    sparks: [],
    last: new Map(),
    hue: 12,
    width: 0,
    height: 0,
  };
}

export function destroyEmployerSparks(field: SparkField) {
  field.canvas.remove();
  field.sparks.length = 0;
  field.last.clear();
}

export function stepEmployerSparks(
  field: SparkField,
  bodies: readonly PlayBody[],
  dt: number,
  header: DOMRect,
  homing: boolean,
  hidden: ReadonlySet<string>,
) {
  const clamped = Math.min(1 / 30, Math.max(0, dt));
  placeSparkCanvas(field, header);
  field.hue = (field.hue + clamped * 90) % 360;

  for (const body of bodies) {
    if (!body.bullet) {
      continue;
    }

    const cx = body.x + body.rest.w / 2;
    const cy = body.y + body.rest.h / 2;
    const concealed = homing || hidden.has(body.id);
    const speed = Math.hypot(body.vx, body.vy);
    const prev = field.last.get(body.id);
    const flying = body.loose && !concealed && speed > 40;

    if (flying && prev && field.sparks.length < MAX_SPARKS) {
      dropTrail(field, prev.x, prev.y, cx, cy, body.vx, body.vy);
    }

    if (body.glanced && !concealed && field.sparks.length < MAX_SPARKS) {
      dropBurst(field, cx, cy, body.vx, body.vy);
    }

    body.glanced = false;
    if (body.loose) {
      field.last.set(body.id, { x: cx, y: cy });
    } else {
      field.last.delete(body.id);
    }
  }

  ageSparks(field, clamped);
  paintSparks(field);
}

function placeSparkCanvas(field: SparkField, header: DOMRect) {
  const width = Math.max(1, Math.round(header.width));
  const height = Math.max(1, Math.round(header.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  field.canvas.style.left = `${header.left}px`;
  field.canvas.style.top = `${header.top}px`;
  field.canvas.style.width = `${width}px`;
  field.canvas.style.height = `${height}px`;
  if (field.width === width && field.height === height && field.canvas.width === Math.round(width * dpr)) {
    return;
  }

  field.width = width;
  field.height = height;
  field.canvas.width = Math.round(width * dpr);
  field.canvas.height = Math.round(height * dpr);
  field.context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function dropTrail(
  field: SparkField,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  vx: number,
  vy: number,
) {
  const distance = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.min(8, Math.max(1, Math.floor(distance / TRAIL_GAP)));
  const side = Math.hypot(vx, vy) || 1;
  const nx = -vy / side;
  const ny = vx / side;

  for (let step = 1; step <= steps; step += 1) {
    if (field.sparks.length >= MAX_SPARKS) {
      return;
    }

    const t = step / steps;
    const scatter = (Math.random() - 0.5) * 7;
    const life = 0.32 + Math.random() * 0.1;
    field.sparks.push({
      x: x0 + (x1 - x0) * t + nx * scatter,
      y: y0 + (y1 - y0) * t + ny * scatter,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16 - 8,
      life,
      max: life,
      size: 1.8 + Math.random() * 1.6,
      hue: (field.hue + step * 54) % 360,
      sparkle: step % 2 === 0,
    });
  }
}

function dropBurst(field: SparkField, x: number, y: number, vx: number, vy: number) {
  const angle = Math.atan2(vy, vx);
  for (let index = 0; index < 8; index += 1) {
    if (field.sparks.length >= MAX_SPARKS) {
      return;
    }

    const fan = angle + Math.PI + (index - 3.5) * 0.22;
    const speed = 40 + Math.random() * 90;
    const life = 0.2 + Math.random() * 0.1;
    field.sparks.push({
      x: x + Math.cos(fan) * 4,
      y: y + Math.sin(fan) * 4,
      vx: Math.cos(fan) * speed,
      vy: Math.sin(fan) * speed,
      life,
      max: life,
      size: 1.8 + Math.random() * 1.4,
      hue: (field.hue + index * 28) % 360,
      sparkle: true,
    });
  }
}

function ageSparks(field: SparkField, dt: number) {
  const sparks = field.sparks;
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    if (!spark) {
      continue;
    }

    spark.life -= dt;
    if (spark.life <= 0) {
      sparks.splice(index, 1);
      continue;
    }

    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
  }
}

function paintSparks(field: SparkField) {
  const context = field.context;
  context.clearRect(0, 0, field.width, field.height);

  for (const spark of field.sparks) {
    const fade = Math.max(0, spark.life / spark.max);
    const alpha = fade * fade;
    context.fillStyle = `hsla(${spark.hue}, 92%, 48%, ${alpha * 0.35})`;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size * 2.1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `hsla(${spark.hue}, 94%, 42%, ${alpha})`;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    context.fill();

    if (!spark.sparkle || alpha < 0.2) {
      continue;
    }

    const arm = spark.size * 2.1;
    context.strokeStyle = `hsla(${spark.hue}, 95%, 58%, ${alpha})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(spark.x - arm, spark.y);
    context.lineTo(spark.x + arm, spark.y);
    context.moveTo(spark.x, spark.y - arm);
    context.lineTo(spark.x, spark.y + arm);
    context.stroke();
  }
}
