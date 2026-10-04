import { describe, expect, it } from "vitest";

import {
  cellHash,
  enabledMarkKinds,
  parsePlateRecipe,
  pickMarkKind,
  PLATE_VERSION,
} from "@ascii-plate";

describe("ascii plate kernel", () => {
  it("hashes cells deterministically", () => {
    expect(cellHash(12, 3, 4)).toBe(cellHash(12, 3, 4));
    expect(cellHash(12, 3, 4)).not.toBe(cellHash(13, 3, 4));
  });

  it("round-trips a packed recipe", () => {
    const recipe = parsePlateRecipe({
      background: "#FAFAFA",
      characters: "MWNXK0Okxdolc:,. ",
      columns: 8,
      contrast: 1.25,
      field: { detail: 0.5, tilt: 0.2, wave: 0.45 },
      height: 336,
      ink: "#111111",
      invert: false,
      marks: { edges: 0.55, flecks: 0.08, mix: 0.4, size: 0.8, smears: 0.12 },
      motion: { amount: 0.55 },
      rows: 2,
      seed: 7,
      tones: btoa(String.fromCharCode(10, 80, 160, 240, 20, 90, 170, 250, 30, 100, 180, 20, 40, 110, 190, 30)),
      version: PLATE_VERSION,
      width: 672,
    });

    expect(recipe.columns).toBe(8);
    expect(recipe.rows).toBe(2);
    expect(recipe.inks).toEqual(["#111111"]);
    expect(recipe.marks.enabled).toEqual([
      "tick",
      "slash",
      "wedge",
      "ring",
      "block",
      "fleck",
      "smear",
    ]);
    expect(recipe.marks.mix).toBeCloseTo(0.4);
    expect(recipe.motion.amount).toBeCloseTo(0.55);
  });

  it("keeps a tick when the enabled mark bank is empty", () => {
    expect(enabledMarkKinds([])).toEqual(["tick"]);
    expect(pickMarkKind(1, 0, 0, 1, [])).toBe("tick");
    expect(enabledMarkKinds(null)).toEqual([
      "tick",
      "slash",
      "wedge",
      "ring",
      "block",
      "fleck",
      "smear",
    ]);
  });
});
