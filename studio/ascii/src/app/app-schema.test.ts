import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema, createAsciiStudioSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the Toolcraft editable-output shell", () => {
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(true);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toEqual({
      defaultDurationSeconds: 3,
      enabled: true,
      mode: "playback",
    });
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
  });

  it("places journal delivery before the required export footer", () => {
    const productTitles =
      appSchema.panels.controls?.sections
        .filter((section) => section.title !== "Setup")
        .map((section) => section.title) ?? [];

    expect(productTitles).toEqual([
      "Image",
      "Source",
      "Frame",
      "Offset",
      "Illustration",
      "Mark set",
      "Marks",
      "Field",
      "Field motion",
      "Ink",
      "Journal Post",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
  });

  it("starts with a 2:1 journal plate and ink-on-ground values", () => {
    const defaultsByTarget = Object.fromEntries(
      (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
        Object.values(section.controls).map((control) => [
          control.target,
          control.defaultValue,
        ]),
      ),
    );

    expect(appSchema.canvas.size).toEqual({
      height: 336,
      unit: "px",
      width: 672,
    });
    expect(defaultsByTarget).toMatchObject({
      "appearance.background": "#FAFAFA",
      "appearance.inks": [{ hex: "#111111" }],
      "frame.zoom": 1,
      "ascii.columns": 120,
      "ascii.preset": "journal",
      "export.image.resolution": "4k",
    });
  });

  it("builds journal and inbox selects from the local bootstrap response", () => {
    const schema = createAsciiStudioSchema({
      entries: [
        { date: "2026-10-03", id: "example", title: "Example entry" },
      ],
      inbox: ["paper-frame.png"],
    });
    const controls = Object.fromEntries(
      (schema.panels.controls?.sections ?? []).flatMap((section) =>
        Object.values(section.controls).map((control) => [
          control.target,
          control,
        ]),
      ),
    );

    expect(controls["journal.entryId"]?.options).toEqual([
      {
        label: "2026-10-03 — Example entry",
        value: "example",
      },
    ]);
    expect(controls["source.inboxItem"]?.options).toEqual([
      { label: "paper-frame.png", value: "paper-frame.png" },
    ]);
  });

  it("declares Canvas 2D pixel-output performance scenarios", () => {
    expect(appPerformance.rendererStrategy).toBe("canvas-2d");
    expect(appPerformance.rendererWorkload).toBe("pixel-output");
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining([
        "source.image",
        "ascii.columns",
        "export.image.resolution",
        "export.video.resolution",
      ]),
    );
  });
});
