import { readFile } from "node:fs/promises";
import path from "node:path";

const WORK_PATH = path.join(process.cwd(), "content", "work.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type WorkSection = {
  heading: string;
  body: string[];
};

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
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  const { id, title, year, role, src, width, height, summary, sections, tags, alt } =
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

  return true;
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
  };
}

function compareYearDesc(a: string, b: string): number {
  const aNum = Number(a);
  const bNum = Number(b);

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

export function groupWorkBands(items: WorkItem[]): WorkBand[] {
  const bands: WorkBand[] = [];

  for (const item of sortWorkForDisplay(items)) {
    const current = bands[bands.length - 1];

    if (current && current.id === item.year) {
      current.items.push(item);
      continue;
    }

    bands.push({ id: item.year, label: item.year, items: [item] });
  }

  return bands;
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
