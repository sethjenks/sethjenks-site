import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { productControlSections } from "./app-schema";

const workloadTargets = [
  "source.image",
  "ascii.columns",
  "export.image.resolution",
  "export.video.resolution",
] as const;

const coveredTargets = new Set<string>([
  ...workloadTargets,
  "actions.output",
]);

function createResponsivenessScenarios(): ToolcraftPerformanceScenario[] {
  return productControlSections.flatMap((section) =>
    Object.values(section.controls).flatMap((control) => {
      if (
        control.type === "panelActions" ||
        coveredTargets.has(control.target)
      ) {
        return [];
      }

      const isSlider =
        control.type === "slider" || control.type === "rangeSlider";
      const controlLabel =
        typeof control.label === "string"
          ? control.label
          : section.title ?? control.target;

      return [
        {
          automated: true,
          automatedTestName:
            "perf: generated ASCII controls stay responsive",
          browser: true,
          browserTestName: `browser perf: ${control.target} remains responsive`,
          budget: {
            maxFrameGapMs: 100,
            maxInteractionMs: 700,
            maxLongTaskMs: 200,
          },
          controlLabel,
          expectedObservable: `${control.target} updates state and visible ASCII output without freezing the canvas.`,
          fixture: "A high-contrast source image with its owning section visible",
          id: `responsive-${control.target.replace(/[^a-z0-9]+/gi, "-")}`,
          interaction: isSlider ? "control-drag" : "control-change",
          target: control.target,
          workload: false,
        } satisfies ToolcraftPerformanceScenario,
      ];
    }),
  );
}

