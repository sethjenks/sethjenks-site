import {
  defineToolcraft,
  type ToolcraftControlSchema,
  type ToolcraftControlSectionSchema,
} from "@/toolcraft/runtime";

import { JOURNAL_PLATE_HEIGHT, JOURNAL_PLATE_WIDTH } from "./journal-plate";

export type JournalEntryOption = {
  date: string;
  id: string;
  title: string;
};

export type AuthoringBootstrap = {
  entries: JournalEntryOption[];
  inbox: string[];
};

const responsiveness = {
  performanceReason:
    "This setting changes bounded renderer state and must keep the canvas and controls responsive.",
  performanceRole: "responsiveness",
} as const;

const workload = {
  performanceReason:
    "This setting changes the glyph grid or image workload and is measured at its heaviest useful value.",
  performanceRole: "workload",
} as const;

function select({
  defaultValue,
  label,
  options,
  target,
  isWorkload = false,
}: {
  defaultValue: string;
  isWorkload?: boolean;
  label: string;
  options: readonly { label: string; value: string }[];
  target: string;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    options,
    orderRole: "detail",
    target,
    type: "select",
    ...(isWorkload ? workload : responsiveness),
  };
}

function color(
  target: string,
  defaultValue: string,
  label: string | false,
): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    orderRole: "detail",
    target,
    type: "color",
    ...responsiveness,
  };
}

function unitSlider({
  defaultValue,
  label,
  target,
}: {
  defaultValue: number;
  label: string;
  target: string;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    max: 1,
    min: 0,
    orderRole: "detail",
    step: 0.01,
    target,
    type: "slider",
    ...responsiveness,
  };
}

