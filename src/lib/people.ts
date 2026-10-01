import { readFile } from "node:fs/promises";
import path from "node:path";

const PEOPLE_PATH = path.join(process.cwd(), "content", "people.json");
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PersonItem = {
  id: string;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersonItem(value: unknown): value is PersonItem {
  if (!isRecord(value)) {
    return false;
  }

  const { id, name } = value;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return false;
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    return false;
  }

  return true;
}

export async function getPeople(): Promise<PersonItem[]> {
  const raw = JSON.parse(await readFile(PEOPLE_PATH, "utf8")) as unknown;

  if (!Array.isArray(raw) || !raw.every(isPersonItem)) {
    throw new Error("content/people.json must be an array of people.");
  }

  const items = raw.map((item) => ({
    id: item.id,
    name: item.name.trim(),
  }));
  const seenIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate person id "${item.id}".`);
    }

    seenIds.add(item.id);
  }

  return items;
}
