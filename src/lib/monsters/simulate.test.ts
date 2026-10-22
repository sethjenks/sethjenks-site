import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCreature, findLanding, rideSupport, stepCreature } from "./simulate";
import type { Collider, CreatureState } from "./types";

function creature(overrides: Partial<CreatureState> = {}): CreatureState {
  const base = createCreature({
    from: { x: 40, y: 20, w: 80, h: 80 },
    to: { x: 40, y: 200 },
    size: { w: 48, h: 48 },
    life: 40,
    speed: 120,
    mass: 1,
    gait: "hop",
    mood: "grumpy",
    reduced: false,
  });
  return { ...base, phase: "live", peel: 1, x: 40, y: 20, ...overrides };
}

describe("stepCreature", () => {
  it("lands on the platform under its feet", () => {
    const body = creature({
      x: 20,
      y: 0,
      vy: 0,
      vx: 0,
      w: 40,
      h: 40,
      speed: 0,
      gait: "legs",
      mood: "friendly",
      grounded: false,
    });
    const platforms: Collider[] = [{ key: "floor", x: 0, y: 180, w: 400, h: 24, oneWay: false }];
    for (let frame = 0; frame < 180; frame += 1) {
      stepCreature(body, 1 / 60, platforms, null, null, 800, 600);
    }
    assert.equal(body.grounded, true);
    assert.ok(Math.abs(body.y + body.h - 180) < 2);
  });

  it("reverses a grumpy creature that hits a wall", () => {
    const body = creature({
      x: 100,
      y: 160,
      w: 40,
      h: 40,
      vx: 240,
      facing: 1,
      grounded: true,
      gait: "legs",
      mood: "grumpy",
    });
    const wall: Collider = { key: "wall", x: 150, y: 80, w: 30, h: 140, oneWay: false };
    const floor: Collider = { key: "floor", x: 0, y: 200, w: 400, h: 20, oneWay: false };
    for (let frame = 0; frame < 30; frame += 1) {
      stepCreature(body, 1 / 60, [wall, floor], null, null, 800, 600);
    }
    assert.equal(body.facing, -1);
    assert.ok(body.x + body.w <= wall.x + 1);
  });

  it("leaves a wide card instead of sticking to the screen edge", () => {
    const body = creature({
      x: 700,
      y: 140,
      w: 40,
      h: 40,
      vx: 40,
      facing: 1,
      grounded: true,
      gait: "legs",
      mood: "grumpy",
    });
    const card: Collider = { key: "card", x: 600, y: 100, w: 400, h: 200, oneWay: false };
    const floor: Collider = { key: "floor", x: 0, y: 320, w: 800, h: 20, oneWay: false };
    for (let frame = 0; frame < 120; frame += 1) {
      stepCreature(body, 1 / 60, [card, floor], null, null, 800, 600);
    }
    assert.ok(body.x + body.w <= card.x + 1);
  });

  it("turns a friendly creature toward the cursor", () => {
    const body = creature({
      x: 200,
      y: 150,
      w: 40,
      h: 40,
      facing: 1,
      mood: "friendly",
      gait: "legs",
      grounded: true,
      vx: 0,
    });
    const floor: Collider = { key: "floor", x: 0, y: 190, w: 800, h: 16, oneWay: false };
    stepCreature(body, 1 / 60, [floor], 20, 160, 800, 600);
    assert.equal(body.facing, -1);
  });

  it("hops when the drawing has no legs", () => {
    const body = creature({
      x: 20,
      y: 150,
      w: 40,
      h: 40,
      gait: "hop",
      grounded: true,
      hop: 0,
      vy: 0,
    });
    const floor: Collider = { key: "floor", x: 0, y: 190, w: 400, h: 20, oneWay: true };
    stepCreature(body, 1 / 60, [floor], null, null, 800, 600);
    assert.ok(body.vy < 0);
    assert.equal(body.grounded, false);
  });

  it("falls apart when its life runs out", () => {
    const body = creature({ life: 0.2, age: 0.19, speed: 0, gait: "legs" });
    stepCreature(body, 1 / 30, [], null, null, 800, 600);
    assert.equal(body.phase, "decay");
    for (let frame = 0; frame < 40; frame += 1) {
      stepCreature(body, 1 / 30, [], null, null, 800, 600);
    }
    assert.equal(body.phase, "done");
  });

  it("places a reduced-motion creature without the peel", () => {
    const body = createCreature({
      from: { x: 10, y: 10, w: 40, h: 40 },
      to: { x: 80, y: 120 },
      size: { w: 50, h: 50 },
      life: 30,
      speed: 40,
      mass: 1,
      gait: "roll",
      mood: "friendly",
      reduced: true,
    });
    stepCreature(body, 1 / 60, [], null, null, 800, 600);
    assert.equal(body.phase, "live");
    assert.equal(body.x, 80);
    assert.equal(body.y, 120);
  });

  it("walks through a one-way lip instead of treating it as a wall", () => {
    const body = creature({
      x: 10,
      y: 100,
      w: 30,
      h: 30,
      vx: 200,
      facing: 1,
      grounded: true,
      gait: "legs",
    });
    const lip: Collider = { key: "lip", x: 40, y: 40, w: 200, h: 12, oneWay: true };
    const floor: Collider = { key: "floor", x: 0, y: 130, w: 400, h: 20, oneWay: true };
    stepCreature(body, 1 / 60, [lip, floor], null, null, 800, 600);
    assert.ok(body.x > 10);
    assert.equal(body.facing, 1);
  });
});

describe("rideSupport", () => {
  it("carries a grounded creature when its platform moves", () => {
    const body = creature({
      x: 30,
      y: 80,
      w: 40,
      h: 40,
      grounded: true,
      phase: "live",
      gait: "legs",
      speed: 0,
    });
    const before: Collider = { key: "card", x: 10, y: 120, w: 180, h: 80, oneWay: false };
    const after: Collider = { key: "card", x: 28, y: 150, w: 180, h: 80, oneWay: false };
    rideSupport(body, [after], new Map([[before.key, before]]));
    assert.equal(body.x, 48);
    assert.equal(body.y, 110);
  });
});

describe("findLanding", () => {
  it("drops onto the nearest surface below the drawing", () => {
    const landing = findLanding(
      { x: 100, y: 40, w: 60, h: 40 },
      { w: 48, h: 48 },
      [
        { key: "high", x: 0, y: 20, w: 400, h: 10, oneWay: true },
        { key: "bar", x: 80, y: 220, w: 240, h: 40, oneWay: false },
        { key: "low", x: 0, y: 400, w: 800, h: 20, oneWay: false },
      ],
      800,
      700,
    );
    assert.equal(landing.y, 220 - 48);
    assert.ok(landing.x >= 8);
  });
});