function createProductSections({
  entries,
  inbox,
}: AuthoringBootstrap): readonly ToolcraftControlSectionSchema[] {
  const inboxOptions = inbox.length
    ? inbox.map((fileName) => ({ label: fileName, value: fileName }))
    : [{ label: "Inbox is empty", value: "__none__" }];
  const entryOptions = entries.length
    ? entries.map((entry) => ({
        label: `${entry.date} — ${entry.title}`,
        value: entry.id,
      }))
    : [{ label: "No journal entries found", value: "__none__" }];

  return [
    {
      controls: {
        image: {
          accept: "PNG, JPEG, GIF, SVG, WebP",
          assetKind: "image",
          defaultValue: null,
          description:
            "Drop, paste, or choose one source image. Rotate and flip actions are applied to preview and output.",
          label: "Image",
          orderRole: "detail",
          target: "source.image",
          type: "fileDrop",
          ...workload,
        },
        inboxItem: select({
          defaultValue: inboxOptions[0]?.value ?? "__none__",
          label: "Paper inbox",
          options: inboxOptions,
          target: "source.inboxItem",
        }),
        inboxActions: {
          actions: [
            { label: "Load selected", value: "inbox.load" },
            { label: "Refresh list", value: "inbox.refresh" },
          ],
          defaultValue: null,
          label: "Inbox actions",
          orderRole: "action",
          target: "source.inboxActions",
          type: "actions",
          ...responsiveness,
        },
      },
      title: "Source",
    },
    {
      controls: {
        zoom: {
          defaultValue: 1,
          label: "Zoom",
          max: 3,
          min: 1,
          orderRole: "detail",
          step: 0.01,
          target: "frame.zoom",
          type: "slider",
          ...responsiveness,
        },
      },
      title: "Frame",
    },
    {
      controls: {
        offset: {
          coordinateMode: "screen",
          defaultValue: { x: "0.00", y: "0.00" },
          label: "Offset",
          orderRole: "detail",
          target: "frame.offset",
          type: "vector",
          ...responsiveness,
        },
      },
      title: "Offset",
    },
    {
      controls: {
        columns: {
          defaultValue: 120,
          label: "Columns",
          max: 220,
          min: 40,
          orderRole: "detail",
          step: 4,
          target: "ascii.columns",
          type: "slider",
          ...workload,
        },
        preset: select({
          defaultValue: "journal",
          label: "Character set",
          options: [
            { label: "Journal", value: "journal" },
            { label: "Dense", value: "dense" },
            { label: "Blocks", value: "blocks" },
            { label: "Minimal", value: "minimal" },
            { label: "Custom", value: "custom" },
          ],
          target: "ascii.preset",
        }),
        characters: {
          commitMode: "content",
          defaultValue: "@%#*+=-:. ",
          description: "Ordered from darkest mark to lightest mark.",
          label: "Custom ramp",
          orderRole: "detail",
          target: "ascii.characters",
          type: "text",
          visibleWhen: { equals: "custom", target: "ascii.preset" },
          ...responsiveness,
        },
        contrast: {
          defaultValue: 1.25,
          label: "Contrast",
          max: 2.5,
          min: 0.5,
          orderRole: "detail",
          step: 0.05,
          target: "ascii.contrast",
          type: "slider",
          ...responsiveness,
        },
        invert: {
          defaultValue: false,
          label: "Invert",
          orderRole: "detail",
          target: "ascii.invert",
          type: "switch",
          ...responsiveness,
        },
      },
      title: "Illustration",
    },
    {
      controls: {
        tick: {
          defaultValue: true,
          label: "Show tick marks",
          orderRole: "detail",
          target: "marks.tick",
          type: "switch",
          ...responsiveness,
        },
        slash: {
          defaultValue: true,
          label: "Show slash marks",
          orderRole: "detail",
          target: "marks.slash",
          type: "switch",
          ...responsiveness,
        },
        wedge: {
          defaultValue: true,
          label: "Show wedge marks",
          orderRole: "detail",
          target: "marks.wedge",
          type: "switch",
          ...responsiveness,
        },
        ring: {
          defaultValue: true,
          label: "Show ring marks",
          orderRole: "detail",
          target: "marks.ring",
          type: "switch",
          ...responsiveness,
        },
        block: {
          defaultValue: true,
          label: "Show block marks",
          orderRole: "detail",
          target: "marks.block",
          type: "switch",
          ...responsiveness,
        },
        fleck: {
          defaultValue: true,
          label: "Show fleck marks",
          orderRole: "detail",
          target: "marks.fleck",
          type: "switch",
          ...responsiveness,
        },
        smear: {
          defaultValue: true,
          label: "Show smear marks",
          orderRole: "detail",
          target: "marks.smear",
          type: "switch",
          ...responsiveness,
        },
      },
      title: "Mark set",
    },
    {
      controls: {
        mix: unitSlider({
          defaultValue: 0.4,
          label: "Mix",
          target: "marks.mix",
        }),
        weight: unitSlider({
          defaultValue: 0.8,
          label: "Weight",
          target: "marks.weight",
        }),
        edges: unitSlider({
          defaultValue: 0.55,
          label: "Edges",
          target: "marks.edges",
        }),
        flecks: unitSlider({
          defaultValue: 0.08,
          label: "Flecks",
          target: "marks.flecks",
        }),
        smears: unitSlider({
          defaultValue: 0.12,
          label: "Smears",
          target: "marks.smears",
        }),
        seed: {
          commitMode: "content",
          defaultValue: "1",
          description: "Stable seed for which cells become shapes.",
          label: "Variation",
          orderRole: "detail",
          target: "marks.seed",
          type: "text",
          ...responsiveness,
        },
        reshuffle: {
          actions: [{ label: "New variation", value: "marks.reshuffle" }],
          defaultValue: null,
          label: "Reshuffle marks",
          orderRole: "action",
          target: "marks.reshuffle",
          type: "actions",
          ...responsiveness,
        },
      },
      title: "Marks",
    },
    {
      controls: {
        wave: unitSlider({
          defaultValue: 0.45,
          label: "Wave",
          target: "field.wave",
        }),
        tilt: unitSlider({
          defaultValue: 0.2,
          label: "Tilt",
          target: "field.tilt",
        }),
        detail: unitSlider({
          defaultValue: 0.5,
          label: "Detail",
          target: "field.detail",
        }),
      },
      title: "Field",
    },
    {
      controls: {
        amount: unitSlider({
          defaultValue: 0.55,
          label: "Amount",
          target: "motion.amount",
        }),
      },
      title: "Field motion",
    },
    {
      controls: {
        inks: {
          addLabel: "Add ink",
          defaultValue: [{ hex: "#111111" }],
          itemControl: { label: false, type: "color" },
          itemDefaultValue: { hex: "#444444" },
          itemLabel: "ink",
          label: "Inks",
          minItems: 1,
          orderRole: "detail",
          recommendedMaxItems: 8,
          removeLabel: "Remove ink",
          target: "appearance.inks",
          type: "collectionActions",
          ...responsiveness,
        },
      },
      title: "Ink",
    },
    {
      controls: {
        entry: select({
          defaultValue: entryOptions[0]?.value ?? "__none__",
          label: "Entry",
          options: entryOptions,
          target: "journal.entryId",
        }),
        assignKind: select({
          defaultValue: "plate",
          label: "Assign as",
          options: [
            { label: "Live plate", value: "plate" },
            { label: "Looping video", value: "video" },
            { label: "Still image", value: "still" },
          ],
          target: "journal.assignKind",
        }),
        alt: {
          commitMode: "content",
          defaultValue: "",
          description:
            "Required description of the finished illustration for journal readers.",
          label: "Alt text",
          orderRole: "detail",
          target: "journal.alt",
          type: "text",
          ...responsiveness,
        },
      },
      title: "Journal Post",
    },
    {
      controls: {
        includeBackground: {
          defaultValue: true,
          description:
            "Disabling Include hides the live product background and exports transparent PNG pixels; video output would keep the product background.",
          label: "Include",
          orderRole: "detail",
          target: "export.includeBackground",
          type: "switch",
          ...responsiveness,
        },
        background: color("appearance.background", "#FAFAFA", false),
      },
      layoutGroups: [
        {
          columns: 2,
          controls: ["includeBackground", "background"],
          layout: "inline",
        },
      ],
      title: "Background",
    },
    {
      controls: {
        format: select({
          defaultValue: "png",
          label: "Format",
          options: [
            { label: "PNG", value: "png" },
            { label: "JPG", value: "jpg" },
          ],
          target: "export.image.format",
        }),
        resolution: select({
          defaultValue: "4k",
          isWorkload: true,
          label: "Resolution",
          options: [
            { label: "2K", value: "2k" },
            { label: "4K", value: "4k" },
            { label: "8K", value: "8k" },
          ],
          target: "export.image.resolution",
        }),
      },
      layoutGroups: [
        {
          columns: 2,
          controls: ["format", "resolution"],
          layout: "inline",
        },
      ],
      title: "Image Export",
    },
    {
      controls: {
        format: select({
          defaultValue: "mp4",
          label: "Format",
          options: [
            { label: "MP4", value: "mp4" },
            { label: "WebM", value: "webm" },
          ],
          target: "export.video.format",
        }),
        resolution: select({
          defaultValue: "current",
          isWorkload: true,
          label: "Resolution",
          options: [
            { label: "Current", value: "current" },
            { label: "4K", value: "4k" },
          ],
          target: "export.video.resolution",
        }),
      },
      layoutGroups: [
        {
          columns: 2,
          controls: ["format", "resolution"],
          layout: "inline",
        },
      ],
      title: "Video Export",
    },
    {
      controls: {
        output: {
          actions: [
            {
              icon: "upload-simple",
              label: "Export PNG",
              value: "export.png",
            },
            { label: "Export Video", value: "export.video" },
            { label: "Assign to post", value: "journal.assign" },
          ],
          defaultValue: null,
          target: "actions.output",
          type: "panelActions",
        },
      },
      title: "Output",
    },
  ];
}

export function createAsciiStudioSchema(
  bootstrap: AuthoringBootstrap = { entries: [], inbox: [] },
) {
  return defineToolcraft({
    canvas: {
      enabled: true,
      renderScale: { defaultValue: 1, enabled: true, max: 2, min: 1, step: 1 },
      size: {
        height: JOURNAL_PLATE_HEIGHT,
        unit: "px",
        width: JOURNAL_PLATE_WIDTH,
      },
      sizing: { mode: "editable-output" },
      upload: true,
    },
    export: { png: { background: "include" } },
    panels: {
      controls: {
        sections: createProductSections(bootstrap),
        title: "ASCII Journal",
      },
      timeline: {
        defaultDurationSeconds: 3,
        enabled: true,
        mode: "playback",
      },
    },
    persistence: { storage: "none" },
    settingsTransfer: {
      appId: "ascii-journal-studio",
      enabled: "auto",
      fileName: "ascii-journal-settings.json",
    },
    toolbar: {
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    },
  });
}

export const appSchema = createAsciiStudioSchema();

export const productControlSections =
  appSchema.panels.controls?.sections.filter(
    (section) => section.title !== "Setup",
  ) ?? [];
