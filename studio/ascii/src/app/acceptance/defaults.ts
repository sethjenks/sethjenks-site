import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { productControlSections } from "../app-schema";
import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./types";

const automatedTestName =
  "maps every ASCII Journal schema control to renderer or authoring behavior";
const browserRenderTestName =
  "browser: applies ASCII illustration controls to product output";
const browserMediaTestName =
  "browser: imports transforms and clears source image";
const browserInboxTestName = "browser: loads Paper inbox image";
const browserDeliveryTestName =
  "browser: exports and assigns ASCII journal output";

function actionValues(
  control: ToolcraftControlSchema,
): readonly string[] | undefined {
  if (control.type !== "actions" && control.type !== "panelActions") {
    return undefined;
  }
  return (control.actions ?? []).map((action) =>
    typeof action === "string" ? action : action.value,
  );
}

function controlPartCoverage(
  control: ToolcraftControlSchema,
): ToolcraftComponentAcceptance["controlPartCoverage"] {
  if (control.type === "collectionActions" || control.type === "vector") {
    return "all-visible-parts";
  }
  return undefined;
}

function acceptanceForControl(
  control: ToolcraftControlSchema,
  controlId: string,
): ToolcraftComponentAcceptance {
  const isMedia = control.type === "fileDrop";
  const isInbox = control.target.startsWith("source.inbox");
  const isDelivery =
    control.type === "panelActions" ||
    control.target.startsWith("export.") ||
    control.target.startsWith("journal.") ||
    control.target === "appearance.background";
  const browserTestName = isMedia
    ? browserMediaTestName
    : isInbox
      ? browserInboxTestName
      : isDelivery
        ? browserDeliveryTestName
        : browserRenderTestName;

  return {
    actionCoverage: actionValues(control),
    automated: true,
    automatedTestName,
    browser: true,
    browserTestName,
    componentType: control.type,
    controlPartCoverage: controlPartCoverage(control),
    evidence: isMedia
      ? "media-lifecycle"
      : isDelivery
        ? control.type === "panelActions"
          ? "exported-bytes"
          : "product-output"
        : "product-output",
    expectedObservable:
      control.target === "export.includeBackground"
        ? "Disabling Include hides the live preview product background, exports transparent PNG pixels, and keeps video output with the product background; enabling it restores the selected color."
        : isMedia
          ? "Dropping an image creates an ASCII illustration; rotate, flip, clear, and Reset are consumed by the canvas renderer."
          : isInbox
            ? "Loading a selected inbox file imports it through the source image target and changes the ASCII canvas."
            : isDelivery
              ? "The selected export settings produce real image or video bytes, while Assign writes a live plate, looping video, or still PNG plus media metadata to the selected journal entry."
              : `Changing ${control.target} changes the rendered glyph and mark illustration without moving the Toolcraft viewport.`,
    fixture: isMedia
      ? "A generated high-contrast 672x336 PNG source"
      : "A high-contrast source image with visible dark, midtone, and light regions",
    id: control.target,
    kind: "control",
    optionCoverage:
      control.type === "select" || control.type === "segmented"
        ? "each-visible-item"
        : undefined,
    target: control.target,
    userAction:
      control.type === "panelActions"
        ? "Choose export values, export the plate, then choose a journal entry, enter alt text, and assign it."
        : control.type === "actions"
          ? `Click every visible action for ${controlId}.`
          : isMedia
            ? "Drop an image, rotate and flip it, clear it, import it again, and use Reset controls."
            : `Interact with ${String(control.label || controlId)} through the visible Toolcraft control.`,
  };
}

const controlAcceptance = productControlSections.flatMap((section) =>
  Object.entries(section.controls).map(([controlId, control]) =>
    acceptanceForControl(control, controlId),
  ),
);

const runtimeAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName,
    browser: true,
    browserTestName: "browser: edits canvas size and keeps ASCII output stable",
    componentType: "canvas",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Editing output dimensions changes the plate shape without changing the selected source or destabilizing pan and zoom.",
    fixture: "A source image on the default 672x336 canvas",
    id: "runtime.canvas-sizing",
    kind: "runtime",
    userAction:
      "Edit Canvas width and Canvas height, then use toolbar zoom and center.",
  },
  {
    automated: true,
    automatedTestName,
    browser: true,
    browserTestName: browserRenderTestName,
    componentType: "canvas-2d-renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "The Canvas 2D renderer cover-crops the source, samples luminance, and draws a legible ink-on-paper glyph and mark plate.",
    fixture: "A high-contrast 1920x1080 PNG source",
    id: "runtime.ascii-renderer",
    kind: "runtime",
    userAction:
      "Upload a source and exercise columns, character set, contrast, invert, marks, field, motion, frame, and inks.",
  },
  {
    automated: true,
    automatedTestName,
    browser: true,
    browserTestName: "browser: frame handle reframes the source crop",
    canvasHandle: {
      exportCleanTestName: "browser: frame handle stays out of export",
      outputObservable:
        "Dragging the frame pin writes frame.offset and changes which part of the source is sampled into the plate.",
      testId: "ascii-frame-handle",
      writesTarget: "frame.offset",
    },
    componentType: "canvas-handle",
    evidence: "product-output",
    expectedObservable:
      "Dragging the small center pin pans the source crop inside the plate without moving the Toolcraft viewport.",
    fixture: "A source image zoomed past 1 so the crop has slack",
    id: "frame.offset.handle",
    kind: "canvas-handle",
    userAction: "Drag the frame pin on the plate.",
  },
  {
    automated: true,
    automatedTestName:
      "connects timeline playback controls to runtime state contract",
    browser: true,
    browserTestName: "browser: timeline playback transport controls runtime time",
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable:
      "Pause and resume keep the plate looping forward, scrubbing updates the rendered frame, editing timeline duration changes the playback range so renderer progress maps 0..state.timeline.durationSeconds, and the seamless forward-only loop stitches first and last frames with no mirror, yoyo, ping-pong, or reverse motion after the duration change.",
    fixture: "A source image on the looping 672x336 plate",
    id: "timeline.playback",
    kind: "runtime",
    target: "timeline.playback",
    timelineCoverage: "playback",
    timelinePlaybackCoverage: [
      "pause-resume",
      "scrub",
      "duration",
      "loop",
      "rendered-frame",
    ],
    userAction:
      "Edit timeline duration, verify the seamless forward-only loop still stitches first and last frames with no mirror, yoyo, ping-pong, or reverse motion, then scrub, pause, and resume playback from the timeline panel.",
  },
];

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...controlAcceptance,
  ...runtimeAcceptance,
];

export const starterControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  productControlSections
    .filter((section) =>
      Object.values(section.controls).every(
        (control) => control.type !== "panelActions",
      ),
    )
    .map((section) => ({
      entity: section.title ?? "ASCII journal stage",
      groupingReason: `${section.title ?? "This section"} groups values for one source, illustration, appearance, export, or journal workflow stage.`,
      targets: Object.values(section.controls).map((control) => control.target),
      title: section.title ?? "ASCII Journal",
      workflowStage: section.title,
    }));

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "ASCII Journal Studio",
  productSummary:
    "Turns a dropped image or Paper export into a tunable ink-on-paper ASCII and mark plate, then assigns a live plate, looping video, or still to an existing journal entry.",
  requestedBehavior:
    "Support image upload, Paper inbox loading, glyph and Cipher-like mark iteration, a 3s playback loop, still and video export, and local assignment into public/media plus entry JSON.",
};

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence:
        "Cipher's Animate defaults are 36 frames at 12 fps, one seamless forward cycle of 3 seconds, used as the journal plate loop.",
      seconds: 3,
      source: "reference",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
};
