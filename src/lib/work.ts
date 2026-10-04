import { readFile } from "node:fs/promises";
import path from "node:path";

const WORK_PATH = path.join(process.cwd(), "content", "work.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type WorkSection = {
  heading: string;
  body: string[];
};

export type WorkFrame = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
};

export type WorkFact = {
  label: string;
  lines: string[];
};

export type WorkBlock =
  | { type: "statement"; label: string; text: string }
  | { type: "essay"; heading: string; body: string[]; list?: string[] }
  | { type: "bleed"; frame: WorkFrame }
  | { type: "frame"; frame: WorkFrame; narrow?: boolean }
  | { type: "facts"; items: WorkFact[] };

export type WorkItem = {
  id: string;
  title: string;
  year: string;
  role: string;
  src: string;
  width: number;
  height: number;
  summary: string;
  sections: WorkSection[];
  tags?: string[];
  alt?: string;
  blocks?: WorkBlock[];
};

export type WorkBand = {
  id: string;
  label: string;
  items: WorkItem[];
};

const DISPLAY_ORDER = [
  "intermission",
  "boardwalk-bots",
  "offramp",
  "brand-brand",
  "food-passport",
  "philo-shirt",
  "level-hardscapes",
  "offer-builder",
  "chia-signer",
  "chia-wallet",
  "chia-friends",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isWorkFrame(value: unknown): value is WorkFrame {
  if (!isRecord(value)) {
    return false;
  }

  const { src, width, height, alt, caption } = value;

  if (
    !isNonEmptyString(src) ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    !isNonEmptyString(alt)
  ) {
    return false;
  }

  return caption === undefined || isNonEmptyString(caption);
}

function isWorkFact(value: unknown): value is WorkFact {
  if (!isRecord(value)) {
    return false;
  }

  const { label, lines } = value;

  return (
    isNonEmptyString(label) &&
    Array.isArray(lines) &&
    lines.length > 0 &&
    lines.every(isNonEmptyString)
  );
}

function isWorkBlock(value: unknown): value is WorkBlock {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "statement":
      return isNonEmptyString(value.label) && isNonEmptyString(value.text);
    case "essay":
      return (
        isNonEmptyString(value.heading) &&
        Array.isArray(value.body) &&
        value.body.length > 0 &&
        value.body.every(isNonEmptyString) &&
        (value.list === undefined ||
          (Array.isArray(value.list) &&
            value.list.length > 0 &&
            value.list.every(isNonEmptyString)))
      );
    case "bleed":
      return isWorkFrame(value.frame);
    case "frame":
      return (
        isWorkFrame(value.frame) &&
        (value.narrow === undefined || typeof value.narrow === "boolean")
      );
    case "facts":
      return (
        Array.isArray(value.items) &&
        value.items.length > 0 &&
        value.items.every(isWorkFact)
      );
    default:
      return false;
  }
}

function isWorkSection(value: unknown): value is WorkSection {
  if (!isRecord(value)) {
    return false;
  }

  const { heading, body } = value;

  return (
    typeof heading === "string" &&
    heading.trim().length > 0 &&
    Array.isArray(body) &&
    body.length > 0 &&
    body.every(
      (paragraph) => typeof paragraph === "string" && paragraph.trim().length > 0,
    )
  );
}

function isWorkItem(value: unknown): value is WorkItem {
  if (!isRecord(value)) {
    return false;
  }

  const { id, title, year, role, src, width, height, summary, sections, tags, alt, blocks } =
    value;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return false;
  }

  if (
    typeof title !== "string" ||
    typeof year !== "string" ||
    typeof role !== "string" ||
    typeof src !== "string" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof summary !== "string"
  ) {
    return false;
  }

  if (
    title.trim().length === 0 ||
    year.trim().length === 0 ||
    role.trim().length === 0 ||
    src.trim().length === 0 ||
    summary.trim().length === 0
  ) {
    return false;
  }

  if (!Array.isArray(sections) || !sections.every(isWorkSection)) {
    return false;
  }

  if (tags !== undefined) {
    if (
      !Array.isArray(tags) ||
      tags.some((tag) => typeof tag !== "string" || tag.trim().length === 0)
    ) {
      return false;
    }
  }

  if (alt !== undefined && (typeof alt !== "string" || alt.trim().length === 0)) {
    return false;
  }

  if (blocks !== undefined) {
    if (!Array.isArray(blocks) || blocks.length === 0 || !blocks.every(isWorkBlock)) {
      return false;
    }
  }

  return true;
}

function toWorkFrame(frame: WorkFrame): WorkFrame {
  return {
    src: frame.src.trim(),
    width: frame.width,
    height: frame.height,
    alt: frame.alt.trim(),
    ...(frame.caption ? { caption: frame.caption.trim() } : {}),
  };
}