export const appPerformance: ToolcraftPerformanceConfig =
  defineToolcraftPerformance({
    browserCheckPolicy: {
      fallbackRunner: "playwright",
      fallbackWhen: ["agent-browser-unavailable", "ci"],
      preferredRunner: "agent-browser",
    },
    rendererPipeline: {
      interactionInvalidation: [
        {
          interaction: "media-import",
          invalidates: [
            "source-decode",
            "source-sample",
            "glyph-layout",
            "plate-composite",
            "preview-present",
          ],
          targets: ["source.image"],
        },
        {
          interaction: "control-drag",
          invalidates: [
            "source-sample",
            "glyph-layout",
            "plate-composite",
            "preview-present",
          ],
          mustNotInvalidate: ["source-decode"],
          targets: ["ascii.columns", "ascii.contrast", "frame.zoom"],
        },
        {
          interaction: "control-drag",
          invalidates: [
            "glyph-layout",
            "plate-composite",
            "preview-present",
          ],
          mustNotInvalidate: ["source-decode", "source-sample"],
          targets: [
            "marks.mix",
            "marks.weight",
            "marks.edges",
            "marks.flecks",
            "marks.smears",
            "field.wave",
            "field.tilt",
            "field.detail",
            "motion.amount",
          ],
        },
        {
          interaction: "control-change",
          invalidates: [
            "glyph-layout",
            "plate-composite",
            "preview-present",
          ],
          mustNotInvalidate: ["source-decode"],
          targets: [
            "ascii.preset",
            "ascii.characters",
            "ascii.invert",
            "appearance.inks",
            "appearance.background",
            "export.includeBackground",
            "marks.mix",
            "marks.weight",
            "marks.edges",
            "marks.flecks",
            "marks.smears",
            "marks.seed",
            "marks.tick",
            "marks.slash",
            "marks.wedge",
            "marks.ring",
            "marks.block",
            "marks.fleck",
            "marks.smear",
            "field.wave",
            "field.tilt",
            "field.detail",
            "motion.amount",
          ],
        },
        {
          interaction: "control-change",
          invalidates: [
            "source-sample",
            "glyph-layout",
            "plate-composite",
            "preview-present",
          ],
          mustNotInvalidate: ["source-decode"],
          targets: ["frame.offset"],
        },
        {
          interaction: "animation-frame",
          invalidates: ["loop-present"],
          mustNotInvalidate: [
            "source-decode",
            "source-sample",
            "glyph-layout",
            "plate-composite",
          ],
          targets: ["motion.amount", "timeline.currentTimeSeconds"],
        },
        {
          interaction: "viewport-drag",
          invalidates: [],
          mustNotInvalidate: [
            "source-decode",
            "source-sample",
            "glyph-layout",
            "plate-composite",
          ],
          targets: ["canvas.offset"],
        },
        {
          interaction: "viewport-zoom",
          invalidates: [],
          mustNotInvalidate: [
            "source-decode",
            "source-sample",
            "glyph-layout",
            "plate-composite",
          ],
          targets: ["canvas.zoom"],
        },
        {
          interaction: "export",
          invalidates: ["png-export", "video-export"],
          mustNotInvalidate: ["source-decode"],
          targets: [
            "actions.output",
            "export.image.resolution",
            "export.video.resolution",
          ],
        },
      ],
      passes: [
        {
          cacheKey: ["mediaAsset.id", "mediaAsset.dataUrl"],
          id: "source-decode",
          inputs: ["source.image"],
          invalidatedBy: ["source.image"],
          kind: "decode",
          output: "source",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "source identity",
            "media transform",
            "canvas aspect",
            "ascii.columns",
            "ascii.contrast",
            "ascii.invert",
            "frame.zoom",
            "frame.offset",
          ],
          id: "source-sample",
          inputs: [
            "source-decode",
            "media transform",
            "canvas.size",
            "ascii.columns",
            "ascii.contrast",
            "ascii.invert",
            "frame.zoom",
            "frame.offset",
          ],
          invalidatedBy: [
            "source.image",
            "media.transform",
            "canvas.size",
            "ascii.columns",
            "ascii.contrast",
            "ascii.invert",
            "frame.zoom",
            "frame.offset",
          ],
          kind: "pixel-transform",
          output: "intermediate",
          quality: "preview",
          runsOn: "main",
        },
        {
          cacheKey: ["sampled tones", "active character ramp"],
          id: "glyph-layout",
          inputs: [
            "source-sample",
            "ascii.preset",
            "ascii.characters",
          ],
          invalidatedBy: [
            "source-sample",
            "ascii.preset",
            "ascii.characters",
          ],
          kind: "text-layout",
          output: "intermediate",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "glyph layout",
            "appearance.inks",
            "appearance.background",
            "export.includeBackground",
            "marks",
            "field",
            "motion",
            "timeline progress",
          ],
          id: "plate-composite",
          inputs: [
            "glyph-layout",
            "appearance.inks",
            "appearance.background",
            "export.includeBackground",
            "marks.mix",
            "field.wave",
            "motion.amount",
            "timeline.currentTimeSeconds",
          ],
          invalidatedBy: [
            "glyph-layout",
            "appearance.inks",
            "appearance.background",
            "export.includeBackground",
            "marks.mix",
            "marks.weight",
            "marks.edges",
            "marks.flecks",
            "marks.smears",
            "marks.seed",
            "marks.tick",
            "marks.slash",
            "marks.wedge",
            "marks.ring",
            "marks.block",
            "marks.fleck",
            "marks.smear",
            "field.wave",
            "field.tilt",
            "field.detail",
            "motion.amount",
            "timeline.currentTimeSeconds",
          ],
          kind: "rasterize",
          output: "preview",
          quality: "retina",
          runsOn: "main",
        },
        {
          cacheKey: ["plate-composite", "viewport presentation"],
          id: "preview-present",
          inputs: ["plate-composite"],
          invalidatedBy: ["plate-composite"],
          kind: "composite",
          output: "preview",
          quality: "retina",
          runsOn: "main",
        },
        {
          cacheKey: ["timeline progress", "motion.amount"],
          id: "loop-present",
          inputs: ["plate-composite", "timeline.currentTimeSeconds", "motion.amount"],
          invalidatedBy: ["timeline.currentTimeSeconds", "motion.amount"],
          kind: "composite",
          output: "preview",
          quality: "preview",
          runsOn: "main",
        },
        {
          cacheKey: [
            "source",
            "ascii.columns",
            "ascii.preset",
            "ascii.characters",
            "ascii.contrast",
            "ascii.invert",
            "appearance.inks",
            "appearance.background",
            "export.includeBackground",
            "frame.zoom",
            "frame.offset",
            "media transform",
            "canvas.size",
            "export.image.resolution",
          ],
          id: "png-export",
          inputs: [
            "source-decode",
            "source-sample",
            "glyph-layout",
            "Background",
            "Image Export",
          ],
          invalidatedBy: ["export.png", "journal.assign"],
          kind: "export",
          output: "export",
          quality: "export",
          runsOn: "export-only",
        },
        {
          cacheKey: [
            "source",
            "plate-composite",
            "timeline duration",
            "export.video.format",
            "export.video.resolution",
          ],
          id: "video-export",
          inputs: [
            "source-decode",
            "source-sample",
            "plate-composite",
            "Video Export",
            "timeline.durationSeconds",
          ],
          invalidatedBy: ["export.video", "journal.assign"],
          kind: "export",
          output: "export",
          quality: "export",
          runsOn: "export-only",
        },
      ],
    },
    rendererStrategy: "canvas-2d",
    rendererTechnique: {
      exportRenderer: "canvas-2d",
      fidelityRisks: [
        "Very low column counts intentionally simplify small facial and texture details.",
        "Glyph metrics can vary if Geist Mono is unavailable, so the font is bundled and loaded before painting.",
      ],
      intentionalRasterizationReason:
        "The final journal asset is a still image made from thousands of positioned glyphs; raster output preserves the exact preview composition and is the required media format.",
      layers: [
        {
          content: ["geometry"],
          exportMode: "included",
          id: "background",
          kind: "background",
          primitiveCount: "low",
          renderer: "canvas-2d",
          uiSelector: '[data-toolcraft-product-output="ascii-journal-canvas"]',
        },
        {
          content: ["bitmap-media", "text"],
          exportMode: "included",
          id: "product-foreground",
          intentionalRasterizationReason:
            "The source is sampled into a bounded grid and the product itself is a raster illustration for the journal feed.",
          kind: "product-foreground",
          primitiveCount: "high",
          renderer: "canvas-2d",
          uiSelector: '[data-toolcraft-product-output="ascii-journal-canvas"]',
        },
        {
          content: ["composite"],
          exportMode: "composited",
          id: "export-composite",
          kind: "export-composite",
          primitiveCount: "low",
          renderer: "canvas-2d",
        },
      ],
      measuredAlternativeEvidence: [
        {
          alternativeStrategy: "webgl",
          decision:
            "Keep Canvas 2D because the bounded text grid avoids GPU glyph-atlas setup and is covered by the same 4K-source, 220-column stress fixture.",
          fixture:
            "3840x2160 source, 220 columns, render scale 2, 4096px export",
          measuredResult:
            "Canvas 2D is the implementation under measurement; WebGL would add atlas upload and shader text layout without reducing the bounded glyph count. Final browser timings are recorded in the worklog.",
          scenarioId: "ascii-preview-stress",
        },
      ],
      performanceRisks: [
        "A 220-column grid creates roughly 15,000 glyph decisions at 2:1.",
        "8K export is memory intensive even though luminance sampling stays bounded by the glyph grid.",
      ],
      previewExportDifferenceReason:
        "Preview uses the fitted canvas backing size while export reruns the same grid and glyph pipeline at the selected long-edge resolution.",
      previewRenderer: "canvas-2d",
      productRepresentation: "text",
      rendererStrategy: "canvas-2d",
      rendererWorkload: "pixel-output",
      sourceRepresentation: "image-media",
      whyNotAlternativeStrategies: [
        "DOM would create thousands of layout nodes and make image export indirect.",
        "SVG would serialize thousands of text elements for a product whose required output is PNG.",
        "WebGL and WebGPU would require a glyph atlas and shader text layout for a bounded workload that Canvas 2D can measure directly.",
      ],
    },
    rendererWorkload: "pixel-output",
    scenarios: [
      {
        automated: true,
        automatedTestName: "perf: worst-case ASCII preview stays under budget",
        browser: true,
        browserTestName: "browser perf: worst-case ASCII preview stays under budget",
        budget: {
          maxFrameGapMs: 100,
          maxLongTaskMs: 220,
          maxPreviewMs: 1800,
        },
        expectedObservable:
          "The 4K-source, 220-column, scale-2 preview paints visible glyph pixels without blocking the editor.",
        fixture: "3840x2160 source, 220 columns, render scale 2",
        id: "ascii-preview-stress",
        interaction: "preview-render",
        stress: true,
        stressFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: {
              columns: 220,
              renderScale: 2,
              sourceMedia: { height: 2160, width: 3840 },
            },
            metric: "custom",
            smoothTarget: {
              columns: 220,
              renderScale: 2,
              sourceMedia: { height: 2160, width: 3840 },
            },
            smoothTargetRatio: 1,
            target: "preview.combined",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "This combines the largest realistic source, glyph grid, and preview backing scale.",
          value: {
            columns: 220,
            renderScale: 2,
            sourceMedia: { height: 2160, width: 3840 },
          },
        },
        workload: false,
      },
      {
        automated: true,
        automatedTestName: "perf: maximum ASCII columns stay under budget",
        browser: true,
        browserTestName: "browser perf: maximum ASCII columns stay under budget",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 900,
          maxLongTaskMs: 220,
        },
        controlLabel: "Columns",
        expectedObservable:
          "Dragging Columns to 220 updates the visible glyph grid during the drag.",
        fixture: "A 3840x2160-equivalent source at render scale 2",
        id: "ascii-columns-max",
        interaction: "control-drag",
        stressFixture: {
          kind: "high-density",
          loadProfile: {
            hardLimit: 220,
            metric: "numeric-max",
            smoothTarget: 220,
            smoothTargetRatio: 1,
            target: "ascii.columns",
            userFacingRange: "fully-guaranteed",
          },
          reason: "220 is the largest exposed glyph grid.",
          value: 220,
        },
        target: "ascii.columns",
        values: { default: 120, max: 220, min: 40 },
        workload: true,
        workloadFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: {
              renderScale: 2,
              sourceMedia: { height: 2160, width: 3840 },
            },
            metric: "custom",
            smoothTarget: {
              renderScale: 2,
              sourceMedia: { height: 2160, width: 3840 },
            },
            smoothTargetRatio: 1,
            target: "preview.combined",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "The densest grid is measured with a 4K source and full preview backing scale.",
          value: {
            renderScale: 2,
            sourceMedia: { height: 2160, width: 3840 },
          },
        },
      },
      {
        automated: true,
        automatedTestName:
          "perf: source image workload selection stays responsive",
        browser: true,
        browserTestName:
          "browser perf: source.image workload stays responsive",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 1600,
          maxLongTaskMs: 250,
        },
        controlLabel: "Image",
        expectedObservable:
          "Selecting a 4K source updates the source control and visible ASCII output.",
        fixture: "Generated small, default, and 4K image files",
        id: "workload-source-image",
        interaction: "control-change",
        stressFixture: {
          kind: "media",
          loadProfile: {
            hardLimit: { height: 2160, width: 3840 },
            metric: "media-area",
            smoothTarget: { height: 2160, width: 3840 },
            smoothTargetRatio: 1,
            target: "source.image",
            userFacingRange: "fully-guaranteed",
          },
          reason: "A 4K still is the largest guaranteed source tier.",
          value: { height: 2160, width: 3840 },
        },
        target: "source.image",
        values: {
          default: "1920x1080",
          max: "3840x2160",
          min: "64x64",
        },
        workload: true,
        workloadFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: { columns: 220, renderScale: 2 },
            metric: "custom",
            smoothTarget: { columns: 220, renderScale: 2 },
            smoothTargetRatio: 1,
            target: "preview.baseline",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "Source selection is measured with the densest grid and full preview backing scale already selected.",
          value: { columns: 220, renderScale: 2 },
        },
      },
      {
        automated: true,
        automatedTestName: "perf: 4K source import stays responsive",
        browser: true,
        browserTestName: "browser perf: 4K source import stays responsive",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 1600,
          maxLongTaskMs: 250,
          maxPreviewMs: 1800,
        },
        expectedObservable:
          "A 3840x2160 PNG imports and produces visible ASCII glyph pixels.",
        fixture: "Generated 3840x2160 high-contrast PNG",
        id: "source-media-import",
        interaction: "media-import",
        stressFixture: {
          kind: "media",
          loadProfile: {
            hardLimit: { height: 2160, width: 3840 },
            metric: "media-area",
            smoothTarget: { height: 2160, width: 3840 },
            smoothTargetRatio: 1,
            target: "source.image",
            userFacingRange: "fully-guaranteed",
          },
          reason: "A 4K still is a realistic Paper or camera source.",
          value: { height: 2160, width: 3840 },
        },
        target: "source.image",
        values: {
          default: { height: 1080, width: 1920 },
          max: { height: 2160, width: 3840 },
          min: { height: 64, width: 64 },
        },
        workload: true,
      },
      {
        automated: true,
        automatedTestName: "perf: image resolution selection stays responsive",
        browser: true,
        browserTestName:
          "browser perf: export.image.resolution workload stays responsive",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 650,
          maxLongTaskMs: 200,
        },
        controlLabel: "Resolution",
        expectedObservable:
          "Changing image resolution updates export state without rerendering or moving the preview.",
        fixture: "Image Export with a loaded source",
        id: "workload-export-image-resolution",
        interaction: "control-change",
        stressFixture: {
          kind: "max-value",
          loadProfile: {
            hardLimit: "8k",
            metric: "custom",
            smoothTarget: "8k",
            smoothTargetRatio: 1,
            target: "export.image.resolution",
            userFacingRange: "fully-guaranteed",
          },
          reason: "8K is the largest exposed image export tier.",
          value: "8k",
        },
        target: "export.image.resolution",
        values: { default: "4k", max: "8k", min: "2k" },
        workload: true,
        workloadFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: {
              columns: 220,
              sourceMedia: { height: 2160, width: 3840 },
            },
            metric: "custom",
            smoothTarget: {
              columns: 220,
              sourceMedia: { height: 2160, width: 3840 },
            },
            smoothTargetRatio: 1,
            target: "export.baseline",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "Resolution selection is measured with the densest grid and a 4K source loaded.",
          value: {
            columns: 220,
            sourceMedia: { height: 2160, width: 3840 },
          },
        },
      },
      {
        automated: true,
        automatedTestName:
          "perf: video resolution selection stays responsive",
        browser: true,
        browserTestName:
          "browser perf: export.video.resolution workload stays responsive",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 650,
          maxLongTaskMs: 200,
        },
        controlLabel: "Resolution",
        expectedObservable:
          "Changing video resolution updates export state without rerendering or moving the preview.",
        fixture: "Video Export with a loaded source",
        id: "workload-export-video-resolution",
        interaction: "control-change",
        stressFixture: {
          kind: "max-value",
          loadProfile: {
            hardLimit: "4k",
            metric: "custom",
            smoothTarget: "4k",
            smoothTargetRatio: 1,
            target: "export.video.resolution",
            userFacingRange: "fully-guaranteed",
          },
          reason: "4K is the largest exposed video export tier.",
          value: "4k",
        },
        target: "export.video.resolution",
        values: { default: "current", max: "4k", min: "current" },
        workload: true,
        workloadFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: {
              columns: 220,
              sourceMedia: { height: 2160, width: 3840 },
            },
            metric: "custom",
            smoothTarget: {
              columns: 220,
              sourceMedia: { height: 2160, width: 3840 },
            },
            smoothTargetRatio: 1,
            target: "export.baseline",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "Video resolution selection is measured with the densest grid and a 4K source loaded.",
          value: {
            columns: 220,
            sourceMedia: { height: 2160, width: 3840 },
          },
        },
      },
      {
        automated: true,
        automatedTestName: "perf: 4K ASCII export stays under budget",
        browser: true,
        browserTestName: "browser perf: 4K ASCII export stays under budget",
        budget: {
          maxExportMs: 7000,
          maxInteractionMs: 2000,
          maxLongTaskMs: 250,
        },
        expectedObservable:
          "Export creates a decoded image with a 4096px long edge.",
        fixture: "4K PNG export at 220 columns",
        id: "image-export-4k",
        interaction: "export-copy",
        stressFixture: {
          kind: "large-canvas",
          loadProfile: {
            hardLimit: 4096,
            metric: "numeric-max",
            smoothTarget: 4096,
            smoothTargetRatio: 1,
            target: "export.image.resolution",
            userFacingRange: "fully-guaranteed",
          },
          reason: "4K is the production journal export checkpoint.",
          value: 4096,
        },
        target: "actions.output",
        workload: false,
      },
      {
        automated: true,
        automatedTestName: "perf: ASCII viewport stays stable",
        browser: true,
        browserTestName: "browser perf: ASCII viewport stays stable",
        budget: { maxFrameGapMs: 100, maxInteractionMs: 650 },
        expectedObservable:
          "Changing illustration settings does not alter canvas zoom or offset.",
        fixture: "A loaded source at the default journal settings",
        id: "ascii-viewport-stability",
        interaction: "viewport-stability",
        target: "ascii.contrast",
        workload: false,
      },
      {
        automated: true,
        automatedTestName: "perf: dense ASCII viewport zoom remains smooth",
        browser: true,
        browserTestName: "browser perf: dense ASCII viewport zoom remains smooth",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 750,
          maxLongTaskMs: 220,
        },
        expectedObservable:
          "Real toolbar zoom stays stable over a 220-column render at scale 2.",
        fixture: "220 columns with a 4K source at render scale 2",
        id: "ascii-viewport-zoom-stress",
        interaction: "viewport-zoom-stress",
        stress: true,
        stressFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: { columns: 220, renderScale: 2 },
            metric: "custom",
            smoothTarget: { columns: 220, renderScale: 2 },
            smoothTargetRatio: 1,
            target: "viewport.zoom.combined",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "The densest grid and full backing scale are the realistic zoom stress state.",
          value: { columns: 220, renderScale: 2 },
        },
        workload: false,
      },
      {
        automated: true,
        automatedTestName: "perf: looping plate frames stay under budget",
        browser: true,
        browserTestName: "browser perf: looping plate frames stay under budget",
        budget: {
          maxFrameGapMs: 100,
          maxLongTaskMs: 220,
        },
        expectedObservable:
          "The 3s forward loop paints successive frames from timeline progress without reversing.",
        fixture: "A loaded source at 220 columns with motion amount 1",
        id: "ascii-animation-frame",
        interaction: "animation-frame",
        target: "motion.amount",
        workload: false,
      },
      {
        automated: true,
        automatedTestName:
          "perf: looping plate stays smooth while the viewport is dragged",
        browser: true,
        browserTestName:
          "browser perf: looping plate stays smooth while the viewport is dragged",
        budget: {
          maxFrameGapMs: 100,
          maxInteractionMs: 750,
          maxLongTaskMs: 220,
        },
        expectedObservable:
          "Dragging the canvas viewport keeps the plate visible without invalidating source decode.",
        fixture: "A loaded source at 220 columns with the loop playing",
        id: "ascii-animation-viewport-drag",
        interaction: "animation-viewport-drag",
        stress: true,
        stressFixture: {
          kind: "custom",
          loadProfile: {
            hardLimit: { columns: 220, renderScale: 2 },
            metric: "custom",
            smoothTarget: { columns: 220, renderScale: 2 },
            smoothTargetRatio: 1,
            target: "viewport.drag.combined",
            userFacingRange: "fully-guaranteed",
          },
          reason:
            "The densest looping plate is the realistic viewport-drag stress state.",
          value: { columns: 220, renderScale: 2 },
        },
        workload: false,
      },
      ...createResponsivenessScenarios(),
    ],
    usesCustomRenderer: true,
    workloadTargets,
  });
