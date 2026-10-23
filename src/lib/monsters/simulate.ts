import type { Collider, CreatureState, Gait, Mood, ScreenBox } from "./types";

const STEP_UP = 40;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function flip(facing: 1 | -1): 1 | -1 {
  return facing === 1 ? -1 : 1;
}

export function findLanding(
  origin: ScreenBox,
  target: { w: number; h: number },
  colliders: Collider[],
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  const center = origin.x + origin.w / 2;
  const feet = origin.y + origin.h;
  let surface = viewH - 2;
  for (const collider of colliders) {
    if (collider.y < feet - 6) {
      continue;
    }
    const overlaps = center >= collider.x - 24 && center <= collider.x + collider.w + 24;
    if (!overlaps) {
      continue;
    }
    if (collider.y < surface) {
      surface = collider.y;
    }
  }
  const x = clamp(center - target.w / 2, 8, Math.max(8, viewW - target.w - 8));
  const y = clamp(surface - target.h, 8, Math.max(8, viewH - target.h - 2));
  return { x, y };
}

export function createCreature(input: {
  from: ScreenBox;
  to: { x: number; y: number };
  size: { w: number; h: number };
  life: number;
  speed: number;
  mass: number;
  gait: Gait;
  mood: Mood;
  reduced: boolean;
}): CreatureState {
  return {
    x: input.from.x,
    y: input.from.y,
    w: input.size.w,
    h: input.size.h,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    roll: 0,
    phase: "peel",
    age: 0,
    life: input.life,
    peel: 0,
    squash: 0,
    ram: 0,
    stun: 0,
    hop: 0.2,
    bob: 0,
    decay: 0,
    gait: input.gait,
    mood: input.mood,
    speed: input.speed,
    mass: input.mass,
    reduced: input.reduced,
    fromX: input.from.x,
    fromY: input.from.y,
    toX: input.to.x,
    toY: input.to.y,
    naturalW: Math.max(1, input.from.w),
    naturalH: Math.max(1, input.from.h),
  };
}

function overlapsX(creature: CreatureState, collider: Collider, inset: number): boolean {
  return (
    creature.x + inset < collider.x + collider.w &&
    creature.x + creature.w - inset > collider.x
  );
}

function sideOverlap(creature: CreatureState, collider: Collider): boolean {
  const top = creature.y + 6;
  const bottom = creature.y + creature.h - 12;
  if (bottom <= top) {
    return false;
  }
  return (
    creature.x < collider.x + collider.w &&
    creature.x + creature.w > collider.x &&
    top < collider.y + collider.h &&
    bottom > collider.y
  );
}

function supported(creature: CreatureState, colliders: Collider[], viewH: number): boolean {
  const feet = creature.y + creature.h;
  if (Math.abs(feet - (viewH - 2)) <= 2.5) {
    return true;
  }
  return colliders.some(
    (collider) => overlapsX(creature, collider, 4) && Math.abs(feet - collider.y) <= 2.5,
  );
}

function bonk(creature: CreatureState) {
  if (creature.stun > 0) {
    creature.vx = 0;
    return;
  }
  creature.squash = 0.22;
  creature.stun = creature.mood === "grumpy" ? 0.34 : 0.22;
  creature.facing = flip(creature.facing);
  if (creature.mood === "grumpy") {
    creature.ram = 0.28;
    creature.vx = 0;
    return;
  }
  creature.vx = creature.facing * creature.speed * 0.2;
}

