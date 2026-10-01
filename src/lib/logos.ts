import { readFile } from "node:fs/promises";
import path from "node:path";

const LOGOS_PATH = path.join(process.cwd(), "content", "logos.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LogoItem = {
  id: string;
  name: string;
  year: string;
  src: string;
  alt: string;
};

export type LogoBand = {
  id: string;
  label: string;
  items: LogoItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLogoItem(value: unknown): value is LogoItem {
  if (!isRecord(value)) {
    return false;
  }

  const { id, name, year, src, alt } = value;

  return (
    typeof id === "string" &&
    ID_PATTERN.test(id) &&
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof year === "string" &&
    year.trim().length > 0 &&
    typeof src === "string" &&
    src.trim().length > 0 &&
    typeof alt === "string" &&
    alt.trim().length > 0
  );
}

function compareYearDesc(a: string, b: string): number {
  const aNum = Number(a);
  const bNum = Number(b);

  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return bNum - aNum;
  }

  return b.localeCompare(a);
}

export function groupLogoBands(items: LogoItem[]): LogoBand[] {
  const ordered = [...items].sort((a, b) => compareYearDesc(a.year, b.year));
  const bands: LogoBand[] = [];

  for (const item of ordered) {
    const current = bands[bands.length - 1];

    if (current && current.id === item.year) {
      current.items.push(item);
      continue;
    }

    bands.push({ id: item.year, label: item.year, items: [item] });
  }

  return bands;
}

export async function getLogoItems(): Promise<LogoItem[]> {
  const raw = JSON.parse(await readFile(LOGOS_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw) || !raw.every(isLogoItem)) {
    throw new Error("content/logos.json must be an array of logo items.");
  }

  const items = raw.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    year: item.year.trim(),
    src: item.src.trim(),
    alt: item.alt.trim(),
  }));
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate logo id "${item.id}".`);
    }

    seenIds.add(item.id);
  }

  return items;
}