function toWorkBlock(block: WorkBlock): WorkBlock {
  switch (block.type) {
    case "statement":
      return {
        type: "statement",
        label: block.label.trim(),
        text: block.text.trim(),
      };
    case "essay":
      return {
        type: "essay",
        heading: block.heading.trim(),
        body: block.body.map((paragraph) => paragraph.trim()),
        ...(block.list
          ? { list: block.list.map((item) => item.trim()) }
          : {}),
      };
    case "bleed":
      return { type: "bleed", frame: toWorkFrame(block.frame) };
    case "frame":
      return {
        type: "frame",
        frame: toWorkFrame(block.frame),
        ...(block.narrow ? { narrow: true } : {}),
      };
    case "facts":
      return {
        type: "facts",
        items: block.items.map((item) => ({
          label: item.label.trim(),
          lines: item.lines.map((line) => line.trim()),
        })),
      };
    default: {
      const unknownBlock: never = block;
      return unknownBlock;
    }
  }
}

function toWorkSection(section: WorkSection): WorkSection {
  return {
    heading: section.heading.trim(),
    body: section.body.map((paragraph) => paragraph.trim()),
  };
}

function toWorkItem(item: WorkItem): WorkItem {
  return {
    id: item.id,
    title: item.title.trim(),
    year: item.year.trim(),
    role: item.role.trim(),
    src: item.src.trim(),
    width: item.width,
    height: item.height,
    summary: item.summary.trim(),
    sections: item.sections.map(toWorkSection),
    ...(item.tags ? { tags: item.tags.map((tag) => tag.trim()) } : {}),
    ...(item.alt ? { alt: item.alt.trim() } : {}),
    ...(item.blocks ? { blocks: item.blocks.map(toWorkBlock) } : {}),
  };
}

function yearRank(year: string): number {
  const match = year.match(/\d{4}/);
  return match ? Number(match[0]) : Number.NaN;
}

function compareYearDesc(a: string, b: string): number {
  const aNum = yearRank(a);
  const bNum = yearRank(b);

  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return bNum - aNum;
  }

  return b.localeCompare(a);
}

export function sortWorkForDisplay(items: WorkItem[]): WorkItem[] {
  const rank = new Map(DISPLAY_ORDER.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const yearDelta = compareYearDesc(a.year, b.year);

    if (yearDelta !== 0) {
      return yearDelta;
    }

    const aRank = rank.get(a.id) ?? 1000;
    const bRank = rank.get(b.id) ?? 1000;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return a.title.localeCompare(b.title);
  });
}

function workSpanLabel(items: WorkItem[]): string {
  const years = items
    .map((item) => yearRank(item.year))
    .filter((year) => Number.isFinite(year));

  if (years.length === 0) {
    return "";
  }

  const newest = Math.max(...years);
  const oldest = Math.min(...years);

  return oldest === newest ? String(newest) : `${oldest}–${newest}`;
}

export function groupWorkBands(items: WorkItem[]): WorkBand[] {
  const ordered = sortWorkForDisplay(items);

  if (ordered.length === 0) {
    return [];
  }

  return [
    {
      id: "work",
      label: workSpanLabel(ordered),
      items: ordered,
    },
  ];
}

export function getNextWorkItem(
  items: WorkItem[],
  id: string,
): WorkItem | undefined {
  const ordered = sortWorkForDisplay(items);

  if (ordered.length < 2) {
    return undefined;
  }

  const index = ordered.findIndex((item) => item.id === id);

  if (index === -1) {
    return undefined;
  }

  return ordered[(index + 1) % ordered.length];
}

export function heroAlt(item: WorkItem): string {
  if (item.alt && item.alt.trim().length > 0) {
    return item.alt.trim();
  }

  return item.summary;
}

export function isPhoneStill(item: WorkItem): boolean {
  return item.width <= 800 && item.height > item.width;
}

export function isDenseDesktopStill(item: WorkItem): boolean {
  return item.width / item.height >= 0.9 && item.height <= 1200;
}

export async function getWorkItems(): Promise<WorkItem[]> {
  const raw = JSON.parse(await readFile(WORK_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw) || !raw.every(isWorkItem)) {
    throw new Error("content/work.json must be an array of work items.");
  }

  const items = raw.map(toWorkItem);
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate work id "${item.id}".`);
    }

    seenIds.add(item.id);
  }

  return items;
}

export async function getWorkItem(id: string): Promise<WorkItem | undefined> {
  const items = await getWorkItems();
  return items.find((item) => item.id === id);
}

export async function getRelatedWork(id: string): Promise<WorkItem[]> {
  const items = await getWorkItems();
  return items.filter((item) => item.id !== id);
}