function integrate(
  creature: CreatureState,
  dt: number,
  colliders: Collider[],
  viewW: number,
  viewH: number,
): boolean {
  const previousBottom = creature.y + creature.h;
  let hit = false;
  creature.x += creature.vx * dt;

  for (const collider of colliders) {
    if (collider.oneWay || !sideOverlap(creature, collider)) {
      continue;
    }
    const ledge = previousBottom - collider.y;
    if (ledge >= -1 && ledge <= STEP_UP && creature.vy >= -30) {
      creature.y = collider.y - creature.h;
      creature.vy = 0;
      creature.grounded = true;
      continue;
    }
    const intoLeft = creature.x + creature.w - collider.x;
    const intoRight = collider.x + collider.w - creature.x;
    const leftX = collider.x - creature.w - 0.25;
    const rightX = collider.x + collider.w + 0.25;
    const leftFits = leftX >= 0;
    const rightFits = rightX + creature.w <= viewW;
    if (intoLeft <= intoRight && leftFits) {
      creature.x = leftX;
    } else if (rightFits) {
      creature.x = rightX;
    } else if (leftFits) {
      creature.x = leftX;
    }
    hit = true;
  }

  if (creature.x < 0) {
    creature.x = 0;
    if (creature.vx < 0) {
      hit = true;
    }
    creature.vx = Math.max(0, creature.vx);
  } else if (creature.x + creature.w > viewW) {
    creature.x = Math.max(0, viewW - creature.w);
    if (creature.vx > 0) {
      hit = true;
    }
    creature.vx = Math.min(0, creature.vx);
  }

  if (hit) {
    bonk(creature);
  }

  const beforeDrop = creature.y + creature.h;
  creature.y += creature.vy * dt;
  let landed = false;
  for (const collider of colliders) {
    if (!overlapsX(creature, collider, 2)) {
      continue;
    }
    const nextBottom = creature.y + creature.h;
    if (creature.vy >= 0 && beforeDrop <= collider.y + 2 && nextBottom >= collider.y) {
      creature.y = collider.y - creature.h;
      if (creature.vy > 240) {
        creature.squash = 0.16;
      }
      creature.vy = 0;
      creature.grounded = true;
      landed = true;
      continue;
    }
    if (
      !collider.oneWay &&
      creature.vy < 0 &&
      beforeDrop >= collider.y + collider.h - 1 &&
      creature.y < collider.y + collider.h
    ) {
      creature.y = collider.y + collider.h;
      creature.vy = 0;
    }
  }

  const floor = viewH - 2;
  if (creature.y + creature.h >= floor) {
    creature.y = floor - creature.h;
    if (creature.vy > 240) {
      creature.squash = 0.16;
    }
    creature.vy = 0;
    creature.grounded = true;
    landed = true;
  } else if (!landed) {
    creature.grounded = false;
  }

  return hit;
}

