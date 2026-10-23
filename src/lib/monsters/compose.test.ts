import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeDrawing } from "./compose";
import { boxHitsStroke, pointHitsStroke } from "./pick";

describe("composeDrawing", () => {
  it("places the screen box on the strokes and keeps a stable page origin", () => {
    const drawing = composeDrawing([
      {
        id: "ink-a",
        width: 3.5,
        closed: false,
        points: [
          { x: 100, y: 80 },
          { x: 140, y: 120 },
        ],
      },
    ]);
    assert.ok(drawing);
    assert.equal(drawing.shapeIds[0], "ink-a");
    assert.ok(drawing.screenBox.x < 100);
    assert.ok(drawing.screenBox.y < 80);
    assert.equal(drawing.strokes[0].points[0].x, 0);
    assert.equal(drawing.strokes[0].points[0].y, 0);
    assert.equal(drawing.visual[0].color, "#1d1d1d");
  });
});

describe("pick", () => {
  it("hits a stroke under the pointer and inside a lasso", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ];
    assert.equal(pointHitsStroke(points, { x: 20, y: 4 }, 8), true);
    assert.equal(pointHitsStroke(points, { x: 20, y: 30 }, 8), false);
    assert.equal(boxHitsStroke(points, { x: 10, y: -4, w: 8, h: 8 }), true);
    assert.equal(boxHitsStroke(points, { x: 10, y: 20, w: 8, h: 8 }), false);
  });
});