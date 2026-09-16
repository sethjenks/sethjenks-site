import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const ENTRY_TIMEZONE = "America/Denver";

const ENTRIES_DIR = path.join(process.cwd(), "content", "entries");
const FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Entry = {
  id: string;
  date: string;
  title: string;
  summary: string;
  tags?: string[];
};

export type DayGroup = {
  date: string;
  entries: Entry[];
};

type RawEntry = {
  id?: unknown;
  date?: unknown;
  title?: unknown;
  summary?: unknown;
  tags?: unknown;
};

function isRecord(value: unknown): value is RawEntry {
  return typeof value === "object" && value !== null;
}

function parseEntry(raw: unknown, filename: string): Entry {
  const match = FILENAME_PATTERN.exec(filename);

  if (!match) {
    throw new Error(
      `Invalid entry filename "${filename}". Expected YYYY-MM-DD-<slug>.json.`,
    );
  }

  const [, filenameDate, slug] = match;

  if (!isRecord(raw)) {
    throw new Error(`Entry "${filename}" must be a JSON object.`);
  }

  const { id, date, title, summary, tags } = raw;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new Error(
      `Entry "${filename}" has an invalid id. Use unique kebab-case.`,
    );
  }

  if (id !== slug) {
    throw new Error(
      `Entry "${filename}" id "${id}" must match the filename slug "${slug}".`,
    );
  }

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    throw new Error(
      `Entry "${filename}" has an invalid date. Use YYYY-MM-DD (${ENTRY_TIMEZONE}).`,
    );
  }

  if (date !== filenameDate) {
    throw new Error(
      `Entry "${filename}" date "${date}" must match the filename date "${filenameDate}".`,
    );
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error(`Entry "${filename}" is missing a title.`);
  }

  if (typeof summary !== "string" || summary.trim().length === 0) {
    throw new Error(`Entry "${filename}" is missing a summary.`);
  }

  if (tags !== undefined) {
    if (
      !Array.isArray(tags) ||
      tags.some((tag) => typeof tag !== "string" || tag.trim().length === 0)
    ) {
      throw new Error(
        `Entry "${filename}" tags must be an array of non-empty strings.`,
      );
    }
  }

  return {
    id,
    date,
    title: title.trim(),
    summary: summary.trim(),
    ...(tags ? { tags: tags.map((tag) => tag.trim()) } : {}),
  };
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return a.id.localeCompare(b.id);
  });
}

export function groupEntriesByDay(entries: Entry[]): DayGroup[] {
  const groups = new Map<string, Entry[]>();

  for (const entry of sortEntries(entries)) {
    const existing = groups.get(entry.date);

    if (existing) {
      existing.push(entry);
    } else {
      groups.set(entry.date, [entry]);
    }
  }

  return [...groups.entries()].map(([date, dayEntries]) => ({
    date,
    entries: dayEntries,
  }));
}

export function formatDayHeading(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(instant);
}

export async function getEntries(): Promise<Entry[]> {
  const filenames = (await readdir(ENTRIES_DIR))
    .filter((filename) => filename.endsWith(".json"))
    .sort();

  const entries = await Promise.all(
    filenames.map(async (filename) => {
      const contents = await readFile(path.join(ENTRIES_DIR, filename), "utf8");
      return parseEntry(JSON.parse(contents) as unknown, filename);
    }),
  );

  const seenIds = new Set<string>();

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate entry id "${entry.id}".`);
    }

    seenIds.add(entry.id);
  }

  return sortEntries(entries);
}

export async function getEntryDayGroups(): Promise<DayGroup[]> {
  return groupEntriesByDay(await getEntries());
}