export function stepCreature(
  creature: CreatureState,
  dt: number,
  colliders: Collider[],
  cursorX: number | null,
  cursorY: number | null,
  viewW: number,
  viewH: number,
): void {
  const step = clamp(dt, 0, 1 / 30);
  if (creature.phase === "done") {
    return;
  }

  if (creature.phase === "peel") {
    if (creature.reduced) {
      creature.x = creature.toX;
      creature.y = creature.toY;
      creature.w = creature.w;
      creature.h = creature.h;
      creature.phase = "live";
      creature.grounded = true;
      creature.peel = 1;
      return;
    }
    creature.peel = Math.min(1, creature.peel + step / 0.85);
    const t = easeOut(creature.peel);
    creature.x = lerp(creature.fromX, creature.toX, t);
    creature.y = lerp(creature.fromY, creature.toY, t) - Math.sin(t * Math.PI) * 26;
    if (creature.peel >= 1) {
      creature.phase = "live";
      creature.x = creature.toX;
      creature.y = creature.toY;
      creature.vy = 20;
      creature.age = 0;
    }
    return;
  }

  if (creature.phase === "decay") {
    creature.decay += step;
    if (creature.decay >= (creature.reduced ? 0.35 : 1.15)) {
      creature.phase = "done";
    }
    return;
  }

  creature.age += step;
  creature.squash = Math.max(0, creature.squash - step);
  creature.ram = Math.max(0, creature.ram - step);
  creature.stun = Math.max(0, creature.stun - step);
  creature.hop = Math.max(0, creature.hop - step);

  if (creature.age >= creature.life) {
    creature.phase = "decay";
    creature.decay = 0;
    creature.vx = 0;
    creature.vy = 0;
    return;
  }

  if (creature.reduced) {
    creature.vx = 0;
    creature.vy = 0;
    creature.x = creature.toX;
    creature.y = creature.toY;
    return;
  }

  if (!supported(creature, colliders, viewH)) {
    creature.grounded = false;
  }

  if (creature.stun <= 0 && creature.mood === "friendly" && cursorX !== null) {
    const center = creature.x + creature.w / 2;
    const delta = cursorX - center;
    if (Math.abs(delta) > 28) {
      creature.facing = delta > 0 ? 1 : -1;
    }
  }

  const centerX = creature.x + creature.w / 2;
  const close =
    creature.mood === "friendly" &&
    cursorX !== null &&
    Math.abs(cursorX - centerX) < Math.max(36, creature.w * 0.35);
  const targetVx = creature.ram > 0 || close ? 0 : creature.facing * creature.speed;
  const accel = (creature.mood === "grumpy" ? 680 : 920) / creature.mass;
  const deltaV = clamp(targetVx - creature.vx, -accel * step, accel * step);
  creature.vx += deltaV;

  if (!creature.grounded) {
    creature.vy += (1900 + creature.mass * 180) * step;
  } else if (creature.gait === "hop" && creature.hop <= 0 && creature.ram <= 0) {
    const weight = clamp((creature.mass - 0.85) / 1.75, 0, 1);
    creature.vy = -lerp(470, 330, weight);
    creature.grounded = false;
    creature.hop = lerp(0.7, 1.05, weight);
  } else if (
    creature.mood === "friendly" &&
    creature.gait !== "roll" &&
    creature.grounded &&
    creature.hop <= 0 &&
    cursorY !== null &&
    cursorY < creature.y - 72
  ) {
    creature.vy = -400 / Math.max(1, creature.mass * 0.7);
    creature.grounded = false;
    creature.hop = 0.85;
  }

  integrate(creature, step, colliders, viewW, viewH);

  if (creature.gait === "roll") {
    creature.roll += (creature.vx / Math.max(18, creature.h * 0.45)) * step;
  } else if (creature.gait === "legs" && creature.grounded) {
    creature.bob += step * (creature.speed / 22);
  }
}

export function rideSupport(
  creature: CreatureState,
  colliders: Collider[],
  previous: ReadonlyMap<string, Collider>,
): void {
  if (!creature.grounded || creature.phase !== "live" || creature.reduced) {
    return;
  }
  const feet = creature.y + creature.h;
  for (const collider of colliders) {
    const prior = previous.get(collider.key);
    if (!prior) {
      continue;
    }
    const overlaps =
      creature.x + 4 < prior.x + prior.w && creature.x + creature.w - 4 > prior.x;
    if (!overlaps || Math.abs(prior.y - feet) > 3) {
      continue;
    }
    creature.x += collider.x - prior.x;
    creature.y += collider.y - prior.y;
    return;
  }
}

export function displayScale(creature: CreatureState): { w: number; h: number } {
  if (creature.phase !== "peel" || creature.reduced) {
    return { w: creature.w, h: creature.h };
  }
  const t = easeOut(creature.peel);
  return {
    w: lerp(creature.naturalW, creature.w, t),
    h: lerp(creature.naturalH, creature.h, t),
  };
}

export function pose(creature: CreatureState): {
  squashX: number;
  squashY: number;
  bob: number;
  swing: number;
} {
  const amount = creature.squash > 0 ? Math.min(1, creature.squash / 0.22) : 0;
  const bob =
    creature.gait === "legs" && creature.grounded && creature.phase === "live" && !creature.reduced
      ? Math.abs(Math.sin(creature.bob * Math.PI * 2)) * -3
      : 0;
  const swing =
    creature.gait === "legs" &&
    creature.grounded &&
    creature.phase === "live" &&
    !creature.reduced &&
    Math.abs(creature.vx) > 8
      ? Math.sin(creature.bob * Math.PI * 2) * 18
      : 0;
  return {
    squashX: 1 + amount * (creature.mood === "grumpy" ? 0.16 : 0.1),
    squashY: 1 - amount * 0.16,
    bob,
    swing,
  };
}
