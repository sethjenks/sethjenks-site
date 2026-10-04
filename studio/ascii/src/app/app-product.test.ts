import { describe, expect, it } from "vitest";

import { validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

function scenario(id: string) {
  return appPerformance.scenarios.find((item) => item.id === id);
}

describe("ASCII Journal Studio product contract", () => {
  it("maps every ASCII Journal schema control to renderer or authoring behavior", () => {
    expect(validateToolcraftAcceptanceCoverage(appSchema)).toEqual([]);
  });

  it("omits layers and uses a 3s playback timeline", () => {
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: 3,
      enabled: true,
      mode: "playback",
    });
    expect(appSchema.assembly.surfaces.canvas.enabled).toBe(true);
  });

  it("connects timeline playback controls to runtime state contract", () => {
    expect(appSchema.panels.timeline?.mode).toBe("playback");
    expect(appSchema.panels.timeline?.defaultDurationSeconds).toBe(3);
  });

  it("declares a valid typed Canvas 2D performance matrix", () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, appPerformance),
    ).toEqual([]);
    expect(appPerformance.rendererStrategy).toBe("canvas-2d");
  });

  it("perf: worst-case ASCII preview stays under budget", () => {
    expect(scenario("ascii-preview-stress")?.interaction).toBe(
      "preview-render",
    );
  });

  it("perf: maximum ASCII columns stay under budget", () => {
    expect(scenario("ascii-columns-max")?.interaction).toBe("control-drag");
  });

  it("perf: source image workload selection stays responsive", () => {
    expect(scenario("workload-source-image")?.target).toBe("source.image");
  });

  it("perf: 4K source import stays responsive", () => {
    expect(scenario("source-media-import")?.interaction).toBe("media-import");
  });

  it("perf: image resolution selection stays responsive", () => {
    expect(scenario("workload-export-image-resolution")?.target).toBe(
      "export.image.resolution",
    );
  });

  it("perf: video resolution selection stays responsive", () => {
    expect(scenario("workload-export-video-resolution")?.target).toBe(
      "export.video.resolution",
    );
  });

  it("perf: 4K ASCII export stays under budget", () => {
    expect(scenario("image-export-4k")?.interaction).toBe("export-copy");
  });

  it("perf: ASCII viewport stays stable", () => {
    expect(scenario("ascii-viewport-stability")?.interaction).toBe(
      "viewport-stability",
    );
  });

  it("perf: dense ASCII viewport zoom remains smooth", () => {
    expect(scenario("ascii-viewport-zoom-stress")?.interaction).toBe(
      "viewport-zoom-stress",
    );
  });

  it("perf: looping plate frames stay under budget", () => {
    expect(scenario("ascii-animation-frame")?.interaction).toBe(
      "animation-frame",
    );
  });

  it("perf: looping plate stays smooth while the viewport is dragged", () => {
    expect(scenario("ascii-animation-viewport-drag")?.interaction).toBe(
      "animation-viewport-drag",
    );
  });

  it("perf: generated ASCII controls stay responsive", () => {
    expect(
      appPerformance.scenarios.filter((item) =>
        item.automatedTestName.includes(
          "generated ASCII controls stay responsive",
        ),
      ).length,
    ).toBeGreaterThan(0);
  });
});
