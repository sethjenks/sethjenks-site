export type PlayBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlayRest = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlayKind = "glyph" | "button";

export type PlayHomeFrom = {
  x: number;
  y: number;
  rotate: number;
};

export type PlayBody = {
  id: string;
  kind: PlayKind;
  rest: PlayRest;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotate: number;
  vr: number;
  loose: boolean;
  hitting: boolean;
  mass: number;
  homeFrom?: PlayHomeFrom;
};

export type BustCollider = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  grabbing: boolean;
};

const GRAVITY = 2100;
const DAMPING = 0.986;
const SPIN_DAMPING = 0.975;
const BOUNCE = 0.58;
const GLYPH_IMPULSE = 620;
const BUTTON_IMPULSE = 380;

export function createPlayBody(
  id: string,
  kind: PlayKind,
  rest: PlayRest,
  mass = kind === "button" ? 8 : 1,
): PlayBody {
  return {
    id,
    kind,
    rest,
    x: rest.x,
    y: rest.y,
    vx: 0,
    vy: 0,
    rotate: 0,
    vr: 0,
    loose: false,
    hitting: false,
    mass,
  };
}

export function syncPlayRest(body: PlayBody, rest: PlayRest) {
  const dx = rest.x - body.rest.x;
  const dy = rest.y - body.rest.y;
  body.rest = rest;
  if (!body.loose) {
    body.x = rest.x;
    body.y = rest.y;
    return;
  }

  body.x += dx;
  body.y += dy;
}

export function stepPlayfield(
  bodies: PlayBody[],
  dt: number,
  bounds: PlayBounds,
  bust: BustCollider | null,
  homing: boolean,
): { moved: boolean; struck: boolean } {
  const clamped = Math.min(1 / 30, Math.max(0, dt));
  let moved = false;
  let struck = false;

  for (const body of bodies) {
    if (homing) {
      continue;
    }

    if (body.loose) {
      body.vy += GRAVITY * clamped;
      body.vx *= DAMPING;
      body.vy *= DAMPING;
      body.vr *= SPIN_DAMPING;
      body.x += body.vx * clamped;
      body.y += body.vy * clamped;
      body.rotate += body.vr * clamped;
      bounceWalls(body, bounds);
    }

    if (bust && collideBust(body, bust)) {
      moved = true;
      struck = true;
    }

    if (body.loose && (Math.abs(body.vx) > 8 || Math.abs(body.vy) > 8 || Math.abs(body.vr) > 0.2)) {
      moved = true;
    }
  }

  return { moved, struck };
}

export function beginPlayHome(bodies: PlayBody[]) {
  for (const body of bodies) {
    body.homeFrom = { x: body.x, y: body.y, rotate: body.rotate };
  }
}

export function applyPlayHome(bodies: PlayBody[], t: number) {
  const eased = Math.min(1, Math.max(0, t));
  for (const body of bodies) {
    const from = body.homeFrom;
    if (!from) {
      continue;
    }
    body.x = from.x + (body.rest.x - from.x) * eased;
    body.y = from.y + (body.rest.y - from.y) * eased;
    body.rotate = from.rotate + (0 - from.rotate) * eased;
    body.vx = 0;
    body.vy = 0;
    body.vr = 0;
  }
}

export function finishPlayHome(bodies: PlayBody[]) {
  for (const body of bodies) {
    body.x = body.rest.x;
    body.y = body.rest.y;
    body.vx = 0;
    body.vy = 0;
    body.rotate = 0;
    body.vr = 0;
    body.loose = false;
    body.hitting = false;
    delete body.homeFrom;
  }
}

export function cancelPlayHome(bodies: PlayBody[]) {
  for (const body of bodies) {
    delete body.homeFrom;
  }
}

function bounceWalls(body: PlayBody, bounds: PlayBounds) {
  const minX = bounds.x;
  const maxX = bounds.x + bounds.w - body.rest.w;
  const minY = bounds.y;
  const maxY = bounds.y + bounds.h - body.rest.h;

  if (body.x < minX) {
    body.x = minX;
    body.vx = Math.abs(body.vx) * BOUNCE;
  } else if (body.x > maxX) {
    body.x = maxX;
    body.vx = -Math.abs(body.vx) * BOUNCE;
  }

  if (body.y < minY) {
    body.y = minY;
    body.vy = Math.abs(body.vy) * BOUNCE;
  } else if (body.y > maxY) {
    body.y = maxY;
    body.vy = -Math.abs(body.vy) * BOUNCE;
  }
}

function collideBust(body: PlayBody, bust: BustCollider): boolean {
  const hit = ellipseHitsRect(
    bust.x,
    bust.y,
    bust.rx,
    bust.ry,
    body.x,
    body.y,
    body.rest.w,
    body.rest.h,
  );

  if (!hit) {
    body.hitting = false;
    return false;
  }

  if (body.hitting) {
    return body.loose;
  }

  body.hitting = true;
  body.loose = true;

  const cx = body.x + body.rest.w / 2;
  const cy = body.y + body.rest.h / 2;
  let nx = cx - bust.x;
  let ny = cy - bust.y;
  const length = Math.hypot(nx, ny) || 1;
  nx /= length;
  ny /= length;

  const impulse = (body.kind === "button" ? BUTTON_IMPULSE : GLYPH_IMPULSE) / body.mass;
  body.vx += nx * impulse;
  body.vy += ny * impulse - 80 / body.mass;
  body.vr += (nx * 18 + (Math.random() - 0.5) * 14) / body.mass;
  return true;
}

function ellipseHitsRect(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const closestX = clamp(cx, x, x + w);
  const closestY = clamp(cy, y, y + h);
  const dx = (closestX - cx) / Math.max(8, rx);
  const dy = (closestY - cy) / Math.max(8, ry);
  return dx * dx + dy * dy <= 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function playTransform(body: PlayBody): string {
  const dx = body.x - body.rest.x;
  const dy = body.y - body.rest.y;
  if (dx === 0 && dy === 0 && body.rotate === 0) {
    return "none";
  }

  return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${body.rotate.toFixed(2)}deg)`;
}
