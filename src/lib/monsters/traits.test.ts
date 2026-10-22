import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveTraits } from "./traits";
import type { InkPoint, InkStroke } from "./types";

function stroke(
  id: string,
  points: InkPoint[],
  width = 3.5,
  closed = false,
): InkStroke {
  return { id, points, width, color: "#1d1d1d", closed };
}

function circlePoints(radius = 40, count = 28): InkPoint[] {
  const points: InkPoint[] = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    points.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    });
  }
  return points;
}

function zigzag(): InkPoint[] {
  const points: InkPoint[] = [];
  for (let index = 0; index < 12; index += 1) {
    points.push({ x: index * 10, y: index % 2 === 0 ? 0 : 40 });
  }
  return points;
}

describe("deriveTraits", () => {
  it("makes heavier ink slower and larger", () => {
    const light = deriveTraits([stroke("a", [{ x: 0, y: 0 }, { x: 20, y: 0 }], 2)]);
    const heavyPoints: InkPoint[] = [];
    for (let index = 0; index < 80; index += 1) {
      heavyPoints.push({ x: index * 12, y: index % 2 === 0 ? 0 : 8 });
    }
    const heavy = deriveTraits([stroke("b", heavyPoints, 10)]);
    assert.equal(light.size, "small");
    assert.equal(heavy.size, "large");
    assert.ok(heavy.speed < light.speed);
    assert.ok(heavy.mass > light.mass);
  });

  it("names the same drawing the same way", () => {
    const points = circlePoints();
    const first = deriveTraits([stroke("c", points, 3.5, true)]);
    const second = deriveTraits([stroke("c", points, 3.5, true)]);
    assert.equal(first.name, second.name);
    assert.equal(first.lifespan, second.lifespan);
    const forward = deriveTraits([
      stroke("body", [
        { x: 10, y: 10 },
        { x: 40, y: 12 },
        { x: 70, y: 9 },
      ]),
      stroke("leg", [
        { x: 30, y: 14 },
        { x: 28, y: 70 },
      ]),
    ]);
    const backward = deriveTraits([
      stroke("leg", [
        { x: 30, y: 14 },
        { x: 28, y: 70 },
      ]),
      stroke("body", [
        { x: 10, y: 10 },
        { x: 40, y: 12 },
        { x: 70, y: 9 },
      ]),
    ]);
    assert.equal(forward.name, backward.name);
    assert.deepEqual(forward.legIds, backward.legIds);
  });

  it("rolls a round closed mark and stays friendly", () => {
    const traits = deriveTraits([stroke("round", circlePoints(), 3.5, true)]);
    assert.equal(traits.gait, "roll");
    assert.equal(traits.mood, "friendly");
    assert.deepEqual(traits.legIds, []);
  });

  it("hops a jagged mark and turns grumpy", () => {
    const traits = deriveTraits([stroke("zag", zigzag(), 3.5)]);
    assert.equal(traits.gait, "hop");
    assert.equal(traits.mood, "grumpy");
    assert.deepEqual(traits.legIds, []);
  });

  it("treats bottom strokes as legs when a body sits above them", () => {
    const traits = deriveTraits([
      stroke("body", [
        { x: 10, y: 10 },
        { x: 40, y: 8 },
        { x: 70, y: 14 },
      ]),
      stroke("left", [
        { x: 24, y: 16 },
        { x: 22, y: 48 },
        { x: 20, y: 78 },
      ]),
      stroke("right", [
        { x: 56, y: 16 },
        { x: 58, y: 50 },
        { x: 60, y: 78 },
      ]),
    ]);
    assert.equal(traits.gait, "legs");
    assert.deepEqual(traits.legIds, ["left", "right"]);
  });

  it("shortens the life of a loose drawing", () => {
    const tight = deriveTraits([
      stroke("a", [
        { x: 0, y: 0 },
        { x: 30, y: 4 },
      ]),
      stroke("b", [
        { x: 32, y: 4 },
        { x: 60, y: 0 },
      ]),
    ]);
    const loose = deriveTraits([
      stroke("a", [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
      stroke("b", [
        { x: 400, y: 180 },
        { x: 420, y: 180 },
      ]),
    ]);
    assert.ok(loose.looseness > tight.looseness);
    assert.ok(loose.lifespan < tight.lifespan);
    assert.ok(loose.lifespan >= 30);
    assert.ok(tight.lifespan <= 60);
  });
});
